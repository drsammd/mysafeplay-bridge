
const Stream = require('rtsp-ffmpeg');
const path = require('path');
const fs = require('fs');

class StreamServer {
    constructor(io, logger) {
        this.io = io;
        this.logger = logger;
        this.activeStreams = new Map();
        this.streamClients = new Map();
    }

    async initialize() {
        this.logger.info('Initializing Stream Server...');
        
        // Create streams directory
        const streamsDir = path.join(__dirname, '..', 'streams');
        if (!fs.existsSync(streamsDir)) {
            fs.mkdirSync(streamsDir, { recursive: true });
        }
        
        this.logger.info('Stream Server initialized');
    }

    async startStream(cameraId) {
        if (this.activeStreams.has(cameraId)) {
            this.logger.warn(`Stream already active for camera: ${cameraId}`);
            return this.getStreamUrl(cameraId);
        }

        try {
            // Get camera from camera manager (we'll need to pass it in)
            const camera = this.getCameraById(cameraId);
            if (!camera) {
                throw new Error('Camera not found');
            }

            this.logger.info(`Starting stream for camera: ${camera.name} (${cameraId})`);

            // Create RTSP stream
            const stream = new Stream({
                input: camera.rtspUrl,
                rate: 10, // 10 FPS for web streaming
                quality: 3, // JPEG quality (1-5)
                size: '640x480' // Resize for web
            });

            // Handle stream data
            stream.on('data', (data) => {
                // Emit to all connected clients for this camera
                this.io.emit('stream-frame', {
                    cameraId,
                    frame: data.toString('base64'),
                    timestamp: Date.now()
                });
            });

            // Handle stream errors
            stream.on('error', (error) => {
                this.logger.error(`Stream error for camera ${cameraId}:`, error);
                this.stopStream(cameraId);
                this.io.emit('stream-error', { cameraId, error: error.message });
            });

            this.activeStreams.set(cameraId, {
                stream,
                camera,
                startedAt: new Date().toISOString(),
                clients: new Set()
            });

            const streamUrl = this.getStreamUrl(cameraId);
            this.logger.info(`Stream started successfully for camera: ${cameraId}`);
            
            return streamUrl;
        } catch (error) {
            this.logger.error(`Failed to start stream for camera ${cameraId}:`, error);
            throw error;
        }
    }

    async stopStream(cameraId) {
        const streamData = this.activeStreams.get(cameraId);
        if (!streamData) {
            this.logger.warn(`No active stream found for camera: ${cameraId}`);
            return;
        }

        try {
            this.logger.info(`Stopping stream for camera: ${cameraId}`);
            
            // Stop the RTSP stream
            if (streamData.stream && streamData.stream.stop) {
                streamData.stream.stop();
            }

            // Remove from active streams
            this.activeStreams.delete(cameraId);

            // Notify clients
            this.io.emit('stream-stopped', { cameraId });

            this.logger.info(`Stream stopped for camera: ${cameraId}`);
        } catch (error) {
            this.logger.error(`Error stopping stream for camera ${cameraId}:`, error);
            throw error;
        }
    }

    async stopAllStreams() {
        this.logger.info('Stopping all active streams...');
        
        const promises = Array.from(this.activeStreams.keys()).map(cameraId => 
            this.stopStream(cameraId).catch(error => 
                this.logger.error(`Error stopping stream ${cameraId}:`, error)
            )
        );

        await Promise.all(promises);
        this.logger.info('All streams stopped');
    }

    getStreamUrl(cameraId) {
        return `/api/stream/${cameraId}`;
    }

    getActiveStreams() {
        return Array.from(this.activeStreams.keys()).map(cameraId => {
            const streamData = this.activeStreams.get(cameraId);
            return {
                cameraId,
                cameraName: streamData.camera.name,
                startedAt: streamData.startedAt,
                clientCount: streamData.clients.size
            };
        });
    }

    addStreamClient(cameraId, clientId) {
        const streamData = this.activeStreams.get(cameraId);
        if (streamData) {
            streamData.clients.add(clientId);
            this.logger.info(`Client ${clientId} joined stream ${cameraId}`);
        }
    }

    removeStreamClient(cameraId, clientId) {
        const streamData = this.activeStreams.get(cameraId);
        if (streamData) {
            streamData.clients.delete(clientId);
            this.logger.info(`Client ${clientId} left stream ${cameraId}`);
            
            // Stop stream if no clients
            if (streamData.clients.size === 0) {
                setTimeout(() => {
                    if (streamData.clients.size === 0) {
                        this.stopStream(cameraId);
                    }
                }, 30000); // 30 second grace period
            }
        }
    }

    // Helper method to get camera (this would normally come from camera manager)
    getCameraById(cameraId) {
        // This is a placeholder - in real implementation, this would come from CameraManager
        if (cameraId === 'reolink-e1-pro') {
            return {
                id: 'reolink-e1-pro',
                name: 'Reolink E1 Pro',
                rtspUrl: 'rtsp://admin:password123!@192.168.1.177:554/h264Preview_01_main'
            };
        }
        return null;
    }

    getStreamStats(cameraId) {
        const streamData = this.activeStreams.get(cameraId);
        if (!streamData) {
            return null;
        }

        return {
            cameraId,
            cameraName: streamData.camera.name,
            startedAt: streamData.startedAt,
            uptime: Date.now() - new Date(streamData.startedAt).getTime(),
            clientCount: streamData.clients.size,
            status: 'active'
        };
    }
}

module.exports = StreamServer;
