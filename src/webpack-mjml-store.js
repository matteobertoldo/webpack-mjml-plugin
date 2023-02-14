const fs = require('fs-extra');
const glob = require('glob');
const mjml2html = require('mjml');
const packageJSON = require('../package');
const webpack = require('webpack');
const { RawSource } = webpack.sources;
const { NoSourceFilesWarning, BeautifyOptionDeprecated, MinifyOptionDeprecated, ErrorsMJMLParsing } = require('./errors/');
const { basename } = require('path');

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
  this.tasks = [];
  this.directories = [];
  this.warnings = [];
  this.errors = [];
};

/**
 * @param {object} compiler
 */
WebpackMjmlStore.prototype.apply = function (compiler) {
  const that = this;
  compiler.hooks.make.tapAsync(packageJSON.name, function (compilation, callback) {
    glob(`${that.inputPath}`, async function (err, files) {
      if (err) {
        throw err;
      }

      if (!files.length) {
        that.warnings.push(new NoSourceFilesWarning(that.inputPath, packageJSON.name));
        return callback();
      }

      for (const index in files) {
        const file = files[index];
        const dist = that.options.outputPath === process.cwd() ? compilation.outputOptions.path : that.options.outputPath;
        const initialFile = `${dist}/${basename(file)}`;
        const outputFile = initialFile.replace('.mjml', that.options.extension);

        that.tasks.push(that.handleFile(file, outputFile));
        compilation.fileDependencies.add(file);

        const data = await that.convertFile(file, outputFile);
        compilation.emitAsset(basename(outputFile), new RawSource(data.response), {
          immutable: data.response === data.readable,
          javascriptModule: false
        });
      }

      Promise.all(that.tasks).then(callback());
    });
  });

  compiler.hooks.beforeCompile.tap(packageJSON.name, function () {
    that.errors = [];
  });

  compiler.hooks.afterCompile.tap(packageJSON.name, function (compilation) {
    if (that.options.filePath) {
      that.directories.push(that.options.filePath);
      that.directories.forEach((directory) => {
        compilation.contextDependencies.add(directory);
      });
    }

    // @mjml-core v4.9.2
    if (that.options.beautify) {
      that.warnings.push(new BeautifyOptionDeprecated(packageJSON.name));
    }

    // @mjml-core v4.9.2
    if (that.options.minify) {
      that.warnings.push(new MinifyOptionDeprecated(packageJSON.name));
    }

    compilation.warnings = [...compilation.warnings, ...that.warnings];
    compilation.errors = [...compilation.errors, ...that.errors];
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
 * @param {string} outputFile
 * @returns {Promise}
 */
WebpackMjmlStore.prototype.convertFile = function (file, outputFile) {
  const that = this;
  return new Promise(function (resolve) {
    fs.readFile(file, 'utf8', async function (err, contents) {
      if (err) {
        throw err;
      }

      const response = mjml2html(contents, that.options);
      for (const index in response.errors) {
        that.errors.push(new ErrorsMJMLParsing(file, response.errors[index].formattedMessage));
      }

      const data = await that.readFile(outputFile);
      resolve({
        response: response.html,
        readable: data
      });
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
    try {
      fs.writeFile(file, contents, function (err) {
        if (err) {
          throw err;
        }
        resolve(true);
      });
    } catch {
      resolve(true);
    }
  });
};

/**
 * @param {string} file
 * @returns {Promise}
 */
WebpackMjmlStore.prototype.readFile = function (file) {
  return new Promise(function (resolve) {
    try {
      fs.readFile(file, 'utf8', function (err, data) {
        if (err) {
          resolve(true);
        }
        resolve(data);
      });
    } catch {
      resolve(true);
    }
  });
};

/**
 * @type {WebpackMjmlStore}
 */
module.exports = WebpackMjmlStore;
