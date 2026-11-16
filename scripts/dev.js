import { spawn } from 'node:child_process';
import { fileURLToPath } from 'node:url';
import path from 'node:path';

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const services = [
  { name: 'API', cwd: path.join(root, 'server'), args: ['src/server.js'] },
  { name: 'WEB', cwd: path.join(root, 'client CARE360'), args: ['node_modules/vite/bin/vite.js', '--host', '0.0.0.0'] },
];
const children = [];
let stopping = false;

function stopAll(exitCode = 0) {
  if (stopping) return;
  stopping = true;
  process.exitCode = exitCode;
  for (const child of children) {
    if (child && child.exitCode === null) child.kill();
  }
  const timer = setTimeout(() => {
    for (const child of children) if (child.exitCode === null) child.kill('SIGKILL');
  }, 5000);
  timer.unref();
}

for (const service of services) {
  const child = spawn(process.execPath, service.args, {
    cwd: service.cwd,
    stdio: 'inherit',
    windowsHide: true,
    shell: false,
  });
  children.push(child);
  child.on('error', error => {
    console.error('[' + service.name + '] failed to start: ' + error.message);
    stopAll(1);
  });
  child.on('exit', (code, signal) => {
    if (!stopping) {
      console.error('[' + service.name + '] stopped (code ' + code + ', signal ' + signal + '). Stopping CARE360.');
      stopAll(code ?? 1);
    }
  });
}
process.on('SIGINT', () => stopAll(0));
process.on('SIGTERM', () => stopAll(0));
