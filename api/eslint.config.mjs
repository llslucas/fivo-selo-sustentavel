// @ts-check
import eslint from '@eslint/js';
import eslintPluginPrettierRecommended from 'eslint-plugin-prettier/recommended';
import globals from 'globals';
import tseslint from 'typescript-eslint';

// Ordem de dependência entre as fatias de src/domain/fivo (AD-022).
const FATIAS_DOMINIO = [
  'shared',
  'identidade',
  'empresas',
  'catalogo',
  'campanhas',
];

const REGRAS_DOMINIO = [
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
];

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

  // Camada domain: regra de negócio pura, fatiada por feature. Cada fatia só
  // enxerga as fatias à sua esquerda em FATIAS_DOMINIO, e só pelo index.ts.
  ...FATIAS_DOMINIO.map((fatia, i) => ({
    files: [`src/domain/fivo/${fatia}/**/*.ts`],
    rules: {
      'no-restricted-imports': [
        'error',
        {
          patterns: [
            ...REGRAS_DOMINIO,
            {
              group: ['@domain/fivo/*/**', '../../**'],
              message:
                'Outra fatia só é importada pelo index.ts dela (@domain/fivo/<fatia>); dentro da fatia, use import relativo.',
            },
            ...(i < FATIAS_DOMINIO.length - 1
              ? [
                  {
                    group: FATIAS_DOMINIO.slice(i + 1).map(
                      (f) => `@domain/fivo/${f}`,
                    ),
                    message: `A fatia ${fatia} não depende de fatias à sua direita (${FATIAS_DOMINIO.join(' ← ')}).`,
                  },
                ]
              : []),
          ],
        },
      ],
    },
  })),
);
