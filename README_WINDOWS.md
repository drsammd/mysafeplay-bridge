# MySafePlay Bridge - Windows Installation & Troubleshooting Guide

## Quick Start

1. **Extract the ZIP file** to a folder (e.g., `C:\MySafePlay-Bridge\`)
2. **Run as Administrator**: Right-click `start-mysafeplay-bridge.bat` and select "Run as administrator"
3. **Wait for startup**: The service may take 10-30 seconds to fully start
4. **Open your browser** and go to `http://localhost:3000`

## Common Issues & Solutions

### Issue 1: "ERR_CONNECTION_REFUSED" in Browser

**Symptoms:**
- Browser shows "This site can't be reached" or "ERR_CONNECTION_REFUSED"
- Terminal window flashes and closes immediately

**Solutions:**
1. **Wait longer**: The service may still be starting. Wait 30 seconds and refresh.
2. **Check the port**: The service might be running on a different port (3001, 3002, etc.)
3. **Run the batch file**: Use `start-mysafeplay-bridge.bat` instead of the .exe directly
4. **Check Windows Firewall**: Allow the application through Windows Firewall

### Issue 2: Terminal Window Flashes and Closes

**Symptoms:**
- Double-clicking the .exe shows a brief terminal flash
- No web interface appears

**Solutions:**
1. **Use the batch file**: Always use `start-mysafeplay-bridge.bat`
2. **Run from Command Prompt**:
   ```cmd
   cd "C:\path\to\MySafePlay-Bridge"
   mysafeplay-bridge-windows.exe
   ```
3. **Check for missing dependencies**: Ensure all files from the ZIP are extracted

### Issue 3: Port Already in Use

**Symptoms:**
- Error message about port 3000 being in use
- Service fails to start

**Solutions:**
1. **Automatic port detection**: The service will try ports 3001, 3002, etc.
2. **Manual port setting**: Set environment variable:
   ```cmd
   set PORT=3005
   start-mysafeplay-bridge.bat
   ```
3. **Kill existing processes**: The batch file does this automatically

### Issue 4: Windows Security/Antivirus Blocking

**Symptoms:**
- Executable won't run
- Windows Defender or antivirus shows warnings

**Solutions:**
1. **Add exception**: Add the folder to Windows Defender exclusions
2. **Run as Administrator**: Right-click and "Run as administrator"
3. **Temporarily disable real-time protection** (not recommended for production)

### Issue 5: Service Stops Unexpectedly

**Symptoms:**
- Service starts but stops after a few seconds
- Web interface becomes unavailable

**Solutions:**
1. **Check the logs**: Look for error messages in the terminal
2. **Restart the service**: Close and restart `start-mysafeplay-bridge.bat`
3. **Check system resources**: Ensure sufficient RAM and CPU available

## Advanced Troubleshooting

### Running from Command Line for Debugging

1. Open Command Prompt as Administrator
2. Navigate to the MySafePlay Bridge folder:
   ```cmd
   cd "C:\path\to\MySafePlay-Bridge"
   ```
3. Run the executable directly:
   ```cmd
   mysafeplay-bridge-windows.exe
   ```
4. Look for error messages and startup information

### Checking Network Connectivity

1. **Test local connection**:
   ```cmd
   telnet localhost 3000
   ```
2. **Check listening ports**:
   ```cmd
   netstat -an | findstr :3000
   ```

### Environment Variables

Set these environment variables for customization:
- `PORT=3005` - Use a different port
- `LOG_LEVEL=debug` - Enable debug logging
- `NODE_ENV=production` - Production mode

Example:
```cmd
set PORT=3005
set LOG_LEVEL=debug
start-mysafeplay-bridge.bat
```

## Installing as Windows Service (Advanced)

For production use, you can install MySafePlay Bridge as a Windows service:

1. **Download NSSM** (Non-Sucking Service Manager) from https://nssm.cc/
2. **Install the service**:
   ```cmd
   nssm install MySafePlayBridge "C:\path\to\mysafeplay-bridge-windows.exe"
   nssm set MySafePlayBridge AppDirectory "C:\path\to\MySafePlay-Bridge"
   nssm start MySafePlayBridge
   ```

## Firewall Configuration

If you need to access the service from other devices on your network:

1. **Open Windows Firewall**
2. **Create inbound rule** for port 3000 (or your custom port)
3. **Allow the application** through the firewall

## Performance Tips

- **Close unnecessary applications** to free up system resources
- **Use a wired network connection** for better camera streaming performance
- **Ensure cameras are on the same network** as the computer running the bridge

## Getting Help

If you continue to experience issues:

1. **Check the startup messages** in the terminal window
2. **Note any error codes** or specific error messages
3. **Try running as Administrator**
4. **Check Windows Event Viewer** for system-level errors

## System Requirements

- **Windows 10 or later** (Windows 11 recommended)
- **4GB RAM minimum** (8GB recommended)
- **Network connection** to access cameras
- **Administrator privileges** for initial setup

---

**Note**: This application creates a local web server to manage your cameras. It does not send data to external servers unless you explicitly configure cloud connectivity.
