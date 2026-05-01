import reactConfig from "@turbo-chat/eslint/react";

export default [
  ...reactConfig,
  {
    ignores: ["dist/**", "node_modules/**"]
  }
];
