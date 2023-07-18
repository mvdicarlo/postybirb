module.exports = {
  presets: [
    [
      '@nrwl/react/babel',
      {
        runtime: 'automatic',
      },
    ],
    [
      '@babel/preset-react',
      {
        runtime: 'automatic',
        development: process.env.NODE_ENV === 'development',
        importSource: '@welldone-software/why-did-you-render',
      },
    ],
  ],
  plugins: [],
};
