import tseslint from 'typescript-eslint'

export default tseslint.config(
  // Base recommended rules
  ...tseslint.configs.recommended,

  // Project-wide settings
  {
    languageOptions: {
      parserOptions: {
        projectService: true,
        tsconfigRootDir: import.meta.dirname,
      },
    },
    rules: {
      '@typescript-eslint/no-unused-vars': [
        'error',
        { argsIgnorePattern: '^_', varsIgnorePattern: '^_' },
      ],
      '@typescript-eslint/no-explicit-any': 'warn',
    },
  },

  // Ignore patterns
  {
    ignores: [
      'node_modules/',
      '**/dist/',
      '**/generated/',
      'apps/web-client/',
      '**/prisma.config.ts',
      'eslint.config.js',
      'background-worker.js',
    ],
  }
)
