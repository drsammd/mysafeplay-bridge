
const fs = require('fs');
const path = require('path');

class ConfigManager {
    constructor() {
        this.configPath = path.join(__dirname, '..', 'config', 'settings.json');
        this.defaultConfig = {
            service: {
                port: 3001,
                logLevel: 'info',
                maxCameras: 10
            },
            streaming: {
                quality: 'medium',
                framerate: 10,
                resolution: '640x480',
                format: 'mjpeg'
            },
            audio: {
                enabled: true,
                bidirectional: true,
                sampleRate: 44100,
                bitrate: 128
            },
            cloud: {
                enabled: true,
                url: process.env.CLOUD_WS_URL || 'wss://mysafeplay.vercel.app/ws',
                apiKey: process.env.CLOUD_API_KEY,
                reconnectAttempts: 5,
                heartbeatInterval: 30000
            },
            security: {
                requireAuth: false,
                allowedOrigins: ['*'],
                rateLimitWindow: 900000, // 15 minutes
                rateLimitMax: 100
            },
            cameras: {
                discoveryTimeout: 5000,
                connectionTimeout: 10000,
                retryAttempts: 3
            }
        };
        
        this.config = this.loadConfig();
    }

    loadConfig() {
        try {
            // Ensure config directory exists
            const configDir = path.dirname(this.configPath);
            if (!fs.existsSync(configDir)) {
                fs.mkdirSync(configDir, { recursive: true });
            }

            // Load existing config or create default
            if (fs.existsSync(this.configPath)) {
                const configData = fs.readFileSync(this.configPath, 'utf8');
                const loadedConfig = JSON.parse(configData);
                
                // Merge with defaults to ensure all properties exist
                return this.mergeConfig(this.defaultConfig, loadedConfig);
            } else {
                // Create default config file
                this.saveConfig(this.defaultConfig);
                return { ...this.defaultConfig };
            }
        } catch (error) {
            console.error('Error loading config, using defaults:', error);
            return { ...this.defaultConfig };
        }
    }

    saveConfig(config = this.config) {
        try {
            const configDir = path.dirname(this.configPath);
            if (!fs.existsSync(configDir)) {
                fs.mkdirSync(configDir, { recursive: true });
            }

            fs.writeFileSync(this.configPath, JSON.stringify(config, null, 2));
            return true;
        } catch (error) {
            console.error('Error saving config:', error);
            return false;
        }
    }

    getConfig() {
        return { ...this.config };
    }

    updateConfig(updates) {
        this.config = this.mergeConfig(this.config, updates);
        return this.saveConfig();
    }

    mergeConfig(target, source) {
        const result = { ...target };
        
        for (const key in source) {
            if (source[key] && typeof source[key] === 'object' && !Array.isArray(source[key])) {
                result[key] = this.mergeConfig(target[key] || {}, source[key]);
            } else {
                result[key] = source[key];
            }
        }
        
        return result;
    }

    get(path) {
        return this.getNestedValue(this.config, path);
    }

    set(path, value) {
        this.setNestedValue(this.config, path, value);
        return this.saveConfig();
    }

    getNestedValue(obj, path) {
        return path.split('.').reduce((current, key) => {
            return current && current[key] !== undefined ? current[key] : undefined;
        }, obj);
    }

    setNestedValue(obj, path, value) {
        const keys = path.split('.');
        const lastKey = keys.pop();
        const target = keys.reduce((current, key) => {
            if (!current[key] || typeof current[key] !== 'object') {
                current[key] = {};
            }
            return current[key];
        }, obj);
        
        target[lastKey] = value;
    }

    resetToDefaults() {
        this.config = { ...this.defaultConfig };
        return this.saveConfig();
    }

    validateConfig(config) {
        const errors = [];
        
        // Validate port
        if (config.service?.port && (config.service.port < 1 || config.service.port > 65535)) {
            errors.push('Invalid port number');
        }
        
        // Validate streaming settings
        if (config.streaming?.framerate && (config.streaming.framerate < 1 || config.streaming.framerate > 60)) {
            errors.push('Invalid framerate');
        }
        
        // Validate audio settings
        if (config.audio?.sampleRate && ![8000, 16000, 22050, 44100, 48000].includes(config.audio.sampleRate)) {
            errors.push('Invalid audio sample rate');
        }
        
        return errors;
    }

    exportConfig() {
        return JSON.stringify(this.config, null, 2);
    }

    importConfig(configString) {
        try {
            const importedConfig = JSON.parse(configString);
            const errors = this.validateConfig(importedConfig);
            
            if (errors.length > 0) {
                throw new Error(`Config validation failed: ${errors.join(', ')}`);
            }
            
            this.config = this.mergeConfig(this.defaultConfig, importedConfig);
            return this.saveConfig();
        } catch (error) {
            throw new Error(`Failed to import config: ${error.message}`);
        }
    }
}

module.exports = ConfigManager;
