## Running ILWA on a phone with Expo Go

### 1. Install dependencies

From the project folder:

```powershell
npm.cmd ci
```

Install Expo Go on your Android phone or iPhone.

### 2. Configure your local environment

Copy the example configuration:

```powershell
Copy-Item .env.example .env
```

Set these values in `.env`:

```dotenv
MONGODB_URI=<MongoDB connection string shared privately>
MONGODB_DB=<team database name>
PORT=4000
EXPO_PUBLIC_API_URL=http://<your-PC-local-IP>:4000
```

Keep the other settings from `.env.example`. Never commit `.env`.

Use `ipconfig` to find your PC’s active network adapter’s IPv4 address. The phone must be able to reach that address. `localhost` on the phone refers to the phone itself.

### 3. Start the API

In one terminal:

```powershell
npm.cmd run server
```

Keep this terminal running.

### 4. Start the mobile app

In a second terminal:

```powershell
npx.cmd expo start --go --tunnel --clear
```

If Expo reports that `@expo/ngrok` is missing:

```powershell
npm.cmd install --save-dev "@expo/ngrok@^4.1.0"
npx.cmd expo start --go --tunnel --clear
```

Scan the QR code with Expo Go on Android, or the Camera app on iPhone.

### 5. Check API connectivity

Open this address in the phone’s browser, replacing the placeholder with your PC’s IP:

```text
http://<your-PC-local-IP>:4000/api/map/areas/braamfontein
```

A JSON response confirms the API is reachable.

The Expo tunnel serves the mobile app; it does not expose the API on port 4000. If the API works on the PC but cannot be reached from the phone, check network isolation and Windows Firewall access.

### Current development status

- The street map has been confirmed working through Expo Go.
- Maps use OpenFreeMap and MapLibre; no Google Maps key or billing account is required.
- Internet access is required to load the street map.
- Phone-to-API connectivity remains unresolved on the original developer’s setup.
- Map overlays currently use eligible demo reports. Other suburbs may have no demo coverage.