// Copies static shell files and the self-hosted Inter font into dist/.
import { cpSync, mkdirSync } from 'node:fs';

cpSync('public', 'dist', { recursive: true });
mkdirSync('dist/assets/fonts', { recursive: true });
cpSync(
  'node_modules/@fontsource-variable/inter/files/inter-latin-wght-normal.woff2',
  'dist/assets/fonts/inter-latin-wght-normal.woff2',
);
