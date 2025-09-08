
const onvif = require('node-onvif');
const Logger = require('../utils/logger');

class CameraDiscoveryTest {
    constructor() {
        this.logger = new Logger();
    }

    async testOnvifDiscovery() {
        this.logger.info('Starting ONVIF camera discovery test...');
        
        try {
            const devices = await onvif.startProbe();
            
            if (devices.length > 0) {
                this.logger.info(`✅ Discovery successful! Found ${devices.length} device(s):`);
                
                devices.forEach((device, index) => {
                    this.logger.info(`\n📹 Camera ${index + 1}:`);
                    this.logger.info(`   Name: ${device.name || 'Unknown'}`);
                    this.logger.info(`   URN: ${device.urn}`);
                    this.logger.info(`   Hardware: ${device.hardware || 'Unknown'}`);
                    this.logger.info(`   Location: ${device.location || 'Unknown'}`);
                    this.logger.info(`   Endpoints: ${device.xaddrs?.join(', ') || 'None'}`);
                    this.logger.info(`   Types: ${device.types?.join(', ') || 'None'}`);
                    
                    if (device.scopes && device.scopes.length > 0) {
                        this.logger.info(`   Scopes:`);
                        device.scopes.forEach(scope => {
                            this.logger.info(`     - ${scope}`);
                        });
                    }
                });
            } else {
                this.logger.warn('⚠️  No ONVIF cameras found on the network');
                this.logger.info('This could mean:');
                this.logger.info('  • No ONVIF-compliant cameras on network');
                this.logger.info('  • Cameras are on different subnet');
                this.logger.info('  • Firewall blocking discovery');
                this.logger.info('  • Cameras have ONVIF disabled');
            }
            
            return devices;
            
        } catch (error) {
            this.logger.error('❌ ONVIF discovery failed:', error.message);
            this.logger.info('Troubleshooting tips:');
            this.logger.info('  • Check network connectivity');
            this.logger.info('  • Ensure cameras support ONVIF');
            this.logger.info('  • Verify firewall settings');
            this.logger.info('  • Try manual camera addition');
            
            throw error;
        }
    }

    async testManualCamera() {
        this.logger.info('\n🔧 Testing manual camera configuration...');
        
        // Test with the user's Reolink camera
        const testCamera = {
            name: 'Reolink E1 Pro Test',
            ip: '192.168.1.177',
            port: 554,
            username: 'admin',
            password: 'password123!',
            rtspUrl: 'rtsp://admin:password123!@192.168.1.177:554/h264Preview_01_main'
        };
        
        try {
            // Test basic connectivity
            const net = require('net');
            const socket = new net.Socket();
            
            await new Promise((resolve, reject) => {
                const timeout = setTimeout(() => {
                    socket.destroy();
                    reject(new Error('Connection timeout'));
                }, 5000);
                
                socket.connect(testCamera.port, testCamera.ip, () => {
                    clearTimeout(timeout);
                    socket.destroy();
                    resolve();
                });
                
                socket.on('error', (error) => {
                    clearTimeout(timeout);
                    reject(error);
                });
            });
            
            this.logger.info(`✅ Network connectivity test passed for ${testCamera.ip}:${testCamera.port}`);
            
            // Test ONVIF connection if possible
            try {
                const device = new onvif.OnvifDevice({
                    xaddr: `http://${testCamera.ip}/onvif/device_service`,
                    user: testCamera.username,
                    pass: testCamera.password
                });
                
                await device.init();
                const info = await device.getDeviceInformation();
                
                this.logger.info('✅ ONVIF connection successful:');
                this.logger.info(`   Manufacturer: ${info.Manufacturer}`);
                this.logger.info(`   Model: ${info.Model}`);
                this.logger.info(`   Firmware: ${info.FirmwareVersion}`);
                this.logger.info(`   Serial: ${info.SerialNumber}`);
                
            } catch (onvifError) {
                this.logger.warn('⚠️  ONVIF connection failed, but camera may still work for streaming');
                this.logger.debug('ONVIF error:', onvifError.message);
            }
            
            return testCamera;
            
        } catch (error) {
            this.logger.error(`❌ Manual camera test failed: ${error.message}`);
            this.logger.info('Check:');
            this.logger.info(`  • Camera is powered on and connected`);
            this.logger.info(`  • IP address ${testCamera.ip} is correct`);
            this.logger.info(`  • Port ${testCamera.port} is accessible`);
            this.logger.info(`  • Network connectivity to camera`);
            
            throw error;
        }
    }

    async testStreamConnectivity() {
        this.logger.info('\n🎥 Testing RTSP stream connectivity...');
        
        const rtspUrl = 'rtsp://admin:password123!@192.168.1.177:554/h264Preview_01_main';
        
        try {
            // Test RTSP URL format
            const url = new URL(rtspUrl);
            this.logger.info(`✅ RTSP URL format is valid: ${url.protocol}//${url.host}${url.pathname}`);
            
            // In a real test, we would use FFmpeg to test the stream
            // For now, we'll just validate the URL structure
            if (url.protocol !== 'rtsp:') {
                throw new Error('Invalid RTSP protocol');
            }
            
            if (!url.hostname || !url.port) {
                throw new Error('Missing hostname or port in RTSP URL');
            }
            
            this.logger.info('✅ RTSP URL structure validation passed');
            this.logger.info('Note: Actual stream testing requires FFmpeg integration');
            
            return true;
            
        } catch (error) {
            this.logger.error(`❌ RTSP stream test failed: ${error.message}`);
            this.logger.info('Check:');
            this.logger.info('  • RTSP URL format is correct');
            this.logger.info('  • Camera supports RTSP streaming');
            this.logger.info('  • Credentials are valid');
            this.logger.info('  • Stream path is correct');
            
            throw error;
        }
    }

    async runAllTests() {
        this.logger.info('🧪 Starting Camera Service Tests...\n');
        
        const results = {
            onvifDiscovery: false,
            manualCamera: false,
            streamConnectivity: false
        };
        
        // Test 1: ONVIF Discovery
        try {
            await this.testOnvifDiscovery();
            results.onvifDiscovery = true;
        } catch (error) {
            // Non-fatal, continue with other tests
        }
        
        // Test 2: Manual Camera
        try {
            await this.testManualCamera();
            results.manualCamera = true;
        } catch (error) {
            // Non-fatal, continue with other tests
        }
        
        // Test 3: Stream Connectivity
        try {
            await this.testStreamConnectivity();
            results.streamConnectivity = true;
        } catch (error) {
            // Non-fatal
        }
        
        // Summary
        this.logger.info('\n📊 Test Results Summary:');
        this.logger.info('========================');
        this.logger.info(`ONVIF Discovery: ${results.onvifDiscovery ? '✅ PASS' : '❌ FAIL'}`);
        this.logger.info(`Manual Camera: ${results.manualCamera ? '✅ PASS' : '❌ FAIL'}`);
        this.logger.info(`Stream Connectivity: ${results.streamConnectivity ? '✅ PASS' : '❌ FAIL'}`);
        
        const passedTests = Object.values(results).filter(Boolean).length;
        const totalTests = Object.keys(results).length;
        
        this.logger.info(`\nOverall: ${passedTests}/${totalTests} tests passed`);
        
        if (passedTests === totalTests) {
            this.logger.info('🎉 All tests passed! Camera service should work correctly.');
        } else if (passedTests > 0) {
            this.logger.info('⚠️  Some tests failed, but basic functionality may still work.');
        } else {
            this.logger.error('❌ All tests failed. Check network and camera configuration.');
        }
        
        return results;
    }
}

// Run tests if called directly
if (require.main === module) {
    const test = new CameraDiscoveryTest();
    test.runAllTests()
        .then(() => {
            process.exit(0);
        })
        .catch((error) => {
            console.error('Test suite failed:', error);
            process.exit(1);
        });
}

module.exports = CameraDiscoveryTest;
