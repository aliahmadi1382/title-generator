import js from '@eslint/js';

export default [
  { ignores: ['dist/**', 'release/**', 'node_modules/**', 'test-results/**'] },
  {
    ...js.configs.recommended,
    files: ['desktop/**/*.cjs', 'scripts/**/*.mjs', 'tests/**/*.cjs', '*.config.mjs'],
    languageOptions: {
      ecmaVersion: 'latest',
      globals: { __dirname: 'readonly', URL: 'readonly', Response: 'readonly', Headers: 'readonly', process: 'readonly', console: 'readonly', Buffer: 'readonly', setTimeout: 'readonly', clearTimeout: 'readonly', setInterval: 'readonly', clearInterval: 'readonly', window: 'readonly', localStorage: 'readonly' },
    },
    rules: { ...js.configs.recommended.rules, 'no-unused-vars': ['error', { argsIgnorePattern: '^_' }] },
  },
];
