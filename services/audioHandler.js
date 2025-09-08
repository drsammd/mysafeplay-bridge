
class AudioHandler {
    constructor(io, logger) {
        this.io = io;
        this.logger = logger;
        this.audioStreams = new Map();
        this.audioClients = new Map();
    }

    async initialize() {
        this.logger.info('Initializing Audio Handler...');
        
        // Setup audio processing capabilities
        this.setupAudioProcessing();
        
        this.logger.info('Audio Handler initialized');
    }

    setupAudioProcessing() {
        // Initialize audio processing capabilities
        // This would integrate with WebRTC for bidirectional audio
        this.logger.info('Audio processing capabilities ready');
    }

    startAudioStream(socket, cameraId) {
        this.logger.info(`Starting audio stream for camera: ${cameraId}, client: ${socket.id}`);
        
        try {
            // Create audio stream for camera
            if (!this.audioStreams.has(cameraId)) {
                this.audioStreams.set(cameraId, {
                    clients: new Set(),
                    startedAt: Date.now()
                });
            }

            const stream = this.audioStreams.get(cameraId);
            stream.clients.add(socket.id);

            // Add client to audio clients map
            if (!this.audioClients.has(socket.id)) {
                this.audioClients.set(socket.id, new Set());
            }
            this.audioClients.get(socket.id).add(cameraId);

            // Start audio capture from camera
            this.startCameraAudioCapture(cameraId);

            socket.emit('audio-stream-started', { cameraId });
            this.logger.info(`Audio stream started for camera: ${cameraId}`);
            
        } catch (error) {
            this.logger.error(`Error starting audio stream for camera ${cameraId}:`, error);
            socket.emit('audio-error', { cameraId, error: error.message });
        }
    }

    stopAudioStream(socket, cameraId) {
        this.logger.info(`Stopping audio stream for camera: ${cameraId}, client: ${socket.id}`);
        
        try {
            const stream = this.audioStreams.get(cameraId);
            if (stream) {
                stream.clients.delete(socket.id);
                
                // If no more clients, stop the audio capture
                if (stream.clients.size === 0) {
                    this.stopCameraAudioCapture(cameraId);
                    this.audioStreams.delete(cameraId);
                }
            }

            // Remove from client's audio streams
            const clientStreams = this.audioClients.get(socket.id);
            if (clientStreams) {
                clientStreams.delete(cameraId);
                if (clientStreams.size === 0) {
                    this.audioClients.delete(socket.id);
                }
            }

            socket.emit('audio-stream-stopped', { cameraId });
            this.logger.info(`Audio stream stopped for camera: ${cameraId}`);
            
        } catch (error) {
            this.logger.error(`Error stopping audio stream for camera ${cameraId}:`, error);
        }
    }

    handleAudioData(socket, data) {
        const { cameraId, audioData, type } = data;
        
        if (type === 'microphone') {
            // Handle audio from client microphone to camera
            this.sendAudioToCamera(cameraId, audioData);
        } else if (type === 'speaker') {
            // Handle audio from camera to client speakers
            this.sendAudioToClient(socket, cameraId, audioData);
        }
    }

    startCameraAudioCapture(cameraId) {
        // Start capturing audio from camera
        // This would integrate with the camera's audio stream
        this.logger.info(`Starting audio capture for camera: ${cameraId}`);
        
        // Simulate audio data streaming
        const audioInterval = setInterval(() => {
            const stream = this.audioStreams.get(cameraId);
            if (!stream || stream.clients.size === 0) {
                clearInterval(audioInterval);
                return;
            }

            // Simulate audio data (in real implementation, this would come from camera)
            const audioData = this.generateSimulatedAudioData();
            
            // Send to all clients listening to this camera
            stream.clients.forEach(clientId => {
                this.io.to(clientId).emit('audio-data', {
                    cameraId,
                    audioData,
                    timestamp: Date.now()
                });
            });
        }, 100); // 10 times per second

        // Store interval for cleanup
        if (!this.audioStreams.has(cameraId)) {
            this.audioStreams.set(cameraId, { clients: new Set() });
        }
        this.audioStreams.get(cameraId).interval = audioInterval;
    }

    stopCameraAudioCapture(cameraId) {
        this.logger.info(`Stopping audio capture for camera: ${cameraId}`);
        
        const stream = this.audioStreams.get(cameraId);
        if (stream && stream.interval) {
            clearInterval(stream.interval);
        }
    }

    sendAudioToCamera(cameraId, audioData) {
        // Send audio data to camera (bidirectional audio)
        this.logger.debug(`Sending audio to camera: ${cameraId}`);
        
        // In real implementation, this would send audio to the camera's speaker
        // For now, we'll just log it
    }

    sendAudioToClient(socket, cameraId, audioData) {
        // Send audio data to specific client
        socket.emit('audio-data', {
            cameraId,
            audioData,
            timestamp: Date.now()
        });
    }

    generateSimulatedAudioData() {
        // Generate simulated audio data for testing
        // In real implementation, this would come from the camera
        const buffer = Buffer.alloc(1024);
        for (let i = 0; i < buffer.length; i++) {
            buffer[i] = Math.floor(Math.random() * 256);
        }
        return buffer.toString('base64');
    }

    cleanup(socket) {
        this.logger.info(`Cleaning up audio streams for client: ${socket.id}`);
        
        const clientStreams = this.audioClients.get(socket.id);
        if (clientStreams) {
            clientStreams.forEach(cameraId => {
                this.stopAudioStream(socket, cameraId);
            });
        }
    }

    getActiveAudioStreams() {
        return Array.from(this.audioStreams.entries()).map(([cameraId, stream]) => ({
            cameraId,
            clientCount: stream.clients.size,
            startedAt: stream.startedAt
        }));
    }

    getAudioStats() {
        return {
            activeStreams: this.audioStreams.size,
            totalClients: this.audioClients.size,
            streams: this.getActiveAudioStreams()
        };
    }
}

module.exports = AudioHandler;
