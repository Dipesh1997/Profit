document.addEventListener('DOMContentLoaded', function() {
    // Get the activity list element
    const activityList = document.getElementById('activityList');
    
    // Function to load and display activities
    function loadActivities() {
        // Get activities from localStorage
        const activities = JSON.parse(localStorage.getItem('activities') || '[]');
        
        // Clear the current list
        activityList.innerHTML = '';
        
        // Display activities
        activities.forEach(activity => {
            const activityItem = document.createElement('div');
            activityItem.className = 'activity-item';
            
            activityItem.innerHTML = `
                <div class="activity-icon">
                    <i class="fas ${activity.icon}"></i>
                </div>
                <div class="activity-details">
                    <p class="activity-message">${activity.message}</p>
                    <p class="activity-time">${activity.timestamp}</p>
                </div>
            `;
            
            activityList.appendChild(activityItem);
        });
        
        // If no activities
        if (activities.length === 0) {
            activityList.innerHTML = '<p class="no-activities">No recent activities</p>';
        }
    }
    
    // Load activities when page loads
    loadActivities();
});
