const WebpackError = require('webpack/lib/WebpackError');

module.exports = class ErrorsMJMLParsing extends WebpackError {
  constructor(file, message) {
    super();
    this.name = 'ErrorsMJMLParsing';
    this.message = [file, message].join('\n');
    Error.captureStackTrace(this, this.constructor);
  }
};
