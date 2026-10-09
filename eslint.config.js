import js from '@eslint/js';
import globals from 'globals';
import tseslint from 'typescript-eslint';

export default tseslint.config(
  { ignores: ['coverage/', 'dist/', 'node_modules/'] },
  js.configs.recommended,
  ...tseslint.configs.recommended,
  {
    files: ['src/**/*.ts'],
    languageOptions: { ecmaVersion: 'latest', globals: globals.browser },
  },
  {
    files: ['scripts/**/*.mjs', 'tests/**/*.mjs', '*.js'],
    languageOptions: { ecmaVersion: 'latest', globals: globals.node },
  },
);
