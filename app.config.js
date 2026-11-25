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
    // Answers Apple's export-compliance question once: the app only uses
    // standard/exempt encryption (HTTPS). Set by hand because eas-cli can't
    // write to a dynamic config.
    infoPlist: {
      ITSAppUsesNonExemptEncryption: false,
    },
  },
  android: {
    package: BUNDLE_ID,
    adaptiveIcon: {
      backgroundColor: '#EEE3CD',
      foregroundImage: './assets/android-icon-foreground.png',
      backgroundImage: './assets/android-icon-background.png',
      monochromeImage: './assets/android-icon-monochrome.png',
    },
    predictiveBackGestureEnabled: false,
  },
  web: {
    favicon: './assets/favicon.png',
  },
  plugins: [
    'expo-router',
    [
      'expo-share-intent',
      {
        // Shows up in the Share sheet for web pages and plain text.
        iosShareExtensionName: IS_STORE ? 'My Cooking Base' : 'Cooking Base',
        iosActivationRules: {
          NSExtensionActivationSupportsWebURLWithMaxCount: 1,
          NSExtensionActivationSupportsWebPageWithMaxCount: 1,
          NSExtensionActivationSupportsText: true,
        },
        androidIntentFilters: ['text/*'],
      },
    ],
    [
      'expo-splash-screen',
      {
        image: './assets/splash-icon.png',
        imageWidth: 240,
        resizeMode: 'contain',
        // Matches the app's own light/dark backgrounds so the hand-off is seamless.
        backgroundColor: '#FFF8F0',
        dark: {
          image: './assets/splash-icon-dark.png',
          backgroundColor: '#1A1512',
        },
      },
    ],
  ],
  extra: {
    ...config.extra,
    variant: IS_STORE ? 'store' : 'uat',
    // Written by hand because eas-cli can't edit a dynamic app.config.js.
    eas: { projectId: 'ff92c210-b9af-4cef-9ccd-4e6ecd2f4d8c' },
  },
});
