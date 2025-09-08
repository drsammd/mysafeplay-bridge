# MySafePlay Bridge - Release Notes

## Version 1.6.42-alpha.23 - Windows Executable Fix

### 🔧 Fixed Issues

#### Windows Executable Compatibility
- **Fixed**: "This App Can't Run on your PC" error on Windows systems
- **Fixed**: Architecture mismatch - now properly targets x64 (64-bit) Windows
- **Fixed**: Missing executable packaging configuration
- **Added**: Proper Windows PE32+ executable generation using pkg tool

### 🆕 New Features

#### Windows Packaging
- **Added**: Automated Windows executable build process
- **Added**: Complete Windows installer package with all dependencies
- **Added**: Comprehensive Windows installation guide
- **Added**: Security bypass instructions for unsigned executables

#### Build System Improvements
- **Added**: Cross-platform build scripts (Windows, Linux, macOS)
- **Added**: Automated packaging with configuration files
- **Updated**: Package name to `mysafeplay-bridge` for consistency
- **Updated**: Version numbering to match release expectations

### 📦 Package Contents

The Windows package (`mysafeplay-bridge-v1.6.42-alpha.23-windows.zip`) includes:
- `mysafeplay-bridge-windows.exe` - Main executable (127MB, x64)
- `config/settings.json` - Configuration file
- `public/` - Web dashboard files (HTML, CSS, JS)
- `README.md` - General documentation
- `WINDOWS_INSTALLATION_GUIDE.md` - Windows-specific instructions

### 🛠️ Technical Details

#### Executable Specifications
- **Architecture**: x86-64 (64-bit)
- **Format**: PE32+ executable for MS Windows
- **Node.js Runtime**: Embedded Node.js 18.x
- **Size**: ~127MB (includes all dependencies and FFmpeg)
- **Dependencies**: All Node.js modules bundled internally

#### Build Configuration
```json
{
  "pkg": {
    "targets": ["node18-win-x64"],
    "assets": [
      "config/**/*",
      "public/**/*", 
      "node_modules/ffmpeg-static/ffmpeg*"
    ]
  }
}
```

### 🔐 Security Information

#### Code Signing Status
- **Current**: Unsigned executable (causes Windows SmartScreen warnings)
- **Impact**: Users must bypass "This App Can't Run on your PC" warning
- **Workaround**: Detailed bypass instructions provided
- **Future**: Working on code signing certificate acquisition

#### Security Bypass Methods
1. **SmartScreen**: Click "More info" → "Run anyway"
2. **Windows Defender**: Add folder exclusion
3. **Administrator**: Run as administrator
4. **Firewall**: Allow through Windows Firewall when prompted

### 🐛 Known Issues

#### Windows-Specific
- First run requires Windows SmartScreen bypass
- Windows Firewall may prompt for network access
- Some antivirus software may flag as "unknown publisher"

#### Workarounds Available
- All issues have documented workarounds in installation guide
- No functional limitations once security warnings are bypassed

### 📋 System Requirements

#### Minimum Requirements
- **OS**: Windows 10 (64-bit) or Windows 11
- **RAM**: 2GB minimum, 4GB recommended
- **Storage**: 200MB free space
- **Network**: Local network access for camera discovery

#### Compatibility
- ✅ Windows 10 x64
- ✅ Windows 11 x64
- ❌ Windows 10 x86 (32-bit) - Not supported
- ❌ Windows 8.1 or older - Not tested

### 🚀 Installation Process

1. Download `mysafeplay-bridge-v1.6.42-alpha.23-windows.zip`
2. Extract to desired location (e.g., `C:\MySafePlay\`)
3. Run `mysafeplay-bridge-windows.exe`
4. Bypass Windows security warnings (see guide)
5. Allow through Windows Firewall
6. Access web interface at `http://localhost:3001`

### 🔄 Upgrade Path

#### From Previous Versions
- No previous Windows executable existed
- This is the first proper Windows release
- Fresh installation required

#### Configuration Migration
- Default configuration provided in `config/settings.json`
- Customize as needed for your environment
- No migration required for new installations

### 📞 Support Resources

- **Installation Guide**: `WINDOWS_INSTALLATION_GUIDE.md`
- **General Documentation**: `README.md`
- **Configuration**: `config/settings.json`
- **Web Interface**: `http://localhost:3001` (after startup)

### 🔮 Future Improvements

#### Planned for Next Release
- Code signing certificate implementation
- Windows Service installer (MSI package)
- Automatic startup configuration
- Enhanced Windows integration

#### Long-term Roadmap
- Windows Store distribution (eliminates security warnings)
- Simplified one-click installer
- Automatic update mechanism
- Enhanced Windows-specific features

---

**Release Date**: September 7, 2025  
**Build Target**: node18-win-x64  
**Package Size**: ~47MB (compressed), ~127MB (executable)  
**Compatibility**: Windows 10/11 x64 only
