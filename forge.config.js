const { FusesPlugin } = require('@electron-forge/plugin-fuses');
const { FuseV1Options, FuseVersion } = require('@electron/fuses');
const path = require('path');
const fs = require('fs');

// 1. Define absolute path and create a circuit breaker
const dbPath = path.join(__dirname, 'src', 'backend', 'app.db');

if (!fs.existsSync(dbPath)) {
  console.error(`\n[FATAL BUILD ERROR] Database not found at: ${dbPath}`);
  console.error(`Double-check directory casing, as the filesystem is case-sensitive.\n`);
  process.exit(1);
}

module.exports = {
  packagerConfig: {
    asar: true,
    extraResources: [
      './src/backend/app.db'
    ]
  },
  rebuildConfig: {},
  makers: [
    {
      name: '@electron-forge/maker-squirrel',
      config: {},
    },
    {
      name: '@electron-forge/maker-zip',
      platforms: ['win32', 'linux', 'darwin'],
    },
    {
      name: '@electron-forge/maker-deb',
      config: {},
    },
    {
      name: '@electron-forge/maker-rpm',
      config: {},
    },
  ],
  plugins: [
    {
      name: '@electron-forge/plugin-auto-unpack-natives',
      config: {},
    },
    {
      name: '@electron-forge/plugin-webpack',
      config: {
        mainConfig: './webpack.main.config.js',
        renderer: {
          config: './webpack.renderer.config.js',
          entryPoints: [
            {
              html: './src/index.html',
              js: './src/renderer.js',
              name: 'main_window',
              preload: {
                js: './src/preload.js',
              },
            },
          ],
        },
      },
    },
    // Fuses are used to enable/disable various Electron functionality
    // at package time, before code signing the application
    new FusesPlugin({
      version: FuseVersion.V1,
      [FuseV1Options.RunAsNode]: false,
      [FuseV1Options.EnableCookieEncryption]: true,
      [FuseV1Options.EnableNodeOptionsEnvironmentVariable]: false,
      [FuseV1Options.EnableNodeCliInspectArguments]: false,
      [FuseV1Options.EnableEmbeddedAsarIntegrityValidation]: true,
      [FuseV1Options.OnlyLoadAppFromAsar]: true,
    }),
  ],
  hooks: {
    // 2. The Fallback: Manually enforce the file copy before installers are made
    postPackage: async (config, packageResult) => {
      // packageResult.outputPaths[0] points to out/absencetracker-win32-x64
      const resourcesDir = path.join(packageResult.outputPaths[0], 'resources');
      const targetDbPath = path.join(resourcesDir, 'app.db');

      if (!fs.existsSync(targetDbPath)) {
        console.log(`\n[HOOK] Webpack stripped extraResource. Manually copying app.db to ${targetDbPath}...`);
        fs.copyFileSync(dbPath, targetDbPath);
        console.log('[HOOK] Database copy complete.\n');
      }
    }
  }
};
