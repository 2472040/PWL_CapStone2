import js from '@eslint/js';
import reactPlugin from 'eslint-plugin-react';
import reactHooksPlugin from 'eslint-plugin-react-hooks';
import prettierConfig from 'eslint-config-prettier';
import globals from 'globals';

export default [
  // Global ignores for build output and dependencies
  {
    ignores: [
      'dist/**',
      'build/**',
      'node_modules/**',
      'server/logs/**',
      'logs/**',
      'tmp/**',
      'server/backups/**',
      'package-lock.json',
    ],
  },

  // Base recommended JS configs
  js.configs.recommended,

  {
    files: ['**/*.js', '**/*.jsx', '**/*.cjs', '**/*.mjs'],
    languageOptions: {
      ecmaVersion: 'latest',
      sourceType: 'module',
      parserOptions: {
        ecmaFeatures: {
          jsx: true,
        },
      },
      globals: {
        ...globals.browser,
        ...globals.node,
        // Testing globals
        describe: 'readonly',
        test: 'readonly',
        it: 'readonly',
        expect: 'readonly',
        beforeEach: 'readonly',
        afterEach: 'readonly',
      },
    },
    plugins: {
      react: reactPlugin,
      'react-hooks': reactHooksPlugin,
    },
    rules: {
      // Quality rules
      'no-unused-vars': ['warn', { argsIgnorePattern: '^_' }],
      'no-undef': 'warn',
      'no-console': 'off',
      'no-empty': 'off',
      'no-constant-condition': 'warn',
      'no-extra-boolean-cast': 'warn',
      'no-inner-declarations': 'warn',

      // React rules
      ...reactPlugin.configs.recommended.rules,
      'react/react-in-jsx-scope': 'off',
      'react/prop-types': 'off',
      'react/no-unescaped-entities': 'off',
      'react/jsx-no-comment-textnodes': 'off',
      'react/jsx-no-undef': 'warn',
      'react/no-direct-mutation-state': 'warn',
      'react/display-name': 'off',
      'react/jsx-key': 'warn',
      'react/no-find-dom-node': 'warn',
      'react/no-is-mounted': 'warn',
      'react/no-render-return-value': 'warn',
      'react/no-string-refs': 'warn',
      'react/no-unknown-property': 'warn',
      'react/require-render-return': 'warn',
      'react/jsx-no-target-blank': 'warn',
      'react/jsx-no-duplicate-props': 'warn',

      // Hooks rules
      ...reactHooksPlugin.configs.recommended.rules,
      'react-hooks/set-state-in-effect': 'off',
      'react-hooks/rules-of-hooks': 'warn',
      'react-hooks/exhaustive-deps': 'warn',
      'react-hooks/immutability': 'off',
    },
    settings: {
      react: {
        version: 'detect',
      },
    },
  },

  // Prettier config rules to disable formatting conflicts
  prettierConfig,
];
