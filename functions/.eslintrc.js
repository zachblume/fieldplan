module.exports = {
  parserOptions: {
    // Required for certain syntax usages
    ecmaVersion: 'latest',
  },
  root: true,
  env: {
    es6: true,
    node: true,
  },
  extends: ['eslint:recommended', 'google', 'prettier'],
  rules: {
    'max-len': 0,
    'require-jsdoc': 0,
  },
};
