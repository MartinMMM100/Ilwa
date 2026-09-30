import { NativeModules, Platform } from 'react-native';

export function getApiBaseUrl() {
  if (__DEV__) {
    // On web, a relative URL uses the current Metro origin and its API proxy.
    if (Platform.OS === 'web') return '';

    // Expo Go can choose another Metro port when 8081 is already occupied.
    // Use the origin that supplied the native bundle so API traffic follows it.
    // React Native 0.86 only guarantees scriptURL through getConstants(); the plain
    // property may be missing, which would silently fall back to localhost on a phone.
    const sourceCode = NativeModules.SourceCode as
      | { scriptURL?: unknown; getConstants?: () => { scriptURL?: unknown } }
      | undefined;
    const scriptUrl: unknown = sourceCode?.scriptURL ?? sourceCode?.getConstants?.().scriptURL;
    if (typeof scriptUrl === 'string') {
      const metroOrigin = scriptUrl.match(/^https?:\/\/[^/]+/i)?.[0];
      if (metroOrigin) return metroOrigin;
    }
  }

  return (process.env.EXPO_PUBLIC_API_URL ?? 'http://localhost:4000').replace(/\/$/, '');
}
