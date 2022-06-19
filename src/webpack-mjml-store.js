const fs = require('fs-extra');
const glob = require('glob');
const mjml2html = require('mjml');
const process = require('process');

/**
 * @param {String} inputPath
 * @param {object} options
 * @constructor
 */
const WebpackMjmlStore = function (inputPath, options) {
  this.inputPath = inputPath.replace(/\\/g, '/');
  this.defaultOptions = { extension: '.html', outputPath: process.cwd() };
  this.options = { ...this.defaultOptions, ...options };
  this.options.outputPath = this.options.outputPath.replace(/\\/g, '/');
};

/**
 * @param {object} compiler
 */
WebpackMjmlStore.prototype.apply = function (compiler) {
  const that = this;
  compiler.hooks.emit.tapAsync('webpack-mjml-store', function (compilation, callback) {
    fs.ensureDirSync(that.options.outputPath);

    glob(`${that.inputPath}/**/*.mjml`, function (err, files) {
      if (err) {
        throw err;
      }

      if (!files.length) {
        return callback();
      }

      const tasks = [];
      for (const fileKey in files) {
        const file = files[fileKey];
        if (compilation.fileDependencies.add) {
          compilation.fileDependencies.add(file);
        } else {
          compilation.fileDependencies.push(file);
        }

        const outputFile = file
          .replace(that.inputPath, that.options.outputPath)
          .replace('.mjml', that.options.extension);
        tasks.push(that.handleFile(file, outputFile));
      }

      Promise.all(tasks).then(callback());
    });
  });
};

/**
 * @param {string} file
 * @param {string} outputFile
 * @returns {Promise}
 */
WebpackMjmlStore.prototype.handleFile = function (file, outputFile) {
  const that = this;
  return new Promise(function (resolve) {
    that
      .convertFile(file)
      .then((contents) => that.ensureFileExists(outputFile, contents))
      .then((contents) => that.writeFile(outputFile, contents))
      .then(resolve());
  });
};

/**
 * @param {string} file
 * @returns {Promise}
 */
WebpackMjmlStore.prototype.convertFile = function (file) {
  const that = this;
  return new Promise(function (resolve) {
    fs.readFile(file, 'utf8', function (err, contents) {
      if (err) {
        throw err;
      }

      const response = mjml2html(contents, that.options);
      if (response.errors.length) {
        console.log('\x1b[36m', `MJML warning${response.errors.length > 1 ? 's' : ''} in file "${file}":`, '\x1b[0m');
      }

      for (const errorKey in response.errors) {
        console.log('  -  ', response.errors[errorKey].formattedMessage);
      }

      resolve(response.html);
    });
  });
};

/**
 * @param {string} file
 * @param {string} contents
 * @returns {Promise}
 */
WebpackMjmlStore.prototype.writeFile = function (file, contents) {
  return new Promise(function (resolve) {
    fs.writeFile(file, contents, function (err) {
      if (err) {
        throw err;
      }
      resolve(true);
    });
  });
};

/**
 * @param {string} file
 * @param {string} contents
 * @returns {Promise}
 */
WebpackMjmlStore.prototype.ensureFileExists = function (file, contents) {
  return new Promise(function (resolve) {
    fs.ensureFile(file, function (err) {
      if (err) {
        throw err;
      }
      resolve(contents);
    });
  });
};

/**
 * @type {WebpackMjmlStore}
 */
module.exports = WebpackMjmlStore;
