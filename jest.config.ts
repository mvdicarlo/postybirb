const { getJestProjects } = require('@nx/jest');

export default {
  projects: [
    ...getJestProjects(),
    '<rootDir>/apps/postybirb-ui',
    '<rootDir>/apps/postybirb',
    '<rootDir>/apps/client-server',
    '<rootDir>/libs/http',
    '<rootDir>/libs/fs',
    '<rootDir>/libs/utils/electron',
    '<rootDir>/libs/website-metadata',
    '<rootDir>/libs/form-builder',
  ],
};
