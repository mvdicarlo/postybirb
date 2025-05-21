const { getJestProjects } = require('@nx/jest');

export default {
  projects: getJestProjects(),
  collectCoverage: true,
  coverageDirectory: '<rootDir>/coverage',
  coverageReporters: ['html', 'text', 'lcov'],
};
