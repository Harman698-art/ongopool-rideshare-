// OnGoPool Payments Module

class PaymentsManager {
    constructor() {
        this.stripe = null;
        this.serviceFeePercentage = 0.15;
        this.stripePublishableKey = null; // Will be set when Stripe is configured
        this.transactions = [];
        this.payouts = [];
        this.init();
    }

    init() {
        this.loadMockData();
        console.log('Payments manager initialized');
    }

    // Initialize Stripe
    initializeStripe(publishableKey) {
        try {
            if (!window.Stripe) {
                throw new Error('Stripe.js not loaded');
            }

            this.stripePublishableKey = publishableKey;
            this.stripe = Stripe(publishableKey);
            console.log('Stripe initialized successfully');
            return true;

        } catch (error) {
            console.error('Stripe initialization error:', error);
            return false;
        }
    }

    // Process ride payment
    async processRidePayment(paymentData) {
        try {
            const { rideId, passengerId, amount, paymentMethodId } = paymentData;

            // Validate payment data
            const validation = this.validatePaymentData(paymentData);
            if (!validation.isValid) {
                throw new Error(validation.error);
            }

            // Calculate fees
            const serviceFee = amount * this.serviceFeePercentage;
            const totalAmount = amount;
            const driverAmount = amount - serviceFee;

            // Create payment intent (mock)
            const paymentIntent = await this.createPaymentIntent({
                amount: Math.round(totalAmount * 100), // Convert to cents
                currency: 'cad',
                paymentMethodId: paymentMethodId,
                metadata: {
                    rideId: rideId,
                    passengerId: passengerId,
                    type: 'ride_payment'
                }
            });

            // Record transaction
            const transaction = {
                id: this.generateTransactionId(),
                type: 'ride_payment',
                rideId: rideId,
                passengerId: passengerId,
                amount: totalAmount,
                serviceFee: serviceFee,
                driverAmount: driverAmount,
                currency: 'CAD',
                status: 'completed',
                paymentIntentId: paymentIntent.id,
                createdAt: new Date().toISOString(),
                processedAt: new Date().toISOString()
            };

            this.transactions.push(transaction);
            this.saveTransactionsToStorage();

            return { transaction, error: null };

        } catch (error) {
            console.error('Payment processing error:', error);
            
            // Record failed transaction
            const failedTransaction = {
                id: this.generateTransactionId(),
                type: 'ride_payment',
                rideId: paymentData.rideId,
                passengerId: paymentData.passengerId,
                amount: paymentData.amount,
                currency: 'CAD',
                status: 'failed',
                error: error.message,
                createdAt: new Date().toISOString()
            };

            this.transactions.push(failedTransaction);
            this.saveTransactionsToStorage();

            return { transaction: null, error: error.message };
        }
    }

    // Process refund
    async processRefund(refundData) {
        try {
            const { transactionId, amount, reason } = refundData;

            // Find original transaction
            const originalTransaction = this.transactions.find(t => t.id === transactionId);
            if (!originalTransaction) {
                throw new Error('Original transaction not found');
            }

            if (originalTransaction.status !== 'completed') {
                throw new Error('Cannot refund uncompleted transaction');
            }

            // Validate refund amount
            if (amount > originalTransaction.amount) {
                throw new Error('Refund amount cannot exceed original payment');
            }

            // Create refund (mock)
            const refund = await this.createRefund({
                paymentIntentId: originalTransaction.paymentIntentId,
                amount: Math.round(amount * 100), // Convert to cents
                reason: reason || 'requested_by_customer'
            });

            // Record refund transaction
            const refundTransaction = {
                id: this.generateTransactionId(),
                type: 'refund',
                originalTransactionId: transactionId,
                rideId: originalTransaction.rideId,
                passengerId: originalTransaction.passengerId,
                amount: amount,
                currency: 'CAD',
                status: 'completed',
                refundId: refund.id,
                reason: reason,
                createdAt: new Date().toISOString(),
                processedAt: new Date().toISOString()
            };

            this.transactions.push(refundTransaction);
            this.saveTransactionsToStorage();

            return { refund: refundTransaction, error: null };

        } catch (error) {
            console.error('Refund processing error:', error);
            return { refund: null, error: error.message };
        }
    }

    // Create Stripe payment intent (mock)
    async createPaymentIntent(intentData) {
        try {
            // Simulate Stripe API call
            await this.delay(1000);

            // Mock payment intent response
            const paymentIntent = {
                id: 'pi_' + Date.now() + '_' + Math.random().toString(36).substr(2, 9),
                amount: intentData.amount,
                currency: intentData.currency,
                status: 'succeeded',
                client_secret: 'pi_' + Date.now() + '_secret',
                metadata: intentData.metadata || {},
                created: Math.floor(Date.now() / 1000)
            };

            console.log('Payment intent created:', paymentIntent.id);
            return paymentIntent;

        } catch (error) {
            console.error('Create payment intent error:', error);
            throw error;
        }
    }

    // Create Stripe refund (mock)
    async createRefund(refundData) {
        try {
            // Simulate Stripe API call
            await this.delay(800);

            // Mock refund response
            const refund = {
                id: 're_' + Date.now() + '_' + Math.random().toString(36).substr(2, 9),
                amount: refundData.amount,
                currency: 'cad',
                status: 'succeeded',
                payment_intent: refundData.paymentIntentId,
                reason: refundData.reason,
                created: Math.floor(Date.now() / 1000)
            };

            console.log('Refund created:', refund.id);
            return refund;

        } catch (error) {
            console.error('Create refund error:', error);
            throw error;
        }
    }

    // Calculate ride price
    calculateRidePrice(distance, pricePerKm, passengers = 1) {
        const basePrice = distance * pricePerKm * passengers;
        const serviceFee = basePrice * this.serviceFeePercentage;
        const totalPrice = basePrice;
        const driverEarnings = basePrice - serviceFee;

        return {
            basePrice: Math.round(basePrice * 100) / 100,
            serviceFee: Math.round(serviceFee * 100) / 100,
            totalPrice: Math.round(totalPrice * 100) / 100,
            driverEarnings: Math.round(driverEarnings * 100) / 100
        };
    }

    // Process weekly payouts to drivers
    async processWeeklyPayouts() {
        try {
            const currentDate = new Date();
            const weekStart = new Date(currentDate);
            weekStart.setDate(currentDate.getDate() - 7);

            // Get completed rides from the past week
            const weeklyTransactions = this.transactions.filter(transaction => {
                const transactionDate = new Date(transaction.createdAt);
                return transaction.type === 'ride_payment' &&
                       transaction.status === 'completed' &&
                       transactionDate >= weekStart &&
                       transactionDate <= currentDate;
            });

            // Group by driver
            const driverPayouts = {};
            weeklyTransactions.forEach(transaction => {
                // In a real app, we'd need to get driver ID from the ride
                const driverId = 'driver_' + transaction.rideId.split('_')[1]; // Mock driver ID
                
                if (!driverPayouts[driverId]) {
                    driverPayouts[driverId] = {
                        driverId: driverId,
                        transactions: [],
                        totalEarnings: 0,
                        totalFees: 0,
                        rideCount: 0
                    };
                }

                driverPayouts[driverId].transactions.push(transaction);
                driverPayouts[driverId].totalEarnings += transaction.driverAmount || 0;
                driverPayouts[driverId].totalFees += transaction.serviceFee || 0;
                driverPayouts[driverId].rideCount += 1;
            });

            // Process payouts for each driver
            const payoutResults = [];
            for (const [driverId, payoutData] of Object.entries(driverPayouts)) {
                if (payoutData.totalEarnings > 0) {
                    const payout = await this.createDriverPayout({
                        driverId: driverId,
                        amount: payoutData.totalEarnings,
                        period: {
                            start: weekStart.toISOString(),
                            end: currentDate.toISOString()
                        },
                        transactions: payoutData.transactions
                    });

                    payoutResults.push(payout);
                }
            }

            return { payouts: payoutResults, error: null };

        } catch (error) {
            console.error('Weekly payout processing error:', error);
            return { payouts: [], error: error.message };
        }
    }

    // Create driver payout
    async createDriverPayout(payoutData) {
        try {
            const { driverId, amount, period, transactions } = payoutData;

            // Create payout (mock - would use Stripe Connect in real app)
            await this.delay(1000);

            const payout = {
                id: this.generatePayoutId(),
                driverId: driverId,
                amount: amount,
                currency: 'CAD',
                status: 'pending',
                method: 'bank_transfer', // or 'stripe_connect'
                period: period,
                transactionIds: transactions.map(t => t.id),
                createdAt: new Date().toISOString(),
                scheduledFor: this.getNextThursday().toISOString()
            };

            this.payouts.push(payout);
            this.savePayoutsToStorage();

            console.log('Driver payout created:', payout.id);
            return payout;

        } catch (error) {
            console.error('Create driver payout error:', error);
            throw error;
        }
    }

    // Get payment methods for user
    async getPaymentMethods(customerId) {
        try {
            // Mock payment methods (would fetch from Stripe in real app)
            await this.delay(500);

            const mockPaymentMethods = [
                {
                    id: 'pm_1234567890',
                    type: 'card',
                    card: {
                        brand: 'visa',
                        last4: '4242',
                        exp_month: 12,
                        exp_year: 2025
                    },
                    created: Math.floor(Date.now() / 1000)
                }
            ];

            return { paymentMethods: mockPaymentMethods, error: null };

        } catch (error) {
            console.error('Get payment methods error:', error);
            return { paymentMethods: [], error: error.message };
        }
    }

    // Add payment method
    async addPaymentMethod(customerId, paymentMethodData) {
        try {
            // Validate payment method data
            if (!paymentMethodData.card) {
                throw new Error('Card information is required');
            }

            // Create payment method (mock)
            await this.delay(1000);

            const paymentMethod = {
                id: 'pm_' + Date.now() + '_' + Math.random().toString(36).substr(2, 9),
                type: 'card',
                card: {
                    brand: paymentMethodData.card.brand || 'visa',
                    last4: paymentMethodData.card.number.slice(-4),
                    exp_month: paymentMethodData.card.exp_month,
                    exp_year: paymentMethodData.card.exp_year
                },
                created: Math.floor(Date.now() / 1000),
                customer: customerId
            };

            return { paymentMethod, error: null };

        } catch (error) {
            console.error('Add payment method error:', error);
            return { paymentMethod: null, error: error.message };
        }
    }

    // Get transaction history
    getTransactionHistory(userId, role = 'passenger') {
        const userTransactions = this.transactions.filter(transaction => {
            if (role === 'passenger') {
                return transaction.passengerId === userId;
            } else if (role === 'driver') {
                // In a real app, we'd need to match driver ID from ride data
                return transaction.type === 'ride_payment' && transaction.status === 'completed';
            }
            return false;
        });

        return userTransactions.sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt));
    }

    // Get driver earnings summary
    getDriverEarningsSummary(driverId) {
        const driverTransactions = this.transactions.filter(transaction => {
            // In a real app, we'd properly match driver ID
            return transaction.type === 'ride_payment' && transaction.status === 'completed';
        });

        const totalEarnings = driverTransactions.reduce((sum, t) => sum + (t.driverAmount || 0), 0);
        const totalFees = driverTransactions.reduce((sum, t) => sum + (t.serviceFee || 0), 0);
        const totalRides = driverTransactions.length;

        const currentMonth = new Date().getMonth();
        const currentYear = new Date().getFullYear();
        const monthlyTransactions = driverTransactions.filter(t => {
            const transactionDate = new Date(t.createdAt);
            return transactionDate.getMonth() === currentMonth && 
                   transactionDate.getFullYear() === currentYear;
        });

        const monthlyEarnings = monthlyTransactions.reduce((sum, t) => sum + (t.driverAmount || 0), 0);

        return {
            totalEarnings: Math.round(totalEarnings * 100) / 100,
            totalFees: Math.round(totalFees * 100) / 100,
            totalRides: totalRides,
            monthlyEarnings: Math.round(monthlyEarnings * 100) / 100,
            monthlyRides: monthlyTransactions.length,
            averagePerRide: totalRides > 0 ? Math.round((totalEarnings / totalRides) * 100) / 100 : 0
        };
    }

    // Validation helpers
    validatePaymentData(paymentData) {
        const { rideId, passengerId, amount, paymentMethodId } = paymentData;

        if (!rideId) {
            return { isValid: false, error: 'Ride ID is required' };
        }

        if (!passengerId) {
            return { isValid: false, error: 'Passenger ID is required' };
        }

        if (!amount || amount <= 0) {
            return { isValid: false, error: 'Valid payment amount is required' };
        }

        if (amount > 1000) {
            return { isValid: false, error: 'Payment amount exceeds maximum limit' };
        }

        if (!paymentMethodId) {
            return { isValid: false, error: 'Payment method is required' };
        }

        return { isValid: true };
    }

    // Utility functions
    getNextThursday() {
        const today = new Date();
        const dayOfWeek = today.getDay(); // 0 = Sunday, 4 = Thursday
        const daysUntilThursday = dayOfWeek <= 4 ? 4 - dayOfWeek : 7 - dayOfWeek + 4;
        
        const nextThursday = new Date(today);
        nextThursday.setDate(today.getDate() + daysUntilThursday);
        nextThursday.setHours(9, 0, 0, 0); // 9 AM
        
        return nextThursday;
    }

    formatCurrency(amount, currency = 'CAD') {
        return new Intl.NumberFormat('en-CA', {
            style: 'currency',
            currency: currency
        }).format(amount);
    }

    generateTransactionId() {
        return 'txn_' + Date.now() + '_' + Math.random().toString(36).substr(2, 9);
    }

    generatePayoutId() {
        return 'payout_' + Date.now() + '_' + Math.random().toString(36).substr(2, 9);
    }

    // Storage helpers
    saveTransactionsToStorage() {
        try {
            localStorage.setItem('ongopool_transactions', JSON.stringify(this.transactions));
        } catch (error) {
            console.error('Failed to save transactions to storage:', error);
        }
    }

    loadTransactionsFromStorage() {
        try {
            const transactionsData = localStorage.getItem('ongopool_transactions');
            if (transactionsData) {
                this.transactions = JSON.parse(transactionsData);
            }
        } catch (error) {
            console.error('Failed to load transactions from storage:', error);
            this.transactions = [];
        }
    }

    savePayoutsToStorage() {
        try {
            localStorage.setItem('ongopool_payouts', JSON.stringify(this.payouts));
        } catch (error) {
            console.error('Failed to save payouts to storage:', error);
        }
    }

    loadPayoutsFromStorage() {
        try {
            const payoutsData = localStorage.getItem('ongopool_payouts');
            if (payoutsData) {
                this.payouts = JSON.parse(payoutsData);
            }
        } catch (error) {
            console.error('Failed to load payouts from storage:', error);
            this.payouts = [];
        }
    }

    // Mock data for demonstration
    loadMockData() {
        this.loadTransactionsFromStorage();
        this.loadPayoutsFromStorage();

        // Add some mock transactions if none exist
        if (this.transactions.length === 0) {
            this.transactions = [
                {
                    id: 'txn_001',
                    type: 'ride_payment',
                    rideId: 'ride_001',
                    passengerId: 'passenger_001',
                    amount: 90.00,
                    serviceFee: 13.50,
                    driverAmount: 76.50,
                    currency: 'CAD',
                    status: 'completed',
                    paymentIntentId: 'pi_mock_001',
                    createdAt: new Date(Date.now() - 86400000).toISOString(), // Yesterday
                    processedAt: new Date(Date.now() - 86400000).toISOString()
                }
            ];
        }
    }

    delay(ms) {
        return new Promise(resolve => setTimeout(resolve, ms));
    }
}

// Export for use in other modules
window.PaymentsManager = PaymentsManager;