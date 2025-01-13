class DashboardManager {
    constructor() {
        this.totalItemsElement = document.getElementById('totalItems');
        this.totalCustomersElement = document.getElementById('totalCustomers');
        this.totalInvoicesElement = document.getElementById('totalInvoices');
        this.activityListElement = document.getElementById('activityList');

        this.initialize();
    }

    initialize() {
        this.updateStats();
        this.loadRecentActivity();
    }

    updateStats() {
        // Get counts from localStorage
        const inventory = JSON.parse(localStorage.getItem('inventory')) || [];
        const customers = JSON.parse(localStorage.getItem('customers')) || [];
        const invoices = JSON.parse(localStorage.getItem('invoices')) || [];

        // Update the display
        this.totalItemsElement.textContent = inventory.length;
        this.totalCustomersElement.textContent = customers.length;
        this.totalInvoicesElement.textContent = invoices.length;
    }

    loadRecentActivity() {
        // Get recent activities from localStorage
        const activities = JSON.parse(localStorage.getItem('activities')) || [];
        
        // Display last 10 activities
        const recentActivities = activities.slice(-10).reverse();
        
        this.activityListElement.innerHTML = recentActivities.map(activity => `
            <div class="activity-item">
                <div class="activity-icon">
                    <i class="fas ${this.getActivityIcon(activity.type)}"></i>
                </div>
                <div class="activity-details">
                    <div class="activity-message">${activity.message}</div>
                    <div class="activity-time">${this.formatTime(activity.timestamp)}</div>
                </div>
            </div>
        `).join('');
    }

    getActivityIcon(type) {
        const icons = {
            'inventory': 'fa-box',
            'customer': 'fa-user',
            'invoice': 'fa-file-invoice',
            'settings': 'fa-cog'
        };
        return icons[type] || 'fa-info-circle';
    }

    formatTime(timestamp) {
        const date = new Date(timestamp);
        const now = new Date();
        const diffInHours = Math.floor((now - date) / (1000 * 60 * 60));

        if (diffInHours < 24) {
            if (diffInHours < 1) {
                const diffInMinutes = Math.floor((now - date) / (1000 * 60));
                return `${diffInMinutes} minute${diffInMinutes !== 1 ? 's' : ''} ago`;
            }
            return `${diffInHours} hour${diffInHours !== 1 ? 's' : ''} ago`;
        }

        return date.toLocaleDateString('en-US', {
            month: 'short',
            day: 'numeric',
            hour: 'numeric',
            minute: '2-digit'
        });
    }
}

class ProfitManager {
    constructor() {
        this.currentPeriod = 'daily';
        this.setupEventListeners();
        this.updateProfitStats();
    }

    setupEventListeners() {
        const tabButtons = document.querySelectorAll('.tab-btn');
        tabButtons.forEach(button => {
            button.addEventListener('click', () => {
                tabButtons.forEach(btn => btn.classList.remove('active'));
                button.classList.add('active');
                this.currentPeriod = button.dataset.period;
                this.updateProfitStats();
            });
        });
    }

    getDateRange() {
        const now = new Date();
        const start = new Date(now);
        
        switch(this.currentPeriod) {
            case 'daily':
                start.setHours(0, 0, 0, 0);
                break;
            case 'weekly':
                start.setDate(now.getDate() - 7);
                break;
            case 'monthly':
                start.setMonth(now.getMonth() - 1);
                break;
            case 'yearly':
                start.setFullYear(now.getFullYear() - 1);
                break;
        }
        
        return { start, end: now };
    }

    calculateProfits() {
        const invoices = JSON.parse(localStorage.getItem('invoices')) || [];
        const inventory = JSON.parse(localStorage.getItem('inventory')) || [];
        const { start, end } = this.getDateRange();
        
        let grossSales = 0;
        let totalCost = 0;
        let totalDiscounts = 0;
        
        const filteredInvoices = invoices.filter(invoice => {
            const invoiceDate = new Date(invoice.date);
            return invoiceDate >= start && invoiceDate <= end;
        });

        filteredInvoices.forEach(invoice => {
            // Add up item sales and costs
            invoice.items.forEach(item => {
                const inventoryItem = inventory.find(invItem => invItem.id === item.id);
                if (inventoryItem) {
                    grossSales += item.quantity * item.price;
                    totalCost += item.quantity * inventoryItem.costPrice;
                }
            });
            
            // Add up discounts
            if (invoice.discountAmount) {
                totalDiscounts += invoice.discountAmount;
            }
        });

        // Calculate net sales and profit after deducting discounts
        const netSales = grossSales - totalDiscounts;
        const totalProfit = netSales - totalCost;
        
        return {
            grossSales,
            totalDiscounts,
            netSales,
            totalCost,
            totalProfit
        };
    }

    formatCurrency(amount) {
        return '₹' + (isNaN(amount) ? '0.00' : amount.toFixed(2));
    }

    updateProfitStats() {
        const { grossSales, totalDiscounts, netSales, totalCost, totalProfit } = this.calculateProfits();
        
        // Display net sales (after discounts) as total sales
        document.getElementById('totalSales').textContent = this.formatCurrency(netSales);
        document.getElementById('totalCost').textContent = this.formatCurrency(totalCost);
        document.getElementById('totalProfit').textContent = this.formatCurrency(totalProfit);

        // Add color coding for profit/loss
        const profitElement = document.getElementById('totalProfit');
        if (totalProfit > 0) {
            profitElement.style.color = '#28a745'; // Green for profit
        } else if (totalProfit < 0) {
            profitElement.style.color = '#dc3545'; // Red for loss
        } else {
            profitElement.style.color = '#6c757d'; // Gray for zero
        }
    }
}

// Initialize managers when DOM is loaded
document.addEventListener('DOMContentLoaded', () => {
    new DashboardManager();
    new ProfitManager();
});
