# QuantMind Desktop Auto-Update Setup

## Overview
This setup enables automatic updates for the QuantMind Desktop application using electron-updater with a local update server.

## Features
- ✅ Automatic update checking on app startup
- ✅ Silent background downloads
- ✅ User notification when update is ready
- ✅ One-click restart to apply updates
- ✅ Incremental updates (only changed files)
- ✅ Manual "Check for Updates" option
- ✅ Local development server for testing

## Quick Start

### 1. Install Dependencies
```bash
cd QuantMind-Desktop-AutoUpdate
npm install
```

### 2. Build the Application
```bash
# Build the app (creates installer in dist/)
npm run dist
```

### 3. Start Update Server
```bash
# Start local update server on port 3001
npm run serve-updates
```

### 4. Test Auto-Updates

#### First Installation (v1.0.0)
1. Install the app from `dist/QuantMind Desktop Setup 1.0.0.exe`
2. Run the app - it will check for updates but find none

#### Create New Version (v1.0.1)
1. Update version in `package.json`:
   ```json
   "version": "1.0.1"
   ```
2. Build new version:
   ```bash
   npm run dist
   ```
3. The update server will now serve v1.0.1

#### Test Update Flow
1. Open the installed v1.0.0 app
2. App automatically checks for updates
3. Downloads v1.0.1 in background
4. Shows "Update Ready" notification
5. Click "Restart Now" to apply update

## Build Commands

```bash
# Development
npm run dev                 # Start dev server
npm start                   # Run electron app

# Production
npm run build              # Build renderer + create installer
npm run dist               # Same as build
npm run publish            # Build + publish to update server

# Update Server
npm run serve-updates      # Start local update server
```

## File Structure

```
QuantMind-Desktop-AutoUpdate/
├── dist/                           # Built installers and updates
│   ├── QuantMind Desktop Setup 1.0.0.exe
│   ├── QuantMind Desktop Setup 1.0.1.exe
│   ├── latest.yml                  # Update metadata
│   └── *.blockmap                  # Incremental update files
├── src/
│   ├── main/
│   │   ├── main.js                 # Main process with auto-updater
│   │   └── preload.js              # Update APIs
│   └── renderer/
│       ├── App.jsx                 # App with UpdateNotification
│       └── components/
│           └── UpdateNotification.jsx
├── update-server.js                # Local update server
└── package.json                    # Build configuration
```

## How It Works

### 1. Update Check Process
- App starts → `autoUpdater.checkForUpdatesAndNotify()`
- Checks `http://localhost:3001/updates/latest.yml`
- Compares current version with available version

### 2. Download Process
- If update available → Downloads silently in background
- Uses incremental updates (only changed files via .blockmap)
- Shows progress in UpdateNotification component

### 3. Installation Process
- When download complete → Shows "Update Ready" notification
- User clicks "Restart Now" → `autoUpdater.quitAndInstall()`
- App restarts with new version

### 4. Update Server
- Serves `latest.yml` with version metadata
- Serves installer files and blockmap files
- Handles CORS for local development

## Configuration

### package.json Build Config
```json
{
  "build": {
    "appId": "com.quantmind.desktop",
    "publish": {
      "provider": "generic",
      "url": "http://localhost:3001/updates/"
    },
    "win": {
      "target": [{"target": "nsis", "arch": ["x64"]}]
    },
    "nsis": {
      "oneClick": false,
      "allowToChangeInstallationDirectory": true
    }
  }
}
```

### Auto-Updater Settings
```javascript
autoUpdater.checkForUpdatesAndNotify();
autoUpdater.autoDownload = true;
autoUpdater.autoInstallOnAppQuit = true;
```

## Testing Scenarios

### Scenario 1: Fresh Install
1. Build v1.0.0: `npm run dist`
2. Install from `dist/QuantMind Desktop Setup 1.0.0.exe`
3. App shows no updates available

### Scenario 2: Update Available
1. Change version to 1.0.1 in package.json
2. Build: `npm run dist`
3. Start update server: `npm run serve-updates`
4. Open v1.0.0 app
5. App detects update and downloads v1.0.1
6. Shows "Update Ready" notification

### Scenario 3: Manual Check
1. Click "Check for Updates" button
2. Manually triggers update check
3. Same flow as automatic check

## Production Deployment

For production, replace the localhost URL with your actual update server:

```json
{
  "publish": {
    "provider": "generic",
    "url": "https://your-domain.com/updates/"
  }
}
```

## Troubleshooting

### Update Not Detected
- Check update server is running on port 3001
- Verify `latest.yml` exists in dist/ folder
- Check version number is higher than current

### Download Fails
- Ensure CORS is enabled on update server
- Check file permissions in dist/ folder
- Verify installer files exist

### Update Won't Install
- Check app has write permissions
- Ensure no antivirus blocking
- Try running as administrator

## Security Notes

- Updates are served over HTTP (localhost only)
- For production, use HTTPS
- Consider code signing for installers
- Validate update integrity

## Next Steps

1. Test the complete update flow
2. Customize UpdateNotification UI
3. Add update preferences/settings
4. Implement rollback mechanism
5. Set up production update server