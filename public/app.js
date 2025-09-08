
class CameraServiceApp {
    constructor() {
        this.socket = null;
        this.cameras = new Map();
        this.activeStreams = new Map();
        this.audioStreams = new Map();
        this.currentStreamModal = null;
        
        this.init();
    }

    init() {
        this.connectSocket();
        this.setupEventListeners();
        this.loadInitialData();
        this.startStatusUpdates();
    }

    connectSocket() {
        this.socket = io();
        
        this.socket.on('connect', () => {
            console.log('Connected to camera service');
            this.updateServiceStatus(true);
            this.showToast('Connected to camera service', 'success');
        });

        this.socket.on('disconnect', () => {
            console.log('Disconnected from camera service');
            this.updateServiceStatus(false);
            this.showToast('Disconnected from camera service', 'error');
        });

        this.socket.on('cameras-discovered', (cameras) => {
            this.handleCamerasDiscovered(cameras);
        });

        this.socket.on('stream-started', (data) => {
            this.handleStreamStarted(data);
        });

        this.socket.on('stream-stopped', (data) => {
            this.handleStreamStopped(data);
        });

        this.socket.on('stream-frame', (data) => {
            this.handleStreamFrame(data);
        });

        this.socket.on('audio-data', (data) => {
            this.handleAudioData(data);
        });

        this.socket.on('error', (error) => {
            console.error('Socket error:', error);
            this.showToast(error.message || 'An error occurred', 'error');
        });
    }

    setupEventListeners() {
        // Discovery button
        document.getElementById('discover-btn').addEventListener('click', () => {
            this.discoverCameras();
        });

        // Add camera button
        document.getElementById('add-camera-btn').addEventListener('click', () => {
            this.showAddCameraModal();
        });

        // Add camera form
        document.getElementById('add-camera-form').addEventListener('submit', (e) => {
            e.preventDefault();
            this.addCamera();
        });

        // Cancel add camera
        document.getElementById('cancel-add-camera').addEventListener('click', () => {
            this.hideAddCameraModal();
        });

        // Modal close buttons
        document.querySelectorAll('.modal-close').forEach(btn => {
            btn.addEventListener('click', (e) => {
                const modal = e.target.closest('.modal');
                this.hideModal(modal);
            });
        });

        // Click outside modal to close
        document.querySelectorAll('.modal').forEach(modal => {
            modal.addEventListener('click', (e) => {
                if (e.target === modal) {
                    this.hideModal(modal);
                }
            });
        });

        // Stream controls
        document.getElementById('audio-toggle').addEventListener('click', () => {
            this.toggleAudio();
        });

        document.getElementById('fullscreen-btn').addEventListener('click', () => {
            this.toggleFullscreen();
        });

        // Audio volume controls
        document.getElementById('mic-volume').addEventListener('input', (e) => {
            this.updateMicVolume(e.target.value);
        });

        document.getElementById('speaker-volume').addEventListener('input', (e) => {
            this.updateSpeakerVolume(e.target.value);
        });
    }

    async loadInitialData() {
        try {
            // Load service status
            const response = await fetch('/api/status');
            const status = await response.json();
            this.updateDashboardStats(status);

            // Load cameras
            const camerasResponse = await fetch('/api/cameras');
            const cameras = await camerasResponse.json();
            this.updateCamerasList(cameras);

        } catch (error) {
            console.error('Error loading initial data:', error);
            this.showToast('Failed to load initial data', 'error');
        }
    }

    startStatusUpdates() {
        // Update status every 30 seconds
        setInterval(async () => {
            try {
                const response = await fetch('/api/status');
                const status = await response.json();
                this.updateDashboardStats(status);
            } catch (error) {
                console.error('Error updating status:', error);
            }
        }, 30000);
    }

    updateDashboardStats(status) {
        document.getElementById('camera-count').textContent = status.cameras || 0;
        document.getElementById('stream-count').textContent = status.streams?.length || 0;
        document.getElementById('audio-count').textContent = 0; // Will be updated separately
        document.getElementById('uptime').textContent = this.formatUptime(status.uptime);
        
        this.updateCloudStatus(status.cloudConnected);
    }

    updateServiceStatus(connected) {
        const statusIcon = document.getElementById('service-status');
        statusIcon.className = connected ? 'fas fa-circle online' : 'fas fa-circle offline';
    }

    updateCloudStatus(connected) {
        const statusIcon = document.getElementById('cloud-status');
        statusIcon.className = connected ? 'fas fa-cloud online' : 'fas fa-cloud offline';
    }

    formatUptime(seconds) {
        if (!seconds) return '0s';
        
        const hours = Math.floor(seconds / 3600);
        const minutes = Math.floor((seconds % 3600) / 60);
        const secs = Math.floor(seconds % 60);
        
        if (hours > 0) {
            return `${hours}h ${minutes}m`;
        } else if (minutes > 0) {
            return `${minutes}m ${secs}s`;
        } else {
            return `${secs}s`;
        }
    }

    async discoverCameras() {
        const btn = document.getElementById('discover-btn');
        const status = document.getElementById('discovery-status');
        
        btn.disabled = true;
        btn.innerHTML = '<div class="loading"></div> Discovering...';
        
        status.className = 'discovery-status discovering';
        status.innerHTML = '<p><i class="fas fa-spinner fa-spin"></i> Scanning network for ONVIF cameras...</p>';

        try {
            this.socket.emit('discover-cameras');
        } catch (error) {
            console.error('Error discovering cameras:', error);
            this.showToast('Failed to discover cameras', 'error');
            
            status.className = 'discovery-status error';
            status.innerHTML = '<p><i class="fas fa-exclamation-triangle"></i> Failed to discover cameras</p>';
        } finally {
            btn.disabled = false;
            btn.innerHTML = '<i class="fas fa-sync"></i> Discover Cameras';
        }
    }

    handleCamerasDiscovered(cameras) {
        const status = document.getElementById('discovery-status');
        
        if (cameras.length > 0) {
            status.className = 'discovery-status success';
            status.innerHTML = `<p><i class="fas fa-check-circle"></i> Found ${cameras.length} camera(s)</p>`;
            
            this.updateCamerasList(cameras);
            this.showToast(`Discovered ${cameras.length} camera(s)`, 'success');
        } else {
            status.className = 'discovery-status';
            status.innerHTML = '<p><i class="fas fa-info-circle"></i> No cameras found on network</p>';
            this.showToast('No cameras found', 'warning');
        }
    }

    updateCamerasList(cameras) {
        const grid = document.getElementById('cameras-grid');
        grid.innerHTML = '';

        cameras.forEach(camera => {
            this.cameras.set(camera.id, camera);
            const card = this.createCameraCard(camera);
            grid.appendChild(card);
        });
    }

    createCameraCard(camera) {
        const card = document.createElement('div');
        card.className = 'camera-card';
        card.innerHTML = `
            <div class="camera-header">
                <div class="camera-info">
                    <h3>${camera.name}</h3>
                    <p>${camera.manufacturer || 'Unknown'} ${camera.model || ''}</p>
                </div>
                <div class="camera-status ${camera.status || 'offline'}">${camera.status || 'offline'}</div>
            </div>
            <div class="camera-details">
                <div class="camera-detail">
                    <strong>IP Address:</strong>
                    <span>${camera.ip || 'Unknown'}</span>
                </div>
                <div class="camera-detail">
                    <strong>Port:</strong>
                    <span>${camera.port || 554}</span>
                </div>
                <div class="camera-detail">
                    <strong>Capabilities:</strong>
                    <span>${this.formatCapabilities(camera.capabilities)}</span>
                </div>
            </div>
            <div class="camera-actions">
                <button class="btn btn-primary" onclick="app.startStream('${camera.id}')">
                    <i class="fas fa-play"></i> Stream
                </button>
                <button class="btn btn-secondary" onclick="app.testCamera('${camera.id}')">
                    <i class="fas fa-check"></i> Test
                </button>
            </div>
        `;
        return card;
    }

    formatCapabilities(capabilities) {
        if (!capabilities) return 'Unknown';
        
        const caps = [];
        if (capabilities.video) caps.push('Video');
        if (capabilities.audio) caps.push('Audio');
        if (capabilities.ptz) caps.push('PTZ');
        if (capabilities.nightVision) caps.push('Night Vision');
        
        return caps.length > 0 ? caps.join(', ') : 'Basic';
    }

    async startStream(cameraId) {
        try {
            this.showToast('Starting stream...', 'info');
            this.socket.emit('start-stream', cameraId);
        } catch (error) {
            console.error('Error starting stream:', error);
            this.showToast('Failed to start stream', 'error');
        }
    }

    async stopStream(cameraId) {
        try {
            this.socket.emit('stop-stream', cameraId);
            this.activeStreams.delete(cameraId);
            this.updateStreamsGrid();
        } catch (error) {
            console.error('Error stopping stream:', error);
            this.showToast('Failed to stop stream', 'error');
        }
    }

    handleStreamStarted(data) {
        const { cameraId, streamUrl } = data;
        const camera = this.cameras.get(cameraId);
        
        if (camera) {
            this.activeStreams.set(cameraId, {
                camera,
                streamUrl,
                startedAt: Date.now()
            });
            
            this.updateStreamsGrid();
            this.showStreamModal(cameraId);
            this.showToast(`Stream started for ${camera.name}`, 'success');
        }
    }

    handleStreamStopped(data) {
        const { cameraId } = data;
        this.activeStreams.delete(cameraId);
        this.updateStreamsGrid();
        
        const camera = this.cameras.get(cameraId);
        if (camera) {
            this.showToast(`Stream stopped for ${camera.name}`, 'info');
        }
    }

    handleStreamFrame(data) {
        const { cameraId, frame, timestamp } = data;
        const streamImg = document.getElementById('stream-image');
        
        if (this.currentStreamModal === cameraId && streamImg) {
            streamImg.src = `data:image/jpeg;base64,${frame}`;
            
            // Update FPS counter
            this.updateStreamStats(cameraId, timestamp);
        }
    }

    updateStreamStats(cameraId, timestamp) {
        // Simple FPS calculation
        if (!this.lastFrameTime) {
            this.lastFrameTime = timestamp;
            this.frameCount = 0;
            return;
        }
        
        this.frameCount++;
        const timeDiff = timestamp - this.lastFrameTime;
        
        if (timeDiff >= 1000) { // Update every second
            const fps = Math.round((this.frameCount * 1000) / timeDiff);
            document.getElementById('stream-fps').textContent = `${fps} FPS`;
            
            this.lastFrameTime = timestamp;
            this.frameCount = 0;
        }
    }

    updateStreamsGrid() {
        const grid = document.getElementById('streams-grid');
        grid.innerHTML = '';

        this.activeStreams.forEach((stream, cameraId) => {
            const card = this.createStreamCard(cameraId, stream);
            grid.appendChild(card);
        });
    }

    createStreamCard(cameraId, stream) {
        const card = document.createElement('div');
        card.className = 'stream-card';
        card.innerHTML = `
            <div class="stream-preview">
                <img src="/api/placeholder-stream.jpg" alt="Stream Preview">
                <div class="stream-overlay">
                    <div class="stream-info">
                        <span id="fps-${cameraId}">0 FPS</span>
                        <span>640x480</span>
                    </div>
                </div>
            </div>
            <div class="stream-card-content">
                <h4>${stream.camera.name}</h4>
                <div class="stream-actions">
                    <button class="btn btn-primary" onclick="app.showStreamModal('${cameraId}')">
                        <i class="fas fa-expand"></i> View
                    </button>
                    <button class="btn btn-secondary" onclick="app.stopStream('${cameraId}')">
                        <i class="fas fa-stop"></i> Stop
                    </button>
                </div>
            </div>
        `;
        return card;
    }

    showStreamModal(cameraId) {
        const stream = this.activeStreams.get(cameraId);
        if (!stream) return;

        this.currentStreamModal = cameraId;
        
        const modal = document.getElementById('stream-modal');
        const title = document.getElementById('stream-title');
        const streamImg = document.getElementById('stream-image');
        
        title.textContent = `${stream.camera.name} - Live Stream`;
        streamImg.src = '/api/placeholder-stream.jpg';
        
        this.showModal(modal);
        
        // Start receiving frames
        this.socket.emit('start-stream', cameraId);
    }

    async testCamera(cameraId) {
        try {
            this.showToast('Testing camera connection...', 'info');
            
            const response = await fetch(`/api/cameras/${cameraId}/test`, {
                method: 'POST'
            });
            
            const result = await response.json();
            
            if (result.success) {
                this.showToast('Camera connection successful', 'success');
            } else {
                this.showToast(`Camera test failed: ${result.error}`, 'error');
            }
        } catch (error) {
            console.error('Error testing camera:', error);
            this.showToast('Failed to test camera', 'error');
        }
    }

    showAddCameraModal() {
        const modal = document.getElementById('add-camera-modal');
        this.showModal(modal);
    }

    hideAddCameraModal() {
        const modal = document.getElementById('add-camera-modal');
        this.hideModal(modal);
        document.getElementById('add-camera-form').reset();
    }

    async addCamera() {
        const form = document.getElementById('add-camera-form');
        const formData = new FormData(form);
        
        const cameraData = {
            name: document.getElementById('camera-name').value,
            ip: document.getElementById('camera-ip').value,
            port: parseInt(document.getElementById('camera-port').value),
            username: document.getElementById('camera-username').value,
            password: document.getElementById('camera-password').value,
            path: document.getElementById('camera-path').value
        };

        try {
            const response = await fetch('/api/cameras', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json'
                },
                body: JSON.stringify(cameraData)
            });

            if (response.ok) {
                const camera = await response.json();
                this.cameras.set(camera.id, camera);
                this.updateCamerasList(Array.from(this.cameras.values()));
                this.hideAddCameraModal();
                this.showToast('Camera added successfully', 'success');
            } else {
                throw new Error('Failed to add camera');
            }
        } catch (error) {
            console.error('Error adding camera:', error);
            this.showToast('Failed to add camera', 'error');
        }
    }

    toggleAudio() {
        const btn = document.getElementById('audio-toggle');
        const icon = btn.querySelector('i');
        
        if (icon.classList.contains('fa-volume-up')) {
            icon.className = 'fas fa-volume-mute';
            btn.title = 'Enable Audio';
            this.stopAudio();
        } else {
            icon.className = 'fas fa-volume-up';
            btn.title = 'Disable Audio';
            this.startAudio();
        }
    }

    startAudio() {
        if (this.currentStreamModal) {
            this.socket.emit('start-audio', this.currentStreamModal);
        }
    }

    stopAudio() {
        if (this.currentStreamModal) {
            this.socket.emit('stop-audio', this.currentStreamModal);
        }
    }

    handleAudioData(data) {
        // Handle incoming audio data
        console.log('Received audio data:', data);
    }

    updateMicVolume(volume) {
        console.log('Microphone volume:', volume);
        // Implement microphone volume control
    }

    updateSpeakerVolume(volume) {
        console.log('Speaker volume:', volume);
        // Implement speaker volume control
    }

    toggleFullscreen() {
        const streamViewer = document.getElementById('stream-viewer');
        
        if (!document.fullscreenElement) {
            streamViewer.requestFullscreen().catch(err => {
                console.error('Error attempting to enable fullscreen:', err);
            });
        } else {
            document.exitFullscreen();
        }
    }

    showModal(modal) {
        modal.classList.add('active');
        document.body.style.overflow = 'hidden';
    }

    hideModal(modal) {
        modal.classList.remove('active');
        document.body.style.overflow = '';
        
        // Clean up stream modal
        if (modal.id === 'stream-modal') {
            this.currentStreamModal = null;
        }
    }

    showToast(message, type = 'info') {
        const container = document.getElementById('toast-container');
        const toast = document.createElement('div');
        toast.className = `toast ${type}`;
        toast.innerHTML = `
            <div style="display: flex; align-items: center; gap: 10px;">
                <i class="fas fa-${this.getToastIcon(type)}"></i>
                <span>${message}</span>
            </div>
        `;
        
        container.appendChild(toast);
        
        // Show toast
        setTimeout(() => toast.classList.add('show'), 100);
        
        // Hide and remove toast
        setTimeout(() => {
            toast.classList.remove('show');
            setTimeout(() => container.removeChild(toast), 300);
        }, 5000);
    }

    getToastIcon(type) {
        const icons = {
            success: 'check-circle',
            error: 'exclamation-circle',
            warning: 'exclamation-triangle',
            info: 'info-circle'
        };
        return icons[type] || 'info-circle';
    }
}

// Initialize the app when DOM is loaded
document.addEventListener('DOMContentLoaded', () => {
    window.app = new CameraServiceApp();
});
