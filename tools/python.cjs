// Host-only Python launcher: Windows uses python; macOS uses python3.
const { spawnSync } = require('node:child_process');
const candidates = process.platform === 'win32' ? ['python', 'python3'] : ['python3', 'python'];
for (const command of candidates) {
  const probe = spawnSync(command, ['-c', 'import sys; sys.exit(sys.version_info.major != 3)']);
  if (probe.status !== 0) continue;
  const result = spawnSync(command, process.argv.slice(2), { stdio: 'inherit' });
  if (result.error) console.error(result.error.message);
  process.exit(result.status ?? 1);
}
console.error('Python 3 was not found. Install it from https://www.python.org/downloads/ and reopen your terminal.');
process.exit(1);
