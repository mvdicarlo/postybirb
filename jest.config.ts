import { getJestProjects } from '@nx/jest';
import type { Config } from 'jest';

const config: Config = {
  projects: getJestProjects(),
  collectCoverage: true,
  coverageDirectory: '<rootDir>/coverage',
  coverageReporters: ['html', 'text', 'lcov'],
};

export default config;
