// OnGoPool Mobile App Logic

class OnGoPoolMobileApp {
    constructor() {
        this.currentUser = null;
        this.currentPage = 'splash-screen';
        this.allRides = [];
        this.pendingProfilePhoto = null;
        this.removeExistingPhoto = false;
        this.currentPhotoPath = null;
        this.init();
    }

    init() {
        // Check for email verification in URL parameters
        this.handleEmailVerification();
        
        // Check for hash navigation first
        const hash = window.location.hash.substring(1);
        if (hash === 'email-verification-success') {
            this.handleEmailConfirmation();
        } else if (hash && this.currentUser) {
            this.showPage(hash);
        } else {
            this.showPage('splash-screen');
        }
        
        this.setupEventListeners();
        this.checkAuthState();
        this.setMinDate();
        this.setupTouchInteractions();
        this.setupDriverVerificationSteps();
        this.setupReviewModal();
        
        // Initialize PWA install buttons after a short delay
        setTimeout(() => {
            if (window.pwaService) {
                window.pwaService.setupDeviceSpecificInstall();
            }
        }, 1000);
    }

    setupEventListeners() {
        // Setup form submissions
        this.setupForms();
        
        // Setup password toggles
        this.setupPasswordToggles();
        
        // Setup location swap
        this.setupLocationSwap();
        
        // Setup notification buttons
        this.setupNotificationButtons();
        
        // Setup file uploads
        this.setupFileUploads();
        
        // Prevent zoom on double tap
        this.preventZoom();
    }

    setupFileUploads() {
        // Setup license file upload
        const licenseUploadArea = document.getElementById('license-upload');
        const licenseFileInput = document.getElementById('license-file');
        
        if (licenseUploadArea && licenseFileInput) {
            licenseUploadArea.addEventListener('click', () => {
                licenseFileInput.click();
            });
            
            licenseFileInput.addEventListener('change', (e) => {
                this.handleFileUpload(e, 'license');
            });
        }
        
        // Setup cheque file upload
        const chequeUploadArea = document.getElementById('cheque-upload');
        const chequeFileInput = document.getElementById('cheque-file');
        
        if (chequeUploadArea && chequeFileInput) {
            chequeUploadArea.addEventListener('click', () => {
                chequeFileInput.click();
            });
            
            chequeFileInput.addEventListener('change', (e) => {
                this.handleFileUpload(e, 'cheque');
            });
        }
    }

    handleFileUpload(event, uploadType) {
        const file = event.target.files[0];
        if (!file) return;
        
        // Validate file type
        if (!file.type.startsWith('image/')) {
            this.showToast('Please select an image file (JPG, PNG)', 'error');
            return;
        }
        
        // Validate file size (5MB limit)
        const maxSize = 5 * 1024 * 1024; // 5MB in bytes
        if (file.size > maxSize) {
            this.showToast('File size must be less than 5MB', 'error');
            return;
        }
        
        // Update the upload area UI
        const uploadArea = document.getElementById(`${uploadType}-upload`);
        if (uploadArea) {
            const reader = new FileReader();
            reader.onload = (e) => {
                // Create preview element
                const preview = document.createElement('div');
                preview.className = 'upload-preview';
                
                // Store image data for processing
                const imageData = e.target.result;
                
                preview.innerHTML = `
                    <img src="${imageData}" alt="${uploadType} preview" style="max-width: 100%; max-height: 200px; object-fit: contain;">
                    <div class="upload-info">
                        <p><i class="fas fa-check-circle" style="color: #10b981;"></i> ${file.name}</p>
                        <small>${(file.size / 1024 / 1024).toFixed(2)} MB</small>
                        <button type="button" class="btn-remove-file" onclick="app.removeUploadedFile('${uploadType}')">
                            <i class="fas fa-times"></i> Remove
                        </button>
                    </div>
                `;
                
                // Replace the placeholder with preview
                uploadArea.innerHTML = '';
                uploadArea.appendChild(preview);
                
                // Store the file data for later submission
                if (!this.uploadedFiles) {
                    this.uploadedFiles = {};
                }
                this.uploadedFiles[uploadType] = {
                    file: file,
                    dataUrl: imageData
                };
                
                // If license upload, perform document scanning
                if (uploadType === 'license') {
                    this.showToast('License photo uploaded. Scanning document...', 'info');
                    this.scanLicenseDocument(imageData);
                } else {
                    this.showToast(`${uploadType === 'license' ? 'License' : 'Banking document'} uploaded successfully!`, 'success');
                }
            };
            reader.readAsDataURL(file);
        }
    }
    
    scanLicenseDocument(imageData) {
        // Show scanning indicator
        const scanIndicator = document.createElement('div');
        scanIndicator.className = 'scan-indicator';
        scanIndicator.innerHTML = `
            <div class="scan-progress">
                <div class="scan-line"></div>
                <p>Scanning document...</p>
            </div>
        `;
        
        const licenseUploadArea = document.getElementById('license-upload');
        if (licenseUploadArea) {
            licenseUploadArea.appendChild(scanIndicator);
        }
        
        // Simulate OCR processing time
        setTimeout(() => {
            // Remove scanning indicator
            if (scanIndicator.parentNode) {
                scanIndicator.parentNode.removeChild(scanIndicator);
            }
            
            // Perform simulated OCR
            this.performOCROnLicense(imageData);
        }, 2500);
    }
    
    performOCROnLicense(imageData) {
        // Simulate OCR extraction of license data
        // In a real app, this would use a dedicated OCR library or API
        
        // Generate simulated license data - normally this would be extracted from the image
        const licenseData = this.simulateOCRExtraction();
        
        // Store the extracted data
        this.extractedLicenseData = licenseData;
        
        // Populate the license form with extracted data
        this.populateLicenseForm(licenseData);
        
        // Show success message
        this.showToast('License scanned successfully! Please verify the information.', 'success');
        
        // Start verification process
        this.verifyLicenseWithDatabase(licenseData);
    }
    
    simulateOCRExtraction() {
        // Simulate data that would be extracted from a license
        const provinces = ['Ontario', 'British Columbia', 'Alberta', 'Quebec', 'Nova Scotia'];
        const names = ['John Smith', 'Jane Doe', 'Michael Johnson', 'Sarah Williams', 'David Brown'];
        
        // Generate random expiry date between now and 5 years from now
        const today = new Date();
        const expiryDate = new Date(today.setFullYear(today.getFullYear() + Math.floor(Math.random() * 5) + 1));
        const expiryDateString = expiryDate.toISOString().split('T')[0];
        
        // Generate random license number
        const licenseNumber = 'A' + Math.floor(Math.random() * 9000000 + 1000000).toString();
        
        return {
            name: names[Math.floor(Math.random() * names.length)],
            licenseNumber: licenseNumber,
            dateOfBirth: '1985-06-15',
            expiryDate: expiryDateString,
            issueDate: '2020-01-15',
            licenseClass: ['G', 'G1', 'G2'][Math.floor(Math.random() * 3)],
            address: '123 Main Street, Toronto, ON M5V 2K7',
            province: provinces[Math.floor(Math.random() * provinces.length)]
        };
    }
    
    populateLicenseForm(licenseData) {
        // Find form elements
        const licenseNumberField = document.getElementById('license-number');
        const licenseClassField = document.getElementById('license-class');
        const licenseExpiryField = document.getElementById('license-expiry');
        
        // Populate form fields if they exist
        if (licenseNumberField) licenseNumberField.value = licenseData.licenseNumber;
        if (licenseExpiryField) licenseExpiryField.value = licenseData.expiryDate;
        if (licenseClassField) {
            // Set the select option that matches the license class
            const options = licenseClassField.options;
            for (let i = 0; i < options.length; i++) {
                if (options[i].value === licenseData.licenseClass) {
                    licenseClassField.selectedIndex = i;
                    break;
                }
            }
        }
        
        // Create and display extracted data summary
        this.displayExtractedDataSummary(licenseData);
    }
    
    displayExtractedDataSummary(licenseData) {
        const licenseStep = document.getElementById('license-step');
        if (!licenseStep) return;
        
        // Check if data summary already exists
        let dataSummary = licenseStep.querySelector('.extracted-data-summary');
        if (dataSummary) {
            dataSummary.parentNode.removeChild(dataSummary);
        }
        
        // Create data summary element
        dataSummary = document.createElement('div');
        dataSummary.className = 'extracted-data-summary';
        dataSummary.innerHTML = `
            <h4>Extracted License Data</h4>
            <div class="data-row">
                <span class="data-label">Name:</span>
                <span class="data-value">${licenseData.name}</span>
            </div>
            <div class="data-row">
                <span class="data-label">License #:</span>
                <span class="data-value">${licenseData.licenseNumber}</span>
            </div>
            <div class="data-row">
                <span class="data-label">Date of Birth:</span>
                <span class="data-value">${licenseData.dateOfBirth}</span>
            </div>
            <div class="data-row">
                <span class="data-label">Expiry Date:</span>
                <span class="data-value">${licenseData.expiryDate}</span>
            </div>
            <div class="data-row">
                <span class="data-label">License Class:</span>
                <span class="data-value">${licenseData.licenseClass}</span>
            </div>
            <div class="data-row">
                <span class="data-label">Province:</span>
                <span class="data-value">${licenseData.province}</span>
            </div>
        `;
        
        // Insert after the license upload area
        const uploadArea = document.getElementById('license-upload');
        if (uploadArea && uploadArea.parentNode) {
            uploadArea.parentNode.insertBefore(dataSummary, uploadArea.nextSibling);
        }
    }
    
    verifyLicenseWithDatabase(licenseData) {
        // Create verification status indicator
        const verificationIndicator = document.createElement('div');
        verificationIndicator.className = 'verification-status';
        verificationIndicator.innerHTML = `
            <div class="verification-progress">
                <i class="fas fa-sync fa-spin"></i>
                <p>Verifying with government database...</p>
            </div>
        `;
        
        // Add to license step
        const licenseStep = document.getElementById('license-step');
        if (licenseStep) {
            // Add after the extracted data summary
            const dataSummary = licenseStep.querySelector('.extracted-data-summary');
            if (dataSummary) {
                dataSummary.appendChild(verificationIndicator);
            } else {
                const uploadArea = document.getElementById('license-upload');
                if (uploadArea && uploadArea.parentNode) {
                    uploadArea.parentNode.insertBefore(verificationIndicator, uploadArea.nextSibling);
                }
            }
            
            // Simulate verification delay
            setTimeout(() => {
                // Update verification status
                this.updateVerificationStatus(licenseData, verificationIndicator);
            }, 3000);
        }
    }
    
    updateVerificationStatus(licenseData, indicator) {
        // Simulate database verification result - 90% chance of success
        const isVerified = Math.random() < 0.9;
        
        if (isVerified) {
            // License verification successful
            indicator.innerHTML = `
                <div class="verification-result success">
                    <i class="fas fa-check-circle"></i>
                    <div>
                        <p class="verification-title">License Verified</p>
                        <p class="verification-detail">Successfully verified with government database</p>
                    </div>
                </div>
            `;
            
            // Store verification status
            if (!this.verificationStatus) {
                this.verificationStatus = {};
            }
            this.verificationStatus.license = {
                verified: true,
                timestamp: new Date().toISOString(),
                method: 'government-database'
            };
            
            // Enable next step button
            this.enableVerificationNextStep();
        } else {
            // License verification failed
            indicator.innerHTML = `
                <div class="verification-result failed">
                    <i class="fas fa-exclamation-circle"></i>
                    <div>
                        <p class="verification-title">Verification Failed</p>
                        <p class="verification-detail">Unable to verify license with database. Please ensure your license is valid and try again.</p>
                    </div>
                </div>
                <button class="btn-retry-verification" onclick="app.retryVerification('license')">
                    <i class="fas fa-redo"></i> Retry Verification
                </button>
            `;
            
            // Store verification status
            if (!this.verificationStatus) {
                this.verificationStatus = {};
            }
            this.verificationStatus.license = {
                verified: false,
                timestamp: new Date().toISOString(),
                method: 'government-database'
            };
        }
    }
    
    retryVerification(documentType) {
        if (documentType === 'license' && this.extractedLicenseData) {
            // Remove current verification status
            const licenseStep = document.getElementById('license-step');
            const currentStatus = licenseStep.querySelector('.verification-status');
            if (currentStatus) {
                currentStatus.innerHTML = `
                    <div class="verification-progress">
                        <i class="fas fa-sync fa-spin"></i>
                        <p>Verifying with government database...</p>
                    </div>
                `;
                
                // Retry verification
                setTimeout(() => {
                    this.updateVerificationStatus(this.extractedLicenseData, currentStatus);
                }, 3000);
            }
        }
    }
    
    enableVerificationNextStep() {
        // Find the next step button and enable it
        const nextStepBtn = document.querySelector('.verification-action-next');
        if (nextStepBtn && nextStepBtn.classList.contains('disabled')) {
            nextStepBtn.classList.remove('disabled');
            nextStepBtn.disabled = false;
        }
    }
    
    simulateGovDatabaseCheck(licenseData) {
        return new Promise((resolve, reject) => {
            // Simulate database connection - would be a real API call in production
            setTimeout(() => {
                // Create database response structure
                const response = {
                    verification_id: 'VRF-' + Math.random().toString(36).substring(2, 10).toUpperCase(),
                    timestamp: new Date().toISOString(),
                    license_data: {
                        license_number: licenseData.licenseNumber,
                        name: licenseData.name,
                        dob: licenseData.dateOfBirth,
                        expiry_date: licenseData.expiryDate,
                        class: licenseData.licenseClass,
                        issuing_province: licenseData.province
                    },
                    status: Math.random() < 0.9 ? 'VERIFIED' : 'FAILED',
                    verification_method: 'GOV_DATABASE_SIMULATION',
                    verification_score: Math.random() < 0.9 ? Math.random() * (0.95 - 0.85) + 0.85 : Math.random() * 0.7,
                    additional_checks: {
                        expiry_check: licenseData.expiryDate > new Date().toISOString().split('T')[0],
                        suspension_check: Math.random() < 0.95,
                        fraud_check: Math.random() < 0.98
                    }
                };
                
                if (response.status === 'VERIFIED') {
                    resolve(response);
                } else {
                    // Include failure reason in rejected response
                    response.failure_reason = [
                        'License not found in database',
                        'License reported as stolen',
                        'Information mismatch',
                        'License suspended'
                    ][Math.floor(Math.random() * 4)];
                    reject(response);
                }
            }, 2500); // Simulate network delay
        });
    }
    
    setupDriverVerificationSteps() {
        // Get all step cards
        const stepCards = document.querySelectorAll('#driver-verification-page .step-card');
        if (!stepCards.length) return;
        
        // Initialize active step
        this.currentVerificationStep = 0;
        this.updateVerificationStepsUI();
        
        // Setup next/prev buttons
        const nextBtn = document.querySelector('.verification-action-next');
        const prevBtn = document.querySelector('.verification-action-prev');
        
        if (nextBtn) {
            nextBtn.addEventListener('click', () => {
                // Validate current step
                if (this.validateVerificationStep(this.currentVerificationStep)) {
                    // Move to next step
                    this.currentVerificationStep++;
                    this.updateVerificationStepsUI();
                }
            });
        }
        
        if (prevBtn) {
            prevBtn.addEventListener('click', () => {
                if (this.currentVerificationStep > 0) {
                    this.currentVerificationStep--;
                    this.updateVerificationStepsUI();
                }
            });
        }
        
        // Setup complete button
        const completeBtn = document.querySelector('.verification-action-complete');
        if (completeBtn) {
            completeBtn.addEventListener('click', () => {
                // Validate final step
                if (this.validateVerificationStep(this.currentVerificationStep)) {
                    this.completeDriverVerification();
                }
            });
        }
    }
    
    validateVerificationStep(stepIndex) {
        // Implement validation logic for each step
        switch (stepIndex) {
            case 0: // License step (Required)
                // Check if license is verified
                if (!this.verificationStatus || !this.verificationStatus.license || !this.verificationStatus.license.verified) {
                    this.showToast('Please complete license verification first', 'error');
                    return false;
                }
                return true;
                
            case 1: // Vehicle step (Optional)
                // Vehicle information is optional - always valid
                // If user provides partial info, validate only filled fields
                const vehicleModel = document.getElementById('vehicle-model');
                const vehicleColor = document.getElementById('vehicle-color');
                const licensePlate = document.getElementById('license-plate');
                const seatCount = document.getElementById('seat-count');
                
                // Check if any vehicle fields are filled
                const hasVehicleInfo = (vehicleModel && vehicleModel.value.trim()) ||
                                     (vehicleColor && vehicleColor.value.trim()) ||
                                     (licensePlate && licensePlate.value.trim()) ||
                                     (seatCount && seatCount.value);
                
                // If user started filling vehicle info, validate required fields
                if (hasVehicleInfo) {
                    if (vehicleModel && vehicleModel.value.trim() && 
                        (!vehicleColor || !vehicleColor.value.trim())) {
                        this.showToast('Please enter vehicle color', 'warning');
                        return false;
                    }
                    
                    if (vehicleColor && vehicleColor.value.trim() && 
                        (!vehicleModel || !vehicleModel.value.trim())) {
                        this.showToast('Please enter vehicle model', 'warning');
                        return false;
                    }
                }
                
                return true;
                
            case 2: // Banking step (Optional)
                // Banking information is optional - always valid
                // If user provides partial info, validate only filled fields
                const accountName = document.getElementById('account-name');
                const bankName = document.getElementById('bank-name');
                const accountNumber = document.getElementById('account-number');
                
                // Check if any banking fields are filled
                const hasBankingInfo = (accountName && accountName.value.trim()) ||
                                     (bankName && bankName.value.trim()) ||
                                     (accountNumber && accountNumber.value.trim()) ||
                                     (this.uploadedFiles && this.uploadedFiles.cheque);
                
                // If user started filling banking info, validate required fields
                if (hasBankingInfo) {
                    if ((accountName && accountName.value.trim()) || 
                        (bankName && bankName.value.trim()) || 
                        (accountNumber && accountNumber.value.trim())) {
                        
                        if (!accountName || !accountName.value.trim()) {
                            this.showToast('Please complete account holder name', 'warning');
                            return false;
                        }
                        
                        if (!bankName || !bankName.value.trim()) {
                            this.showToast('Please complete bank name', 'warning');
                            return false;
                        }
                        
                        if (!accountNumber || !accountNumber.value.trim()) {
                            this.showToast('Please complete account number', 'warning');
                            return false;
                        }
                    }
                }
                
                return true;
                
            default:
                return true;
        }
    }
    
    updateVerificationStepsUI() {
        // Get all step cards
        const stepCards = document.querySelectorAll('#driver-verification-page .step-card');
        if (!stepCards.length) return;
        
        // Update active state
        stepCards.forEach((card, index) => {
            if (index === this.currentVerificationStep) {
                card.classList.add('active');
            } else {
                card.classList.remove('active');
            }
        });
        
        // Update buttons visibility
        const nextBtn = document.querySelector('.verification-action-next');
        const prevBtn = document.querySelector('.verification-action-prev');
        const completeBtn = document.querySelector('.verification-action-complete');
        
        if (prevBtn) {
            prevBtn.style.display = this.currentVerificationStep === 0 ? 'none' : 'block';
        }
        
        if (nextBtn) {
            nextBtn.style.display = this.currentVerificationStep < stepCards.length - 1 ? 'block' : 'none';
        }
        
        if (completeBtn) {
            completeBtn.style.display = this.currentVerificationStep === stepCards.length - 1 ? 'block' : 'none';
        }
        
        // Disable next button for license step initially
        if (this.currentVerificationStep === 0 && nextBtn) {
            if (!this.verificationStatus || !this.verificationStatus.license || !this.verificationStatus.license.verified) {
                nextBtn.classList.add('disabled');
                nextBtn.disabled = true;
            }
        }
    }
    
    completeDriverVerification() {
        this.showLoading('Submitting verification information...');
        
        // Simulate submission to Supabase
        setTimeout(() => {
            this.hideLoading();
            
            // Collect verification data - handle optional fields
            const vehicleModel = document.getElementById('vehicle-model');
            const vehicleColor = document.getElementById('vehicle-color');
            const licensePlate = document.getElementById('license-plate');
            const seatCount = document.getElementById('seat-count');
            
            const accountName = document.getElementById('account-name');
            const bankName = document.getElementById('bank-name');
            const accountNumber = document.getElementById('account-number');
            
            // Build vehicle data only if provided
            const vehicleData = {};
            if (vehicleModel && vehicleModel.value.trim()) vehicleData.model = vehicleModel.value;
            if (vehicleColor && vehicleColor.value.trim()) vehicleData.color = vehicleColor.value;
            if (licensePlate && licensePlate.value.trim()) vehicleData.licensePlate = licensePlate.value;
            if (seatCount && seatCount.value) vehicleData.seats = seatCount.value;
            
            // Build banking data only if provided
            const bankingData = {};
            if (accountName && accountName.value.trim()) bankingData.accountName = accountName.value;
            if (bankName && bankName.value.trim()) bankingData.bankName = bankName.value;
            if (accountNumber && accountNumber.value.trim()) bankingData.accountNumber = accountNumber.value;
            
            const verificationData = {
                license: this.extractedLicenseData,
                vehicle: Object.keys(vehicleData).length > 0 ? vehicleData : null,
                banking: Object.keys(bankingData).length > 0 ? bankingData : null,
                verificationStatus: this.verificationStatus,
                timestamp: new Date().toISOString(),
                fileReferences: {
                    licenseFile: this.uploadedFiles && this.uploadedFiles.license ? this.uploadedFiles.license.file.name : null,
                    chequeFile: this.uploadedFiles && this.uploadedFiles.cheque ? this.uploadedFiles.cheque.file.name : null
                },
                completionLevel: this.getVerificationCompletionLevel()
            };
            
            // In a real app, we would save this to Supabase
            console.log('Verification data submitted:', verificationData);
            
            // Show success message and redirect
            this.showToast('Verification completed successfully!', 'success');
            
            // Update user's verification status
            if (this.currentUser) {
                this.currentUser.verified = true;
                this.currentUser.verificationLevel = verificationData.completionLevel;
                if (window.authManager) {
                    window.authManager.saveUserToStorage(this.currentUser);
                } else {
                    localStorage.setItem('ongopool_user', JSON.stringify(this.currentUser));
                }
            }
            
            // Update success page based on completion level
            this.updateVerificationSuccessPage(verificationData.completionLevel);
            
            // Show verification success page
            this.showPage('verification-success');
        }, 2000);
    }
    
    getVerificationCompletionLevel() {
        // Determine verification level based on completed sections
        let level = 'basic'; // License only
        
        const vehicleModel = document.getElementById('vehicle-model');
        const accountName = document.getElementById('account-name');
        
        const hasVehicleInfo = vehicleModel && vehicleModel.value.trim();
        const hasBankingInfo = accountName && accountName.value.trim();
        
        if (hasVehicleInfo && hasBankingInfo) {
            level = 'complete';
        } else if (hasVehicleInfo || hasBankingInfo) {
            level = 'partial';
        }
        
        return level;
    }
    
    updateVerificationSuccessPage(completionLevel) {
        // Update the success page content based on what was completed
        const vehicleDetail = document.getElementById('vehicle-detail');
        const bankingDetail = document.getElementById('banking-detail');
        const vehicleStatus = document.getElementById('vehicle-status');
        const bankingStatus = document.getElementById('banking-status');
        
        if (!vehicleDetail || !bankingDetail) return;
        
        // Check if vehicle info was provided
        const vehicleModel = document.getElementById('vehicle-model');
        const hasVehicleInfo = vehicleModel && vehicleModel.value.trim();
        
        // Check if banking info was provided
        const accountName = document.getElementById('account-name');
        const hasBankingInfo = accountName && accountName.value.trim();
        
        // Update vehicle status
        if (hasVehicleInfo && vehicleStatus) {
            vehicleStatus.textContent = 'Vehicle details submitted successfully';
            vehicleDetail.style.opacity = '1';
        } else if (vehicleStatus) {
            vehicleStatus.textContent = 'Can be added later from your dashboard';
            vehicleDetail.style.opacity = '0.6';
        }
        
        // Update banking status
        if (hasBankingInfo && bankingStatus) {
            bankingStatus.textContent = 'Payment processing setup complete';
            bankingDetail.style.opacity = '1';
        } else if (bankingStatus) {
            bankingStatus.textContent = 'Can be added later to receive payments';
            bankingDetail.style.opacity = '0.6';
        }
    }

    removeUploadedFile(uploadType) {
        const uploadArea = document.getElementById(`${uploadType}-upload`);
        if (uploadArea) {
            // Reset to original placeholder
            uploadArea.innerHTML = `
                <div class="upload-placeholder">
                    <i class="fas fa-camera"></i>
                    <p>Tap to upload ${uploadType === 'license' ? 'license photo' : 'banking document'}</p>
                    <small>JPG, PNG up to 5MB</small>
                </div>
            `;
            
            // Clear the file input
            const fileInput = document.getElementById(`${uploadType}-file`);
            if (fileInput) {
                fileInput.value = '';
            }
            
            // Remove from stored files
            if (this.uploadedFiles && this.uploadedFiles[uploadType]) {
                delete this.uploadedFiles[uploadType];
            }
            
            this.showToast(`${uploadType === 'license' ? 'License' : 'Banking document'} removed`, 'info');
        }
    }

    setupForms() {
        // Login form
        const loginForm = document.getElementById('login-form');
        if (loginForm) {
            loginForm.addEventListener('submit', (e) => {
                e.preventDefault();
                const formData = new FormData(e.target);
                this.login(formData.get('email'), formData.get('password'));
            });
        }

        // Signup form
        const signupForm = document.getElementById('signup-form');
        if (signupForm) {
            signupForm.addEventListener('submit', (e) => {
                e.preventDefault();
                const formData = new FormData(e.target);
                this.signup(formData);
            });
        }
    }

    setupPasswordToggles() {
        const toggles = document.querySelectorAll('.toggle-password');
        toggles.forEach(toggle => {
            toggle.addEventListener('click', (e) => {
                const input = e.target.closest('.input-wrapper').querySelector('input');
                const icon = e.target.closest('.toggle-password').querySelector('i');
                
                if (input.type === 'password') {
                    input.type = 'text';
                    icon.className = 'fas fa-eye-slash';
                } else {
                    input.type = 'password';
                    icon.className = 'fas fa-eye';
                }
            });
        });
    }

    setupLocationSwap() {
        const swapButton = document.querySelector('.location-swap button');
        if (swapButton) {
            swapButton.addEventListener('click', () => {
                const pickup = document.getElementById('pickup-input');
                const destination = document.getElementById('destination-input');
                
                if (pickup && destination) {
                    const temp = pickup.value;
                    pickup.value = destination.value;
                    destination.value = temp;
                }
            });
        }
    }
    
    setupNotificationButtons() {
        // Setup notification buttons across the app
        const notificationButtons = document.querySelectorAll('.btn-notification');
        
        notificationButtons.forEach(button => {
            button.addEventListener('click', () => {
                this.showNotificationPanel();
            });
        });
    }

    setupTouchInteractions() {
        // Add touch feedback to all interactive elements
        const interactiveElements = document.querySelectorAll('button, .action-card, .ride-card, .menu-item, .nav-item');
        
        interactiveElements.forEach(element => {
            element.addEventListener('touchstart', () => {
                element.style.transform = 'scale(0.98)';
            });
            
            element.addEventListener('touchend', () => {
                setTimeout(() => {
                    element.style.transform = '';
                }, 100);
            });
        });
    }

    preventZoom() {
        // Prevent zoom on double tap
        let lastTouchEnd = 0;
        document.addEventListener('touchend', (event) => {
            const now = (new Date()).getTime();
            if (now - lastTouchEnd <= 300) {
                event.preventDefault();
            }
            lastTouchEnd = now;
        }, false);
    }

    checkAuthState() {
        const userData = localStorage.getItem('ongopool_user');
        const authTimestamp = localStorage.getItem('ongopool_auth_timestamp');
        
        if (userData && authTimestamp) {
            const sevenDaysAgo = Date.now() - (7 * 24 * 60 * 60 * 1000);
            if (parseInt(authTimestamp) > sevenDaysAgo) {
                this.currentUser = JSON.parse(userData);
                this.updateUIForUser();
                
                // Check for hash navigation after auth check
                const hash = window.location.hash.substring(1);
                if (hash) {
                    this.showPage(hash);
                }
                return;
            }
        }
        
        // Clear expired session
        localStorage.removeItem('ongopool_user');
        localStorage.removeItem('ongopool_auth_timestamp');
        this.currentUser = null;
    }

    updateUIForUser() {
        if (!this.currentUser) return;
        
        // Safely get user name and fallback values
        const userName = this.currentUser.name || 
                        (this.currentUser.first_name && this.currentUser.last_name ? 
                         `${this.currentUser.first_name} ${this.currentUser.last_name}` : 
                         this.currentUser.email?.split('@')[0] || 'User');
        
        const userRole = this.currentUser.role || 'passenger';
        const firstName = userName.includes(' ') ? userName.split(' ')[0] : userName;
        
        // Update profile information
        const profileName = document.getElementById('profile-name');
        const profileRole = document.getElementById('profile-role');
        const passengerName = document.getElementById('passenger-name');
        const driverName = document.getElementById('driver-name');
        
        if (profileName) profileName.textContent = userName;
        if (profileRole) profileRole.textContent = this.capitalizeFirst(userRole);
        if (passengerName) passengerName.textContent = firstName;
        if (driverName) driverName.textContent = firstName;
        
        // Load additional user data if needed
        this.loadUserRides();
    }

    capitalizeFirst(str) {
        return str.charAt(0).toUpperCase() + str.slice(1);
    }

    async login(email, password) {
        this.showLoading('Signing in...');
        
        try {
            // Try to authenticate using Supabase first
            if (window.authManager) {
                const result = await window.authManager.signIn(email, password);
                if (result.user) {
                    // Use the authenticated user data from Supabase
                    this.currentUser = result.user;
                    this.hideLoading();
                    this.showToast('Welcome back!', 'success');
                    this.updateUIForUser();
                    
                    // Navigate to appropriate dashboard
                    this.goToDashboard();
                    return;
                }
            }
            
            // Fallback to local authentication if Supabase fails
            // Simulate API call
            await new Promise(resolve => setTimeout(resolve, 1500));
            
            // Check if user exists in our demo user storage
            const storedUsers = this.getStoredUsers();
            let existingUser = storedUsers.find(user => user.email === email);
            
            if (existingUser) {
                // Use existing user data with their original role
                this.currentUser = existingUser;
            } else {
                // Create new user with default role detection for demo
                let role = 'passenger';
                if (email.includes('driver') || email.includes('sarah')) {
                    role = 'driver';
                }
                
                const userData = {
                    id: 'user_' + Date.now(),
                    email: email,
                    name: this.generateNameFromEmail(email),
                    role: role,
                    verified: true,
                    phone: '+1 (555) 123-4567'
                };
                
                this.currentUser = userData;
                this.storeUser(userData);
            }
            
            localStorage.setItem('ongopool_user', JSON.stringify(this.currentUser));
            localStorage.setItem('ongopool_auth_timestamp', Date.now().toString());
            
            this.hideLoading();
            this.showToast('Welcome back!', 'success');
            this.updateUIForUser();
            
            // Navigate to appropriate dashboard
            this.goToDashboard();

        } catch (error) {
            this.hideLoading();
            this.showToast('Login failed. Please try again.', 'error');
            console.error('Login error:', error);
        }
    }

    async signup(formData) {
        this.showLoading('Creating account...');
        
        try {
            // Try to create account using Supabase
            if (window.authManager) {
                const userData = {
                    name: formData.get('name'),
                    email: formData.get('email'),
                    phone: formData.get('phone'),
                    password: formData.get('password'),
                    role: formData.get('role')
                };
                
                const result = await window.authManager.signUp(userData);
                
                if (result.user) {
                    this.hideLoading();
                    
                    if (result.needsEmailVerification) {
                        // Store email for resend functionality
                        localStorage.setItem('pending_verification_email', userData.email);
                        
                        // Show email verification message
                        this.showToast(result.message || 'Please check your email to verify your account.', 'success');
                        this.showPage('email-verification');
                        return;
                    } else {
                        // User is already verified
                        this.currentUser = result.user;
                        this.showToast('Account created successfully!', 'success');
                        this.updateUIForUser();
                        this.goToDashboard();
                        return;
                    }
                } else if (result.error) {
                    throw new Error(result.error);
                }
            }
            
            // Fallback to local storage if Supabase fails
            // Simulate API call
            await new Promise(resolve => setTimeout(resolve, 2000));
            
            const userData = {
                id: 'user_' + Date.now(),
                email: formData.get('email'),
                name: formData.get('name'),
                phone: formData.get('phone'),
                role: formData.get('role'),
                verified: false
            };
            
            this.currentUser = userData;
            this.storeUser(userData);
            localStorage.setItem('ongopool_user', JSON.stringify(userData));
            localStorage.setItem('ongopool_auth_timestamp', Date.now().toString());
            
            this.hideLoading();
            this.showToast('Account created successfully!', 'success');
            this.updateUIForUser();
            
            // Navigate to appropriate dashboard
            this.goToDashboard();

        } catch (error) {
            this.hideLoading();
            this.showToast('Signup failed. Please try again.', 'error');
            console.error('Signup error:', error);
        }
    }

    generateNameFromEmail(email) {
        const username = email.split('@')[0];
        if (username.includes('sarah')) return 'Sarah Johnson';
        if (username.includes('driver')) return 'Michael Chen';
        if (username.includes('john')) return 'John Doe';
        
        // Generate a random name
        const firstNames = ['Alex', 'Jordan', 'Taylor', 'Casey', 'Morgan', 'Riley'];
        const lastNames = ['Smith', 'Johnson', 'Williams', 'Brown', 'Jones', 'Garcia'];
        
        const firstName = firstNames[Math.floor(Math.random() * firstNames.length)];
        const lastName = lastNames[Math.floor(Math.random() * lastNames.length)];
        
        return `${firstName} ${lastName}`;
    }

    // User storage methods for demo persistence
    getStoredUsers() {
        const users = localStorage.getItem('ongopool_users');
        return users ? JSON.parse(users) : [];
    }

    storeUser(userData) {
        const users = this.getStoredUsers();
        const existingIndex = users.findIndex(user => user.email === userData.email);
        
        if (existingIndex >= 0) {
            users[existingIndex] = userData;
        } else {
            users.push(userData);
        }
        
        localStorage.setItem('ongopool_users', JSON.stringify(users));
    }
    
    // Tab switching functionality for My Rides page
    setupRideTabs() {
        const tabButtons = document.querySelectorAll('.tab-button');
        const tabContents = document.querySelectorAll('.tab-content');
        
        tabButtons.forEach(button => {
            button.addEventListener('click', () => {
                const targetTab = button.getAttribute('data-tab');
                
                // Remove active class from all tabs and contents
                tabButtons.forEach(btn => btn.classList.remove('active'));
                tabContents.forEach(content => content.classList.remove('active'));
                
                // Add active class to clicked tab and corresponding content
                button.classList.add('active');
                const targetContent = document.getElementById(`${targetTab}-tab`);
                if (targetContent) {
                    targetContent.classList.add('active');
                }
            });
        });
    }

    goToDashboard() {
        if (!this.currentUser) {
            console.log('No current user, redirecting to onboarding');
            this.showPage('onboarding');
            return;
        }
        
        console.log('Navigating to dashboard for user:', this.currentUser.email, 'with role:', this.currentUser.role);
        
        // Navigate based on user role
        switch (this.currentUser.role) {
            case 'admin':
                this.showPage('admin-dashboard');
                break;
            case 'driver':
                this.showPage('driver-dashboard');
                break;
            case 'both':
                // For users with both roles, default to driver dashboard
                this.showPage('driver-dashboard');
                break;
            case 'passenger':
            default:
                this.showPage('passenger-dashboard');
                break;
        }
    }

    logout() {
        localStorage.removeItem('ongopool_user');
        localStorage.removeItem('ongopool_auth_timestamp');
        this.currentUser = null;
        
        this.showToast('You have been logged out', 'info');
        this.showPage('splash-screen');
    }

    showPage(pageId) {
        // Hide all pages
        const pages = document.querySelectorAll('.page');
        
        // Find target page
        const targetPage = document.getElementById(`${pageId}-page`) || document.getElementById(pageId);
        
        if (targetPage) {
            // Get current active page
            const currentActivePage = document.querySelector('.page.active');
            
            if (currentActivePage) {
                // Add sliding animation
                currentActivePage.classList.add('slide-out');
                targetPage.classList.add('slide-in');
                
                // Wait for animation to complete
                setTimeout(() => {
                    // Remove active class from all pages
                    pages.forEach(page => {
                        page.classList.remove('active', 'slide-out', 'slide-in');
                    });
                    
                    // Activate target page
                    targetPage.classList.add('active');
                }, 300);
            } else {
                // No active page (first load), just show target
                targetPage.classList.add('active');
            }
            
            this.currentPage = pageId;
            
            // Update navigation states
            this.updateNavigationState();
            
            // Load page-specific data
            this.loadPageData(pageId);
            
            // Scroll to top
            window.scrollTo(0, 0);
        } else {
            console.error(`Page with ID "${pageId}" not found`);
        }
    }

    loadPageData(pageId) {
        // Add page-specific data loading logic here
        console.log('Loading data for page:', pageId);
        
        if (pageId === 'driver-verification') {
            this.setupDriverVerification();
        }
    }

    setupDriverVerification() {
        // Setup file upload handlers
        this.setupFileUpload('license-upload', 'license-file');
        this.setupFileUpload('cheque-upload', 'cheque-file');
        
        // Setup form validation
        this.setupVerificationFormValidation();
        
        // Load existing verification data
        this.loadVerificationData();
        
        // Update verification status display
        this.updateVerificationStatus();
    }

    setupFileUpload(uploadAreaId, fileInputId) {
        const uploadArea = document.getElementById(uploadAreaId);
        const fileInput = document.getElementById(fileInputId);
        
        if (uploadArea && fileInput) {
            uploadArea.addEventListener('click', () => {
                fileInput.click();
            });
            
            fileInput.addEventListener('change', (e) => {
                this.handleVerificationFileUpload(e, uploadArea);
            });
            
            // Drag and drop support
            uploadArea.addEventListener('dragover', (e) => {
                e.preventDefault();
                uploadArea.classList.add('dragover');
            });
            
            uploadArea.addEventListener('dragleave', () => {
                uploadArea.classList.remove('dragover');
            });
            
            uploadArea.addEventListener('drop', (e) => {
                e.preventDefault();
                uploadArea.classList.remove('dragover');
                
                const files = e.dataTransfer.files;
                if (files.length > 0) {
                    fileInput.files = files;
                    this.handleVerificationFileUpload({target: {files}}, uploadArea);
                }
            });
        }
    }

    handleVerificationFileUpload(event, uploadArea) {
        const file = event.target.files[0];
        if (!file) return;
        
        // Validate file type and size
        const allowedTypes = ['image/jpeg', 'image/png', 'image/jpg', 'application/pdf'];
        if (!allowedTypes.includes(file.type)) {
            this.showToast('Please upload JPG, PNG, or PDF files only', 'error');
            return;
        }
        
        if (file.size > 5 * 1024 * 1024) { // 5MB limit
            this.showToast('File size must be less than 5MB', 'error');
            return;
        }
        
        // Update upload area to show file
        uploadArea.classList.add('has-file');
        
        const placeholder = uploadArea.querySelector('.upload-placeholder');
        if (placeholder) {
            placeholder.innerHTML = `
                <i class="fas fa-check-circle"></i>
                <p>${file.name}</p>
                <small>${(file.size / 1024 / 1024).toFixed(2)} MB</small>
            `;
        }
        
        // Enable next step or submit button
        this.checkVerificationCompletion();
    }

    setupVerificationFormValidation() {
        const forms = ['license-form', 'vehicle-form', 'banking-form'];
        
        forms.forEach(formId => {
            const form = document.getElementById(formId);
            if (form) {
                const inputs = form.querySelectorAll('input, select');
                inputs.forEach(input => {
                    input.addEventListener('blur', () => {
                        this.validateVerificationField(input);
                    });
                    
                    input.addEventListener('input', () => {
                        this.checkVerificationCompletion();
                    });
                });
            }
        });
    }

    validateVerificationField(field) {
        let isValid = true;
        let errorMessage = '';
        
        // Clear previous errors
        field.classList.remove('error');
        const existingError = field.parentNode.querySelector('.field-error');
        if (existingError) {
            existingError.remove();
        }
        
        // Required field validation
        if (field.hasAttribute('required') && !field.value.trim()) {
            isValid = false;
            errorMessage = 'This field is required';
        }
        
        // Specific field validations
        switch (field.id) {
            case 'license-number':
                if (field.value && !/^[A-Z0-9\-]{8,15}$/i.test(field.value)) {
                    isValid = false;
                    errorMessage = 'Invalid license number format';
                }
                break;
                
            case 'license-expiry':
                if (field.value) {
                    const expiryDate = new Date(field.value);
                    const today = new Date();
                    if (expiryDate <= today) {
                        isValid = false;
                        errorMessage = 'License must not be expired';
                    }
                }
                break;
                
            case 'license-plate':
                if (field.value && !/^[A-Z0-9\-]{2,8}$/i.test(field.value)) {
                    isValid = false;
                    errorMessage = 'Invalid license plate format';
                }
                break;
                
            case 'account-number':
                if (field.value && !/^\d{7,12}$/.test(field.value)) {
                    isValid = false;
                    errorMessage = 'Account number must be 7-12 digits';
                }
                break;
                
            case 'routing-number':
                if (field.value && !/^\d{9}$/.test(field.value)) {
                    isValid = false;
                    errorMessage = 'Routing number must be 9 digits';
                }
                break;
        }
        
        if (!isValid) {
            field.classList.add('error');
            const errorDiv = document.createElement('div');
            errorDiv.className = 'field-error';
            errorDiv.innerHTML = `<i class="fas fa-exclamation-circle"></i> ${errorMessage}`;
            field.parentNode.appendChild(errorDiv);
        }
        
        return isValid;
    }

    checkVerificationCompletion() {
        const licenseComplete = this.isStepComplete('license');
        const vehicleComplete = this.isStepComplete('vehicle');
        const bankingComplete = this.isStepComplete('banking');
        
        // Update step statuses
        this.updateStepStatus('license-step', licenseComplete);
        this.updateStepStatus('vehicle-step', vehicleComplete);
        this.updateStepStatus('banking-step', bankingComplete);
        
        // Enable/disable submit button
        const submitBtn = document.getElementById('submit-verification-btn');
        if (submitBtn) {
            submitBtn.disabled = !(licenseComplete && vehicleComplete && bankingComplete);
        }
    }

    isStepComplete(step) {
        switch (step) {
            case 'license':
                const licenseForm = document.getElementById('license-form');
                const licenseFile = document.getElementById('license-file');
                return this.isFormValid(licenseForm) && licenseFile && licenseFile.files.length > 0;
                
            case 'vehicle':
                const vehicleForm = document.getElementById('vehicle-form');
                return this.isFormValid(vehicleForm);
                
            case 'banking':
                const bankingForm = document.getElementById('banking-form');
                const chequeFile = document.getElementById('cheque-file');
                return this.isFormValid(bankingForm) && chequeFile && chequeFile.files.length > 0;
                
            default:
                return false;
        }
    }

    isFormValid(form) {
        if (!form) return false;
        
        const requiredFields = form.querySelectorAll('[required]');
        return Array.from(requiredFields).every(field => {
            return field.value.trim() !== '' && !field.classList.contains('error');
        });
    }

    updateStepStatus(stepId, isComplete) {
        const stepCard = document.getElementById(stepId);
        if (stepCard) {
            if (isComplete) {
                stepCard.classList.add('completed');
                stepCard.classList.remove('active');
                
                const statusIcon = stepCard.querySelector('.step-status i');
                if (statusIcon) {
                    statusIcon.className = 'fas fa-check';
                }
            } else {
                stepCard.classList.remove('completed');
                
                const statusIcon = stepCard.querySelector('.step-status i');
                if (statusIcon) {
                    statusIcon.className = 'fas fa-circle';
                }
            }
        }
    }

    updateVerificationStatus() {
        // Check current user verification status from database
        if (this.currentUser) {
            // This would typically check the database for verification status
            // For now, show pending status
            const statusDiv = document.getElementById('verification-status');
            if (statusDiv) {
                statusDiv.innerHTML = `
                    <div class="status-pending">
                        <div class="status-icon">
                            <i class="fas fa-clock"></i>
                        </div>
                        <h3>Verification Required</h3>
                        <p>Complete your driver verification to start offering rides</p>
                    </div>
                `;
            }
        }
    }

    async loadVerificationData() {
        // Load existing verification data from database
        try {
            if (this.currentUser && window.supabaseService) {
                // This would load existing verification data
                console.log('Loading verification data for user:', this.currentUser.id);
            }
        } catch (error) {
            console.error('Error loading verification data:', error);
        }
    }

    async saveVerificationProgress() {
        const data = this.collectVerificationData();
        
        try {
            // Save to database
            if (window.supabaseService && this.currentUser) {
                // This would save progress to database
                console.log('Saving verification progress:', data);
            }
            
            this.showToast('Progress saved successfully', 'success');
        } catch (error) {
            console.error('Error saving verification progress:', error);
            this.showToast('Error saving progress', 'error');
        }
    }

    async submitVerification() {
        const data = this.collectVerificationData();
        
        try {
            // Validate all data is complete
            if (!this.isStepComplete('license') || !this.isStepComplete('vehicle') || !this.isStepComplete('banking')) {
                this.showToast('Please complete all verification steps', 'error');
                return;
            }
            
            // Show loading
            const submitBtn = document.getElementById('submit-verification-btn');
            const originalText = submitBtn.textContent;
            submitBtn.textContent = 'Submitting...';
            submitBtn.disabled = true;
            
            // Submit to database
            if (window.supabaseService && this.currentUser) {
                // This would submit for review
                console.log('Submitting verification:', data);
            }
            
            // Update status
            const statusDiv = document.getElementById('verification-status');
            if (statusDiv) {
                statusDiv.innerHTML = `
                    <div class="status-pending">
                        <div class="status-icon">
                            <i class="fas fa-clock"></i>
                        </div>
                        <h3>Verification Submitted</h3>
                        <p>Your verification is being reviewed. You'll be notified within 1-2 business days.</p>
                    </div>
                `;
            }
            
            this.showToast('Verification submitted successfully!', 'success');
            
            // Navigate back to dashboard
            setTimeout(() => {
                this.showPage('driver-dashboard');
            }, 2000);
            
        } catch (error) {
            console.error('Error submitting verification:', error);
            this.showToast('Error submitting verification', 'error');
        } finally {
            // Reset button
            const submitBtn = document.getElementById('submit-verification-btn');
            submitBtn.textContent = originalText;
            submitBtn.disabled = false;
        }
    }

    collectVerificationData() {
        const data = {};
        
        // License data
        const licenseForm = document.getElementById('license-form');
        if (licenseForm) {
            const formData = new FormData(licenseForm);
            data.license = {
                number: formData.get('license-number') || document.getElementById('license-number')?.value,
                class: formData.get('license-class') || document.getElementById('license-class')?.value,
                expiry: formData.get('license-expiry') || document.getElementById('license-expiry')?.value,
                file: document.getElementById('license-file')?.files[0]
            };
        }
        
        // Vehicle data
        const vehicleForm = document.getElementById('vehicle-form');
        if (vehicleForm) {
            const formData = new FormData(vehicleForm);
            data.vehicle = {
                model: formData.get('vehicle-model') || document.getElementById('vehicle-model')?.value,
                color: formData.get('vehicle-color') || document.getElementById('vehicle-color')?.value,
                plate: formData.get('license-plate') || document.getElementById('license-plate')?.value,
                seats: formData.get('seat-count') || document.getElementById('seat-count')?.value
            };
        }
        
        // Banking data
        const bankingForm = document.getElementById('banking-form');
        if (bankingForm) {
            const formData = new FormData(bankingForm);
            data.banking = {
                accountName: formData.get('account-name') || document.getElementById('account-name')?.value,
                bankName: formData.get('bank-name') || document.getElementById('bank-name')?.value,
                accountNumber: formData.get('account-number') || document.getElementById('account-number')?.value,
                routingNumber: formData.get('routing-number') || document.getElementById('routing-number')?.value,
                file: document.getElementById('cheque-file')?.files[0]
            };
        }
        
        return data;
    }

    async handleEmailVerification() {
        // Check for email verification parameters in URL
        const urlParams = new URLSearchParams(window.location.search);
        const token = urlParams.get('token');
        const type = urlParams.get('type');
        
        if (token && type === 'signup') {
            await this.processEmailConfirmation(token);
        }
    }

    async handleEmailConfirmation() {
        // Handle email confirmation from hash navigation
        const urlParams = new URLSearchParams(window.location.search);
        const token = urlParams.get('token');
        
        if (token) {
            await this.processEmailConfirmation(token);
        } else {
            // Show success page without processing
            this.showPage('email-verification-success');
        }
    }

    async processEmailConfirmation(token) {
        try {
            this.showLoading('Verifying your email...');
            
            if (window.supabaseService) {
                const result = await window.supabaseService.confirmEmail(token);
                
                if (result.success) {
                    // Email verified successfully
                    this.hideLoading();
                    this.showToast('Email verified successfully!', 'success');
                    
                    // Get the verified user
                    const user = result.user;
                    if (user) {
                        // Check if profile exists, create if needed
                        const profileResult = await window.supabaseService.getUserProfile(user.id);
                        
                        if (!profileResult.success) {
                            // Create profile from auth metadata
                            const metadata = user.user_metadata;
                            if (metadata) {
                                await window.supabaseService.createUserProfile(user.id, {
                                    first_name: metadata.name?.split(' ')[0] || '',
                                    last_name: metadata.name?.split(' ').slice(1).join(' ') || '',
                                    phone: metadata.phone || '',
                                    role: metadata.role || 'passenger',
                                    email: user.email
                                });
                            }
                        }
                        
                        // Set current user and redirect
                        this.currentUser = {
                            id: user.id,
                            email: user.email,
                            name: user.user_metadata?.name || user.email.split('@')[0],
                            role: user.user_metadata?.role || 'passenger',
                            email_confirmed: true
                        };
                        
                        this.saveUserToStorage(this.currentUser);
                        this.updateUIForUser();
                    }
                    
                    this.showPage('email-verification-success');
                } else {
                    throw new Error(result.error);
                }
            } else {
                // Fallback for demo mode
                this.hideLoading();
                this.showPage('email-verification-success');
            }
        } catch (error) {
            this.hideLoading();
            console.error('Email verification error:', error);
            this.showToast('Email verification failed. Please try again.', 'error');
            this.showPage('login');
        }
    }

    async resendVerificationEmail() {
        const email = localStorage.getItem('pending_verification_email');
        
        if (!email) {
            this.showToast('No email found to resend verification', 'error');
            return;
        }
        
        try {
            const resendBtn = document.getElementById('resend-verification-btn');
            const originalText = resendBtn.innerHTML;
            resendBtn.innerHTML = '<i class="fas fa-spinner fa-spin"></i> Sending...';
            resendBtn.disabled = true;
            
            if (window.supabaseService) {
                const result = await window.supabaseService.resendEmailVerification(email);
                
                if (result.success) {
                    this.showToast('Verification email sent!', 'success');
                } else {
                    throw new Error(result.error);
                }
            } else {
                // Demo mode
                await new Promise(resolve => setTimeout(resolve, 1000));
                this.showToast('Verification email sent!', 'success');
            }
        } catch (error) {
            console.error('Resend verification error:', error);
            this.showToast('Failed to resend verification email', 'error');
        } finally {
            const resendBtn = document.getElementById('resend-verification-btn');
            resendBtn.innerHTML = '<i class="fas fa-paper-plane"></i> Resend Verification Email';
            resendBtn.disabled = false;
        }
    }

    proceedAfterVerification() {
        // Clear verification parameters from URL
        const cleanUrl = window.location.origin + window.location.pathname;
        window.history.replaceState({}, document.title, cleanUrl);
        
        // Navigate to appropriate dashboard
        if (this.currentUser) {
            this.goToDashboard();
        } else {
            this.showPage('login');
        }
    }

    saveUserToStorage(user) {
        try {
            localStorage.setItem('ongopool_user', JSON.stringify(user));
            localStorage.setItem('ongopool_auth_timestamp', Date.now().toString());
        } catch (error) {
            console.error('Failed to save user to storage:', error);
        }
    }
    
    // Profile photo handling
    handleProfilePhotoChange(event) {
        const file = event.target.files[0];
        if (!file) return;
        
        // Check file type and size
        if (!file.type.match('image.*')) {
            this.showToast('Please select an image file', 'error');
            return;
        }
        
        if (file.size > 5 * 1024 * 1024) { // 5MB limit
            this.showToast('Image size should be less than 5MB', 'error');
            return;
        }
        
        // Create and save preview
        const reader = new FileReader();
        reader.onload = (e) => {
            const previewDiv = document.getElementById('profile-photo-preview');
            if (previewDiv) {
                // Hide the icon and show the image
                previewDiv.innerHTML = '';
                previewDiv.style.backgroundImage = `url(${e.target.result})`;
                
                // Show remove button
                const removeBtn = document.getElementById('remove-photo-btn');
                if (removeBtn) {
                    removeBtn.style.display = 'block';
                }
                
                // Save the file reference for later upload
                this.pendingProfilePhoto = file;
            }
        };
        reader.readAsDataURL(file);
    }
    
    removeProfilePhoto() {
        const previewDiv = document.getElementById('profile-photo-preview');
        if (previewDiv) {
            // Reset to default icon
            previewDiv.style.backgroundImage = '';
            previewDiv.innerHTML = '<i class="fas fa-user"></i>';
            
            // Hide remove button
            const removeBtn = document.getElementById('remove-photo-btn');
            if (removeBtn) {
                removeBtn.style.display = 'none';
            }
            
            // Clear file input
            const fileInput = document.getElementById('profile-photo-input');
            if (fileInput) {
                fileInput.value = '';
            }
            
            // Set flag to remove existing photo
            this.removeExistingPhoto = true;
            this.pendingProfilePhoto = null;
        }
    }
    
    // Handle profile photo upload progress
    updatePhotoUploadProgress(percent) {
        const progressBar = document.querySelector('.progress-bar');
        const progressText = document.querySelector('.progress-text');
        const progressContainer = document.getElementById('photo-upload-progress');
        
        if (progressContainer && progressBar && progressText) {
            if (percent === 0) {
                progressContainer.style.display = 'block';
            }
            
            progressBar.style.width = `${percent}%`;
            progressText.textContent = `Uploading... ${percent}%`;
            
            if (percent >= 100) {
                setTimeout(() => {
                    progressContainer.style.display = 'none';
                    progressBar.style.width = '0%';
                }, 1000);
            }
        }
    }
    
    // Save profile function
    async saveProfile() {
        const form = document.getElementById('edit-profile-form');
        if (!form) return;
        
        const formData = new FormData(form);
        const profileData = {
            fullName: formData.get('fullName'),
            email: formData.get('email'),
            phone: formData.get('phone'),
            dateOfBirth: formData.get('dateOfBirth'),
            bio: formData.get('bio'),
            emergencyContact: formData.get('emergencyContact'),
            emergencyPhone: formData.get('emergencyPhone')
        };
        
        console.log('Saving profile:', profileData);
        
        // Show loading state
        const saveBtn = document.querySelector('.btn-save');
        const originalText = saveBtn.textContent;
        saveBtn.textContent = 'Saving...';
        saveBtn.disabled = true;
        
        try {
            // Get current user
            const currentUser = await window.authManager.getCurrentUser();
            if (!currentUser) {
                throw new Error('No authenticated user found');
            }
            
            // Split full name into first and last name
            const nameParts = profileData.fullName.trim().split(' ');
            const firstName = nameParts[0] || '';
            const lastName = nameParts.slice(1).join(' ') || '';
            
            // Update data object
            const updateData = {
                first_name: firstName,
                last_name: lastName,
                email: profileData.email,
                phone: profileData.phone,
                date_of_birth: profileData.dateOfBirth || null,
                bio: profileData.bio || null,
                emergency_contact: profileData.emergencyContact || null,
                emergency_phone: profileData.emergencyPhone || null,
                updated_at: new Date().toISOString()
            };
            
            // Handle profile photo upload if exists
            if (this.pendingProfilePhoto) {
                // Upload the profile photo to Supabase Storage
                const uploadResult = await window.supabaseService.uploadProfilePhoto(
                    currentUser.id, 
                    this.pendingProfilePhoto, 
                    (percent) => this.updatePhotoUploadProgress(percent)
                );
                
                if (uploadResult.success) {
                    // Update profile with the photo URL
                    updateData.profile_image_url = uploadResult.data.url;
                    // Store photo path for potential future deletion
                    this.currentPhotoPath = uploadResult.data.path;
                } else {
                    this.showToast('Failed to upload profile photo', 'error');
                }
                
                // Clear pending photo
                this.pendingProfilePhoto = null;
            }
            
            // Handle photo removal
            if (this.removeExistingPhoto) {
                updateData.profile_image_url = null;
                
                // Delete photo from storage if path exists
                if (currentUser.profile && currentUser.profile.photo_path) {
                    await window.supabaseService.deleteProfilePhoto(
                        currentUser.id, 
                        currentUser.profile.photo_path
                    );
                }
                
                this.removeExistingPhoto = false;
            }
            
            // Update profile in Supabase
            const result = await window.supabaseService.updateUserProfile(currentUser.id, updateData);
            
            if (result.success) {
                saveBtn.textContent = 'Saved!';
                this.showToast('Profile updated successfully!', 'success');
                
                // Update current user data
                if (this.currentUser && this.currentUser.profile) {
                    Object.assign(this.currentUser.profile, updateData);
                }
                
                setTimeout(() => {
                    saveBtn.textContent = originalText;
                    saveBtn.disabled = false;
                    this.showPage('profile');
                }, 1000);
            } else {
                throw new Error(result.error || 'Failed to update profile');
            }
        } catch (error) {
            console.error('Profile save error:', error);
            saveBtn.textContent = 'Error';
            this.showToast('Failed to update profile. Please try again.', 'error');
            
            setTimeout(() => {
                saveBtn.textContent = originalText;
                saveBtn.disabled = false;
            }, 2000);
        }
    }

    updateNavigationState() {
        // Update bottom navigation active states
        const navItems = document.querySelectorAll('.nav-item');
        navItems.forEach(item => {
            item.classList.remove('active');
            
            const onclick = item.getAttribute('onclick');
            if (onclick && onclick.includes(this.currentPage)) {
                item.classList.add('active');
            }
        });
    }

    loadPageData(pageId) {
        switch (pageId) {
            case 'passenger-dashboard':
            case 'driver-dashboard':
            case 'admin-dashboard':
                this.loadDashboardData();
                break;
            case 'find-rides':
            case 'offer-ride':
                this.setMinDate();
                if (pageId === 'offer-ride') {
                    this.setupOfferRidePage();
                    this.checkDriverVerification();
                }
                break;
            case 'my-rides':
                this.loadUserRides();
                this.setupRideTabs();
                break;
            case 'edit-profile':
                this.loadEditProfileData();
                break;
            case 'notifications-settings':
                this.setupNotificationSettings();
                break;
            case 'help':
                this.setupHelpPage();
                break;
            case 'earnings':
                setupEarningsPage();
                break;
            case 'license-verification':
                this.setupLicenseVerification();
                break;
            case 'profile':
                this.loadDriverVehicleInfo();
                break;
        }
    }
    
    loadProfileData() {
        if (!this.currentUser) return;
        
        // Populate edit profile form with current user data
        const form = document.getElementById('edit-profile-form');
        if (form) {
            form.querySelector('#edit-full-name').value = this.currentUser.name || '';
            form.querySelector('#edit-email').value = this.currentUser.email || '';
            form.querySelector('#edit-phone').value = this.currentUser.phone || '';
            form.querySelector('#edit-date-of-birth').value = this.currentUser.dateOfBirth || '';
            form.querySelector('#edit-bio').value = this.currentUser.bio || '';
            form.querySelector('#edit-emergency-contact').value = this.currentUser.emergencyContact || '';
            form.querySelector('#edit-emergency-phone').value = this.currentUser.emergencyPhone || '';
        }
    }
    
    setupNotificationSettings() {
        // Setup quiet hours toggle
        const quietHoursToggle = document.getElementById('quiet-hours-toggle');
        const quietHoursTimes = document.getElementById('quiet-hours-times');
        
        if (quietHoursToggle && quietHoursTimes) {
            quietHoursToggle.addEventListener('change', function() {
                if (this.checked) {
                    quietHoursTimes.style.display = 'flex';
                } else {
                    quietHoursTimes.style.display = 'none';
                }
            });
        }
    }
    
    setupHelpPage() {
        // Setup FAQ toggles
        const faqQuestions = document.querySelectorAll('.faq-question');
        faqQuestions.forEach(question => {
            question.addEventListener('click', () => {
                const faqItem = question.parentElement;
                faqItem.classList.toggle('active');
            });
        });
        
        // Setup help search
        const helpSearch = document.getElementById('help-search');
        if (helpSearch) {
            helpSearch.addEventListener('input', (e) => {
                // Simple search functionality
                const searchTerm = e.target.value.toLowerCase();
                const faqItems = document.querySelectorAll('.faq-item');
                
                faqItems.forEach(item => {
                    const question = item.querySelector('.faq-question span').textContent.toLowerCase();
                    const answer = item.querySelector('.faq-answer p').textContent.toLowerCase();
                    
                    if (question.includes(searchTerm) || answer.includes(searchTerm) || searchTerm === '') {
                        item.style.display = 'block';
                    } else {
                        item.style.display = 'none';
                    }
                });
            });
        }
    }

    loadDashboardData() {
        this.loadUpcomingRides();
        this.loadActiveRides();
    }

    loadUpcomingRides() {
        const container = document.getElementById('upcoming-rides-list');
        if (!container) return;
        
        // Mock upcoming rides
        const upcomingRides = [
            {
                id: 'ride_001',
                from: 'Toronto',
                to: 'Ottawa',
                date: 'Today',
                time: '2:30 PM',
                driver: 'Sarah J.',
                price: '$45',
                seats: 2
            }
        ];
        
        if (upcomingRides.length === 0) {
            container.innerHTML = `
                <div class="empty-state">
                    <i class="fas fa-calendar-alt"></i>
                    <p>No upcoming rides</p>
                </div>
            `;
        } else {
            container.innerHTML = upcomingRides.map(ride => `
                <div class="ride-card" onclick="showPage('ride-details')">
                    <div class="ride-header">
                        <div class="ride-route">
                            <span class="from">${ride.from}</span>
                            <i class="fas fa-arrow-right"></i>
                            <span class="to">${ride.to}</span>
                        </div>
                        <span class="ride-price">${ride.price}</span>
                    </div>
                    <div class="ride-details">
                        <span class="ride-time">${ride.date} at ${ride.time}</span>
                        <span class="ride-driver">with ${ride.driver}</span>
                    </div>
                </div>
            `).join('');
        }
    }

    loadActiveRides() {
        const container = document.getElementById('active-rides-list');
        if (!container) return;
        
        // Mock active rides for drivers
        const activeRides = [
            {
                id: 'ride_002',
                from: 'Toronto',
                to: 'Hamilton',
                date: 'Tomorrow',
                time: '4:30 PM',
                passengers: ['Alice S.', 'Bob W.'],
                price: '$60',
                seats: 3
            }
        ];
        
        if (activeRides.length === 0) {
            container.innerHTML = `
                <div class="empty-state">
                    <i class="fas fa-car"></i>
                    <p>No active rides</p>
                </div>
            `;
        } else {
            container.innerHTML = activeRides.map(ride => `
                <div class="ride-card" onclick="showPage('manage-ride')">
                    <div class="ride-header">
                        <div class="ride-route">
                            <span class="from">${ride.from}</span>
                            <i class="fas fa-arrow-right"></i>
                            <span class="to">${ride.to}</span>
                        </div>
                        <span class="ride-price">${ride.price}</span>
                    </div>
                    <div class="ride-details">
                        <span class="ride-time">${ride.date} at ${ride.time}</span>
                        <span class="ride-passengers">${ride.passengers.length} passengers</span>
                    </div>
                </div>
            `).join('');
        }
    }

    loadUserRides() {
        // Implementation for my rides page
        console.log('Loading user rides...');
    }

    handleEmailVerification() {
        const urlParams = new URLSearchParams(window.location.search);
        const hash = window.location.hash;
        
        // Check if this is an email verification callback from Supabase
        if (hash.includes('type=signup') || hash.includes('access_token')) {
            this.showLoading('Verifying your email...');
            
            // Parse the hash parameters
            const hashParams = new URLSearchParams(hash.substring(1));
            const accessToken = hashParams.get('access_token');
            const refreshToken = hashParams.get('refresh_token');
            const type = hashParams.get('type');
            
            if (type === 'signup' && accessToken) {
                // Handle the email verification
                this.completeEmailVerification(accessToken, refreshToken);
            }
        }
    }

    async completeEmailVerification(accessToken, refreshToken) {
        try {
            // Set the session with the tokens
            if (window.supabaseService && window.supabaseService.supabase) {
                const { data, error } = await window.supabaseService.supabase.auth.setSession({
                    access_token: accessToken,
                    refresh_token: refreshToken
                });
                
                if (error) throw error;
                
                const user = data.user;
                if (user) {
                    // Try to get or create user profile
                    let profileResult = await window.supabaseService.getUserProfile(user.id);
                    
                    if (!profileResult.success || !profileResult.data) {
                        // Create profile if it doesn't exist
                        const profileData = {
                            first_name: user.user_metadata?.name?.split(' ')[0] || user.email.split('@')[0],
                            last_name: user.user_metadata?.name?.split(' ').slice(1).join(' ') || '',
                            phone: user.user_metadata?.phone || '',
                            role: user.user_metadata?.role || 'passenger'
                        };
                        
                        profileResult = await window.supabaseService.createUserProfile(user.id, profileData);
                    }
                    
                    // Set current user
                    this.currentUser = {
                        id: user.id,
                        email: user.email,
                        ...((profileResult.success && profileResult.data) ? profileResult.data : {
                            first_name: user.email.split('@')[0],
                            last_name: '',
                            phone: '',
                            role: 'passenger'
                        }),
                        email_confirmed_at: user.email_confirmed_at
                    };
                    
                    // Save to local storage
                    if (window.authManager) {
                        window.authManager.saveUserToStorage(this.currentUser);
                    }
                    
                    this.hideLoading();
                    this.showToast('Email verified successfully! Welcome to OnGoPool!', 'success');
                    this.updateUIForUser();
                    
                    // Clear the URL hash
                    window.history.replaceState(null, null, window.location.pathname);
                    
                    // Navigate to dashboard
                    this.goToDashboard();
                    return;
                }
            }
            
            throw new Error('Failed to verify email');
            
        } catch (error) {
            console.error('Email verification error:', error);
            this.hideLoading();
            this.showToast('Email verification failed. Please try signing up again.', 'error');
            this.showPage('signup');
        }
    }

    loadUserData() {
        // Load user-specific dashboard data
        if (this.currentUser) {
            // Load user rides and other data without calling updateUIForUser to avoid recursion
            this.loadUserRides();
        }
    }

    setMinDate() {
        const dateInputs = document.querySelectorAll('input[type="date"]');
        const today = new Date().toISOString().split('T')[0];
        dateInputs.forEach(input => {
            input.min = today;
            if (!input.value) {
                input.value = today;
            }
        });
        
        // Set default time
        const timeInputs = document.querySelectorAll('input[type="time"]');
        timeInputs.forEach(input => {
            if (!input.value) {
                const now = new Date();
                const hours = String(now.getHours()).padStart(2, '0');
                const minutes = String(Math.ceil(now.getMinutes() / 30) * 30).padStart(2, '0');
                input.value = `${hours}:${minutes}`;
            }
        });
    }

    async searchRides() {
        const pickup = document.getElementById('pickup-input')?.value;
        const destination = document.getElementById('destination-input')?.value;
        const date = document.getElementById('travel-date')?.value;
        const time = document.getElementById('travel-time')?.value;
        const passengers = document.getElementById('passenger-count')?.value;

        if (!pickup || !destination) {
            this.showToast('Please enter pickup and destination', 'warning');
            return;
        }

        this.showLoading('Searching rides...');

        try {
            // Use the rides manager for actual search
            if (window.ridesManager) {
                const searchParams = {
                    pickup: pickup,
                    destination: destination,
                    date: date,
                    time: time,
                    passengers: passengers
                };
                
                const result = await window.ridesManager.searchRides(searchParams);
                
                if (result.error) {
                    throw new Error(result.error);
                }
                
                this.displaySearchResults(result.rides);
            } else {
                // Fallback to stored rides if rides manager not available
                const storedRides = this.getStoredRides();
                
                // Simple filter for demo
                const filteredRides = storedRides.filter(ride => 
                    ride.status === 'available' && 
                    (!date || ride.date === date) &&
                    (!passengers || ride.availableSeats >= parseInt(passengers))
                );
                
                this.displaySearchResults(filteredRides);
            }
            
            this.hideLoading();
            
        } catch (error) {
            console.error('Search error:', error);
            this.hideLoading();
            this.showToast('Search failed. Please try again.', 'error');
        }
    }

    displaySearchResults(rides) {
        const container = document.getElementById('search-results');
        if (!container) return;

        if (rides.length === 0) {
            container.innerHTML = `
                <div class="no-results">
                    <i class="fas fa-search"></i>
                    <h3>No rides found</h3>
                    <p>Try adjusting your search criteria</p>
                </div>
            `;
            return;
        }

        container.innerHTML = `
            <div class="results-header">
                <h3>${rides.length} ride${rides.length > 1 ? 's' : ''} found</h3>
            </div>
            ${rides.map(ride => {
                // Format route with stops
                let routeDisplay = `${ride.pickup} → ${ride.destination}`;
                let stopsDisplay = '';
                
                if (ride.stops && ride.stops.length > 0) {
                    const stopNames = ride.stops.map(stop => {
                        // Extract city name from full address
                        const cityMatch = stop.address.match(/([^,]+)/);
                        return cityMatch ? cityMatch[1].trim() : stop.address;
                    });
                    stopsDisplay = `
                        <div class="ride-stops">
                            <i class="fas fa-map-pin"></i>
                            <span>Stops: ${stopNames.join(', ')}</span>
                        </div>
                    `;
                }

                return `
                    <div class="ride-result" onclick="app.selectRide('${ride.id}')">
                        <div class="ride-info">
                            <div class="ride-time">
                                <i class="fas fa-clock"></i>
                                ${ride.time}
                            </div>
                            <div class="ride-route">
                                <div class="route-main">
                                    <i class="fas fa-route"></i>
                                    <span>${routeDisplay}</span>
                                </div>
                                ${stopsDisplay}
                            </div>
                            <div class="ride-driver">
                                <div class="driver-avatar">
                                    <i class="fas fa-user"></i>
                                </div>
                                <div class="driver-info">
                                    <span class="driver-name">${ride.driver}</span>
                                    <div class="driver-details">
                                        <span class="rating">
                                            <i class="fas fa-star"></i>
                                            ${ride.rating}
                                        </span>
                                        <span class="vehicle">${ride.vehicle}</span>
                                        ${ride.verified ? '<i class="fas fa-shield-check verified"></i>' : ''}
                                    </div>
                                </div>
                            </div>
                            <div class="ride-details">
                                <span class="seats">${ride.availableSeats} seats available</span>
                            </div>
                        </div>
                        <div class="ride-price">
                            <span class="price">$${ride.price}</span>
                            <span class="per-person">per person</span>
                        </div>
                    </div>
                `;
            }).join('')}
        `;
    }

    selectRide(rideId) {
        if (!this.currentUser) {
            this.showToast('Please sign in to book a ride', 'warning');
            this.showPage('login');
            return;
        }

        this.showToast('Ride selected! Redirecting to booking...', 'success');
        // Navigate to booking page
        setTimeout(() => {
            this.showPage('book-ride');
        }, 1000);
    }

    showLoading(message = 'Loading...') {
        const overlay = document.getElementById('loading-overlay');
        const text = overlay.querySelector('p');
        
        if (text) text.textContent = message;
        overlay.classList.remove('hidden');
    }

    hideLoading() {
        const overlay = document.getElementById('loading-overlay');
        overlay.classList.add('hidden');
    }

    showToast(message, type = 'info') {
        const container = document.getElementById('toast-container');
        
        const toast = document.createElement('div');
        toast.className = `toast ${type}`;
        toast.textContent = message;
        
        container.appendChild(toast);
        
        // Auto remove after 3 seconds
        setTimeout(() => {
            if (toast.parentNode) {
                toast.remove();
            }
        }, 3000);
    }
    
    showNotificationPanel() {
        // For now, we'll just show a toast with a message about the notifications feature
        // In a real implementation, this would show a dropdown or panel with actual notifications
        
        // Get unread count from notification service if available
        let unreadCount = 0;
        if (window.notificationService) {
            unreadCount = window.notificationService.getUnreadCount();
        }
        
        // Show a toast message
        if (unreadCount > 0) {
            this.showToast(`You have ${unreadCount} unread notifications`, 'info');
        } else {
            this.showToast('No new notifications', 'info');
        }
        
        // In a real app, we would display the notification panel here
        console.log('Notification panel clicked - would show notifications panel');
    }
    
    setupOfferRidePage() {
        // Setup add stop functionality
        this.setupStopsManager();
        
        // Setup time selectors with default values
        this.setupTimeSelectors();
        
        // Setup route calculation
        this.setupRouteCalculation();
    }
    
    setupStopsManager() {
        const addStopBtn = document.getElementById('add-stop-btn');
        const stopsContainer = document.getElementById('stops-container');
        
        if (!addStopBtn || !stopsContainer) return;
        
        let stopCount = 0;
        
        addStopBtn.addEventListener('click', () => {
            if (stopCount >= 3) {
                this.showToast('Maximum 3 stops allowed', 'warning');
                return;
            }
            
            stopCount++;
            const stopItem = this.createStopItem(stopCount);
            stopsContainer.appendChild(stopItem);
            
            // Hide add button if max stops reached
            if (stopCount >= 3) {
                addStopBtn.style.display = 'none';
            }
        });
    }
    
    createStopItem(stopNumber) {
        const stopItem = document.createElement('div');
        stopItem.className = 'stop-item';
        stopItem.innerHTML = `
            <div class="stop-icon">
                <i class="fas fa-map-pin"></i>
            </div>
            <div class="stop-input">
                <input type="text" placeholder="Enter full stop address" id="stop-${stopNumber}-input" class="location-autocomplete" autocomplete="off">
                <div class="autocomplete-suggestions" id="stop-${stopNumber}-suggestions"></div>
            </div>
            <button type="button" class="btn-remove-stop" onclick="app.removeStop(this, ${stopNumber})">
                <i class="fas fa-times"></i>
            </button>
        `;
        
        // Setup autocomplete for the new stop input
        setTimeout(() => {
            const input = stopItem.querySelector('.location-autocomplete');
            if (window.mapsManager && input) {
                window.mapsManager.setupInputAutocomplete(input);
            }
        }, 100);
        
        return stopItem;
    }
    
    removeStop(button, stopNumber) {
        const stopItem = button.closest('.stop-item');
        const stopsContainer = document.getElementById('stops-container');
        const addStopBtn = document.getElementById('add-stop-btn');
        
        if (stopItem) {
            stopItem.remove();
            
            // Show add button again
            addStopBtn.style.display = 'flex';
            
            // Renumber remaining stops
            const remainingStops = stopsContainer.querySelectorAll('.stop-item');
            remainingStops.forEach((stop, index) => {
                const input = stop.querySelector('input');
                const button = stop.querySelector('.btn-remove-stop');
                const newNumber = index + 1;
                
                input.placeholder = `Stop ${newNumber} location`;
                input.id = `stop-${newNumber}-input`;
                button.setAttribute('onclick', `app.removeStop(this, ${newNumber})`);
            });
        }
    }
    
    setupTimeSelectors() {
        // Set default time to current time rounded to nearest 15 minutes
        const now = new Date();
        let hours = now.getHours();
        let minutes = now.getMinutes();
        
        // Round to nearest 15 minutes
        minutes = Math.ceil(minutes / 15) * 15;
        if (minutes >= 60) {
            minutes = 0;
            hours++;
        }
        
        // Convert to 12-hour format
        const ampm = hours >= 12 ? 'PM' : 'AM';
        const displayHours = hours === 0 ? 12 : hours > 12 ? hours - 12 : hours;
        
        // Set default values
        const hourSelect = document.getElementById('driver-travel-hour');
        const minuteSelect = document.getElementById('driver-travel-minute');
        const ampmSelect = document.getElementById('driver-travel-ampm');
        
        if (hourSelect) hourSelect.value = displayHours.toString();
        if (minuteSelect) minuteSelect.value = minutes.toString().padStart(2, '0');
        if (ampmSelect) ampmSelect.value = ampm;
    }
    
    setupRouteCalculation() {
        const calculateBtn = document.getElementById('calculate-route-btn');
        if (!calculateBtn) return;
        
        calculateBtn.addEventListener('click', async () => {
            await this.calculateRouteAndPrice();
        });
    }
    
    async calculateRouteAndPrice() {
        const calculateBtn = document.getElementById('calculate-route-btn');
        const routeInfo = document.getElementById('route-info');
        const priceSliderContainer = document.getElementById('price-slider-container');
        const priceNote = document.getElementById('price-breakdown');
        
        // Get addresses
        const startAddress = document.getElementById('driver-pickup-input').value.trim();
        const endAddress = document.getElementById('driver-destination-input').value.trim();
        
        if (!startAddress || !endAddress) {
            this.showToast('Please enter pickup and destination addresses', 'warning');
            return;
        }
        
        // Get stop addresses
        const stopInputs = document.querySelectorAll('[id^="stop-"][id$="-input"]');
        const stopAddresses = Array.from(stopInputs)
            .map(input => input.value.trim())
            .filter(addr => addr.length > 0);
        
        try {
            // Show enhanced loading state
            this.showLoadingButton('#calculate-route-btn', 'Calculating Route...');
            
            if (!window.mapsManager) {
                throw new Error('Maps service not available');
            }
            
            // Calculate route
            const routeData = await window.mapsManager.calculateRouteFromAddresses(
                startAddress, 
                endAddress, 
                stopAddresses
            );
            
            // Update route info display
            document.getElementById('route-distance').textContent = `${routeData.distance.toFixed(1)} km`;
            document.getElementById('route-duration').textContent = `${routeData.duration} min`;
            routeInfo.style.display = 'block';
            
            // Get price range for this route
            const priceRange = window.mapsManager.getPriceRange(routeData.distance, stopAddresses.length);
            
            // Setup price slider
            this.setupPriceSlider(priceRange, routeData.distance, stopAddresses.length);
            
            // Show price slider
            priceSliderContainer.style.display = 'block';
            
            // Update price note
            priceNote.innerHTML = `
                Price range: $${priceRange.min.toFixed(2)} - $${priceRange.max.toFixed(2)} per seat
                ${routeData.fallback ? '<br><em>Estimated distance (routing unavailable)</em>' : ''}
            `;
            priceNote.className = 'price-breakdown';
            
            this.showToast(`Route calculated: ${routeData.distance.toFixed(1)}km`, 'success');
            
        } catch (error) {
            console.error('Route calculation error:', error);
            this.showToast('Unable to calculate route. Please check addresses.', 'error');
            
            // Hide elements on error
            routeInfo.style.display = 'none';
            priceSliderContainer.style.display = 'none';
            priceNote.textContent = 'Calculate route to see pricing';
            priceNote.className = 'price-note';
            
        } finally {
            // Reset button state
            this.hideLoadingButton('#calculate-route-btn', 'Calculate Route & Price');
        }
    }
    
    setupPriceSlider(priceRange, distance, stops) {
        const slider = document.getElementById('price-range-slider');
        const currentPrice = document.getElementById('current-price');
        const minLabel = document.getElementById('min-price-label');
        const maxLabel = document.getElementById('max-price-label');
        const driverEarnings = document.getElementById('driver-earnings');
        const serviceCharge = document.getElementById('service-charge');
        
        // Set slider properties
        slider.min = priceRange.min.toFixed(2);
        slider.max = priceRange.max.toFixed(2);
        slider.value = priceRange.default.toFixed(2);
        slider.step = "0.25";
        
        // Update labels
        minLabel.textContent = `$${priceRange.min.toFixed(2)}`;
        maxLabel.textContent = `$${priceRange.max.toFixed(2)}`;
        
        // Function to update price display
        const updatePriceDisplay = (seatPrice) => {
            currentPrice.textContent = parseFloat(seatPrice).toFixed(2);
            
            // Calculate earnings breakdown
            const availableSeats = parseInt(document.getElementById('available-seats').value) || 1;
            const earnings = window.mapsManager.calculateDriverEarnings(parseFloat(seatPrice), availableSeats);
            
            // Update all price displays
            const totalPayment = document.getElementById('total-passenger-payment');
            if (totalPayment) {
                totalPayment.textContent = `$${earnings.totalPayment.toFixed(2)}`;
            }
            
            driverEarnings.textContent = `$${earnings.driverEarnings.toFixed(2)}`;
            serviceCharge.textContent = `$${earnings.serviceCharge.toFixed(2)}`;
        };
        
        // Initial update
        updatePriceDisplay(slider.value);
        
        // Add event listener for slider changes
        slider.addEventListener('input', (e) => {
            updatePriceDisplay(e.target.value);
        });
        
        // Update when available seats change
        const seatsSelect = document.getElementById('available-seats');
        seatsSelect.addEventListener('change', () => {
            updatePriceDisplay(slider.value);
        });
    }
    
    setupOfferRidePage() {
        // Setup stops functionality
        this.setupStopsManagement();
        
        // Setup calculate route button
        const calculateBtn = document.getElementById('calculate-route-btn');
        if (calculateBtn) {
            calculateBtn.addEventListener('click', () => {
                this.calculateRouteAndPrice();
            });
        }
        
        // Setup offer ride button
        const offerRideBtn = document.querySelector('.btn-offer-ride');
        if (offerRideBtn) {
            offerRideBtn.addEventListener('click', () => {
                this.postRide();
            });
        }
    }
    
    setupStopsManagement() {
        const addStopBtn = document.getElementById('add-stop-btn');
        const stopsContainer = document.getElementById('stops-container');
        let stopCount = 0;
        const maxStops = 3;
        
        if (addStopBtn) {
            addStopBtn.addEventListener('click', () => {
                if (stopCount < maxStops) {
                    stopCount++;
                    this.addStopInput(stopsContainer, stopCount);
                    
                    if (stopCount >= maxStops) {
                        addStopBtn.style.display = 'none';
                    }
                }
            });
        }
    }
    
    addStopInput(container, stopNumber) {
        const stopDiv = document.createElement('div');
        stopDiv.className = 'stop-input-group';
        stopDiv.innerHTML = `
            <div class="input-group">
                <div class="location-icon stop">
                    <i class="fas fa-map-pin"></i>
                    <span class="stop-number">${stopNumber}</span>
                </div>
                <input type="text" placeholder="Enter stop ${stopNumber} address" id="stop-${stopNumber}-input" class="location-autocomplete" autocomplete="off">
                <button type="button" class="btn-remove-stop" onclick="removeStop(this, ${stopNumber})">
                    <i class="fas fa-times"></i>
                </button>
                <div class="autocomplete-suggestions" id="stop-${stopNumber}-suggestions"></div>
            </div>
        `;
        
        container.appendChild(stopDiv);
        
        // Setup autocomplete for new stop input
        if (window.mapsManager) {
            window.mapsManager.setupAddressAutocomplete(
                document.getElementById(`stop-${stopNumber}-input`),
                document.getElementById(`stop-${stopNumber}-suggestions`)
            );
        }
    }
    
    removeStop(button, stopNumber) {
        const stopDiv = button.closest('.stop-input-group');
        if (stopDiv) {
            stopDiv.remove();
            
            // Show add stop button again
            const addStopBtn = document.getElementById('add-stop-btn');
            if (addStopBtn) {
                addStopBtn.style.display = 'block';
            }
            
            // Renumber remaining stops
            this.renumberStops();
        }
    }
    
    renumberStops() {
        const stops = document.querySelectorAll('.stop-input-group');
        stops.forEach((stop, index) => {
            const number = index + 1;
            const stopNumber = stop.querySelector('.stop-number');
            const input = stop.querySelector('.location-autocomplete');
            const suggestions = stop.querySelector('.autocomplete-suggestions');
            const removeBtn = stop.querySelector('.btn-remove-stop');
            
            if (stopNumber) stopNumber.textContent = number;
            if (input) {
                input.id = `stop-${number}-input`;
                input.placeholder = `Enter stop ${number} address`;
            }
            if (suggestions) suggestions.id = `stop-${number}-suggestions`;
            if (removeBtn) removeBtn.setAttribute('onclick', `removeStop(this, ${number})`);
        });
    }
    
    postRide() {
        // Check if driver is verified
        if (!this.currentUser.licenseVerified) {
            this.showToast('Please verify your driver license first', 'error');
            this.showPage('license-verification');
            return;
        }

        // Check daily ride limit
        if (!this.checkDailyRideLimit()) {
            this.showToast('You can only post 2 rides per day', 'error');
            return;
        }

        const startAddress = document.getElementById('driver-pickup-input').value.trim();
        const endAddress = document.getElementById('driver-destination-input').value.trim();
        const date = document.getElementById('driver-travel-date').value;
        const hour = document.getElementById('driver-travel-hour').value;
        const minute = document.getElementById('driver-travel-minute').value;
        const ampm = document.getElementById('driver-travel-ampm').value;
        const availableSeats = document.getElementById('available-seats').value;
        const priceSlider = document.getElementById('price-range-slider');
        
        // Enhanced form validation
        const validationErrors = this.validateOfferRideForm({
            startAddress,
            endAddress,
            date,
            hour,
            minute,
            ampm,
            availableSeats,
            priceSlider
        });

        if (validationErrors.length > 0) {
            this.showToast(validationErrors[0], 'error');
            return;
        }
        
        // Collect stops information
        const stops = [];
        const stopInputs = document.querySelectorAll('.stop-input-group');
        stopInputs.forEach((stopDiv, index) => {
            const input = stopDiv.querySelector('.location-autocomplete');
            
            if (input && input.value.trim()) {
                stops.push({
                    address: input.value.trim(),
                    order: index + 1
                });
            }
        });
        
        const rideData = {
            id: 'ride_' + Date.now(),
            driverId: this.currentUser.id,
            driverName: this.currentUser.name,
            pickup: startAddress,  // Use consistent naming with rides.js
            destination: endAddress,  // Use consistent naming with rides.js
            startLocation: startAddress,  // Keep for backward compatibility
            endLocation: endAddress,  // Keep for backward compatibility
            stops: stops,
            date: date,
            time: `${hour}:${minute} ${ampm}`,
            availableSeats: parseInt(availableSeats),
            pricePerSeat: parseFloat(priceSlider.value),
            pricePerKm: parseFloat(priceSlider.value), // Add for search compatibility
            status: 'available',
            createdAt: new Date().toISOString(),
            driver: this.currentUser.name, // Add for search results display
            rating: 4.8, // Mock rating for display
            vehicle: 'Personal Vehicle', // Mock vehicle info
            verified: this.currentUser.licenseVerified || false
        };
        

        
        // Show loading state
        this.showLoadingButton('.btn-offer-ride', 'Posting Ride...');

        // Simulate API call
        setTimeout(() => {
            // Store ride
            const rides = this.getStoredRides();
            rides.push(rideData);
            localStorage.setItem('ongopool_rides', JSON.stringify(rides));

            this.hideLoadingButton('.btn-offer-ride', 'Post Ride');
            this.showToast('Ride posted successfully!', 'success');
            
            // Add success animation
            const button = document.querySelector('.btn-offer-ride');
            if (button) {
                button.classList.add('success-animation');
                setTimeout(() => {
                    button.classList.remove('success-animation');
                    this.goToDashboard();
                }, 600);
            } else {
                this.goToDashboard();
            }
        }, 2000);
    }
    
    validateOfferRideForm(formData) {
        const errors = [];
        
        if (!formData.startAddress) {
            errors.push('Please enter pickup address');
        }
        
        if (!formData.endAddress) {
            errors.push('Please enter destination address');
        }
        
        if (!formData.date) {
            errors.push('Please select travel date');
        } else {
            const selectedDate = new Date(formData.date);
            const today = new Date();
            today.setHours(0, 0, 0, 0);
            
            if (selectedDate < today) {
                errors.push('Travel date cannot be in the past');
            }
        }
        
        if (!formData.priceSlider || formData.priceSlider.style.display === 'none') {
            errors.push('Please calculate route and set price first');
        }
        
        // Validate address format (basic check)
        if (formData.startAddress && formData.startAddress.length < 10) {
            errors.push('Please enter full pickup address');
        }
        
        if (formData.endAddress && formData.endAddress.length < 10) {
            errors.push('Please enter full destination address');
        }
        
        return errors;
    }

    checkDailyRideLimit() {
        const rides = this.getStoredRides();
        const today = new Date().toDateString();
        const userRidesToday = rides.filter(ride => 
            ride.driverId === this.currentUser.id && 
            new Date(ride.date).toDateString() === today
        );
        
        return userRidesToday.length < 2;
    }

    setupLicenseVerification() {
        const form = document.getElementById('license-verification-form');
        if (form) {
            form.addEventListener('submit', (e) => {
                e.preventDefault();
                this.submitLicenseVerification();
            });
        }

        // File upload preview
        const fileInput = document.getElementById('license-photo');
        const uploadArea = document.querySelector('.file-upload-area');
        
        if (fileInput && uploadArea) {
            fileInput.addEventListener('change', (e) => {
                const file = e.target.files[0];
                if (file) {
                    uploadArea.innerHTML = `
                        <i class="fas fa-check-circle" style="color: green;"></i>
                        <p>Photo uploaded: ${file.name}</p>
                        <small>Click to change photo</small>
                    `;
                }
            });
        }
        
        // Pre-fill existing vehicle information if available
        if (this.currentUser) {
            if (this.currentUser.carModel) {
                const modelInput = document.getElementById('vehicle-model');
                if (modelInput) modelInput.value = this.currentUser.carModel;
            }
            
            if (this.currentUser.carColor) {
                const colorInput = document.getElementById('vehicle-color');
                if (colorInput) colorInput.value = this.currentUser.carColor;
            }
            
            if (this.currentUser.licensePlate) {
                const plateInput = document.getElementById('license-plate');
                if (plateInput) plateInput.value = this.currentUser.licensePlate;
            }
        }
    }
    
    checkDriverVerification() {
        // Check if user is a driver and if they're verified
        if (this.currentUser && 
            (this.currentUser.role === 'driver' || this.currentUser.role === 'both') && 
            !this.currentUser.licenseVerified) {
            
            // Show verification banner on offer ride page
            const offerRidePage = document.getElementById('offer-ride-page');
            if (offerRidePage) {
                // Check if banner already exists
                if (!document.getElementById('verification-banner')) {
                    const banner = document.createElement('div');
                    banner.id = 'verification-banner';
                    banner.className = 'verification-banner';
                    banner.innerHTML = `
                        <div class="banner-icon">
                            <i class="fas fa-exclamation-circle"></i>
                        </div>
                        <div class="banner-content">
                            <h4>Verification Required</h4>
                            <p>You need to verify your driver license and vehicle information before posting rides.</p>
                        </div>
                        <button onclick="showPage('license-verification')" class="btn-verify-now">
                            Verify Now
                        </button>
                    `;
                    
                    // Insert after page header
                    const pageHeader = offerRidePage.querySelector('.page-header');
                    if (pageHeader) {
                        pageHeader.insertAdjacentElement('afterend', banner);
                    } else {
                        offerRidePage.insertAdjacentElement('afterbegin', banner);
                    }
                    
                    // Disable post ride button
                    const postRideBtn = offerRidePage.querySelector('.btn-offer-ride');
                    if (postRideBtn) {
                        postRideBtn.disabled = true;
                        postRideBtn.title = 'Verification required';
                        postRideBtn.style.opacity = '0.7';
                    }
                }
            }
        }
    }
    
    loadDriverVehicleInfo() {
        // Add vehicle information to profile page if user is a driver
        if (this.currentUser && 
            (this.currentUser.role === 'driver' || this.currentUser.role === 'both')) {
            
            const profilePage = document.getElementById('profile-page');
            if (profilePage) {
                // Find the account-info section
                const accountInfo = profilePage.querySelector('.account-info');
                if (accountInfo) {
                    // Check if vehicle info section already exists
                    let vehicleInfo = profilePage.querySelector('.vehicle-info-section');
                    
                    if (!vehicleInfo) {
                        // Create vehicle info section
                        vehicleInfo = document.createElement('div');
                        vehicleInfo.className = 'vehicle-info-section';
                        vehicleInfo.innerHTML = `
                            <h3>Vehicle Information</h3>
                            <div class="vehicle-details">
                                <div class="vehicle-detail">
                                    <i class="fas fa-car"></i>
                                    <div class="detail-text">
                                        <span class="label">Vehicle</span>
                                        <span class="value" id="profile-vehicle-model">Not specified</span>
                                    </div>
                                </div>
                                <div class="vehicle-detail">
                                    <i class="fas fa-palette"></i>
                                    <div class="detail-text">
                                        <span class="label">Color</span>
                                        <span class="value" id="profile-vehicle-color">Not specified</span>
                                    </div>
                                </div>
                                <div class="vehicle-detail">
                                    <i class="fas fa-id-card"></i>
                                    <div class="detail-text">
                                        <span class="label">License Plate</span>
                                        <span class="value" id="profile-license-plate">Not specified</span>
                                    </div>
                                </div>
                                <div class="vehicle-detail">
                                    <i class="fas fa-shield-alt"></i>
                                    <div class="detail-text">
                                        <span class="label">Verification Status</span>
                                        <span class="value" id="profile-verification-status">Pending</span>
                                    </div>
                                </div>
                            </div>
                        `;
                        
                        // Insert after account info
                        accountInfo.insertAdjacentElement('afterend', vehicleInfo);
                    }
                    
                    // Update vehicle info with user data
                    this.updateVehicleInfoDisplay();
                }
            }
        }
    }
    
    updateVehicleInfoDisplay() {
        // Get Supabase driver profile data
        const loadDriverData = async () => {
            try {
                // Get from Supabase if available
                if (window.supabaseService && this.currentUser && this.currentUser.id) {
                    const result = await window.supabaseService.supabase
                        .from('driver_profiles')
                        .select('*')
                        .eq('id', this.currentUser.id)
                        .single();
                        
                    if (result.data) {
                        // Update vehicle information display
                        const modelEl = document.getElementById('profile-vehicle-model');
                        const colorEl = document.getElementById('profile-vehicle-color');
                        const plateEl = document.getElementById('profile-license-plate');
                        const statusEl = document.getElementById('profile-verification-status');
                        
                        if (modelEl) modelEl.textContent = result.data.car_model || 'Not specified';
                        if (colorEl) colorEl.textContent = result.data.car_color || 'Not specified';
                        if (plateEl) plateEl.textContent = result.data.license_plate || 'Not specified';
                        
                        if (statusEl) {
                            if (result.data.license_verified) {
                                statusEl.textContent = 'Verified';
                                statusEl.className = 'value verified';
                            } else {
                                statusEl.textContent = 'Pending';
                                statusEl.className = 'value pending';
                            }
                        }
                        
                        // Also update currentUser with this data
                        this.currentUser.carModel = result.data.car_model;
                        this.currentUser.carColor = result.data.car_color;
                        this.currentUser.licensePlate = result.data.license_plate;
                        this.currentUser.licenseVerified = result.data.license_verified;
                        
                        // Store updated user data
                        this.storeUser(this.currentUser);
                        localStorage.setItem('ongopool_user', JSON.stringify(this.currentUser));
                    }
                } else {
                    // Use local data if Supabase not available
                    this.updateVehicleInfoFromLocal();
                }
            } catch (error) {
                console.error('Error loading driver profile:', error);
                this.updateVehicleInfoFromLocal();
            }
        };
        
        loadDriverData();
    }
    
    updateVehicleInfoFromLocal() {
        // Update vehicle information from local storage
        if (this.currentUser) {
            const modelEl = document.getElementById('profile-vehicle-model');
            const colorEl = document.getElementById('profile-vehicle-color');
            const plateEl = document.getElementById('profile-license-plate');
            const statusEl = document.getElementById('profile-verification-status');
            
            if (modelEl) modelEl.textContent = this.currentUser.carModel || 'Not specified';
            if (colorEl) colorEl.textContent = this.currentUser.carColor || 'Not specified';
            if (plateEl) plateEl.textContent = this.currentUser.licensePlate || 'Not specified';
            
            if (statusEl) {
                if (this.currentUser.licenseVerified) {
                    statusEl.textContent = 'Verified';
                    statusEl.className = 'value verified';
                } else {
                    statusEl.textContent = 'Pending';
                    statusEl.className = 'value pending';
                }
            }
        }
    }

    async submitLicenseVerification() {
        const licenseNumber = document.getElementById('license-number').value;
        const expiryDate = document.getElementById('license-expiry').value;
        const province = document.getElementById('license-province').value;
        const photo = document.getElementById('license-photo').files[0];
        
        // Get vehicle information
        const carModel = document.getElementById('vehicle-model').value;
        const carColor = document.getElementById('vehicle-color').value;
        const licensePlate = document.getElementById('license-plate').value;

        // Validation
        if (!licenseNumber || !expiryDate || !province || !photo) {
            this.showToast('Please fill in all license fields', 'error');
            return;
        }
        
        if (!carModel || !carColor || !licensePlate) {
            this.showToast('Please fill in all vehicle information fields', 'error');
            return;
        }

        // Check expiry date
        const expiry = new Date(expiryDate);
        const today = new Date();
        if (expiry <= today) {
            this.showToast('License has expired. Please renew your license first.', 'error');
            return;
        }

        // Show loading
        this.showLoadingButton('.btn-verify', 'Verifying...');

        try {
            // Upload photo to Supabase if available
            let licenseUrl = null;
            if (photo && window.supabaseService) {
                const uploadResult = await window.supabaseService.uploadDriverDocument(
                    this.currentUser.id, 
                    'license', 
                    photo,
                    (percent) => console.log(`Upload progress: ${percent}%`)
                );
                
                if (uploadResult.success) {
                    licenseUrl = uploadResult.data.url;
                }
            }
            
            // Create or update driver profile in Supabase
            if (window.supabaseService) {
                const driverProfileData = {
                    license_url: licenseUrl || 'pending_review',
                    car_model: carModel,
                    car_color: carColor,
                    license_plate: licensePlate,
                    vehicle_info: `${carColor} ${carModel}`,
                    updated_at: new Date().toISOString()
                };
                
                // Try to get existing driver profile first
                const checkResult = await window.supabaseService.supabase
                    .from('driver_profiles')
                    .select('id')
                    .eq('id', this.currentUser.id)
                    .single();
                
                let result;
                if (checkResult.data) {
                    // Update existing profile
                    result = await window.supabaseService.supabase
                        .from('driver_profiles')
                        .update(driverProfileData)
                        .eq('id', this.currentUser.id);
                } else {
                    // Insert new profile
                    driverProfileData.id = this.currentUser.id;
                    driverProfileData.created_at = new Date().toISOString();
                    
                    result = await window.supabaseService.supabase
                        .from('driver_profiles')
                        .insert(driverProfileData);
                }
                
                if (result.error) throw result.error;
            } else {
                // Simulate API call for demo
                await new Promise(resolve => setTimeout(resolve, 3000));
            }

            // Update user verification status
            this.currentUser.licenseVerified = true;
            this.currentUser.licenseNumber = licenseNumber;
            this.currentUser.licenseExpiry = expiryDate;
            this.currentUser.licenseProvince = province;
            this.currentUser.carModel = carModel;
            this.currentUser.carColor = carColor;
            this.currentUser.licensePlate = licensePlate;
            
            // Store updated user data
            this.storeUser(this.currentUser);
            localStorage.setItem('ongopool_user', JSON.stringify(this.currentUser));

            this.hideLoadingButton('.btn-verify', 'Verify License');
            this.showToast('License and vehicle information verified successfully!', 'success');
            
            // Navigate back to offer ride page
            setTimeout(() => {
                this.showPage('offer-ride');
            }, 1500);

        } catch (error) {
            console.error('Verification error:', error);
            this.hideLoadingButton('.btn-verify', 'Verify License');
            this.showToast('Verification failed. Please try again.', 'error');
        }
    }

    showLoadingButton(selector, text) {
        const button = document.querySelector(selector);
        if (button) {
            button.disabled = true;
            button.innerHTML = `<i class="fas fa-spinner fa-spin"></i> ${text}`;
        }
    }

    hideLoadingButton(selector, originalText) {
        const button = document.querySelector(selector);
        if (button) {
            button.disabled = false;
            if (selector.includes('calculate-route')) {
                button.innerHTML = `<i class="fas fa-calculator"></i> ${originalText}`;
            } else if (selector.includes('verify')) {
                button.innerHTML = `<i class="fas fa-check"></i> ${originalText}`;
            } else {
                button.innerHTML = `<i class="fas fa-plus-circle"></i> ${originalText}`;
            }
        }
    }

    showFieldError(fieldId, message) {
        const field = document.getElementById(fieldId);
        if (field) {
            field.classList.add('input-error');
            
            // Remove existing error message
            const existingError = field.parentElement.querySelector('.error-message');
            if (existingError) {
                existingError.remove();
            }
            
            // Add error message
            const errorDiv = document.createElement('div');
            errorDiv.className = 'error-message';
            errorDiv.innerHTML = `<i class="fas fa-exclamation-circle"></i> ${message}`;
            field.parentElement.appendChild(errorDiv);
            
            // Remove error after user starts typing
            field.addEventListener('input', () => {
                this.clearFieldError(fieldId);
            }, { once: true });
        }
    }

    clearFieldError(fieldId) {
        const field = document.getElementById(fieldId);
        if (field) {
            field.classList.remove('input-error');
            const errorMessage = field.parentElement.querySelector('.error-message');
            if (errorMessage) {
                errorMessage.remove();
            }
        }
    }

    clearFieldErrors() {
        const errorFields = document.querySelectorAll('.input-error');
        const errorMessages = document.querySelectorAll('.error-message');
        
        errorFields.forEach(field => field.classList.remove('input-error'));
        errorMessages.forEach(msg => msg.remove());
    }

    getStoredRides() {
        const rides = localStorage.getItem('ongopool_rides');
        return rides ? JSON.parse(rides) : [];
    }

    // Utility function to format dates
    formatDate(dateString) {
        const date = new Date(dateString);
        const today = new Date();
        const tomorrow = new Date(today);
        tomorrow.setDate(tomorrow.getDate() + 1);
        
        if (date.toDateString() === today.toDateString()) {
            return 'Today';
        } else if (date.toDateString() === tomorrow.toDateString()) {
            return 'Tomorrow';
        } else {
            return date.toLocaleDateString('en-US', {
                weekday: 'short',
                month: 'short',
                day: 'numeric'
            });
        }
    }

    // Load existing profile data into edit form
    async loadEditProfileData() {
        try {
            const currentUser = await window.authManager.getCurrentUser();
            if (!currentUser) return;

            // Get profile data from Supabase
            const result = await window.supabaseService.getUserProfile(currentUser.id);
            
            if (result.success && result.data) {
                const profile = result.data;
                
                // Populate form fields
                const form = document.getElementById('edit-profile-form');
                if (form) {
                    // Full name (combine first and last name)
                    const fullNameField = form.querySelector('#edit-full-name');
                    if (fullNameField && profile.first_name) {
                        const fullName = `${profile.first_name} ${profile.last_name || ''}`.trim();
                        fullNameField.value = fullName;
                    }
                    
                    // Email
                    const emailField = form.querySelector('#edit-email');
                    if (emailField && profile.email) {
                        emailField.value = profile.email;
                    }
                    
                    // Phone
                    const phoneField = form.querySelector('#edit-phone');
                    if (phoneField && profile.phone) {
                        phoneField.value = profile.phone;
                    }
                    
                    // Date of birth
                    const dobField = form.querySelector('#edit-date-of-birth');
                    if (dobField && profile.date_of_birth) {
                        dobField.value = profile.date_of_birth;
                    }
                    
                    // Bio
                    const bioField = form.querySelector('#edit-bio');
                    if (bioField && profile.bio) {
                        bioField.value = profile.bio;
                    }
                    
                    // Emergency contact
                    const emergencyContactField = form.querySelector('#edit-emergency-contact');
                    if (emergencyContactField && profile.emergency_contact) {
                        emergencyContactField.value = profile.emergency_contact;
                    }
                    
                    // Emergency phone
                    const emergencyPhoneField = form.querySelector('#edit-emergency-phone');
                    if (emergencyPhoneField && profile.emergency_phone) {
                        emergencyPhoneField.value = profile.emergency_phone;
                    }
                    
                    // Profile photo
                    if (profile.profile_image_url) {
                        const photoPreview = document.getElementById('profile-photo-preview');
                        if (photoPreview) {
                            // Display existing photo
                            photoPreview.innerHTML = '';
                            photoPreview.style.backgroundImage = `url(${profile.profile_image_url})`;
                            
                            // Store the current photo path for potential deletion
                            this.currentPhotoPath = profile.photo_path;
                            
                            // Show remove button
                            const removeBtn = document.getElementById('remove-photo-btn');
                            if (removeBtn) {
                                removeBtn.style.display = 'block';
                            }
                        }
                    }
                }
                
                // Reset photo upload state
                this.pendingProfilePhoto = null;
                this.removeExistingPhoto = false;
            }
        } catch (error) {
            console.error('Error loading profile data:', error);
            this.showToast('Error loading profile data', 'error');
        }
    }

    // Review Modal Methods
    setupReviewModal() {
        // Setup star rating
        const stars = document.querySelectorAll('.star');
        stars.forEach((star, index) => {
            star.addEventListener('click', () => {
                this.setRating(index + 1);
            });
            
            star.addEventListener('mouseover', () => {
                this.highlightStars(index + 1);
            });
        });

        // Setup star container mouse leave
        const starRating = document.querySelector('.star-rating');
        if (starRating) {
            starRating.addEventListener('mouseleave', () => {
                const currentRating = starRating.dataset.rating || 0;
                this.highlightStars(currentRating);
            });
        }

        // Setup license verification checkbox
        const licenseCheckbox = document.getElementById('license-verified');
        if (licenseCheckbox) {
            licenseCheckbox.addEventListener('change', () => {
                this.updateSubmitButton();
            });
        }

        // Setup license photo upload
        const licensePhoto = document.getElementById('license-photo');
        if (licensePhoto) {
            licensePhoto.addEventListener('change', (e) => {
                this.handleLicensePhotoUpload(e);
            });
        }

        // Setup rating change to update submit button
        const ratingContainer = document.querySelector('.star-rating');
        if (ratingContainer) {
            ratingContainer.addEventListener('click', () => {
                setTimeout(() => this.updateSubmitButton(), 100);
            });
        }
    }

    showReviewModal(button) {
        const driverId = button.dataset.driverId;
        const rideId = button.dataset.rideId;
        
        // Store current review data
        this.currentReview = {
            driverId: driverId,
            rideId: rideId,
            rating: 0,
            licenseVerified: false,
            licensePhoto: null,
            comment: ''
        };

        // Update modal with trip details
        document.getElementById('review-driver-name').textContent = 'Alex Thompson';
        document.getElementById('review-trip-details').textContent = 'Toronto → Mississauga • Dec 15, 2024';

        // Reset form
        this.resetReviewForm();

        // Show modal
        const modal = document.getElementById('review-modal');
        modal.classList.add('active');
        document.body.style.overflow = 'hidden';
    }

    closeReviewModal() {
        const modal = document.getElementById('review-modal');
        modal.classList.remove('active');
        document.body.style.overflow = '';
        
        // Reset form
        this.resetReviewForm();
        this.currentReview = null;
    }

    resetReviewForm() {
        // Reset stars
        const stars = document.querySelectorAll('.star');
        stars.forEach(star => star.classList.remove('active'));
        const starRating = document.querySelector('.star-rating');
        if (starRating) {
            starRating.dataset.rating = '0';
        }

        // Reset checkbox
        const licenseCheckbox = document.getElementById('license-verified');
        if (licenseCheckbox) {
            licenseCheckbox.checked = false;
        }

        // Reset comment
        const comment = document.getElementById('review-comment');
        if (comment) {
            comment.value = '';
        }

        // Reset license photo preview
        const preview = document.getElementById('license-preview');
        if (preview) {
            preview.style.display = 'none';
            preview.innerHTML = '';
        }

        // Reset submit button
        this.updateSubmitButton();
    }

    setRating(rating) {
        const starRating = document.querySelector('.star-rating');
        if (starRating) {
            starRating.dataset.rating = rating;
        }
        this.highlightStars(rating);
        
        if (this.currentReview) {
            this.currentReview.rating = rating;
        }
    }

    highlightStars(rating) {
        const stars = document.querySelectorAll('.star');
        stars.forEach((star, index) => {
            if (index < rating) {
                star.classList.add('active');
            } else {
                star.classList.remove('active');
            }
        });
    }

    handleLicensePhotoUpload(event) {
        const file = event.target.files[0];
        if (!file) return;

        // Validate file type
        if (!file.type.startsWith('image/')) {
            alert('Please select an image file');
            return;
        }

        // Validate file size (5MB max)
        if (file.size > 5 * 1024 * 1024) {
            alert('File size must be less than 5MB');
            return;
        }

        // Create preview
        const reader = new FileReader();
        reader.onload = (e) => {
            const preview = document.getElementById('license-preview');
            preview.innerHTML = `
                <img src="${e.target.result}" alt="License photo">
                <p style="margin-top: 8px; font-size: 14px; color: #6b7280;">
                    <i class="fas fa-check-circle" style="color: #10b981;"></i>
                    License photo uploaded
                </p>
            `;
            preview.style.display = 'block';
        };
        reader.readAsDataURL(file);

        // Store file for submission
        if (this.currentReview) {
            this.currentReview.licensePhoto = file;
        }
    }

    updateSubmitButton() {
        const submitBtn = document.getElementById('submit-review-btn');
        const rating = document.querySelector('.star-rating')?.dataset.rating || 0;
        const licenseVerified = document.getElementById('license-verified')?.checked || false;

        // Enable submit button if rating is provided and license is verified
        if (parseInt(rating) > 0 && licenseVerified) {
            submitBtn.disabled = false;
            submitBtn.style.opacity = '1';
        } else {
            submitBtn.disabled = true;
            submitBtn.style.opacity = '0.5';
        }
    }

    async submitReview() {
        if (!this.currentReview) return;

        const submitBtn = document.getElementById('submit-review-btn');
        const originalText = submitBtn.textContent;
        
        try {
            // Update button state
            submitBtn.disabled = true;
            submitBtn.textContent = 'Submitting...';

            // Get form data
            const rating = parseInt(document.querySelector('.star-rating')?.dataset.rating || 0);
            const licenseVerified = document.getElementById('license-verified')?.checked || false;
            const comment = document.getElementById('review-comment')?.value || '';

            // Validate required fields
            if (rating === 0) {
                throw new Error('Please provide a rating');
            }
            
            if (!licenseVerified) {
                throw new Error('Please verify the driver\'s license');
            }

            // Prepare review data
            const reviewData = {
                driverId: this.currentReview.driverId,
                rideId: this.currentReview.rideId,
                rating: rating,
                licenseVerified: licenseVerified,
                comment: comment,
                timestamp: new Date().toISOString(),
                passengerId: this.currentUser?.id || 'user123'
            };

            // Upload license photo if provided
            if (this.currentReview.licensePhoto) {
                // In a real app, you would upload to your server/cloud storage
                reviewData.licensePhotoUrl = 'uploaded_license_photo_url';
            }

            // Submit to server (simulated)
            await this.submitReviewToServer(reviewData);

            // Show success message
            this.showNotification('Review submitted successfully! Thank you for helping keep our platform safe.', 'success');
            
            // Close modal
            this.closeReviewModal();

        } catch (error) {
            console.error('Error submitting review:', error);
            this.showNotification(error.message || 'Error submitting review. Please try again.', 'error');
        } finally {
            // Reset button
            submitBtn.disabled = false;
            submitBtn.textContent = originalText;
        }
    }

    async submitReviewToServer(reviewData) {
        // Simulate API call
        return new Promise((resolve, reject) => {
            setTimeout(() => {
                // Simulate random success/failure for demo
                if (Math.random() > 0.1) { // 90% success rate
                    resolve({ success: true });
                } else {
                    reject(new Error('Network error'));
                }
            }, 1500);
        });
    }

    showNotification(message, type = 'info') {
        // Create notification element
        const notification = document.createElement('div');
        notification.className = `notification notification-${type}`;
        notification.innerHTML = `
            <div class="notification-content">
                <i class="fas ${type === 'success' ? 'fa-check-circle' : type === 'error' ? 'fa-exclamation-circle' : 'fa-info-circle'}"></i>
                <span>${message}</span>
            </div>
            <button class="notification-close" onclick="this.parentElement.remove()">&times;</button>
        `;

        // Add styles if not already present
        if (!document.querySelector('#notification-styles')) {
            const styles = document.createElement('style');
            styles.id = 'notification-styles';
            styles.textContent = `
                .notification {
                    position: fixed;
                    top: 20px;
                    left: 50%;
                    transform: translateX(-50%);
                    background: white;
                    border-radius: 8px;
                    padding: 16px;
                    box-shadow: 0 4px 12px rgba(0, 0, 0, 0.15);
                    z-index: 10000;
                    max-width: 90%;
                    display: flex;
                    align-items: center;
                    gap: 12px;
                    animation: notificationSlideIn 0.3s ease-out;
                }
                .notification-success { border-left: 4px solid #10b981; }
                .notification-error { border-left: 4px solid #ef4444; }
                .notification-info { border-left: 4px solid #3b82f6; }
                .notification-content {
                    display: flex;
                    align-items: center;
                    gap: 8px;
                    flex: 1;
                }
                .notification-close {
                    background: none;
                    border: none;
                    font-size: 18px;
                    cursor: pointer;
                    color: #6b7280;
                }
                @keyframes notificationSlideIn {
                    from {
                        transform: translateX(-50%) translateY(-20px);
                        opacity: 0;
                    }
                    to {
                        transform: translateX(-50%) translateY(0);
                        opacity: 1;
                    }
                }
            `;
            document.head.appendChild(styles);
        }

        // Add to page
        document.body.appendChild(notification);

        // Auto remove after 5 seconds
        setTimeout(() => {
            if (notification.parentElement) {
                notification.remove();
            }
        }, 5000);
    }
}

// Global navigation functions for HTML onclick events
function showPage(pageId) {
    if (window.app) {
        window.app.showPage(pageId);
    }
}

function goToDashboard() {
    if (window.app) {
        window.app.goToDashboard();
    }
}

function searchRides() {
    if (window.app) {
        window.app.searchRides();
    }
}

function saveProfile() {
    if (window.app) {
        window.app.saveProfile();
    }
}

function handleProfilePhotoChange(event) {
    if (window.app) {
        window.app.handleProfilePhotoChange(event);
    }
}

function removeProfilePhoto() {
    if (window.app) {
        window.app.removeProfilePhoto();
    }
}

function saveVerificationProgress() {
    if (window.app) {
        window.app.saveVerificationProgress();
    }
}

function submitVerification() {
    if (window.app) {
        window.app.submitVerification();
    }
}

function resendVerificationEmail() {
    if (window.app) {
        window.app.resendVerificationEmail();
    }
}

function proceedAfterVerification() {
    if (window.app) {
        window.app.proceedAfterVerification();
    }
}

// Initialize the app when DOM is loaded
document.addEventListener('DOMContentLoaded', () => {
    // Wait for Supabase service and auth manager to be initialized
    const initApp = () => {
        if (typeof window.authManager !== 'undefined' && window.authManager.supabase && window.authManager.supabase.isConfigured) {
            // Create global app instance
            window.app = new OnGoPoolMobileApp();
            
            // Initialize rides manager
            if (typeof RidesManager !== 'undefined') {
                window.ridesManager = new RidesManager();
            }
        } else {
            // Retry after a short delay
            setTimeout(initApp, 100);
        }
    };
    
    initApp();
    
    // Add viewport height CSS variable for mobile browsers
    function setViewportHeight() {
        const vh = window.innerHeight * 0.01;
        document.documentElement.style.setProperty('--vh', `${vh}px`);
    }
    
    setViewportHeight();
    window.addEventListener('resize', setViewportHeight);
    window.addEventListener('orientationchange', setViewportHeight);
    
    // Prevent pull-to-refresh on mobile
    document.body.addEventListener('touchstart', e => {
        if (e.touches.length !== 1) return;
        
        const scrollY = window.pageYOffset || document.documentElement.scrollTop;
        if (scrollY > 0) return;
        
        e.preventDefault();
    }, { passive: false });
    
    document.body.addEventListener('touchmove', e => {
        if (e.touches.length !== 1) return;
        
        const scrollY = window.pageYOffset || document.documentElement.scrollTop;
        if (scrollY > 0) return;
        
        e.preventDefault();
    }, { passive: false });
});

// Global functions for removing stops (called from HTML onclick)
window.removeStop = function(button, stopNumber) {
    if (window.app) {
        window.app.removeStop(button, stopNumber);
    }
};

// Global helper functions
function saveProfile() {
    const app = window.app;
    if (!app || !app.currentUser) return;
    
    const form = document.getElementById('edit-profile-form');
    if (!form) return;
    
    // Update user data
    app.currentUser.name = form.querySelector('#edit-full-name').value;
    app.currentUser.email = form.querySelector('#edit-email').value;
    app.currentUser.phone = form.querySelector('#edit-phone').value;
    app.currentUser.dateOfBirth = form.querySelector('#edit-date-of-birth').value;
    app.currentUser.bio = form.querySelector('#edit-bio').value;
    app.currentUser.emergencyContact = form.querySelector('#edit-emergency-contact').value;
    app.currentUser.emergencyPhone = form.querySelector('#edit-emergency-phone').value;
    
    // Save to storage
    localStorage.setItem('ongopool_user', JSON.stringify(app.currentUser));
    app.storeUser(app.currentUser);
    
    // Update UI
    app.updateUIForUser();
    
    // Show success message and navigate back
    app.showToast('Profile updated successfully!', 'success');
    setTimeout(() => {
        app.showPage('profile');
    }, 1000);
}

function showAddPaymentModal() {
    // Placeholder for payment modal
    window.app.showToast('Add payment method feature coming soon!', 'info');
}

function toggleFAQ(element) {
    const faqItem = element.parentElement;
    faqItem.classList.toggle('active');
}

function showHelpTopic(topic) {
    // Placeholder for help topic navigation
    window.app.showToast(`${topic} help section coming soon!`, 'info');
}

function contactSupport(method) {
    // Placeholder for support contact
    const messages = {
        chat: 'Live chat feature coming soon!',
        email: 'Email support: support@ongopool.ca',
        phone: 'Phone support: 1-800-ONGOPOOL'
    };
    
    window.app.showToast(messages[method] || 'Support feature coming soon!', 'info');
}

function showLicenses() {
    window.app.showToast('Open source licenses information coming soon!', 'info');
}

function exportEarnings() {
    window.app.showToast('Earnings export feature coming soon!', 'info');
}

function showAllTransactions() {
    window.app.showToast('Transaction history feature coming soon!', 'info');
}

// Initialize maps manager
window.mapsManager = null;

// Initialize the application when DOM is loaded
document.addEventListener('DOMContentLoaded', () => {
    if (typeof MapsManager !== 'undefined') {
        window.mapsManager = new MapsManager();
    }
});

// Price estimation function for passenger search
window.estimatePrice = async function() {
    const estimateBtn = document.getElementById('estimate-btn');
    const priceEstimate = document.getElementById('price-estimate');
    const estimatePrice = document.getElementById('estimate-price');
    
    // Get addresses
    const startAddress = document.getElementById('pickup-input').value.trim();
    const endAddress = document.getElementById('destination-input').value.trim();
    
    if (!startAddress || !endAddress) {
        window.app.showToast('Please enter pickup and destination addresses', 'warning');
        return;
    }
    
    try {
        // Show loading state
        estimateBtn.classList.add('loading');
        estimateBtn.disabled = true;
        estimateBtn.innerHTML = '<i class="fas fa-spinner"></i> Calculating...';
        
        if (!window.mapsManager) {
            throw new Error('Maps service not available');
        }
        
        // Calculate route
        const routeData = await window.mapsManager.calculateRouteFromAddresses(
            startAddress, 
            endAddress
        );
        
        // Calculate pricing (passenger perspective) - use default rate
        const priceRange = window.mapsManager.getPriceRange(routeData.distance, 0);
        const estimatedPrice = priceRange.default;
        
        // Show price estimate
        estimatePrice.textContent = `$${estimatedPrice.toFixed(2)}`;
        priceEstimate.style.display = 'block';
        
        window.app.showToast(`Estimated price: $${estimatedPrice.toFixed(2)} for ${routeData.distance.toFixed(1)}km`, 'success');
        
    } catch (error) {
        console.error('Price estimation error:', error);
        window.app.showToast('Unable to estimate price. Please check addresses.', 'error');
        priceEstimate.style.display = 'none';
        
    } finally {
        // Reset button state
        estimateBtn.classList.remove('loading');
        estimateBtn.disabled = false;
        estimateBtn.innerHTML = '<i class="fas fa-calculator"></i> Estimate Price';
    }
};

// Earnings page setup functions
window.setupEarningsPage = function() {
    console.log('Setting up earnings page...');
    // Setup filter tabs
    const earningsContainer = document.getElementById('earnings-page');
    if (!earningsContainer) {
        console.error('Earnings page not found in DOM');
        return;
    }
    
    const filterTabs = earningsContainer.querySelectorAll('.filter-tab');
    console.log('Found filter tabs:', filterTabs.length);
    
    filterTabs.forEach(tab => {
        tab.addEventListener('click', () => {
            // Remove active class from all tabs
            filterTabs.forEach(t => t.classList.remove('active'));
            // Add active class to clicked tab
            tab.classList.add('active');
            
            // Update chart data based on selected period
            const period = tab.getAttribute('data-period');
            updateEarningsChart(period);
        });
    });
    
    // Load default earnings data
    loadEarningsData();
    console.log('Earnings page setup complete');
};

function updateEarningsChart(period) {
    // Update chart based on selected time period
    const chartPeriod = document.querySelector('.chart-period');
    const chartBars = document.querySelectorAll('.chart-bar');
    
    let periodText = '';
    let data = [];
    
    switch(period) {
        case 'week':
            periodText = 'Last 7 days';
            data = [45, 68, 32, 78, 85, 58, 42];
            break;
        case 'month':
            periodText = 'Last 30 days';
            data = [320, 410, 280, 520, 480, 390, 450];
            break;
        case 'quarter':
            periodText = 'Last 3 months';
            data = [1200, 1450, 1320, 1680, 1520, 1390, 1240];
            break;
        case 'year':
            periodText = 'Last 12 months';
            data = [4800, 5200, 4600, 5800, 6200, 5400, 4900];
            break;
    }
    
    if (chartPeriod) {
        chartPeriod.textContent = periodText;
    }
    
    // Update bar heights and values
    chartBars.forEach((bar, index) => {
        if (data[index]) {
            const maxValue = Math.max(...data);
            const height = (data[index] / maxValue) * 100;
            bar.style.height = height + '%';
            
            const valueSpan = bar.querySelector('.bar-value');
            if (valueSpan) {
                valueSpan.textContent = '$' + data[index];
            }
        }
    });
}

function loadEarningsData() {
    // Load earnings data from storage or API
    const earningsData = getEarningsData();
    updateEarningsDisplay(earningsData);
}

function getEarningsData() {
    // Mock earnings data - in production this would come from API/database
    return {
        totalEarnings: 1240.50,
        weeklyEarnings: 156.30,
        monthlyTrips: 24,
        averagePerTrip: 51.70,
        rating: 4.9,
        acceptanceRate: 96,
        onlineTime: 18,
        totalDistance: 486
    };
}

function updateEarningsDisplay(data) {
    // Update summary amounts - Fixed duplicate variable name issue
    const summaryAmount = document.querySelector('.summary-amount');
    if (summaryAmount) {
        summaryAmount.textContent = '$' + data.totalEarnings.toFixed(2);
    }
    
    // Update stat cards - Find them within the earnings page to avoid confusion with other stat cards
    const earningsDisplayPage = document.getElementById('earnings-page');
    if (!earningsDisplayPage) return;
    
    const statCards = earningsDisplayPage.querySelectorAll('.stat-card');
    if (statCards.length >= 3) {
        statCards[0].querySelector('.stat-value').textContent = '$' + data.weeklyEarnings.toFixed(2);
        statCards[1].querySelector('.stat-value').textContent = data.monthlyTrips;
        statCards[2].querySelector('.stat-value').textContent = '$' + data.averagePerTrip.toFixed(2);
    }
    
    // Update performance metrics - Use the existing earningsDisplayPage variable
    const metricCards = earningsDisplayPage.querySelectorAll('.metric-card');
    if (metricCards.length >= 4) {
        metricCards[0].querySelector('.metric-value').textContent = data.rating;
        metricCards[1].querySelector('.metric-value').textContent = data.acceptanceRate + '%';
        metricCards[2].querySelector('.metric-value').textContent = data.onlineTime + 'h';
        metricCards[3].querySelector('.metric-value').textContent = data.totalDistance + 'km';
    }
    
    // Update payout amount
    const payoutAmount = earningsDisplayPage.querySelector('.payout-amount');
    if (payoutAmount) {
        payoutAmount.textContent = '$' + data.weeklyEarnings.toFixed(2);
    }
}