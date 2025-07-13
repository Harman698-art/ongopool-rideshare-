// OnGoPool Rides Management Module

class RidesManager {
    constructor() {
        this.rides = [];
        this.userRides = [];
        this.currentRide = null;
        this.pricePerKmMin = 0.15;
        this.pricePerKmMax = 0.25;
        this.serviceFeePercentage = 0.15;
        this.searchRadius = 25; // km
        this.supabase = null;
        this.init();
    }

    init() {
        // Wait for Supabase service to be available
        if (typeof window.supabaseService !== 'undefined') {
            this.supabase = window.supabaseService;
            console.log('Rides manager initialized with Supabase');
            this.loadRidesFromDatabase();
        } else {
            // Fallback to mock data if Supabase not available
            setTimeout(() => this.init(), 100);
            this.loadMockData();
        }
    }

    async loadRidesFromDatabase() {
        try {
            if (this.supabase && this.supabase.isConfigured) {
                const result = await this.supabase.searchRides();
                if (result.success) {
                    this.rides = result.data;
                    console.log('Loaded rides from database:', this.rides.length);
                } else {
                    console.warn('Failed to load rides from database:', result.error);
                    this.loadMockData();
                }
            } else {
                this.loadMockData();
            }
        } catch (error) {
            console.error('Error loading rides from database:', error);
            this.loadMockData();
        }
    }

    // Ride Posting (Driver functionality)
    async postRide(rideData) {
        try {
            // Validate ride data
            const validationResult = this.validateRideData(rideData);
            if (!validationResult.isValid) {
                throw new Error(validationResult.error);
            }

            // Calculate distance and validate price
            const distance = await this.calculateDistance(rideData.pickup, rideData.destination);
            const priceValidation = this.validatePricePerKm(rideData.pricePerKm);
            
            if (!priceValidation.isValid) {
                throw new Error(priceValidation.error);
            }

            // Create ride object
            const ride = {
                id: this.generateRideId(),
                driverId: rideData.driverId,
                driver: rideData.driver,
                pickup: rideData.pickup,
                destination: rideData.destination,
                date: rideData.date,
                time: rideData.time,
                availableSeats: parseInt(rideData.availableSeats),
                pricePerKm: parseFloat(rideData.pricePerKm),
                distance: distance,
                totalPrice: distance * parseFloat(rideData.pricePerKm),
                serviceFee: distance * parseFloat(rideData.pricePerKm) * this.serviceFeePercentage,
                roundTrip: rideData.roundTrip || false,
                description: rideData.description || '',
                restrictions: rideData.restrictions || [],
                status: 'available',
                requests: [],
                passengers: [],
                created_at: new Date().toISOString(),
                updated_at: new Date().toISOString()
            };

            // Use Supabase service to create ride
            const result = await this.supabase.createRide({
                driver_id: ride.driverId,
                pickup_address: ride.pickup.address,
                pickup_lat: ride.pickup.lat,
                pickup_lng: ride.pickup.lng,
                destination_address: ride.destination.address,
                destination_lat: ride.destination.lat,
                destination_lng: ride.destination.lng,
                departure_date: ride.date,
                departure_time: ride.time,
                available_seats: ride.availableSeats,
                price_per_km: ride.pricePerKm,
                distance_km: ride.distance,
                round_trip: ride.roundTrip,
                description: ride.description,
                status: 'available'
            });
            
            if (!result.success) {
                throw new Error(result.error);
            }

            // Add to local rides array for immediate UI update
            this.rides.push(result.data);
            this.saveRidesToStorage();

            return { ride: result.data, error: null };

        } catch (error) {
            console.error('Post ride error:', error);
            return { ride: null, error: error.message };
        }
    }

    // Ride Search (Passenger functionality)
    async searchRides(searchParams) {
        try {
            const { pickup, destination, date, time, passengers } = searchParams;

            // Validate search parameters
            if (!pickup) {
                throw new Error('Pickup location is required');
            }

            // If Supabase is not configured, use local search immediately
            if (!this.supabase || !this.supabase.isConfigured) {
                console.log('Using local search (Supabase not configured)');
                return this.searchRidesLocally(searchParams);
            }

            // Use Supabase to search rides with filters
            const filters = {};
            if (date) filters.departure_date = date;
            if (passengers) filters.available_seats = parseInt(passengers);

            let result;
            try {
                result = await this.supabase.searchRides(filters);
            } catch (dbError) {
                console.warn('Database search failed, using local data:', dbError);
                return this.searchRidesLocally(searchParams);
            }
            
            if (!result.success) {
                console.warn('Database search failed, using local data:', result.error);
                return this.searchRidesLocally(searchParams);
            }

            // Get pickup coordinates for distance filtering
            let pickupCoords;
            try {
                pickupCoords = await this.geocodeAddress(pickup);
            } catch (geocodeError) {
                console.warn('Geocoding failed, using fallback coordinates:', geocodeError);
                // Use default coordinates for Toronto as fallback
                pickupCoords = { lat: 43.6532, lon: -79.3832 };
            }
            
            // Filter rides by location proximity
            let availableRides = result.data.filter(ride => {
                // Check distance from pickup
                if (ride.pickup_lat && ride.pickup_lng) {
                    try {
                        const distance = this.calculateHaversineDistance(
                            pickupCoords.lat, pickupCoords.lon,
                            parseFloat(ride.pickup_lat), parseFloat(ride.pickup_lng)
                        );
                        if (distance <= this.searchRadius) {
                            return true;
                        }
                    } catch (distanceError) {
                        console.warn('Distance calculation failed for ride:', ride.id);
                        // Include ride if distance calculation fails
                        return true;
                    }
                }

                // Include rides without coordinates for now
                return true;
            });

            // Convert database format to app format
            try {
                availableRides = availableRides.map(ride => this.convertDatabaseRideToAppFormat(ride));
            } catch (conversionError) {
                console.warn('Ride format conversion failed:', conversionError);
                // Fallback to local search if conversion fails
                return this.searchRidesLocally(searchParams);
            }

            // Sort by relevance (distance, time, price)
            try {
                availableRides = this.sortRidesByRelevance(availableRides, pickupCoords, time);
            } catch (sortError) {
                console.warn('Sorting failed, returning unsorted results:', sortError);
                // Continue with unsorted results
            }

            return { rides: availableRides, error: null };

        } catch (error) {
            console.error('Search rides error:', error);
            // Always fallback to local search on any error
            console.log('Falling back to local search due to error');
            return this.searchRidesLocally(searchParams);
        }
    }

    // Fallback to local search
    searchRidesLocally(searchParams) {
        try {
            const { pickup, destination, date, time, passengers } = searchParams;
            
            // Ensure we have some rides to search through
            if (!this.rides || this.rides.length === 0) {
                console.log('No local rides available, loading mock data');
                this.loadMockData();
            }
            
            // Use existing local filtering logic
            let availableRides = this.rides.filter(ride => {
                if (ride.status !== 'available') return false;
                if (date && ride.date !== date) return false;
                if (passengers && ride.availableSeats < parseInt(passengers)) return false;
                
                // Basic location matching (case-insensitive partial match)
                if (pickup) {
                    const ridePickup = (ride.pickup.address || ride.pickup || '').toLowerCase();
                    const searchPickup = pickup.toLowerCase();
                    if (!ridePickup.includes(searchPickup) && !searchPickup.includes(ridePickup)) {
                        // If no match, still include ride but with lower priority
                    }
                }
                
                return true;
            });

            // Sort by date/time proximity if specified
            if (date && time) {
                availableRides.sort((a, b) => {
                    const aDateTime = new Date(`${a.date}T${a.time}`);
                    const bDateTime = new Date(`${b.date}T${b.time}`);
                    const targetDateTime = new Date(`${date}T${time}`);
                    
                    const aTimeDiff = Math.abs(aDateTime - targetDateTime);
                    const bTimeDiff = Math.abs(bDateTime - targetDateTime);
                    
                    return aTimeDiff - bTimeDiff;
                });
            }

            console.log(`Local search found ${availableRides.length} rides`);
            return { rides: availableRides, error: null };
            
        } catch (error) {
            console.error('Local search error:', error);
            // Return empty results if even local search fails
            return { rides: [], error: 'Search temporarily unavailable' };
        }
    }

    // Convert database ride format to application format
    convertDatabaseRideToAppFormat(dbRide) {
        try {
            // Ensure required fields exist
            if (!dbRide || !dbRide.id) {
                throw new Error('Invalid ride data: missing required fields');
            }

            const safeParseFloat = (value, defaultValue = 0) => {
                const parsed = parseFloat(value);
                return isNaN(parsed) ? defaultValue : parsed;
            };

            const safeParseInt = (value, defaultValue = 0) => {
                const parsed = parseInt(value);
                return isNaN(parsed) ? defaultValue : parsed;
            };

            const distance = safeParseFloat(dbRide.distance_km, 100);
            const pricePerKm = safeParseFloat(dbRide.price_per_km, 0.20);

            return {
                id: dbRide.id,
                driverId: dbRide.driver_id || 'unknown',
                driver: dbRide.driver || { 
                    name: 'Driver', 
                    rating: 4.5,
                    totalTrips: 10,
                    verified: true
                },
                pickup: {
                    address: dbRide.pickup_address || 'Unknown Location',
                    lat: safeParseFloat(dbRide.pickup_lat, 43.6532),
                    lng: safeParseFloat(dbRide.pickup_lng, -79.3832)
                },
                destination: {
                    address: dbRide.destination_address || 'Unknown Destination',
                    lat: safeParseFloat(dbRide.destination_lat, 45.4215),
                    lng: safeParseFloat(dbRide.destination_lng, -75.6972)
                },
                date: dbRide.departure_date || this.getTomorrowDate(),
                time: dbRide.departure_time || '09:00',
                availableSeats: safeParseInt(dbRide.available_seats, 1),
                pricePerKm: pricePerKm,
                distance: distance,
                totalPrice: distance * pricePerKm,
                serviceFee: distance * pricePerKm * this.serviceFeePercentage,
                roundTrip: dbRide.round_trip || false,
                description: dbRide.description || '',
                restrictions: dbRide.restrictions || [],
                status: dbRide.status || 'available',
                created_at: dbRide.created_at || new Date().toISOString(),
                updated_at: dbRide.updated_at || new Date().toISOString(),
                requests: [],
                passengers: []
            };
        } catch (error) {
            console.error('Error converting database ride format:', error, dbRide);
            throw new Error('Failed to convert ride data format');
        }
    }

    // Ride Request (Passenger functionality)
    async requestRide(rideId, passengerId, message = '') {
        try {
            const ride = this.rides.find(r => r.id === rideId);
            if (!ride) {
                throw new Error('Ride not found');
            }

            if (ride.status !== 'available') {
                throw new Error('Ride is no longer available');
            }

            if (ride.availableSeats <= 0) {
                throw new Error('No seats available');
            }

            // Check if user already requested this ride
            const existingRequest = ride.requests.find(r => r.passengerId === passengerId);
            if (existingRequest) {
                throw new Error('You have already requested this ride');
            }

            // Create ride request
            const request = {
                id: this.generateRequestId(),
                rideId: rideId,
                passengerId: passengerId,
                message: message,
                status: 'pending',
                requestedAt: new Date().toISOString()
            };

            // Add request to ride
            ride.requests.push(request);
            ride.updated_at = new Date().toISOString();

            // Simulate API call
            await this.delay(500);

            this.saveRidesToStorage();

            // Notify driver (mock)
            this.notifyDriver(ride.driverId, 'New ride request', `You have a new ride request for ${ride.pickup} to ${ride.destination}`);

            return { request, error: null };

        } catch (error) {
            console.error('Request ride error:', error);
            return { request: null, error: error.message };
        }
    }

    // Accept/Decline Request (Driver functionality)
    async respondToRequest(requestId, response, driverId) {
        try {
            if (!['accepted', 'declined'].includes(response)) {
                throw new Error('Invalid response. Must be "accepted" or "declined"');
            }

            // Find the ride and request
            let targetRide = null;
            let targetRequest = null;

            for (const ride of this.rides) {
                if (ride.driverId !== driverId) continue;
                
                const request = ride.requests.find(r => r.id === requestId);
                if (request) {
                    targetRide = ride;
                    targetRequest = request;
                    break;
                }
            }

            if (!targetRequest) {
                throw new Error('Request not found');
            }

            if (targetRequest.status !== 'pending') {
                throw new Error('Request has already been responded to');
            }

            // Update request status
            targetRequest.status = response;
            targetRequest.respondedAt = new Date().toISOString();

            if (response === 'accepted') {
                // Add passenger to ride
                targetRide.passengers.push({
                    passengerId: targetRequest.passengerId,
                    requestId: requestId,
                    joinedAt: new Date().toISOString()
                });

                // Decrease available seats
                targetRide.availableSeats -= 1;

                // If no more seats, mark as full
                if (targetRide.availableSeats <= 0) {
                    targetRide.status = 'full';
                }

                // Process payment (mock)
                await this.processPayment(targetRequest.passengerId, targetRide);
            }

            targetRide.updated_at = new Date().toISOString();

            // Simulate API call
            await this.delay(500);

            this.saveRidesToStorage();

            // Notify passenger
            const notificationMessage = response === 'accepted' 
                ? 'Your ride request has been accepted!'
                : 'Your ride request was declined. Keep looking for other rides!';
            
            this.notifyPassenger(targetRequest.passengerId, 'Ride Request Update', notificationMessage);

            return { request: targetRequest, error: null };

        } catch (error) {
            console.error('Respond to request error:', error);
            return { request: null, error: error.message };
        }
    }

    // Cancel Ride (Driver or Admin)
    async cancelRide(rideId, cancelledBy, reason = '') {
        try {
            const ride = this.rides.find(r => r.id === rideId);
            if (!ride) {
                throw new Error('Ride not found');
            }

            if (ride.status === 'cancelled' || ride.status === 'completed') {
                throw new Error('Cannot cancel this ride');
            }

            // Calculate refund eligibility
            const rideDateTime = new Date(`${ride.date}T${ride.time}`);
            const now = new Date();
            const hoursUntilRide = (rideDateTime - now) / (1000 * 60 * 60);

            // Update ride status
            ride.status = 'cancelled';
            ride.cancelledBy = cancelledBy;
            ride.cancelReason = reason;
            ride.cancelledAt = new Date().toISOString();
            ride.updated_at = new Date().toISOString();

            // Process refunds for passengers
            for (const passenger of ride.passengers) {
                const refundAmount = hoursUntilRide >= 12 ? ride.totalPrice : 0;
                await this.processRefund(passenger.passengerId, refundAmount, rideId);
                
                // Notify passenger
                this.notifyPassenger(
                    passenger.passengerId, 
                    'Ride Cancelled', 
                    `Your ride from ${ride.pickup} to ${ride.destination} has been cancelled. ${refundAmount > 0 ? `A refund of $${refundAmount.toFixed(2)} will be processed.` : 'No refund available due to short notice.'}`
                );
            }

            // Simulate API call
            await this.delay(1000);

            this.saveRidesToStorage();

            return { ride, error: null };

        } catch (error) {
            console.error('Cancel ride error:', error);
            return { ride: null, error: error.message };
        }
    }

    // Get User's Rides
    getUserRides(userId, role = 'passenger') {
        if (role === 'driver') {
            return this.rides.filter(ride => ride.driverId === userId);
        } else {
            return this.rides.filter(ride => 
                ride.passengers.some(p => p.passengerId === userId) ||
                ride.requests.some(r => r.passengerId === userId)
            );
        }
    }

    // Get Ride Details
    getRideDetails(rideId) {
        return this.rides.find(ride => ride.id === rideId);
    }

    // Validation helpers
    validateRideData(rideData) {
        const { pickup, destination, date, time, availableSeats, pricePerKm } = rideData;

        if (!pickup || pickup.trim().length < 3) {
            return { isValid: false, error: 'Pickup location is required' };
        }

        if (!destination || destination.trim().length < 3) {
            return { isValid: false, error: 'Destination is required' };
        }

        if (!date) {
            return { isValid: false, error: 'Date is required' };
        }

        if (!time) {
            return { isValid: false, error: 'Time is required' };
        }

        const rideDate = new Date(`${date}T${time}`);
        if (rideDate <= new Date()) {
            return { isValid: false, error: 'Ride date must be in the future' };
        }

        if (!availableSeats || availableSeats < 1 || availableSeats > 8) {
            return { isValid: false, error: 'Available seats must be between 1 and 8' };
        }

        if (!pricePerKm || pricePerKm < this.pricePerKmMin || pricePerKm > this.pricePerKmMax) {
            return { isValid: false, error: `Price per km must be between $${this.pricePerKmMin} and $${this.pricePerKmMax}` };
        }

        return { isValid: true };
    }

    validatePricePerKm(pricePerKm) {
        try {
            const price = parseFloat(pricePerKm);
            
            // Check for NaN or invalid numbers
            if (isNaN(price) || !isFinite(price)) {
                return { 
                    isValid: false, 
                    error: `Invalid price format. Please enter a valid number.` 
                };
            }
            
            // Check for negative values
            if (price <= 0) {
                return { 
                    isValid: false, 
                    error: `Price per km must be greater than $0` 
                };
            }
            
            // Check range bounds
            if (price < this.pricePerKmMin || price > this.pricePerKmMax) {
                return { 
                    isValid: false, 
                    error: `Price per km must be between $${this.pricePerKmMin} and $${this.pricePerKmMax} CAD` 
                };
            }
            
            // Check for reasonable precision (max 2 decimal places)
            const decimalPlaces = (price.toString().split('.')[1] || '').length;
            if (decimalPlaces > 2) {
                return { 
                    isValid: false, 
                    error: `Price can have maximum 2 decimal places` 
                };
            }
            
            return { isValid: true };
            
        } catch (error) {
            console.error('Price validation error:', error);
            return { 
                isValid: false, 
                error: 'Error validating price. Please try again.' 
            };
        }
    }

    // Geographic helpers
    async calculateDistance(pickup, destination) {
        try {
            // Mock distance calculation (replace with actual geocoding service)
            const distances = {
                'toronto-ottawa': 450,
                'toronto-montreal': 540,
                'vancouver-calgary': 605,
                'calgary-edmonton': 300,
                'halifax-moncton': 180
            };

            const key = `${pickup.toLowerCase()}-${destination.toLowerCase()}`;
            const reverseKey = `${destination.toLowerCase()}-${pickup.toLowerCase()}`;

            if (distances[key]) return distances[key];
            if (distances[reverseKey]) return distances[reverseKey];

            // Default calculation for unknown routes
            return Math.floor(Math.random() * 500) + 100;

        } catch (error) {
            console.error('Distance calculation error:', error);
            return 250; // Default fallback distance
        }
    }

    async geocodeAddress(address) {
        try {
            // Mock geocoding (replace with Nominatim API)
            const mockCoordinates = {
                'toronto': { lat: 43.6532, lon: -79.3832 },
                'ottawa': { lat: 45.4215, lon: -75.6972 },
                'montreal': { lat: 45.5017, lon: -73.5673 },
                'vancouver': { lat: 49.2827, lon: -123.1207 },
                'calgary': { lat: 51.0447, lon: -114.0719 },
                'halifax': { lat: 44.6488, lon: -63.5752 },
                'winnipeg': { lat: 49.8954, lon: -97.1385 },
                'edmonton': { lat: 53.5444, lon: -113.4909 }
            };

            if (!address || typeof address !== 'string') {
                throw new Error('Invalid address provided');
            }

            const city = address.toLowerCase().trim().split(',')[0];
            const coords = mockCoordinates[city];
            
            if (coords) {
                return coords;
            }
            
            // Check for partial matches
            for (const [cityName, coordinates] of Object.entries(mockCoordinates)) {
                if (city.includes(cityName) || cityName.includes(city)) {
                    return coordinates;
                }
            }
            
            // Default fallback to Toronto coordinates
            console.warn(`No coordinates found for "${address}", using Toronto as fallback`);
            return { lat: 43.6532, lon: -79.3832 };
            
        } catch (error) {
            console.error('Geocoding error:', error);
            // Return default coordinates on any error
            return { lat: 43.6532, lon: -79.3832 };
        }
    }

    getCachedCoordinates(address) {
        // In a real app, this would fetch from a cache or database
        return this.geocodeAddress(address);
    }

    calculateHaversineDistance(lat1, lon1, lat2, lon2) {
        const R = 6371; // Earth's radius in kilometers
        const dLat = this.toRadians(lat2 - lat1);
        const dLon = this.toRadians(lon2 - lon1);
        const a = Math.sin(dLat / 2) * Math.sin(dLat / 2) +
                Math.cos(this.toRadians(lat1)) * Math.cos(this.toRadians(lat2)) *
                Math.sin(dLon / 2) * Math.sin(dLon / 2);
        const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
        return R * c;
    }

    toRadians(degrees) {
        return degrees * (Math.PI / 180);
    }

    // Sorting and filtering
    sortRidesByRelevance(rides, pickupCoords, targetTime) {
        try {
            if (!rides || rides.length === 0) {
                return rides;
            }

            return rides.sort((a, b) => {
                try {
                    // Sort by date/time proximity first
                    const aDateTime = new Date(`${a.date}T${a.time}`);
                    const bDateTime = new Date(`${b.date}T${b.time}`);
                    
                    if (targetTime) {
                        const today = new Date().toISOString().split('T')[0];
                        const targetDateTime = new Date(`${today}T${targetTime}`);
                        const aTimeDiff = Math.abs(aDateTime - targetDateTime);
                        const bTimeDiff = Math.abs(bDateTime - targetDateTime);
                        
                        if (aTimeDiff !== bTimeDiff) {
                            return aTimeDiff - bTimeDiff;
                        }
                    }

                    // Then by price (lower first)
                    const aPricePerKm = parseFloat(a.pricePerKm) || 0;
                    const bPricePerKm = parseFloat(b.pricePerKm) || 0;
                    if (aPricePerKm !== bPricePerKm) {
                        return aPricePerKm - bPricePerKm;
                    }

                    // Finally by available seats (more first)
                    const aSeats = parseInt(a.availableSeats) || 0;
                    const bSeats = parseInt(b.availableSeats) || 0;
                    return bSeats - aSeats;
                } catch (sortItemError) {
                    console.warn('Error sorting individual rides:', sortItemError);
                    return 0; // Keep original order for problematic items
                }
            });
        } catch (error) {
            console.error('Error in sortRidesByRelevance:', error);
            return rides; // Return original array if sorting fails
        }
    }

    // Payment processing (mock)
    async processPayment(passengerId, ride) {
        try {
            console.log(`Processing payment for passenger ${passengerId}: $${ride.totalPrice.toFixed(2)}`);
            // In a real app, this would integrate with Stripe
            await this.delay(1000);
            return { success: true, transactionId: this.generateTransactionId() };
        } catch (error) {
            console.error('Payment processing error:', error);
            throw error;
        }
    }

    async processRefund(passengerId, amount, rideId) {
        try {
            if (amount <= 0) return { success: true, amount: 0 };
            
            console.log(`Processing refund for passenger ${passengerId}: $${amount.toFixed(2)}`);
            // In a real app, this would integrate with Stripe for refunds
            await this.delay(500);
            return { success: true, refundId: this.generateRefundId(), amount };
        } catch (error) {
            console.error('Refund processing error:', error);
            throw error;
        }
    }

    // Notification system (mock)
    notifyDriver(driverId, title, message) {
        console.log(`Driver notification: ${title} - ${message}`);
        // In a real app, this would send push notifications or emails
    }

    notifyPassenger(passengerId, title, message) {
        console.log(`Passenger notification: ${title} - ${message}`);
        // In a real app, this would send push notifications or emails
    }

    // Storage helpers
    saveRidesToStorage() {
        try {
            localStorage.setItem('ongopool_rides', JSON.stringify(this.rides));
        } catch (error) {
            console.error('Failed to save rides to storage:', error);
        }
    }

    loadRidesFromStorage() {
        try {
            const ridesData = localStorage.getItem('ongopool_rides');
            if (ridesData) {
                this.rides = JSON.parse(ridesData);
            }
        } catch (error) {
            console.error('Failed to load rides from storage:', error);
            this.rides = [];
        }
    }

    // Mock data for demonstration
    loadMockData() {
        this.rides = [
            {
                id: 'ride_001',
                driverId: 'driver_001',
                driver: {
                    name: 'Sarah Johnson',
                    rating: 4.8,
                    totalTrips: 45,
                    verified: true
                },
                pickup: 'Toronto, ON',
                destination: 'Ottawa, ON',
                date: this.getTomorrowDate(),
                time: '09:00',
                availableSeats: 3,
                pricePerKm: 0.20,
                distance: 450,
                totalPrice: 90.00,
                serviceFee: 13.50,
                roundTrip: false,
                description: 'Comfortable ride in a clean SUV. No smoking.',
                restrictions: ['no-pets', 'no-smoking'],
                status: 'available',
                requests: [],
                passengers: [],
                created_at: new Date().toISOString(),
                updated_at: new Date().toISOString()
            },
            {
                id: 'ride_002',
                driverId: 'driver_002',
                driver: {
                    name: 'Michael Chen',
                    rating: 4.9,
                    totalTrips: 67,
                    verified: true
                },
                pickup: 'Vancouver, BC',
                destination: 'Calgary, AB',
                date: this.getTomorrowDate(),
                time: '14:00',
                availableSeats: 2,
                pricePerKm: 0.18,
                distance: 605,
                totalPrice: 108.90,
                serviceFee: 16.34,
                roundTrip: false,
                description: 'Highway trip with one rest stop. Music welcome.',
                restrictions: [],
                status: 'available',
                requests: [],
                passengers: [],
                created_at: new Date().toISOString(),
                updated_at: new Date().toISOString()
            }
        ];
    }

    // Utility functions
    generateRideId() {
        return 'ride_' + Date.now() + '_' + Math.random().toString(36).substr(2, 9);
    }

    generateRequestId() {
        return 'request_' + Date.now() + '_' + Math.random().toString(36).substr(2, 9);
    }

    generateTransactionId() {
        return 'txn_' + Date.now() + '_' + Math.random().toString(36).substr(2, 9);
    }

    generateRefundId() {
        return 'refund_' + Date.now() + '_' + Math.random().toString(36).substr(2, 9);
    }

    getTomorrowDate() {
        const tomorrow = new Date();
        tomorrow.setDate(tomorrow.getDate() + 1);
        return tomorrow.toISOString().split('T')[0];
    }

    delay(ms) {
        return new Promise(resolve => setTimeout(resolve, ms));
    }
}

// Export for use in other modules
window.RidesManager = RidesManager;