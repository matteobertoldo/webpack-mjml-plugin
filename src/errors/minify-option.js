const WebpackError = require('webpack/lib/WebpackError');

module.exports = class MinifyOptionDeprecated extends WebpackError {
  constructor(name) {
    super();
    this.name = 'MinifyDeprecatedWarning';
    this.message = [name, 'The `minify` option is deprecated in mjml-core and only available in mjml cli'].join('\n');
    Error.captureStackTrace(this, this.constructor);
  }
};
