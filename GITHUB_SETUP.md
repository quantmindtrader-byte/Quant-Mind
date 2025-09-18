# GitHub Releases Auto-Update Setup

## Quick Setup

### 1. Create GitHub Repository
```bash
# Create repo on GitHub: your-username/quantmind-desktop
git init
git add .
git commit -m "Initial commit"
git remote add origin https://github.com/your-username/quantmind-desktop.git
git push -u origin main
```

### 2. Create GitHub Personal Access Token
1. Go to GitHub → Settings → Developer settings → Personal access tokens
2. Generate new token with `repo` permissions
3. Copy the token

### 3. Set Environment Variable
```bash
# Windows
set GH_TOKEN=your_github_token_here

# Or create .env file
echo GH_TOKEN=your_github_token_here > .env
```

### 4. Update package.json
Replace `your-username` and `quantmind-desktop` with your actual GitHub username and repo name:
```json
{
  "publish": {
    "provider": "github",
    "owner": "your-username",
    "repo": "quantmind-desktop"
  }
}
```

## Usage

### Build and Publish
```bash
npm run release    # Builds and publishes to GitHub Releases
```

### What Happens
1. Builds the app
2. Creates GitHub Release with version tag
3. Uploads installer files to the release
4. App automatically checks GitHub for updates

### Update Flow
1. User has v1.0.0 installed
2. You run `npm run release` with v1.0.1
3. Creates GitHub Release v1.0.1
4. User opens app → detects update → downloads from GitHub → installs

## Files Structure on GitHub
```
GitHub Release v1.0.1:
├── QuantMind-Desktop-Setup-1.0.1.exe
├── latest.yml
└── QuantMind-Desktop-Setup-1.0.1.exe.blockmap
```

The app will automatically check: `https://api.github.com/repos/your-username/quantmind-desktop/releases/latest`