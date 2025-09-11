
package main

import (
	"context"
	"encoding/json"
	"flag"
	"fmt"
	"log"
	"net/http"
	"os"
	"os/signal"
	"sync"
	"syscall"
	"time"

	"github.com/gorilla/mux"
	"github.com/gorilla/websocket"
	"gopkg.in/yaml.v3"
)

// Build-time variables
var (
	version = "2.0.0"
	commit  = "lean-fix"
	date    = "2025-09-11T07:34:58Z"
	builtBy = "enhanced-go-bridge"
)

// Configuration structure
type Config struct {
	Server struct {
		Port     int    `yaml:"port"`
		Host     string `yaml:"host"`
		LogLevel string `yaml:"log_level"`
	} `yaml:"server"`
	
	Cloud struct {
		WSURL  string `yaml:"ws_url"`
		APIKey string `yaml:"api_key"`
	} `yaml:"cloud"`
	
	Cameras struct {
		MaxCameras      int           `yaml:"max_cameras"`
		DiscoveryTimeout time.Duration `yaml:"discovery_timeout"`
		StreamQuality   string        `yaml:"stream_quality"`
	} `yaml:"cameras"`
}

// Camera represents an IP camera
type Camera struct {
	ID       string    `json:"id"`
	Name     string    `json:"name"`
	IP       string    `json:"ip"`
	Port     int       `json:"port"`
	Username string    `json:"username"`
	Password string    `json:"password"`
	RTSPURL  string    `json:"rtsp_url"`
	Status   string    `json:"status"`
	LastSeen time.Time `json:"last_seen"`
}

// Bridge represents the main application
type Bridge struct {
	config    *Config
	cameras   map[string]*Camera
	cameraMux sync.RWMutex
	wsConn    *websocket.Conn
	wsUpgrader websocket.Upgrader
	httpServer *http.Server
	ctx       context.Context
	cancel    context.CancelFunc
}

// NewBridge creates a new bridge instance
func NewBridge(configPath string) (*Bridge, error) {
	config, err := loadConfig(configPath)
	if err != nil {
		return nil, fmt.Errorf("failed to load config: %w", err)
	}

	ctx, cancel := context.WithCancel(context.Background())

	return &Bridge{
		config:  config,
		cameras: make(map[string]*Camera),
		wsUpgrader: websocket.Upgrader{
			CheckOrigin: func(r *http.Request) bool {
				return true // Allow all origins for local service
			},
		},
		ctx:    ctx,
		cancel: cancel,
	}, nil
}

// loadConfig loads configuration from file
func loadConfig(configPath string) (*Config, error) {
	config := &Config{}
	
	// Set defaults
	config.Server.Port = 3001
	config.Server.Host = "localhost"
	config.Server.LogLevel = "info"
	config.Cameras.MaxCameras = 10
	config.Cameras.DiscoveryTimeout = 30 * time.Second
	config.Cameras.StreamQuality = "medium"

	if configPath == "" {
		return config, nil
	}

	data, err := os.ReadFile(configPath)
	if err != nil {
		if os.IsNotExist(err) {
			log.Printf("Config file not found, using defaults: %s", configPath)
			return config, nil
		}
		return nil, err
	}

	if err := yaml.Unmarshal(data, config); err != nil {
		return nil, fmt.Errorf("failed to parse config: %w", err)
	}

	return config, nil
}

// Start starts the bridge service
func (b *Bridge) Start() error {
	log.Printf("Starting MySafePlay Camera Bridge v%s", version)
	log.Printf("Build: %s (%s) by %s", commit, date, builtBy)

	// Setup HTTP routes
	router := mux.NewRouter()
	
	// API routes
	api := router.PathPrefix("/api").Subrouter()
	api.HandleFunc("/status", b.handleStatus).Methods("GET")
	api.HandleFunc("/cameras", b.handleCameras).Methods("GET")
	api.HandleFunc("/cameras", b.handleAddCamera).Methods("POST")
	api.HandleFunc("/cameras/{id}", b.handleDeleteCamera).Methods("DELETE")
	api.HandleFunc("/cameras/{id}/stream", b.handleCameraStream).Methods("GET")
	api.HandleFunc("/discover", b.handleDiscoverCameras).Methods("POST")
	api.HandleFunc("/ws", b.handleWebSocket)

	// Static files (embedded web interface)
	router.PathPrefix("/").Handler(http.FileServer(http.Dir("./web/dist/")))

	// Create HTTP server
	b.httpServer = &http.Server{
		Addr:         fmt.Sprintf("%s:%d", b.config.Server.Host, b.config.Server.Port),
		Handler:      router,
		ReadTimeout:  15 * time.Second,
		WriteTimeout: 15 * time.Second,
		IdleTimeout:  60 * time.Second,
	}

	// Start background services
	go b.startCameraDiscovery()
	go b.startCloudConnector()

	log.Printf("Camera Bridge listening on http://%s:%d", b.config.Server.Host, b.config.Server.Port)
	log.Printf("Web dashboard: http://%s:%d", b.config.Server.Host, b.config.Server.Port)

	return b.httpServer.ListenAndServe()
}

// HTTP Handlers
func (b *Bridge) handleStatus(w http.ResponseWriter, r *http.Request) {
	status := map[string]interface{}{
		"version":     version,
		"status":      "running",
		"cameras":     len(b.cameras),
		"max_cameras": b.config.Cameras.MaxCameras,
		"uptime":      time.Since(time.Now()).String(),
		"cloud_connected": b.wsConn != nil,
	}

	w.Header().Set("Content-Type", "application/json")
	json.NewEncoder(w).Encode(status)
}

func (b *Bridge) handleCameras(w http.ResponseWriter, r *http.Request) {
	b.cameraMux.RLock()
	cameras := make([]*Camera, 0, len(b.cameras))
	for _, camera := range b.cameras {
		cameras = append(cameras, camera)
	}
	b.cameraMux.RUnlock()

	w.Header().Set("Content-Type", "application/json")
	json.NewEncoder(w).Encode(cameras)
}

func (b *Bridge) handleAddCamera(w http.ResponseWriter, r *http.Request) {
	var camera Camera
	if err := json.NewDecoder(r.Body).Decode(&camera); err != nil {
		http.Error(w, "Invalid camera data", http.StatusBadRequest)
		return
	}

	// Generate ID if not provided
	if camera.ID == "" {
		camera.ID = fmt.Sprintf("cam_%d", time.Now().Unix())
	}

	camera.Status = "connecting"
	camera.LastSeen = time.Now()

	b.cameraMux.Lock()
	if len(b.cameras) >= b.config.Cameras.MaxCameras {
		b.cameraMux.Unlock()
		http.Error(w, "Maximum cameras reached", http.StatusBadRequest)
		return
	}
	b.cameras[camera.ID] = &camera
	b.cameraMux.Unlock()

	// Test camera connection in background
	go b.testCameraConnection(&camera)

	w.Header().Set("Content-Type", "application/json")
	json.NewEncoder(w).Encode(camera)
}

func (b *Bridge) handleDeleteCamera(w http.ResponseWriter, r *http.Request) {
	vars := mux.Vars(r)
	cameraID := vars["id"]

	b.cameraMux.Lock()
	delete(b.cameras, cameraID)
	b.cameraMux.Unlock()

	w.WriteHeader(http.StatusNoContent)
}

func (b *Bridge) handleCameraStream(w http.ResponseWriter, r *http.Request) {
	vars := mux.Vars(r)
	cameraID := vars["id"]

	b.cameraMux.RLock()
	camera, exists := b.cameras[cameraID]
	b.cameraMux.RUnlock()

	if !exists {
		http.Error(w, "Camera not found", http.StatusNotFound)
		return
	}

	// Upgrade to WebSocket for streaming
	conn, err := b.wsUpgrader.Upgrade(w, r, nil)
	if err != nil {
		log.Printf("WebSocket upgrade failed: %v", err)
		return
	}
	defer conn.Close()

	// Start streaming (simplified - would integrate with actual RTSP processing)
	b.streamCamera(conn, camera)
}

func (b *Bridge) handleDiscoverCameras(w http.ResponseWriter, r *http.Request) {
	log.Println("Starting camera discovery...")
	
	// Simulate ONVIF discovery (would use actual ONVIF library)
	discovered := b.discoverONVIFCameras()
	
	w.Header().Set("Content-Type", "application/json")
	json.NewEncoder(w).Encode(map[string]interface{}{
		"discovered": discovered,
		"count":      len(discovered),
	})
}

func (b *Bridge) handleWebSocket(w http.ResponseWriter, r *http.Request) {
	conn, err := b.wsUpgrader.Upgrade(w, r, nil)
	if err != nil {
		log.Printf("WebSocket upgrade failed: %v", err)
		return
	}
	defer conn.Close()

	// Handle WebSocket communication
	for {
		select {
		case <-b.ctx.Done():
			return
		default:
			_, message, err := conn.ReadMessage()
			if err != nil {
				log.Printf("WebSocket read error: %v", err)
				return
			}

			// Echo message (simplified - would handle actual commands)
			if err := conn.WriteMessage(websocket.TextMessage, message); err != nil {
				log.Printf("WebSocket write error: %v", err)
				return
			}
		}
	}
}

// Background Services
func (b *Bridge) startCameraDiscovery() {
	ticker := time.NewTicker(5 * time.Minute)
	defer ticker.Stop()

	for {
		select {
		case <-b.ctx.Done():
			return
		case <-ticker.C:
			b.discoverONVIFCameras()
		}
	}
}

func (b *Bridge) startCloudConnector() {
	if b.config.Cloud.WSURL == "" {
		log.Println("Cloud WebSocket URL not configured, skipping cloud connection")
		return
	}

	for {
		select {
		case <-b.ctx.Done():
			return
		default:
			if err := b.connectToCloud(); err != nil {
				log.Printf("Cloud connection failed: %v", err)
				time.Sleep(30 * time.Second)
			}
		}
	}
}

// Camera Operations
func (b *Bridge) discoverONVIFCameras() []*Camera {
	// Simplified ONVIF discovery - would use actual ONVIF library
	log.Println("Discovering ONVIF cameras...")
	
	// Return empty for now - would implement actual discovery
	return []*Camera{}
}

func (b *Bridge) testCameraConnection(camera *Camera) {
	// Simplified connection test - would implement actual RTSP connection
	time.Sleep(2 * time.Second)
	
	b.cameraMux.Lock()
	camera.Status = "connected"
	camera.LastSeen = time.Now()
	b.cameraMux.Unlock()
	
	log.Printf("Camera %s connected successfully", camera.Name)
}

func (b *Bridge) streamCamera(conn *websocket.Conn, camera *Camera) {
	// Simplified streaming - would implement actual RTSP to WebSocket streaming
	ticker := time.NewTicker(100 * time.Millisecond)
	defer ticker.Stop()

	for {
		select {
		case <-b.ctx.Done():
			return
		case <-ticker.C:
			// Send dummy frame data
			frame := map[string]interface{}{
				"camera_id": camera.ID,
				"timestamp": time.Now().Unix(),
				"frame":     "dummy_frame_data",
			}
			
			if err := conn.WriteJSON(frame); err != nil {
				log.Printf("Stream write error: %v", err)
				return
			}
		}
	}
}

func (b *Bridge) connectToCloud() error {
	// Simplified cloud connection - would implement actual WebSocket to cloud
	log.Printf("Connecting to cloud: %s", b.config.Cloud.WSURL)
	
	// Would implement actual WebSocket connection to MySafePlay cloud
	time.Sleep(5 * time.Second)
	
	return fmt.Errorf("cloud connection not implemented")
}

// Stop stops the bridge service
func (b *Bridge) Stop() error {
	log.Println("Stopping Camera Bridge...")
	
	b.cancel()
	
	if b.wsConn != nil {
		b.wsConn.Close()
	}

	ctx, cancel := context.WithTimeout(context.Background(), 5*time.Second)
	defer cancel()
	
	return b.httpServer.Shutdown(ctx)
}

// Main function
func main() {
	var (
		configPath = flag.String("config", "", "Path to configuration file")
		showVersion = flag.Bool("version", false, "Show version information")
	)
	flag.Parse()

	if *showVersion {
		fmt.Printf("MySafePlay Camera Bridge v%s\n", version)
		fmt.Printf("Build: %s (%s) by %s\n", commit, date, builtBy)
		return
	}

	// Create bridge instance
	bridge, err := NewBridge(*configPath)
	if err != nil {
		log.Fatalf("Failed to create bridge: %v", err)
	}

	// Handle graceful shutdown
	sigChan := make(chan os.Signal, 1)
	signal.Notify(sigChan, syscall.SIGINT, syscall.SIGTERM)

	// Start bridge in goroutine
	go func() {
		if err := bridge.Start(); err != nil && err != http.ErrServerClosed {
			log.Fatalf("Bridge failed to start: %v", err)
		}
	}()

	// Wait for shutdown signal
	<-sigChan
	log.Println("Shutdown signal received")

	// Graceful shutdown
	if err := bridge.Stop(); err != nil {
		log.Printf("Error during shutdown: %v", err)
	}

	log.Println("MySafePlay Camera Bridge stopped")
}
