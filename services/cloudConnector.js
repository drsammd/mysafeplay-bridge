
const WebSocket = require('ws');
const jwt = require('jsonwebtoken');

class CloudConnector {
    constructor(logger) {
        this.logger = logger;
        this.ws = null;
        this.isConnected = false;
        this.reconnectAttempts = 0;
        this.maxReconnectAttempts = 5;
        this.reconnectDelay = 5000;
        this.heartbeatInterval = null;
        this.cloudUrl = process.env.CLOUD_WS_URL || 'wss://mysafeplay.vercel.app/ws';
        this.apiKey = process.env.CLOUD_API_KEY;
    }

    async connect() {
        if (this.isConnected) {
            this.logger.warn('Already connected to cloud service');
            return;
        }

        try {
            this.logger.info(`Connecting to cloud service: ${this.cloudUrl}`);
            
            // Create WebSocket connection
            this.ws = new WebSocket(this.cloudUrl, {
                headers: {
                    'Authorization': `Bearer ${this.apiKey}`,
                    'X-Service-Type': 'local-camera-service',
                    'X-Service-Version': '1.0.0'
                }
            });

            this.setupEventHandlers();
            
            // Wait for connection
            await new Promise((resolve, reject) => {
                const timeout = setTimeout(() => {
                    reject(new Error('Connection timeout'));
                }, 10000);

                this.ws.once('open', () => {
                    clearTimeout(timeout);
                    resolve();
                });

                this.ws.once('error', (error) => {
                    clearTimeout(timeout);
                    reject(error);
                });
            });

        } catch (error) {
            this.logger.error('Failed to connect to cloud service:', error);
            this.scheduleReconnect();
        }
    }

    setupEventHandlers() {
        this.ws.on('open', () => {
            this.logger.info('Connected to cloud service');
            this.isConnected = true;
            this.reconnectAttempts = 0;
            this.startHeartbeat();
            this.sendRegistration();
        });

        this.ws.on('message', (data) => {
            try {
                const message = JSON.parse(data.toString());
                this.handleCloudMessage(message);
            } catch (error) {
                this.logger.error('Error parsing cloud message:', error);
            }
        });

        this.ws.on('close', (code, reason) => {
            this.logger.warn(`Cloud connection closed: ${code} - ${reason}`);
            this.isConnected = false;
            this.stopHeartbeat();
            this.scheduleReconnect();
        });

        this.ws.on('error', (error) => {
            this.logger.error('Cloud connection error:', error);
            this.isConnected = false;
        });

        this.ws.on('pong', () => {
            this.logger.debug('Received pong from cloud');
        });
    }

    handleCloudMessage(message) {
        this.logger.debug('Received cloud message:', message.type);

        switch (message.type) {
            case 'ping':
                this.send({ type: 'pong', timestamp: Date.now() });
                break;

            case 'camera-request':
                this.handleCameraRequest(message);
                break;

            case 'stream-request':
                this.handleStreamRequest(message);
                break;

            case 'frame-request':
                this.handleFrameRequest(message);
                break;

            case 'audio-request':
                this.handleAudioRequest(message);
                break;

            case 'config-update':
                this.handleConfigUpdate(message);
                break;

            default:
                this.logger.warn('Unknown message type from cloud:', message.type);
        }
    }

    async handleCameraRequest(message) {
        try {
            // This would integrate with CameraManager
            const cameras = []; // Get from camera manager
            this.send({
                type: 'camera-response',
                requestId: message.requestId,
                cameras
            });
        } catch (error) {
            this.logger.error('Error handling camera request:', error);
            this.send({
                type: 'error',
                requestId: message.requestId,
                error: error.message
            });
        }
    }

    async handleStreamRequest(message) {
        try {
            const { cameraId, action } = message.data;
            
            if (action === 'start') {
                // Start stream and get URL
                const streamUrl = `ws://localhost:3001/stream/${cameraId}`;
                this.send({
                    type: 'stream-response',
                    requestId: message.requestId,
                    streamUrl
                });
            } else if (action === 'stop') {
                // Stop stream
                this.send({
                    type: 'stream-response',
                    requestId: message.requestId,
                    success: true
                });
            }
        } catch (error) {
            this.logger.error('Error handling stream request:', error);
            this.send({
                type: 'error',
                requestId: message.requestId,
                error: error.message
            });
        }
    }

    async handleFrameRequest(message) {
        try {
            const { cameraId } = message.data;
            
            // Capture frame from camera and send to cloud for AWS Rekognition
            // This would integrate with StreamServer to get current frame
            const frameData = null; // Get current frame
            
            if (frameData) {
                this.send({
                    type: 'frame-data',
                    requestId: message.requestId,
                    cameraId,
                    frame: frameData,
                    timestamp: Date.now()
                });
            }
        } catch (error) {
            this.logger.error('Error handling frame request:', error);
        }
    }

    handleAudioRequest(message) {
        // Handle bidirectional audio requests
        this.logger.info('Handling audio request:', message.data);
    }

    handleConfigUpdate(message) {
        this.logger.info('Received config update from cloud:', message.data);
        // Update local configuration
    }

    send(message) {
        if (this.isConnected && this.ws.readyState === WebSocket.OPEN) {
            this.ws.send(JSON.stringify(message));
        } else {
            this.logger.warn('Cannot send message - not connected to cloud');
        }
    }

    sendRegistration() {
        this.send({
            type: 'register',
            serviceType: 'local-camera-service',
            version: '1.0.0',
            capabilities: {
                cameras: true,
                streaming: true,
                audio: true,
                rekognition: true
            },
            timestamp: Date.now()
        });
    }

    sendCameraUpdate(cameras) {
        this.send({
            type: 'camera-update',
            cameras,
            timestamp: Date.now()
        });
    }

    sendFrameForAnalysis(cameraId, frameData) {
        this.send({
            type: 'frame-analysis',
            cameraId,
            frame: frameData,
            timestamp: Date.now()
        });
    }

    startHeartbeat() {
        this.heartbeatInterval = setInterval(() => {
            if (this.isConnected) {
                this.ws.ping();
            }
        }, 30000); // 30 seconds
    }

    stopHeartbeat() {
        if (this.heartbeatInterval) {
            clearInterval(this.heartbeatInterval);
            this.heartbeatInterval = null;
        }
    }

    scheduleReconnect() {
        if (this.reconnectAttempts >= this.maxReconnectAttempts) {
            this.logger.error('Max reconnection attempts reached');
            return;
        }

        this.reconnectAttempts++;
        const delay = this.reconnectDelay * Math.pow(2, this.reconnectAttempts - 1);
        
        this.logger.info(`Scheduling reconnection attempt ${this.reconnectAttempts} in ${delay}ms`);
        
        setTimeout(() => {
            this.connect();
        }, delay);
    }

    async disconnect() {
        this.logger.info('Disconnecting from cloud service');
        
        this.stopHeartbeat();
        
        if (this.ws) {
            this.ws.close(1000, 'Service shutdown');
            this.ws = null;
        }
        
        this.isConnected = false;
    }

    getIsConnected() {
        return this.isConnected;
    }

    getConnectionStatus() {
        return {
            connected: this.isConnected,
            reconnectAttempts: this.reconnectAttempts,
            cloudUrl: this.cloudUrl
        };
    }
}

module.exports = CloudConnector;
