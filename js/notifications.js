/**
 * Real-time Notifications Service
 * Handles push notifications, live updates, and user alerts
 */

class NotificationService {
    constructor() {
        this.subscribers = new Map();
        this.activeConnections = new Set();
        this.notificationQueue = [];
        this.isOnline = navigator.onLine;
        
        this.init();
    }

    async init() {
        // Setup real-time connection with Supabase
        this.setupRealtimeConnection();
        
        // Setup notification types
        this.setupNotificationTypes();
        
        // Setup network listeners
        this.setupNetworkListeners();
        
        console.log('Notification service initialized');
    }

    setupRealtimeConnection() {
        if (!window.supabaseService || !window.supabaseService.isConfigured) {
            console.log('Supabase not configured, using mock notifications');
            this.setupMockNotifications();
            return;
        }

        // Subscribe to ride-related real-time updates
        this.subscribeToRideUpdates();
        this.subscribeToMessageUpdates();
        this.subscribeToUserUpdates();
    }

    subscribeToRideUpdates() {
        if (!window.authManager?.user?.id) return;

        const userId = window.authManager.user.id;
        
        // Subscribe to rides where user is driver
        const driverSubscription = window.supabaseService.supabase
            ?.channel('driver-ride-updates')
            .on('postgres_changes',
                { 
                    event: '*', 
                    schema: 'public', 
                    table: 'ride_requests',
                    filter: `ride_id=in.(select id from rides where driver_id=eq.${userId})`
                },
                (payload) => this.handleRideRequestUpdate(payload)
            )
            .subscribe();

        // Subscribe to rides where user is passenger
        const passengerSubscription = window.supabaseService.supabase
            ?.channel('passenger-ride-updates')
            .on('postgres_changes',
                { 
                    event: '*', 
                    schema: 'public', 
                    table: 'ride_requests',
                    filter: `passenger_id=eq.${userId}`
                },
                (payload) => this.handleRideStatusUpdate(payload)
            )
            .subscribe();

        if (driverSubscription) this.activeConnections.add(driverSubscription);
        if (passengerSubscription) this.activeConnections.add(passengerSubscription);
    }

    subscribeToMessageUpdates() {
        if (!window.authManager?.user?.id) return;

        const userId = window.authManager.user.id;
        
        const messageSubscription = window.supabaseService.supabase
            ?.channel('chat-messages')
            .on('postgres_changes',
                { 
                    event: 'INSERT', 
                    schema: 'public', 
                    table: 'messages',
                    filter: `ride_id=in.(select ride_id from ride_participants where user_id=eq.${userId})`
                },
                (payload) => this.handleNewMessage(payload)
            )
            .subscribe();

        if (messageSubscription) this.activeConnections.add(messageSubscription);
    }

    subscribeToUserUpdates() {
        if (!window.authManager?.user?.id) return;

        const userId = window.authManager.user.id;
        
        const userSubscription = window.supabaseService.supabase
            ?.channel('user-updates')
            .on('postgres_changes',
                { 
                    event: 'UPDATE', 
                    schema: 'public', 
                    table: 'users',
                    filter: `id=eq.${userId}`
                },
                (payload) => this.handleUserUpdate(payload)
            )
            .subscribe();

        if (userSubscription) this.activeConnections.add(userSubscription);
    }

    setupNotificationTypes() {
        this.notificationTypes = {
            RIDE_REQUEST: {
                title: 'New Ride Request',
                icon: '/icons/icon-192x192.png',
                sound: 'notification',
                priority: 'high'
            },
            RIDE_ACCEPTED: {
                title: 'Ride Request Accepted',
                icon: '/icons/icon-192x192.png',
                sound: 'success',
                priority: 'high'
            },
            RIDE_DECLINED: {
                title: 'Ride Request Declined',
                icon: '/icons/icon-192x192.png',
                sound: 'notification',
                priority: 'medium'
            },
            RIDE_CANCELLED: {
                title: 'Ride Cancelled',
                icon: '/icons/icon-192x192.png',
                sound: 'alert',
                priority: 'high'
            },
            NEW_MESSAGE: {
                title: 'New Message',
                icon: '/icons/icon-192x192.png',
                sound: 'message',
                priority: 'medium'
            },
            RIDE_REMINDER: {
                title: 'Ride Reminder',
                icon: '/icons/icon-192x192.png',
                sound: 'notification',
                priority: 'medium'
            },
            PAYMENT_RECEIVED: {
                title: 'Payment Received',
                icon: '/icons/icon-192x192.png',
                sound: 'success',
                priority: 'low'
            }
        };
    }

    setupNetworkListeners() {
        window.addEventListener('online', () => {
            this.isOnline = true;
            this.processQueuedNotifications();
        });

        window.addEventListener('offline', () => {
            this.isOnline = false;
        });
    }

    // Real-time event handlers
    handleRideRequestUpdate(payload) {
        const { eventType, new: newRecord, old: oldRecord } = payload;
        
        switch (eventType) {
            case 'INSERT':
                this.sendNotification('RIDE_REQUEST', {
                    body: `New ride request from ${newRecord.passenger_name}`,
                    data: { 
                        type: 'ride_request',
                        rideId: newRecord.ride_id,
                        requestId: newRecord.id
                    },
                    actions: [
                        { action: 'accept', title: 'Accept' },
                        { action: 'decline', title: 'Decline' }
                    ]
                });
                break;
                
            case 'UPDATE':
                if (oldRecord.status !== newRecord.status) {
                    this.handleRequestStatusChange(newRecord);
                }
                break;
        }
    }

    handleRideStatusUpdate(payload) {
        const { eventType, new: newRecord } = payload;
        
        if (eventType === 'UPDATE') {
            switch (newRecord.status) {
                case 'accepted':
                    this.sendNotification('RIDE_ACCEPTED', {
                        body: 'Your ride request has been accepted!',
                        data: { 
                            type: 'ride_accepted',
                            rideId: newRecord.ride_id 
                        }
                    });
                    break;
                    
                case 'declined':
                    this.sendNotification('RIDE_DECLINED', {
                        body: 'Your ride request was declined. Keep looking!',
                        data: { 
                            type: 'ride_declined',
                            rideId: newRecord.ride_id 
                        }
                    });
                    break;
            }
        }
    }

    handleNewMessage(payload) {
        try {
            const { new: newMessage } = payload;
            
            // Validate message data
            if (!newMessage || !newMessage.ride_id || !newMessage.content) {
                console.warn('Invalid message payload received:', payload);
                return;
            }
            
            // Filter inappropriate content
            const filteredMessage = this.filterChatMessage(newMessage);
            if (!filteredMessage.allowed) {
                console.log('Message blocked by chat filter:', filteredMessage.reason);
                return;
            }
            
            // Only show notification if not currently viewing the chat
            if (window.app?.currentPage !== 'chat' || 
                window.app?.currentRideId !== newMessage.ride_id) {
                
                this.sendNotification('NEW_MESSAGE', {
                    body: `${newMessage.sender_name || 'User'}: ${filteredMessage.content.substring(0, 50)}...`,
                    data: { 
                        type: 'new_message',
                        rideId: newMessage.ride_id,
                        messageId: newMessage.id
                    }
                });
            }
        } catch (error) {
            console.error('Error handling new message:', error);
        }
    }

    // Chat message filtering system
    filterChatMessage(message) {
        try {
            const content = message.content || '';
            const senderName = message.sender_name || '';
            
            // Define filter rules
            const filterRules = {
                profanity: {
                    patterns: [
                        /\b(fuck|shit|damn|hell|bastard|bitch)\b/gi,
                        /\b(stupid|idiot|moron|dumb)\b/gi
                    ],
                    severity: 'moderate'
                },
                spam: {
                    patterns: [
                        /(.)\1{4,}/g, // Repeated characters (aaaaa)
                        /^\s*(.+?)\s*\1+\s*$/g, // Repeated text
                        /[A-Z]{5,}/g // Excessive caps
                    ],
                    severity: 'low'
                },
                personalInfo: {
                    patterns: [
                        /\b\d{3}[-.]?\d{3}[-.]?\d{4}\b/g, // Phone numbers
                        /\b[A-Za-z0-9._%+-]+@[A-Za-z0-9.-]+\.[A-Z|a-z]{2,}\b/g, // Email addresses
                        /\b\d{1,5}\s+[\w\s]+(?:street|st|avenue|ave|road|rd|lane|ln|drive|dr|court|ct|place|pl)\b/gi // Addresses
                    ],
                    severity: 'high'
                }
            };
            
            // Apply filters
            let filteredContent = content;
            let blocked = false;
            let reason = '';
            
            // Check each filter rule
            for (const [filterType, rule] of Object.entries(filterRules)) {
                for (const pattern of rule.patterns) {
                    if (pattern.test(content)) {
                        if (rule.severity === 'high') {
                            blocked = true;
                            reason = `Blocked: Contains ${filterType}`;
                            break;
                        } else if (rule.severity === 'moderate') {
                            // Replace with asterisks
                            filteredContent = filteredContent.replace(pattern, (match) => '*'.repeat(match.length));
                        } else if (rule.severity === 'low') {
                            // Just log warning
                            console.warn(`Potential ${filterType} detected in message:`, message.id);
                        }
                    }
                }
                if (blocked) break;
            }
            
            return {
                allowed: !blocked,
                content: filteredContent,
                reason: reason,
                originalContent: content,
                filtered: filteredContent !== content
            };
            
        } catch (error) {
            console.error('Chat filter error:', error);
            // Default to blocking on error
            return {
                allowed: false,
                content: '',
                reason: 'Filter error - message blocked for safety',
                originalContent: message.content || '',
                filtered: true
            };
        }
    }

    handleUserUpdate(payload) {
        const { new: newUser } = payload;
        
        // Handle verification status changes
        if (newUser.driver_verified === true) {
            this.sendNotification('VERIFICATION_COMPLETE', {
                title: 'Driver Verification Complete',
                body: 'You can now offer rides to passengers!',
                data: { type: 'verification_complete' }
            });
        }
    }

    // Notification methods
    async sendNotification(type, options = {}) {
        const notificationType = this.notificationTypes[type];
        if (!notificationType) {
            console.error('Unknown notification type:', type);
            return;
        }

        const notification = {
            id: this.generateNotificationId(),
            type,
            title: options.title || notificationType.title,
            body: options.body || '',
            icon: options.icon || notificationType.icon,
            data: options.data || {},
            actions: options.actions || [],
            timestamp: new Date().toISOString(),
            read: false
        };

        // Store notification locally
        this.storeNotification(notification);

        // Show browser notification if supported and permitted
        await this.showBrowserNotification(notification);

        // Show in-app notification
        this.showInAppNotification(notification);

        // Trigger callbacks for subscribers
        this.notifySubscribers(type, notification);

        // Play sound
        this.playNotificationSound(notificationType.sound);
    }

    async showBrowserNotification(notification) {
        if (!('Notification' in window) || Notification.permission !== 'granted') {
            return;
        }

        try {
            if (window.pwaService?.swRegistration) {
                // Use service worker for better reliability
                await window.pwaService.swRegistration.showNotification(
                    notification.title,
                    {
                        body: notification.body,
                        icon: notification.icon,
                        badge: '/icons/icon-72x72.png',
                        data: notification.data,
                        actions: notification.actions,
                        tag: notification.type,
                        renotify: true
                    }
                );
            } else {
                // Fallback to regular notification
                new Notification(notification.title, {
                    body: notification.body,
                    icon: notification.icon,
                    data: notification.data
                });
            }
        } catch (error) {
            console.error('Browser notification failed:', error);
        }
    }

    showInAppNotification(notification) {
        // Create in-app notification element
        const notificationElement = document.createElement('div');
        notificationElement.className = `
            fixed top-4 right-4 max-w-sm bg-white border border-gray-200 rounded-lg shadow-lg p-4 z-50
            transform translate-x-full transition-transform duration-300 ease-in-out
        `;
        
        notificationElement.innerHTML = `
            <div class="flex items-start">
                <div class="flex-shrink-0">
                    <div class="w-8 h-8 bg-green-100 rounded-full flex items-center justify-center">
                        <i class="fas fa-bell text-green-600"></i>
                    </div>
                </div>
                <div class="ml-3 flex-1">
                    <h4 class="text-sm font-semibold text-gray-900">${notification.title}</h4>
                    <p class="text-sm text-gray-600 mt-1">${notification.body}</p>
                    ${notification.actions.length > 0 ? `
                        <div class="mt-3 flex space-x-2">
                            ${notification.actions.map(action => `
                                <button class="notification-action text-xs bg-green-600 text-white px-3 py-1 rounded hover:bg-green-700" 
                                        data-action="${action.action}" data-notification-id="${notification.id}">
                                    ${action.title}
                                </button>
                            `).join('')}
                        </div>
                    ` : ''}
                </div>
                <button class="ml-3 flex-shrink-0 text-gray-400 hover:text-gray-600" onclick="this.parentElement.parentElement.remove()">
                    <i class="fas fa-times"></i>
                </button>
            </div>
        `;

        document.body.appendChild(notificationElement);

        // Animate in
        setTimeout(() => {
            notificationElement.classList.remove('translate-x-full');
        }, 100);

        // Setup action handlers
        notificationElement.querySelectorAll('.notification-action').forEach(button => {
            button.addEventListener('click', (e) => {
                const action = e.target.dataset.action;
                const notificationId = e.target.dataset.notificationId;
                this.handleNotificationAction(notificationId, action);
                notificationElement.remove();
            });
        });

        // Auto-remove after 5 seconds
        setTimeout(() => {
            if (notificationElement.parentNode) {
                notificationElement.classList.add('translate-x-full');
                setTimeout(() => notificationElement.remove(), 300);
            }
        }, 5000);
    }

    handleNotificationAction(notificationId, action) {
        const notification = this.getStoredNotification(notificationId);
        if (!notification) return;

        switch (action) {
            case 'accept':
                if (notification.data.type === 'ride_request') {
                    this.acceptRideRequest(notification.data.requestId);
                }
                break;
                
            case 'decline':
                if (notification.data.type === 'ride_request') {
                    this.declineRideRequest(notification.data.requestId);
                }
                break;
                
            case 'view':
                this.navigateToNotificationSource(notification);
                break;
        }
    }

    async acceptRideRequest(requestId) {
        try {
            // Call ride manager to accept request
            if (window.ridesManager) {
                await window.ridesManager.respondToRequest(requestId, 'accepted');
                this.showSuccessToast('Ride request accepted!');
            }
        } catch (error) {
            console.error('Failed to accept ride request:', error);
            this.showErrorToast('Failed to accept ride request');
        }
    }

    async declineRideRequest(requestId) {
        try {
            // Call ride manager to decline request
            if (window.ridesManager) {
                await window.ridesManager.respondToRequest(requestId, 'declined');
                this.showSuccessToast('Ride request declined');
            }
        } catch (error) {
            console.error('Failed to decline ride request:', error);
            this.showErrorToast('Failed to decline ride request');
        }
    }

    navigateToNotificationSource(notification) {
        switch (notification.data.type) {
            case 'ride_request':
            case 'ride_accepted':
            case 'ride_declined':
                if (window.app) {
                    window.app.showPage('dashboard');
                }
                break;
                
            case 'new_message':
                if (window.app && notification.data.rideId) {
                    window.app.showPage('chat');
                    window.app.loadChat(notification.data.rideId);
                }
                break;
        }
    }

    playNotificationSound(soundType) {
        // Create audio element for notification sound
        try {
            const audio = new Audio();
            switch (soundType) {
                case 'success':
                    // Use a success sound or default system sound
                    break;
                case 'alert':
                    // Use an alert sound
                    break;
                case 'message':
                    // Use a message sound
                    break;
                default:
                    // Use default notification sound
                    break;
            }
            // audio.play(); // Uncomment when audio files are available
        } catch (error) {
            console.log('Notification sound not available');
        }
    }

    // Subscription management
    subscribe(eventType, callback) {
        if (!this.subscribers.has(eventType)) {
            this.subscribers.set(eventType, new Set());
        }
        this.subscribers.get(eventType).add(callback);
        
        return () => {
            this.subscribers.get(eventType)?.delete(callback);
        };
    }

    notifySubscribers(eventType, data) {
        const subscribers = this.subscribers.get(eventType);
        if (subscribers) {
            subscribers.forEach(callback => {
                try {
                    callback(data);
                } catch (error) {
                    console.error('Subscriber callback error:', error);
                }
            });
        }
    }

    // Storage management
    storeNotification(notification) {
        const stored = this.getStoredNotifications();
        stored.unshift(notification);
        
        // Keep only last 50 notifications
        if (stored.length > 50) {
            stored.splice(50);
        }
        
        localStorage.setItem('ongopool_notifications', JSON.stringify(stored));
    }

    getStoredNotifications() {
        try {
            return JSON.parse(localStorage.getItem('ongopool_notifications') || '[]');
        } catch (error) {
            return [];
        }
    }

    getStoredNotification(id) {
        const stored = this.getStoredNotifications();
        return stored.find(n => n.id === id);
    }

    markNotificationAsRead(id) {
        const stored = this.getStoredNotifications();
        const notification = stored.find(n => n.id === id);
        if (notification) {
            notification.read = true;
            localStorage.setItem('ongopool_notifications', JSON.stringify(stored));
        }
    }

    getUnreadCount() {
        const stored = this.getStoredNotifications();
        return stored.filter(n => !n.read).length;
    }

    // Mock notifications for development
    setupMockNotifications() {
        // Simulate real-time notifications for development
        setInterval(() => {
            if (Math.random() < 0.1) { // 10% chance every interval
                this.sendMockNotification();
            }
        }, 30000); // Check every 30 seconds
    }

    sendMockNotification() {
        const mockNotifications = [
            {
                type: 'RIDE_REQUEST',
                body: 'New ride request from Sarah M.',
                data: { type: 'ride_request', rideId: 'mock-ride-1' }
            },
            {
                type: 'NEW_MESSAGE',
                body: 'John D.: What time should we meet?',
                data: { type: 'new_message', rideId: 'mock-ride-2' }
            },
            {
                type: 'PAYMENT_RECEIVED',
                body: 'Payment of $15.00 received',
                data: { type: 'payment_received' }
            }
        ];

        const randomNotification = mockNotifications[Math.floor(Math.random() * mockNotifications.length)];
        this.sendNotification(randomNotification.type, randomNotification);
    }

    // Utility methods
    generateNotificationId() {
        return 'notif-' + Date.now() + '-' + Math.random().toString(36).substr(2, 9);
    }

    showSuccessToast(message) {
        this.showToast(message, 'success');
    }

    showErrorToast(message) {
        this.showToast(message, 'error');
    }

    showToast(message, type = 'info') {
        const toast = document.createElement('div');
        toast.className = `
            fixed bottom-4 right-4 max-w-sm bg-white border rounded-lg shadow-lg p-4 z-50
            transform translate-y-full transition-transform duration-300 ease-in-out
            ${type === 'success' ? 'border-green-200' : type === 'error' ? 'border-red-200' : 'border-gray-200'}
        `;
        
        toast.innerHTML = `
            <div class="flex items-center">
                <div class="flex-shrink-0">
                    <i class="fas ${type === 'success' ? 'fa-check-circle text-green-600' : 
                                    type === 'error' ? 'fa-exclamation-circle text-red-600' : 
                                    'fa-info-circle text-blue-600'}"></i>
                </div>
                <div class="ml-3 flex-1">
                    <p class="text-sm text-gray-900">${message}</p>
                </div>
            </div>
        `;

        document.body.appendChild(toast);

        // Animate in
        setTimeout(() => {
            toast.classList.remove('translate-y-full');
        }, 100);

        // Auto-remove after 3 seconds
        setTimeout(() => {
            if (toast.parentNode) {
                toast.classList.add('translate-y-full');
                setTimeout(() => toast.remove(), 300);
            }
        }, 3000);
    }

    processQueuedNotifications() {
        if (this.notificationQueue.length > 0) {
            console.log(`Processing ${this.notificationQueue.length} queued notifications`);
            this.notificationQueue.forEach(notification => {
                this.sendNotification(notification.type, notification.options);
            });
            this.notificationQueue = [];
        }
    }

    // Cleanup
    destroy() {
        // Unsubscribe from all real-time connections
        this.activeConnections.forEach(connection => {
            try {
                connection.unsubscribe();
            } catch (error) {
                console.error('Error unsubscribing:', error);
            }
        });
        
        this.activeConnections.clear();
        this.subscribers.clear();
    }
}

// Initialize notification service
window.notificationService = new NotificationService();