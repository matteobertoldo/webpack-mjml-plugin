const WebpackError = require('webpack/lib/WebpackError');

module.exports = class BeautifyOptionDeprecated extends WebpackError {
  constructor(name) {
    super();
    this.name = 'BeautifyDeprecatedWarning';
    this.message = [name, 'The `beautify` option is deprecated in mjml-core and only available in mjml cli'].join('\n');
    Error.captureStackTrace(this, this.constructor);
  }
};
