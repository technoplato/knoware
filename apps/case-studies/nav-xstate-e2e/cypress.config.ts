import { nxE2EPreset } from '@nx/cypress/plugins/cypress-preset';

import { defineConfig } from 'cypress';

export default defineConfig({
  e2e: {
    ...nxE2EPreset(__filename, {
      cypressDir: 'src',
      webServerCommands: {
        default: 'nx run nav-xstate-case-study:serve',
        production: 'nx run nav-xstate-case-study:preview',
      },
      ciWebServerCommand: 'nx run nav-xstate-case-study:serve-static',
    }),
    baseUrl: 'http://localhost:4200',
  },
});
