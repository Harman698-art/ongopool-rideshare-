/**
 * Supabase Configuration and Client Setup
 * Handles database operations, authentication, and real-time features
 */

class SupabaseService {
    constructor() {
        // Initialize with actual Supabase credentials
        this.supabaseUrl = 'https://jehsimybvsinrywkrghn.supabase.co';
        this.supabaseKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImplaHNpbXlidnNpbnJ5d2tyZ2huIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NTIwMDc0ODUsImV4cCI6MjA2NzU4MzQ4NX0.c8K8ru8y6LdJEVWspV0yAQqcF2eNatcwJsuq9h3KrnI';
        this.supabase = null;
        this.isConfigured = false;
        
        this.init();
    }

    init() {
        try {
            if (typeof supabase !== 'undefined' && this.supabaseUrl && this.supabaseKey) {
                this.supabase = window.supabase.createClient(this.supabaseUrl, this.supabaseKey);
                this.isConfigured = true;
                console.log('Supabase client initialized successfully');
            } else {
                console.warn('Supabase not properly configured. Using mock data.');
                this.setupMockMode();
            }
        } catch (error) {
            console.error('Failed to initialize Supabase:', error);
            this.setupMockMode();
        }
    }

    setupMockMode() {
        this.isConfigured = false;
        // Mock data will be used when Supabase is not configured
    }

    // Authentication Methods
    async signUp(email, password, userData = {}) {
        if (!this.isConfigured) {
            return this.mockSignUp(email, password, userData);
        }

        try {
            const { data, error } = await this.supabase.auth.signUp({
                email,
                password,
                options: {
                    data: userData,
                    emailRedirectTo: window.location.origin + '/#email-verification-success'
                }
            });
            
            if (error) throw error;
            
            const user = data.user;
            const needsVerification = user && !user.email_confirmed_at;
            
            // Create user profile after signup (even if not yet verified)
            if (user && (userData.name || userData.role)) {
                try {
                    await this.createUserProfile(user.id, {
                        first_name: userData.name?.split(' ')[0] || '',
                        last_name: userData.name?.split(' ').slice(1).join(' ') || '',
                        phone: userData.phone || '',
                        role: userData.role || 'passenger'
                    });
                } catch (profileError) {
                    console.warn('Profile creation error (will retry on verification):', profileError);
                }
            }
            
            if (needsVerification) {
                console.log('Email verification sent to:', email);
                return { 
                    success: true, 
                    user: data.user, 
                    needsEmailVerification: true,
                    message: 'Please check your email to verify your account'
                };
            }
            
            return { success: true, user: data.user, needsEmailVerification: false };
        } catch (error) {
            console.error('Signup error:', error);
            return { success: false, error: error.message };
        }
    }

    async signIn(email, password) {
        if (!this.isConfigured) {
            return this.mockSignIn(email, password);
        }

        try {
            const { data, error } = await this.supabase.auth.signInWithPassword({
                email,
                password
            });
            
            if (error) throw error;
            return { success: true, user: data.user };
        } catch (error) {
            console.error('Signin error:', error);
            return { success: false, error: error.message };
        }
    }

    async signOut() {
        if (!this.isConfigured) {
            return this.mockSignOut();
        }

        try {
            const { error } = await this.supabase.auth.signOut();
            if (error) throw error;
            return { success: true };
        } catch (error) {
            console.error('Signout error:', error);
            return { success: false, error: error.message };
        }
    }

    async getCurrentUser() {
        if (!this.isConfigured) {
            return this.mockGetCurrentUser();
        }

        try {
            const { data: { user } } = await this.supabase.auth.getUser();
            return user;
        } catch (error) {
            console.error('Get user error:', error);
            return null;
        }
    }

    async resendEmailVerification(email) {
        if (!this.isConfigured) {
            return { success: false, error: 'Service not configured' };
        }

        try {
            const { error } = await this.supabase.auth.resend({
                type: 'signup',
                email: email,
                options: {
                    emailRedirectTo: window.location.origin + '/#email-verification-success'
                }
            });
            
            if (error) throw error;
            return { success: true, message: 'Verification email sent' };
        } catch (error) {
            console.error('Resend verification error:', error);
            return { success: false, error: error.message };
        }
    }

    async confirmEmail(tokenHash, type = 'signup') {
        if (!this.isConfigured) {
            return { success: false, error: 'Service not configured' };
        }

        try {
            const { data, error } = await this.supabase.auth.verifyOtp({
                token_hash: tokenHash,
                type: type
            });
            
            if (error) throw error;
            return { success: true, user: data.user };
        } catch (error) {
            console.error('Email confirmation error:', error);
            return { success: false, error: error.message };
        }
    }

    // Database Methods - Users
    async createUserProfile(userId, profileData) {
        if (!this.isConfigured) {
            return this.mockCreateUserProfile(userId, profileData);
        }

        try {
            // Check if profile already exists
            const { data: existingProfile } = await this.supabase
                .from('profiles')
                .select('id')
                .eq('id', userId)
                .single();

            if (existingProfile) {
                // Profile exists, update it instead
                return await this.updateUserProfile(userId, profileData);
            }

            // Create new profile
            const { data, error } = await this.supabase
                .from('profiles')
                .insert([{
                    id: userId,
                    ...profileData
                }])
                .select();

            if (error) throw error;
            return { success: true, data: data[0] };
        } catch (error) {
            console.error('Create profile error:', error);
            return { success: false, error: error.message };
        }
    }

    async getUserProfile(userId) {
        if (!this.isConfigured) {
            return this.mockGetUserProfile(userId);
        }

        try {
            const { data, error } = await this.supabase
                .from('profiles')
                .select('*')
                .eq('id', userId)
                .single();

            if (error) throw error;
            return { success: true, data };
        } catch (error) {
            console.error('Get profile error:', error);
            return { success: false, error: error.message };
        }
    }

    async updateUserProfile(userId, profileData) {
        if (!this.isConfigured) {
            return this.mockUpdateUserProfile(userId, profileData);
        }

        try {
            // Validate profile data before updating
            const validationResult = this.validateUserProfileData(profileData);
            if (!validationResult.isValid) {
                throw new Error(validationResult.error);
            }

            const { data, error } = await this.supabase
                .from('profiles')
                .update(profileData)
                .eq('id', userId)
                .select()
                .single();

            if (error) throw error;
            return { success: true, data };
        } catch (error) {
            console.error('Update profile error:', error);
            return { success: false, error: error.message };
        }
    }
    
    // Database validation methods
    validateUserProfileData(profileData) {
        try {
            const errors = [];
            
            // Validate required fields
            if (profileData.first_name !== undefined) {
                if (!profileData.first_name || profileData.first_name.trim().length < 1) {
                    errors.push('First name is required');
                } else if (profileData.first_name.length > 50) {
                    errors.push('First name must be less than 50 characters');
                } else if (!/^[a-zA-Z\s'-]+$/.test(profileData.first_name)) {
                    errors.push('First name contains invalid characters');
                }
            }
            
            if (profileData.last_name !== undefined) {
                if (!profileData.last_name || profileData.last_name.trim().length < 1) {
                    errors.push('Last name is required');
                } else if (profileData.last_name.length > 50) {
                    errors.push('Last name must be less than 50 characters');
                } else if (!/^[a-zA-Z\s'-]+$/.test(profileData.last_name)) {
                    errors.push('Last name contains invalid characters');
                }
            }
            
            // Validate phone number
            if (profileData.phone !== undefined) {
                const phoneRegex = /^[\+]?[1-9][\d]{0,15}$/;
                if (profileData.phone && !phoneRegex.test(profileData.phone.replace(/[\s\-\(\)]/g, ''))) {
                    errors.push('Invalid phone number format');
                }
            }
            
            // Validate email
            if (profileData.email !== undefined) {
                const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
                if (profileData.email && !emailRegex.test(profileData.email)) {
                    errors.push('Invalid email format');
                }
            }
            
            // Validate date of birth
            if (profileData.date_of_birth !== undefined) {
                const dob = new Date(profileData.date_of_birth);
                const now = new Date();
                const age = now.getFullYear() - dob.getFullYear();
                
                if (isNaN(dob.getTime())) {
                    errors.push('Invalid date of birth');
                } else if (age < 18) {
                    errors.push('Must be at least 18 years old');
                } else if (age > 100) {
                    errors.push('Invalid date of birth - age too high');
                }
            }
            
            // Validate driver license (if provided)
            if (profileData.driver_license !== undefined && profileData.driver_license) {
                if (profileData.driver_license.length < 5 || profileData.driver_license.length > 20) {
                    errors.push('Driver license must be between 5 and 20 characters');
                }
                if (!/^[A-Z0-9\-]+$/i.test(profileData.driver_license)) {
                    errors.push('Driver license contains invalid characters');
                }
            }
            
            // Validate vehicle information (if driver)
            if (profileData.role === 'driver' || profileData.vehicle_make !== undefined) {
                if (profileData.vehicle_make !== undefined && profileData.vehicle_make) {
                    if (profileData.vehicle_make.length > 30) {
                        errors.push('Vehicle make must be less than 30 characters');
                    }
                }
                
                if (profileData.vehicle_model !== undefined && profileData.vehicle_model) {
                    if (profileData.vehicle_model.length > 30) {
                        errors.push('Vehicle model must be less than 30 characters');
                    }
                }
                
                if (profileData.vehicle_year !== undefined && profileData.vehicle_year) {
                    const year = parseInt(profileData.vehicle_year);
                    const currentYear = new Date().getFullYear();
                    if (isNaN(year) || year < 1990 || year > currentYear + 1) {
                        errors.push('Invalid vehicle year');
                    }
                }
            }
            
            return {
                isValid: errors.length === 0,
                error: errors.join('; '),
                errors: errors
            };
            
        } catch (error) {
            console.error('Profile validation error:', error);
            return {
                isValid: false,
                error: 'Validation error occurred',
                errors: ['Validation system error']
            };
        }
    }
    
    async uploadProfilePhoto(userId, file, onProgress) {
        if (!this.isConfigured) {
            return this.mockUploadProfilePhoto(userId, file, onProgress);
        }
        
        try {
            // Generate a unique file path
            const fileExt = file.name.split('.').pop();
            const filePath = `profile-photos/${userId}/profile-${Date.now()}.${fileExt}`;
            
            // Create upload options with progress tracking
            const options = {
                cacheControl: '3600',
                upsert: true,
                onUploadProgress: (progress) => {
                    if (typeof onProgress === 'function') {
                        const percent = Math.round((progress.loaded / progress.total) * 100);
                        onProgress(percent);
                    }
                }
            };
            
            // Upload file to Supabase Storage
            const { data, error } = await this.supabase.storage
                .from('user-uploads')
                .upload(filePath, file, options);
                
            if (error) throw error;
            
            // Get public URL
            const { data: urlData } = this.supabase.storage
                .from('user-uploads')
                .getPublicUrl(filePath);
                
            return { 
                success: true, 
                data: {
                    path: filePath,
                    url: urlData.publicUrl
                }
            };
        } catch (error) {
            console.error('Profile photo upload error:', error);
            return { success: false, error: error.message };
        }
    }
    
    async deleteProfilePhoto(userId, filePath) {
        if (!this.isConfigured) {
            return this.mockDeleteProfilePhoto(userId, filePath);
        }
        
        try {
            const { data, error } = await this.supabase.storage
                .from('user-uploads')
                .remove([filePath]);
                
            if (error) throw error;
            return { success: true };
        } catch (error) {
            console.error('Delete profile photo error:', error);
            return { success: false, error: error.message };
        }
    }
    
    async uploadDriverDocument(userId, documentType, file, onProgress) {
        if (!this.isConfigured) {
            return this.mockUploadDriverDocument(userId, documentType, file, onProgress);
        }
        
        try {
            // Generate a unique file path
            const fileExt = file.name.split('.').pop();
            const filePath = `driver-documents/${userId}/${documentType}-${Date.now()}.${fileExt}`;
            
            // Create upload options with progress tracking
            const options = {
                cacheControl: '3600',
                upsert: true,
                onUploadProgress: (progress) => {
                    if (typeof onProgress === 'function') {
                        const percent = Math.round((progress.loaded / progress.total) * 100);
                        onProgress(percent);
                    }
                }
            };
            
            // Upload file to Supabase Storage
            const { data, error } = await this.supabase.storage
                .from('driver-documents')
                .upload(filePath, file, options);
                
            if (error) throw error;
            
            // Get public URL
            const { data: urlData } = this.supabase.storage
                .from('driver-documents')
                .getPublicUrl(filePath);
                
            return { 
                success: true, 
                data: {
                    path: filePath,
                    url: urlData.publicUrl
                }
            };
        } catch (error) {
            console.error('Driver document upload error:', error);
            return { success: false, error: error.message };
        }
    }
    
    async mockUploadDriverDocument(userId, documentType, file, onProgress) {
        return new Promise((resolve) => {
            // Simulate progress updates
            let progress = 0;
            const interval = setInterval(() => {
                progress += 10;
                if (typeof onProgress === 'function') {
                    onProgress(progress);
                }
                
                if (progress >= 100) {
                    clearInterval(interval);
                    
                    // Create a mock URL for the uploaded file
                    const mockUrl = `mock-storage://driver-documents/${userId}/${documentType}-${Date.now()}.jpg`;
                    const mockPath = `driver-documents/${userId}/${documentType}-${Date.now()}.jpg`;
                    
                    // Return success response
                    resolve({ 
                        success: true, 
                        data: {
                            path: mockPath,
                            url: mockUrl
                        }
                    });
                }
            }, 300);
        });
    }

    // Database Methods - Rides
    async createRide(rideData) {
        if (!this.isConfigured) {
            return this.mockCreateRide(rideData);
        }

        try {
            const { data, error } = await this.supabase
                .from('rides')
                .insert([{
                    ...rideData,
                    created_at: new Date().toISOString()
                }])
                .select();

            if (error) throw error;
            return { success: true, data: data[0] };
        } catch (error) {
            console.error('Create ride error:', error);
            return { success: false, error: error.message };
        }
    }

    async searchRides(filters = {}) {
        if (!this.isConfigured) {
            return this.mockSearchRides(filters);
        }

        try {
            let query = this.supabase
                .from('rides')
                .select(`
                    *,
                    driver:profiles!rides_driver_id_fkey(id, first_name, last_name, phone)
                `)
                .eq('status', 'available');

            // Apply filters
            if (filters.departure_date) {
                query = query.gte('departure_date', filters.departure_date);
            }

            if (filters.available_seats) {
                query = query.gte('available_seats', filters.available_seats);
            }

            const { data, error } = await query;
            if (error) throw error;

            return { success: true, data };
        } catch (error) {
            console.error('Search rides error:', error);
            return { success: false, error: error.message };
        }
    }

    // Real-time subscriptions
    subscribeToRideUpdates(rideId, callback) {
        if (!this.isConfigured) {
            return this.mockSubscribeToRideUpdates(rideId, callback);
        }

        const subscription = this.supabase
            .channel(`ride:${rideId}`)
            .on('postgres_changes',
                { event: '*', schema: 'public', table: 'rides', filter: `id=eq.${rideId}` },
                callback
            )
            .subscribe();

        return subscription;
    }

    subscribeToMessages(rideRequestId, callback) {
        if (!this.isConfigured) {
            return this.mockSubscribeToMessages(rideRequestId, callback);
        }

        const subscription = this.supabase
            .channel(`messages:${rideRequestId}`)
            .on('postgres_changes',
                { event: 'INSERT', schema: 'public', table: 'messages', filter: `ride_request_id=eq.${rideRequestId}` },
                callback
            )
            .subscribe();

        return subscription;
    }

    // Mock methods for development without Supabase
    mockSignUp(email, password, userData) {
        const mockUser = {
            id: 'mock-user-' + Date.now(),
            email,
            ...userData
        };
        localStorage.setItem('supabase_mock_user', JSON.stringify(mockUser));
        return Promise.resolve({ success: true, user: mockUser });
    }

    mockSignIn(email, password) {
        // Simple mock authentication
        const mockUser = {
            id: 'mock-user-' + email.split('@')[0],
            email,
            name: email.split('@')[0]
        };
        localStorage.setItem('supabase_mock_user', JSON.stringify(mockUser));
        return Promise.resolve({ success: true, user: mockUser });
    }

    mockSignOut() {
        localStorage.removeItem('supabase_mock_user');
        return Promise.resolve({ success: true });
    }

    mockGetCurrentUser() {
        const user = localStorage.getItem('supabase_mock_user');
        return Promise.resolve(user ? JSON.parse(user) : null);
    }

    mockCreateUserProfile(userId, profileData) {
        const profile = { id: userId, ...profileData };
        localStorage.setItem(`supabase_mock_profile_${userId}`, JSON.stringify(profile));
        return Promise.resolve({ success: true, data: profile });
    }

    mockGetUserProfile(userId) {
        const profile = localStorage.getItem(`supabase_mock_profile_${userId}`);
        return Promise.resolve({ 
            success: true, 
            data: profile ? JSON.parse(profile) : null 
        });
    }

    mockUpdateUserProfile(userId, profileData) {
        const existingProfile = localStorage.getItem(`supabase_mock_profile_${userId}`);
        const currentProfile = existingProfile ? JSON.parse(existingProfile) : { id: userId };
        const updatedProfile = { ...currentProfile, ...profileData };
        localStorage.setItem(`supabase_mock_profile_${userId}`, JSON.stringify(updatedProfile));
        return Promise.resolve({ success: true, data: updatedProfile });
    }
    
    mockUploadProfilePhoto(userId, file, onProgress) {
        return new Promise((resolve) => {
            // Simulate progress updates
            let progress = 0;
            const interval = setInterval(() => {
                progress += 10;
                if (typeof onProgress === 'function') {
                    onProgress(progress);
                }
                
                if (progress >= 100) {
                    clearInterval(interval);
                    
                    // Create a mock URL for the uploaded file
                    const mockUrl = `mock-storage://user-uploads/profile-photos/${userId}/profile-${Date.now()}.jpg`;
                    const mockPath = `profile-photos/${userId}/profile-${Date.now()}.jpg`;
                    
                    // Return success response
                    resolve({ 
                        success: true, 
                        data: {
                            path: mockPath,
                            url: mockUrl
                        }
                    });
                }
            }, 300);
        });
    }
    
    mockDeleteProfilePhoto(userId, filePath) {
        // Simply return success for mock mode
        return Promise.resolve({ success: true });
    }

    mockCreateRide(rideData) {
        const ride = {
            id: 'ride-' + Date.now(),
            ...rideData,
            created_at: new Date().toISOString()
        };
        
        const existingRides = JSON.parse(localStorage.getItem('supabase_mock_rides') || '[]');
        existingRides.push(ride);
        localStorage.setItem('supabase_mock_rides', JSON.stringify(existingRides));
        
        return Promise.resolve({ success: true, data: ride });
    }

    mockSearchRides(filters) {
        const rides = JSON.parse(localStorage.getItem('supabase_mock_rides') || '[]');
        const filteredRides = rides.filter(ride => ride.status === 'available');
        return Promise.resolve({ success: true, data: filteredRides });
    }

    mockSubscribeToRideUpdates(rideId, callback) {
        // Return a mock subscription object
        return {
            unsubscribe: () => console.log(`Unsubscribed from ride ${rideId}`)
        };
    }

    mockSubscribeToMessages(rideId, callback) {
        // Return a mock subscription object
        return {
            unsubscribe: () => console.log(`Unsubscribed from messages for ride ${rideId}`)
        };
    }
}

// Initialize global Supabase service
window.supabaseService = new SupabaseService();