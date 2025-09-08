
#!/bin/bash

# MySafePlay Local Camera Service Installation Script
# This script installs Node.js, FFmpeg, and sets up the camera service

set -e

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

# Configuration
SERVICE_NAME="MySafePlay Local Camera Service"
SERVICE_DIR="$HOME/local-camera-service"
NODE_VERSION="18"
SERVICE_PORT="3001"

# Logging function
log() {
    echo -e "${BLUE}[$(date +'%Y-%m-%d %H:%M:%S')]${NC} $1"
}

error() {
    echo -e "${RED}[ERROR]${NC} $1" >&2
}

success() {
    echo -e "${GREEN}[SUCCESS]${NC} $1"
}

warning() {
    echo -e "${YELLOW}[WARNING]${NC} $1"
}

# Check if running as root
check_root() {
    if [[ $EUID -eq 0 ]]; then
        error "This script should not be run as root"
        exit 1
    fi
}

# Detect operating system
detect_os() {
    if [[ "$OSTYPE" == "linux-gnu"* ]]; then
        if [ -f /etc/debian_version ]; then
            OS="debian"
            DISTRO=$(lsb_release -si 2>/dev/null || echo "Debian")
        elif [ -f /etc/redhat-release ]; then
            OS="redhat"
            DISTRO=$(cat /etc/redhat-release | awk '{print $1}')
        else
            OS="linux"
            DISTRO="Unknown"
        fi
    elif [[ "$OSTYPE" == "darwin"* ]]; then
        OS="macos"
        DISTRO="macOS"
    else
        OS="unknown"
        DISTRO="Unknown"
    fi
    
    log "Detected OS: $DISTRO ($OS)"
}

# Check system requirements
check_requirements() {
    log "Checking system requirements..."
    
    # Check available memory
    if [[ "$OS" == "linux" ]]; then
        MEMORY_KB=$(grep MemTotal /proc/meminfo | awk '{print $2}')
        MEMORY_GB=$((MEMORY_KB / 1024 / 1024))
    elif [[ "$OS" == "macos" ]]; then
        MEMORY_BYTES=$(sysctl -n hw.memsize)
        MEMORY_GB=$((MEMORY_BYTES / 1024 / 1024 / 1024))
    else
        MEMORY_GB=4  # Assume sufficient memory
    fi
    
    if [ $MEMORY_GB -lt 2 ]; then
        warning "System has less than 2GB RAM. Performance may be limited."
    else
        success "Memory check passed: ${MEMORY_GB}GB available"
    fi
    
    # Check disk space
    DISK_SPACE=$(df -BG "$HOME" | awk 'NR==2 {print $4}' | sed 's/G//')
    if [ $DISK_SPACE -lt 5 ]; then
        error "Insufficient disk space. At least 5GB required."
        exit 1
    else
        success "Disk space check passed: ${DISK_SPACE}GB available"
    fi
}

# Install Node.js
install_nodejs() {
    log "Checking Node.js installation..."
    
    if command -v node &> /dev/null; then
        NODE_CURRENT=$(node --version | sed 's/v//')
        NODE_MAJOR=$(echo $NODE_CURRENT | cut -d. -f1)
        
        if [ $NODE_MAJOR -ge $NODE_VERSION ]; then
            success "Node.js $NODE_CURRENT is already installed"
            return
        else
            warning "Node.js $NODE_CURRENT is outdated. Installing Node.js $NODE_VERSION..."
        fi
    else
        log "Node.js not found. Installing Node.js $NODE_VERSION..."
    fi
    
    # Install Node.js using NodeSource repository
    if [[ "$OS" == "debian" ]]; then
        curl -fsSL https://deb.nodesource.com/setup_${NODE_VERSION}.x | sudo -E bash -
        sudo apt-get install -y nodejs
    elif [[ "$OS" == "redhat" ]]; then
        curl -fsSL https://rpm.nodesource.com/setup_${NODE_VERSION}.x | sudo bash -
        sudo yum install -y nodejs
    elif [[ "$OS" == "macos" ]]; then
        if command -v brew &> /dev/null; then
            brew install node@${NODE_VERSION}
        else
            error "Homebrew not found. Please install Node.js manually from https://nodejs.org/"
            exit 1
        fi
    else
        error "Unsupported operating system for automatic Node.js installation"
        error "Please install Node.js $NODE_VERSION manually from https://nodejs.org/"
        exit 1
    fi
    
    # Verify installation
    if command -v node &> /dev/null; then
        success "Node.js $(node --version) installed successfully"
    else
        error "Node.js installation failed"
        exit 1
    fi
}

# Install FFmpeg
install_ffmpeg() {
    log "Checking FFmpeg installation..."
    
    if command -v ffmpeg &> /dev/null; then
        FFMPEG_VERSION=$(ffmpeg -version 2>&1 | head -n1 | awk '{print $3}')
        success "FFmpeg $FFMPEG_VERSION is already installed"
        return
    fi
    
    log "Installing FFmpeg..."
    
    if [[ "$OS" == "debian" ]]; then
        sudo apt-get update
        sudo apt-get install -y ffmpeg
    elif [[ "$OS" == "redhat" ]]; then
        # Enable EPEL repository for FFmpeg
        sudo yum install -y epel-release
        sudo yum install -y ffmpeg
    elif [[ "$OS" == "macos" ]]; then
        if command -v brew &> /dev/null; then
            brew install ffmpeg
        else
            error "Homebrew not found. Please install FFmpeg manually"
            exit 1
        fi
    else
        error "Unsupported operating system for automatic FFmpeg installation"
        error "Please install FFmpeg manually from https://ffmpeg.org/"
        exit 1
    fi
    
    # Verify installation
    if command -v ffmpeg &> /dev/null; then
        FFMPEG_VERSION=$(ffmpeg -version 2>&1 | head -n1 | awk '{print $3}')
        success "FFmpeg $FFMPEG_VERSION installed successfully"
    else
        error "FFmpeg installation failed"
        exit 1
    fi
}

# Setup service directory
setup_service() {
    log "Setting up service directory..."
    
    # Create service directory if it doesn't exist
    if [ ! -d "$SERVICE_DIR" ]; then
        mkdir -p "$SERVICE_DIR"
        success "Created service directory: $SERVICE_DIR"
    else
        warning "Service directory already exists: $SERVICE_DIR"
    fi
    
    cd "$SERVICE_DIR"
    
    # If package.json doesn't exist, we need to download the service files
    if [ ! -f "package.json" ]; then
        log "Downloading service files..."
        
        # In a real deployment, this would download from GitHub releases
        # For now, we'll create a minimal structure
        cat > package.json << 'EOF'
{
  "name": "local-camera-service",
  "version": "1.0.0",
  "description": "Local Camera Service for MySafePlay",
  "main": "server.js",
  "scripts": {
    "start": "node server.js",
    "dev": "nodemon server.js",
    "test": "node test/test-discovery.js"
  },
  "dependencies": {
    "express": "^4.18.2",
    "ws": "^8.14.2",
    "socket.io": "^4.7.4",
    "node-onvif": "^0.2.12",
    "rtsp-ffmpeg": "^0.0.9",
    "ffmpeg-static": "^5.2.0",
    "dotenv": "^16.3.1",
    "cors": "^2.8.5",
    "helmet": "^7.1.0",
    "express-rate-limit": "^7.1.5",
    "jsonwebtoken": "^9.0.2",
    "bcryptjs": "^2.4.3",
    "multer": "^1.4.5-lts.1",
    "uuid": "^9.0.1"
  }
}
EOF
        success "Created package.json"
    fi
    
    # Install dependencies
    log "Installing Node.js dependencies..."
    npm install
    success "Dependencies installed successfully"
}

# Create environment configuration
create_config() {
    log "Creating configuration files..."
    
    if [ ! -f ".env" ]; then
        cat > .env << EOF
# Local Camera Service Configuration
PORT=$SERVICE_PORT
NODE_ENV=production

# Cloud Connection (configure these with your actual values)
CLOUD_WS_URL=wss://mysafeplay.vercel.app/ws
CLOUD_API_KEY=your_cloud_api_key_here

# Security (change these in production)
JWT_SECRET=$(openssl rand -hex 32)
ADMIN_PASSWORD=admin123

# Camera Configuration
DEFAULT_RTSP_PORT=554
DISCOVERY_TIMEOUT=5000
STREAM_QUALITY=medium
MAX_CAMERAS=10

# Streaming Configuration
HLS_SEGMENT_DURATION=2
WEBRTC_STUN_SERVER=stun:stun.l.google.com:19302
AUDIO_ENABLED=true
BIDIRECTIONAL_AUDIO=true

# Logging
LOG_LEVEL=info
LOG_FILE=logs/camera-service.log
EOF
        success "Created .env configuration file"
    else
        warning "Configuration file .env already exists"
    fi
    
    # Create logs directory
    mkdir -p logs
    
    # Create config directory
    mkdir -p config
}

# Setup systemd service (Linux only)
setup_systemd() {
    if [[ "$OS" != "linux" ]]; then
        return
    fi
    
    log "Setting up systemd service..."
    
    SERVICE_FILE="/etc/systemd/system/local-camera-service.service"
    
    sudo tee $SERVICE_FILE > /dev/null << EOF
[Unit]
Description=MySafePlay Local Camera Service
After=network.target

[Service]
Type=simple
User=$USER
WorkingDirectory=$SERVICE_DIR
ExecStart=$(which node) server.js
Restart=always
RestartSec=10
Environment=NODE_ENV=production

[Install]
WantedBy=multi-user.target
EOF
    
    sudo systemctl daemon-reload
    sudo systemctl enable local-camera-service
    
    success "Systemd service created and enabled"
}

# Configure firewall
configure_firewall() {
    log "Configuring firewall..."
    
    if [[ "$OS" == "debian" ]] && command -v ufw &> /dev/null; then
        sudo ufw allow $SERVICE_PORT/tcp comment "MySafePlay Camera Service"
        success "UFW firewall rule added for port $SERVICE_PORT"
    elif [[ "$OS" == "redhat" ]] && command -v firewall-cmd &> /dev/null; then
        sudo firewall-cmd --permanent --add-port=$SERVICE_PORT/tcp
        sudo firewall-cmd --reload
        success "Firewalld rule added for port $SERVICE_PORT"
    else
        warning "Could not configure firewall automatically"
        warning "Please ensure port $SERVICE_PORT is open for the service to work"
    fi
}

# Start the service
start_service() {
    log "Starting the camera service..."
    
    cd "$SERVICE_DIR"
    
    if [[ "$OS" == "linux" ]] && systemctl is-enabled local-camera-service &> /dev/null; then
        sudo systemctl start local-camera-service
        success "Service started via systemd"
    else
        # Start in background
        nohup npm start > logs/service.log 2>&1 &
        echo $! > .service.pid
        success "Service started in background (PID: $(cat .service.pid))"
    fi
    
    # Wait a moment for service to start
    sleep 3
    
    # Check if service is running
    if curl -s http://localhost:$SERVICE_PORT/api/status > /dev/null; then
        success "Service is running and responding"
    else
        warning "Service may not be fully started yet. Check logs if issues persist."
    fi
}

# Print completion message
print_completion() {
    echo
    echo "=================================================================="
    echo -e "${GREEN}🎉 MySafePlay Local Camera Service Installation Complete! 🎉${NC}"
    echo "=================================================================="
    echo
    echo -e "${BLUE}Service Information:${NC}"
    echo "  • Service Directory: $SERVICE_DIR"
    echo "  • Web Dashboard: http://localhost:$SERVICE_PORT"
    echo "  • Configuration: $SERVICE_DIR/.env"
    echo "  • Logs: $SERVICE_DIR/logs/"
    echo
    echo -e "${BLUE}Next Steps:${NC}"
    echo "  1. Open your browser and go to: http://localhost:$SERVICE_PORT"
    echo "  2. Click 'Discover Cameras' to find cameras on your network"
    echo "  3. Add cameras manually if they're not auto-discovered"
    echo "  4. Configure cloud connection in .env file"
    echo
    echo -e "${BLUE}Service Management:${NC}"
    if [[ "$OS" == "linux" ]] && systemctl is-enabled local-camera-service &> /dev/null; then
        echo "  • Start:   sudo systemctl start local-camera-service"
        echo "  • Stop:    sudo systemctl stop local-camera-service"
        echo "  • Restart: sudo systemctl restart local-camera-service"
        echo "  • Status:  sudo systemctl status local-camera-service"
        echo "  • Logs:    journalctl -u local-camera-service -f"
    else
        echo "  • Start:   cd $SERVICE_DIR && npm start"
        echo "  • Stop:    kill \$(cat $SERVICE_DIR/.service.pid)"
        echo "  • Logs:    tail -f $SERVICE_DIR/logs/camera-service.log"
    fi
    echo
    echo -e "${BLUE}Support:${NC}"
    echo "  • Documentation: $SERVICE_DIR/README.md"
    echo "  • Issues: https://github.com/mysafeplay/local-camera-service/issues"
    echo
    echo -e "${YELLOW}⚠️  Important Security Notes:${NC}"
    echo "  • Change the default admin password in .env"
    echo "  • Configure your cloud API key for remote access"
    echo "  • Ensure your cameras have strong passwords"
    echo
    echo "=================================================================="
}

# Main installation function
main() {
    echo
    echo "=================================================================="
    echo -e "${BLUE}🛡️  MySafePlay Local Camera Service Installer 🛡️${NC}"
    echo "=================================================================="
    echo
    
    check_root
    detect_os
    check_requirements
    install_nodejs
    install_ffmpeg
    setup_service
    create_config
    setup_systemd
    configure_firewall
    start_service
    print_completion
}

# Run main function
main "$@"
