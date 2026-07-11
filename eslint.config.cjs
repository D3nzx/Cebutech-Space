const js = require('@eslint/js');
const globals = require('globals');
const reactHooks = require('eslint-plugin-react-hooks');

module.exports = [
  {
    ignores: ['dist/**', 'database/**', 'create_restore.cjs'],
  },
  {
    files: ['**/*.{js,jsx,cjs,mjs}'],
    languageOptions: {
      globals: {
        ...globals.browser,
        ...globals.es2021,
        ...globals.node,
      },
      parserOptions: {
        ecmaVersion: 'latest',
        sourceType: 'module',
        ecmaFeatures: { jsx: true },
      },
    },
    plugins: {
      'react-hooks': reactHooks,
    },
    rules: {
      ...js.configs.recommended.rules,
      ...reactHooks.configs.recommended.rules,
      'no-unused-vars': 'off',
      'no-empty': 'off',
      'no-undef': 'off',
      'react-hooks/exhaustive-deps': 'off',
      'no-useless-escape': 'off',
    },
  },
];
