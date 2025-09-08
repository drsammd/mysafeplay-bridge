# MySafePlay Bridge - Windows Installation Guide

## 📦 Download and Installation

### Step 1: Download the Windows Package
Download the latest Windows package: `mysafeplay-bridge-v1.6.42-alpha.23-windows.zip`

### Step 2: Extract the Package
1. Right-click on the downloaded ZIP file
2. Select "Extract All..." or use your preferred extraction tool
3. Extract to a folder like `C:\MySafePlay\` or `C:\Program Files\MySafePlay\`

## 🛡️ Windows Security Bypass Instructions

### Common Error: "This App Can't Run on your PC"

This error occurs because the executable is **unsigned** (not digitally signed by Microsoft). This is normal for open-source software and doesn't indicate a security threat.

#### Method 1: Windows SmartScreen Bypass
1. **Double-click** the `mysafeplay-bridge-windows.exe` file
2. When you see "Windows protected your PC" dialog:
   - Click **"More info"** (small text link)
   - Click **"Run anyway"** button that appears
3. The application will start normally

#### Method 2: Windows Defender Exclusion (Recommended)
1. Open **Windows Security** (Windows Defender)
2. Go to **Virus & threat protection**
3. Click **"Manage settings"** under Virus & threat protection settings
4. Scroll down to **Exclusions** and click **"Add or remove exclusions"**
5. Click **"Add an exclusion"** → **"Folder"**
6. Select the folder where you extracted MySafePlay Bridge
7. Click **"Select Folder"**

#### Method 3: Run as Administrator
1. **Right-click** on `mysafeplay-bridge-windows.exe`
2. Select **"Run as administrator"**
3. Click **"Yes"** when prompted by User Account Control

## 🚀 Running MySafePlay Bridge

### First Time Setup
1. Navigate to the extracted folder
2. Double-click `mysafeplay-bridge-windows.exe`
3. If prompted by Windows Firewall, click **"Allow access"**
4. The service will start on `http://localhost:3001`
5. Open your web browser and go to `http://localhost:3001`

### Configuration
1. Edit the `config/settings.json` file to customize:
   - Port number (default: 3001)
   - Camera discovery settings
   - Cloud integration settings
   - Security options

### Running as a Windows Service (Advanced)
For automatic startup, consider using tools like:
- **NSSM** (Non-Sucking Service Manager)
- **WinSW** (Windows Service Wrapper)
- **PM2** for Windows

## 🔧 Troubleshooting

### Issue: "This App Can't Run on your PC"
**Solution**: Follow the Windows Security Bypass Instructions above

### Issue: Port Already in Use
**Solution**: 
1. Edit `config/settings.json`
2. Change the port from 3001 to another port (e.g., 3002)
3. Restart the application

### Issue: Cameras Not Discovered
**Solution**:
1. Ensure cameras are on the same network
2. Check firewall settings
3. Verify camera ONVIF support
4. Increase discovery timeout in `config/settings.json`

### Issue: Windows Firewall Blocking
**Solution**:
1. Allow the application through Windows Firewall
2. Or temporarily disable Windows Firewall for testing

### Issue: Antivirus Software Blocking
**Solution**:
1. Add the MySafePlay folder to your antivirus exclusions
2. Temporarily disable real-time protection for installation

## 📋 System Requirements

- **Operating System**: Windows 10 or Windows 11 (64-bit)
- **Architecture**: x64 (64-bit) - Will NOT work on 32-bit systems
- **RAM**: Minimum 2GB, Recommended 4GB+
- **Network**: Local network access to IP cameras
- **Ports**: Default port 3001 (configurable)

## 🔐 Security Notes

### Why is the executable unsigned?
- Code signing certificates cost $300-500+ per year
- This is an open-source project distributed for free
- The source code is available for inspection
- You can build the executable yourself from source

### Is it safe to run?
- **Yes** - The executable is built from open-source code
- **Yes** - No malicious code or data collection
- **Yes** - Runs locally on your machine only
- **Optional** - You can review the source code before running

### Future Code Signing
We are working on obtaining a code signing certificate to eliminate these security warnings in future releases.

## 📞 Support

If you encounter issues:
1. Check this troubleshooting guide first
2. Review the main README.md file
3. Check the logs in the `logs/` folder
4. Report issues on our GitHub repository

## 🔄 Updates

To update MySafePlay Bridge:
1. Download the latest Windows package
2. Stop the current service
3. Replace the executable file
4. Restart the service
5. Your configuration files will be preserved

---

**Note**: This software is provided "as-is" without warranty. Always run security software and keep your system updated.
