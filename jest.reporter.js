// @ts-check

// Custom reporter used to print console only for failed tests
// Source: https://github.com/jestjs/jest/issues/4156#issuecomment-757376195

const { DefaultReporter } = require('@jest/reporters');

class Reporter extends DefaultReporter {
  /**
   * @param {string} _testPath
   * @param {import('@jest/reporters').Config.ProjectConfig} _config
   * @param {import('@jest/reporters').TestResult} result
   */
  printTestFileHeader(_testPath, _config, result) {
    const console = result.console;

    if (result.numFailingTests === 0 && !result.testExecError) {
      result.console = undefined;
    }

    super.printTestFileHeader(_testPath, _config, result);
    result.console = console;
  }
}

module.exports = Reporter;
