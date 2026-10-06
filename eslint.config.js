import js from '@eslint/js';
import tseslint from 'typescript-eslint';
import prettier from 'eslint-config-prettier';
import globals from 'globals';

const layerRule = (forbidden) => [
  'error',
  {
    patterns: forbidden.map((dir) => ({
      group: [`**/${dir}/**`, `../${dir}/*`, `../../${dir}/*`, `../../../${dir}/*`],
      message: `This layer must not import from ${dir}/ (see docs/ARCHITECTURE.md).`,
    })),
  },
];

export default tseslint.config(
  { ignores: ['dist', 'dev-dist', 'coverage', 'node_modules', 'playwright-report', 'test-results'] },
  js.configs.recommended,
  ...tseslint.configs.recommended,
  {
    languageOptions: {
      globals: { ...globals.browser, ...globals.node },
    },
    rules: {
      '@typescript-eslint/no-explicit-any': 'error',
      '@typescript-eslint/no-unused-vars': ['error', { argsIgnorePattern: '^_', varsIgnorePattern: '^_' }],
      'no-console': ['error', { allow: ['warn', 'error', 'info'] }],
      eqeqeq: ['error', 'always'],
    },
  },
  {
    files: ['src/core/**/*.ts', 'src/config/**/*.ts'],
    rules: { 'no-restricted-imports': layerRule(['game', 'ui', 'net', 'audio']) },
  },
  {
    files: ['scripts/**/*.ts'],
    rules: { 'no-console': 'off' },
  },
  prettier,
);
