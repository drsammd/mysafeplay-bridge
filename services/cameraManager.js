
const onvif = require('node-onvif');
const { v4: uuidv4 } = require('uuid');

class CameraManager {
    constructor(logger) {
        this.logger = logger;
        this.cameras = new Map();
        this.discoveredDevices = [];
        this.isDiscovering = false;
    }

    async initialize() {
        this.logger.info('Initializing Camera Manager...');
        
        // Load saved cameras from config
        await this.loadSavedCameras();
        
        // Auto-discover cameras on startup
        setTimeout(() => {
            this.discoverCameras();
        }, 2000);
        
        this.logger.info('Camera Manager initialized');
    }

    async discoverCameras() {
        if (this.isDiscovering) {
            this.logger.warn('Discovery already in progress');
            return this.discoveredDevices;
        }

        this.isDiscovering = true;
        this.logger.info('Starting ONVIF camera discovery...');

        try {
            const devices = await onvif.startProbe();
            this.discoveredDevices = devices.map(device => ({
                id: uuidv4(),
                name: device.name || 'Unknown Camera',
                urn: device.urn,
                xaddrs: device.xaddrs,
                hardware: device.hardware || 'Unknown',
                location: device.location || 'Unknown',
                types: device.types || [],
                scopes: device.scopes || [],
                discovered: true,
                status: 'discovered'
            }));

            this.logger.info(`Discovered ${this.discoveredDevices.length} ONVIF cameras`);
            
            // Add Reolink camera manually if not discovered
            await this.addManualCamera();
            
            return this.discoveredDevices;
        } catch (error) {
            this.logger.error('Error during camera discovery:', error);
            
            // Fallback: add manual camera
            await this.addManualCamera();
            return this.discoveredDevices;
        } finally {
            this.isDiscovering = false;
        }
    }

    async addManualCamera() {
        // Add the user's Reolink camera manually
        const reolinkCamera = {
            id: 'reolink-e1-pro',
            name: 'Reolink E1 Pro',
            ip: '192.168.1.177',
            port: 554,
            username: 'admin',
            password: 'password123!',
            rtspUrl: 'rtsp://admin:password123!@192.168.1.177:554/h264Preview_01_main',
            manufacturer: 'Reolink',
            model: 'E1 Pro',
            status: 'manual',
            capabilities: {
                video: true,
                audio: true,
                ptz: true,
                nightVision: true
            }
        };

        this.cameras.set(reolinkCamera.id, reolinkCamera);
        this.discoveredDevices.push(reolinkCamera);
        
        this.logger.info('Added Reolink E1 Pro camera manually');
    }

    async addCamera(cameraConfig) {
        const id = cameraConfig.id || uuidv4();
        
        const camera = {
            id,
            name: cameraConfig.name || 'Unknown Camera',
            ip: cameraConfig.ip,
            port: cameraConfig.port || 554,
            username: cameraConfig.username,
            password: cameraConfig.password,
            rtspUrl: cameraConfig.rtspUrl || this.buildRtspUrl(cameraConfig),
            manufacturer: cameraConfig.manufacturer || 'Unknown',
            model: cameraConfig.model || 'Unknown',
            status: 'configured',
            capabilities: cameraConfig.capabilities || {
                video: true,
                audio: false,
                ptz: false
            },
            addedAt: new Date().toISOString()
        };

        this.cameras.set(id, camera);
        this.logger.info(`Added camera: ${camera.name} (${id})`);
        
        return camera;
    }

    buildRtspUrl(config) {
        const { username, password, ip, port = 554, path = '/h264Preview_01_main' } = config;
        return `rtsp://${username}:${password}@${ip}:${port}${path}`;
    }

    async removeCamera(id) {
        if (this.cameras.has(id)) {
            const camera = this.cameras.get(id);
            this.cameras.delete(id);
            this.logger.info(`Removed camera: ${camera.name} (${id})`);
            return true;
        }
        return false;
    }

    getCamera(id) {
        return this.cameras.get(id);
    }

    getAllCameras() {
        return Array.from(this.cameras.values());
    }

    getCameraCount() {
        return this.cameras.size;
    }

    async testCameraConnection(id) {
        const camera = this.cameras.get(id);
        if (!camera) {
            throw new Error('Camera not found');
        }

        try {
            // Create ONVIF device for testing
            const device = new onvif.OnvifDevice({
                xaddr: `http://${camera.ip}/onvif/device_service`,
                user: camera.username,
                pass: camera.password
            });

            await device.init();
            const info = await device.getDeviceInformation();
            
            this.logger.info(`Camera connection test successful: ${camera.name}`);
            return {
                success: true,
                info: {
                    manufacturer: info.Manufacturer,
                    model: info.Model,
                    firmwareVersion: info.FirmwareVersion,
                    serialNumber: info.SerialNumber
                }
            };
        } catch (error) {
            this.logger.error(`Camera connection test failed: ${camera.name}`, error);
            return {
                success: false,
                error: error.message
            };
        }
    }

    async getCameraStreamUrls(id) {
        const camera = this.cameras.get(id);
        if (!camera) {
            throw new Error('Camera not found');
        }

        try {
            const device = new onvif.OnvifDevice({
                xaddr: `http://${camera.ip}/onvif/device_service`,
                user: camera.username,
                pass: camera.password
            });

            await device.init();
            const profiles = await device.getProfiles();
            const streamUrls = [];

            for (const profile of profiles) {
                const streamUri = await device.getStreamUri({
                    protocol: 'RTSP',
                    profileToken: profile.token
                });
                
                streamUrls.push({
                    profile: profile.name,
                    token: profile.token,
                    uri: streamUri.uri,
                    resolution: profile.videoEncoderConfiguration?.resolution
                });
            }

            return streamUrls;
        } catch (error) {
            this.logger.error(`Error getting stream URLs for camera: ${camera.name}`, error);
            // Fallback to manual RTSP URL
            return [{
                profile: 'main',
                uri: camera.rtspUrl,
                resolution: { width: 1920, height: 1080 }
            }];
        }
    }

    async loadSavedCameras() {
        // TODO: Load cameras from persistent storage (JSON file or database)
        this.logger.info('Loading saved cameras...');
    }

    async saveCameras() {
        // TODO: Save cameras to persistent storage
        this.logger.info('Saving cameras...');
    }

    updateCameraStatus(id, status) {
        const camera = this.cameras.get(id);
        if (camera) {
            camera.status = status;
            camera.lastUpdated = new Date().toISOString();
        }
    }
}

module.exports = CameraManager;
