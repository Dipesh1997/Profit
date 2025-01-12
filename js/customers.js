class CustomerManager {
    constructor() {
        // DOM Elements
        this.customersList = document.getElementById('customersList');
        this.customerSearch = document.getElementById('customerSearch');
        this.addModal = document.getElementById('addCustomerModal');
        this.addForm = document.getElementById('addCustomerForm');
        this.addButton = document.getElementById('addButton');

        // Load customers from localStorage
        this.customers = JSON.parse(localStorage.getItem('customers')) || [];
        this.editingId = null;

        // Bind methods
        this.handleAddCustomer = this.handleAddCustomer.bind(this);
        this.handleSearch = this.handleSearch.bind(this);
        this.handleCustomerClick = this.handleCustomerClick.bind(this);
        this.handleCustomerBlur = this.handleCustomerBlur.bind(this);
        this.handleDeleteCustomer = this.handleDeleteCustomer.bind(this);

        // Initialize
        this.setupEventListeners();
        this.renderCustomers();
    }

    setupEventListeners() {
        // Add customer form
        this.addForm.addEventListener('submit', this.handleAddCustomer);
        
        // Search input
        this.customerSearch.addEventListener('input', this.handleSearch);
        
        // Add button
        this.addButton.addEventListener('click', () => {
            this.addModal.style.display = 'block';
        });

        // Close modal
        document.querySelector('.close-modal').addEventListener('click', () => {
            this.addModal.style.display = 'none';
        });

        // Click outside modal to close
        window.addEventListener('click', (e) => {
            if (e.target === this.addModal) {
                this.addModal.style.display = 'none';
            }
        });

        // Customer list click events
        this.customersList.addEventListener('click', this.handleCustomerClick);
    }

    handleAddCustomer(e) {
        e.preventDefault();
        
        const name = document.getElementById('customerName').value.trim();
        const phone = document.getElementById('customerPhone').value.trim();
        
        if (phone && !this.validatePhone(phone)) {
            alert('Please enter a valid phone number');
            return;
        }
        
        const newCustomer = {
            id: Date.now(),
            name,
            phone: phone ? this.formatPhone(phone) : ''
        };
        
        this.customers.push(newCustomer);
        this.saveCustomers();
        this.renderCustomers();
        
        this.addForm.reset();
        this.addModal.style.display = 'none';
    }

    handleCustomerClick(e) {
        const customerItem = e.target.closest('.customer-item');
        if (!customerItem) return;

        const deleteBtn = e.target.closest('.delete-btn');
        if (deleteBtn) {
            const id = Number(customerItem.dataset.id);
            this.handleDeleteCustomer(id);
            return;
        }

        const field = e.target.closest('.editable');
        if (!field) return;

        // If already editing, don't do anything
        if (customerItem.querySelector('input')) return;

        const id = Number(customerItem.dataset.id);
        const customer = this.customers.find(c => c.id === id);
        if (!customer) return;

        const isName = field.classList.contains('customer-name');
        const isPhone = field.classList.contains('customer-phone');
        const currentValue = isName ? customer.name : (customer.phone || '');
        const inputType = isPhone ? 'tel' : 'text';

        const input = document.createElement('input');
        input.type = inputType;
        input.value = currentValue;
        input.className = 'inline-edit';
        if (isName) input.required = true;

        input.addEventListener('blur', () => this.handleCustomerBlur(input, id, isName ? 'name' : 'phone'));
        input.addEventListener('keypress', (e) => {
            if (e.key === 'Enter') input.blur();
        });

        field.innerHTML = '';
        field.appendChild(input);
        input.focus();
        input.select();
    }

    handleCustomerBlur(input, id, field) {
        let value = input.value.trim();
        const customer = this.customers.find(c => c.id === id);
        if (!customer) return;

        if (field === 'name' && !value) {
            value = customer.name;  // Revert to original if empty
        } else if (field === 'phone' && value && !this.validatePhone(value)) {
            alert('Please enter a valid phone number');
            value = customer.phone || '';  // Revert to original if invalid
        }

        if (field === 'phone' && value) {
            value = this.formatPhone(value);
        }

        customer[field] = value;
        this.saveCustomers();
        this.renderCustomers();
    }

    handleDeleteCustomer(id) {
        if (confirm('Are you sure you want to delete this customer?')) {
            this.customers = this.customers.filter(c => c.id !== id);
            this.saveCustomers();
            this.renderCustomers();
        }
    }

    handleSearch() {
        this.renderCustomers();
    }

    validatePhone(phone) {
        return phone === '' || phone.match(/^\d{10}$/);
    }

    formatPhone(phone) {
        if (!phone) return '';
        return phone.replace(/(\d{3})(\d{3})(\d{4})/, '$1-$2-$3');
    }

    saveCustomers() {
        localStorage.setItem('customers', JSON.stringify(this.customers));
    }

    renderCustomers() {
        const searchTerm = this.customerSearch.value.toLowerCase();
        const filteredCustomers = this.customers.filter(customer => 
            customer.name.toLowerCase().includes(searchTerm) ||
            (customer.phone && customer.phone.includes(searchTerm))
        );
        
        this.customersList.innerHTML = filteredCustomers.map(customer => `
            <div class="customer-item" data-id="${customer.id}">
                <div class="customer-info">
                    <div class="editable customer-name">${customer.name}</div>
                    <div class="editable customer-phone">${customer.phone || '<span class="empty-phone">Click to add phone</span>'}</div>
                </div>
                <div class="customer-actions">
                    <button class="action-btn delete-btn">
                        <i class="fas fa-trash"></i>
                    </button>
                </div>
            </div>
        `).join('');
    }
}

// Initialize the customer manager when the DOM is loaded
document.addEventListener('DOMContentLoaded', () => {
    new CustomerManager();
    
    // Check for pending actions
    if (sessionStorage.getItem('pendingAction') === 'openFAB') {
        sessionStorage.removeItem('pendingAction');
        const addButton = document.querySelector('.floating-action-button');
        if (addButton) {
            addButton.click();
        }
    }
});
