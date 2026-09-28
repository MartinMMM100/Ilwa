# ILWA SafetyMap

A React Native / Expo implementation of the supplied ILWA community-safety screens.

## Getting started for group members

### 1. Install the prerequisites

- [Node.js](https://nodejs.org/) 22 or newer (the LTS release is recommended)
- [Git](https://git-scm.com/downloads)
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

### 4. Start the app

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

## Included flows

- Safety map overview with tappable area card and markers
- Braamfontein area information
- Filterable live community feed
- Interactive incident report form
