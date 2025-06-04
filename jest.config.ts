import { getJestProjects } from '@nx/jest';
import type { Config } from 'jest';

const config: Config = {
  projects: getJestProjects(),
  collectCoverage: true,
  coverageDirectory: '<rootDir>/coverage',
  coverageReporters: ['html', 'text', 'lcov'],
  reporters: ['./jest.reporter.js'],
};

export default config;
