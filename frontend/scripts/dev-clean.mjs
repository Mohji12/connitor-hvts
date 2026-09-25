import { execSync, spawn } from 'child_process';
import { platform } from 'os';

const PORT = 3000;

function killPort(port) {
  try {
    if (platform() === 'win32') {
      const output = execSync(`netstat -ano | findstr ":${port}.*LISTENING"`, {
        encoding: 'utf8',
      });
      const pids = new Set(
        output
          .split('\n')
          .map((line) => line.trim().split(/\s+/).pop())
          .filter((pid) => pid && pid !== '0'),
      );

      for (const pid of pids) {
        try {
          execSync(`taskkill /PID ${pid} /F`, { stdio: 'ignore' });
          console.log(`Stopped process ${pid} on port ${port}`);
        } catch {
          // already exited
        }
      }
      return;
    }

    execSync(`lsof -ti:${port} | xargs kill -9`, { stdio: 'ignore' });
  } catch {
    // nothing listening
  }
}

killPort(PORT);

const child = spawn('npm', ['run', 'dev'], {
  stdio: 'inherit',
  shell: true,
});

child.on('exit', (code) => process.exit(code ?? 0));
