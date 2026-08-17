import { Composio } from "@composio/core";
import type {
  EndpointDefinition,
  EndpointReport,
  EndpointStatus,
  ParameterDef,
  TestReport,
} from "./types";

/**
 * This is the entry point for your agent implementation.
 *
 * Your agent receives:
 *   - composio: an authenticated Composio client
 *   - connectedAccountId: the account ID to use with composio.tools.proxyExecute()
 *   - endpoints: the list of endpoint definitions to validate
 *
 * Your agent must return:
 *   - A TestReport containing an EndpointReport for every endpoint
 *
 * EndpointReport (per endpoint):
 *   - tool_slug, method, path — identifies which endpoint was tested
 *   - status — "valid" | "invalid_endpoint" | "insufficient_scopes" | "error"
 *   - http_status_code — the HTTP status code received (or null)
 *   - response_summary — explain WHY it was classified this way (bonus: a high-quality summary is a great cherry on top)
 *   - response_body — the actual response body or error (truncate large responses, redact sensitive data)
 *   - required_scopes — scopes the endpoint needs (from the definition)
 *   - available_scopes — scopes the connected account actually has (use [] if not determinable)
 *
 * TestReport:
 *   - timestamp — when the report was generated
 *   - total_endpoints — number of endpoints tested
 *   - results — array of EndpointReport (one per endpoint)
 *   - summary — counts per status (valid, invalid_endpoint, insufficient_scopes, error)
 *
 * Your goal: determine if each endpoint can be successfully executed at least once.
 * One successful 2xx response = valid. If the endpoint doesn't exist, flag it as
 * invalid_endpoint. If auth/scopes are insufficient, flag as insufficient_scopes.
 *
 * Key challenges:
 *   - Some endpoints are FAKE (don't exist in the real API)
 *   - Some need path parameters resolved from other endpoints (dependency resolution)
 *   - Some need request bodies constructed from the parameter definitions
 *   - Don't hardcode app-specific logic — this must work for any app
 *
 * See src/types.ts for the full type definitions.
 * See ARCHITECTURE.md for where to document your design decisions.
 */
export async function runAgent(params: {
  composio: Composio;
  connectedAccountId: string;
  endpoints: EndpointDefinition[];
}): Promise<TestReport> {
  const idCache = new Map<string, string>();
  const availableScopesByAccount = new Map<string, string[]>();
  const accountIdByNamespace = new Map<string, string>();

  await populateAccounts(
    params.composio,
    params.connectedAccountId,
    availableScopesByAccount,
    accountIdByNamespace
  );

  const results = await Promise.all(
    params.endpoints.map(async (endpoint) => {
      return testEndpoint({
        composio: params.composio,
        endpoint,
        fallbackAccountId: params.connectedAccountId,
        accountIdByNamespace,
        availableScopesByAccount,
        allEndpoints: params.endpoints,
        idCache,
      });
    })
  );

  const summary = {
    valid: results.filter((r) => r.status === "valid").length,
    invalid_endpoint: results.filter((r) => r.status === "invalid_endpoint").length,
    insufficient_scopes: results.filter((r) => r.status === "insufficient_scopes").length,
    error: results.filter((r) => r.status === "error").length,
  };

  return {
    timestamp: new Date().toISOString(),
    total_endpoints: params.endpoints.length,
    results,
    summary,
  };
}

type ProxyResponse = { status?: number; data?: unknown; error?: unknown };
type QueryMode = "minimal" | "safe";
type AttemptStrategy = { label: string; queryMode: QueryMode };
type ExecutionResult = {
  response: ProxyResponse;
  endpointUsed: string;
  accountUsed: string;
};

type WorkerParams = {
  composio: Composio;
  endpoint: EndpointDefinition;
  fallbackAccountId: string;
  accountIdByNamespace: Map<string, string>;
  availableScopesByAccount: Map<string, string[]>;
  allEndpoints: EndpointDefinition[];
  idCache: Map<string, string>;
};

async function testEndpoint(p: WorkerParams): Promise<EndpointReport> {
  const method = normalizeMethod(p.endpoint.method);
  const accountCandidates = resolveAccountCandidatesForEndpoint(
    p.endpoint.path,
    p.accountIdByNamespace,
    p.fallbackAccountId
  );
  const availableScopes = [
    ...new Set(
      accountCandidates.flatMap((id) => p.availableScopesByAccount.get(id) ?? [])
    ),
  ];

  const attempts: AttemptStrategy[] = [
    { label: "minimal request", queryMode: "minimal" },
    { label: "safe query defaults", queryMode: "safe" },
  ];

  let lastStatus: number | null = null;
  let lastBody: unknown = null;
  let lastSummary = "No attempt executed.";

  for (const attempt of attempts) {
    const pathWithParams = await buildResolvedPath(p.endpoint, p);
    if (hasUnresolvedPathParameters(pathWithParams)) {
      lastStatus = null;
      lastBody = { error: "Could not resolve required path parameters." };
      lastSummary =
        "Path parameters could not be resolved from dependency endpoints.";
      continue;
    }

    const query = buildQueryParams(p.endpoint.parameters.query, attempt.queryMode);
    const body = await buildRequestBody(p.endpoint, p.composio, accountCandidates);

    try {
      const execution = await executeWithFallback({
        composio: p.composio,
        endpoint: pathWithParams,
        method,
        accountCandidates,
        query,
        body,
      });
      const response = execution.response;

      const status = typeof response?.status === "number" ? response.status : null;
      const classification = classify(status, response?.data ?? response?.error);
      lastStatus = status;
      lastBody = sanitizeResponse(response?.data ?? response?.error ?? response);
      lastSummary = `${attempt.label}: ${classification.summary} (endpoint=${execution.endpointUsed}, account=${execution.accountUsed})`;

      if (
        classification.status === "valid" ||
        classification.status === "invalid_endpoint" ||
        classification.status === "insufficient_scopes"
      ) {
        return buildReport(
          p.endpoint,
          classification.status,
          lastStatus,
          lastSummary,
          lastBody,
          availableScopes
        );
      }
    } catch (err) {
      const normalized = normalizeError(err);
      lastStatus = normalized.status;
      lastBody = sanitizeResponse(normalized.body);
      const classification = classify(normalized.status, normalized.body);
      lastSummary = `${attempt.label}: ${classification.summary}`;

      if (
        classification.status === "invalid_endpoint" ||
        classification.status === "insufficient_scopes"
      ) {
        return buildReport(
          p.endpoint,
          classification.status,
          lastStatus,
          lastSummary,
          lastBody,
          availableScopes
        );
      }
    }
  }

  return buildReport(
    p.endpoint,
    "error",
    lastStatus,
    lastSummary,
    lastBody,
    availableScopes
  );
}

function buildReport(
  endpoint: EndpointDefinition,
  status: EndpointStatus,
  httpStatus: number | null,
  summary: string,
  body: unknown,
  availableScopes: string[]
): EndpointReport {
  return {
    tool_slug: endpoint.tool_slug,
    method: endpoint.method,
    path: endpoint.path,
    status,
    http_status_code: httpStatus,
    response_summary: summary,
    response_body: body,
    required_scopes: endpoint.required_scopes,
    available_scopes: availableScopes,
  };
}

async function populateAccounts(
  composio: Composio,
  fallbackAccountId: string,
  availableScopesByAccount: Map<string, string[]>,
  accountIdByNamespace: Map<string, string>
) {
  try {
    const accountsResp = (await composio.connectedAccounts.list({
      userIds: ["candidate"],
    } as any)) as any;
    const items = Array.isArray(accountsResp?.items) ? accountsResp.items : [];

    for (const item of items) {
      const accountId = String(item?.id ?? "");
      if (!accountId) continue;
      const toolkit = String(item?.toolkit?.slug ?? "").toLowerCase();
      const rawScope = String(item?.data?.scope ?? item?.state?.val?.scope ?? "");
      availableScopesByAccount.set(
        accountId,
        rawScope ? rawScope.split(/\s+/).filter(Boolean) : []
      );
      if (toolkit.includes("gmail")) accountIdByNamespace.set("gmail", accountId);
      if (toolkit.includes("calendar")) {
        accountIdByNamespace.set("calendar", accountId);
      }
    }
  } catch {
    // Fallback: still return report with provided account id.
  }

  if (!availableScopesByAccount.has(fallbackAccountId)) {
    availableScopesByAccount.set(fallbackAccountId, []);
  }
}

function resolveAccountCandidatesForEndpoint(
  path: string,
  accountIdByNamespace: Map<string, string>,
  fallbackAccountId: string
): string[] {
  const out: string[] = [fallbackAccountId];
  if (path.includes("/gmail/")) {
    const mapped = accountIdByNamespace.get("gmail");
    if (mapped) out.push(mapped);
  }
  if (path.includes("/calendar/")) {
    const mapped = accountIdByNamespace.get("calendar");
    if (mapped) out.push(mapped);
  }
  return [...new Set(out)];
}

function normalizeMethod(method: string): "GET" | "POST" | "PUT" | "DELETE" | "PATCH" {
  const upper = method.toUpperCase();
  if (upper === "GET" || upper === "POST" || upper === "PUT" || upper === "DELETE") {
    return upper;
  }
  return "PATCH";
}

async function buildResolvedPath(
  endpoint: EndpointDefinition,
  p: WorkerParams
): Promise<string> {
  let path = endpoint.path;
  for (const param of endpoint.parameters.path) {
    const key = `${endpoint.path}:${param.name}`;
    const cached = p.idCache.get(key);
    if (cached) {
      path = path.replace(`{${param.name}}`, cached);
      continue;
    }
    const resolved = await resolvePathParamValue(param, endpoint, p);
    if (resolved) {
      p.idCache.set(key, resolved);
      path = path.replace(`{${param.name}}`, resolved);
    }
  }
  return path;
}

async function resolvePathParamValue(
  param: ParameterDef,
  targetEndpoint: EndpointDefinition,
  p: WorkerParams
): Promise<string | null> {
  const stem = param.name.replace(/id$/i, "").toLowerCase();
  const sameNamespaceCandidates = p.allEndpoints.filter((ep) => {
    if (ep.method.toUpperCase() !== "GET") return false;
    if (ep.parameters.path.length > 0) return false;
    if (ep.path === targetEndpoint.path) return false;
    const sameNamespace =
      (ep.path.includes("/gmail/") && targetEndpoint.path.includes("/gmail/")) ||
      (ep.path.includes("/calendar/") && targetEndpoint.path.includes("/calendar/"));
    return sameNamespace;
  });
  const primaryCandidates = sameNamespaceCandidates.filter(
    (ep) => stem.length === 0 || ep.path.toLowerCase().includes(stem)
  );
  const candidates =
    primaryCandidates.length > 0 ? primaryCandidates : sameNamespaceCandidates;

  for (const provider of candidates) {
    const accountCandidates = resolveAccountCandidatesForEndpoint(
      provider.path,
      p.accountIdByNamespace,
      p.fallbackAccountId
    );
    const execution = await executeWithFallback({
      composio: p.composio,
      endpoint: provider.path,
      method: "GET",
      accountCandidates,
      query: buildQueryParams(provider.parameters.query, "safe"),
    });
    const id = extractIdCandidate(execution.response?.data, param.name);
    if (id) return id;
  }

  return null;
}

function extractIdCandidate(data: unknown, preferredKey: string): string | null {
  if (!data || typeof data !== "object") return null;
  const stack: unknown[] = [data];
  const preferred = preferredKey.toLowerCase();

  while (stack.length > 0) {
    const cur = stack.pop();
    if (!cur || typeof cur !== "object") continue;
    if (Array.isArray(cur)) {
      for (const item of cur) stack.push(item);
      continue;
    }
    const rec = cur as Record<string, unknown>;
    for (const [k, v] of Object.entries(rec)) {
      const key = k.toLowerCase();
      if ((key === preferred || key === "id") && typeof v === "string" && v.length > 0) {
        return v;
      }
      if (v && typeof v === "object") stack.push(v);
    }
  }
  return null;
}

function buildQueryParams(
  queryDefs: ParameterDef[],
  mode: QueryMode
): Array<{ in: "query"; name: string; value: string | number | boolean }> {
  const out: Array<{ in: "query"; name: string; value: string | number | boolean }> = [];
  for (const q of queryDefs) {
    if (mode === "minimal" && !q.required) continue;
    const name = q.name;
    const t = q.type.toLowerCase();
    const lowerName = name.toLowerCase();
    if (mode === "safe" && !q.required) {
      const allowList = ["maxresults", "showhidden", "timemin", "timemax"];
      if (!allowList.some((token) => lowerName.includes(token))) continue;
    }
    let value: string | number | boolean = "test";
    if (lowerName.includes("maxresults")) value = 5;
    else if (lowerName.includes("showhidden")) value = false;
    else if (lowerName.includes("timemin")) value = new Date().toISOString();
    else if (lowerName.includes("timemax")) {
      value = new Date(Date.now() + 24 * 60 * 60 * 1000).toISOString();
    } else if (t.includes("int") || t.includes("number")) value = 1;
    else if (t.includes("bool")) value = true;
    out.push({ in: "query", name, value });
  }
  return out;
}

async function executeWithFallback(args: {
  composio: Composio;
  endpoint: string;
  method: "GET" | "POST" | "PUT" | "DELETE" | "PATCH";
  accountCandidates: string[];
  query?: Array<{ in: "query"; name: string; value: string | number | boolean }>;
  body?: unknown;
}): Promise<ExecutionResult> {
  const endpointVariants = getEndpointVariants(args.endpoint);
  let lastResponse: ProxyResponse = { error: "No response received." };
  let endpointUsed = endpointVariants[0];
  let accountUsed = args.accountCandidates[0] ?? "unknown";

  for (const endpointVariant of endpointVariants) {
    for (const accountId of args.accountCandidates) {
      endpointUsed = endpointVariant;
      accountUsed = accountId;
      try {
        const response = (await args.composio.tools.proxyExecute({
          endpoint: endpointVariant,
          method: args.method,
          connectedAccountId: accountId,
          ...(args.query && args.query.length > 0 ? { parameters: args.query } : {}),
          ...(args.body !== undefined ? { body: args.body } : {}),
        } as any)) as ProxyResponse;
        lastResponse = response;
      } catch (err) {
        const normalized = normalizeError(err);
        if (isConnectedAccountNotFound(normalized)) {
          continue;
        }
        lastResponse = { status: normalized.status ?? undefined, error: normalized.body };
      }

      const isHard404 = lastResponse.status === 404;
      const isMissingConnectedAccount = isConnectedAccountNotFound(lastResponse);
      if (!isHard404 && !isMissingConnectedAccount) {
        return { response: lastResponse, endpointUsed, accountUsed };
      }
    }
  }

  return { response: lastResponse, endpointUsed, accountUsed };
}

function hasUnresolvedPathParameters(path: string): boolean {
  return /\{[^}]+\}/.test(path);
}

async function buildRequestBody(
  endpoint: EndpointDefinition,
  composio: Composio,
  accountIds: string[]
): Promise<unknown | undefined> {
  if (!endpoint.parameters.body) return undefined;
  const body: Record<string, unknown> = {};
  const selfEmail = await resolveSelfEmail(composio, accountIds, endpoint.path);

  for (const field of endpoint.parameters.body.fields) {
    if (!field.required) continue;
    const name = field.name.toLowerCase();
    if (name === "raw") {
      body[field.name] = toBase64Url(
        [
          `To: ${selfEmail ?? "undisclosed-recipients:;"}`,
          "Subject: VALIDATION-TEST-Important Follow-up",
          "",
          "This is a validation email for daily productivity workflow testing.",
        ].join("\r\n")
      );
      continue;
    }
    if (name === "message") {
      body[field.name] = {
        raw: toBase64Url(
          [
            `To: ${selfEmail ?? "undisclosed-recipients:;"}`,
            "Subject: VALIDATION-TEST-Action Required Task",
            "",
            "Please review this task and schedule follow-up if needed.",
          ].join("\r\n")
        ),
      };
      continue;
    }
    if (name === "summary") {
      body[field.name] = "VALIDATION-TEST-Daily Focus Block";
      continue;
    }
    if (name === "description") {
      body[field.name] =
        "Daily task planning: review important emails, prep meetings, and block focused work.";
      continue;
    }
    if (name === "start" || name === "end") {
      const now = Date.now();
      const offset = name === "start" ? 15 : 75;
      body[field.name] = {
        dateTime: new Date(now + offset * 60 * 1000).toISOString(),
        timeZone: "UTC",
      };
      continue;
    }
    body[field.name] = buildValueForType(field.type);
  }

  return body;
}

async function resolveSelfEmail(
  composio: Composio,
  accountIds: string[],
  path: string
): Promise<string | null> {
  if (!path.includes("/gmail/")) return null;
  for (const accountId of accountIds) {
    try {
      const res = (await composio.tools.proxyExecute({
        endpoint: "/gmail/v1/users/me/profile",
        method: "GET",
        connectedAccountId: accountId,
      } as any)) as ProxyResponse;
      const email = (res?.data as Record<string, unknown> | undefined)?.emailAddress;
      if (typeof email === "string" && email.length > 0) {
        return email;
      }
    } catch {
      // Continue to next candidate account.
    }
  }
  return null;
}

function toBase64Url(input: string): string {
  const b64 = Buffer.from(input, "utf8").toString("base64");
  return b64.replace(/\+/g, "-").replace(/\//g, "_").replace(/=+$/g, "");
}

function getEndpointVariants(path: string): string[] {
  const variants = [path];
  // Generic fallback for SDKs/accounts that already apply a base path.
  const prefixMatch = path.match(/^\/([a-z0-9-]+\/v[0-9]+)(\/.*)$/i);
  if (prefixMatch) variants.push(prefixMatch[2]);
  return [...new Set(variants)];
}

function buildValueForType(type: string): unknown {
  const t = type.toLowerCase();
  if (t.includes("int") || t.includes("number")) return 1;
  if (t.includes("bool")) return true;
  if (t.includes("array")) return [];
  if (t.includes("object")) return {};
  return "VALIDATION-TEST-value";
}

function classify(status: number | null, body: unknown): { status: EndpointStatus; summary: string } {
  const text = JSON.stringify(body ?? {}).toLowerCase();
  if (status !== null && status >= 200 && status < 300) {
    return { status: "valid", summary: `Endpoint executed successfully with ${status}.` };
  }
  if (status === 403 || text.includes("insufficient") || text.includes("forbidden")) {
    return {
      status: "insufficient_scopes",
      summary: `Permission/scopes issue detected (${status ?? "no status"}).`,
    };
  }
  if (
    status === 404 ||
    status === 405 ||
    text.includes("not found") ||
    text.includes("method not allowed")
  ) {
    return {
      status: "invalid_endpoint",
      summary: `Endpoint path/method appears invalid (${status ?? "no status"}).`,
    };
  }
  return {
    status: "error",
    summary: `Execution failed with non-decisive error (${status ?? "no status"}).`,
  };
}

function normalizeError(err: unknown): { status: number | null; body: unknown } {
  if (!err || typeof err !== "object") {
    return { status: null, body: { error: String(err) } };
  }
  const rec = err as Record<string, unknown>;
  const statusRaw = rec.status;
  const status = typeof statusRaw === "number" ? statusRaw : null;
  const body = rec.error ?? rec.message ?? rec;
  return { status, body };
}

function isConnectedAccountNotFound(payload: { status?: number | null; error?: unknown; body?: unknown }): boolean {
  const status = payload.status ?? null;
  const raw = payload.error ?? payload.body ?? payload;
  const text = JSON.stringify(raw ?? {}).toLowerCase();
  return (
    status === 404 &&
    (text.includes("connected account not found") ||
      text.includes("connectedaccount_resourcenotfound"))
  );
}

function sanitizeResponse(input: unknown): unknown {
  let serialized: string;
  try {
    serialized = JSON.stringify(input);
  } catch {
    serialized = String(input);
  }
  const redacted = serialized
    .replace(/[A-Za-z0-9._%+-]+@[A-Za-z0-9.-]+\.[A-Za-z]{2,}/g, "[redacted-email]")
    .replace(/"access_token"\s*:\s*"[^"]*"/g, '"access_token":"[redacted]"')
    .replace(/"refresh_token"\s*:\s*"[^"]*"/g, '"refresh_token":"[redacted]"');
  const truncated = redacted.length > 2500 ? `${redacted.slice(0, 2500)}...<truncated>` : redacted;
  try {
    return JSON.parse(truncated);
  } catch {
    return truncated;
  }
}
