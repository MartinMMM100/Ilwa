import type { ConfigContext, ExpoConfig } from 'expo/config';

// No map keys or billing configuration. Existing audio/image plugins remain in app.json.
export default ({ config }: ConfigContext): ExpoConfig => ({
  ...config,
  name: config.name ?? 'ILWA SafetyMap',
  slug: config.slug ?? 'ilwa-safety-map',
});
