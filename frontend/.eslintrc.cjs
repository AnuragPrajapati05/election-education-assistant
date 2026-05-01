module.exports = {
  root: true,
  env: {
    browser: true,
    es2022: true,
    node: true,
  },
  parserOptions: {
    ecmaFeatures: { jsx: true },
    ecmaVersion: "latest",
    sourceType: "module",
  },
  settings: {
    react: { version: "detect" },
  },
  plugins: ["react", "react-hooks"],
  extends: ["eslint:recommended", "plugin:react/recommended", "plugin:react-hooks/recommended"],
  rules: {
    "no-console": ["warn", { allow: ["warn", "error"] }],
    "no-unused-vars": ["warn", { argsIgnorePattern: "^_", varsIgnorePattern: "^_" }],
    "react/no-unescaped-entities": "off",
    "react/prop-types": "off",
    "react/react-in-jsx-scope": "off",
  },
};
