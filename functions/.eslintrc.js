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
  },
};
