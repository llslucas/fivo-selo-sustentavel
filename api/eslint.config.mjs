// @ts-check
import eslint from '@eslint/js';
import eslintPluginPrettierRecommended from 'eslint-plugin-prettier/recommended';
import globals from 'globals';
import tseslint from 'typescript-eslint';

export default tseslint.config(
  {
    ignores: ['eslint.config.mjs'],
  },
  eslint.configs.recommended,
  ...tseslint.configs.recommendedTypeChecked,
  eslintPluginPrettierRecommended,
  {
    languageOptions: {
      globals: {
        ...globals.node,
        ...globals.jest,
      },
      sourceType: 'commonjs',
      parserOptions: {
        projectService: true,
        tsconfigRootDir: import.meta.dirname,
      },
    },
  },
  {
    rules: {
      '@typescript-eslint/no-explicit-any': 'off',
      '@typescript-eslint/no-floating-promises': 'warn',
      '@typescript-eslint/no-unsafe-argument': 'warn',
      'prettier/prettier': 'error',
    },
  },

  // Camada core: kernel puro. Só imports relativos e node:*.
  {
    files: ['src/core/**/*.ts'],
    rules: {
      'no-restricted-imports': [
        'error',
        {
          patterns: [
            {
              group: [
                '@nestjs/*',
                '@prisma/*',
                'express',
                'zod',
                '@infra/*',
                '@domain/*',
                'src/*',
              ],
              message:
                'src/core é o shared kernel: apenas imports relativos e node:*.',
            },
          ],
        },
      ],
    },
  },

  // Camada domain: regra de negócio pura. Não conhece Nest, ORM nem HTTP.
  {
    files: ['src/domain/**/*.ts'],
    rules: {
      'no-restricted-imports': [
        'error',
        {
          patterns: [
            {
              group: ['@infra/*', 'src/infra/*'],
              message:
                'src/domain não depende da infra. Regra pura aqui; orquestração no service em src/infra.',
            },
            {
              group: ['@prisma/*', 'express', '@nestjs/platform-express'],
              message:
                'src/domain não conhece ORM nem camada HTTP. Use as entidades de src/core e tipos próprios.',
            },
          ],
        },
      ],
    },
  },
);
