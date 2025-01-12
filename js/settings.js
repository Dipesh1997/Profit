class SettingsManager {
    constructor() {
        this.settingsForm = document.getElementById('settingsForm');
        this.themeMode = document.getElementById('themeMode');
        this.exportButton = document.getElementById('exportData');
        this.importButton = document.getElementById('importData');
        this.clearButton = document.getElementById('clearData');

        this.settings = JSON.parse(localStorage.getItem('settings')) || {
            businessName: '',
            businessPhone: '',
            businessEmail: '',
            themeMode: 'light'
        };

        this.setupEventListeners();
        this.loadSettings();
    }

    setupEventListeners() {
        // Save settings
        this.settingsForm.addEventListener('submit', (e) => {
            e.preventDefault();
            this.saveSettings();
        });

        // Theme change
        this.themeMode.addEventListener('change', () => {
            this.applyTheme(this.themeMode.value);
        });

        // Export data
        this.exportButton.addEventListener('click', () => {
            this.exportData();
        });

        // Import data
        this.importButton.addEventListener('click', () => {
            this.importData();
        });

        // Clear data
        this.clearButton.addEventListener('click', () => {
            this.clearData();
        });
    }

    loadSettings() {
        // Load business info
        document.getElementById('businessName').value = this.settings.businessName;
        document.getElementById('businessPhone').value = this.settings.businessPhone;
        document.getElementById('businessEmail').value = this.settings.businessEmail;

        // Load theme
        this.themeMode.value = this.settings.themeMode;
        this.applyTheme(this.settings.themeMode);
    }

    saveSettings() {
        this.settings = {
            businessName: document.getElementById('businessName').value,
            businessPhone: document.getElementById('businessPhone').value,
            businessEmail: document.getElementById('businessEmail').value,
            themeMode: this.themeMode.value
        };

        localStorage.setItem('settings', JSON.stringify(this.settings));
        this.addActivity('settings', 'Updated business settings');
        alert('Settings saved successfully!');
    }

    applyTheme(mode) {
        const root = document.documentElement;
        
        if (mode === 'dark') {
            root.style.setProperty('--bg-color', '#1a1a1a');
            root.style.setProperty('--text-color', '#ffffff');
            root.style.setProperty('--card-bg', '#2d2d2d');
            root.style.setProperty('--border-color', '#404040');
        } else {
            root.style.setProperty('--bg-color', '#f5f5f5');
            root.style.setProperty('--text-color', '#333333');
            root.style.setProperty('--card-bg', '#ffffff');
            root.style.setProperty('--border-color', '#dddddd');
        }
    }

    exportData() {
        const data = {
            settings: this.settings,
            inventory: JSON.parse(localStorage.getItem('inventory') || '[]'),
            customers: JSON.parse(localStorage.getItem('customers') || '[]'),
            invoices: JSON.parse(localStorage.getItem('invoices') || '[]'),
            activities: JSON.parse(localStorage.getItem('activities') || '[]')
        };

        const blob = new Blob([JSON.stringify(data, null, 2)], { type: 'application/json' });
        const url = URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = `inventory_backup_${new Date().toISOString().split('T')[0]}.json`;
        document.body.appendChild(a);
        a.click();
        document.body.removeChild(a);
        URL.revokeObjectURL(url);

        this.addActivity('settings', 'Exported system data');
    }

    importData() {
        const input = document.createElement('input');
        input.type = 'file';
        input.accept = '.json';

        input.addEventListener('change', (e) => {
            const file = e.target.files[0];
            if (!file) return;

            const reader = new FileReader();
            reader.onload = (e) => {
                try {
                    const data = JSON.parse(e.target.result);
                    
                    // Validate data structure
                    if (!data.settings || !data.inventory || !data.customers || !data.invoices) {
                        throw new Error('Invalid backup file format');
                    }

                    // Import all data
                    localStorage.setItem('settings', JSON.stringify(data.settings));
                    localStorage.setItem('inventory', JSON.stringify(data.inventory));
                    localStorage.setItem('customers', JSON.stringify(data.customers));
                    localStorage.setItem('invoices', JSON.stringify(data.invoices));
                    localStorage.setItem('activities', JSON.stringify(data.activities));

                    this.addActivity('settings', 'Imported system data');
                    alert('Data imported successfully! Please refresh the page.');
                    location.reload();
                } catch (error) {
                    alert('Error importing data: ' + error.message);
                }
            };
            reader.readAsText(file);
        });

        input.click();
    }

    clearData() {
        if (confirm('Are you sure you want to clear all data? This action cannot be undone!')) {
            localStorage.clear();
            this.addActivity('settings', 'Cleared all system data');
            alert('All data has been cleared. The page will now reload.');
            location.reload();
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
}

// Initialize the settings manager when the DOM is loaded
document.addEventListener('DOMContentLoaded', () => {
    new SettingsManager();
});
