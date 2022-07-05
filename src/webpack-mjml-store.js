const fs = require('fs-extra');
const glob = require('glob');
const mjml2html = require('mjml');
const packageJSON = require('../package.json'); // eslint-disable-line import/extensions
const { NoSourceFilesWarning } = require('./errors/');

/**
 * @param {string} inputPath The path where `.mjml` files are located.
 * @param {object} options The `options` from https://documentation.mjml.io.
 * @constructor
 */
const WebpackMjmlStore = function (inputPath, options) {
  this.inputPath = inputPath.replace(/\\/g, '/');
  this.defaultOptions = { extension: '.html', outputPath: process.cwd() };
  this.options = { ...this.defaultOptions, ...options };
  this.options.outputPath = this.options.outputPath.replace(/\\/g, '/');
  this.warnings = [];
};

/**
 * @param {object} compiler
 */
WebpackMjmlStore.prototype.apply = function (compiler) {
  const that = this;
  compiler.hooks.make.tapAsync(packageJSON.name, function (compilation, callback) {
    fs.ensureDirSync(that.options.outputPath);

    glob(`${that.inputPath}/**/*.mjml`, function (err, files) {
      if (err) {
        throw err;
      }

      if (!files.length) {
        that.warnings.push(new NoSourceFilesWarning(that.inputPath, packageJSON.name));
        return callback();
      }

      const tasks = [];
      for (const index in files) {
        const file = files[index];
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

  compiler.hooks.afterCompile.tap(packageJSON.name, (compilation) => {
    compilation.warnings = [...compilation.warnings, ...this.warnings];
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
        console.log('\x1b[31m', `MJML error${response.errors.length > 1 ? 's' : ''} in file "${file}":`, '\x1b[0m');
      }

      for (const index in response.errors) {
        console.log('-', response.errors[index].formattedMessage);
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
 * @type {WebpackMjmlStore}
 */
module.exports = WebpackMjmlStore;
