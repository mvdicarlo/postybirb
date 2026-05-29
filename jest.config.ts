import { getJestProjectsAsync } from '@nx/jest';
import type { Config } from 'jest';

export default async (): Promise<Config> => ({
  projects: await getJestProjectsAsync(),
  collectCoverage: true,
  coverageDirectory: '<rootDir>/coverage',
  coverageReporters: ['html', 'text', 'lcov'],
});
