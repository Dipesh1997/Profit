class InventoryManager {
    constructor() {
        // DOM Elements
        this.inventoryList = document.getElementById('inventoryList');
        this.inventorySearch = document.getElementById('inventorySearch');
        this.addModal = document.getElementById('addItemModal');
        this.addForm = document.getElementById('addItemForm');
        this.addButton = document.getElementById('addButton');
        this.returnButton = document.getElementById('returnButton');

        // Load inventory from localStorage
        this.inventory = JSON.parse(localStorage.getItem('inventory')) || [];

        // Bind methods
        this.handleAddItem = this.handleAddItem.bind(this);
        this.handleSearch = this.handleSearch.bind(this);
        this.handleItemClick = this.handleItemClick.bind(this);
        this.handleItemBlur = this.handleItemBlur.bind(this);
        this.handleDeleteItem = this.handleDeleteItem.bind(this);

        // Initialize
        this.setupEventListeners();
        this.renderInventory();
    }

    setupEventListeners() {
        // Add item form
        this.addForm.addEventListener('submit', this.handleAddItem);
        
        // Search input
        this.inventorySearch.addEventListener('input', this.handleSearch);
        
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

        // Inventory list click events
        this.inventoryList.addEventListener('click', this.handleItemClick);

        // Return button click
        this.returnButton.addEventListener('click', () => {
            window.location.href = 'invoices.html?action=return';
        });
    }

    handleAddItem(e) {
        e.preventDefault();
        
        const name = document.getElementById('itemName').value.trim();
        const code = document.getElementById('itemCode').value.trim();
        const quantity = parseInt(document.getElementById('itemQuantity').value);
        const costPrice = parseFloat(document.getElementById('itemCostPrice').value);
        const sellingPrice = parseFloat(document.getElementById('itemSellingPrice').value);
        
        // Validate selling price is greater than cost price
        if (sellingPrice < costPrice) {
            alert('Selling price must be greater than or equal to cost price');
            return;
        }

        const newItem = {
            id: Date.now(),
            name,
            code: code || null,  // Store as null if empty
            quantity,
            costPrice,
            sellingPrice
        };
        
        this.inventory.push(newItem);
        this.saveInventory();
        this.renderInventory();
        
        this.addForm.reset();
        this.addModal.style.display = 'none';

        // Add activity
        this.addActivity('inventory', `Added new item: ${name}`);
    }

    handleItemClick(e) {
        const itemElement = e.target.closest('.inventory-item');
        if (!itemElement) return;

        const deleteBtn = e.target.closest('.delete-btn');
        if (deleteBtn) {
            const id = Number(itemElement.dataset.id);
            this.handleDeleteItem(id);
            return;
        }

        const field = e.target.closest('.editable');
        if (!field) return;

        // If already editing, don't do anything
        if (itemElement.querySelector('input')) return;

        const id = Number(itemElement.dataset.id);
        const item = this.inventory.find(i => i.id === id);
        if (!item) return;

        const fieldType = field.dataset.field;
        const currentValue = item[fieldType];
        let inputType = 'text';
        
        if (['quantity'].includes(fieldType)) {
            inputType = 'number';
        } else if (['costPrice', 'sellingPrice'].includes(fieldType)) {
            inputType = 'number';
        }

        const input = document.createElement('input');
        input.type = inputType;
        input.value = currentValue || '';
        input.className = 'inline-edit';
        
        if (['costPrice', 'sellingPrice'].includes(fieldType)) {
            input.step = '0.01';
            input.min = '0';
        } else if (fieldType === 'quantity') {
            input.min = '0';
        }

        input.addEventListener('blur', () => this.handleItemBlur(input, id, fieldType));
        input.addEventListener('keypress', (e) => {
            if (e.key === 'Enter') input.blur();
        });

        field.innerHTML = '';
        field.appendChild(input);
        input.focus();
        input.select();
    }

    handleItemBlur(input, id, field) {
        let value = input.value.trim();
        const item = this.inventory.find(i => i.id === id);
        if (!item) return;

        if (field === 'name' && !value) {
            value = item.name;  // Revert to original if empty
        } else if (field === 'code') {
            value = value || null;  // Store as null if empty
        } else if (field === 'quantity') {
            value = Math.max(0, parseInt(value) || 0);
        } else if (field === 'costPrice' || field === 'sellingPrice') {
            value = Math.max(0, parseFloat(value) || 0);
        }

        // Validate selling price >= cost price
        if (field === 'sellingPrice' && value < item.costPrice) {
            alert('Selling price must be greater than or equal to cost price');
            value = item.sellingPrice;
        } else if (field === 'costPrice' && value > item.sellingPrice) {
            alert('Cost price must be less than or equal to selling price');
            value = item.costPrice;
        }

        item[field] = value;
        this.saveInventory();
        this.renderInventory();

        // Add activity
        this.addActivity('inventory', `Updated ${field} for item: ${item.name}`);
    }

    handleDeleteItem(id) {
        const item = this.inventory.find(i => i.id === id);
        if (item && confirm(`Are you sure you want to delete "${item.name}"?`)) {
            this.inventory = this.inventory.filter(i => i.id !== id);
            this.saveInventory();
            this.renderInventory();

            // Add activity
            this.addActivity('inventory', `Deleted item: ${item.name}`);
        }
    }

    handleSearch() {
        this.renderInventory();
    }

    saveInventory() {
        localStorage.setItem('inventory', JSON.stringify(this.inventory));
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

    formatCurrency(amount) {
        return '₹' + amount.toFixed(2);
    }

    renderInventory() {
        this.inventoryList.innerHTML = '';
        const searchTerm = this.inventorySearch.value.toLowerCase();
        
        const filteredInventory = this.inventory.filter(item => 
            item.name.toLowerCase().includes(searchTerm) ||
            (item.code && item.code.toLowerCase().includes(searchTerm))
        );
        
        filteredInventory.forEach(item => {
            const itemElement = document.createElement('div');
            itemElement.className = 'inventory-item';
            itemElement.dataset.id = item.id;
            
            itemElement.innerHTML = `
                <div class="item-info">
                    <span class="item-name editable" data-field="name">${item.name}</span>
                    ${item.code ? `<span class="item-code editable" data-field="code">${item.code}</span>` : ''}
                </div>
                <div class="item-details">
                    <span class="item-quantity editable" data-field="quantity">${item.quantity}</span>
                    <span class="item-price editable" data-field="costPrice">${this.formatCurrency(item.costPrice)}</span>
                    <span class="item-price editable" data-field="sellingPrice">${this.formatCurrency(item.sellingPrice)}</span>
                    <button class="delete-btn"><i class="fas fa-trash"></i></button>
                </div>
            `;
            
            this.inventoryList.appendChild(itemElement);
        });
    }
}

// Initialize the inventory manager when the DOM is loaded
document.addEventListener('DOMContentLoaded', () => {
    new InventoryManager();
    
    // Check for pending actions
    if (sessionStorage.getItem('pendingAction') === 'openFAB') {
        sessionStorage.removeItem('pendingAction');
        const addButton = document.querySelector('.floating-action-button');
        if (addButton) {
            addButton.click();
        }
    }
});

function checkInventoryAvailability(itemId, requestedQuantity) {
    const inventory = JSON.parse(localStorage.getItem('inventory') || '[]');
    const item = inventory.find(item => item.id === itemId);
    
    if (!item) {
        return false;
    }
    
    return item.quantity >= requestedQuantity;
}

// Export for use in invoices.js
window.checkInventoryAvailability = checkInventoryAvailability;
