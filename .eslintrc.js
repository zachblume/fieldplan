module.exports = {
  env: {
    browser: true,
    es2021: true,
    node: true,
  },
  extends: ["eslint:recommended", "prettier"],
  parserOptions: {
    ecmaVersion: "latest",
    sourceType: "module",
  },
  rules: {
    "no-undef": 0,
    "no-unused-vars": [
      "error",
      {
        varsIgnorePattern: "STRIPE",
      },
    ],
  },
  ignorePatterns: [
    "functions/*",
    "*/functions/*",
    "functions/*.js",
    "node*",
    ".eslintrc.js",
  ],
};
