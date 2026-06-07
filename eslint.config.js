import js from '@eslint/js';
import globals from 'globals';
import react from 'eslint-plugin-react';
import reactHooks from 'eslint-plugin-react-hooks';
import reactRefresh from 'eslint-plugin-react-refresh';

export default [
  {
    ignores: [
      'dist/**',
      'admin/dist/**',
      'build/**',
      'coverage/**',
      'node_modules/**',
      'supabase/functions/**',
      '*.config.js',
      '*.config.cjs',
    ],
  },
  js.configs.recommended,
  {
    files: ['**/*.{js,jsx,mjs,cjs}'],
    languageOptions: {
      ecmaVersion: 2022,
      sourceType: 'module',
      parserOptions: {
        ecmaFeatures: { jsx: true },
      },
      globals: {
        ...globals.browser,
        ...globals.node,
      },
    },
    settings: {
      react: { version: '18.3' },
    },
    plugins: {
      react,
      'react-hooks': reactHooks,
      'react-refresh': reactRefresh,
    },
    rules: {
      ...react.configs.recommended.rules,
      ...reactHooks.configs.recommended.rules,
      'react/react-in-jsx-scope': 'off',
      'react/prop-types': 'off',
      'react/no-unescaped-entities': 'off',
      'react/display-name': 'off',
      'no-unused-vars': ['warn', { argsIgnorePattern: '^_', varsIgnorePattern: '^_' }],
      'no-empty': ['warn', { allowEmptyCatch: true }],
      'no-undef': 'error',
      'react-refresh/only-export-components': 'off',
    },
  },
  {
    files: ['**/*.test.{js,jsx}', '**/*.spec.{js,jsx}', 'src/test/**/*.{js,jsx,mjs,cjs}'],
    languageOptions: {
      globals: {
        ...globals.jest,
        ...globals.node,
        vi: 'readonly',
        describe: 'readonly',
        it: 'readonly',
        expect: 'readonly',
        beforeEach: 'readonly',
        beforeAll: 'readonly',
        afterEach: 'readonly',
        afterAll: 'readonly',
      },
    },
  },
  {
    files: ['scripts/**/*.{js,mjs,cjs}'],
    languageOptions: {
      globals: { ...globals.node },
    },
  },
  {
    // Brand guardrail: no raw hex color literals in app/admin components.
    // Colors must come from theme tokens (colors.* in src/styles/theme.js) or
    // CSS variables (var(--color-...)). See BRAND.md.
    // NOTE: 'warn' for now — legacy raw hex still exists in ~120 files. Ratchet
    // to 'error' once those are migrated to tokens/vars.
    files: ['src/**/*.{js,jsx}', 'admin/**/*.{js,jsx}'],
    ignores: [
      'src/styles/theme.js',   // the JS token source of truth (defines the hexes)
      'src/design-system/**',  // design-system token defs + showcase
      '**/*.test.{js,jsx}',
      '**/*.spec.{js,jsx}',
    ],
    rules: {
      'no-restricted-syntax': [
        'warn',
        {
          selector: "Literal[value=/#([0-9a-fA-F]{8}|[0-9a-fA-F]{6}|[0-9a-fA-F]{3})/]",
          message:
            'No raw hex colors in components — use a theme token (colors.* from src/styles/theme.js) or a CSS variable (e.g. var(--color-success)). See BRAND.md.',
        },
        {
          selector: "TemplateElement[value.raw=/#([0-9a-fA-F]{8}|[0-9a-fA-F]{6}|[0-9a-fA-F]{3})/]",
          message:
            'No raw hex colors in template strings — use a CSS variable (e.g. var(--color-success)) or theme token. See BRAND.md.',
        },
      ],
    },
  },
];
