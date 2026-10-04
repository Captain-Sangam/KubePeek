import { access, cp, mkdir } from 'node:fs/promises';
import { fileURLToPath } from 'node:url';
import path from 'node:path';

// Next's standalone output omits browser assets. Docker and Electron copy
// them during packaging; npm start needs the same files for a local launch.
const root = fileURLToPath(new URL('../', import.meta.url));
const standalone = path.join(root, '.next/standalone');
await access(path.join(standalone, 'server.js'));
await mkdir(path.join(standalone, '.next'), { recursive: true });
await cp(path.join(root, '.next/static'), path.join(standalone, '.next/static'), { recursive: true });
await cp(path.join(root, 'public'), path.join(standalone, 'public'), { recursive: true });
