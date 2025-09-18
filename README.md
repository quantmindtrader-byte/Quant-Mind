# QuantMind Desktop Application

## Installation

1. Install Node.js (v18 or higher)
2. Run: `npm install`
3. Start development: `npm run dev`
4. Build executable: `npm run build:win`

## Building Executable

### For Installer (.exe):
```bash
npm install
npm run build:win
```

### For Portable (.exe):
```bash
npm install
npm run build:portable
```

The built executables will be in the `dist` folder:
- `QuantMind-Desktop-Setup-1.0.0.exe` (Installer)
- `QuantMind-Desktop-Portable-1.0.0.exe` (Portable)

## Development

```bash
npm install
npm run dev
```

## Project Structure

```
QuantMind-Desktop-Package/
├── src/
│   ├── main/           # Electron main process
│   └── renderer/       # React frontend
├── dist/              # Built executables
├── assets/            # Icons and resources
├── package.json       # Dependencies and scripts
└── README.md         # This file
```

## Requirements

- Node.js 18+
- Windows 10/11
- 4GB RAM minimum
- 500MB disk space