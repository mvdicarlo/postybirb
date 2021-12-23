const { createGlobPatternsForDependencies } = require('@nrwl/react/tailwind');

module.exports = {
  purge: createGlobPatternsForDependencies(__dirname),
  content: [],
  theme: {
    extend: {},
  },
  plugins: [],
};
