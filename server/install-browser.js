import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { spawnSync } from 'node:child_process';
const root = path.dirname(fileURLToPath(import.meta.url));
const cli = path.join(root, 'node_modules', 'playwright', 'cli.js');
const result = spawnSync(process.execPath, [cli, 'install', 'chromium'], { stdio: 'inherit', env: { ...process.env, PLAYWRIGHT_BROWSERS_PATH: path.join(root, 'storage', 'browsers') } });
process.exit(result.status ?? 1);
