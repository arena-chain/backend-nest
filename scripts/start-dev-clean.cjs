/**
 * Free TCP port 3000 (or PORT env) then start Nest in watch mode.
 * Avoids EADDRINUSE when a previous node process is still shutting down.
 */
const { execSync, spawn } = require('child_process');
const port = process.env.PORT || '3000';

function killPort() {
  try {
    execSync(`npx --yes kill-port ${port}`, { stdio: 'inherit', shell: true });
  } catch {
    /* ignore — nothing listening */
  }
}

killPort();
setTimeout(() => {
  killPort();
  const child = spawn('npx', ['nest', 'start', '--watch'], {
    stdio: 'inherit',
    shell: true,
    cwd: require('path').join(__dirname, '..'),
  });
  child.on('exit', (code) => process.exit(code ?? 0));
}, 800);
