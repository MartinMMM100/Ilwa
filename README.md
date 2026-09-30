# ILWA SafetyMap

A React Native / Expo community-safety app with an Express and MongoDB incident-reporting API.

## Getting started for group members

### 1. Install the prerequisites

- [Node.js](https://nodejs.org/) 22 or newer (the LTS release is recommended)
- [Git](https://git-scm.com/downloads)
- A MongoDB deployment. The shared development database uses [MongoDB Atlas](https://www.mongodb.com/atlas/database).
- [Expo Go](https://expo.dev/go) on an Android or iOS phone, if you want to test on a physical device

Android Studio is only required for the Android emulator. Xcode and the iOS simulator are only available on macOS.

### 2. Clone the project

```bash
git clone https://github.com/MartinMMM100/Ilwa.git
cd Ilwa
```

If you already have the project, get the newest changes instead:

```bash
git pull
```

### 3. Install the dependencies

```bash
npm ci
```

Use `npm ci` so everyone installs the exact dependency versions recorded in `package-lock.json`.

### 4. Configure the environment

Copy `.env.example` to `.env` and replace the MongoDB placeholders. Existing `.env` files are ignored by Git and must not be overwritten.

```dotenv
MONGODB_URI=mongodb://127.0.0.1:27017
MONGODB_DB=ilwa
DEV_REPORTER_ID=development-only-resident
ASSISTANCE_DEMO_MODE=true
SAPS_CALL_LABEL=Demo SAPS Dispatch
SAPS_CALL_NUMBER=+27000000001
THIRD_PARTY_ORGANIZATIONS_JSON=[{"id":"ubuntu-shield-demo","name":"Ubuntu Shield Response (Demo)","phoneNumber":"+27000000011","latitude":-26.184,"longitude":28.039,"active":true,"areaIds":["braamfontein","parktown","hillbrow"]}]
PORT=4000
CLIENT_ORIGIN=http://localhost:8081
EXPO_PUBLIC_API_URL=http://localhost:4000
```

`MONGODB_URI` and `MONGODB_DB` are read only by the server. Never prefix MongoDB credentials with `EXPO_PUBLIC_`. When using Expo Go on a physical device, set `EXPO_PUBLIC_API_URL` to the computer's LAN address, for example `http://192.168.1.10:4000`.

Set `ASSISTANCE_DEMO_MODE=true` while using fictional contacts. Demo mode saves the call workflow without opening a dialer or contacting anyone. `THIRD_PARTY_ORGANIZATIONS_JSON` is a server-only JSON array. Each item requires `id`, `name`, `phoneNumber`, `latitude`, and `longitude`; it may also include `active` and an `areaIds` list. For example, the shape is:

```json
[{"id":"partner-id","name":"Partner name","phoneNumber":"+27...","latitude":-26.19,"longitude":28.03,"active":true,"areaIds":["braamfontein"]}]
```

The report screen saves a call attempt to the `assistanceRequests` MongoDB collection. In demo mode, the user selects a simulated outcome without a real call. A fallback is offered only when help is not confirmed, and the server chooses the nearest active organization configured for the selected suburb. Run `npm run seed:demo` to add the demo incident reports and six linked sample call records. When demo mode is disabled, the phone still requires the user to place every real call from the system dialer.

The app has no authentication provider yet. Outside production, the API assigns the explicitly development-only `DEV_REPORTER_ID`. The API refuses to start in `NODE_ENV=production` until real authentication middleware is supplied.

Group members should request the MongoDB connection details privately from the project owner, place them only in their local `.env`, and then follow the startup commands below. Never commit `.env` or send database credentials through GitHub issues or group chat.

### 5. Start the API and app

Start the API in one terminal:

```bash
npm run server
```

When MongoDB connects successfully, the terminal displays:

```text
ILWA incident API listening on port 4000.
```

Start Expo in a second terminal:

```bash
npm start
```

To add the deterministic fictional development dataset to MongoDB, run this once after configuring `.env`:

```bash
npm run seed:incidents
```

The command is safe to rerun: fixed submission identifiers prevent duplicate seed records. Seeded documents have `isDemoData: true` and must be excluded from real risk statistics.

This starts the Expo development server and displays a QR code.

#### Run on a physical phone

1. Connect the computer and phone to the same Wi-Fi network.
2. Open Expo Go on Android and scan the QR code.
3. On iPhone, scan the QR code with the Camera app and open it in Expo Go.

#### Run on another platform

While the Expo server is running, use one of these keyboard shortcuts:

- Press `a` to open the Android emulator.
- Press `i` to open the iOS simulator (macOS only).
- Press `w` to open the web version.

You can also run a platform directly:

```bash
npm run android
npm run ios
npm run web
```

## Troubleshooting

If changes are not appearing or Expo has a stale cache, stop the server and run:

```bash
npx expo start --clear
```

If dependency installation fails, confirm that you are inside the `Ilwa` folder and that Node.js and npm are available:

```bash
node --version
npm --version
```

The news images are loaded from the internet, so they may appear as placeholders when the device is offline.

If the report screen cannot reach the API from a phone, confirm that the phone and computer share a network, the API port is allowed through the firewall, and `EXPO_PUBLIC_API_URL` uses the computer's LAN IP rather than `localhost`.

## Checks and tests

```bash
npm run typecheck
npm test
```

The standard test suite skips live MongoDB verification unless both `MONGODB_TEST_URI` and `MONGODB_TEST_DB` are set. The test database name must differ from `MONGODB_DB`.

```bash
npm run test:integration
```

## Included flows

- MapLibre / OpenFreeMap street maps on Android and iOS with searchable Johannesburg pilot suburbs
- Fading, geographically anchored demo concern zones with tap-to-view details
- MongoDB-backed aggregate map data, refresh, retry, and empty states
- Existing admin dashboard, text reports, AI extraction and voice transcription
- The news feed remains a static prototype

See [mobile-free-maps.md](docs/mobile-free-maps.md) for no-key Expo Go setup,
patch application, scoring rules and device checks.
