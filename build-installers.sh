#!/bin/bash

echo "========================================="
echo "MySafePlay Bridge Installer Builder"
echo "========================================="

# Clean previous builds
rm -rf dist/*

# Install dependencies
npm install

# Build all platform binaries
echo "Building binaries for all platforms..."
npm run build:all

cd dist

# Create Windows installer package
echo "Creating Windows installer package..."
mkdir -p windows_installer
cp mysafeplay-bridge-windows.exe windows_installer/
cp -r ../config windows_installer/
cp -r ../public windows_installer/
cp ../README.md windows_installer/

# Create Windows install script
cat > windows_installer/INSTALL.bat << 'WINEOF'
@echo off
echo ========================================
echo MySafePlay Bridge v2.0.0 Installer
echo ========================================
echo.

REM Check for admin privileges
net session >nul 2>&1
if %errorLevel% == 0 (
    echo Running with administrator privileges...
) else (
    echo ERROR: This installer requires administrator privileges.
    echo Please right-click and select "Run as administrator"
    pause
    exit /b 1
)

echo Creating installation directory...
mkdir "%PROGRAMFILES%\MySafePlay\Bridge" 2>nul

echo Copying files...
copy mysafeplay-bridge-windows.exe "%PROGRAMFILES%\MySafePlay\Bridge\" >nul
xcopy config "%PROGRAMFILES%\MySafePlay\Bridge\config\" /E /I /Y >nul
xcopy public "%PROGRAMFILES%\MySafePlay\Bridge\public\" /E /I /Y >nul
copy README.md "%PROGRAMFILES%\MySafePlay\Bridge\" >nul

echo Installing Windows Service...
sc create "MySafePlayBridge" binPath="%PROGRAMFILES%\MySafePlay\Bridge\mysafeplay-bridge-windows.exe" start=auto DisplayName="MySafePlay Bridge Service"
sc description "MySafePlayBridge" "MySafePlay Local Camera Bridge Service - Connects local cameras to cloud platform"

echo Starting service...
sc start "MySafePlayBridge"

echo.
echo ========================================
echo Installation Complete!
echo ========================================
echo Service: MySafePlay Bridge Service
echo Location: %PROGRAMFILES%\MySafePlay\Bridge\
echo Web Interface: http://localhost:3001
echo.
echo The service will start automatically on boot.
echo To manage the service, use Windows Services (services.msc)
echo.
pause
WINEOF

# Create Windows uninstall script
cat > windows_installer/UNINSTALL.bat << 'WINEOF'
@echo off
echo ========================================
echo MySafePlay Bridge v2.0.0 Uninstaller
echo ========================================
echo.

REM Check for admin privileges
net session >nul 2>&1
if %errorLevel% == 0 (
    echo Running with administrator privileges...
) else (
    echo ERROR: This uninstaller requires administrator privileges.
    echo Please right-click and select "Run as administrator"
    pause
    exit /b 1
)

echo Stopping service...
sc stop "MySafePlayBridge" >nul 2>&1

echo Removing service...
sc delete "MySafePlayBridge" >nul 2>&1

echo Removing files...
rmdir /s /q "%PROGRAMFILES%\MySafePlay\Bridge" >nul 2>&1
rmdir "%PROGRAMFILES%\MySafePlay" >nul 2>&1

echo.
echo ========================================
echo Uninstallation Complete!
echo ========================================
pause
WINEOF

# Package Windows installer
zip -r MySafePlay-Bridge-v2.0.0-Windows.zip windows_installer/

# Create macOS installer package
echo "Creating macOS installer package..."
mkdir -p macos_installer/MySafePlay-Bridge.app/Contents/{MacOS,Resources}

# Copy the macOS binary
cp mysafeplay-bridge-macos macos_installer/MySafePlay-Bridge.app/Contents/MacOS/mysafeplay-bridge
chmod +x macos_installer/MySafePlay-Bridge.app/Contents/MacOS/mysafeplay-bridge

# Create Info.plist
cat > macos_installer/MySafePlay-Bridge.app/Contents/Info.plist << 'MACEOF'
<?xml version="1.0" encoding="UTF-8"?>
<!DOCTYPE plist PUBLIC "-//Apple//DTD PLIST 1.0//EN" "http://www.apple.com/DTDs/PropertyList-1.0.dtd">
<plist version="1.0">
<dict>
    <key>CFBundleExecutable</key>
    <string>mysafeplay-bridge</string>
    <key>CFBundleIdentifier</key>
    <string>com.mysafeplay.bridge</string>
    <key>CFBundleName</key>
    <string>MySafePlay Bridge</string>
    <key>CFBundleVersion</key>
    <string>2.0.0</string>
    <key>CFBundleShortVersionString</key>
    <string>2.0.0</string>
    <key>CFBundlePackageType</key>
    <string>APPL</string>
    <key>LSMinimumSystemVersion</key>
    <string>10.15</string>
    <key>NSHighResolutionCapable</key>
    <true/>
    <key>LSUIElement</key>
    <true/>
</dict>
</plist>
MACEOF

# Copy resources
cp -r ../config macos_installer/MySafePlay-Bridge.app/Contents/Resources/
cp -r ../public macos_installer/MySafePlay-Bridge.app/Contents/Resources/
cp ../README.md macos_installer/MySafePlay-Bridge.app/Contents/Resources/

# Create install script for macOS
cat > macos_installer/install.sh << 'MACEOF'
#!/bin/bash

echo "========================================="
echo "MySafePlay Bridge v2.0.0 Installer"
echo "========================================="
echo

# Check for admin privileges
if [ "$EUID" -ne 0 ]; then
    echo "ERROR: This installer requires administrator privileges."
    echo "Please run with sudo: sudo ./install.sh"
    exit 1
fi

echo "Installing MySafePlay Bridge..."

# Create application directory
mkdir -p /Applications
cp -r MySafePlay-Bridge.app /Applications/

# Create LaunchDaemon for service
cat > /Library/LaunchDaemons/com.mysafeplay.bridge.plist << 'PLIST'
<?xml version="1.0" encoding="UTF-8"?>
<!DOCTYPE plist PUBLIC "-//Apple//DTD PLIST 1.0//EN" "http://www.apple.com/DTDs/PropertyList-1.0.dtd">
<plist version="1.0">
<dict>
    <key>Label</key>
    <string>com.mysafeplay.bridge</string>
    <key>ProgramArguments</key>
    <array>
        <string>/Applications/MySafePlay-Bridge.app/Contents/MacOS/mysafeplay-bridge</string>
    </array>
    <key>RunAtLoad</key>
    <true/>
    <key>KeepAlive</key>
    <true/>
    <key>WorkingDirectory</key>
    <string>/Applications/MySafePlay-Bridge.app/Contents/Resources</string>
</dict>
</plist>
PLIST

# Set permissions
chown root:wheel /Library/LaunchDaemons/com.mysafeplay.bridge.plist
chmod 644 /Library/LaunchDaemons/com.mysafeplay.bridge.plist

# Load the service
launchctl load /Library/LaunchDaemons/com.mysafeplay.bridge.plist

echo
echo "========================================="
echo "Installation Complete!"
echo "========================================="
echo "Application: /Applications/MySafePlay-Bridge.app"
echo "Web Interface: http://localhost:3001"
echo
echo "The service will start automatically on boot."
echo "To manage the service:"
echo "  Start:  sudo launchctl load /Library/LaunchDaemons/com.mysafeplay.bridge.plist"
echo "  Stop:   sudo launchctl unload /Library/LaunchDaemons/com.mysafeplay.bridge.plist"
echo
MACEOF

chmod +x macos_installer/install.sh

# Create uninstall script for macOS
cat > macos_installer/uninstall.sh << 'MACEOF'
#!/bin/bash

echo "========================================="
echo "MySafePlay Bridge v2.0.0 Uninstaller"
echo "========================================="
echo

# Check for admin privileges
if [ "$EUID" -ne 0 ]; then
    echo "ERROR: This uninstaller requires administrator privileges."
    echo "Please run with sudo: sudo ./uninstall.sh"
    exit 1
fi

echo "Uninstalling MySafePlay Bridge..."

# Stop and unload service
launchctl unload /Library/LaunchDaemons/com.mysafeplay.bridge.plist 2>/dev/null

# Remove service file
rm -f /Library/LaunchDaemons/com.mysafeplay.bridge.plist

# Remove application
rm -rf /Applications/MySafePlay-Bridge.app

echo
echo "========================================="
echo "Uninstallation Complete!"
echo "========================================="
MACEOF

chmod +x macos_installer/uninstall.sh

# Create the macOS DMG
genisoimage -V "MySafePlay Bridge v2.0.0" -D -R -apple -no-pad -o MySafePlay-Bridge-v2.0.0-macOS.dmg macos_installer/

echo
echo "========================================="
echo "Build Complete!"
echo "========================================="
echo "Windows Installer: MySafePlay-Bridge-v2.0.0-Windows.zip"
echo "macOS Installer: MySafePlay-Bridge-v2.0.0-macOS.dmg"
echo
ls -lh MySafePlay-Bridge-v2.0.0-*
