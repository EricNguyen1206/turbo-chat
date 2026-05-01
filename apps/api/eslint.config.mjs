import nodeConfig from '@turbo-chat/eslint/node';

export default [
  ...nodeConfig,
  {
    settings: {
      'import/resolver': {
        typescript: {
          alwaysTryTypes: true,
          project: './tsconfig.json',
        },
      },
    },
  },
  {
    ignores: ['dist/', 'node_modules/', 'coverage/', '**/*.js', '**/*.mjs'],
  },
];
