// @ts-check
import js from '@eslint/js';
import tseslint from 'typescript-eslint';
import prettierConfig from 'eslint-config-prettier';

export default tseslint.config(
  {
    ignores: [
      '**/node_modules/**',
      '**/dist/**',
      '**/build/**',
      '**/.next/**',
      '**/coverage/**',
      '**/generated/**',
      'backend/prisma/migrations/**',
    ],
  },

  js.configs.recommended,
  ...tseslint.configs.recommended,
  prettierConfig,

  {
    rules: {
      '@typescript-eslint/no-unused-vars': [
        'error',
        { argsIgnorePattern: '^_', varsIgnorePattern: '^_', caughtErrorsIgnorePattern: '^_' },
      ],
      // NestJS ใช้ decorator + DI ทำให้ interface ว่างและ non-null assertion เป็นเรื่องปกติ
      '@typescript-eslint/no-empty-interface': 'off',
      '@typescript-eslint/no-explicit-any': 'warn',
      'no-console': ['warn', { allow: ['warn', 'error'] }],
      eqeqeq: ['error', 'smart'],
    },
  },

  // ไฟล์ config ของ tooling รันบน Node — อนุญาต console และ CommonJS
  {
    files: ['**/*.config.{js,mjs,cjs,ts,mts}', '**/scripts/**/*.{js,mjs,cjs,ts}'],
    rules: {
      'no-console': 'off',
      '@typescript-eslint/no-require-imports': 'off',
    },
  },

  // seed / worker script พิมพ์ log ลง stdout เป็นเรื่องปกติ
  {
    files: ['backend/prisma/**/*.ts', 'backend/src/**/*.seed.ts'],
    rules: {
      'no-console': 'off',
    },
  },
);
