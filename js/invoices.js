class InvoiceManager {
    constructor() {
        // DOM Elements
        this.invoicesList = document.getElementById('invoicesList');
        this.invoiceSearch = document.getElementById('invoiceSearch');
        this.addModal = document.getElementById('addInvoiceModal');
        this.addForm = document.getElementById('addInvoiceForm');
        this.addButton = document.getElementById('addButton');
        this.customerSelect = document.getElementById('customerSelect');
        this.invoiceItems = document.getElementById('invoiceItems');
        this.addItemButton = document.getElementById('addItemToInvoice');
        this.invoiceSubtotal = document.getElementById('invoiceSubtotal');
        this.invoiceTax = document.getElementById('invoiceTax');
        this.invoiceDiscount = document.getElementById('invoiceDiscount');
        this.invoiceTotal = document.getElementById('invoiceTotal');
        this.taxRate = document.getElementById('taxRate');
        this.discountAmount = document.getElementById('discountAmount');
        this.taxLabel = document.getElementById('taxLabel');
        this.modalTitle = document.getElementById('modalTitle');
        this.submitButton = document.getElementById('submitButton');
        this.editInvoiceId = document.getElementById('editInvoiceId');

        // Load data from localStorage
        this.invoices = JSON.parse(localStorage.getItem('invoices')) || [];
        this.customers = JSON.parse(localStorage.getItem('customers')) || [];
        this.inventory = JSON.parse(localStorage.getItem('inventory')) || [];

        // Bind methods
        this.handleSubmit = this.handleSubmit.bind(this);
        this.handleSearch = this.handleSearch.bind(this);
        this.handleDeleteInvoice = this.handleDeleteInvoice.bind(this);
        this.handleAddItem = this.handleAddItem.bind(this);
        this.updateTotals = this.updateTotals.bind(this);
        this.handleEditInvoice = this.handleEditInvoice.bind(this);

        // Initialize
        this.setupEventListeners();
        this.loadCustomers();
        this.renderInvoices();
    }

    setupEventListeners() {
        // Form submission
        this.addForm.addEventListener('submit', this.handleSubmit);
        
        // Search input
        this.invoiceSearch.addEventListener('input', this.handleSearch);
        
        // Add button
        this.addButton.addEventListener('click', () => {
            this.openModal();
        });

        // Close modal
        document.querySelector('.close-modal').addEventListener('click', () => {
            this.closeModal();
        });

        // Click outside modal to close
        window.addEventListener('click', (e) => {
            if (e.target === this.addModal) {
                this.closeModal();
            }
        });

        // Add item to invoice
        this.addItemButton.addEventListener('click', this.handleAddItem);

        // Tax rate and discount changes
        this.taxRate.addEventListener('input', () => {
            this.updateTaxLabel();
            this.updateTotals();
        });

        this.discountAmount.addEventListener('input', () => {
            this.updateTotals();
        });

        // Invoice list click events for edit and delete
        this.invoicesList.addEventListener('click', (e) => {
            const invoiceElement = e.target.closest('.invoice-item');
            if (!invoiceElement) return;

            const id = Number(invoiceElement.dataset.id);
            
            if (e.target.closest('.edit-btn')) {
                this.handleEditInvoice(id);
            } else if (e.target.closest('.delete-btn')) {
                this.handleDeleteInvoice(id);
            }
        });
    }

    openModal(invoice = null) {
        this.addModal.style.display = 'block';
        this.loadCustomers();
        
        if (invoice) {
            this.modalTitle.textContent = 'Edit Invoice';
            this.submitButton.textContent = 'Update Invoice';
            this.editInvoiceId.value = invoice.id;
            this.customerSelect.value = invoice.customerId;
            this.taxRate.value = invoice.taxRate || 0;
            this.discountAmount.value = invoice.discountAmount || 0;
            
            // Load invoice items
            this.invoiceItems.innerHTML = '';
            invoice.items.forEach(item => {
                this.handleAddItem(null, item);
            });
        } else {
            this.modalTitle.textContent = 'Create New Invoice';
            this.submitButton.textContent = 'Create Invoice';
            this.editInvoiceId.value = '';
            this.resetForm();
        }
        
        this.updateTaxLabel();
    }

    closeModal() {
        this.addModal.style.display = 'none';
        this.resetForm();
    }

    updateTaxLabel() {
        const rate = parseFloat(this.taxRate.value) || 0;
        this.taxLabel.textContent = `Tax (${rate}%):`;
    }

    loadCustomers() {
        this.customerSelect.innerHTML = `
            <option value="">Select a customer</option>
            ${this.customers.map(customer => `
                <option value="${customer.id}">${customer.name}</option>
            `).join('')}
        `;
    }

    handleAddItem(e, existingItem = null) {
        const itemRow = document.createElement('div');
        itemRow.className = 'invoice-item-row';
        
        itemRow.innerHTML = `
            <div class="item-select-group">
                <select class="item-select" required>
                    <option value="">Select an item</option>
                    ${this.inventory.map(item => `
                        <option value="${item.id}" 
                            data-price="${item.sellingPrice}"
                            data-code="${item.code || ''}"
                            ${existingItem && existingItem.id === item.id ? 'selected' : ''}
                        >${item.name}</option>
                    `).join('')}
                </select>
                <span class="item-code"></span>
            </div>
            <div class="item-price-group">
                <input type="number" class="item-selling-price" min="0" step="0.01" value="${existingItem ? existingItem.price : '0.00'}" required>
            </div>
            <input type="number" class="item-quantity" min="1" value="${existingItem ? existingItem.quantity : 1}" required>
            <div class="item-total">₹0.00</div>
            <button type="button" class="remove-item">×</button>
        `;

        this.invoiceItems.appendChild(itemRow);

        // Add event listeners
        const select = itemRow.querySelector('.item-select');
        const quantity = itemRow.querySelector('.item-quantity');
        const sellingPrice = itemRow.querySelector('.item-selling-price');
        const removeBtn = itemRow.querySelector('.remove-item');
        const codeSpan = itemRow.querySelector('.item-code');

        if (existingItem) {
            const item = this.inventory.find(i => i.id === existingItem.id);
            if (item) {
                codeSpan.textContent = item.code || '';
                sellingPrice.value = existingItem.price.toFixed(2);
            }
        }

        select.addEventListener('change', () => {
            const selectedOption = select.options[select.selectedIndex];
            if (selectedOption.value) {
                const item = this.inventory.find(i => i.id === Number(selectedOption.value));
                if (item) {
                    codeSpan.textContent = item.code || '';
                    sellingPrice.value = item.sellingPrice.toFixed(2);
                }
            } else {
                codeSpan.textContent = '';
                sellingPrice.value = '0.00';
            }
            this.updateItemTotal(itemRow);
        });

        quantity.addEventListener('input', () => this.updateItemTotal(itemRow));
        sellingPrice.addEventListener('input', () => this.updateItemTotal(itemRow));
        removeBtn.addEventListener('click', () => {
            itemRow.remove();
            this.updateTotals();
        });

        this.updateItemTotal(itemRow);
    }

    updateItemTotal(row) {
        const select = row.querySelector('.item-select');
        const quantity = row.querySelector('.item-quantity');
        const sellingPrice = row.querySelector('.item-selling-price');
        const totalDiv = row.querySelector('.item-total');
        
        const selectedOption = select.options[select.selectedIndex];
        if (selectedOption.value) {
            const price = parseFloat(sellingPrice.value) || 0;
            const qty = parseInt(quantity.value) || 0;
            totalDiv.textContent = `₹${(price * qty).toFixed(2)}`;
        } else {
            totalDiv.textContent = '₹0.00';
        }

        this.updateTotals();
    }

    updateTotals() {
        let subtotal = 0;
        let totalCostPrice = 0;
        
        this.invoiceItems.querySelectorAll('.invoice-item-row').forEach(row => {
            const select = row.querySelector('.item-select');
            const quantity = row.querySelector('.item-quantity');
            const sellingPrice = row.querySelector('.item-selling-price');
            
            const selectedOption = select.options[select.selectedIndex];
            if (selectedOption.value) {
                const price = parseFloat(sellingPrice.value) || 0;
                const qty = parseInt(quantity.value) || 0;
                const item = this.inventory.find(i => i.id === Number(selectedOption.value));
                const costPrice = item ? item.costPrice : 0;
                
                subtotal += price * qty;
                totalCostPrice += costPrice * qty;
            }
        });

        const taxRate = parseFloat(this.taxRate.value) || 0;
        const discountAmount = parseFloat(this.discountAmount.value) || 0;
        
        // Calculate tax after applying discount
        const discountedSubtotal = subtotal - discountAmount;
        const tax = discountedSubtotal * (taxRate / 100);
        const total = discountedSubtotal + tax;

        this.invoiceSubtotal.textContent = `₹${subtotal.toFixed(2)}`;
        this.invoiceTax.textContent = `₹${tax.toFixed(2)}`;
        this.invoiceDiscount.textContent = `₹${discountAmount.toFixed(2)}`;
        this.invoiceTotal.textContent = `₹${total.toFixed(2)}`;
    }

    handleSubmit(e) {
        e.preventDefault();
        
        const customerId = this.customerSelect.value;
        if (!customerId) {
            alert('Please select a customer');
            return;
        }

        const items = [];
        let isValid = true;
        let totalCostPrice = 0;

        this.invoiceItems.querySelectorAll('.invoice-item-row').forEach(row => {
            const select = row.querySelector('.item-select');
            const quantity = row.querySelector('.item-quantity');
            const sellingPrice = row.querySelector('.item-selling-price');
            
            if (!select.value || !quantity.value || !sellingPrice.value) {
                isValid = false;
                return;
            }

            const item = this.inventory.find(i => i.id === Number(select.value));
            const price = parseFloat(sellingPrice.value);
            const qty = parseInt(quantity.value);
            
            totalCostPrice += item.costPrice * qty;
            
            items.push({
                id: item.id,
                name: item.name,
                code: item.code,
                price: price,
                costPrice: item.costPrice,
                quantity: qty,
                total: price * qty
            });
        });

        if (!isValid || items.length === 0) {
            alert('Please add at least one item to the invoice');
            return;
        }

        const subtotal = items.reduce((sum, item) => sum + item.total, 0);
        const taxRate = parseFloat(this.taxRate.value) || 0;
        const discountAmount = parseFloat(this.discountAmount.value) || 0;
        
        // Calculate tax after applying discount
        const discountedSubtotal = subtotal - discountAmount;
        const tax = discountedSubtotal * (taxRate / 100);
        const total = discountedSubtotal + tax;
        
        // Calculate profit after discount
        const profit = total - totalCostPrice;

        const invoiceData = {
            customerId: Number(customerId),
            customerName: this.customers.find(c => c.id === Number(customerId)).name,
            items,
            subtotal,
            taxRate,
            tax,
            discountAmount,
            total,
            totalCostPrice,
            profit,
            date: new Date().toISOString()
        };

        if (this.editInvoiceId.value) {
            // Update existing invoice
            const index = this.invoices.findIndex(i => i.id === Number(this.editInvoiceId.value));
            if (index !== -1) {
                invoiceData.id = Number(this.editInvoiceId.value);
                this.invoices[index] = invoiceData;
                this.addActivity('invoice', `Updated invoice for ${invoiceData.customerName}`);
            }
        } else {
            // Create new invoice
            invoiceData.id = Date.now();
            this.invoices.push(invoiceData);
            this.addActivity('invoice', `Created new invoice for ${invoiceData.customerName}`);
        }
        
        this.saveInvoices();
        this.renderInvoices();
        this.closeModal();
    }

    handleEditInvoice(id) {
        const invoice = this.invoices.find(i => i.id === id);
        if (invoice) {
            this.openModal(invoice);
        }
    }

    handleDeleteInvoice(id) {
        const invoice = this.invoices.find(i => i.id === id);
        if (invoice && confirm(`Are you sure you want to delete this invoice for ${invoice.customerName}?`)) {
            this.invoices = this.invoices.filter(i => i.id !== id);
            this.saveInvoices();
            this.renderInvoices();
            this.addActivity('invoice', `Deleted invoice for ${invoice.customerName}`);
        }
    }

    resetForm() {
        this.addForm.reset();
        this.invoiceItems.innerHTML = '';
        this.editInvoiceId.value = '';
        this.updateTaxLabel();
        this.updateTotals();
    }

    handleSearch() {
        this.renderInvoices();
    }

    saveInvoices() {
        localStorage.setItem('invoices', JSON.stringify(this.invoices));
    }

    addActivity(type, message) {
        const activities = JSON.parse(localStorage.getItem('activities')) || [];
        activities.push({
            type,
            message,
            timestamp: new Date().toISOString()
        });
        localStorage.setItem('activities', JSON.stringify(activities));
    }

    renderInvoices() {
        const searchTerm = this.invoiceSearch.value.toLowerCase();
        const filteredInvoices = this.invoices.filter(invoice => 
            invoice.customerName.toLowerCase().includes(searchTerm) ||
            invoice.id.toString().includes(searchTerm) ||
            invoice.items.some(item => 
                item.name.toLowerCase().includes(searchTerm) ||
                (item.code && item.code.toLowerCase().includes(searchTerm))
            )
        );
        
        this.invoicesList.innerHTML = filteredInvoices.map(invoice => `
            <div class="invoice-item" data-id="${invoice.id}">
                <div class="invoice-header">
                    <div class="invoice-info">
                        <div class="invoice-customer">${invoice.customerName}</div>
                        <div class="invoice-date">${new Date(invoice.date).toLocaleDateString()}</div>
                    </div>
                    <div class="invoice-actions">
                        <button class="action-btn edit-btn">
                            <i class="fas fa-edit"></i>
                        </button>
                        <button class="action-btn delete-btn">
                            <i class="fas fa-trash"></i>
                        </button>
                    </div>
                </div>
                <div class="invoice-items">
                    ${invoice.items.map(item => `
                        <div class="invoice-line-item">
                            <div class="item-info">
                                <span class="item-name">${item.name}</span>
                                ${item.code ? `<span class="item-code">${item.code}</span>` : ''}
                            </div>
                            <div class="item-details">
                                ${item.quantity} × ₹${item.price.toFixed(2)} = ₹${item.total.toFixed(2)}
                            </div>
                        </div>
                    `).join('')}
                </div>
                <div class="invoice-summary">
                    <div class="summary-row">
                        <span>Subtotal:</span>
                        <span>₹${invoice.subtotal.toFixed(2)}</span>
                    </div>
                    <div class="summary-row">
                        <span>Discount:</span>
                        <span>₹${invoice.discountAmount.toFixed(2)}</span>
                    </div>
                    <div class="summary-row">
                        <span>Tax (${invoice.taxRate || 0}%):</span>
                        <span>₹${invoice.tax.toFixed(2)}</span>
                    </div>
                    <div class="summary-row total">
                        <span>Total:</span>
                        <span>₹${invoice.total.toFixed(2)}</span>
                    </div>
                </div>
            </div>
        `).join('');
    }
}

// Initialize the invoice manager when the DOM is loaded
document.addEventListener('DOMContentLoaded', () => {
    new InvoiceManager();
    
    // Check for pending actions
    if (sessionStorage.getItem('pendingAction') === 'openFAB') {
        sessionStorage.removeItem('pendingAction');
        const addButton = document.querySelector('.floating-action-button');
        if (addButton) {
            addButton.click();
        }
    }
});
