import type { CapacitorConfig } from '@capacitor/cli';

const config: CapacitorConfig = {
  appId: 'io.github.zhannam85.turtlesteps',
  appName: 'Turtle Steps',
  webDir: 'dist',
  plugins: {
    // #697 — keep the native splash (LaunchScreen + SplashLogo) up until
    // React has mounted; otherwise cold launch is a ~0.1s blank flash.
    SplashScreen: {
      launchAutoHide: false,
      backgroundColor: '#ffffff',
      showSpinner: false,
    },
  },
};

export default config;
