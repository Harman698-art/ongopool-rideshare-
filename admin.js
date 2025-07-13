// OnGoPool Admin Dashboard Module

// Admin Dashboard Functions
function showAdminDashboard() {
    const user = window.authManager.getCurrentUser();
    if (!user || !window.authManager.canAccessAdminPanel()) {
        showNotification('Access denied. Admin privileges required.', 'error');
        return;
    }
    
    showPage('admin-dashboard-page');
    loadAdminDashboardData();
}

function showAdminTab(tabName) {
    // Hide all tab contents
    const tabs = document.querySelectorAll('.admin-tab-content');
    tabs.forEach(tab => tab.classList.remove('active'));
    
    // Hide all tab buttons
    const tabButtons = document.querySelectorAll('.admin-nav-tabs .tab-btn');
    tabButtons.forEach(btn => btn.classList.remove('active'));
    
    // Show selected tab
    const selectedTab = document.getElementById(`admin-${tabName}-tab`);
    if (selectedTab) {
        selectedTab.classList.add('active');
    }
    
    // Activate button
    const selectedButton = document.querySelector(`.admin-nav-tabs .tab-btn[onclick="showAdminTab('${tabName}')"]`);
    if (selectedButton) {
        selectedButton.classList.add('active');
    }
    
    // Load tab-specific data
    switch(tabName) {
        case 'overview':
            loadAdminOverview();
            break;
        case 'users':
            loadUsersManagement();
            break;
        case 'disputes':
            loadDisputesManagement();
            break;
        case 'pricing':
            loadPricingManagement();
            break;
        case 'analytics':
            loadAnalyticsDashboard();
            break;
    }
}

function loadAdminDashboardData() {
    // Load initial dashboard data
    loadAdminOverview();
    setupAdminEventListeners();
}

function loadAdminOverview() {
    // Mock data - in real app, this would come from Supabase
    const stats = {
        totalUsers: 1247,
        activeDrivers: 342,
        totalRides: 5683,
        platformRevenue: 42156
    };
    
    // Update stats cards
    document.getElementById('total-users-count').textContent = stats.totalUsers.toLocaleString();
    document.getElementById('active-drivers-count').textContent = stats.activeDrivers.toLocaleString();
    document.getElementById('total-rides-count').textContent = stats.totalRides.toLocaleString();
    document.getElementById('platform-revenue-count').textContent = `$${stats.platformRevenue.toLocaleString()}`;
    
    // Update quick action counts
    document.getElementById('pending-verifications').textContent = '12 pending';
    document.getElementById('open-disputes').textContent = '3 open';
    
    // Load recent activity
    loadRecentActivity();
}

function loadRecentActivity() {
    // Mock recent activity data
    const activities = [
        {
            icon: 'fa-user-plus',
            title: 'New driver registration',
            description: 'Sarah Johnson signed up as driver',
            time: '2 hours ago'
        },
        {
            icon: 'fa-gavel',
            title: 'Dispute resolved',
            description: 'Payment dispute #1234 closed',
            time: '4 hours ago'
        },
        {
            icon: 'fa-shield-alt',
            title: 'Driver verification',
            description: 'Mike Chen\'s documents approved',
            time: '6 hours ago'
        }
    ];
    
    const activityList = document.getElementById('admin-activity-list');
    if (activityList) {
        activityList.innerHTML = activities.map(activity => `
            <div class="activity-item">
                <div class="activity-icon">
                    <i class="fas ${activity.icon}"></i>
                </div>
                <div class="activity-content">
                    <p><strong>${activity.title}</strong></p>
                    <small>${activity.description}</small>
                    <span class="activity-time">${activity.time}</span>
                </div>
            </div>
        `).join('');
    }
}

async function loadUsersManagement() {
    try {
        // Fetch all users with their driver profiles
        const usersResult = await window.supabaseService.supabase
            .from('profiles')
            .select(`
                id,
                first_name,
                last_name,
                role,
                created_at,
                driver_profiles (
                    license_verified,
                    bank_account_verified,
                    license_url,
                    void_cheque_url,
                    vehicle_info,
                    car_model,
                    car_color,
                    license_plate
                )
            `)
            .order('created_at', { ascending: false });

        if (usersResult.error) throw usersResult.error;
        
        const users = usersResult.data || [];
        displayUsersInAdmin(users);
        
    } catch (error) {
        console.error('Error loading users:', error);
        showNotification('Failed to load users', 'error');
    }
}

function displayUsersInAdmin(users) {
    const usersList = document.getElementById('admin-users-list');
    if (!usersList) return;

    if (users.length === 0) {
        usersList.innerHTML = '<div class="no-data">No users found</div>';
        return;
    }

    usersList.innerHTML = users.map(user => {
        const driverProfile = user.driver_profiles && user.driver_profiles.length > 0 ? user.driver_profiles[0] : null;
        const isDriver = user.role === 'driver' || user.role === 'both';
        const needsVerification = isDriver && driverProfile && (!driverProfile.license_verified || !driverProfile.bank_account_verified);
        
        let badges = '';
        if (user.role === 'admin') {
            badges += '<span class="badge admin">Admin</span>';
        } else if (isDriver) {
            badges += '<span class="badge driver">Driver</span>';
            if (driverProfile) {
                if (driverProfile.license_verified && driverProfile.bank_account_verified) {
                    badges += '<span class="badge verified">Verified</span>';
                } else {
                    badges += '<span class="badge pending">Pending Verification</span>';
                }
            } else {
                badges += '<span class="badge pending">No Driver Profile</span>';
            }
        }
        if (user.role === 'passenger' || user.role === 'both') {
            badges += '<span class="badge passenger">Passenger</span>';
        }

        return `
            <div class="user-card ${needsVerification ? 'needs-verification' : ''}">
                <div class="user-avatar">
                    <i class="fas fa-user"></i>
                </div>
                <div class="user-info">
                    <h4>${user.first_name} ${user.last_name}</h4>
                    <p>ID: ${user.id}</p>
                    <div class="user-badges">
                        ${badges}
                    </div>
                    <small>Joined: ${new Date(user.created_at).toLocaleDateString()}</small>
                    ${driverProfile ? `
                        <div class="driver-details">
                            <small><strong>Vehicle:</strong> ${driverProfile.car_model || 'Not specified'} (${driverProfile.car_color || 'No color'})</small>
                            <small><strong>Plate:</strong> ${driverProfile.license_plate || 'Not specified'}</small>
                            <small><strong>License:</strong> ${driverProfile.license_verified ? '<span class="verified-badge">Verified</span>' : '<span class="pending-badge">Pending</span>'}</small>
                            <small><strong>Banking:</strong> ${driverProfile.bank_account_verified ? '<span class="verified-badge">Verified</span>' : '<span class="pending-badge">Pending</span>'}</small>
                        </div>
                    ` : ''}
                </div>
                <div class="user-actions">
                    <button class="btn-icon" onclick="viewUserDetails('${user.id}')">
                        <i class="fas fa-eye"></i>
                    </button>
                    ${needsVerification ? `
                        <button class="btn-verify" onclick="verifyDriver('${user.id}')">
                            <i class="fas fa-check-circle"></i> Verify
                        </button>
                    ` : ''}
                    <div class="dropdown">
                        <button class="btn-icon dropdown-toggle">
                            <i class="fas fa-ellipsis-v"></i>
                        </button>
                        <div class="dropdown-menu">
                            <a href="#" onclick="editUser('${user.id}')">Edit User</a>
                            ${isDriver ? `<a href="#" onclick="viewDriverDocuments('${user.id}')">View Documents</a>` : ''}
                            <a href="#" onclick="viewUserHistory('${user.id}')">View History</a>
                            <a href="#" onclick="suspendUser('${user.id}')">Suspend User</a>
                        </div>
                    </div>
                </div>
            </div>
        `;
    }).join('');
}

async function verifyDriver(userId) {
    try {
        const confirmResult = confirm('Are you sure you want to verify this driver? This will approve their license and bank account verification.');
        if (!confirmResult) return;
        
        // First get the driver profile to see details
        const profileResult = await window.supabaseService.supabase
            .from('driver_profiles')
            .select('*')
            .eq('id', userId)
            .single();
            
        if (profileResult.error) throw profileResult.error;
        
        const driverProfile = profileResult.data;
        const profileComplete = driverProfile && 
                               driverProfile.car_model && 
                               driverProfile.car_color && 
                               driverProfile.license_plate;
                               
        if (!profileComplete) {
            showNotification('Driver profile is incomplete. Missing vehicle information.', 'warning');
            return;
        }
        
        // Update driver verification status
        const result = await window.supabaseService.supabase
            .from('driver_profiles')
            .update({
                license_verified: true,
                bank_account_verified: true,
                updated_at: new Date().toISOString()
            })
            .eq('id', userId);

        if (result.error) throw result.error;
        
        // Get user name for better activity logging
        const userResult = await window.supabaseService.supabase
            .from('profiles')
            .select('first_name, last_name')
            .eq('id', userId)
            .single();
            
        let userName = userId;
        if (userResult.data) {
            userName = `${userResult.data.first_name} ${userResult.data.last_name}`;
        }
        
        showNotification('Driver verified successfully!', 'success');
        loadUsersManagement(); // Reload the users list
        
        // Add to recent activity with vehicle details
        const vehicleInfo = `${driverProfile.car_color} ${driverProfile.car_model} (${driverProfile.license_plate})`;
        addRecentActivity('fa-check-circle', 'Driver verified', `${userName} verified with ${vehicleInfo}`);
        
    } catch (error) {
        console.error('Error verifying driver:', error);
        showNotification('Failed to verify driver', 'error');
    }
}

async function filterUsers(filterType) {
    // Update active filter button
    const filterButtons = document.querySelectorAll('.filter-btn');
    filterButtons.forEach(btn => btn.classList.remove('active'));
    event.target.classList.add('active');
    
    try {
        let query = window.supabaseService.supabase
            .from('profiles')
            .select(`
                id,
                first_name,
                last_name,
                role,
                created_at,
                driver_profiles (
                    license_verified,
                    bank_account_verified,
                    license_url,
                    void_cheque_url,
                    vehicle_info,
                    car_model,
                    car_color,
                    license_plate
                )
            `);
        
        switch (filterType) {
            case 'drivers':
                query = query.in('role', ['driver', 'both']);
                break;
            case 'passengers':
                query = query.in('role', ['passenger', 'both']);
                break;
            case 'pending':
                // This will be filtered in displayUsersInAdmin
                break;
            case 'suspended':
                // Add suspended status when implemented
                break;
        }
        
        query = query.order('created_at', { ascending: false });
        const result = await query;
        
        if (result.error) throw result.error;
        
        let users = result.data || [];
        
        // Additional filtering for pending verification
        if (filterType === 'pending') {
            users = users.filter(user => {
                const isDriver = user.role === 'driver' || user.role === 'both';
                const driverProfile = user.driver_profiles && user.driver_profiles.length > 0 ? user.driver_profiles[0] : null;
                return isDriver && driverProfile && (!driverProfile.license_verified || !driverProfile.bank_account_verified);
            });
        }
        
        displayUsersInAdmin(users);
        
    } catch (error) {
        console.error('Error filtering users:', error);
        showNotification('Failed to filter users', 'error');
    }
}

function viewDriverDocuments(userId) {
    // This would open a modal to view driver documents
    console.log('View driver documents for user:', userId);
    showNotification('Document viewer not implemented yet', 'info');
}

function addRecentActivity(icon, title, description) {
    // Add to recent activities in the overview tab
    const activityList = document.getElementById('admin-activity-list');
    if (activityList) {
        const newActivity = document.createElement('div');
        newActivity.className = 'activity-item';
        newActivity.innerHTML = `
            <div class="activity-icon">
                <i class="fas ${icon}"></i>
            </div>
            <div class="activity-content">
                <p><strong>${title}</strong></p>
                <small>${description}</small>
                <span class="activity-time">Just now</span>
            </div>
        `;
        activityList.insertBefore(newActivity, activityList.firstChild);
    }
}

function loadDisputesManagement() {
    // This would fetch real dispute data from Supabase
    console.log('Loading disputes management...');
}

function loadAnalyticsDashboard() {
    // Initialize charts
    initializeAnalyticsCharts();
}

function initializeAnalyticsCharts() {
    // Growth Chart
    const growthCtx = document.getElementById('growth-chart');
    if (growthCtx && typeof Chart !== 'undefined') {
        new Chart(growthCtx, {
            type: 'line',
            data: {
                labels: ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun'],
                datasets: [{
                    label: 'User Growth',
                    data: [850, 920, 1050, 1150, 1200, 1247],
                    borderColor: '#10b981',
                    backgroundColor: 'rgba(16, 185, 129, 0.1)',
                    tension: 0.4
                }]
            },
            options: {
                responsive: true,
                scales: {
                    y: {
                        beginAtZero: false
                    }
                }
            }
        });
    }
    
    // Revenue Chart
    const revenueCtx = document.getElementById('revenue-chart');
    if (revenueCtx && typeof Chart !== 'undefined') {
        new Chart(revenueCtx, {
            type: 'bar',
            data: {
                labels: ['Week 1', 'Week 2', 'Week 3', 'Week 4'],
                datasets: [{
                    label: 'Weekly Revenue',
                    data: [8250, 9800, 11200, 12906],
                    backgroundColor: '#10b981'
                }]
            },
            options: {
                responsive: true,
                scales: {
                    y: {
                        beginAtZero: true
                    }
                }
            }
        });
    }
    
    // Usage Chart
    const usageCtx = document.getElementById('usage-chart');
    if (usageCtx && typeof Chart !== 'undefined') {
        new Chart(usageCtx, {
            type: 'doughnut',
            data: {
                labels: ['Morning', 'Afternoon', 'Evening', 'Night'],
                datasets: [{
                    data: [25, 35, 30, 10],
                    backgroundColor: ['#10b981', '#3b82f6', '#f59e0b', '#ef4444']
                }]
            },
            options: {
                responsive: true
            }
        });
    }
}

function setupAdminEventListeners() {
    // User search
    const userSearchInput = document.getElementById('user-search-input');
    if (userSearchInput) {
        userSearchInput.addEventListener('input', (e) => {
            const query = e.target.value.toLowerCase();
            filterUsersList(query);
        });
    }
    
    // Analytics date range
    const startDate = document.getElementById('analytics-start-date');
    const endDate = document.getElementById('analytics-end-date');
    
    if (startDate && endDate) {
        startDate.addEventListener('change', updateAnalytics);
        endDate.addEventListener('change', updateAnalytics);
    }
}

// Admin Action Functions
function refreshAdminData() {
    showLoadingOverlay();
    
    setTimeout(() => {
        loadAdminDashboardData();
        hideLoadingOverlay();
        showNotification('Dashboard data refreshed', 'success');
    }, 1000);
}

function filterUsers(type) {
    // Update filter button states
    const filterButtons = document.querySelectorAll('.users-management-header .filter-btn');
    filterButtons.forEach(btn => btn.classList.remove('active'));
    
    const activeButton = document.querySelector(`.filter-btn[onclick="filterUsers('${type}')"]`);
    if (activeButton) {
        activeButton.classList.add('active');
    }
    
    // Filter logic would be implemented here
    console.log(`Filtering users by: ${type}`);
}

function filterUsersList(query) {
    const userCards = document.querySelectorAll('.user-card');
    userCards.forEach(card => {
        const userName = card.querySelector('h4').textContent.toLowerCase();
        const userEmail = card.querySelector('p').textContent.toLowerCase();
        
        if (userName.includes(query) || userEmail.includes(query)) {
            card.style.display = 'flex';
        } else {
            card.style.display = 'none';
        }
    });
}

function filterDisputes(status) {
    // Update filter button states
    const filterButtons = document.querySelectorAll('.disputes-header .filter-btn');
    filterButtons.forEach(btn => btn.classList.remove('active'));
    
    const activeButton = document.querySelector(`.filter-btn[onclick="filterDisputes('${status}')"]`);
    if (activeButton) {
        activeButton.classList.add('active');
    }
    
    // Filter logic would be implemented here
    console.log(`Filtering disputes by: ${status}`);
}

// User Management Actions
function viewUserDetails(userId) {
    console.log(`Viewing details for user: ${userId}`);
    // This would open a detailed user view modal or page
}

function editUser(userId) {
    console.log(`Editing user: ${userId}`);
    // This would open an edit user modal or page
}

function suspendUser(userId) {
    if (confirm('Are you sure you want to suspend this user?')) {
        console.log(`Suspending user: ${userId}`);
        showNotification('User suspended successfully', 'success');
    }
}

function verifyDriver(userId) {
    console.log(`Verifying driver: ${userId}`);
    showNotification('Driver verification completed', 'success');
}

function rejectVerification(userId) {
    if (confirm('Are you sure you want to reject this verification?')) {
        console.log(`Rejecting verification for user: ${userId}`);
        showNotification('Driver verification rejected', 'warning');
    }
}

function requestMoreDocs(userId) {
    console.log(`Requesting more documents from user: ${userId}`);
    showNotification('Additional documents requested', 'info');
}

function viewUserHistory(userId) {
    console.log(`Viewing history for user: ${userId}`);
    // This would show user's ride history and activities
}

function sendMessage(userId) {
    console.log(`Sending message to user: ${userId}`);
    // This would open a messaging interface
}

// Dispute Management Actions
function assignDispute(disputeId) {
    console.log(`Assigning dispute ${disputeId} to current admin`);
    showNotification('Dispute assigned to you', 'success');
}

function viewDisputeDetails(disputeId) {
    console.log(`Viewing details for dispute: ${disputeId}`);
    // This would open a detailed dispute view
}

function resolveDispute(disputeId) {
    console.log(`Resolving dispute: ${disputeId}`);
    showNotification('Dispute resolved successfully', 'success');
}

function escalateDispute(disputeId) {
    console.log(`Escalating dispute: ${disputeId}`);
    showNotification('Dispute escalated to senior admin', 'info');
}

function addDisputeNote(disputeId) {
    const note = prompt('Add a note to this dispute:');
    if (note) {
        console.log(`Adding note to dispute ${disputeId}: ${note}`);
        showNotification('Note added to dispute', 'success');
    }
}

function reopenDispute(disputeId) {
    if (confirm('Are you sure you want to reopen this dispute?')) {
        console.log(`Reopening dispute: ${disputeId}`);
        showNotification('Dispute reopened', 'info');
    }
}

// Analytics Functions
function showAnalyticsSection(section) {
    // Hide all analytics sections
    const sections = document.querySelectorAll('.analytics-section');
    sections.forEach(s => s.classList.remove('active'));
    
    // Hide all tab buttons
    const tabButtons = document.querySelectorAll('.analytics-tab-btn');
    tabButtons.forEach(btn => btn.classList.remove('active'));
    
    // Show selected section
    const selectedSection = document.getElementById(`analytics-${section}`);
    if (selectedSection) {
        selectedSection.classList.add('active');
    }
    
    // Activate button
    const selectedButton = document.querySelector(`.analytics-tab-btn[onclick="showAnalyticsSection('${section}')"]`);
    if (selectedButton) {
        selectedButton.classList.add('active');
    }
}

function updateAnalytics() {
    const startDate = document.getElementById('analytics-start-date').value;
    const endDate = document.getElementById('analytics-end-date').value;
    
    console.log(`Updating analytics for period: ${startDate} to ${endDate}`);
    showNotification('Analytics updated', 'success');
}

function exportPlatformData() {
    console.log('Exporting platform data...');
    showNotification('Data export started. You will receive an email when ready.', 'info');
}

function showSystemSettings() {
    console.log('Opening system settings...');
    showNotification('System settings feature coming soon', 'info');
}

function loadUsersPage(page) {
    console.log(`Loading users page: ${page}`);
    // This would load the specified page of users
}

// Utility Functions
function showLoadingOverlay() {
    const overlay = document.getElementById('loading-overlay');
    if (overlay) {
        overlay.classList.remove('hidden');
    }
}

function hideLoadingOverlay() {
    const overlay = document.getElementById('loading-overlay');
    if (overlay) {
        overlay.classList.add('hidden');
    }
}

function showNotification(message, type = 'info') {
    // This would show a toast notification
    console.log(`${type.toUpperCase()}: ${message}`);
    
    // Create toast notification
    const toast = document.createElement('div');
    toast.className = `toast toast-${type}`;
    toast.innerHTML = `
        <i class="fas fa-${type === 'success' ? 'check-circle' : type === 'error' ? 'exclamation-circle' : type === 'warning' ? 'exclamation-triangle' : 'info-circle'}"></i>
        <span>${message}</span>
    `;
    
    const container = document.getElementById('toast-container');
    if (container) {
        container.appendChild(toast);
        
        // Show toast
        setTimeout(() => toast.classList.add('show'), 100);
        
        // Hide and remove toast
        setTimeout(() => {
            toast.classList.remove('show');
            setTimeout(() => container.removeChild(toast), 300);
        }, 3000);
    }
}

// Initialize admin dashboard access control
function initializeAdminAccess() {
    const user = window.authManager.getCurrentUser();
    const adminMenuItem = document.getElementById('admin-menu-item');
    
    if (adminMenuItem) {
        if (user && window.authManager.canAccessAdminPanel()) {
            adminMenuItem.style.display = 'flex';
        } else {
            adminMenuItem.style.display = 'none';
        }
    }
}

// Pricing Management Functions
function loadPricingManagement() {
    console.log('Loading pricing management...');
    initializePricingCalculator();
}

function addNewPricingTier() {
    console.log('Adding new pricing tier...');
    showNotification('New pricing tier feature coming soon', 'info');
}

function editPricingTier(tierId) {
    console.log(`Editing pricing tier ${tierId}...`);
    showNotification(`Editing tier ${tierId} - Save changes when done`, 'info');
}

function toggleTierStatus(tierId) {
    const tierCard = document.querySelector(`[data-tier="${tierId}"]`);
    const statusSpan = tierCard.querySelector('.tier-status');
    
    if (statusSpan.textContent === 'Active') {
        statusSpan.textContent = 'Inactive';
        statusSpan.className = 'tier-status inactive';
        showNotification(`Tier ${tierId} deactivated`, 'warning');
    } else {
        statusSpan.textContent = 'Active';
        statusSpan.className = 'tier-status active';
        showNotification(`Tier ${tierId} activated`, 'success');
    }
}

function calculatePrice() {
    const distance = parseFloat(document.getElementById('calc-distance').value) || 0;
    const passengers = parseInt(document.getElementById('calc-passengers').value) || 1;
    const timeType = document.getElementById('calc-time').value;
    
    // Determine pricing tier based on distance
    let tier, tierName, minPrice, maxPrice;
    
    if (distance <= 50) {
        tier = 1;
        tierName = 'Short Distance (0-50km)';
        minPrice = 0.18;
        maxPrice = 0.25;
    } else if (distance <= 150) {
        tier = 2;
        tierName = 'Medium Distance (51-150km)';
        minPrice = 0.15;
        maxPrice = 0.22;
    } else {
        tier = 3;
        tierName = 'Long Distance (151km+)';
        minPrice = 0.12;
        maxPrice = 0.20;
    }
    
    // Calculate base price
    let baseMin = distance * passengers * minPrice;
    let baseMax = distance * passengers * maxPrice;
    
    // Apply peak hour multiplier if enabled
    const peakEnabled = document.getElementById('peak-hours-enabled').checked;
    const peakMultiplier = parseFloat(document.getElementById('peak-multiplier').value) || 1.5;
    
    if (timeType === 'peak' && peakEnabled) {
        baseMin *= peakMultiplier;
        baseMax *= peakMultiplier;
    }
    
    // Apply commission
    const commissionEnabled = document.getElementById('commission-enabled').checked;
    const commissionRate = parseFloat(document.getElementById('commission-rate').value) || 15;
    
    if (commissionEnabled) {
        baseMin *= (1 + commissionRate / 100);
        baseMax *= (1 + commissionRate / 100);
    }
    
    // Apply minimum ride amount
    const minimumEnabled = document.getElementById('minimum-enabled').checked;
    const minimumAmount = parseFloat(document.getElementById('minimum-amount').value) || 5.00;
    
    if (minimumEnabled) {
        baseMin = Math.max(baseMin, minimumAmount);
        baseMax = Math.max(baseMax, minimumAmount);
    }
    
    // Update results
    const resultsDiv = document.getElementById('calc-results');
    const priceMultiplier = timeType === 'peak' && peakEnabled ? ` (${peakMultiplier}x peak)` : '';
    
    resultsDiv.innerHTML = `
        <div class="result-tier">
            <strong>Tier:</strong> ${tierName}
        </div>
        <div class="result-range">
            <strong>Price Range:</strong> $${baseMin.toFixed(2)} - $${baseMax.toFixed(2)}${priceMultiplier}
        </div>
        <div class="result-breakdown">
            <small>${distance}km × ${passengers} passengers × $${minPrice}-$${maxPrice} per seat per km${commissionEnabled ? ` + ${commissionRate}% commission` : ''}</small>
        </div>
    `;
}

function initializePricingCalculator() {
    // Set up real-time calculation
    const inputs = ['calc-distance', 'calc-passengers', 'calc-time'];
    inputs.forEach(id => {
        const element = document.getElementById(id);
        if (element) {
            element.addEventListener('change', calculatePrice);
            element.addEventListener('input', calculatePrice);
        }
    });
    
    // Set up toggle listeners for settings that affect calculation
    const toggles = ['peak-hours-enabled', 'commission-enabled', 'minimum-enabled'];
    toggles.forEach(id => {
        const element = document.getElementById(id);
        if (element) {
            element.addEventListener('change', calculatePrice);
        }
    });
    
    // Set up input listeners for values that affect calculation
    const valueInputs = ['peak-multiplier', 'commission-rate', 'minimum-amount'];
    valueInputs.forEach(id => {
        const element = document.getElementById(id);
        if (element) {
            element.addEventListener('input', calculatePrice);
        }
    });
    
    // Initial calculation
    setTimeout(calculatePrice, 100);
}

function savePricingSettings() {
    // Collect all pricing data
    const pricingConfig = {
        tiers: [],
        settings: {
            commission: {
                enabled: document.getElementById('commission-enabled').checked,
                rate: parseFloat(document.getElementById('commission-rate').value)
            },
            minimum: {
                enabled: document.getElementById('minimum-enabled').checked,
                amount: parseFloat(document.getElementById('minimum-amount').value)
            },
            peakHours: {
                enabled: document.getElementById('peak-hours-enabled').checked,
                multiplier: parseFloat(document.getElementById('peak-multiplier').value),
                startTime: document.getElementById('peak-start').value,
                endTime: document.getElementById('peak-end').value
            },
            driverOverride: {
                enabled: document.getElementById('driver-override-enabled').checked,
                maxDeviation: parseFloat(document.getElementById('override-limit').value)
            }
        }
    };
    
    // Collect tier data
    for (let i = 1; i <= 3; i++) {
        const tierCard = document.querySelector(`[data-tier="${i}"]`);
        const statusElement = tierCard.querySelector('.tier-status');
        
        pricingConfig.tiers.push({
            id: i,
            name: tierCard.querySelector('h5').textContent,
            active: statusElement.textContent === 'Active',
            minDistance: i === 1 ? 0 : parseInt(document.getElementById(`tier${i}-min`).value),
            maxDistance: parseInt(document.getElementById(`tier${i}-max`).value),
            minPrice: parseFloat(document.getElementById(`tier${i}-min-price`).value),
            maxPrice: parseFloat(document.getElementById(`tier${i}-max-price`).value)
        });
    }
    
    console.log('Saving pricing configuration:', pricingConfig);
    
    // In a real app, this would save to Supabase
    showNotification('Pricing settings saved successfully!', 'success');
    
    // Update overview cards
    updatePricingOverview();
}

function updatePricingOverview() {
    // Update the overview cards with current settings
    const overviewCards = document.querySelectorAll('.pricing-overview-card');
    
    for (let i = 0; i < overviewCards.length; i++) {
        const card = overviewCards[i];
        const tierId = i + 1;
        
        const minPrice = parseFloat(document.getElementById(`tier${tierId}-min-price`).value);
        const maxPrice = parseFloat(document.getElementById(`tier${tierId}-max-price`).value);
        
        const priceElement = card.querySelector('p');
        priceElement.textContent = `$${minPrice.toFixed(2)} - $${maxPrice.toFixed(2)} per seat per km`;
    }
}

function resetPricingToDefaults() {
    if (confirm('Reset all pricing settings to default values? This cannot be undone.')) {
        // Reset tier 1
        document.getElementById('tier1-max').value = 50;
        document.getElementById('tier1-min-price').value = 0.18;
        document.getElementById('tier1-max-price').value = 0.25;
        
        // Reset tier 2
        document.getElementById('tier2-min').value = 51;
        document.getElementById('tier2-max').value = 150;
        document.getElementById('tier2-min-price').value = 0.15;
        document.getElementById('tier2-max-price').value = 0.22;
        
        // Reset tier 3
        document.getElementById('tier3-min').value = 151;
        document.getElementById('tier3-max').value = 999;
        document.getElementById('tier3-min-price').value = 0.12;
        document.getElementById('tier3-max-price').value = 0.20;
        
        // Reset settings
        document.getElementById('commission-enabled').checked = true;
        document.getElementById('commission-rate').value = 15;
        document.getElementById('minimum-enabled').checked = true;
        document.getElementById('minimum-amount').value = 5.00;
        document.getElementById('peak-hours-enabled').checked = false;
        document.getElementById('peak-multiplier').value = 1.5;
        document.getElementById('peak-start').value = '07:00';
        document.getElementById('peak-end').value = '09:00';
        document.getElementById('driver-override-enabled').checked = true;
        document.getElementById('override-limit').value = 10;
        
        // Recalculate
        calculatePrice();
        updatePricingOverview();
        
        showNotification('Pricing settings reset to defaults', 'info');
    }
}

function exportPricingConfig() {
    // Create exportable configuration
    const config = {
        exportDate: new Date().toISOString(),
        platform: 'OnGoPool',
        version: '1.0',
        pricingTiers: [],
        settings: {}
    };
    
    // Collect current configuration
    for (let i = 1; i <= 3; i++) {
        config.pricingTiers.push({
            tier: i,
            minDistance: i === 1 ? 0 : parseInt(document.getElementById(`tier${i}-min`).value),
            maxDistance: parseInt(document.getElementById(`tier${i}-max`).value),
            minPricePerSeatPerKm: parseFloat(document.getElementById(`tier${i}-min-price`).value),
            maxPricePerSeatPerKm: parseFloat(document.getElementById(`tier${i}-max-price`).value)
        });
    }
    
    config.settings = {
        commissionRate: parseFloat(document.getElementById('commission-rate').value),
        minimumRideAmount: parseFloat(document.getElementById('minimum-amount').value),
        peakHourMultiplier: parseFloat(document.getElementById('peak-multiplier').value),
        driverOverrideLimit: parseFloat(document.getElementById('override-limit').value)
    };
    
    // Create and download file
    const blob = new Blob([JSON.stringify(config, null, 2)], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `ongopool-pricing-config-${new Date().toISOString().split('T')[0]}.json`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
    
    showNotification('Pricing configuration exported', 'success');
}

// Pricing Validation Functions
function validatePricingTier(tierId) {
    const minPrice = parseFloat(document.getElementById(`tier${tierId}-min-price`).value);
    const maxPrice = parseFloat(document.getElementById(`tier${tierId}-max-price`).value);
    
    if (minPrice >= maxPrice) {
        showNotification(`Tier ${tierId}: Minimum price must be less than maximum price`, 'error');
        return false;
    }
    
    if (minPrice < 0.05) {
        showNotification(`Tier ${tierId}: Minimum price cannot be less than $0.05`, 'error');
        return false;
    }
    
    if (maxPrice > 1.00) {
        showNotification(`Tier ${tierId}: Maximum price cannot exceed $1.00 per km`, 'warning');
    }
    
    return true;
}

function validateDistanceRanges() {
    // Ensure no gaps or overlaps in distance ranges
    const tier1Max = parseInt(document.getElementById('tier1-max').value);
    const tier2Min = parseInt(document.getElementById('tier2-min').value);
    const tier2Max = parseInt(document.getElementById('tier2-max').value);
    const tier3Min = parseInt(document.getElementById('tier3-min').value);
    
    if (tier2Min !== tier1Max + 1) {
        showNotification('Distance ranges must be continuous (no gaps)', 'error');
        return false;
    }
    
    if (tier3Min !== tier2Max + 1) {
        showNotification('Distance ranges must be continuous (no gaps)', 'error');
        return false;
    }
    
    return true;
}

// Call this function when user logs in or when the profile page loads
window.addEventListener('load', () => {
    // Initialize admin access when page loads
    setTimeout(initializeAdminAccess, 1000);
});