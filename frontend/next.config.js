module.exports = {
  output: 'standalone', // This fixes the react-dom error by bundling everything
  transpilePackages: ['zod'],
};