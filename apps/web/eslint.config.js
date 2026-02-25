import reactConfig from "@raven/eslint/react";

export default [
  ...reactConfig,
  {
    ignores: ["dist/**", "node_modules/**"]
  }
];
