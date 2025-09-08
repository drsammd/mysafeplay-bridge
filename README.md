
# MySafePlay Local Camera Service

A comprehensive local camera service that bridges network cameras with the MySafePlay cloud application. This service provides real-time streaming, bidirectional audio, ONVIF camera discovery, and secure cloud integration.

## 🚀 Features

- **Multi-Camera Support**: Discover and manage multiple IP cameras simultaneously
- **ONVIF Discovery**: Automatic detection of ONVIF-compliant cameras on your network
- **Real-Time Streaming**: Live video streaming with MJPEG format for web compatibility
- **Bidirectional Audio**: Two-way audio communication with cameras
- **Cloud Integration**: Secure WebSocket connection to MySafePlay cloud service
- **Web Dashboard**: Browser-based configuration and monitoring interface
- **AWS Integration**: Frame forwarding for AWS Rekognition analysis
- **Easy Installation**: One-command setup with automatic dependency management

## 📋 Requirements

- **Node.js**: Version 16.x or higher
- **FFmpeg**: For video processing and streaming
- **Network**: Local network access to IP cameras
- **Operating System**: Linux, macOS, or Windows

## 🛠️ Installation

### Quick Install (Recommended)

```bash
# Download and run the installation script
curl -fsSL https://raw.githubusercontent.com/mysafeplay/local-camera-service/main/install.sh | bash
```

### Manual Installation

1. **Clone or Download the Service**
   ```bash
   git clone https://github.com/mysafeplay/local-camera-service.git
   cd local-camera-service
   ```

2. **Install Dependencies**
   ```bash
   npm install
   ```

3. **Install FFmpeg**
   
   **Ubuntu/Debian:**
   ```bash
   sudo apt update
   sudo apt install ffmpeg
   ```
   
   **CentOS/RHEL:**
   ```bash
   sudo yum install epel-release
   sudo yum install ffmpeg
   ```
   
   **macOS:**
   ```bash
   brew install ffmpeg
   ```
   
   **Windows:**
   Download from https://ffmpeg.org/download.html

4. **Configure Environment**
   ```bash
   cp .env.example .env
   nano .env  # Edit configuration as needed
   ```

5. **Start the Service**
   ```bash
   npm start
   ```

## ⚙️ Configuration

### Environment Variables

Copy `.env.example` to `.env` and configure:

```env
# Service Configuration
PORT=3001
NODE_ENV=production

# Cloud Connection
CLOUD_WS_URL=wss://mysafeplay.vercel.app/ws
CLOUD_API_KEY=your_api_key_here

# Security
JWT_SECRET=your_jwt_secret_here
ADMIN_PASSWORD=your_admin_password

# Camera Settings
DEFAULT_RTSP_PORT=554
DISCOVERY_TIMEOUT=5000
MAX_CAMERAS=10

# Streaming Settings
STREAM_QUALITY=medium
HLS_SEGMENT_DURATION=2
AUDIO_ENABLED=true
BIDIRECTIONAL_AUDIO=true
```

### Camera Configuration

The service supports multiple ways to add cameras:

1. **Automatic Discovery**: Uses ONVIF protocol to find cameras
2. **Manual Addition**: Add cameras via the web interface
3. **Configuration File**: Pre-configure cameras in settings

#### Supported Camera Formats

- **ONVIF Compliant Cameras**: Automatic discovery and configuration
- **RTSP Streams**: Direct RTSP URL configuration
- **Popular Brands**: Reolink, Hikvision, Dahua, Axis, and more

## 🖥️ Usage

### Web Dashboard

1. **Access the Dashboard**
   ```
   http://localhost:3001
   ```

2. **Discover Cameras**
   - Click "Discover Cameras" to scan your network
   - Cameras will appear automatically if ONVIF-compliant

3. **Add Manual Cameras**
   - Click "Add Camera" for non-ONVIF cameras
   - Enter camera details (IP, credentials, RTSP path)

4. **Start Streaming**
   - Click "Stream" on any camera card
   - View live video in the modal viewer
   - Enable audio for two-way communication

### API Endpoints

The service provides a REST API for integration:

```bash
# Get service status
GET /api/status

# List all cameras
GET /api/cameras

# Discover cameras
POST /api/cameras/discover

# Add camera
POST /api/cameras

# Start stream
POST /api/cameras/:id/stream/start

# Stop stream
POST /api/cameras/:id/stream/stop

# Get configuration
GET /api/config

# Update configuration
POST /api/config
```

### WebSocket Events

Real-time communication via Socket.IO:

```javascript
// Client events
socket.emit('discover-cameras');
socket.emit('start-stream', cameraId);
socket.emit('stop-stream', cameraId);
socket.emit('audio-data', audioData);

// Server events
socket.on('cameras-discovered', cameras);
socket.on('stream-started', data);
socket.on('stream-frame', frameData);
socket.on('audio-data', audioData);
```

## 🔧 Architecture

### System Components

```
┌─────────────────┐    ┌──────────────────┐    ┌─────────────────┐
│   Web Browser   │    │  Local Service   │    │  Cloud Service  │
│                 │    │                  │    │                 │
│ • Dashboard     │◄──►│ • Camera Mgmt    │◄──►│ • MySafePlay    │
│ • Live Streams  │    │ • Stream Server  │    │ • AWS Rekognition│
│ • Audio Control │    │ • Cloud Connector│    │ • User Interface│
└─────────────────┘    └──────────────────┘    └─────────────────┘
                                │
                                ▼
                       ┌──────────────────┐
                       │  Network Cameras │
                       │                  │
                       │ • ONVIF/RTSP     │
                       │ • Video/Audio    │
                       │ • PTZ Control    │
                       └──────────────────┘
```

### Service Architecture

- **Camera Manager**: ONVIF discovery, camera configuration
- **Stream Server**: RTSP to MJPEG conversion, real-time streaming
- **Cloud Connector**: Secure WebSocket connection to cloud
- **Audio Handler**: Bidirectional audio processing
- **Config Manager**: Persistent configuration management

## 🔒 Security

### Network Security

- **Local Network Only**: Service runs on local network
- **Secure WebSocket**: TLS encryption for cloud communication
- **API Authentication**: JWT tokens for API access
- **Rate Limiting**: Protection against abuse

### Camera Security

- **Encrypted Credentials**: Secure storage of camera passwords
- **HTTPS Streaming**: Encrypted video transmission
- **Access Control**: User-based camera access management

## 🚨 Troubleshooting

### Common Issues

#### 1. Cameras Not Discovered

**Problem**: ONVIF discovery finds no cameras

**Solutions**:
- Ensure cameras are ONVIF-compliant
- Check network connectivity
- Verify cameras are on same subnet
- Disable firewall temporarily for testing
- Add cameras manually if ONVIF not supported

#### 2. Streaming Issues

**Problem**: Video stream not working

**Solutions**:
- Verify FFmpeg installation: `ffmpeg -version`
- Check RTSP URL format
- Test camera credentials
- Ensure network bandwidth is sufficient
- Check firewall rules for RTSP ports

#### 3. Cloud Connection Failed

**Problem**: Cannot connect to MySafePlay cloud

**Solutions**:
- Verify `CLOUD_WS_URL` in `.env`
- Check API key configuration
- Ensure internet connectivity
- Check firewall for WebSocket connections

#### 4. Audio Not Working

**Problem**: Bidirectional audio not functioning

**Solutions**:
- Verify camera supports audio
- Check audio settings in configuration
- Ensure browser permissions for microphone
- Test with different browsers

### Debug Mode

Enable debug logging:

```bash
LOG_LEVEL=debug npm start
```

Check logs:

```bash
tail -f logs/camera-service.log
```

### Network Diagnostics

Test camera connectivity:

```bash
# Test RTSP stream
ffplay rtsp://username:password@camera-ip:554/path

# Test ONVIF discovery
nmap -p 80,8080,8000 192.168.1.0/24

# Test network connectivity
ping camera-ip
telnet camera-ip 554
```

## 📊 Performance

### System Requirements

- **CPU**: 2+ cores recommended for multiple streams
- **RAM**: 2GB minimum, 4GB recommended
- **Network**: 100Mbps for multiple HD streams
- **Storage**: 1GB for application, additional for logs

### Optimization Tips

1. **Stream Quality**: Adjust resolution/framerate for bandwidth
2. **Camera Limit**: Limit concurrent streams based on hardware
3. **Network**: Use wired connections for cameras when possible
4. **Hardware**: Consider dedicated hardware for high camera counts

## 🔄 Updates

### Automatic Updates

The service checks for updates automatically:

```bash
npm run update
```

### Manual Updates

```bash
git pull origin main
npm install
npm restart
```

## 📝 Logging

### Log Levels

- **error**: Critical errors only
- **warn**: Warnings and errors
- **info**: General information (default)
- **debug**: Detailed debugging information

### Log Files

- **Location**: `logs/camera-service.log`
- **Rotation**: Automatic when file exceeds 10MB
- **Retention**: Last 5 rotated files kept

## 🤝 Support

### Getting Help

1. **Documentation**: Check this README first
2. **Issues**: Create GitHub issue with details
3. **Logs**: Include relevant log entries
4. **Environment**: Specify OS, Node.js version, camera models

### Contributing

1. Fork the repository
2. Create feature branch
3. Make changes with tests
4. Submit pull request

## 📄 License

MIT License - see LICENSE file for details

## 🙏 Acknowledgments

- **Node-ONVIF**: ONVIF camera discovery
- **RTSP-FFmpeg**: Video streaming capabilities
- **Socket.IO**: Real-time communication
- **Express.js**: Web server framework
- **FFmpeg**: Video processing engine

---

**MySafePlay Local Camera Service** - Bridging local cameras with cloud intelligence.
