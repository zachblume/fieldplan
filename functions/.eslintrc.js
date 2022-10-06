module.exports = {
  parserOptions: {
    // Required for certain syntax usages
    'ecmaVersion': 13,
  },
  root: true,
  env: {
    es6: true,
    node: true,
  },
  extends: [
    'eslint:recommended',
    'google',
  ],
  rules: {
    'quotes': ['error', 'single'], 'max-len': 0, 'require-jsdoc': 0,
    'indent': ['warn', 2],
    'object-curly-spacing': 0,
    'space-before-function-pare': 0,
  },
};
