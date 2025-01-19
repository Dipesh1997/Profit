class DashboardManager {
    constructor() {
        this.totalItemsElement = document.getElementById('totalItems');
        this.totalCustomersElement = document.getElementById('totalCustomers');
        this.totalInvoicesElement = document.getElementById('totalInvoices');

        this.initialize();
        this.setupEventListeners();
    }

    initialize() {
        this.updateStats();
    }

    setupEventListeners() {
        // Add click handlers for stat cards
        document.querySelector('.stat-card[data-type="customers"]').addEventListener('click', () => {
            window.location.href = 'customers.html';
        });

        document.querySelector('.stat-card[data-type="inventory"]').addEventListener('click', () => {
            window.location.href = 'inventory.html';
        });

        document.querySelector('.stat-card[data-type="invoices"]').addEventListener('click', () => {
            window.location.href = 'invoices.html';
        });
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
