import type { CapacitorConfig } from '@capacitor/cli';

const config: CapacitorConfig = {
  appId: 'com.megamart.app',
  appName: 'Darzo',
  webDir: 'dist',
  
  // Server configuration for development (remove for production APK/IPA)
  server: {
    url: 'https://65637dbb-b265-45c8-9b12-3e83712f3664.lovableproject.com?forceHideBadge=true',
    cleartext: true,
    // Disable external navigation for security
    allowNavigation: ['*.megamart.app', '*.supabase.co', '*.lovableproject.com']
  },

  // Android specific configuration
  android: {
    allowMixedContent: true,
    captureInput: true,
    webContentsDebuggingEnabled: false, // Disable for production
    backgroundColor: '#f97316',
    // Full native app feel - no URL bar
    buildOptions: {
      keystorePath: undefined,
      keystorePassword: undefined,
      keystoreAlias: undefined,
      keystoreAliasPassword: undefined,
      releaseType: 'APK' // or 'AAB' for Play Store
    }
  },

  // iOS specific configuration
  ios: {
    contentInset: 'automatic',
    allowsLinkPreview: false,
    scrollEnabled: true,
    backgroundColor: '#f97316',
    preferredContentMode: 'mobile'
  },

  // Plugins configuration
  plugins: {
    // Splash Screen - shows while app loads
    SplashScreen: {
      launchShowDuration: 2500,
      launchAutoHide: true,
      backgroundColor: '#f97316',
      androidSplashResourceName: 'splash',
      androidScaleType: 'CENTER_CROP',
      showSpinner: true,
      spinnerStyle: 'large',
      spinnerColor: '#ffffff',
      splashFullScreen: true,
      splashImmersive: true,
      layoutName: 'launch_screen',
      useDialog: true
    },

    // Status Bar configuration
    StatusBar: {
      style: 'LIGHT',
      backgroundColor: '#f97316',
      overlaysWebView: false
    },

    // Push Notifications
    PushNotifications: {
      presentationOptions: ['badge', 'sound', 'alert']
    },

    // Keyboard behavior
    Keyboard: {
      resize: 'body',
      style: 'LIGHT',
      resizeOnFullScreen: true
    }
  }
};

export default config;
