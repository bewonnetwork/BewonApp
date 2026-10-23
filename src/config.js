// Live web app + permanent APK download link
export const WEB_URL = 'https://bewonapp-bf500.web.app';
export const APK_URL = 'https://github.com/bewonnetwork/BewonApp/releases/download/latest/BewonChat.apk';

// APK-r vitore (native app) thakle "Download app" link dekhano hobe na
export const IS_NATIVE = typeof window !== 'undefined' && !!(window.Capacitor && window.Capacitor.isNativePlatform && window.Capacitor.isNativePlatform());
