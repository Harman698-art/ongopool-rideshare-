// OnGoPool Maps and Location Module

class MapsManager {
    constructor() {
        this.map = null;
        this.currentLocationMarker = null;
        this.rideMarkers = [];
        this.routeControl = null;
        this.watchId = null;
        this.isTracking = false;
        this.init();
    }

    init() {
        console.log('Maps manager initialized');
        this.setupAddressAutocomplete();
    }

    // Setup address autocomplete for all location inputs
    setupAddressAutocomplete() {
        const locationInputs = document.querySelectorAll('.location-autocomplete');
        
        locationInputs.forEach(input => {
            this.setupInputAutocomplete(input);
        });
    }

    // Setup autocomplete for a specific input
    setupInputAutocomplete(input) {
        const suggestionsContainer = input.parentNode.querySelector('.autocomplete-suggestions');
        if (!suggestionsContainer) return;

        let debounceTimer = null;
        let selectedIndex = -1;

        // Handle input events
        input.addEventListener('input', async (e) => {
            const query = e.target.value.trim();
            selectedIndex = -1;

            if (query.length < 3) {
                this.hideSuggestions(suggestionsContainer);
                return;
            }

            // Add loading state
            input.classList.add('loading');

            // Debounce the search
            clearTimeout(debounceTimer);
            debounceTimer = setTimeout(async () => {
                try {
                    const suggestions = await this.getAddressSuggestions(query);
                    this.showSuggestions(suggestionsContainer, suggestions, input);
                } catch (error) {
                    console.error('Autocomplete error:', error);
                } finally {
                    input.classList.remove('loading');
                }
            }, 300);
        });

        // Handle keyboard navigation
        input.addEventListener('keydown', (e) => {
            const suggestions = suggestionsContainer.querySelectorAll('.suggestion-item');
            
            switch (e.key) {
                case 'ArrowDown':
                    e.preventDefault();
                    selectedIndex = Math.min(selectedIndex + 1, suggestions.length - 1);
                    this.updateSelectedSuggestion(suggestions, selectedIndex);
                    break;
                    
                case 'ArrowUp':
                    e.preventDefault();
                    selectedIndex = Math.max(selectedIndex - 1, -1);
                    this.updateSelectedSuggestion(suggestions, selectedIndex);
                    break;
                    
                case 'Enter':
                    e.preventDefault();
                    if (selectedIndex >= 0 && suggestions[selectedIndex]) {
                        this.selectSuggestion(suggestions[selectedIndex], input, suggestionsContainer);
                    }
                    break;
                    
                case 'Escape':
                    this.hideSuggestions(suggestionsContainer);
                    selectedIndex = -1;
                    break;
            }
        });

        // Hide suggestions when clicking outside
        document.addEventListener('click', (e) => {
            if (!input.contains(e.target) && !suggestionsContainer.contains(e.target)) {
                this.hideSuggestions(suggestionsContainer);
                selectedIndex = -1;
            }
        });

        // Handle focus events
        input.addEventListener('focus', () => {
            if (input.value.length >= 3) {
                suggestionsContainer.classList.add('show');
            }
        });
    }

    // Show autocomplete suggestions
    showSuggestions(container, suggestions, input) {
        container.innerHTML = '';
        
        if (suggestions.length === 0) {
            this.hideSuggestions(container);
            return;
        }

        suggestions.forEach((suggestion, index) => {
            const item = document.createElement('div');
            item.className = 'suggestion-item';
            item.dataset.index = index;
            
            item.innerHTML = `
                <i class="fas fa-map-marker-alt"></i>
                <div class="suggestion-text">
                    <div class="suggestion-address">${suggestion.display_name}</div>
                </div>
            `;

            item.addEventListener('click', () => {
                this.selectSuggestion(item, input, container);
            });

            container.appendChild(item);
        });

        container.classList.add('show');
    }

    // Hide autocomplete suggestions
    hideSuggestions(container) {
        container.classList.remove('show');
    }

    // Update selected suggestion for keyboard navigation
    updateSelectedSuggestion(suggestions, selectedIndex) {
        suggestions.forEach((item, index) => {
            item.classList.toggle('selected', index === selectedIndex);
        });
    }

    // Select a suggestion
    selectSuggestion(item, input, container) {
        const addressText = item.querySelector('.suggestion-address').textContent;
        input.value = addressText;
        this.hideSuggestions(container);
        
        // Trigger change event for validation
        input.dispatchEvent(new Event('change', { bubbles: true }));
        
        // Store coordinates if needed
        const index = parseInt(item.dataset.index);
        if (this.lastSuggestions && this.lastSuggestions[index]) {
            input.dataset.lat = this.lastSuggestions[index].lat;
            input.dataset.lon = this.lastSuggestions[index].lon;
        }
    }

    // Initialize map on a container
    initializeMap(containerId, options = {}) {
        try {
            const container = document.getElementById(containerId);
            if (!container) {
                throw new Error(`Map container "${containerId}" not found`);
            }

            // Default map options
            const defaultOptions = {
                center: [45.4215, -75.6972], // Ottawa, ON
                zoom: 10,
                zoomControl: true,
                attributionControl: true
            };

            const mapOptions = { ...defaultOptions, ...options };

            // Initialize Leaflet map
            this.map = L.map(containerId, {
                center: mapOptions.center,
                zoom: mapOptions.zoom,
                zoomControl: mapOptions.zoomControl,
                attributionControl: mapOptions.attributionControl
            });

            // Add tile layer (OpenStreetMap)
            L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
                attribution: '© OpenStreetMap contributors',
                maxZoom: 18,
                tileSize: 256,
                zoomOffset: 0
            }).addTo(this.map);

            console.log('Map initialized successfully');
            return this.map;

        } catch (error) {
            console.error('Map initialization error:', error);
            return null;
        }
    }

    // Get user's current location
    async getCurrentLocation() {
        return new Promise((resolve, reject) => {
            if (!navigator.geolocation) {
                reject(new Error('Geolocation is not supported by this browser'));
                return;
            }

            navigator.geolocation.getCurrentPosition(
                (position) => {
                    const coords = {
                        lat: position.coords.latitude,
                        lon: position.coords.longitude,
                        accuracy: position.coords.accuracy
                    };
                    resolve(coords);
                },
                (error) => {
                    let errorMessage = 'Location access denied';
                    switch (error.code) {
                        case error.PERMISSION_DENIED:
                            errorMessage = 'Location access denied by user';
                            break;
                        case error.POSITION_UNAVAILABLE:
                            errorMessage = 'Location information unavailable';
                            break;
                        case error.TIMEOUT:
                            errorMessage = 'Location request timed out';
                            break;
                    }
                    reject(new Error(errorMessage));
                },
                {
                    enableHighAccuracy: true,
                    timeout: 10000,
                    maximumAge: 300000 // 5 minutes
                }
            );
        });
    }

    // Start live location tracking
    startLocationTracking(callback) {
        if (!navigator.geolocation) {
            throw new Error('Geolocation is not supported');
        }

        if (this.isTracking) {
            this.stopLocationTracking();
        }

        this.isTracking = true;

        this.watchId = navigator.geolocation.watchPosition(
            (position) => {
                const coords = {
                    lat: position.coords.latitude,
                    lon: position.coords.longitude,
                    accuracy: position.coords.accuracy,
                    timestamp: position.timestamp
                };

                // Update current location marker
                this.updateCurrentLocationMarker(coords);

                // Call callback with new position
                if (callback) {
                    callback(coords);
                }
            },
            (error) => {
                console.error('Location tracking error:', error);
                this.stopLocationTracking();
            },
            {
                enableHighAccuracy: true,
                timeout: 30000,
                maximumAge: 5000
            }
        );

        console.log('Location tracking started');
    }

    // Stop location tracking
    stopLocationTracking() {
        if (this.watchId !== null) {
            navigator.geolocation.clearWatch(this.watchId);
            this.watchId = null;
            this.isTracking = false;
            console.log('Location tracking stopped');
        }
    }

    // Update current location marker on map
    updateCurrentLocationMarker(coords) {
        if (!this.map) return;

        // Remove existing marker
        if (this.currentLocationMarker) {
            this.map.removeLayer(this.currentLocationMarker);
        }

        // Create new marker
        this.currentLocationMarker = L.marker([coords.lat, coords.lon], {
            icon: this.createCurrentLocationIcon()
        }).addTo(this.map);

        // Add accuracy circle
        L.circle([coords.lat, coords.lon], {
            radius: coords.accuracy,
            color: '#007bff',
            fillColor: '#007bff',
            fillOpacity: 0.1,
            weight: 1
        }).addTo(this.map);
    }

    // Create custom icon for current location
    createCurrentLocationIcon() {
        return L.divIcon({
            className: 'current-location-marker',
            html: '<div style="background: #007bff; width: 12px; height: 12px; border-radius: 50%; border: 2px solid white; box-shadow: 0 2px 4px rgba(0,0,0,0.3);"></div>',
            iconSize: [16, 16],
            iconAnchor: [8, 8]
        });
    }

    // Geocode address to coordinates
    async geocodeAddress(address) {
        try {
            // Using Nominatim API for geocoding
            const encodedAddress = encodeURIComponent(address);
            const response = await fetch(
                `https://nominatim.openstreetmap.org/search?format=json&q=${encodedAddress}&limit=1&countrycodes=ca`
            );

            if (!response.ok) {
                throw new Error('Geocoding request failed');
            }

            const data = await response.json();

            if (data.length === 0) {
                throw new Error('Address not found');
            }

            const result = data[0];
            return {
                lat: parseFloat(result.lat),
                lon: parseFloat(result.lon),
                display_name: result.display_name,
                address: result.address || {}
            };

        } catch (error) {
            console.error('Geocoding error:', error);
            
            // Fallback to mock coordinates for demo
            const mockCoordinates = {
                'toronto': { lat: 43.6532, lon: -79.3832 },
                'ottawa': { lat: 45.4215, lon: -75.6972 },
                'montreal': { lat: 45.5017, lon: -73.5673 },
                'vancouver': { lat: 49.2827, lon: -123.1207 },
                'calgary': { lat: 51.0447, lon: -114.0719 },
                'halifax': { lat: 44.6488, lon: -63.5752 }
            };

            const city = address.toLowerCase().split(',')[0].trim();
            if (mockCoordinates[city]) {
                return {
                    lat: mockCoordinates[city].lat,
                    lon: mockCoordinates[city].lon,
                    display_name: address,
                    address: {}
                };
            }

            throw error;
        }
    }

    // Add ride markers to map
    async addRideMarkers(rides) {
        if (!this.map) return;

        // Clear existing markers
        this.clearRideMarkers();

        for (const ride of rides) {
            try {
                // Geocode pickup location
                const pickupCoords = await this.geocodeAddress(ride.pickup);
                const destinationCoords = await this.geocodeAddress(ride.destination);

                // Create pickup marker
                const pickupMarker = L.marker([pickupCoords.lat, pickupCoords.lon], {
                    icon: this.createPickupIcon()
                }).addTo(this.map);

                // Create destination marker
                const destinationMarker = L.marker([destinationCoords.lat, destinationCoords.lon], {
                    icon: this.createDestinationIcon()
                }).addTo(this.map);

                // Add popup with ride info
                const popupContent = this.createRidePopupContent(ride);
                pickupMarker.bindPopup(popupContent);

                // Store markers for cleanup
                this.rideMarkers.push(pickupMarker, destinationMarker);

                // Add delay to avoid rate limiting
                await this.delay(100);

            } catch (error) {
                console.error('Error adding ride marker:', error);
            }
        }

        // Fit map to show all markers
        if (this.rideMarkers.length > 0) {
            const group = new L.featureGroup(this.rideMarkers);
            this.map.fitBounds(group.getBounds().pad(0.1));
        }
    }

    // Clear all ride markers
    clearRideMarkers() {
        this.rideMarkers.forEach(marker => {
            this.map.removeLayer(marker);
        });
        this.rideMarkers = [];
    }

    // Create pickup location icon
    createPickupIcon() {
        return L.divIcon({
            className: 'pickup-marker',
            html: '<div style="background: #10b981; color: white; width: 24px; height: 24px; border-radius: 50%; display: flex; align-items: center; justify-content: center; font-size: 12px; font-weight: bold; border: 2px solid white; box-shadow: 0 2px 4px rgba(0,0,0,0.3);">P</div>',
            iconSize: [28, 28],
            iconAnchor: [14, 14]
        });
    }

    // Create destination icon
    createDestinationIcon() {
        return L.divIcon({
            className: 'destination-marker',
            html: '<div style="background: #ef4444; color: white; width: 24px; height: 24px; border-radius: 50%; display: flex; align-items: center; justify-content: center; font-size: 12px; font-weight: bold; border: 2px solid white; box-shadow: 0 2px 4px rgba(0,0,0,0.3);">D</div>',
            iconSize: [28, 28],
            iconAnchor: [14, 14]
        });
    }

    // Create popup content for ride
    createRidePopupContent(ride) {
        return `
            <div class="ride-popup">
                <h4 class="font-semibold text-black mb-2">${ride.pickup} → ${ride.destination}</h4>
                <p class="text-sm text-gray-600 mb-1">Driver: ${ride.driver.name}</p>
                <p class="text-sm text-gray-600 mb-1">Date: ${ride.date} at ${ride.time}</p>
                <p class="text-sm text-gray-600 mb-1">Available: ${ride.availableSeats} seats</p>
                <p class="text-sm text-gray-600 mb-2">Price: $${(ride.pricePerKm * ride.distance).toFixed(2)} per seat</p>
                <button onclick="app.requestRide(${ride.id})" class="bg-black text-white px-3 py-1 rounded text-xs hover:bg-gray-800">
                    Request Ride
                </button>
            </div>
        `;
    }

    // Show route between two points
    async showRoute(pickup, destination) {
        if (!this.map) return;

        try {
            // Remove existing route
            this.clearRoute();

            // Geocode addresses
            const pickupCoords = await this.geocodeAddress(pickup);
            const destinationCoords = await this.geocodeAddress(destination);

            // Create route using Leaflet Routing Machine (simplified version)
            const waypoints = [
                L.latLng(pickupCoords.lat, pickupCoords.lon),
                L.latLng(destinationCoords.lat, destinationCoords.lon)
            ];

            // Draw simple line for now (in a real app, use routing service)
            this.routeControl = L.polyline(waypoints, {
                color: '#007bff',
                weight: 4,
                opacity: 0.7
            }).addTo(this.map);

            // Add markers
            L.marker([pickupCoords.lat, pickupCoords.lon], {
                icon: this.createPickupIcon()
            }).addTo(this.map).bindPopup(`Pickup: ${pickup}`);

            L.marker([destinationCoords.lat, destinationCoords.lon], {
                icon: this.createDestinationIcon()
            }).addTo(this.map).bindPopup(`Destination: ${destination}`);

            // Fit map to route
            this.map.fitBounds(this.routeControl.getBounds().pad(0.1));

        } catch (error) {
            console.error('Route display error:', error);
        }
    }

    // Clear route from map
    clearRoute() {
        if (this.routeControl) {
            this.map.removeLayer(this.routeControl);
            this.routeControl = null;
        }
    }

    // Center map on specific coordinates
    centerMap(lat, lon, zoom = 12) {
        if (this.map) {
            this.map.setView([lat, lon], zoom);
        }
    }

    // Calculate distance between two points (Haversine formula)
    calculateDistance(lat1, lon1, lat2, lon2) {
        const R = 6371; // Earth's radius in kilometers
        const dLat = this.toRadians(lat2 - lat1);
        const dLon = this.toRadians(lon2 - lon1);
        const a = Math.sin(dLat / 2) * Math.sin(dLat / 2) +
                Math.cos(this.toRadians(lat1)) * Math.cos(this.toRadians(lat2)) *
                Math.sin(dLon / 2) * Math.sin(dLon / 2);
        const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
        return R * c;
    }

    // Get routing information using OpenStreetMap routing service
    async getRouteDistance(startLat, startLon, endLat, endLon, stops = []) {
        try {
            // Build waypoints array
            const waypoints = [`${startLon},${startLat}`];
            
            // Add intermediate stops
            for (const stop of stops) {
                if (stop.lat && stop.lon) {
                    waypoints.push(`${stop.lon},${stop.lat}`);
                }
            }
            
            // Add destination
            waypoints.push(`${endLon},${endLat}`);

            // Use OSRM (Open Source Routing Machine) API
            const waypointsString = waypoints.join(';');
            const response = await fetch(
                `https://router.project-osrm.org/route/v1/driving/${waypointsString}?overview=false&steps=false`
            );

            if (!response.ok) {
                throw new Error('Routing service unavailable');
            }

            const data = await response.json();

            if (data.code !== 'Ok' || !data.routes || data.routes.length === 0) {
                throw new Error('No route found');
            }

            const route = data.routes[0];
            
            return {
                distance: (route.distance / 1000), // Convert to kilometers
                duration: Math.round(route.duration / 60), // Convert to minutes
                waypoints: waypoints,
                success: true
            };

        } catch (error) {
            console.warn('Routing service error, falling back to direct distance:', error);
            
            // Fallback to direct distance calculation
            let totalDistance = this.calculateDistance(startLat, startLon, endLat, endLon);
            
            // Add approximate distance for stops (assumes 10% detour per stop)
            if (stops && stops.length > 0) {
                totalDistance *= (1 + (stops.length * 0.1));
            }
            
            return {
                distance: totalDistance,
                duration: Math.round(totalDistance * 1.5), // Rough estimate: 1.5 min per km
                waypoints: [`${startLon},${startLat}`, `${endLon},${endLat}`],
                success: false,
                fallback: true
            };
        }
    }

    // Calculate route distance using addresses
    async calculateRouteFromAddresses(startAddress, endAddress, stopAddresses = []) {
        try {
            // Geocode all addresses
            const startCoords = await this.geocodeAddress(startAddress);
            const endCoords = await this.geocodeAddress(endAddress);
            
            const stops = [];
            for (const stopAddress of stopAddresses) {
                if (stopAddress && stopAddress.trim()) {
                    try {
                        const stopCoords = await this.geocodeAddress(stopAddress);
                        stops.push(stopCoords);
                    } catch (error) {
                        console.warn('Failed to geocode stop:', stopAddress, error);
                    }
                }
            }

            // Get route information
            const routeInfo = await this.getRouteDistance(
                startCoords.lat, startCoords.lon,
                endCoords.lat, endCoords.lon,
                stops
            );

            return {
                ...routeInfo,
                startCoords,
                endCoords,
                stopCoords: stops
            };

        } catch (error) {
            console.error('Route calculation error:', error);
            throw new Error('Unable to calculate route distance');
        }
    }

    // Calculate price based on distance and per-seat per-km pricing
    calculateSeatPrice(distance, pricePerSeatPerKm = 0.20, baseFare = 2.00, stops = 0) {
        // Base fare + distance cost + stop fees
        const distanceCost = distance * pricePerSeatPerKm;
        const stopFees = stops * 0.50; // $0.50 per stop
        const totalSeatPrice = baseFare + distanceCost + stopFees;
        
        // Minimum fare of $5.00 per seat
        return Math.max(totalSeatPrice, 5.00);
    }

    // Calculate driver earnings after service charge
    calculateDriverEarnings(seatPrice, seats = 1, serviceChargeRate = 0.15) {
        const totalPayment = seatPrice * seats;
        const serviceCharge = totalPayment * serviceChargeRate;
        const driverEarnings = totalPayment - serviceCharge;
        
        return {
            totalPayment,
            serviceCharge,
            driverEarnings,
            seatPrice
        };
    }

    // Get pricing constraints
    getPricingConstraints() {
        return {
            minPricePerKm: 0.15,
            maxPricePerKm: 0.25,
            defaultPricePerKm: 0.20,
            baseFare: 2.00,
            stopFee: 0.50,
            minTotalFare: 5.00,
            serviceChargeRate: 0.15
        };
    }

    // Calculate price range for a given distance
    getPriceRange(distance, stops = 0) {
        const constraints = this.getPricingConstraints();
        
        const minPrice = this.calculateSeatPrice(distance, constraints.minPricePerKm, constraints.baseFare, stops);
        const maxPrice = this.calculateSeatPrice(distance, constraints.maxPricePerKm, constraints.baseFare, stops);
        const defaultPrice = this.calculateSeatPrice(distance, constraints.defaultPricePerKm, constraints.baseFare, stops);
        
        return {
            min: minPrice,
            max: maxPrice,
            default: defaultPrice,
            constraints
        };
    }

    toRadians(degrees) {
        return degrees * (Math.PI / 180);
    }

    // Get address suggestions for autocomplete
    async getAddressSuggestions(query, countryCode = 'ca') {
        try {
            if (query.length < 3) return [];

            const encodedQuery = encodeURIComponent(query);
            const response = await fetch(
                `https://nominatim.openstreetmap.org/search?format=json&q=${encodedQuery}&limit=5&countrycodes=${countryCode}&addressdetails=1`
            );

            if (!response.ok) {
                throw new Error('Address search failed');
            }

            const data = await response.json();
            
            const suggestions = data.map(item => ({
                display_name: item.display_name,
                lat: parseFloat(item.lat),
                lon: parseFloat(item.lon),
                address: item.address || {}
            }));

            // Store for later use in selection
            this.lastSuggestions = suggestions;
            
            return suggestions;

        } catch (error) {
            console.error('Address suggestion error:', error);
            
            // Fallback to mock suggestions
            const mockSuggestions = [
                `${query}, Toronto, ON, Canada`,
                `${query}, Ottawa, ON, Canada`,
                `${query}, Montreal, QC, Canada`,
                `${query}, Vancouver, BC, Canada`,
                `${query}, Calgary, AB, Canada`
            ].map(address => ({
                display_name: address,
                lat: 45.4215,
                lon: -75.6972,
                address: {}
            }));

            this.lastSuggestions = mockSuggestions;
            return mockSuggestions;
        }
    }

    // Resize map (useful when container size changes)
    resizeMap() {
        if (this.map) {
            setTimeout(() => {
                this.map.invalidateSize();
            }, 100);
        }
    }

    // Destroy map instance
    destroyMap() {
        if (this.map) {
            this.stopLocationTracking();
            this.clearRideMarkers();
            this.clearRoute();
            this.map.remove();
            this.map = null;
        }
    }

    // Utility function
    delay(ms) {
        return new Promise(resolve => setTimeout(resolve, ms));
    }

    // Map styles for different themes
    setMapStyle(style = 'default') {
        if (!this.map) return;

        // Remove existing tile layers
        this.map.eachLayer(layer => {
            if (layer instanceof L.TileLayer) {
                this.map.removeLayer(layer);
            }
        });

        let tileUrl, attribution;

        switch (style) {
            case 'satellite':
                tileUrl = 'https://server.arcgisonline.com/ArcGIS/rest/services/World_Imagery/MapServer/tile/{z}/{y}/{x}';
                attribution = 'Tiles &copy; Esri &mdash; Source: Esri, i-cubed, USDA, USGS, AEX, GeoEye, Getmapping, Aerogrid, IGN, IGP, UPR-EGP, and the GIS User Community';
                break;
            case 'dark':
                tileUrl = 'https://{s}.basemaps.cartocdn.com/dark_all/{z}/{x}/{y}{r}.png';
                attribution = '&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors &copy; <a href="https://carto.com/attributions">CARTO</a>';
                break;
            default:
                tileUrl = 'https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png';
                attribution = '© OpenStreetMap contributors';
        }

        L.tileLayer(tileUrl, {
            attribution: attribution,
            maxZoom: 18
        }).addTo(this.map);
    }
}

// Export for use in other modules
window.MapsManager = MapsManager;