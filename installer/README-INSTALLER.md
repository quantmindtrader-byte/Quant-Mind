# QuantMind Desktop - Windows Installer

This directory contains the files needed to create a professional Windows installer for QuantMind Desktop.

## 📋 **Prerequisites**

1. **NSIS (Nullsoft Scriptable Install System)**
   - Download from: https://nsis.sourceforge.io/Download
   - Install NSIS on your system
   - Add NSIS to your PATH environment variable

## 🚀 **Building the Installer**

### Option 1: Use the Batch Script (Recommended)
```bash
cd installer
build-installer.bat
```

### Option 2: Manual Build
```bash
cd installer
makensis QuantMind-Installer.nsi
```

## 📦 **What Gets Created**

The installer (`QuantMind-Desktop-Setup.exe`) will:

✅ **Install the complete application** to `Program Files`
✅ **Create Start Menu shortcuts**
✅ **Create Desktop shortcut**
✅ **Add to Add/Remove Programs**
✅ **Include uninstaller**
✅ **Require administrator privileges**

## 🎯 **Installer Features**

- **Professional Windows installer** (.exe)
- **License agreement** display
- **Custom installation directory** selection
- **Proper uninstallation** support
- **Registry integration**
- **Start Menu integration**
- **Desktop shortcut creation**

## 📁 **Files Included**

- `QuantMind-Installer.nsi` - Main installer script
- `license.txt` - License agreement text
- `build-installer.bat` - Build automation script
- `icon.ico` - Application icon (optional)

## 🔧 **System Requirements**

**For Building:**
- Windows 10/11
- NSIS installed
- Built QuantMind Desktop package

**For Installation:**
- Windows 10/11 (64-bit)
- Administrator privileges
- 150MB disk space

## 📋 **Distribution**

Once built, distribute the `QuantMind-Desktop-Setup.exe` file. Users can:
1. Download the installer
2. Run as administrator
3. Follow installation wizard
4. Launch from Start Menu or Desktop

The installer is completely offline and includes all dependencies!