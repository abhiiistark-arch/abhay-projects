"use client";

import { useEffect, useRef, useCallback, type RefObject } from "react";

const PARTICLE_WHITE = "#F8FAFC";
const PARTICLE_SILVER = "#C0C0C0";

function pickColor(): string {
  return Math.random() > 0.3 ? PARTICLE_WHITE : PARTICLE_SILVER;
}

type ParticleType = "node" | "dust" | "pixel" | "fragment";

type AmbientParticle = {
  x: number;
  y: number;
  size: number;
  color: string;
  alpha: number;
  phase: number;
};

type NetworkNode = {
  x: number;
  y: number;
  life: number;
  maxLife: number;
  size: number;
  color: string;
  kind: "hub" | "branch" | "tip";
};

type NetworkEdge = {
  from: NetworkNode;
  to: NetworkNode;
  life: number;
  maxLife: number;
};

type BurstParticle = {
  x: number;
  y: number;
  vx: number;
  vy: number;
  size: number;
  color: string;
  alpha: number;
  life: number;
  maxLife: number;
  type: ParticleType;
};

type BurstLink = {
  from: BurstParticle;
  to: BurstParticle;
  life: number;
  maxLife: number;
};

type Burst = {
  cx: number;
  cy: number;
  maxRadius: number;
  particles: BurstParticle[];
  links: BurstLink[];
};

const AMBIENT_COUNT = 45;
const MAX_BURSTS = 4;
const MAX_NETWORK_NODES = 28;
const MAX_NETWORK_EDGES = 48;

function pickSize(max = 5, rareMax = 7): number {
  if (Math.random() < 0.08) return 5.5 + Math.random() * (rareMax - 5.5);
  return 2 + Math.random() * (max - 2);
}

function pickType(): ParticleType {
  const r = Math.random();
  if (r < 0.5) return "node";
  if (r < 0.75) return "dust";
  if (r < 0.9) return "pixel";
  return "fragment";
}

function createAmbient(w: number, h: number): AmbientParticle {
  return {
    x: Math.random() * w,
    y: Math.random() * h,
    size: 1.2 + Math.random() * 2,
    color: pickColor(),
    alpha: 0.04 + Math.random() * 0.1,
    phase: Math.random() * Math.PI * 2,
  };
}

function createHubNode(x: number, y: number): NetworkNode {
  return {
    x,
    y,
    life: 0,
    maxLife: 100 + Math.random() * 40,
    size: 5.5 + Math.random() * 2.5,
    color: pickColor(),
    kind: "hub",
  };
}

function createBranchNode(x: number, y: number, kind: "branch" | "tip"): NetworkNode {
  return {
    x,
    y,
    life: 0,
    maxLife: 90 + Math.random() * 50,
    size: kind === "tip" ? 3.5 + Math.random() * 2 : 4.5 + Math.random() * 2,
    color: pickColor(),
    kind,
  };
}

function createEdge(from: NetworkNode, to: NetworkNode): NetworkEdge {
  return {
    from,
    to,
    life: 0,
    maxLife: Math.min(from.maxLife, to.maxLife) - 5,
  };
}

function growChain(
  parent: NetworkNode,
  startX: number,
  startY: number,
  nodes: NetworkNode[],
  edges: NetworkEdge[],
  segments?: number
): NetworkNode[] {
  let cx = startX;
  let cy = startY;
  let current = parent;
  const count = segments ?? 1 + Math.floor(Math.random() * 4);
  let heading = Math.random() * Math.PI * 2;
  const tips: NetworkNode[] = [];

  for (let s = 0; s < count; s++) {
    heading += (Math.random() - 0.5) * (1.2 + Math.random() * 1.5);
    const len = 30 + Math.random() * 95;
    cx += Math.cos(heading) * len;
    cy += Math.sin(heading) * len;

    const isTip = s === count - 1;
    const node = createBranchNode(cx, cy, isTip ? "tip" : "branch");
    nodes.push(node);
    edges.push(createEdge(current, node));
    current = node;
    if (isTip) tips.push(node);
  }

  return tips;
}

function connectRandomCrossLinks(
  newNodes: NetworkNode[],
  existingNodes: NetworkNode[],
  edges: NetworkEdge[],
  maxLinks: number
) {
  let added = 0;
  for (const a of newNodes) {
    for (const b of existingNodes) {
      if (a === b || added >= maxLinks) return;
      const dist = Math.hypot(a.x - b.x, a.y - b.y);
      if (dist > 45 && dist < 220 && Math.random() > 0.72) {
        edges.push(createEdge(a, b));
        added += 1;
      }
    }
  }
}

function spawnNetworkPath(
  x: number,
  y: number,
  nodes: NetworkNode[],
  edges: NetworkEdge[]
) {
  const prevHub = [...nodes].reverse().find((n) => n.kind === "hub");
  const hub = createHubNode(x, y);
  nodes.push(hub);

  if (prevHub) {
    edges.push(createEdge(prevHub, hub));
  }

  const existingBefore = nodes.slice(0, -1);
  const newTips: NetworkNode[] = [];
  const mode = Math.floor(Math.random() * 6);

  if (mode === 0) {
    if (Math.random() > 0.35) {
      newTips.push(...growChain(hub, x, y, nodes, edges, 1 + Math.floor(Math.random() * 2)));
    }
  } else if (mode === 1) {
    const rays = 1 + Math.floor(Math.random() * 5);
    for (let i = 0; i < rays; i++) {
      const angle = Math.random() * Math.PI * 2;
      const len = 40 + Math.random() * 100;
      const mid = createBranchNode(
        x + Math.cos(angle) * len * 0.45,
        y + Math.sin(angle) * len * 0.45,
        "branch"
      );
      const tip = createBranchNode(
        x + Math.cos(angle) * len,
        y + Math.sin(angle) * len,
        "tip"
      );
      nodes.push(mid, tip);
      edges.push(createEdge(hub, mid), createEdge(mid, tip));
      newTips.push(tip);
    }
  } else if (mode === 2) {
    newTips.push(...growChain(hub, x, y, nodes, edges, 2 + Math.floor(Math.random() * 5)));
  } else if (mode === 3) {
    const count = 2 + Math.floor(Math.random() * 4);
    for (let i = 0; i < count; i++) {
      const angle = Math.random() * Math.PI * 2;
      const dist = 50 + Math.random() * 120;
      const tip = createBranchNode(x + Math.cos(angle) * dist, y + Math.sin(angle) * dist, "tip");
      nodes.push(tip);
      if (Math.random() > 0.45) {
        const mid = createBranchNode(
          x + Math.cos(angle) * dist * 0.55,
          y + Math.sin(angle) * dist * 0.55,
          "branch"
        );
        nodes.push(mid);
        edges.push(createEdge(hub, mid), createEdge(mid, tip));
      } else {
        edges.push(createEdge(hub, tip));
      }
      newTips.push(tip);
    }
  } else if (mode === 4) {
    let px = x;
    let py = y;
    let parent = hub;
    const turns = 2 + Math.floor(Math.random() * 4);
    let dir = Math.random() * Math.PI * 2;
    for (let t = 0; t < turns; t++) {
      dir += (Math.random() > 0.5 ? 1 : -1) * (0.6 + Math.random() * 1.4);
      const len = 45 + Math.random() * 80;
      px += Math.cos(dir) * len;
      py += Math.sin(dir) * len;
      const isLast = t === turns - 1;
      const node = createBranchNode(px, py, isLast ? "tip" : "branch");
      nodes.push(node);
      edges.push(createEdge(parent, node));
      parent = node;
      if (isLast) newTips.push(node);
    }
  } else {
    const arms = 2 + Math.floor(Math.random() * 3);
    for (let i = 0; i < arms; i++) {
      newTips.push(...growChain(hub, x, y, nodes, edges, 1 + Math.floor(Math.random() * 3)));
    }
    for (let i = 0; i < newTips.length; i++) {
      for (let j = i + 1; j < newTips.length; j++) {
        const dist = Math.hypot(newTips[i].x - newTips[j].x, newTips[i].y - newTips[j].y);
        if (dist > 40 && dist < 160 && Math.random() > 0.55) {
          edges.push(createEdge(newTips[i], newTips[j]));
        }
      }
    }
  }

  connectRandomCrossLinks(newTips, existingBefore, edges, 2 + Math.floor(Math.random() * 3));

  if (nodes.length > MAX_NETWORK_NODES) {
    nodes.splice(0, nodes.length - MAX_NETWORK_NODES);
  }
  if (edges.length > MAX_NETWORK_EDGES) {
    edges.splice(0, edges.length - MAX_NETWORK_EDGES);
  }
}

function createBurstParticle(cx: number, cy: number, maxRadius: number): BurstParticle {
  const angle = Math.random() * Math.PI * 2;
  const dist = Math.pow(Math.random(), 0.7) * (maxRadius * 0.35);
  const speed = 0.6 + Math.random() * 3.2;

  return {
    x: cx + Math.cos(angle) * dist,
    y: cy + Math.sin(angle) * dist,
    vx: Math.cos(angle) * speed,
    vy: Math.sin(angle) * speed,
    size: pickSize(),
    color: pickColor(),
    alpha: 0.55 + Math.random() * 0.35,
    life: 0,
    maxLife: 90 + Math.random() * 90,
    type: pickType(),
  };
}

function buildBurstLinks(particles: BurstParticle[]): BurstLink[] {
  const links: BurstLink[] = [];
  const maxDist = 90;
  const target = 10 + Math.floor(Math.random() * 12);

  for (let i = 0; i < particles.length && links.length < target; i++) {
    for (let j = i + 1; j < particles.length && links.length < target; j++) {
      const dist = Math.hypot(particles[i].x - particles[j].x, particles[i].y - particles[j].y);
      if (dist < maxDist && Math.random() > 0.4) {
        links.push({
          from: particles[i],
          to: particles[j],
          life: 0,
          maxLife: 50 + Math.random() * 40,
        });
      }
    }
  }

  return links;
}

function drawDot(
  ctx: CanvasRenderingContext2D,
  x: number,
  y: number,
  size: number,
  type: ParticleType = "node"
) {
  if (type === "pixel") {
    ctx.fillRect(x - size * 0.5, y - size * 0.5, size, size);
  } else if (type === "fragment") {
    ctx.beginPath();
    ctx.moveTo(x, y - size * 0.45);
    ctx.lineTo(x + size * 0.35, y + size * 0.35);
    ctx.lineTo(x - size * 0.35, y + size * 0.25);
    ctx.closePath();
    ctx.fill();
  } else {
    ctx.beginPath();
    ctx.arc(x, y, size * 0.5, 0, Math.PI * 2);
    ctx.fill();
  }
}

interface HeroParticleFieldProps {
  active?: boolean;
  containerRef: RefObject<HTMLElement | null>;
}

export function HeroParticleField({ active = true, containerRef }: HeroParticleFieldProps) {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const ambientRef = useRef<AmbientParticle[]>([]);
  const burstsRef = useRef<Burst[]>([]);
  const networkNodesRef = useRef<NetworkNode[]>([]);
  const networkEdgesRef = useRef<NetworkEdge[]>([]);
  const lastAnchorRef = useRef<{ x: number; y: number } | null>(null);
  const nextAnchorDistRef = useRef(35 + Math.random() * 40);
  const timeRef = useRef(0);
  const reducedMotionRef = useRef(false);

  const spawnBurst = useCallback((x: number, y: number) => {
    const maxRadius = 150 + Math.random() * 150;
    const count = 45 + Math.floor(Math.random() * 30);
    const particles = Array.from({ length: count }, () => createBurstParticle(x, y, maxRadius));

    burstsRef.current.push({
      cx: x,
      cy: y,
      maxRadius,
      particles,
      links: buildBurstLinks(particles),
    });

    if (burstsRef.current.length > MAX_BURSTS) {
      burstsRef.current.shift();
    }
  }, []);

  useEffect(() => {
    reducedMotionRef.current = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
    if (!active || reducedMotionRef.current) return;

    const canvas = canvasRef.current;
    const container = containerRef.current;
    if (!canvas || !container) return;

    const ctx = canvas.getContext("2d", { alpha: true });
    if (!ctx) return;

    let running = true;
    let w = 0;
    let h = 0;

    const resize = () => {
      const rect = container.getBoundingClientRect();
      const dpr = Math.min(window.devicePixelRatio || 1, 2);
      w = rect.width;
      h = rect.height;
      canvas.width = w * dpr;
      canvas.height = h * dpr;
      canvas.style.width = `${w}px`;
      canvas.style.height = `${h}px`;
      ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
      ambientRef.current = Array.from({ length: AMBIENT_COUNT }, () => createAmbient(w, h));
    };

    resize();
    const observer = new ResizeObserver(resize);
    observer.observe(container);

    const onMove = (e: MouseEvent) => {
      const rect = container.getBoundingClientRect();
      const x = e.clientX - rect.left;
      const y = e.clientY - rect.top;

      const anchor = lastAnchorRef.current;
      const dist = anchor ? Math.hypot(x - anchor.x, y - anchor.y) : nextAnchorDistRef.current;

      if (dist >= nextAnchorDistRef.current) {
        spawnNetworkPath(x, y, networkNodesRef.current, networkEdgesRef.current);
        lastAnchorRef.current = { x, y };
        nextAnchorDistRef.current = 32 + Math.random() * 48;
      }
    };

    const onClick = (e: MouseEvent) => {
      const target = e.target as HTMLElement;
      if (target.closest("a, button, input, textarea, [data-no-particles]")) return;
      const rect = container.getBoundingClientRect();
      spawnBurst(e.clientX - rect.left, e.clientY - rect.top);
    };

    container.addEventListener("mousemove", onMove, { passive: true });
    container.addEventListener("click", onClick);

    const drawAmbient = () => {
      const t = timeRef.current;

      for (const p of ambientRef.current) {
        const x = p.x + Math.sin(t * 0.004 + p.phase) * 0.4;
        const y = p.y + Math.cos(t * 0.003 + p.phase) * 0.4;

        ctx.save();
        ctx.fillStyle = p.color;
        ctx.globalAlpha = Math.min(p.alpha, 0.14);
        drawDot(ctx, x, y, p.size, "dust");
        ctx.restore();
      }
    };

    const drawNetwork = () => {
      const aliveEdges: NetworkEdge[] = [];
      const aliveNodes: NetworkNode[] = [];

      for (const edge of networkEdgesRef.current) {
        edge.life += 1;
        if (edge.life >= edge.maxLife) continue;

        const fadeA = 1 - edge.from.life / edge.from.maxLife;
        const fadeB = 1 - edge.to.life / edge.to.maxLife;
        const fade = Math.min(fadeA, fadeB);
        const alpha = fade * 0.55;
        if (alpha < 0.02) continue;

        ctx.save();
        ctx.strokeStyle = `rgba(248, 250, 252, ${alpha})`;
        ctx.lineWidth = edge.from.kind === "hub" && edge.to.kind === "hub" ? 1 : 0.65;
        ctx.beginPath();
        ctx.moveTo(edge.from.x, edge.from.y);
        ctx.lineTo(edge.to.x, edge.to.y);
        ctx.stroke();
        ctx.restore();

        aliveEdges.push(edge);
      }

      for (const node of networkNodesRef.current) {
        node.life += 1;
        if (node.life >= node.maxLife) continue;

        const lifeRatio = 1 - node.life / node.maxLife;

        ctx.save();
        ctx.fillStyle = node.color;
        ctx.globalAlpha = 0.45 + lifeRatio * 0.55;
        drawDot(ctx, node.x, node.y, node.size, "node");
        ctx.restore();

        aliveNodes.push(node);
      }

      networkEdgesRef.current = aliveEdges;
      networkNodesRef.current = aliveNodes;
    };

    const drawBursts = () => {
      burstsRef.current = burstsRef.current.filter((burst) => {
        let hasContent = false;

        burst.links = burst.links.filter((link) => {
          link.life += 1;
          if (link.life >= link.maxLife) return false;

          const fade = 1 - link.life / link.maxLife;
          const alpha = fade * fade * 0.45;

          ctx.save();
          ctx.strokeStyle = `rgba(248, 250, 252, ${alpha})`;
          ctx.lineWidth = 0.55 + fade * 0.25;
          ctx.beginPath();
          ctx.moveTo(link.from.x, link.from.y);
          ctx.lineTo(link.to.x, link.to.y);
          ctx.stroke();
          ctx.restore();

          hasContent = true;
          return true;
        });

        const alive: BurstParticle[] = [];
        for (const p of burst.particles) {
          p.life += 1;
          if (p.life >= p.maxLife) continue;

          p.vx *= 0.975;
          p.vy *= 0.975;
          p.vy += 0.008;
          p.x += p.vx;
          p.y += p.vy;

          const dist = Math.hypot(p.x - burst.cx, p.y - burst.cy);
          if (dist > burst.maxRadius * 1.15) continue;

          const lifeRatio = 1 - p.life / p.maxLife;
          const edgeFade = 1 - Math.max(0, (dist - burst.maxRadius * 0.65) / (burst.maxRadius * 0.5));

          ctx.save();
          ctx.fillStyle = p.color;
          ctx.globalAlpha = p.alpha * lifeRatio * edgeFade;
          drawDot(ctx, p.x, p.y, p.size, p.type);
          ctx.restore();

          alive.push(p);
          hasContent = true;
        }

        burst.particles = alive;
        return hasContent;
      });
    };

    const tick = () => {
      if (!running) return;
      timeRef.current += 1;

      ctx.clearRect(0, 0, w, h);

      drawAmbient();
      drawNetwork();
      drawBursts();

      requestAnimationFrame(tick);
    };

    const frame = requestAnimationFrame(tick);

    return () => {
      running = false;
      cancelAnimationFrame(frame);
      observer.disconnect();
      container.removeEventListener("mousemove", onMove);
      container.removeEventListener("click", onClick);
    };
  }, [active, containerRef, spawnBurst]);

  return (
    <>
      <div className="hero-charcoal-bg absolute inset-0 z-0 pointer-events-none" aria-hidden="true" />
      <canvas
        ref={canvasRef}
        className="absolute inset-0 z-[1] pointer-events-none"
        aria-hidden="true"
      />
    </>
  );
}
