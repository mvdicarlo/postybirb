const { join } = require('path');

module.exports = {
  plugins: {
    tailwindcss: { config: join(__dirname, 'tailwind.config.js') },
    autoprefixer: {},
    'postcss-import': {},
    'postcss-preset-mantine': {},
    'postcss-simple-vars': {
      variables: {
        'mantine-breakpoint-xs': '36em',
        'mantine-breakpoint-sm': '48em',
        'mantine-breakpoint-md': '62em',
        'mantine-breakpoint-lg': '75em',
        'mantine-breakpoint-xl': '88em',
      },
    },
  },
};
