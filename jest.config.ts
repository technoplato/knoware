import { getJestProjects } from '@nx/jest';

export default {
  projects: getJestProjects(),
    preset: 'ts-jest',
  testEnvironment: 'node',
  // globals: {
  //   'ts-jest': {
  //     tsconfig: '<rootDir>/tsconfig.spec.json',
  //   },
  // },
};
