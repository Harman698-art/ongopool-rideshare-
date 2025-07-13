/**
 * PWA (Progressive Web App) Service
 * Handles service worker registration, offline functionality, and notifications
 */

class PWAService {
    constructor() {
        this.swRegistration = null;
        this.isOnline = navigator.onLine;
        this.notificationsEnabled = false;
        this.init();
    }

    async init() {
        // Register service worker
        await this.registerServiceWorker();
        
        // Setup online/offline listeners
        this.setupNetworkListeners();
        
        // Setup notification permission
        this.setupNotifications();
        
        // Setup install prompt
        this.setupInstallPrompt();
        
        console.log('PWA Service initialized');
    }

    async registerServiceWorker() {
        if ('serviceWorker' in navigator) {
            try {
                // Check if we're on localhost or a secure origin
                const isSecureOrigin = location.protocol === 'https:' || 
                                     location.hostname === 'localhost' || 
                                     location.hostname === '127.0.0.1';
                
                // Skip service worker registration for file:// protocol
                if (location.protocol === 'file:') {
                    console.log('Service Worker skipped: file:// protocol not supported');
                    return;
                }
                
                if (!isSecureOrigin) {
                    console.log('Service Worker skipped: requires secure origin (HTTPS or localhost)');
                    return;
                }
                
                this.swRegistration = await navigator.serviceWorker.register('/sw.js');
                console.log('Service Worker registered successfully');
                
                // Listen for service worker updates
                this.swRegistration.addEventListener('updatefound', () => {
                    console.log('Service Worker update found');
                    this.showUpdateNotification();
                });
                
                // Handle service worker messages
                navigator.serviceWorker.addEventListener('message', event => {
                    this.handleServiceWorkerMessage(event.data);
                });
                
            } catch (error) {
                console.error('Service Worker registration failed:', error);
            }
        } else {
            console.log('Service Worker not supported in this browser');
        }
    }

    setupNetworkListeners() {
        window.addEventListener('online', () => {
            this.isOnline = true;
            console.log('App is online');
            this.showNetworkStatus('back online', 'success');
            this.syncOfflineData();
        });

        window.addEventListener('offline', () => {
            this.isOnline = false;
            console.log('App is offline');
            this.showNetworkStatus('offline - limited functionality', 'warning');
        });
    }

    async setupNotifications() {
        if ('Notification' in window && 'serviceWorker' in navigator) {
            const permission = await this.requestNotificationPermission();
            this.notificationsEnabled = permission === 'granted';
            
            if (this.notificationsEnabled && this.swRegistration) {
                this.setupPushSubscription();
            }
        }
    }

    async requestNotificationPermission() {
        if (Notification.permission === 'default') {
            return await Notification.requestPermission();
        }
        return Notification.permission;
    }

    async setupPushSubscription() {
        try {
            // This would be configured with your push service (e.g., Firebase, OneSignal)
            const vapidPublicKey = 'YOUR_VAPID_PUBLIC_KEY'; // Replace with actual key
            
            const subscription = await this.swRegistration.pushManager.subscribe({
                userVisibleOnly: true,
                applicationServerKey: this.urlBase64ToUint8Array(vapidPublicKey)
            });
            
            console.log('Push subscription created:', subscription);
            
            // Send subscription to your server
            await this.sendSubscriptionToServer(subscription);
            
        } catch (error) {
            console.error('Push subscription failed:', error);
        }
    }

    setupInstallPrompt() {
        let deferredPrompt;
        
        window.addEventListener('beforeinstallprompt', event => {
            console.log('Install prompt available');
            event.preventDefault();
            deferredPrompt = event;
            this.showInstallButtons(deferredPrompt);
        });

        window.addEventListener('appinstalled', () => {
            console.log('PWA was installed');
            this.hideInstallButtons();
            this.trackInstallation();
        });

        // Setup device-specific install buttons
        this.setupDeviceSpecificInstall();
    }

    setupDeviceSpecificInstall() {
        // Detect device type and show appropriate install buttons
        const isIOS = /iPad|iPhone|iPod/.test(navigator.userAgent) && !window.MSStream;
        const isAndroid = /Android/.test(navigator.userAgent);
        const isStandalone = window.matchMedia('(display-mode: standalone)').matches || window.navigator.standalone;
        
        // Don't show install buttons if already installed
        if (isStandalone) {
            console.log('App is already installed');
            return;
        }

        // Show install section on onboarding page
        const installSection = document.querySelector('.install-section');
        if (installSection) {
            installSection.style.display = 'block';
            installSection.classList.add('show');
        }

        // Show header install buttons
        this.showHeaderInstallButtons();
        
        // Show profile menu install item
        this.showProfileInstallItem();

        // Setup device-specific buttons
        if (isIOS) {
            this.setupIOSInstall();
        } else if (isAndroid) {
            this.setupAndroidInstall();
        } else {
            this.setupDesktopInstall();
        }
    }

    showHeaderInstallButtons() {
        const dashboardBtn = document.getElementById('dashboard-install-btn');
        const driverDashboardBtn = document.getElementById('driver-dashboard-install-btn');
        
        if (dashboardBtn) {
            dashboardBtn.style.display = 'flex';
        }
        
        if (driverDashboardBtn) {
            driverDashboardBtn.style.display = 'flex';
        }
    }

    showProfileInstallItem() {
        const profileInstallItem = document.getElementById('profile-install-item');
        if (profileInstallItem) {
            profileInstallItem.style.display = 'flex';
        }
    }

    showInstallOptions() {
        // Create a modal with install options
        const modal = document.createElement('div');
        modal.id = 'install-modal';
        modal.className = 'install-modal';
        modal.innerHTML = `
            <div class="install-modal-content">
                <div class="install-modal-header">
                    <h3>Install OnGoPool</h3>
                    <button class="install-modal-close" onclick="this.closest('.install-modal').remove()">
                        <i class="fas fa-times"></i>
                    </button>
                </div>
                <div class="install-modal-body">
                    <p>Get the full app experience with offline access and push notifications.</p>
                    <div class="install-options">
                        <button id="modal-pwa-install" class="btn-install" style="display: none;">
                            <i class="fas fa-download"></i>
                            <span>Install App</span>
                        </button>
                        <button id="modal-ios-install" class="btn-install ios-only" style="display: none;">
                            <i class="fab fa-apple"></i>
                            <span>Add to Home Screen</span>
                        </button>
                        <button id="modal-android-install" class="btn-install android-only" style="display: none;">
                            <i class="fab fa-android"></i>
                            <span>Install App</span>
                        </button>
                    </div>
                    <div id="modal-install-instructions" class="install-instructions" style="display: none;">
                        <div class="instruction-steps">
                            <p class="instruction-title">To install on your device:</p>
                            <div class="ios-instructions" style="display: none;">
                                <p>1. Tap the Share button <i class="fas fa-share"></i></p>
                                <p>2. Select "Add to Home Screen"</p>
                                <p>3. Tap "Add" to install</p>
                            </div>
                            <div class="android-instructions" style="display: none;">
                                <p>1. Tap the menu button ⋮</p>
                                <p>2. Select "Add to Home Screen" or "Install App"</p>
                                <p>3. Tap "Add" to install</p>
                            </div>
                        </div>
                    </div>
                </div>
            </div>
        `;
        
        document.body.appendChild(modal);
        
        // Setup modal install buttons
        this.setupModalInstallButtons();
        
        // Auto-remove modal after 15 seconds
        setTimeout(() => {
            if (modal.parentNode) {
                modal.remove();
            }
        }, 15000);
    }

    setupModalInstallButtons() {
        const isIOS = /iPad|iPhone|iPod/.test(navigator.userAgent) && !window.MSStream;
        const isAndroid = /Android/.test(navigator.userAgent);
        
        const modalPwaBtn = document.getElementById('modal-pwa-install');
        const modalIosBtn = document.getElementById('modal-ios-install');
        const modalAndroidBtn = document.getElementById('modal-android-install');
        const modalInstructions = document.getElementById('modal-install-instructions');
        
        if (isIOS && modalIosBtn) {
            modalIosBtn.style.display = 'flex';
            modalIosBtn.addEventListener('click', () => {
                const iosInstructions = modalInstructions?.querySelector('.ios-instructions');
                if (modalInstructions && iosInstructions) {
                    modalInstructions.style.display = 'block';
                    iosInstructions.style.display = 'block';
                }
            });
        } else if (isAndroid && modalAndroidBtn) {
            modalAndroidBtn.style.display = 'flex';
            modalAndroidBtn.addEventListener('click', () => {
                const androidInstructions = modalInstructions?.querySelector('.android-instructions');
                if (modalInstructions && androidInstructions) {
                    modalInstructions.style.display = 'block';
                    androidInstructions.style.display = 'block';
                }
            });
        } else if (modalPwaBtn) {
            modalPwaBtn.style.display = 'flex';
            modalPwaBtn.addEventListener('click', () => {
                if (this.deferredPrompt) {
                    this.deferredPrompt.prompt();
                    this.deferredPrompt.userChoice.then((choiceResult) => {
                        if (choiceResult.outcome === 'accepted') {
                            console.log('User accepted the install prompt');
                            document.getElementById('install-modal')?.remove();
                        }
                    });
                }
            });
        }
    }

    setupIOSInstall() {
        const iosBtn = document.getElementById('ios-install-btn');
        const instructions = document.getElementById('install-instructions');
        const iosInstructions = instructions?.querySelector('.ios-instructions');
        
        if (iosBtn) {
            iosBtn.style.display = 'flex';
            iosBtn.addEventListener('click', () => {
                if (instructions && iosInstructions) {
                    instructions.style.display = 'block';
                    iosInstructions.style.display = 'block';
                    iosBtn.textContent = 'See Instructions Above';
                    iosBtn.style.background = '#059669';
                }
            });
        }
    }

    setupAndroidInstall() {
        const androidBtn = document.getElementById('android-install-btn');
        const instructions = document.getElementById('install-instructions');
        const androidInstructions = instructions?.querySelector('.android-instructions');
        
        if (androidBtn) {
            androidBtn.style.display = 'flex';
            androidBtn.addEventListener('click', () => {
                if (instructions && androidInstructions) {
                    instructions.style.display = 'block';
                    androidInstructions.style.display = 'block';
                    androidBtn.textContent = 'See Instructions Above';
                    androidBtn.style.background = '#059669';
                }
            });
        }
    }

    setupDesktopInstall() {
        // Desktop browsers will use the PWA install button when available
        console.log('Desktop browser detected - waiting for beforeinstallprompt');
    }

    showInstallButtons(deferredPrompt) {
        this.deferredPrompt = deferredPrompt;
        
        const pwaBtn = document.getElementById('pwa-install-btn');
        
        if (pwaBtn) {
            pwaBtn.style.display = 'flex';
            pwaBtn.addEventListener('click', async () => {
                try {
                    deferredPrompt.prompt();
                    const { outcome } = await deferredPrompt.userChoice;
                    console.log('Install prompt outcome:', outcome);
                    
                    if (outcome === 'accepted') {
                        this.hideInstallButtons();
                    }
                } catch (error) {
                    console.error('Install prompt failed:', error);
                }
            });
        }

        // Also show banner for non-mobile devices
        if (!this.isMobileDevice()) {
            this.showInstallBanner(deferredPrompt);
        }
    }

    showInstallBanner(deferredPrompt) {
        // Create install banner for desktop/tablet
        const banner = document.createElement('div');
        banner.id = 'install-banner';
        banner.className = 'fixed bottom-4 left-4 right-4 bg-white border-2 border-green-500 rounded-lg p-4 shadow-lg z-50 md:left-auto md:right-4 md:w-80';
        banner.innerHTML = `
            <div class="flex items-center justify-between">
                <div class="flex-1">
                    <h3 class="font-semibold text-gray-900">Install OnGoPool</h3>
                    <p class="text-sm text-gray-600">Get quick access and offline features</p>
                </div>
                <div class="ml-4 flex space-x-2">
                    <button id="install-dismiss" class="text-gray-400 hover:text-gray-600">
                        <i class="fas fa-times"></i>
                    </button>
                    <button id="install-app" class="bg-green-600 text-white px-3 py-1 rounded text-sm hover:bg-green-700">
                        Install
                    </button>
                </div>
            </div>
        `;
        
        document.body.appendChild(banner);
        
        // Handle install button click
        document.getElementById('install-app').addEventListener('click', async () => {
            try {
                deferredPrompt.prompt();
                const { outcome } = await deferredPrompt.userChoice;
                console.log('Install prompt outcome:', outcome);
                this.hideInstallBanner();
            } catch (error) {
                console.error('Install banner failed:', error);
            }
        });
        
        // Handle dismiss button click
        document.getElementById('install-dismiss').addEventListener('click', () => {
            this.hideInstallBanner();
        });
    }

    hideInstallButtons() {
        const installSection = document.querySelector('.install-section');
        if (installSection) {
            installSection.style.display = 'none';
        }
        this.hideInstallBanner();
    }

    hideInstallBanner() {
        const banner = document.getElementById('install-banner');
        if (banner) {
            banner.remove();
        }
    }

    isMobileDevice() {
        return /Android|webOS|iPhone|iPad|iPod|BlackBerry|IEMobile|Opera Mini/i.test(navigator.userAgent);
    }

    showUpdateNotification() {
        const notification = document.createElement('div');
        notification.className = 'fixed top-4 right-4 bg-blue-600 text-white p-4 rounded-lg shadow-lg z-50 max-w-sm';
        notification.innerHTML = `
            <div class="flex items-center justify-between">
                <div class="flex-1">
                    <h4 class="font-semibold">Update Available</h4>
                    <p class="text-sm opacity-90">A new version of OnGoPool is ready</p>
                </div>
                <button id="update-app" class="ml-4 bg-white text-blue-600 px-3 py-1 rounded text-sm hover:bg-gray-100">
                    Update
                </button>
            </div>
        `;
        
        document.body.appendChild(notification);
        
        document.getElementById('update-app').addEventListener('click', () => {
            window.location.reload();
        });
        
        // Auto-remove after 10 seconds
        setTimeout(() => {
            if (notification.parentNode) {
                notification.remove();
            }
        }, 10000);
    }

    showNetworkStatus(message, type) {
        const statusBar = document.createElement('div');
        statusBar.className = `fixed top-0 left-0 right-0 z-50 p-2 text-center text-sm ${
            type === 'success' ? 'bg-green-600 text-white' : 'bg-yellow-600 text-white'
        }`;
        statusBar.textContent = `OnGoPool is ${message}`;
        
        document.body.appendChild(statusBar);
        
        setTimeout(() => {
            if (statusBar.parentNode) {
                statusBar.remove();
            }
        }, 3000);
    }

    async syncOfflineData() {
        if ('serviceWorker' in navigator && this.swRegistration) {
            try {
                // Trigger background sync for pending data
                await this.swRegistration.sync.register('sync-ride-requests');
                await this.swRegistration.sync.register('sync-messages');
                console.log('Background sync triggered');
            } catch (error) {
                console.error('Background sync failed:', error);
            }
        }
    }

    async sendNotification(title, options = {}) {
        if (!this.notificationsEnabled) {
            console.warn('Notifications not enabled');
            return;
        }

        try {
            if (this.swRegistration) {
                await this.swRegistration.showNotification(title, {
                    body: options.body || '',
                    icon: options.icon || '/icons/icon-192x192.png',
                    badge: '/icons/icon-72x72.png',
                    vibrate: [100, 50, 100],
                    data: options.data || {},
                    actions: options.actions || [],
                    ...options
                });
            }
        } catch (error) {
            console.error('Notification failed:', error);
        }
    }

    handleServiceWorkerMessage(data) {
        console.log('Message from service worker:', data);
        
        switch (data.type) {
            case 'CACHE_UPDATED':
                console.log('Cache updated successfully');
                break;
            case 'SYNC_COMPLETED':
                console.log('Background sync completed');
                break;
            case 'PUSH_RECEIVED':
                this.handlePushNotification(data.payload);
                break;
        }
    }

    handlePushNotification(payload) {
        console.log('Push notification received:', payload);
        
        // Handle different types of notifications
        switch (payload.type) {
            case 'ride_request':
                this.handleRideRequestNotification(payload);
                break;
            case 'ride_accepted':
                this.handleRideAcceptedNotification(payload);
                break;
            case 'message':
                this.handleMessageNotification(payload);
                break;
            default:
                console.log('Unknown notification type:', payload.type);
        }
    }

    handleRideRequestNotification(payload) {
        // Update UI if user is on dashboard
        if (window.app && window.app.currentPage === 'dashboard') {
            window.app.refreshDashboard();
        }
    }

    handleRideAcceptedNotification(payload) {
        // Show success message and update rides list
        if (window.app) {
            window.app.showNotification('Ride request accepted!', 'success');
            window.app.refreshRides();
        }
    }

    handleMessageNotification(payload) {
        // Update chat if user is viewing the conversation
        if (window.app && window.app.currentPage === 'chat') {
            window.app.refreshChat();
        }
    }

    async sendSubscriptionToServer(subscription) {
        try {
            // This would send the push subscription to your backend
            const response = await fetch('/api/push-subscriptions', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    subscription,
                    userId: window.authManager?.user?.id
                })
            });
            
            if (!response.ok) {
                throw new Error('Failed to save subscription');
            }
            
            console.log('Push subscription saved to server');
        } catch (error) {
            console.error('Failed to save push subscription:', error);
        }
    }

    trackInstallation() {
        // Track PWA installation analytics
        if (window.analytics) {
            window.analytics.track('PWA Installed', {
                platform: navigator.platform,
                userAgent: navigator.userAgent,
                timestamp: new Date().toISOString()
            });
        }
    }

    urlBase64ToUint8Array(base64String) {
        const padding = '='.repeat((4 - base64String.length % 4) % 4);
        const base64 = (base64String + padding)
            .replace(/-/g, '+')
            .replace(/_/g, '/');

        const rawData = window.atob(base64);
        const outputArray = new Uint8Array(rawData.length);

        for (let i = 0; i < rawData.length; ++i) {
            outputArray[i] = rawData.charCodeAt(i);
        }
        return outputArray;
    }

    // Public API methods
    async shareContent(data) {
        if (navigator.share) {
            try {
                await navigator.share(data);
                console.log('Content shared successfully');
            } catch (error) {
                console.error('Share failed:', error);
                this.fallbackShare(data);
            }
        } else {
            this.fallbackShare(data);
        }
    }

    fallbackShare(data) {
        // Fallback sharing using clipboard or social media links
        const url = data.url || window.location.href;
        const text = data.text || document.title;
        
        if (navigator.clipboard) {
            navigator.clipboard.writeText(`${text} ${url}`);
            this.showNotification('Link copied to clipboard!', 'success');
        }
    }

    getNetworkStatus() {
        return {
            online: this.isOnline,
            connection: navigator.connection ? {
                effectiveType: navigator.connection.effectiveType,
                downlink: navigator.connection.downlink,
                rtt: navigator.connection.rtt
            } : null
        };
    }
}

// Initialize PWA service
window.pwaService = new PWAService();