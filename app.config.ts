import type { ExpoConfig } from 'expo/config';

// Public values only. Google Maps SDK keys are restricted to the app package / bundle id.
// The Google SERVER key, Supabase service role key and M-Pesa keys never go here.
const config: ExpoConfig = {
  name: 'Lift Me',
  slug: 'lift-me',
  scheme: 'liftme',
  version: '1.0.0',
  orientation: 'portrait',
  icon: './assets/icon.png',
  userInterfaceStyle: 'light',
  ios: {
    bundleIdentifier: 'com.liftme.app',
    supportsTablet: false,
    infoPlist: {
      NSLocationWhenInUseUsageDescription:
        'Lift Me uses your location to set your pickup point and, for drivers, to receive nearby ride requests.',
      NSLocationAlwaysAndWhenInUseUsageDescription:
        'Drivers: Lift Me shares your location while you are online or on a trip, even when the app is in the background, so passengers can see you arriving.',
      NSCameraUsageDescription: 'Drivers take photos of their documents and profile picture.',
      NSPhotoLibraryUsageDescription: 'Drivers can choose photos of their documents.',
      ITSAppUsesNonExemptEncryption: false,
    },
  },
  android: {
    package: 'com.liftme.app',
    adaptiveIcon: {
      backgroundColor: '#FFC107',
      foregroundImage: './assets/android-icon-foreground.png',
      backgroundImage: './assets/android-icon-background.png',
      monochromeImage: './assets/android-icon-monochrome.png',
    },
    permissions: [
      'ACCESS_COARSE_LOCATION',
      'ACCESS_FINE_LOCATION',
      'ACCESS_BACKGROUND_LOCATION',
      'FOREGROUND_SERVICE',
      'FOREGROUND_SERVICE_LOCATION',
      'CAMERA',
    ],
  },
  web: { favicon: './assets/favicon.png', bundler: 'metro', output: 'single' },
  plugins: [
    'expo-router',
    ['expo-splash-screen', { image: './assets/splash-icon.png', backgroundColor: '#101010', imageWidth: 160 }],
    'expo-font',
    'expo-secure-store',
    'expo-web-browser',
    [
      'expo-location',
      {
        locationWhenInUsePermission:
          'Lift Me uses your location to set your pickup point and, for drivers, to receive nearby ride requests.',
        locationAlwaysAndWhenInUsePermission:
          'Drivers: Lift Me shares your location while you are online or on a trip, even in the background.',
        isAndroidBackgroundLocationEnabled: true,
        isAndroidForegroundServiceEnabled: true,
        isIosBackgroundLocationEnabled: true,
      },
    ],
    [
      'expo-image-picker',
      {
        photosPermission: 'Drivers can choose photos of their documents.',
        cameraPermission: 'Drivers take photos of their documents and profile picture.',
      },
    ],
    [
      'react-native-maps',
      {
        androidGoogleMapsApiKey: process.env.GOOGLE_MAPS_ANDROID_KEY,
        iosGoogleMapsApiKey: process.env.GOOGLE_MAPS_IOS_KEY,
      },
    ],
  ],
  experiments: { typedRoutes: false },
  extra: { eas: { projectId: process.env.EAS_PROJECT_ID } },
};

export default config;
