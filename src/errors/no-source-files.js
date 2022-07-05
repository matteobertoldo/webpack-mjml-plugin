const WebpackError = require('webpack/lib/WebpackError');

module.exports = class NoSourceFilesWarning extends WebpackError {
  constructor(pattern, name) {
    super();
    this.name = 'NoSourceFilesWarning';
    this.message = [name, `No source files match the patterns: '${pattern}'`].join('\n');
    Error.captureStackTrace(this, this.constructor);
  }
};
