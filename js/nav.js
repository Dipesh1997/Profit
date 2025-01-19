// Navigation Component
class Navigation {
    // Define states at class level
    static STATES = {
        INIT: 'init',
        CREATING_INVOICE: 'creating_invoice',
        ADDING_ITEMS: 'adding_items',
        FINISHING: 'finishing'
    };

    constructor() {
        this.createNavigation();
        this.setupEventListeners();
        this.highlightCurrentPage();
        this.setupVoiceRecognition();
        // Initialize command state
        this.commandState = Navigation.STATES.INIT;
    }

    createNavigation() {
        const nav = document.createElement('nav');
        nav.className = 'bottom-nav';
        
        const navItems = [
            { path: 'dashboard', icon: 'tachometer-alt', text: 'Dashboard' },
            { path: 'profit-rankings', icon: 'trophy', text: 'Profit Rankings' },
            { path: 'recent-activities', icon: 'history', text: 'Recent Activities' },
            { path: 'settings', icon: 'cog', text: 'Settings' }
        ];
        
        nav.innerHTML = `
            ${navItems.map(item => `
                <a href="../pages/${item.path}.html" class="nav-item" data-page="${item.path}">
                    <i class="fas fa-${item.icon}"></i>
                    <span>${item.text}</span>
                </a>
            `).join('')}
            <button class="nav-item mic-button" id="micButton">
                <i class="fas fa-microphone"></i>
                <span>Voice</span>
            </button>
        `;

        document.body.appendChild(nav);
    }

    setupEventListeners() {
        document.querySelectorAll('.nav-item').forEach(item => {
            item.addEventListener('click', (e) => {
                document.querySelectorAll('.nav-item').forEach(nav => nav.classList.remove('active'));
                item.classList.add('active');
            });
        });
    }

    setupVoiceRecognition() {
        if (!('webkitSpeechRecognition' in window)) {
            console.warn('Speech recognition not supported');
            return;
        }

        this.recognition = new webkitSpeechRecognition();
        this.recognition.continuous = true;
        this.recognition.interimResults = true;
        this.recognition.lang = 'en-US';
        this.isProcessingCommand = false;

        const micButton = document.getElementById('micButton');
        const formMicButton = document.getElementById('formMicButton');
        let isListening = false;

        // Create loading overlay
        const loadingOverlay = document.createElement('div');
        loadingOverlay.className = 'loading-overlay';
        loadingOverlay.innerHTML = `
            <div class="loading-content">
                <div class="spinner"></div>
                <div class="processing-text">Processing...</div>
                <div class="command-status">Listening...</div>
                <div class="live-command"></div>
                <div class="next-command-hint"></div>
            </div>
        `;
        document.body.appendChild(loadingOverlay);

        // Helper function to start listening
        const startListening = () => {
            this.recognition.start();
            const activeButton = document.querySelector('.mic-button.listening');
            if (activeButton) {
                activeButton.querySelector('i').classList.remove('fa-microphone');
                activeButton.querySelector('i').classList.add('fa-microphone-slash');
            }
            loadingOverlay.style.display = 'flex';
            isListening = true;
        };

        // Helper function to stop listening
        const stopListening = () => {
            this.recognition.stop();
            const activeButton = document.querySelector('.mic-button.listening');
            if (activeButton) {
                activeButton.querySelector('i').classList.remove('fa-microphone-slash');
                activeButton.querySelector('i').classList.add('fa-microphone');
                activeButton.classList.remove('listening');
            }
            this.hideVoiceHelper();
            loadingOverlay.style.display = 'none';
            isListening = false;
        };

        micButton.addEventListener('click', () => {
            if (!isListening) {
                startListening();
                
                // Show voice command helper
                this.showVoiceHelper('Start by saying:\n' +
                    '"Create invoice for [customer name]"');
            } else {
                stopListening();
            }
        });

        // Add form mic button handler
        if (formMicButton) {
            formMicButton.addEventListener('click', () => {
                if (!isListening) {
                    formMicButton.classList.add('listening');
                    startListening();
                    // Show helper for adding items
                    document.querySelector('.command-status').textContent = 'Listening for items...';
                    document.querySelector('.next-command-hint').textContent = 
                        'Say "Add [quantity] [product name] to invoice"';
                } else {
                    stopListening();
                }
            });
        }

        // Add interim results handler
        this.recognition.onresult = async (event) => {
            const liveCommand = document.querySelector('.live-command');
            const commandStatus = document.querySelector('.command-status');
            const nextCommandHint = document.querySelector('.next-command-hint');
            
            // Show interim results
            for (let i = event.resultIndex; i < event.results.length; i++) {
                const transcript = event.results[i][0].transcript.toLowerCase();
                liveCommand.textContent = transcript;
                
                // If this is a final result and not currently processing a command
                if (event.results[i].isFinal && !this.isProcessingCommand && 
                    (transcript.includes('create invoice for') || 
                    /^add\s+[a-zA-Z\s]+$/i.test(transcript) ||
                    transcript.includes('finish invoice'))) {
                    
                    // Process command immediately
                    const normalizedTranscript = transcript.replace(/^at\s+/i, 'add ');
                    await this.handleVoiceCommand(normalizedTranscript);
                    
                    // Restart recognition if it stopped
                    if (!this.recognition.recognizing) {
                        this.recognition.start();
                    }
                }
            }
        };

        this.recognition.onend = () => {
            // Only stop if we're done with the invoice or user clicked stop
            if (this.commandState === Navigation.STATES.INIT || !isListening) {
            micButton.querySelector('i').classList.remove('fa-microphone-slash');
            micButton.querySelector('i').classList.add('fa-microphone');
            micButton.classList.remove('listening');
            isListening = false;
                this.hideVoiceHelper();
                document.querySelector('.live-command').textContent = '';
                document.querySelector('.command-status').textContent = 'Listening...';
                document.querySelector('.next-command-hint').textContent = '';
            } else {
                // Restart recognition to keep listening
                this.recognition.start();
            }
        };
    }

    showVoiceHelper(text) {
        let helper = document.getElementById('voiceHelper');
        if (!helper) {
            helper = document.createElement('div');
            helper.id = 'voiceHelper';
            helper.className = 'voice-helper';
            document.body.appendChild(helper);
        }
        helper.textContent = text;
        helper.style.display = 'block';
    }

    hideVoiceHelper() {
        const helper = document.getElementById('voiceHelper');
        if (helper) {
            helper.style.display = 'none';
        }
    }

    async handleVoiceCommand(command) {
        const loadingOverlay = document.querySelector('.loading-overlay');
        const processingText = document.querySelector('.processing-text');
        const commandStatus = document.querySelector('.command-status');
        const inventory = JSON.parse(localStorage.getItem('inventory')) || [];
        const customers = JSON.parse(localStorage.getItem('customers')) || [];

        // Check if we're already on invoice page with open form
        const isInvoiceFormOpen = document.getElementById('addInvoiceModal') && 
            document.getElementById('addInvoiceModal').style.display === 'block';
        
        // If form is open, set state to adding items
        if (isInvoiceFormOpen && this.commandState === Navigation.STATES.INIT) {
            this.commandState = Navigation.STATES.ADDING_ITEMS;
            this.currentInvoice = this.currentInvoice || {
                items: [],
                taxRate: 0,
                discountAmount: 0
            };
        }

        // Handle simple add product command
        if (/^add\s+[a-zA-Z\s]+$/i.test(command)) {
            if (this.commandState !== Navigation.STATES.ADDING_ITEMS) {
                if (!isInvoiceFormOpen) {
                    commandStatus.textContent = 'Please create an invoice first';
                    document.querySelector('.next-command-hint').textContent = 
                        'Say "Create invoice for [customer name]"';
                }
                return;
            }

            // Extract product name and find item immediately
            const productName = command.match(/^add\s+([a-zA-Z\s]+)$/i)[1].trim();

            // Click add item button and update immediately
            const addItemBtn = document.getElementById('addItemToInvoice');
            if (addItemBtn) {
                addItemBtn.click();
                
                // Get the new row and update it immediately
                const itemRows = document.querySelectorAll('.invoice-item-row');
                const lastRow = itemRows[itemRows.length - 1];
                
                if (lastRow) {
                    const itemSelect = lastRow.querySelector('select');
                    const quantityInput = lastRow.querySelector('input[type="number"]');
                    
                    if (itemSelect) {
                        // Find the option with the matching product
                        const option = Array.from(itemSelect.options).find(opt => 
                            opt.text.toLowerCase().includes(productName.toLowerCase())
                        );
                        
                        if (option) {
                            // Get the price and ID from the option's data attributes
                            const price = parseFloat(option.dataset.price);
                            const itemId = option.value;
                            
                            // Set the selected option
                            itemSelect.value = itemId;
                            itemSelect.dispatchEvent(new Event('change'));
                            
                            // Wait for price to be updated in the form
                            setTimeout(() => {
                                // Get the price input if it exists
                                const priceInput = lastRow.querySelector('.item-selling-price');
                                if (priceInput) {
                                    const actualPrice = parseFloat(priceInput.value);
                                    const total = actualPrice * 1; // quantity is 1
                                
                                    // Update invoice data with correct price
                                    this.currentInvoice.items.push({
                                        id: itemId,
                                        name: option.text,
                                        quantity: 1,
                                        price: actualPrice,
                                        total: total
                                    });
                                }
                            }, 100);
                        }
                        else {
                            commandStatus.textContent = `Product "${productName}" not found`;
                            return;
                        }
                    }
                    
                    if (quantityInput) {
                        quantityInput.value = '1';
                        quantityInput.dispatchEvent(new Event('change'));
                    }

                    // Update UI feedback immediately
                    commandStatus.textContent = `Added ${productName}`;
                    document.querySelector('.next-command-hint').textContent = 
                        'Say "Add [product name]" or "Finish invoice"';
                }
            }
            return;
        }

        // Helper function to simulate form filling
        const simulateFormFilling = async (action, data) => {
            return new Promise(async (resolve) => {
                // If we're not on the invoices page, navigate there first
                if (!document.getElementById('addInvoiceModal')) {
                    window.location.href = 'invoices.html';
                    // Wait for page load
                    await new Promise(r => setTimeout(r, 3000)); // Increase initial wait time
                }

                let modal = document.getElementById('addInvoiceModal');
                if (!modal) {
                    // Wait a bit longer and try again
                    await new Promise(r => setTimeout(r, 1000));
                    const retryModal = document.getElementById('addInvoiceModal');
                    if (!retryModal) {
                        // One more retry with longer wait
                        await new Promise(r => setTimeout(r, 2000));
                        modal = document.getElementById('addInvoiceModal');
                        if (!modal) {
                            console.error('Modal not found after retries');
                            return resolve();
                        }
                    }
                    modal = retryModal;
                }

                // Ensure the modal is visible and initialized
                modal.style.display = 'block';
                await new Promise(r => setTimeout(r, 500));

                switch(action) {
                    case 'create':
                        // Wait for customer select to be available
                        let attempts = 0;
                        let customerSelect;
                        while (!customerSelect && attempts < 10) {
                            customerSelect = document.getElementById('customerSelect');
                            if (!customerSelect) {
                                await new Promise(r => setTimeout(r, 500));
                                attempts++;
                            }
                        }

                        if (customerSelect) {
                            // Wait for options to be populated
                            await new Promise(r => setTimeout(r, 500));
                            customerSelect.value = data.customerId;
                            customerSelect.dispatchEvent(new Event('change'));
                            await new Promise(r => setTimeout(r, 1000));
                            
                            // Ensure the form is ready for items
                            const addItemBtn = document.getElementById('addItemToInvoice');
                            if (!addItemBtn) {
                                await new Promise(r => setTimeout(r, 1000));
                            }
                            
                            // Clear any error messages
                            document.querySelector('.command-status').textContent = 'Listening for items...';
                            document.querySelector('.next-command-hint').textContent = 
                                'Say "Add [product name]"';
                            
                            // Wait for form to be fully initialized
                            await new Promise(r => setTimeout(r, 1500));
                        } else {
                            console.error('Customer select not found');
                            return resolve();
                        }
                        break;

                    case 'add_item':
                        // Ensure we're on the right page and form is ready
                        if (!document.getElementById('addInvoiceModal')) {
                            console.error('Form not ready for adding items');
                            return resolve();
                        }

                        console.log('Starting add item simulation');
                        const addItemBtn = document.getElementById('addItemToInvoice');
                        if (addItemBtn) {
                            // Only click add item if not updating
                            if (!data.updateOnly) {
                                addItemBtn.click();
                                await new Promise(r => setTimeout(r, 2000));
                            }

                            const itemRows = document.querySelectorAll('.invoice-item-row');
                            // Get the last row or the row with matching product if updating
                            const lastRow = data.updateOnly ? 
                                Array.from(itemRows).find(row => {
                                    const select = row.querySelector('select');
                                    return select && select.options[select.selectedIndex].text === data.productName;
                                }) :
                                itemRows[itemRows.length - 1];

                            if (lastRow) {
                                // Get the first select element in the row (product select)
                                const itemSelect = lastRow.querySelector('select');
                                const quantityInput = lastRow.querySelector('input[type="number"]');

                                console.log('Found form elements:', {
                                    itemSelect: !!itemSelect,
                                    quantityInput: !!quantityInput
                                });

                                if (itemSelect) {
                                    // Wait for options to be populated
                                    await new Promise(r => setTimeout(r, 1500));
                                    
                                    // Log all available options for debugging
                                    console.log('Available options:', Array.from(itemSelect.options).map(opt => ({
                                        value: opt.value,
                                        text: opt.text
                                    })));

                                    // Find the matching product option
                                    const productOption = Array.from(itemSelect.options).find(opt => 
                                        opt.text.toLowerCase() === data.productName.toLowerCase()
                                    );

                                    if (productOption) {
                                        console.log('Found product option:', productOption.text);
                                        // Set the value first
                                        itemSelect.value = productOption.value;
                                        // Then set the selected index
                                        itemSelect.selectedIndex = productOption.index;
                                        // Trigger events
                                        itemSelect.dispatchEvent(new Event('change'));
                                        itemSelect.dispatchEvent(new Event('input'));
                                        // Add custom event for good measure
                                        itemSelect.dispatchEvent(new CustomEvent('select-updated', {
                                            bubbles: true,
                                            detail: { value: productOption.value }
                                        }));
                                        await new Promise(r => setTimeout(r, 500));
                                    } else {
                                        console.error('No matching option found for product:', data.productName);
                                        console.log('Available products:', Array.from(itemSelect.options)
                                            .map(opt => opt.text)
                                            .filter(text => text)
                                            .join(', '));
                                    }
                                }

                                if (quantityInput) {
                                    // Clear the input first
                                    quantityInput.value = '';
                                    await new Promise(r => setTimeout(r, 100));
                                    
                                    // Set quantity to the specified value
                                    quantityInput.value = data.quantity.toString();
                                    quantityInput.setAttribute('value', data.quantity.toString());
                                    // Force the value using JavaScript property
                                    Object.getOwnPropertyDescriptor(
                                        HTMLInputElement.prototype, 'value'
                                    ).set.call(quantityInput, data.quantity.toString());
                                    // Trigger multiple events to ensure change is registered
                                    quantityInput.dispatchEvent(new Event('input'));
                                    quantityInput.dispatchEvent(new Event('change'));
                                    quantityInput.dispatchEvent(new Event('keyup'));
                                    quantityInput.dispatchEvent(new Event('blur'));
                                    await new Promise(r => setTimeout(r, 500));
                                }

                                // Wait for updates to complete
                                await new Promise(r => setTimeout(r, 1000));

                                // Update any price or total calculations
                                const event = new Event('change', {
                                    bubbles: true,
                                    cancelable: true
                                });
                                itemSelect.dispatchEvent(event);
                                quantityInput.dispatchEvent(event);

                                console.log('Final values:', {
                                    selectedItem: itemSelect.value,
                                    quantity: quantityInput.value,
                                    productName: data.productName
                                });
                            }
                            // Update status message
                            document.querySelector('.command-status').textContent = 
                                data.updateOnly ? 
                                `Updated quantity to ${data.quantity} ${data.productName}` :
                                `Added ${data.quantity} ${data.productName} to invoice`;
                            document.querySelector('.next-command-hint').textContent = 
                                'Say "Add [product name]" or "Finish invoice"';
                        }
                        break;

                    case 'finish':
                        const submitBtn = document.querySelector('#addInvoiceForm button[type="submit"]');
                        if (submitBtn) {
                            submitBtn.click();
                            await new Promise(r => setTimeout(r, 1000));
                        }
                        break;
                }
                resolve();
            });
        };

        // Helper function to convert word numbers to digits
        const wordToNumber = (word) => {
            const numbers = {
                'zero': 0, 'one': 1, 'two': 2, 'three': 3, 'four': 4,
                'five': 5, 'six': 6, 'seven': 7, 'eight': 8, 'nine': 9,
                'ten': 10, 'eleven': 11, 'twelve': 12, 'thirteen': 13,
                'fourteen': 14, 'fifteen': 15, 'sixteen': 16,
                'seventeen': 17, 'eighteen': 18, 'nineteen': 19,
                'twenty': 20, 'thirty': 30, 'forty': 40, 'fifty': 50,
                'sixty': 60, 'seventy': 70, 'eighty': 80, 'ninety': 90
            };
            return numbers[word.toLowerCase()] || parseInt(word) || word;
        };

        // Convert number words to digits in the command
        const convertNumbersInCommand = (cmd) => {
            const words = cmd.split(' ');
            return words.map(word => {
                const number = wordToNumber(word);
                return typeof number === 'number' ? number : word;
            }).join(' ');
        };

        console.log('Voice command:', command);
        command = convertNumbersInCommand(command);
        
        try {
            // Load necessary data
            const customers = JSON.parse(localStorage.getItem('customers')) || [];
            const inventory = JSON.parse(localStorage.getItem('inventory')) || [];
            
            // Create invoice command
            if (command.includes('create invoice for')) {
                if (this.commandState !== Navigation.STATES.INIT) {
                    document.querySelector('.next-command-hint').textContent = 
                        'Say "Add [product name]"';
                    return;
                }
                this.commandState = Navigation.STATES.CREATING_INVOICE;
                processingText.textContent = 'Setting up invoice...';
                commandStatus.textContent = 'Creating new invoice...';

                const customerName = command.split('create invoice for')[1].trim();
                const customer = customers.find(c => 
                    c.name.toLowerCase().includes(customerName.toLowerCase())
                );

                if (customer) {
                    this.currentInvoice = {
                        customerId: customer.id,
                        customerName: customer.name,
                        items: [],
                        taxRate: 0,
                        discountAmount: 0
                    };

                    try {
                        await simulateFormFilling('create', { 
                            customerId: customer.id 
                        });
                        console.log('Form filled successfully');
                        this.hideVoiceHelper();
                        this.commandState = Navigation.STATES.ADDING_ITEMS;
                        
                        processingText.textContent = 'Ready for items';
                        commandStatus.textContent = 'Listening for items...';
                        document.querySelector('.next-command-hint').textContent = 
                            'Say "Add [product name]"';
                        
                        // Restart recognition to ensure we catch the next command
                        if (!this.recognition.recognizing) {
                            this.recognition.start();
                        }
                    } catch (error) {
                        console.error('Error filling form:', error);
                        commandStatus.textContent = 'Error setting up invoice. Please try again.';
                        this.commandState = Navigation.STATES.INIT;
                    }
        } else {
                    commandStatus.textContent = `Customer "${customerName}" not found. Please try again.`;
                    this.commandState = Navigation.STATES.INIT;
                }
            }
            
            // Add item to invoice
            else if (this.commandState !== Navigation.STATES.ADDING_ITEMS) {
                commandStatus.textContent = 'Please create an invoice first';
                document.querySelector('.next-command-hint').textContent = 
                    'Say "Add [product name]"';
                return;
            }
            
            // Set tax rate
            else if (command.includes('set tax')) {
                if (!this.currentInvoice) {
                    this.showVoiceHelper('Please create an invoice first');
                    return;
                }

                const taxRate = parseFloat(command.split('set tax')[1]);
                if (!isNaN(taxRate)) {
                    this.currentInvoice.taxRate = taxRate;
                    this.showVoiceHelper(`Tax rate set to ${taxRate}%`);
                }
            }
            
            // Apply discount
            else if (command.includes('apply discount')) {
                if (!this.currentInvoice) {
                    this.showVoiceHelper('Please create an invoice first');
                    return;
                }

                const discount = parseFloat(command.split('apply discount')[1]);
                if (!isNaN(discount)) {
                    this.currentInvoice.discountAmount = discount;
                    this.showVoiceHelper(`Discount of ₹${discount} applied`);
                }
            }
            
            // Finish invoice
            else if (command.includes('finish invoice')) {
                if (this.commandState !== Navigation.STATES.ADDING_ITEMS) {
                    this.showVoiceHelper('Please create an invoice and add items first');
                    return;
                }
                this.commandState = Navigation.STATES.FINISHING;

                processingText.textContent = 'Finalizing invoice...';
                commandStatus.textContent = 'Finalizing invoice...';
                if (!this.currentInvoice || !this.currentInvoice.items.length) {
                    this.showVoiceHelper('No items in invoice. Please add items first.');
                    return;
                }

                try {
                    // Get all form elements
                    const form = document.getElementById('addInvoiceForm');
                    const itemRows = form.querySelectorAll('.invoice-item-row');
                    const taxRateInput = document.getElementById('taxRate');
                    const discountInput = document.getElementById('discountAmount');
                    
                    // Recalculate items from the actual form values
                    this.currentInvoice.items = [];
                    
                    // Get items from form rows
                    itemRows.forEach(row => {
                        const select = row.querySelector('select');
                        const quantityInput = row.querySelector('input[type="number"]');
                        const priceCell = row.querySelector('.item-price');
                        const totalCell = row.querySelector('.item-total');
                        
                        if (select && quantityInput && priceCell && totalCell) {
                            const selectedOption = select.options[select.selectedIndex];
                            const itemId = select.value;
                            const name = selectedOption.text;
                            const quantity = parseInt(quantityInput.value);
                            const price = parseFloat(priceCell.textContent.replace(/[^0-9.-]+/g, ''));
                            const total = parseFloat(totalCell.textContent.replace(/[^0-9.-]+/g, ''));
                            
                            if (itemId && quantity && price) {
                                this.currentInvoice.items.push({
                                    id: itemId,
                                    name: name,
                                    quantity: quantity,
                                    price: price,
                                    total: total
                                });
                                console.log('Added item with price:', {
                                    name,
                                    price,
                                    total,
                                    quantity
                                });
                            }
                        }
                    });

                    // Get values from form elements
                    const subtotalElement = document.getElementById('invoiceSubtotal');
                    const taxElement = document.getElementById('invoiceTax');
                    const totalElement = document.getElementById('invoiceTotal');
                    
                    const subtotal = parseFloat(subtotalElement.textContent.replace(/[^0-9.-]+/g, ''));
                    const taxRate = parseFloat(taxRateInput.value) || 0;
                    const discountAmount = parseFloat(discountInput.value) || 0;
                    const tax = parseFloat(taxElement.textContent.replace(/[^0-9.-]+/g, ''));
                    const total = parseFloat(totalElement.textContent.replace(/[^0-9.-]+/g, ''));

                    // Calculate cost and profit
                    let totalCostPrice = 0;
                    this.currentInvoice.items.forEach(item => {
                        const inventoryItem = inventory.find(i => i.id === item.id);
                        if (inventoryItem) {
                            const itemCost = inventoryItem.costPrice * item.quantity;
                            totalCostPrice += itemCost;
                        }
                    });

                    const profit = total - totalCostPrice;

                    // Create final invoice object
                    const invoiceData = {
                        ...this.currentInvoice,
                        id: Date.now(),
                        subtotal,
                        taxRate,
                        discountAmount,
                        tax,
                        total,
                        profit,
                        costPrice: totalCostPrice,
                        date: new Date().toISOString()
                    };

                    // Trigger form's native calculation method if it exists
                    const calculateTotals = form.calculateTotals || form.calculate;
                    if (typeof calculateTotals === 'function') {
                        calculateTotals.call(form);
                    }

                    // Save invoice
                    const invoices = JSON.parse(localStorage.getItem('invoices')) || [];
                    invoices.push(invoiceData);
                    localStorage.setItem('invoices', JSON.stringify(invoices));

                    // Update inventory quantities
                    this.currentInvoice.items.forEach(item => {
                        const inventoryItem = inventory.find(i => i.id === item.id);
                        if (inventoryItem) {
                            inventoryItem.quantity -= item.quantity;
                        }
                    });
                    localStorage.setItem('inventory', JSON.stringify(inventory));

                    // Click the submit button to trigger form submission
                    const submitButton = form.querySelector('button[type="submit"]');
                    if (submitButton) {
                        submitButton.click();
                    }

                    // Add activity and clean up
                    this.addActivity('invoice', `Created voice invoice for ${this.currentInvoice.customerName}`);
                    this.currentInvoice = null;
                    this.showVoiceHelper('Invoice created successfully! Voice commands stopped.');
                    document.querySelector('.next-command-hint').textContent = '';

                    setTimeout(() => {
                        commandStatus.textContent = 'Invoice created! Redirecting...';
                        window.location.href = '../pages/invoices.html';
                    }, 1000);

                    // Reset command state after finishing
                    this.commandState = Navigation.STATES.INIT;
                } catch (error) {
                    console.error('Error finalizing invoice:', error);
                    commandStatus.textContent = 'Error creating invoice. Please try again.';
                    this.commandState = Navigation.STATES.ADDING_ITEMS;
                }
            }
            
            // Navigation commands (existing)
            else if (command.includes('go to') || command.includes('open')) {
                if (command.includes('dashboard')) window.location.href = '../pages/dashboard.html';
                else if (command.includes('inventory')) window.location.href = '../pages/inventory.html';
                else if (command.includes('invoices')) window.location.href = '../pages/invoices.html';
                else if (command.includes('customers')) window.location.href = '../pages/customers.html';
                else if (command.includes('settings')) window.location.href = '../pages/settings.html';
            }
        } catch (error) {
            console.error('Error processing voice command:', error);
            commandStatus.textContent = 'Error occurred. Please try again.';
            document.querySelector('.next-command-hint').textContent = 
                'Say your last command again';
        } finally {
            // Keep overlay visible while listening for next command
            if (this.commandState === Navigation.STATES.INIT) {
                loadingOverlay.style.display = 'none';
            }
        }
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

    highlightCurrentPage() {
        const currentPage = window.location.pathname.split('/').pop().replace('.html', '');
        const navItem = document.querySelector(`[data-page="${currentPage}"]`);
        if (navItem) {
            navItem.classList.add('active');
        }
    }

    // Helper method to convert word numbers to digits
    convertWordToNumber(word) {
        const wordMap = {
            'one': 1, 'two': 2, 'three': 3, 'four': 4, 'five': 5,
            'six': 6, 'seven': 7, 'eight': 8, 'nine': 9, 'ten': 10
        };
        return wordMap[word.toLowerCase()] || parseInt(word);
    }

    // Helper method to update item quantity
    async updateItemQuantity(productName, quantity) {
        const inventory = JSON.parse(localStorage.getItem('inventory')) || [];
        const item = inventory.find(i => 
            i.name.toLowerCase().includes(productName.toLowerCase())
        );

        if (item && item.quantity >= quantity) {
            try {
                await simulateFormFilling('add_item', {
                    itemId: item.id,
                    quantity: quantity,
                    productName: item.name,
                    updateOnly: true
                });
                
                // Update the current invoice item
                const invoiceItem = this.currentInvoice.items.find(i => i.name === item.name);
                if (invoiceItem) {
                    invoiceItem.quantity = quantity;
                    invoiceItem.total = quantity * item.sellingPrice;
                }
                
                document.querySelector('.command-status').textContent = 
                    `Updated quantity to ${quantity} ${item.name}`;
            } catch (error) {
                console.error('Error updating quantity:', error);
                document.querySelector('.command-status').textContent = 
                    'Error updating quantity. Please try again.';
            }
        }
    }
}

// Initialize navigation when DOM is loaded
document.addEventListener('DOMContentLoaded', () => {
    new Navigation();
});

// Add styles for voice helper
const style = document.createElement('style');
style.textContent = `
    .voice-helper {
        position: fixed;
        top: 50%;
        left: 50%;
        transform: translate(-50%, -50%);
        background: rgba(0, 0, 0, 0.8);
        color: white;
        padding: 20px;
        border-radius: 10px;
        z-index: 1000;
        white-space: pre-line;
        text-align: center;
        display: none;
    }

    .loading-overlay {
        display: none;
        position: fixed;
        top: 0;
        left: 0;
        width: 100%;
        height: 100%;
        background: rgba(0, 0, 0, 0.8);
        justify-content: center;
        align-items: center;
        z-index: 1001;
    }

    .loading-content {
        text-align: center;
        color: white;
        padding: 20px;
        background: rgba(0, 0, 0, 0.9);
        border-radius: 15px;
        min-width: 300px;
    }

    .spinner {
        width: 50px;
        height: 50px;
        border: 5px solid #f3f3f3;
        border-top: 5px solid #3498db;
        border-radius: 50%;
        animation: spin 1s linear infinite;
        margin: 0 auto 20px;
    }

    .processing-text {
        font-size: 1.2em;
        margin-bottom: 10px;
    }

    .command-status {
        font-size: 1em;
        color: #3498db;
        margin-bottom: 10px;
    }

    .live-command {
        font-size: 1.1em;
        color: #2ecc71;
        font-style: italic;
        min-height: 1.5em;
        margin-top: 10px;
        padding: 5px 10px;
        background: rgba(0, 0, 0, 0.3);
        border-radius: 5px;
    }

    .next-command-hint {
        font-size: 1em;
        color: #f1c40f;
        margin-top: 15px;
        font-style: italic;
    }

    @keyframes spin {
        0% { transform: rotate(0deg); }
        100% { transform: rotate(360deg); }
    }
`;
document.head.appendChild(style);
