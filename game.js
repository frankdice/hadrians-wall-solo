// Hadrian's Wall Game Implementation

// Game constants
const VALOR_PER_ROUND = [1, 2, 2, 3, 3, 4];
const PICT_CARDS_BY_DIFFICULTY = {
    easy: [1, 2, 3, 4, 6, 8],
    medium: [1, 2, 4, 6, 8, 10],
    hard: [1, 3, 5, 7, 9, 12]
};

// Game state
let gameState = {
    currentRound: 1,
    maxRounds: 6,
    playerCards: [],
    playerCardsOriginal: [], // Keep original copy for resets
    neutralCards: [], // Neutral deck
    neutralCardsOriginal: [], // Keep original copy for resets
    currentNeutralCards: [], // Two neutral cards displayed per round
    pictCards: [],
    pictCardsOriginal: [], // Keep original copy for resets
    activePictCard: null,
    pictCardHidden: false, // Track if pict card is hidden
    difficulty: null,
    currentPlayerCardOptions: [], // The two cards drawn for selection
    rejectedPlayerCard: null, // The card that was not selected (visible until next round)
    selectedTasks: [], // Tasks selected for each round
    roundPhase: 'start', // 'start' or 'pict-attack' or 'complete'
    resources: {
        soldier: 0,
        builder: 0,
        servant: 0,
        civilian: 0,
        stone: 0
    },
    ongoingResources: {
        stone: 1,
        builder: 0,
        civilian: 0,
        renown: 0,
        piety: 0,
        valour: 0,
        discipline: 0,
        pictAttack: 0
    }
};

// Load JSON data
async function loadGameData() {
    try {
        const [playerCardsResponse, pictCardsResponse] = await Promise.all([
            fetch('player-cards.json'),
            fetch('pict-cards.json')
        ]);

        gameState.playerCards = await playerCardsResponse.json();
        gameState.pictCards = await pictCardsResponse.json();
        gameState.playerCardsOriginal = JSON.parse(JSON.stringify(gameState.playerCards)); // Deep copy
        gameState.neutralCards = JSON.parse(JSON.stringify(gameState.playerCards)); // Copy for neutral deck
        gameState.neutralCardsOriginal = JSON.parse(JSON.stringify(gameState.playerCards)); // Deep copy
        gameState.pictCardsOriginal = JSON.parse(JSON.stringify(gameState.pictCards)); // Deep copy

        initializeGame();
    } catch (error) {
        console.error('Error loading game data:', error);
    }
}

// Initialize the game
function initializeGame() {
    updateResourceDisplay();
    updateOngoingResourceDisplay();
    setupEventListeners();
}

// Render player cards in left column
function renderPlayerCards() {
    const container = document.getElementById('player-cards-container');
    container.innerHTML = '';

    gameState.playerCards.forEach((card, index) => {
        const cardElement = createPlayerCardElement(card, index);
        container.appendChild(cardElement);
    });
}

// Create player card element
function createPlayerCardElement(card, index) {
    const cardDiv = document.createElement('div');
    cardDiv.className = 'card';
    cardDiv.dataset.cardIndex = index;

    let taskCountDisplay = '';
    if (card.task_count_vp) {
        taskCountDisplay = '<ul class="resource-list">';
        for (const [count, vp] of Object.entries(card.task_count_vp)) {
            taskCountDisplay += `<li>${count} → ${vp} VP</li>`;
        }
        taskCountDisplay += '</ul>';
    }

    cardDiv.innerHTML = `
        <strong>${card.name}</strong>
        <p><em>${card.task}</em></p>
        ${taskCountDisplay}
        <p>Market: ${card.market || 'N/A'}</p>
        <p>Resources: ${card.resources ? card.resources.join(', ') : 'None'}</p>
    `;

    return cardDiv;
}

// Render pict cards in right column
function renderPictCards() {
    const container = document.getElementById('pict-cards-container');
    container.innerHTML = '';

    // Show first 5 cards
    const cardsToShow = gameState.pictCards.slice(0, 5);
    cardsToShow.forEach((card, index) => {
        const cardElement = createPictCardElement(card, index);
        container.appendChild(cardElement);
    });
}

// Create pict card element
function createPictCardElement(card, index) {
    const cardDiv = document.createElement('div');
    cardDiv.className = 'card';
    cardDiv.dataset.cardIndex = index;

    let resourcesDisplay = '';
    if (card.resources) {
        resourcesDisplay = '<ul class="resource-list">';
        for (const [resource, count] of Object.entries(card.resources)) {
            resourcesDisplay += `<li>${resource}: ${count}</li>`;
        }
        resourcesDisplay += '</ul>';
    }

    cardDiv.innerHTML = `
        <strong>Card ${index + 1}</strong>
        <p>Attack: ${card.attack || 'N/A'}</p>
        <p>Gladiator: ${card.gladiator || 0}</p>
        <p>Market: ${card.market || 0}</p>
        ${resourcesDisplay}
    `;

    cardDiv.addEventListener('click', () => selectPictCard(index));

    return cardDiv;
}

// Select a pict card to display in center
function selectPictCard(index) {
    gameState.activePictCard = gameState.pictCards[index];
    displayActivePictCard();
}

// Display active pict card in center column
function displayActivePictCard() {
    const container = document.getElementById('active-card-container');
    
    if (!gameState.activePictCard) {
        container.innerHTML = '<p style="color: #999;">No pict card drawn yet</p>';
        return;
    }
    
    if (gameState.pictCardHidden) {
        container.innerHTML = `
            <div class="card" style="background-color: #f5f5f5; border: 2px solid #999; cursor: pointer; text-align: center; padding: 15px;" onclick="togglePictCard()">
                <p style="color: #666; margin: 0; font-size: 14px;">📋 Click to view Pict Card</p>
            </div>
        `;
        return;
    }

    const card = gameState.activePictCard;
    
    let resourcesDisplay = '';
    if (card.resources) {
        resourcesDisplay = '<h4>Resources Gained:</h4><ul class="resource-list">';
        for (const [resource, count] of Object.entries(card.resources)) {
            resourcesDisplay += `<li><strong>${resource}:</strong> ${count}</li>`;
        }
        resourcesDisplay += '</ul>';
    }

    container.innerHTML = `
        <div class="card" style="background-color: #fff3e0; border: 2px solid #ff9800; cursor: pointer;" onclick="togglePictCard()">
            <h3>Current Pict Card (click to hide)</h3>
            <p><strong>Attack Position:</strong> ${card.attack || 'N/A'}</p>
            <p><strong>Gladiator:</strong> ${card.gladiator || 0}</p>
            <p><strong>Market:</strong> ${card.market || 0}</p>
            ${resourcesDisplay}
        </div>
    `;
}

// Toggle pict card visibility
function togglePictCard() {
    gameState.pictCardHidden = !gameState.pictCardHidden;
    displayActivePictCard();
}

// Make togglePictCard globally accessible
window.togglePictCard = togglePictCard;

// Render round boxes
function renderRoundBoxes() {
    const container = document.getElementById('rounds-container');
    container.innerHTML = '';
    
    if (!gameState.difficulty) {
        container.innerHTML = '<p style="text-align: center; width: 100%; color: #999;">Select a difficulty to begin</p>';
        return;
    }
    
    const pictCardsByRound = PICT_CARDS_BY_DIFFICULTY[gameState.difficulty];
    
    for (let round = 1; round <= gameState.maxRounds; round++) {
        const roundBox = document.createElement('div');
        roundBox.className = 'round-box';
        roundBox.id = `round-${round}`;
        
        if (round === gameState.currentRound) {
            roundBox.classList.add('active');
        } else if (round < gameState.currentRound) {
            roundBox.classList.add('completed');
        }
        
        // Check if task was selected for this round
        let taskDisplay = '';
        if (gameState.selectedTasks[round - 1]) {
            const task = gameState.selectedTasks[round - 1];
            
            let taskVPDisplay = '';
            if (task.task_count_vp) {
                taskVPDisplay = '<div style="margin-top: 5px; font-size: 10px;">';
                for (const [count, vp] of Object.entries(task.task_count_vp)) {
                    taskVPDisplay += `<div>${count} → ${vp} VP</div>`;
                }
                taskVPDisplay += '</div>';
            }
            
            taskDisplay = `
                <div class="round-task">
                    <div class="round-task-name">${task.name}</div>
                    <div class="round-task-desc">${task.task}</div>
                    ${taskVPDisplay}
                </div>
            `;
        }
        
        roundBox.innerHTML = `
            <div class="round-number">Round ${round}</div>
            <div class="round-info">
                <div style="display: flex; gap: 10px; justify-content: space-around;">
                    <div class="round-info-item">
                        <div class="round-info-label">Valor</div>
                        <div class="round-info-value">${VALOR_PER_ROUND[round - 1]}</div>
                    </div>
                    <div class="round-info-item">
                        <div class="round-info-label">Pict Cards</div>
                        <div class="round-info-value">${pictCardsByRound[round - 1]}</div>
                    </div>
                </div>
            </div>
            ${taskDisplay}
        `;
        
        container.appendChild(roundBox);
    }
}

// Update round display
function updateRoundDisplay() {
    renderRoundBoxes();
}

// Handle round button click (toggles between Pict Attack and Next Round)
function handleRoundButton() {
    if (gameState.roundPhase === 'start' || gameState.roundPhase === 'complete') {
        pictAttack();
    } else if (gameState.roundPhase === 'pict-attack') {
        nextRound();
    }
}

// Update round button text
function updateRoundButton() {
    const button = document.getElementById('next-round-btn');
    if (gameState.roundPhase === 'start' || gameState.roundPhase === 'complete') {
        button.textContent = 'Pict Attack';
    } else if (gameState.roundPhase === 'pict-attack') {
        button.textContent = 'Next Round';
    }
}

// Pict Attack phase - draw cards based on difficulty
function pictAttack() {
    const pictCardsByRound = PICT_CARDS_BY_DIFFICULTY[gameState.difficulty];
    const baseNumCards = pictCardsByRound[gameState.currentRound - 1];
    const bonusCards = gameState.ongoingResources.pictAttack || 0;
    const numCards = baseNumCards + bonusCards;
    
    if (gameState.pictCards.length < numCards) {
        alert('Not enough pict cards remaining!');
        return;
    }
    
    const drawnCards = [];
    
    for (let i = 0; i < numCards; i++) {
        const card = gameState.pictCards.shift();
        drawnCards.push(card);
    }
    
    // Display pict attack results
    displayPictAttack(drawnCards, baseNumCards, bonusCards);
    
    // Reset Pict Attack resource to 0
    gameState.ongoingResources.pictAttack = 0;
    updateOngoingResourceDisplay();
    
    gameState.roundPhase = 'pict-attack';
    updateRoundButton();
    
    console.log(`Pict Attack: Drew ${numCards} cards (${baseNumCards} base + ${bonusCards} bonus)`);
}

// Display pict attack results
function displayPictAttack(cards, baseNumCards = 0, bonusCards = 0) {
    const container = document.getElementById('pict-attack-display');
    
    // Count attacks by position
    const attackCounts = {
        left: 0,
        middle: 0,
        right: 0
    };
    
    cards.forEach(card => {
        const attack = (card.attack || '').toLowerCase();
        if (attack === 'left') attackCounts.left++;
        else if (attack === 'middle' || attack === 'center') attackCounts.middle++;
        else if (attack === 'right') attackCounts.right++;
    });
    
    // Build summary string
    const summaryParts = [];
    if (attackCounts.left > 0) summaryParts.push(`${attackCounts.left} left`);
    if (attackCounts.middle > 0) summaryParts.push(`${attackCounts.middle} center`);
    if (attackCounts.right > 0) summaryParts.push(`${attackCounts.right} right`);
    const summaryText = summaryParts.join(', ');
    
    // Build title with bonus cards info
    const titleText = bonusCards > 0 
        ? `Pict Attack! (${cards.length} cards: ${baseNumCards} base + ${bonusCards} bonus)` 
        : `Pict Attack! (${cards.length} cards)`;
    
    let cardsDisplay = '<div style="display: flex; gap: 10px; flex-wrap: wrap; margin-top: 10px;">';
    cards.forEach((card, index) => {
        cardsDisplay += `
            <div style="background-color: #fff3e0; border: 2px solid #ff9800; border-radius: 4px; padding: 8px; font-size: 11px;">
                <strong>Card ${index + 1}</strong><br>
                Attack: ${card.attack || 'N/A'}
            </div>
        `;
    });
    cardsDisplay += '</div>';
    
    container.innerHTML = `
        <div style="background-color: #ffebee; border: 2px solid #f44336; border-radius: 8px; padding: 15px; margin-top: 15px;">
            <h3 style="margin: 0 0 10px 0; color: #c62828;">${titleText}</h3>
            <div style="font-size: 16px; font-weight: bold; color: #d32f2f; margin-bottom: 10px;">
                ${summaryText}
            </div>
            ${cardsDisplay}
        </div>
    `;
}

// Clear pict attack display
function clearPictAttack() {
    const container = document.getElementById('pict-attack-display');
    if (container) {
        container.innerHTML = '';
    }
}

// Clear gladiator battle display
function clearGladiatorBattle() {
    const container = document.getElementById('gladiator-battle-display');
    if (container) {
        container.innerHTML = '';
    }
}

// Next round handler
function nextRound() {
    if (gameState.currentRound < gameState.maxRounds) {
        gameState.currentRound++;
        gameState.roundPhase = 'start';
        updateRoundDisplay();
        updateRoundButton();
        
        // Clear pict attack display
        clearPictAttack();
        
        // Start the new round
        startRound();
        
        console.log(`Starting Round ${gameState.currentRound}`);
    } else {
        alert('Game Complete! Final round reached.');
    }
}

// Setup event listeners
function setupEventListeners() {
    document.getElementById('next-round-btn').addEventListener('click', handleRoundButton);
    document.getElementById('new-game-btn').addEventListener('click', showDifficultySelector);
}

// Show difficulty selector
function showDifficultySelector() {
    const difficultyDisplay = document.getElementById('difficulty-display');
    
    difficultyDisplay.style.display = 'block';
    difficultyDisplay.innerHTML = `
        <div class="difficulty-selector">
            <h4>Select Difficulty:</h4>
            <div class="difficulty-buttons">
                <button class="difficulty-btn easy" onclick="startNewGame('easy')">Easy</button>
                <button class="difficulty-btn medium" onclick="startNewGame('medium')">Medium</button>
                <button class="difficulty-btn hard" onclick="startNewGame('hard')">Hard</button>
            </div>
        </div>
    `;
}

// Start new game with selected difficulty
function startNewGame(difficulty) {
    gameState.currentRound = 1;
    gameState.difficulty = difficulty;
    
    // Shuffle both decks
    gameState.pictCards = shuffleDeck(JSON.parse(JSON.stringify(gameState.pictCardsOriginal)));
    gameState.playerCards = shuffleDeck(JSON.parse(JSON.stringify(gameState.playerCardsOriginal)));
    gameState.neutralCards = shuffleDeck(JSON.parse(JSON.stringify(gameState.neutralCardsOriginal)));
    
    gameState.activePictCard = null;
    gameState.currentPlayerCardOptions = [];
    gameState.rejectedPlayerCard = null;
    gameState.selectedTasks = [];
    gameState.currentNeutralCards = [];
    gameState.roundPhase = 'start';
    
    // Reset resources
    resetResources();
    resetOngoingResources();
    
    // Update difficulty display
    const difficultyDisplay = document.getElementById('difficulty-display');
    difficultyDisplay.innerHTML = `
        <div class="difficulty-display ${difficulty}">
            Difficulty: ${difficulty.charAt(0).toUpperCase() + difficulty.slice(1)}
        </div>
    `;
    difficultyDisplay.style.display = 'block';
    
    // Reset and render UI
    updateRoundDisplay();
    displayActivePictCard();
    clearPlayerCardSelection();
    clearRejectedCard();
    
    // Show the Next Round button initially hidden (will show after card selection)
    document.getElementById('next-round-btn').style.display = 'none';
    updateRoundButton();
    
    // Start round 1
    startRound();
    
    console.log(`New game started with ${difficulty} difficulty`);
    console.log('Pict deck shuffled:', gameState.pictCards.length, 'cards');
    console.log('Player deck shuffled:', gameState.playerCards.length, 'cards');
}

// Shuffle deck using Fisher-Yates algorithm
function shuffleDeck(deck) {
    const shuffled = [...deck];
    for (let i = shuffled.length - 1; i > 0; i--) {
        const j = Math.floor(Math.random() * (i + 1));
        [shuffled[i], shuffled[j]] = [shuffled[j], shuffled[i]];
    }
    return shuffled;
}

// Start a round
function startRound() {
    // Clear rejected card from previous round
    if (gameState.currentRound > 1) {
        clearRejectedCard();
        clearNeutralCards();
        clearGladiatorBattle();
        clearPictAttack();
    }
    
    // Hide Gladiator Battle button at start of round
    document.getElementById('gladiator-battle-btn').style.display = 'none';
    
    // Hide Pict Attack button at start of round
    document.getElementById('next-round-btn').style.display = 'none';
    
    // Reset pict card hidden state
    gameState.pictCardHidden = false;
    
    // Reset all resources to 0 at the start of each round
    resetResources();
    
    // Add ongoing resources (stone, builder, civilian) to the right tracker
    gameState.resources.stone += gameState.ongoingResources.stone;
    gameState.resources.builder += gameState.ongoingResources.builder;
    gameState.resources.civilian += gameState.ongoingResources.civilian;
    updateResourceDisplay();
    
    // Draw pict card and discard it after adding resources
    drawPictCard();
    
    // Draw two player cards for selection
    drawPlayerCardOptions();
}

// Draw pict card and add resources
function drawPictCard() {
    if (gameState.pictCards.length === 0) {
        console.log('No more pict cards to draw');
        return;
    }
    
    const drawnCard = gameState.pictCards.shift(); // Draw from top of deck
    gameState.activePictCard = drawnCard;
    
    // Add resources from the card
    if (drawnCard.resources) {
        for (const [resource, count] of Object.entries(drawnCard.resources)) {
            if (gameState.resources.hasOwnProperty(resource)) {
                gameState.resources[resource] += count;
            }
        }
        updateResourceDisplay();
    }
    
    displayActivePictCard();
    
    // Hide the pict card after showing it for 2 seconds
    setTimeout(() => {
        gameState.pictCardHidden = true;
        displayActivePictCard();
    }, 2000);
    
    console.log(`Drew pict card. Resources added:`, drawnCard.resources);
    console.log(`Remaining pict cards: ${gameState.pictCards.length}`);
}

// Draw two player cards for selection
function drawPlayerCardOptions() {
    if (gameState.playerCards.length < 2) {
        console.log('Not enough player cards to draw');
        return;
    }
    
    gameState.currentPlayerCardOptions = [
        gameState.playerCards.shift(),
        gameState.playerCards.shift()
    ];
    
    displayPlayerCardOptions();
    console.log('Drew 2 player cards for selection');
}

// Display player card options
function displayPlayerCardOptions() {
    const container = document.getElementById('player-card-selection');
    container.innerHTML = '';
    
    if (gameState.currentPlayerCardOptions.length === 0) {
        return;
    }
    
    gameState.currentPlayerCardOptions.forEach((card, index) => {
        const cardDiv = document.createElement('div');
        cardDiv.className = 'player-card-option';
        
        let taskVPDisplay = '';
        if (card.task_count_vp) {
            taskVPDisplay = '<div class="task-vp"><strong>Victory Points:</strong><ul>';
            for (const [count, vp] of Object.entries(card.task_count_vp)) {
                taskVPDisplay += `<li>${count} completed → ${vp} VP</li>`;
            }
            taskVPDisplay += '</ul></div>';
        }
        
        const shapeDisplay = createShapeDisplay(card.shape);
        
        cardDiv.innerHTML = `
            <h4>${card.name}</h4>
            <div class="task">${card.task}</div>
            ${taskVPDisplay}
            <div class="resources-info">
                <strong>Resources if not selected:</strong>
                <p>${card.resources ? card.resources.join(', ') : 'None'}</p>
            </div>
            ${shapeDisplay}
        `;
        
        cardDiv.addEventListener('click', () => selectPlayerCard(index));
        container.appendChild(cardDiv);
    });
}

// Create shape display HTML
function createShapeDisplay(shape) {
    const shapes = {
        'square': [
            ['X', 'X'],
            ['X', 'X']
        ],
        'long': [
            ['X', 'X', 'X', 'X']
        ],
        's': [
            ['O', 'X', 'X'],
            ['X', 'X', 'O']
        ],
        'l': [
            ['O', 'O', 'X'],
            ['X', 'X', 'X']
        ],
        't': [
            ['O', 'X', 'O'],
            ['X', 'X', 'X']
        ]
    };
    
    const shapePattern = shapes[shape] || shapes['square'];
    
    let html = '<div class="shape-display">';
    shapePattern.forEach(row => {
        html += '<div class="shape-row">';
        row.forEach(cell => {
            const cellClass = cell === 'X' ? 'filled' : 'empty';
            html += `<div class="shape-cell ${cellClass}"></div>`;
        });
        html += '</div>';
    });
    html += '</div>';
    
    return html;
}

// Select a player card
function selectPlayerCard(index) {
    const selectedCard = gameState.currentPlayerCardOptions[index];
    const rejectedCard = gameState.currentPlayerCardOptions[1 - index];
    
    // Add selected card's task to the round
    gameState.selectedTasks[gameState.currentRound - 1] = selectedCard;
    
    // Add rejected card's resources
    if (rejectedCard.resources) {
        rejectedCard.resources.forEach(resource => {
            if (gameState.resources.hasOwnProperty(resource)) {
                gameState.resources[resource] += 1;
            }
        });
        updateResourceDisplay();
    }
    
    // Store rejected card to display
    gameState.rejectedPlayerCard = rejectedCard;
    
    // Clear selection and show rejected card
    clearPlayerCardSelection();
    displayRejectedCard();
    
    // Update round display to show task
    updateRoundDisplay();
    
    // Show Gladiator Battle button
    document.getElementById('gladiator-battle-btn').style.display = 'block';
    
    // Show Pict Attack button
    document.getElementById('next-round-btn').style.display = 'block';
    
    // Draw and display neutral cards
    drawNeutralCards();
    
    console.log('Selected card:', selectedCard.name);
    console.log('Rejected card:', rejectedCard.name, '- Resources added:', rejectedCard.resources);
}

// Clear player card selection
function clearPlayerCardSelection() {
    const container = document.getElementById('player-card-selection');
    container.innerHTML = '';
    gameState.currentPlayerCardOptions = [];
}

// Display rejected card
function displayRejectedCard() {
    const container = document.getElementById('rejected-card-container');
    
    if (!gameState.rejectedPlayerCard) {
        container.innerHTML = '';
        return;
    }
    
    const card = gameState.rejectedPlayerCard;
    const shapeDisplay = createShapeDisplay(card.shape);
    
    container.innerHTML = `
        <div class="rejected-card">
            <h5>${card.name}</h5>
            ${shapeDisplay}
        </div>
        <button onclick="drawMarketNumber()" style="margin-top: 10px; width: 100%;">Draw Market Number</button>
        <div id="market-number-display"></div>
    `;
}

// Clear rejected card
function clearRejectedCard() {
    const container = document.getElementById('rejected-card-container');
    container.innerHTML = '';
    gameState.rejectedPlayerCard = null;
    
    // Also clear market number display
    const marketDisplay = document.getElementById('market-number-display');
    if (marketDisplay) {
        marketDisplay.innerHTML = '';
    }
}

// Draw two neutral cards
function drawNeutralCards() {
    if (gameState.neutralCards.length < 2) {
        console.log('Not enough neutral cards to draw');
        return;
    }
    
    gameState.currentNeutralCards = [
        gameState.neutralCards.shift(),
        gameState.neutralCards.shift()
    ];
    
    displayNeutralCards();
    console.log('Drew 2 neutral cards');
}

// Display neutral cards
function displayNeutralCards() {
    const container = document.getElementById('neutral-cards-container');
    container.innerHTML = '';
    
    if (gameState.currentNeutralCards.length === 0) {
        return;
    }
    
    gameState.currentNeutralCards.forEach((card) => {
        const cardDiv = document.createElement('div');
        cardDiv.className = 'neutral-card';
        
        const shapeDisplay = createShapeDisplay(card.shape);
        
        cardDiv.innerHTML = `
            <h5>${card.name}</h5>
            <div style="margin: 8px 0;"><strong>Market:</strong> ${card.market || 'N/A'}</div>
            ${shapeDisplay}
        `;
        
        container.appendChild(cardDiv);
    });
}

// Clear neutral cards
function clearNeutralCards() {
    const container = document.getElementById('neutral-cards-container');
    container.innerHTML = '';
    gameState.currentNeutralCards = [];
}

// Draw market number from Pict deck
function drawMarketNumber() {
    if (gameState.pictCards.length === 0) {
        alert('No more cards in the Pict deck!');
        return;
    }
    
    const drawnCard = gameState.pictCards.shift();
    const marketNumber = drawnCard.market || 'N/A';
    
    const displayContainer = document.getElementById('market-number-display');
    displayContainer.innerHTML = `
        <div style="margin-top: 10px; padding: 12px; background-color: #e3f2fd; border: 2px solid #2196F3; border-radius: 6px; text-align: center;">
            <strong>Market Number:</strong>
            <div style="font-size: 24px; font-weight: bold; color: #1976d2; margin-top: 5px;">${marketNumber}</div>
            <div style="font-size: 11px; color: #666; margin-top: 5px;">from Pict card (Attack: ${drawnCard.attack || 'N/A'})</div>
        </div>
    `;
    
    console.log('Drew market number:', marketNumber, 'from Pict deck (Attack:', drawnCard.attack, ')');
    console.log('Remaining Pict cards:', gameState.pictCards.length);
}

// Make drawMarketNumber globally accessible
window.drawMarketNumber = drawMarketNumber;

// Gladiator Battle - draw from Pict deck
function gladiatorBattle() {
    if (gameState.pictCards.length === 0) {
        alert('No more cards in the Pict deck!');
        return;
    }
    
    const drawnCard = gameState.pictCards.shift();
    const gladiatorValue = drawnCard.gladiator || 0;
    
    const displayContainer = document.getElementById('gladiator-battle-display');
    displayContainer.innerHTML = `
        <div style="margin-top: 15px; padding: 15px; background-color: #fff3e0; border: 2px solid #ff9800; border-radius: 8px; text-align: center; min-width: 150px; max-width: 200px;">
            <h4 style="margin: 0 0 10px 0; color: #e65100; font-size: 14px;">Gladiator Battle</h4>
            <div style="font-size: 32px; font-weight: bold; color: #ff6f00; margin: 10px 0;">${gladiatorValue}</div>
            <div style="font-size: 11px; color: #666;">Attack: ${drawnCard.attack || 'N/A'}</div>
        </div>
    `;
    
    console.log('Gladiator Battle: Drew card with gladiator value:', gladiatorValue);
    console.log('Remaining pict cards:', gameState.pictCards.length);
}

// Make gladiatorBattle globally accessible
window.gladiatorBattle = gladiatorBattle;

// Make startNewGame globally accessible
window.startNewGame = startNewGame;

// Update resource
function updateResource(resourceType, change) {
    gameState.resources[resourceType] = Math.max(0, gameState.resources[resourceType] + change);
    updateResourceDisplay();
}

// Update resource display
function updateResourceDisplay() {
    for (const [resource, count] of Object.entries(gameState.resources)) {
        const element = document.getElementById(`${resource}-count`);
        if (element) {
            element.textContent = count;
        }
    }
}

// Reset resources
function resetResources() {
    gameState.resources = {
        soldier: 0,
        builder: 0,
        servant: 0,
        civilian: 0,
        stone: 0
    };
    updateResourceDisplay();
}

// Update ongoing resource
function updateOngoingResource(resourceType, change) {
    gameState.ongoingResources[resourceType] = Math.max(0, gameState.ongoingResources[resourceType] + change);
    updateOngoingResourceDisplay();
}

// Update ongoing resource display
function updateOngoingResourceDisplay() {
    for (const [resource, count] of Object.entries(gameState.ongoingResources)) {
        const element = document.getElementById(`ongoing-${resource}-count`);
        if (element) {
            element.textContent = count;
        }
    }
}

// Reset ongoing resources
function resetOngoingResources() {
    gameState.ongoingResources = {
        stone: 1,
        builder: 0,
        civilian: 0,
        renown: 0,
        piety: 0,
        valour: 0,
        discipline: 0,
        pictAttack: 0
    };
    updateOngoingResourceDisplay();
}

// Make updateOngoingResource globally accessible
window.updateOngoingResource = updateOngoingResource;

// Make updateResource globally accessible
window.updateResource = updateResource;

// Start the game when page loads
document.addEventListener('DOMContentLoaded', loadGameData);
