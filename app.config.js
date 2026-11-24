// Dynamic Expo config. The user-facing version comes from version.json,
// which scripts/bump-version.js increments on every UAT/Store build.
// APP_VARIANT is set per build profile in eas.json:
//   uat   -> "Cooking Base (UAT)"  (all regular TestFlight builds)
//   store -> "My Cooking Base"     (only the real public App Store release)
const { version } = require('./version.json');

const IS_STORE = process.env.APP_VARIANT === 'store';

const BUNDLE_ID = IS_STORE
  ? 'com.JHarvey.CookingBaseStore'
  : 'com.JHarvey.CookingBase';

module.exports = ({ config }) => ({
  ...config,
  name: IS_STORE ? 'My Cooking Base' : 'Cooking Base (UAT)',
  slug: 'cooking-base',
  scheme: 'cookingbase',
  version,
  orientation: 'portrait',
  icon: './assets/icon.png',
  userInterfaceStyle: 'automatic',
  ios: {
    supportsTablet: false,
    bundleIdentifier: BUNDLE_ID,
  },
  android: {
    package: BUNDLE_ID,
    adaptiveIcon: {
      backgroundColor: '#FFF8F0',
      foregroundImage: './assets/android-icon-foreground.png',
      backgroundImage: './assets/android-icon-background.png',
      monochromeImage: './assets/android-icon-monochrome.png',
    },
    predictiveBackGestureEnabled: false,
  },
  web: {
    favicon: './assets/favicon.png',
  },
  plugins: ['expo-router'],
  extra: {
    variant: IS_STORE ? 'store' : 'uat',
  },
});