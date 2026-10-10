import tailwindcss from '@tailwindcss/vite';
import react from '@vitejs/plugin-react';
import path from 'path';
import {defineConfig, Plugin} from 'vite';
import {spawn} from 'child_process';

function apiPlugin(): Plugin {
  return {
    name: 'rpkclust-api',
    configureServer(server) {
      server.middlewares.use('/api/run', (req, res) => {
        if (req.method !== 'POST') {
          res.statusCode = 405;
          res.end(JSON.stringify({error: 'Method not allowed'}));
          return;
        }

        let body = '';
        req.on('data', chunk => {
          body += chunk;
        });

        req.on('end', () => {
          const py = spawn('python3', ['-m', 'rpkclust.api_runner']);
          let stdout = '';
          let stderr = '';

          py.stdout.on('data', data => {
            stdout += data;
          });
          py.stderr.on('data', data => {
            stderr += data;
          });

          py.on('close', code => {
            res.setHeader('Content-Type', 'application/json');
            if (code !== 0) {
              res.statusCode = 500;
              let responseObj: any = {
                status: 'error',
                stderr: stderr || 'Process terminated with non-zero exit code ' + code,
                message: 'Python execution failed (exit code ' + code + ')',
              };
              try {
                if (stdout && stdout.trim().length > 0) {
                  const parsed = JSON.parse(stdout);
                  responseObj = { ...parsed, stderr: stderr || parsed.stderr || parsed.trace };
                }
              } catch (_) {}
              res.end(JSON.stringify(responseObj));
            } else {
              try {
                const parsed = JSON.parse(stdout);
                if (stderr && stderr.trim().length > 0) {
                  parsed.stderr = stderr;
                }
                res.statusCode = parsed.status === 'error' ? 400 : 200;
                res.end(JSON.stringify(parsed));
              } catch (e) {
                res.statusCode = 500;
                res.end(
                  JSON.stringify({
                    status: 'error',
                    stderr: stderr + (stdout ? '\n' + stdout : ''),
                    message: 'Invalid JSON response from Python runner',
                  })
                );
              }
            }
          });

          py.stdin.write(body);
          py.stdin.end();
        });
      });
    },
  };
}

export default defineConfig(() => {
  return {
    plugins: [react(), tailwindcss(), apiPlugin()],
    resolve: {
      alias: {
        '@': path.resolve(__dirname, '.'),
      },
    },
    server: {
      // HMR is disabled in AI Studio via DISABLE_HMR env var.
      // Do not modify—file watching is disabled to prevent flickering during agent edits.
      hmr: process.env.DISABLE_HMR !== 'true',
      // Disable file watching when DISABLE_HMR is true to save CPU during agent edits.
      watch: process.env.DISABLE_HMR === 'true' ? null : {},
    },
  };
});
