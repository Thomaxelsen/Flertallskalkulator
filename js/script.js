// JavaScript for flertallskalkulator

        // Required votes for majority
        const TOTAL_SEATS = 169;
        const MAJORITY_THRESHOLD = 85;

        // DOM elements
        const partyGrid = document.getElementById('partyGrid');
        const progressBar = document.getElementById('progressBar');
        const votesForLabel = document.getElementById('votesFor');
        const votesAgainstLabel = document.getElementById('votesAgainst');
        const totalVotesFor = document.getElementById('totalVotesFor');
        const totalVotesAgainst = document.getElementById('totalVotesAgainst');
        const majorityStatus = document.getElementById('majorityStatus');
        const selectedPartyTags = document.getElementById('selectedPartyTags');
        const selectAllBtn = document.getElementById('selectAllBtn');
        const clearAllBtn = document.getElementById('clearAllBtn');
        const parliamentSeats = document.getElementById('parliamentSeats');
        const parliamentLegend = document.getElementById('parliamentLegend');

// Declare parties as a variable that will be filled with data from the JSON file
let parties = [];

// Load party data from JSON file
fetch('data/parties.json')
  .then(response => {
    if (!response.ok) {
      throw new Error('Network response was not ok');
    }
    return response.json();
  })
  .then(data => {
    parties = data;
    initializeApp();
  })
  .catch(error => {
    console.error('Error loading party data:', error);
    // Optionally show an error message to the user
  });

// Initialize the app after loading data
function initializeApp() {
  // Create party cards
  createPartyCards();
  
  // Initialize D3 visualization 
  createD3ParliamentVisualization(parties, []);
  
  // Initialize results
  updateResults();
  
  // Set up event listeners
  setupEventListeners();
}

// Create party cards function
function createPartyCards() {
  parties.forEach(party => {
    const partyCard = document.createElement('div');
    partyCard.className = 'party-card';
    partyCard.dataset.seats = party.seats;
    partyCard.dataset.name = party.name;
    partyCard.dataset.shorthand = party.shorthand;
    partyCard.dataset.classPrefix = party.classPrefix;
    
    const partyIcon = document.createElement('span');
    partyIcon.className = `party-icon icon-${party.classPrefix}`;
    partyIcon.textContent = party.shorthand.charAt(0);
    
    const partyName = document.createElement('span');
    partyName.className = 'party-name';
    partyName.textContent = party.name;
    
    const partySeats = document.createElement('span');
    partySeats.className = 'party-seats';
    partySeats.textContent = party.seats;
    
    partyCard.appendChild(partyIcon);
    partyCard.appendChild(partyName);
    partyCard.appendChild(partySeats);
    
    partyCard.addEventListener('click', () => toggleParty(partyCard));
    
    partyGrid.appendChild(partyCard);
  });
}

// Toggle party selection
function toggleParty(partyCard) {
  partyCard.classList.toggle('selected');
  updateResults();
  updateVisualization();
}

// Setup event listeners function
function setupEventListeners() {
  // Select all parties
  selectAllBtn.addEventListener('click', () => {
    document.querySelectorAll('.party-card').forEach(card => {
      card.classList.add('selected');
    });
    updateResults();
    updateVisualization();
  });

  // Clear all selections
  clearAllBtn.addEventListener('click', () => {
    document.querySelectorAll('.party-card').forEach(card => {
      card.classList.remove('selected');
    });
    updateResults();
    updateVisualization();
  });
}

        // Update results based on selections
        function updateResults() {
            const selectedParties = Array.from(document.querySelectorAll('.party-card.selected'));
            const votesFor = selectedParties.reduce((total, party) => total + parseInt(party.dataset.seats), 0);
            const votesAgainst = TOTAL_SEATS - votesFor;
            const hasMajority = votesFor >= MAJORITY_THRESHOLD;
            
            // Update progress bar
            const percentage = (votesFor / TOTAL_SEATS) * 100;
            progressBar.style.width = `${percentage}%`;
            
            if (hasMajority) {
                progressBar.classList.add('majority');
            } else {
                progressBar.classList.remove('majority');
            }
            
            // Update vote counters
            votesForLabel.textContent = votesFor;
            votesAgainstLabel.textContent = votesAgainst;
            totalVotesFor.textContent = votesFor;
            totalVotesAgainst.textContent = votesAgainst;
            
            // Update majority status
            if (hasMajority) {
                majorityStatus.className = 'result-status has-majority';
                majorityStatus.textContent = `Flertall oppnådd med ${votesFor} stemmer`;
            } else {
                majorityStatus.className = 'result-status no-majority';
                const votesNeeded = MAJORITY_THRESHOLD - votesFor;
                majorityStatus.textContent = `Ingen flertall (trenger ${votesNeeded} flere stemmer)`;
            }
            
            // Update selected party tags
            selectedPartyTags.innerHTML = '';
            if (selectedParties.length === 0) {
                const noPartyTag = document.createElement('span');
                noPartyTag.className = 'party-tag';
                noPartyTag.textContent = 'Ingen partier valgt';
                selectedPartyTags.appendChild(noPartyTag);
            } else {
                selectedParties.forEach(party => {
                    const tag = document.createElement('span');
                    tag.className = `party-tag party-tag-${party.dataset.classPrefix}`;
                    tag.textContent = `${party.dataset.shorthand} (${party.dataset.seats})`;
                    selectedPartyTags.appendChild(tag);
                });
            }
        }

// Update visualization based on party selection
function updateVisualization() {
    const selectedParties = Array.from(document.querySelectorAll('.party-card.selected'));
    const selectedPartyShorthands = selectedParties.map(party => party.dataset.shorthand);
    
    // Update D3 visualization
    updateD3Visualization(selectedPartyShorthands);
}
