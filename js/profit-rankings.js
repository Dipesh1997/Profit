class ProfitRankings {
    constructor() {
        this.rankingsList = document.getElementById('rankingsList');
        this.searchInput = document.getElementById('rankingSearch');
        
        // Load data
        this.invoices = JSON.parse(localStorage.getItem('invoices')) || [];
        this.customers = JSON.parse(localStorage.getItem('customers')) || [];
        
        // Bind methods
        this.handleSearch = this.handleSearch.bind(this);
        
        // Initialize
        this.setupEventListeners();
        this.renderRankings();
    }
    
    setupEventListeners() {
        this.searchInput.addEventListener('input', this.handleSearch);
    }
    
    calculateCustomerProfits() {
        const customerProfits = {};
        
        // Initialize customer profits
        this.customers.forEach(customer => {
            customerProfits[customer.id] = {
                customerId: customer.id,
                customerName: customer.name,
                totalProfit: 0,
                totalOrders: 0,
                totalAmount: 0
            };
        });
        
        // Calculate profits from invoices
        this.invoices.forEach(invoice => {
            if (customerProfits[invoice.customerId]) {
                customerProfits[invoice.customerId].totalProfit += invoice.profit || 0;
                customerProfits[invoice.customerId].totalOrders += 1;
                customerProfits[invoice.customerId].totalAmount += invoice.total || 0;
            }
        });
        
        // Convert to array and sort by profit
        return Object.values(customerProfits)
            .sort((a, b) => b.totalProfit - a.totalProfit);
    }
    
    formatCurrency(amount) {
        return '₹' + amount.toFixed(2);
    }
    
    handleSearch() {
        this.renderRankings();
    }
    
    renderRankings() {
        const searchTerm = this.searchInput.value.toLowerCase();
        let rankings = this.calculateCustomerProfits();
        
        // Filter by search term
        if (searchTerm) {
            rankings = rankings.filter(customer => 
                customer.customerName.toLowerCase().includes(searchTerm)
            );
        }
        
        this.rankingsList.innerHTML = rankings.map((customer, index) => `
            <div class="ranking-item ${index < 3 ? 'top-3' : ''}" data-id="${customer.customerId}">
                <div class="rank">#${index + 1}</div>
                <div class="customer-info">
                    <div class="customer-name">${customer.customerName}</div>
                    <div class="customer-details">
                        Orders: ${customer.totalOrders} | Total Spent: ${this.formatCurrency(customer.totalAmount)}
                    </div>
                </div>
                <div class="profit-amount">
                    ${this.formatCurrency(customer.totalProfit)}
                </div>
            </div>
        `).join('');
    }
}

// Initialize when DOM is loaded
document.addEventListener('DOMContentLoaded', () => {
    new ProfitRankings();
}); 