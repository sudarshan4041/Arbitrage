// Dashboard JavaScript for DipBot Funding Profit Tracker

// Global variables
let openPositions = [];

// Modal functions
function openAddModal() {
    document.getElementById('addModal').style.display = 'block';
}

function closeAddModal() {
    document.getElementById('addModal').style.display = 'none';
    document.getElementById('addPositionForm').reset();
}

// Close modal when clicking outside
window.onclick = function(event) {
    const modal = document.getElementById('addModal');
    if (event.target == modal) {
        closeAddModal();
    }
}

// Execute position
function executePosition(symbol) {
    const card = document.querySelector(`[data-pair="${symbol}"]`);
    const amount = card.querySelector('.amount-input').value;
    const takeProfit = card.querySelector('.tp-input').value;
    const spotPrice = card.querySelector('.spot-price').textContent;
    const futuresPrice = card.querySelector('.futures-price').textContent;
    
    // Create position object
    const position = {
        id: Date.now(),
        symbol: symbol,
        spotPrice: spotPrice,
        futuresPrice: futuresPrice,
        amount: amount,
        takeProfit: takeProfit,
        timestamp: new Date().toLocaleString(),
        status: 'OPEN'
    };
    
    // Add to open positions
    openPositions.push(position);
    
    // Update UI
    updatePositionsList();
    
    // Show confirmation
    showNotification(`Position opened for ${symbol}`, 'success');
    
    // Animate the card
    card.style.animation = 'pulse 0.5s';
    setTimeout(() => {
        card.style.animation = '';
    }, 500);
}

// Update positions list
function updatePositionsList() {
    const positionsList = document.getElementById('positionsList');
    
    if (openPositions.length === 0) {
        positionsList.innerHTML = '<div class="no-positions">No open positions</div>';
        return;
    }
    
    let html = '';
    openPositions.forEach(position => {
        html += `
            <div class="position-item" data-id="${position.id}">
                <div class="position-info">
                    <span><strong>Symbol:</strong> ${position.symbol}</span>
                    <span><strong>Amount:</strong> ${position.amount} USDT</span>
                    <span><strong>Entry:</strong> ${position.spotPrice}</span>
                    <span><strong>TP:</strong> ${position.takeProfit}</span>
                    <span><strong>Time:</strong> ${position.timestamp}</span>
                    <span class="status-badge">${position.status}</span>
                </div>
                <div class="position-actions">
                    <button onclick="closePosition(${position.id})">Close</button>
                </div>
            </div>
        `;
    });
    
    positionsList.innerHTML = html;
}

// Close position
function closePosition(positionId) {
    if (confirm('Are you sure you want to close this position?')) {
        openPositions = openPositions.filter(p => p.id !== positionId);
        updatePositionsList();
        showNotification('Position closed successfully', 'info');
    }
}

// Add new position form handler
document.addEventListener('DOMContentLoaded', function() {
    const form = document.getElementById('addPositionForm');
    if (form) {
        form.addEventListener('submit', function(e) {
            e.preventDefault();
            
            const newPosition = {
                id: Date.now(),
                symbol: document.getElementById('newSymbol').value,
                spotPrice: document.getElementById('newSpot').value,
                futuresPrice: document.getElementById('newFutures').value,
                amount: document.getElementById('newAmount').value,
                takeProfit: document.getElementById('newTP').value,
                timestamp: new Date().toLocaleString(),
                status: 'OPEN'
            };
            
            openPositions.push(newPosition);
            updatePositionsList();
            closeAddModal();
            showNotification(`New position added: ${newPosition.symbol}`, 'success');
        });
    }
    
    // Auto-update prices simulation
    setInterval(updatePrices, 5000);
    
    // Add keyboard shortcuts
    document.addEventListener('keydown', function(e) {
        if (e.key === 'Escape') {
            closeAddModal();
        }
        if (e.key === 'n' && e.ctrlKey) {
            e.preventDefault();
            openAddModal();
        }
    });
});

// Show notification
function showNotification(message, type = 'info') {
    const notification = document.createElement('div');
    notification.className = `notification ${type}`;
    notification.textContent = message;
    notification.style.cssText = `
        position: fixed;
        top: 20px;
        right: 20px;
        padding: 15px 25px;
        background: ${type === 'success' ? '#28a745' : '#17a2b8'};
        color: white;
        border-radius: 5px;
        z-index: 10000;
        animation: slideIn 0.3s ease;
    `;
    
    document.body.appendChild(notification);
    
    setTimeout(() => {
        notification.style.animation = 'slideOut 0.3s ease';
        setTimeout(() => {
            document.body.removeChild(notification);
        }, 300);
    }, 3000);
}

// Update prices (simulation)
function updatePrices() {
    const cards = document.querySelectorAll('.trading-card');
    cards.forEach(card => {
        const spotElement = card.querySelector('.spot-price');
        const futuresElement = card.querySelector('.futures-price');
        
        // Simulate small price changes
        const currentSpot = parseFloat(spotElement.textContent.replace(',', ''));
        const currentFutures = parseFloat(futuresElement.textContent.replace(',', ''));
        
        const spotChange = (Math.random() - 0.5) * currentSpot * 0.001;
        const futuresChange = (Math.random() - 0.5) * currentFutures * 0.001;
        
        const newSpot = (currentSpot + spotChange).toFixed(currentSpot < 1 ? 4 : 2);
        const newFutures = (currentFutures + futuresChange).toFixed(currentFutures < 1 ? 4 : 2);
        
        // Update with animation
        if (spotChange > 0) {
            spotElement.style.color = '#28a745';
        } else {
            spotElement.style.color = '#dc3545';
        }
        
        if (futuresChange > 0) {
            futuresElement.style.color = '#28a745';
        } else {
            futuresElement.style.color = '#dc3545';
        }
        
        spotElement.textContent = newSpot.toLocaleString();
        futuresElement.textContent = newFutures.toLocaleString();
        
        // Reset color after animation
        setTimeout(() => {
            spotElement.style.color = '';
            futuresElement.style.color = '';
        }, 1000);
    });
}

// Add CSS animations dynamically
const style = document.createElement('style');
style.textContent = `
    @keyframes pulse {
        0% { transform: scale(1); }
        50% { transform: scale(1.05); }
        100% { transform: scale(1); }
    }
    
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
    
    .status-badge {
        background-color: #28a745;
        color: white;
        padding: 2px 8px;
        border-radius: 3px;
        font-size: 12px;
        font-weight: 600;
    }
`;
document.head.appendChild(style);