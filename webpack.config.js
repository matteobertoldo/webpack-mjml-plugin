const { join, resolve } = require('path');
const MJMLPlugin = require('./src/webpack-mjml-store');
const CleanTerminalPlugin = require('clean-terminal-webpack-plugin');
const SRC = './__tests__/mjml/';

module.exports = () => {
  return {
    devtool: false,
    entry: {},
    mode: 'development',
    output: {
      path: join(__dirname, './dist'),
      filename: 'js/[name].js'
    },
    plugins: [
      new MJMLPlugin(join(SRC, 'templates'), {
        extension: '.html',
        filePath: join(SRC, 'components'),
        outputPath: resolve(__dirname, 'dist/')
      }),
      new CleanTerminalPlugin({ skipFirstRun: true })
    ],
    stats: {
      builtAt: true,
      colors: true,
      entrypoints: false,
      modules: false
    }
  };
};
