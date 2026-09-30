# Free mobile street maps: MapLibre + OpenFreeMap

No Google Cloud account, payment card, map API key, or map-specific native SDK build is
needed for this version. OpenFreeMap's public service currently advertises no registration,
API keys or request limits. It is community-funded and provided as-is. Keep its source
attribution visible and recheck its published terms before a wider rollout.

## Apply this migration

This patch is for the project **after** applying `ilwa-google-mobile-map.patch`. Keep your
current feature branch and local Google-map changes; the migration modifies those files.
It does not change your `.env`, MongoDB data, admin dashboard or transcription behavior.

```bash
git apply --check --ignore-space-change ../ilwa-maplibre-migration.patch
git apply --ignore-space-change ../ilwa-maplibre-migration.patch
npm ci
```

Use the actual path to the patch. Stop if the check fails; it means your source differs from
the expected Google-map version. Do not force it or apply both versions over each other.
The migration removes the Google Maps package and build-key configuration and replaces
the earlier Google setup document with this one.

## Configure the API, not the map

Keep your existing MongoDB and OpenAI settings in local `.env`. On a physical phone:

```dotenv
EXPO_PUBLIC_API_URL=http://YOUR_COMPUTER_LAN_IP:4000
```

The phone and API computer must be on a mutually reachable network. `localhost` on the
phone points at the phone, not your computer. Google Maps key variables can be removed
from `.env`; this version does not read them or contact Google Maps.

First terminal:

```bash
npm run seed:incidents
npm run server
```

Second terminal:

```bash
npx expo start --clear
```

Open the project in **Expo Go** on Android or iPhone. Use an Expo Go version compatible
with this project's Expo SDK 57. The map uses `react-native-webview`, included in Expo Go;
it does not use MapLibre React Native's custom native SDK.

If you already generated `android` or `ios` directories for the old Google version, opening
Expo Go does not use those builds. A previously installed standalone binary will not gain
the WebView dependency until you rebuild it. For a later standalone build, regenerate its
native configuration using your team's Expo workflow and preserve any native customizations.
An iOS standalone build still needs a Mac/Xcode or a cloud build service, unlike Expo Go testing.

## How it works

A mobile WebView hosts the pinned MapLibre GL JS 5.12.0 renderer. It loads street tiles,
labels, fonts and sprites from the OpenFreeMap Liberty style. Pan, pinch zoom and suburb
recentering work on both platforms. No device geolocation permission is requested.

The renderer JavaScript/CSS come from jsDelivr; the style and map resources come from
OpenFreeMap. Internet access is required. This is not an offline map. The WebView contains
only public aggregate demo zones; MongoDB credentials and OpenAI keys remain on the server.
Map renderer/tile failures and API failures have separate retry messages.

The map receives suburb and zone updates through a validated message bridge. Existing
zones clear when an area changes or when loading fails. Twelve low-opacity geographic
polygons per zone form the fading radar appearance; radii remain in metres while zooming.
Overlapping zones blend visually. Zone taps show the nearest applicable centre's metadata.
The coloured overlay sits below map text so street labels remain readable.

This is a radial concern overlay, not a continuous statistical kernel heatmap. Compared
with a native MapLibre SDK, it prioritizes easy Expo Go testing; later profiling on older
phones can inform whether a native renderer is worthwhile.

## Data and colours

`GET /api/map/areas/:areaId` returns fictional seed aggregates only. It excludes real/private
submissions, reporter identities, narratives, incomplete/unmapped records, future-dated
records and records older than 30 days. Only Braamfontein currently has mapped seed data.
Existing seeds are matched to approximate landmark centres without a database migration.

The time window uses reportedAt (submission date), not an inferred incident timestamp.
Old seed records eventually expire; rerunning the seed script does not reset their dates.

Demo heuristic per landmark:

- category weights: robbery/assault 5, vehicle theft 3, theft 2, vandalism/suspicious
  activity/infrastructure faults 1, other unclear 0.5;
- contribution decays with a 14-day half-life;
- lower concern below 3, elevated from 3 to below 8, higher from 8;
- illustrative radius: 140 + 15 metres per report, capped at 300 metres.

Green means lower reported concern in the fictional dataset, amber elevated, red higher.
Uncoloured means insufficient data. These are prototype heuristics, not predictions of
crime or guarantees of safety. Zone radius does not establish a danger boundary. Adding
real reports requires structured approximate location/time, moderation and a privacy-aware
public aggregation policy; do not repurpose the demo matcher to infer survivor locations.

## Verify before committing

```bash
npm run typecheck
npm test
```

On both phones, check street tiles and attribution, pan/zoom, suburb search, fading zones,
zone taps, hide/show and recentring. Select Melville to check the empty state; turn off the
API and refresh to check retry behavior. Check admin and report/transcription flows.

Once those checks pass, review `git diff`, commit the intended source changes and open a
pull request. Keep `.env` out of Git; `.env.example` contains public configuration guidance.

Automated verification: TypeScript, 25 tests, and Android/iOS JavaScript bundles passed.
Live MongoDB verification was skipped because no test database is configured. Renderer URL
availability was checked. The classic v5 loader retains WebGL1 support and can fall back
from jsDelivr to unpkg. Errors show the renderer/WebView message for phone diagnosis. WebView tile rendering and gestures still require device checks.

References:

- https://openfreemap.org/
- https://openfreemap.org/tos/
- https://openfreemap.org/quick_start/
- https://docs.expo.dev/versions/latest/sdk/webview/
- https://maplibre.org/maplibre-gl-js/docs/
