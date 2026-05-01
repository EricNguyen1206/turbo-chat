const baseConfig = require('@turbo-chat/jest');
const path = require('path');

module.exports = {
  ...baseConfig,
  moduleNameMapper: {
    ...baseConfig.moduleNameMapper,
    '^@turbo-chat/types$': path.resolve(__dirname, '../../packages/types/src/index.ts'),
    '^@turbo-chat/types/(.*)\\.js$': path.resolve(__dirname, '../../packages/types/src/$1.ts'),
    '^@turbo-chat/types/(.*)$': path.resolve(__dirname, '../../packages/types/src/$1'),
    '^@turbo-chat/shared$': path.resolve(__dirname, '../../packages/shared/src/index.ts'),
    '^@turbo-chat/shared/(.*)\\.js$': path.resolve(__dirname, '../../packages/shared/src/$1.ts'),
    '^@turbo-chat/validators$': path.resolve(__dirname, '../../packages/validators/src/index.ts'),
    '^@turbo-chat/validators/(.*)\\.js$': path.resolve(__dirname, '../../packages/validators/src/$1.ts'),
    // Handle the relative imports with .js extension inside the packages
    '^\\.\\/(.*)\\.js$': './$1',
  },
};
