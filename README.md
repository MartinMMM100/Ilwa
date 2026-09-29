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
PORT=4000
CLIENT_ORIGIN=http://localhost:8081
EXPO_PUBLIC_API_URL=http://localhost:4000
```

`MONGODB_URI` and `MONGODB_DB` are read only by the server. Never prefix MongoDB credentials with `EXPO_PUBLIC_`. When using Expo Go on a physical device, set `EXPO_PUBLIC_API_URL` to the computer's LAN address, for example `http://192.168.1.10:4000`.

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

## Incident reporting

The report screen submits a 10–5,000-character paragraph to `POST /api/incidents`. The existing voice-recording and photo controls remain available. A voice report is reviewed as an editable text transcript before submission, while voice recordings and photo attachments stay on the device until dedicated transcription and media-upload services are added. The server writes only the paragraph to MongoDB before running the deterministic mock extractor. Reports remain `unverified`; extraction success does not imply verification or contact with a responder.

Try this configured fixture:

> Two guys robbed me near Park Station last night around 9. They took my phone and one had a knife.

Saved documents are in the `incidents` collection of the database named by `MONGODB_DB`. In MongoDB Compass, open the configured connection, select that database, and then select `incidents`. `submissionId` and `reportReference` have unique indexes; retries with the same submission identifier return the original report instead of inserting a duplicate.

The replaceable mock boundary is `extractIncident(description)` in `server/incidents/mockExtractor.ts`. Replace that function's implementation when a real AI service is added; the report screen and database workflow do not need to change.

No endpoint for listing or reading incident descriptions is exposed.

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

- Safety map with color-coded community report zones and a threat legend
- Braamfontein area information with response metrics and recent reports
- Filterable live community feed
- Typed or recorded incident reports with optional photo attachments and MongoDB-backed text storage
