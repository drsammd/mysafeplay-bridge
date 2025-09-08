
const express = require('express');
const http = require('http');
const socketIo = require('socket.io');
const cors = require('cors');
const helmet = require('helmet');
const rateLimit = require('express-rate-limit');
const path = require('path');
require('dotenv').config();

// Import services
const CameraManager = require('./services/cameraManager');
const StreamServer = require('./services/streamServer');
const CloudConnector = require('./services/cloudConnector');
const AudioHandler = require('./services/audioHandler');
const ConfigManager = require('./services/configManager');
const Logger = require('./utils/logger');

class LocalCameraService {
    constructor() {
        this.app = express();
        this.server = http.createServer(this.app);
        this.io = socketIo(this.server, {
            cors: {
                origin: "*",
                methods: ["GET", "POST"]
            }
        });
        
        this.port = process.env.PORT || 3000;
        this.logger = new Logger();
        
        // Initialize services
        this.cameraManager = new CameraManager(this.logger);
        this.streamServer = new StreamServer(this.io, this.logger);
        this.cloudConnector = new CloudConnector(this.logger);
        this.audioHandler = new AudioHandler(this.io, this.logger);
        this.configManager = new ConfigManager();
        
        this.setupMiddleware();
        this.setupRoutes();
        this.setupSocketHandlers();
        this.initializeServices();
    }

    setupMiddleware() {
        // Security middleware
        this.app.use(helmet({
            contentSecurityPolicy: false // Allow inline scripts for demo
        }));
        
        // CORS
        this.app.use(cors());
        
        // Rate limiting
        const limiter = rateLimit({
            windowMs: 15 * 60 * 1000, // 15 minutes
            max: 100 // limit each IP to 100 requests per windowMs
        });
        this.app.use(limiter);
        
        // Body parsing
        this.app.use(express.json());
        this.app.use(express.urlencoded({ extended: true }));
        
        // Static files
        this.app.use(express.static(path.join(__dirname, 'public')));
        
        this.logger.info('Middleware configured');
    }

    setupRoutes() {
        // API Routes
        this.app.get('/api/status', (req, res) => {
            res.json({
                status: 'running',
                version: '1.0.0',
                cameras: this.cameraManager.getCameraCount(),
                streams: this.streamServer.getActiveStreams(),
                cloudConnected: this.cloudConnector.getIsConnected(),
                uptime: process.uptime()
            });
        });

        this.app.get('/api/cameras', async (req, res) => {
            try {
                const cameras = await this.cameraManager.getAllCameras();
                res.json(cameras);
            } catch (error) {
                this.logger.error('Error getting cameras:', error);
                res.status(500).json({ error: 'Failed to get cameras' });
            }
        });

        this.app.post('/api/cameras/discover', async (req, res) => {
            try {
                const discovered = await this.cameraManager.discoverCameras();
                res.json({ discovered, count: discovered.length });
            } catch (error) {
                this.logger.error('Error discovering cameras:', error);
                res.status(500).json({ error: 'Failed to discover cameras' });
            }
        });

        this.app.post('/api/cameras/:id/stream/start', async (req, res) => {
            try {
                const { id } = req.params;
                const streamUrl = await this.streamServer.startStream(id);
                res.json({ streamUrl });
            } catch (error) {
                this.logger.error('Error starting stream:', error);
                res.status(500).json({ error: 'Failed to start stream' });
            }
        });

        this.app.post('/api/cameras/:id/stream/stop', async (req, res) => {
            try {
                const { id } = req.params;
                await this.streamServer.stopStream(id);
                res.json({ success: true });
            } catch (error) {
                this.logger.error('Error stopping stream:', error);
                res.status(500).json({ error: 'Failed to stop stream' });
            }
        });

        this.app.get('/api/config', (req, res) => {
            res.json(this.configManager.getConfig());
        });

        this.app.post('/api/config', (req, res) => {
            try {
                this.configManager.updateConfig(req.body);
                res.json({ success: true });
            } catch (error) {
                this.logger.error('Error updating config:', error);
                res.status(500).json({ error: 'Failed to update config' });
            }
        });

        // Main dashboard route
        this.app.get('/', (req, res) => {
            res.sendFile(path.join(__dirname, 'public', 'index.html'));
        });

        this.logger.info('Routes configured');
    }

    setupSocketHandlers() {
        this.io.on('connection', (socket) => {
            this.logger.info(`Client connected: ${socket.id}`);

            // Camera events
            socket.on('discover-cameras', async () => {
                try {
                    const cameras = await this.cameraManager.discoverCameras();
                    socket.emit('cameras-discovered', cameras);
                } catch (error) {
                    socket.emit('error', { message: 'Failed to discover cameras' });
                }
            });

            socket.on('start-stream', async (cameraId) => {
                try {
                    const streamUrl = await this.streamServer.startStream(cameraId);
                    socket.emit('stream-started', { cameraId, streamUrl });
                } catch (error) {
                    socket.emit('error', { message: 'Failed to start stream' });
                }
            });

            socket.on('stop-stream', async (cameraId) => {
                try {
                    await this.streamServer.stopStream(cameraId);
                    socket.emit('stream-stopped', { cameraId });
                } catch (error) {
                    socket.emit('error', { message: 'Failed to stop stream' });
                }
            });

            // Audio events
            socket.on('audio-data', (data) => {
                this.audioHandler.handleAudioData(socket, data);
            });

            socket.on('start-audio', (cameraId) => {
                this.audioHandler.startAudioStream(socket, cameraId);
            });

            socket.on('stop-audio', (cameraId) => {
                this.audioHandler.stopAudioStream(socket, cameraId);
            });

            socket.on('disconnect', () => {
                this.logger.info(`Client disconnected: ${socket.id}`);
                this.audioHandler.cleanup(socket);
            });
        });

        this.logger.info('Socket handlers configured');
    }

    async initializeServices() {
        try {
            // Initialize camera manager
            await this.cameraManager.initialize();
            
            // Initialize stream server
            await this.streamServer.initialize();
            
            // Initialize audio handler
            await this.audioHandler.initialize();
            
            // Connect to cloud service
            await this.cloudConnector.connect();
            
            this.logger.info('All services initialized successfully');
        } catch (error) {
            this.logger.error('Error initializing services:', error);
        }
    }

    async findAvailablePort(startPort) {
        const net = require('net');
        
        return new Promise((resolve) => {
            const server = net.createServer();
            
            server.listen(startPort, () => {
                const port = server.address().port;
                server.close(() => resolve(port));
            });
            
            server.on('error', () => {
                // Port is in use, try next one
                resolve(this.findAvailablePort(startPort + 1));
            });
        });
    }

    async start() {
        try {
            // Check if port is available, find alternative if needed
            const availablePort = await this.findAvailablePort(this.port);
            if (availablePort !== this.port) {
                this.logger.warn(`Port ${this.port} is in use, using port ${availablePort} instead`);
                this.port = availablePort;
            }

            this.server.listen(this.port, () => {
                this.logger.info(`Local Camera Service running on port ${this.port}`);
                this.logger.info(`Dashboard available at http://localhost:${this.port}`);
                this.logger.info(`WebSocket server ready for connections`);
                
                // On Windows, show additional startup info
                if (process.platform === 'win32') {
                    console.log(`\n=== MySafePlay Bridge Started Successfully ===`);
                    console.log(`Web Interface: http://localhost:${this.port}`);
                    console.log(`Service is running in the background...`);
                    console.log(`To stop the service, close this window or press Ctrl+C`);
                    console.log(`===============================================\n`);
                }
            });

            this.server.on('error', (error) => {
                this.logger.error('Server error:', error);
                if (error.code === 'EADDRINUSE') {
                    this.logger.error(`Port ${this.port} is already in use`);
                    this.logger.info('Trying to find an alternative port...');
                    setTimeout(() => this.start(), 1000);
                } else {
                    throw error;
                }
            });

            // Graceful shutdown
            process.on('SIGTERM', () => this.shutdown());
            process.on('SIGINT', () => this.shutdown());
            
            // Windows-specific cleanup
            if (process.platform === 'win32') {
                process.on('SIGHUP', () => this.shutdown());
            }
            
        } catch (error) {
            this.logger.error('Failed to start server:', error);
            throw error;
        }
    }

    async shutdown() {
        this.logger.info('Shutting down Local Camera Service...');
        
        try {
            await this.streamServer.stopAllStreams();
            await this.cloudConnector.disconnect();
            this.server.close();
            this.logger.info('Service shutdown complete');
            process.exit(0);
        } catch (error) {
            this.logger.error('Error during shutdown:', error);
            process.exit(1);
        }
    }
}

// Start the service
if (require.main === module) {
    (async () => {
        console.log('MySafePlay Bridge starting...');
        console.log('Node.js version:', process.version);
        console.log('Platform:', process.platform);
        console.log('Architecture:', process.arch);
        console.log('Working directory:', process.cwd());
        console.log('Script path:', __filename);
        
        try {
            const service = new LocalCameraService();
            await service.start();
        } catch (error) {
            console.error('FATAL ERROR during startup:', error);
            console.error('Stack trace:', error.stack);
            
            // Keep console open on Windows for debugging
            if (process.platform === 'win32') {
                console.log('\nPress any key to exit...');
                process.stdin.setRawMode(true);
                process.stdin.resume();
                process.stdin.on('data', () => process.exit(1));
            } else {
                process.exit(1);
            }
        }
    })();
}

module.exports = LocalCameraService;
