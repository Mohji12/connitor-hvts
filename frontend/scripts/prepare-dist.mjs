import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const root = path.dirname(path.dirname(fileURLToPath(import.meta.url)));
const outDir = path.join(root, 'out');
const distDir = path.join(root, 'dist');

if (!fs.existsSync(outDir)) {
  console.error('Build output folder "out" not found. Did "next build" succeed?');
  process.exit(1);
}

const outIndex = path.join(outDir, 'index.html');
if (!fs.existsSync(outIndex)) {
  console.error(
    'out/index.html is missing. Static export did not produce the home page. Re-run: npm run build',
  );
  process.exit(1);
}

if (fs.existsSync(distDir)) {
  fs.rmSync(distDir, { recursive: true, force: true });
}

fs.cpSync(outDir, distDir, { recursive: true });
fs.rmSync(outDir, { recursive: true, force: true });

const vercelConfig = path.join(root, 'vercel.json');
if (fs.existsSync(vercelConfig)) {
  fs.copyFileSync(vercelConfig, path.join(distDir, 'vercel.json'));
}

const distIndex = path.join(distDir, 'index.html');
if (!fs.existsSync(distIndex)) {
  console.error('dist/index.html missing after copy — static export is incomplete.');
  process.exit(1);
}

console.log('Static export created at ./dist');
console.log(`Home page: ${distIndex} (${fs.statSync(distIndex).size} bytes)`);