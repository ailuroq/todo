import prettierPlugin from 'eslint-plugin-prettier';

export default [
  {
    files: ['**/*.js'], // Target JS files
    languageOptions: {
      ecmaVersion: 2022, // Enable ECMAScript 2022 for private fields (including '#')
      sourceType: 'module', // ES6 modules (import/export)
      globals: {
        browser: true, // Browser globals (if you're targeting the browser)
        node: true, // Node.js globals
      },
    },
    plugins: {
      prettier: prettierPlugin,
    },
    rules: {
      'no-unused-vars': 'error',
      'no-undef': 'error',
      eqeqeq: 'error',
      camelcase: 'error',
      curly: 'error',
      'no-multiple-empty-lines': ['error', { max: 1 }],
      'no-trailing-spaces': 'error',
      semi: ['error', 'always'],
      quotes: ['error', 'single'],
      indent: ['error', 2],

      // Prettier integration
      'prettier/prettier': 'error',
    },
  },
];
