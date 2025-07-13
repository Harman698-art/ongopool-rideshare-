// OnGoPool Authentication Module

class AuthManager {
    constructor() {
        this.user = null;
        this.initSupabase();
    }

    initSupabase() {
        // Wait for Supabase service to be available
        if (typeof window.supabaseService !== 'undefined') {
            this.supabase = window.supabaseService;
            console.log('Authentication manager initialized with Supabase');
            this.checkCurrentSession();
        } else {
            // Retry after a short delay
            setTimeout(() => this.initSupabase(), 100);
        }
    }

    async checkCurrentSession() {
        try {
            const user = await this.supabase.getCurrentUser();
            if (user) {
                this.user = user;
                // Get full profile data
                const profileResult = await this.supabase.getUserProfile(user.id);
                if (profileResult.success) {
                    this.user.profile = profileResult.data;
                }
                console.log('Current user session found:', this.user);
            }
        } catch (error) {
            console.error('Session check error:', error);
        }
    }

    async signUp(userData) {
        try {
            const { name, email, phone, password, role } = userData;

            // Validate input
            if (!this.validateSignupData(userData)) {
                throw new Error('Invalid signup data');
            }

            // Use Supabase service for authentication
            const authResult = await window.supabaseService.signUp(email, password, {
                name,
                phone,
                role
            });

            if (!authResult.success) {
                throw new Error(authResult.error);
            }

            // Store minimal user data - full profile will be created on email verification
            this.user = {
                id: authResult.user.id,
                email: authResult.user.email,
                name: name,
                first_name: name.split(' ')[0] || name,
                last_name: name.split(' ').slice(1).join(' ') || '',
                phone: phone,
                role: role,
                email_confirmed: false,
                created_at: new Date().toISOString()
            };
            
            // Don't save to storage yet - wait for email verification
            
            return { 
                user: this.user, 
                error: null,
                needsEmailVerification: true 
            };

        } catch (error) {
            console.error('Signup error:', error);
            return { user: null, error: error.message };
        }
    }

    async signIn(email, password) {
        try {
            // Validate input
            if (!email || !password) {
                throw new Error('Email and password are required');
            }

            if (!this.isValidEmail(email)) {
                throw new Error('Invalid email format');
            }

            // Use Supabase service for authentication
            const authResult = await window.supabaseService.signIn(email, password);

            if (!authResult.success) {
                throw new Error(authResult.error);
            }

            // Get user profile from database
            let profileResult = await this.supabase.getUserProfile(authResult.user.id);
            
            let userProfile = null;
            if (profileResult.success && profileResult.data) {
                userProfile = {
                    id: profileResult.data.id,
                    email: authResult.user.email,
                    name: `${profileResult.data.first_name} ${profileResult.data.last_name}`.trim(),
                    first_name: profileResult.data.first_name,
                    last_name: profileResult.data.last_name,
                    phone: profileResult.data.phone,
                    role: profileResult.data.role,
                    created_at: profileResult.data.created_at,
                    updated_at: profileResult.data.updated_at
                };
            } else {
                // Profile doesn't exist - create one for verified users
                console.warn('Profile not found for user, creating default profile');
                
                // Get role from auth metadata - this contains the correct role from signup
                const roleFromMetadata = authResult.user.user_metadata?.role || 'passenger';
                
                const defaultProfileData = {
                    first_name: authResult.user.user_metadata?.name?.split(' ')[0] || email.split('@')[0],
                    last_name: authResult.user.user_metadata?.name?.split(' ').slice(1).join(' ') || '',
                    phone: authResult.user.user_metadata?.phone || '',
                    role: roleFromMetadata,
                    email: authResult.user.email
                };
                
                const createResult = await this.supabase.createUserProfile(authResult.user.id, defaultProfileData);
                
                if (createResult.success) {
                    userProfile = {
                        id: authResult.user.id,
                        email: authResult.user.email,
                        name: `${defaultProfileData.first_name} ${defaultProfileData.last_name}`.trim(),
                        ...defaultProfileData,
                        created_at: createResult.data.created_at,
                        updated_at: createResult.data.updated_at
                    };
                } else {
                    // Fallback to basic profile if creation fails
                    userProfile = {
                        id: authResult.user.id,
                        email: authResult.user.email,
                        name: email.split('@')[0],
                        first_name: email.split('@')[0],
                        last_name: '',
                        phone: '',
                        role: roleFromMetadata,
                        created_at: new Date().toISOString()
                    };
                }
            }

            this.user = userProfile;
            this.saveUserToStorage(userProfile);

            return { user: userProfile, error: null };

        } catch (error) {
            console.error('Signin error:', error);
            return { user: null, error: error.message };
        }
    }

    async signOut() {
        try {
            // Use Supabase service for sign out
            const result = await this.supabase.signOut();
            
            // Clear local storage
            this.clearUserFromStorage();
            this.user = null;

            if (!result.success) {
                console.warn('Supabase signout warning:', result.error);
            }

            return { error: null };

        } catch (error) {
            console.error('Signout error:', error);
            return { error: error.message };
        }
    }

    async resetPassword(email) {
        try {
            if (!this.isValidEmail(email)) {
                throw new Error('Invalid email format');
            }

            // Mock password reset (replace with actual Supabase auth)
            await this.delay(1000);

            // In a real app, this would send a password reset email
            console.log('Password reset email would be sent to:', email);

            return { error: null };

        } catch (error) {
            console.error('Password reset error:', error);
            return { error: error.message };
        }
    }

    async updateProfile(updates) {
        try {
            if (!this.user) {
                throw new Error('User not authenticated');
            }

            // Validate updates
            if (updates.email && !this.isValidEmail(updates.email)) {
                throw new Error('Invalid email format');
            }

            if (updates.phone && !this.isValidPhone(updates.phone)) {
                throw new Error('Invalid phone number format');
            }

            // Mock profile update (replace with actual Supabase update)
            const updatedUser = {
                ...this.user,
                ...updates,
                updated_at: new Date().toISOString()
            };

            await this.delay(500);

            this.user = updatedUser;
            this.saveUserToStorage(updatedUser);

            return { user: updatedUser, error: null };

        } catch (error) {
            console.error('Profile update error:', error);
            return { user: null, error: error.message };
        }
    }

    async verifyDriverDocuments(documents) {
        try {
            if (!this.user) {
                throw new Error('User not authenticated');
            }

            // Validate required documents
            const requiredDocs = ['drivers_license', 'vehicle_registration', 'insurance'];
            const missingDocs = requiredDocs.filter(doc => !documents[doc]);

            if (missingDocs.length > 0) {
                throw new Error(`Missing required documents: ${missingDocs.join(', ')}`);
            }

            // Mock document verification process
            await this.delay(2000);

            const updatedUser = {
                ...this.user,
                profile: {
                    ...this.user.profile,
                    driver_verified: true,
                    documents: {
                        ...documents,
                        verified_at: new Date().toISOString(),
                        status: 'verified'
                    }
                },
                updated_at: new Date().toISOString()
            };

            this.user = updatedUser;
            this.saveUserToStorage(updatedUser);

            return { user: updatedUser, error: null };

        } catch (error) {
            console.error('Document verification error:', error);
            return { user: null, error: error.message };
        }
    }

    getCurrentUser() {
        return this.user;
    }

    isAuthenticated() {
        return this.user !== null;
    }

    hasRole(role) {
        if (!this.user) return false;
        
        switch (role) {
            case 'passenger':
                return ['passenger', 'both'].includes(this.user.role);
            case 'driver':
                return ['driver', 'both'].includes(this.user.role);
            case 'admin':
                return this.user.role === 'admin';
            default:
                return false;
        }
    }

    isDriverVerified() {
        return this.user?.profile?.driver_verified === true;
    }

    // Validation helpers
    validateSignupData(data) {
        const { name, email, phone, password, role } = data;

        if (!name || name.trim().length < 2) {
            throw new Error('Name must be at least 2 characters');
        }

        if (!this.isValidEmail(email)) {
            throw new Error('Invalid email format');
        }

        if (!this.isValidPhone(phone)) {
            throw new Error('Invalid phone number format');
        }

        if (!password || password.length < 6) {
            throw new Error('Password must be at least 6 characters');
        }

        if (!['passenger', 'driver', 'both'].includes(role)) {
            throw new Error('Invalid role selected');
        }

        return true;
    }

    isValidEmail(email) {
        const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
        return emailRegex.test(email);
    }

    isValidPhone(phone) {
        // Canadian phone number format
        const phoneRegex = /^(\+1|1)?[-.\s]?\(?([0-9]{3})\)?[-.\s]?([0-9]{3})[-.\s]?([0-9]{4})$/;
        return phoneRegex.test(phone);
    }

    // Storage helpers
    saveUserToStorage(user) {
        try {
            // Set the role property specifically to ensure it's not lost
            if (user && !user.role && user.profile && user.profile.role) {
                user.role = user.profile.role;
            }
            
            localStorage.setItem('ongopool_user', JSON.stringify(user));
            localStorage.setItem('ongopool_auth_timestamp', Date.now().toString());
            
            // Also make the user data available to the main app
            if (window.app && user) {
                window.app.currentUser = user;
            }
        } catch (error) {
            console.error('Failed to save user to storage:', error);
        }
    }

    loadUserFromStorage() {
        try {
            const userData = localStorage.getItem('ongopool_user');
            const timestamp = localStorage.getItem('ongopool_auth_timestamp');

            if (!userData || !timestamp) {
                return null;
            }

            // Check if session has expired (7 days)
            const sessionAge = Date.now() - parseInt(timestamp);
            const maxAge = 7 * 24 * 60 * 60 * 1000; // 7 days in milliseconds

            if (sessionAge > maxAge) {
                this.clearUserFromStorage();
                return null;
            }

            const user = JSON.parse(userData);
            this.user = user;
            return user;

        } catch (error) {
            console.error('Failed to load user from storage:', error);
            this.clearUserFromStorage();
            return null;
        }
    }

    clearUserFromStorage() {
        try {
            localStorage.removeItem('ongopool_user');
            localStorage.removeItem('ongopool_auth_timestamp');
        } catch (error) {
            console.error('Failed to clear user from storage:', error);
        }
    }

    // Mock email service
    async sendVerificationEmail(email) {
        console.log(`Verification email would be sent to: ${email}`);
        // In a real app, this would trigger an email through Supabase Auth
        return Promise.resolve();
    }

    // Utility functions
    generateUserId() {
        return 'user_' + Date.now() + '_' + Math.random().toString(36).substr(2, 9);
    }

    delay(ms) {
        return new Promise(resolve => setTimeout(resolve, ms));
    }

    // Enhanced role system methods
    getRolePermissions(role) {
        const permissions = {
            passenger: [
                'search_rides',
                'book_rides',
                'chat_with_driver',
                'rate_driver',
                'view_trip_history',
                'cancel_booking'
            ],
            driver: [
                'post_rides',
                'accept_passengers',
                'chat_with_passengers',
                'receive_payments',
                'view_earnings',
                'cancel_ride',
                'manage_vehicle'
            ],
            both: [
                'search_rides',
                'book_rides',
                'post_rides',
                'accept_passengers',
                'chat_with_driver',
                'chat_with_passengers',
                'rate_driver',
                'rate_passenger',
                'view_trip_history',
                'receive_payments',
                'view_earnings',
                'cancel_booking',
                'cancel_ride',
                'manage_vehicle'
            ],
            admin: [
                'search_rides',
                'book_rides',
                'post_rides',
                'accept_passengers',
                'chat_with_driver',
                'chat_with_passengers',
                'rate_driver',
                'rate_passenger',
                'view_trip_history',
                'receive_payments',
                'view_earnings',
                'cancel_booking',
                'cancel_ride',
                'manage_vehicle',
                'manage_users',
                'verify_drivers',
                'view_analytics',
                'handle_disputes',
                'override_trip_limits',
                'access_admin_panel'
            ],
            moderator: [
                'search_rides',
                'book_rides',
                'chat_with_driver',
                'chat_with_passengers',
                'view_trip_history',
                'handle_disputes',
                'moderate_content',
                'suspend_users',
                'access_support_tools'
            ]
        };

        return permissions[role] || permissions.passenger;
    }

    hasPermission(permission) {
        if (!this.user || !this.user.permissions) {
            return false;
        }
        return this.user.permissions.includes(permission);
    }

    canAccessAdminPanel() {
        return this.hasPermission('access_admin_panel');
    }

    canVerifyDrivers() {
        return this.hasPermission('verify_drivers');
    }

    canHandleDisputes() {
        return this.hasPermission('handle_disputes');
    }

    canOverrideTripLimits() {
        return this.hasPermission('override_trip_limits');
    }

    getAccessibleFeatures() {
        const features = {
            basic: ['dashboard', 'profile', 'help'],
            passenger: ['find_rides', 'my_bookings', 'chat'],
            driver: ['offer_ride', 'my_rides', 'earnings', 'vehicle_management'],
            admin: ['admin_panel', 'user_management', 'analytics', 'dispute_resolution'],
            moderator: ['content_moderation', 'user_support', 'dispute_handling']
        };

        let accessibleFeatures = [...features.basic];

        if (this.user && this.user.permissions) {
            if (this.hasPermission('search_rides')) {
                accessibleFeatures.push(...features.passenger);
            }
            
            if (this.hasPermission('post_rides')) {
                accessibleFeatures.push(...features.driver);
            }
            
            if (this.hasPermission('access_admin_panel')) {
                accessibleFeatures.push(...features.admin);
            }
            
            if (this.hasPermission('moderate_content')) {
                accessibleFeatures.push(...features.moderator);
            }
        }

        return [...new Set(accessibleFeatures)];
    }

    // Initialize on load
    init() {
        // Try to load existing user session
        const user = this.loadUserFromStorage();
        if (user) {
            console.log('User session restored:', user.email);
            return user;
        }
        return null;
    }
}

// Initialize auth manager
window.authManager = new AuthManager();
window.AuthManager = AuthManager;