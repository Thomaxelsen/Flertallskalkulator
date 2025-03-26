// JavaScript for flertallskalkulator

// Required votes for majority
const TOTAL_SEATS = 169;
const MAJORITY_THRESHOLD = 85;

// Hjelpefunksjon for å sjekke om enheten har berøringsskjerm
function isTouchDevice() {
    return (('ontouchstart' in window) || 
            (navigator.maxTouchPoints > 0) ||
            (navigator.msMaxTouchPoints > 0));
}

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
  
  // Set up info popup functionality
  setupInfoPopup();
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

// Konfetti-funksjon for å lage en spektakulær feiring
function celebrateWithConfetti() {
  // Partifargene som brukes i konfettien
  const colors = [
    '#ed1b34', // AP
    '#007ac8', // H
    '#14773c', // SP
    '#002e5e', // FrP
    '#eb2e2d', // SV
    '#00807b', // V
    '#da291c', // R
    '#ffbe00', // KrF
    '#439539', // MDG
    '#a04d94'  // PF
  ];

  // Første eksplosjon - fra bunnen og oppover
  confetti({
    particleCount: 150,
    spread: 100,
    origin: { y: 0.9 },
    colors: colors
  });

  // Andre eksplosjon - fra venstre side
  setTimeout(() => {
    confetti({
      particleCount: 80,
      angle: 60,
      spread: 55,
      origin: { x: 0, y: 0.5 },
      colors: colors
    });
  }, 250);

  // Tredje eksplosjon - fra høyre side
  setTimeout(() => {
    confetti({
      particleCount: 80,
      angle: 120,
      spread: 55,
      origin: { x: 1, y: 0.5 },
      colors: colors
    });
  }, 400);

  // Fjerde eksplosjon - regn av konfetti
  setTimeout(() => {
    confetti({
      particleCount: 100,
      startVelocity: 30,
      spread: 360,
      origin: { x: 0.5, y: 0.3 },
      colors: colors,
      ticks: 200
    });
  }, 650);
}

// Toggle party selection
function toggleParty(partyCard) {
  partyCard.classList.toggle('selected');
  updateResults();
  updateVisualization();
  
  // Clear any selected issue when manually toggling parties
  const issueSelect = document.getElementById('issueSelect');
  if (issueSelect) {
    issueSelect.value = '';
    const issueDetails = document.getElementById('issueDetails');
    if (issueDetails) {
      issueDetails.innerHTML = `
        <p class="issue-explainer">Velg en sak fra listen ovenfor for å se hvilke partier som er enige med Kreftforeningens standpunkt.</p>
      `;
    }
  }
}

// Setup info popup functionality
function setupInfoPopup() {
  const infoButton = document.getElementById('infoButton');
  const infoPopup = document.getElementById('infoPopup');
  const closePopup = document.querySelector('.close-popup');
  
  if (!infoButton || !infoPopup) return; // Avbryt hvis elementene ikke finnes
  
  // Vis popup når knappen klikkes
  infoButton.addEventListener('click', function() {
    infoPopup.style.display = 'block';
  });
  
  // Lukk popup når man klikker på X
  if (closePopup) {
    closePopup.addEventListener('click', function() {
      infoPopup.style.display = 'none';
    });
  }
  
  // Lukk popup når man klikker utenfor innholdet
  window.addEventListener('click', function(event) {
    if (event.target === infoPopup) {
      infoPopup.style.display = 'none';
    }
  });
  
  // For hover på desktop
  if (!isTouchDevice()) {
    let hoverTimer;
    
    infoButton.addEventListener('mouseenter', function() {
      hoverTimer = setTimeout(function() {
        infoPopup.style.display = 'block';
      }, 300);
    });
    
    infoButton.addEventListener('mouseleave', function() {
      clearTimeout(hoverTimer);
      
      // Gi litt tid før popup forsvinner (i tilfelle brukeren beveger musen til popup-innholdet)
      setTimeout(function() {
        if (!infoPopup.matches(':hover')) {
          infoPopup.style.display = 'none';
        }
      }, 200);
    });
    
    // Hold popup åpen mens musen er over innholdet
    infoPopup.addEventListener('mouseleave', function() {
      infoPopup.style.display = 'none';
    });
  }
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
    
    // Clear any selected issue when selecting all parties
    const issueSelect = document.getElementById('issueSelect');
    if (issueSelect) {
      issueSelect.value = '';
      const issueDetails = document.getElementById('issueDetails');
      if (issueDetails) {
        issueDetails.innerHTML = `
          <p class="issue-explainer">Velg en sak fra listen ovenfor for å se hvilke partier som er enige med Kreftforeningens standpunkt.</p>
        `;
      }
    }
  });

  // Clear all selections
  clearAllBtn.addEventListener('click', () => {
    document.querySelectorAll('.party-card').forEach(card => {
      card.classList.remove('selected');
    });
    updateResults();
    updateVisualization();
    
    // Clear any selected issue when clearing parties
    const issueSelect = document.getElementById('issueSelect');
    if (issueSelect) {
      issueSelect.value = '';
      const issueDetails = document.getElementById('issueDetails');
      if (issueDetails) {
        issueDetails.innerHTML = `
          <p class="issue-explainer">Velg en sak fra listen ovenfor for å se hvilke partier som er enige med Kreftforeningens standpunkt.</p>
        `;
      }
    }
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
    
    // Sjekk om vi gikk fra ikke-flertall til flertall
    if (!majorityStatus.hasAttribute('data-had-majority')) {
      // Kjør spektakulær konfetti-effekt
      celebrateWithConfetti();
      
      // Marker at vi har vist konfetti
      majorityStatus.setAttribute('data-had-majority', 'true');
    }
  } else {
    majorityStatus.className = 'result-status no-majority';
    const votesNeeded = MAJORITY_THRESHOLD - votesFor;
    majorityStatus.textContent = `Ingen flertall (trenger ${votesNeeded} flere stemmer)`;
    // Fjern markøren når vi ikke lenger har flertall
    majorityStatus.removeAttribute('data-had-majority');
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

// Eksporter funksjoner som trenger å være tilgjengelige for andre script-filer
window.updateResults = updateResults;
window.updateVisualization = updateVisualization;
