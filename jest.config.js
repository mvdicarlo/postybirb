const { getJestProjects } = require('@nrwl/jest');

module.exports = {
  projects: [
    ...getJestProjects(),
    '<rootDir>/apps/ui',
    '<rootDir>/apps/postybirb',
    '<rootDir>/apps/client-server',
    '<rootDir>/libs/http',
    '<rootDir>/libs/fs',
    '<rootDir>/libs/utils/electron',
    '<rootDir>/libs/website-metadata',
    '<rootDir>/libs/form-builder',
  ],
};
