import { spawn, type ChildProcess } from 'node:child_process';
import { createConnection } from 'node:net';

const HOST = 'localhost';
const PORT = 4200;
const READY_TIMEOUT_MS = 120_000;
const POLL_INTERVAL_MS = 500;

async function isPortOpen(port: number, host: string): Promise<boolean> {
  return new Promise((resolve) => {
    const socket = createConnection({ port, host });
    socket.once('connect', () => { socket.end(); resolve(true); });
    socket.once('error', () => { resolve(false); });
  });
}

async function waitForReady(timeoutMs: number): Promise<void> {
  const deadline = Date.now() + timeoutMs;
  while (Date.now() < deadline) {
    if (await isPortOpen(PORT, HOST)) return;
    await new Promise((r) => setTimeout(r, POLL_INTERVAL_MS));
  }
  throw new Error(`dev server not ready on ${HOST}:${PORT} after ${timeoutMs}ms`);
}

export interface DevServerHandle {
  /** true if this process started the server; false if it was already running */
  spawned: boolean;
  stop: () => Promise<void>;
}

export async function ensureDevServer(): Promise<DevServerHandle> {
  if (await isPortOpen(PORT, HOST)) {
    return { spawned: false, stop: async () => {} };
  }

  const child: ChildProcess = spawn(
    'pnpm', ['--filter', 'docs', 'dev'],
    { shell: process.platform === 'win32', stdio: 'ignore', detached: false },
  );
  child.unref();

  try {
    await waitForReady(READY_TIMEOUT_MS);
  } catch (err) {
    child.kill('SIGTERM');
    throw err;
  }

  return {
    spawned: true,
    stop: async () => {
      child.kill('SIGTERM');
      await new Promise((r) => setTimeout(r, 500));
    },
  };
}
