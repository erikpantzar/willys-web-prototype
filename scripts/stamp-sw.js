// Replaces the __BUILD_ID__ placeholder in dist/sw.js with the current git
// commit (falling back to a timestamp if git isn't available, e.g. a
// tarball build) — see the comment on BUILD_ID in public/sw.js for why.
import { readFileSync, writeFileSync } from 'node:fs';
import { execSync } from 'node:child_process';
import { fileURLToPath } from 'node:url';
import { dirname, join } from 'node:path';

const __dirname = dirname(fileURLToPath(import.meta.url));

function buildId() {
  try {
    return execSync('git rev-parse --short HEAD').toString().trim();
  } catch {
    return String(Date.now());
  }
}

const swPath = join(__dirname, '..', 'dist', 'sw.js');
const contents = readFileSync(swPath, 'utf8');
writeFileSync(swPath, contents.replace('__BUILD_ID__', buildId()));
