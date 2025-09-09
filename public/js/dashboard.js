// Simple Dashboard JavaScript

document.addEventListener('DOMContentLoaded', function() {
    // Get all buttons
    const buttons = document.querySelectorAll('.grid-button');
    
    // Add click event to each button
    buttons.forEach(button => {
        button.addEventListener('click', function() {
            handleButtonClick(this.id, this.textContent);
        });
    });
});

// Handle button clicks
function handleButtonClick(buttonId, buttonText) {
    console.log(`Button clicked: ${buttonText}`);
    
    // Visual feedback
    const button = document.getElementById(buttonId);
    button.style.transform = 'scale(0.95)';
    setTimeout(() => {
        button.style.transform = '';
    }, 100);
    
    // Different actions for different buttons
    switch(buttonId) {
        case 'btn-symbol':
            console.log('Symbol button clicked');
            // Future: Open symbol selection
            break;
            
        case 'btn-spot':
            console.log('SPOT button clicked');
            // Future: Show spot prices
            break;
            
        case 'btn-futures':
            console.log('Futures button clicked');
            // Future: Show futures prices
            break;
            
        case 'btn-amount':
            console.log('Amount button clicked');
            // Future: Open amount input
            break;
            
        case 'btn-takeprofit':
            console.log('Take Profit button clicked');
            // Future: Set take profit
            break;
            
        case 'btn-go':
            console.log('GO button clicked');
            showNotification('Ready to execute!', 'success');
            // Future: Execute trade
            break;
            
        default:
            console.log('Unknown button');
    }
}

// Simple notification function
function showNotification(message, type = 'info') {
    // Remove any existing notification
    const existingNotification = document.querySelector('.notification');
    if (existingNotification) {
        existingNotification.remove();
    }
    
    // Create new notification
    const notification = document.createElement('div');
    notification.className = 'notification';
    notification.textContent = message;
    notification.style.cssText = `
        position: fixed;
        top: 20px;
        right: 20px;
        padding: 15px 25px;
        background: ${type === 'success' ? '#28a745' : '#17a2b8'};
        color: white;
        border-radius: 5px;
        z-index: 1000;
        animation: slideIn 0.3s ease;
        box-shadow: 0 2px 10px rgba(0,0,0,0.1);
    `;
    
    document.body.appendChild(notification);
    
    // Remove after 3 seconds
    setTimeout(() => {
        notification.style.animation = 'slideOut 0.3s ease';
        setTimeout(() => {
            notification.remove();
        }, 300);
    }, 3000);
}

// Add animation styles
const style = document.createElement('style');
style.textContent = `
    @keyframes slideIn {
        from {
            transform: translateX(100%);
            opacity: 0;
        }
        to {
            transform: translateX(0);
            opacity: 1;
        }
    }
    
    @keyframes slideOut {
        from {
            transform: translateX(0);
            opacity: 1;
        }
        to {
            transform: translateX(100%);
            opacity: 0;
        }
    }
`;
document.head.appendChild(style);