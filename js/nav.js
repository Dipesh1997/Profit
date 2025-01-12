// Navigation Component
class Navigation {
    constructor() {
        this.createNavigation();
        this.setupEventListeners();
        this.highlightCurrentPage();
        this.setupVoiceRecognition();
    }

    createNavigation() {
        const nav = document.createElement('nav');
        nav.className = 'bottom-nav';
        
        nav.innerHTML = `
            <a href="../pages/dashboard.html" class="nav-item" data-page="dashboard">
                <i class="fas fa-chart-line"></i>
                <span>Dashboard</span>
            </a>
            <a href="../pages/inventory.html" class="nav-item" data-page="inventory">
                <i class="fas fa-box"></i>
                <span>Inventory</span>
            </a>
            <a href="../pages/invoices.html" class="nav-item" data-page="invoices">
                <i class="fas fa-file-invoice"></i>
                <span>Invoices</span>
            </a>
            <a href="../pages/customers.html" class="nav-item" data-page="customers">
                <i class="fas fa-users"></i>
                <span>Customers</span>
            </a>
            <a href="../pages/settings.html" class="nav-item" data-page="settings">
                <i class="fas fa-cog"></i>
                <span>Settings</span>
            </a>
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
        this.recognition.continuous = false;
        this.recognition.interimResults = false;
        this.recognition.lang = 'en-US';

        const micButton = document.getElementById('micButton');
        let isListening = false;

        micButton.addEventListener('click', () => {
            if (!isListening) {
                this.recognition.start();
                micButton.querySelector('i').classList.remove('fa-microphone');
                micButton.querySelector('i').classList.add('fa-microphone-slash');
                micButton.classList.add('listening');
            } else {
                this.recognition.stop();
                micButton.querySelector('i').classList.remove('fa-microphone-slash');
                micButton.querySelector('i').classList.add('fa-microphone');
                micButton.classList.remove('listening');
            }
            isListening = !isListening;
        });

        this.recognition.onresult = (event) => {
            const command = event.results[0][0].transcript.toLowerCase();
            this.handleVoiceCommand(command);
        };

        this.recognition.onend = () => {
            micButton.querySelector('i').classList.remove('fa-microphone-slash');
            micButton.querySelector('i').classList.add('fa-microphone');
            micButton.classList.remove('listening');
            isListening = false;
        };
    }

    handleVoiceCommand(command) {
        // Navigation commands
        if (command.includes('go to') || command.includes('open')) {
            if (command.includes('dashboard')) window.location.href = '../pages/dashboard.html';
            else if (command.includes('inventory')) window.location.href = '../pages/inventory.html';
            else if (command.includes('invoices')) window.location.href = '../pages/invoices.html';
            else if (command.includes('customers')) window.location.href = '../pages/customers.html';
            else if (command.includes('settings')) window.location.href = '../pages/settings.html';
        }
        // Add item command
        else if (command.includes('add item') || command.includes('new item')) {
            this.openActionPopup('inventory');
        }
        // Add customer command
        else if (command.includes('add customer') || command.includes('new customer')) {
            this.openActionPopup('customer');
        }
        // Create invoice command
        else if (command.includes('create invoice') || command.includes('new invoice')) {
            this.openActionPopup('invoice');
        }
    }

    openActionPopup(type) {
        // Get current page
        const currentPage = window.location.pathname.split('/').pop().replace('.html', '');
        
        const clickActionButton = () => {
            const addButton = document.querySelector('.floating-action-button');
            if (addButton) {
                addButton.click();
            }
        };

        // If we're already on the correct page, click the action button directly
        if ((type === 'inventory' && currentPage === 'inventory') ||
            (type === 'customer' && currentPage === 'customers') ||
            (type === 'invoice' && currentPage === 'invoices')) {
            clickActionButton();
        } else {
            // Navigate to the correct page and then click the action button
            let targetPage;
            switch(type) {
                case 'inventory':
                    targetPage = '../pages/inventory.html';
                    break;
                case 'customer':
                    targetPage = '../pages/customers.html';
                    break;
                case 'invoice':
                    targetPage = '../pages/invoices.html';
                    break;
            }
            
            // Store the command in sessionStorage
            sessionStorage.setItem('pendingAction', 'openFAB');
            window.location.href = targetPage;
        }
    }

    highlightCurrentPage() {
        const currentPage = window.location.pathname.split('/').pop().replace('.html', '');
        const navItem = document.querySelector(`[data-page="${currentPage}"]`);
        if (navItem) {
            navItem.classList.add('active');
        }
    }
}

// Initialize navigation when DOM is loaded
document.addEventListener('DOMContentLoaded', () => {
    new Navigation();
});
