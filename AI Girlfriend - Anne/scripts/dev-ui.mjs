import { spawn } from 'child_process';
import path from 'path';
import { fileURLToPath } from 'url';

const root = path.dirname(path.dirname(fileURLToPath(import.meta.url)));
const AGENT_STARTUP_DELAY_MS = 5000;

console.log(`Waiting ${AGENT_STARTUP_DELAY_MS / 1000}s for the agent worker to register...`);

await new Promise((resolve) => setTimeout(resolve, AGENT_STARTUP_DELAY_MS));

const child = spawn('npm', ['run', 'dev'], {
  cwd: path.join(root, 'anne-ui'),
  shell: true,
  stdio: 'inherit',
});

child.on('exit', (code) => process.exit(code ?? 0));
