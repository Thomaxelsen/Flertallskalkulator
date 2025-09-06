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
    
    // Vent på at issues-data er lastet før initialisering
    if (window.issues && window.issues.length > 0) {
      initializeApp(); // Data allerede lastet
    } else {
      document.addEventListener('issuesDataLoaded', initializeApp);
    }
  })
  .catch(error => {
    console.error('Error loading party data:', error);
    // Optionally show an error message to the user
  });

// Initialize the app after loading data
function initializeApp() {
  // Sorter partiene før de brukes
  parties.sort((a, b) => a.position - b.position);

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

// *** MODIFISERT FUNKSJON ***
// Create party cards function
function createPartyCards() {
  parties.forEach(party => {
    const partyCard = document.createElement('div');
    partyCard.className = 'party-card'; // Bruker samme klasse som på de andre sidene
    partyCard.dataset.seats = party.seats;
    partyCard.dataset.name = party.name;
    partyCard.dataset.shorthand = party.shorthand;
    partyCard.dataset.classPrefix = party.classPrefix;
    partyCard.title = `${party.name} (${party.seats} mandater)`;
    
    // Lager logo-bildet
    const img = document.createElement('img');
    img.src = `images/parties/${party.shorthand.toLowerCase()}.png`;
    img.alt = party.name;
    img.className = 'party-logo';

    // Lager partiets kortnavn
    const name = document.createElement('span');
    name.className = 'party-name';
    name.textContent = party.shorthand;

    // Legger til elementene i kortet
    partyCard.appendChild(img);
    partyCard.appendChild(name);
    
    // Legger til klikk-hendelse
    partyCard.addEventListener('click', () => toggleParty(partyCard));
    
    partyGrid.appendChild(partyCard);
  });
}

// Konfetti-funksjon for å lage en spektakulær feiring (UENDRET)
function celebrateWithConfetti() {
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
  confetti({
    particleCount: 150,
    spread: 100,
    origin: { y: 0.9 },
    colors: colors
  });
  setTimeout(() => {
    confetti({
      particleCount: 80,
      angle: 60,
      spread: 55,
      origin: { x: 0, y: 0.5 },
      colors: colors
    });
  }, 250);
  setTimeout(() => {
    confetti({
      particleCount: 80,
      angle: 120,
      spread: 55,
      origin: { x: 1, y: 0.5 },
      colors: colors
    });
  }, 400);
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

// Toggle party selection (UENDRET)
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

// Setup info popup functionality (UENDRET)
function setupInfoPopup() {
  const infoButton = document.getElementById('infoButton');
  const infoPopup = document.getElementById('infoPopup');
  const infoTooltip = document.getElementById('infoTooltip');
  const closePopup = document.querySelector('.close-popup');
  
  if (!infoButton) return;
  
  if (isTouchDevice()) {
    infoButton.addEventListener('click', function() {
      if (infoPopup) infoPopup.style.display = 'block';
    });
    
    if (closePopup) {
      closePopup.addEventListener('click', function() {
        infoPopup.style.display = 'none';
      });
    }
    
    window.addEventListener('click', function(event) {
      if (event.target === infoPopup) {
        infoPopup.style.display = 'none';
      }
    });
  } else {
    infoButton.addEventListener('mouseenter', function(e) {
      if (infoTooltip) {
        const buttonRect = infoButton.getBoundingClientRect();
        infoTooltip.style.top = '0';
        infoTooltip.style.left = '30px';
        infoTooltip.style.display = 'block';
      }
    });
    
    infoButton.addEventListener('mouseleave', function() {
      if (infoTooltip) {
        infoTooltip.style.display = 'none';
      }
    });
  }
}

// Setup event listeners function (UENDRET)
function setupEventListeners() {
  selectAllBtn.addEventListener('click', () => {
    document.querySelectorAll('.party-card').forEach(card => {
      card.classList.add('selected');
    });
    updateResults();
    updateVisualization();
    
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

  clearAllBtn.addEventListener('click', () => {
    document.querySelectorAll('.party-card').forEach(card => {
      card.classList.remove('selected');
    });
    updateResults();
    updateVisualization();
    
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

// *** MODIFISERT FUNKSJON ***
// Update results based on selections
function updateResults() {
  const selectedParties = Array.from(document.querySelectorAll('.party-card.selected'));
  const votesFor = selectedParties.reduce((total, party) => total + parseInt(party.dataset.seats), 0);
  const votesAgainst = TOTAL_SEATS - votesFor;
  const hasMajority = votesFor >= MAJORITY_THRESHOLD;
  
  const percentage = (votesFor / TOTAL_SEATS) * 100;
  progressBar.style.width = `${percentage}%`;
  
  if (hasMajority) {
    progressBar.classList.add('majority');
  } else {
    progressBar.classList.remove('majority');
  }
  
  votesForLabel.textContent = votesFor;
  votesAgainstLabel.textContent = votesAgainst;
  totalVotesFor.textContent = votesFor;
  totalVotesAgainst.textContent = votesAgainst;
  
  if (hasMajority) {
    majorityStatus.className = 'result-status has-majority';
    majorityStatus.textContent = `Flertall oppnådd med ${votesFor} stemmer`;
    
    if (!majorityStatus.hasAttribute('data-had-majority')) {
      celebrateWithConfetti();
      majorityStatus.setAttribute('data-had-majority', 'true');
    }
  } else {
    majorityStatus.className = 'result-status no-majority';
    const votesNeeded = MAJORITY_THRESHOLD - votesFor;
    majorityStatus.textContent = `Ingen flertall (trenger ${votesNeeded} flere stemmer)`;
    majorityStatus.removeAttribute('data-had-majority');
  }
  
  // *** MODIFISERT DEL ***
  // Update selected party tags with new visual style
  selectedPartyTags.innerHTML = '';
  if (selectedParties.length === 0) {
    const noPartyTag = document.createElement('span');
    noPartyTag.className = 'party-tag-placeholder'; // Bruker en egen klasse for placeholder
    noPartyTag.textContent = 'Ingen partier valgt';
    selectedPartyTags.appendChild(noPartyTag);
  } else {
    selectedParties.forEach(party => {
      const partyInfo = parties.find(p => p.shorthand === party.dataset.shorthand);
      if (!partyInfo) return;

      const tag = document.createElement('div');
      tag.className = 'party-tag-small'; // Ny klasse for de små taggene

      const logo = document.createElement('img');
      logo.src = `images/parties/${partyInfo.shorthand.toLowerCase()}.png`;
      logo.className = 'party-tag-logo';
      logo.alt = partyInfo.name;

      const name = document.createElement('span');
      name.textContent = `${partyInfo.shorthand} (${partyInfo.seats})`;

      tag.appendChild(logo);
      tag.appendChild(name);
      tag.style.backgroundColor = hexToRgba(partyInfo.color, 0.15);
      tag.style.borderColor = partyInfo.color;

      selectedPartyTags.appendChild(tag);
    });
  }
}

// Update visualization based on party selection (UENDRET)
function updateVisualization() {
  const selectedParties = Array.from(document.querySelectorAll('.party-card.selected'));
  const selectedPartyShorthands = selectedParties.map(party => party.dataset.shorthand);
  
  updateD3Visualization(selectedPartyShorthands);
}

// *** NY HJELPEFUNKSJON ***
// Helper function to convert hex to rgba
function hexToRgba(hex, alpha) {
    if (!hex || !hex.startsWith('#')) return 'rgba(200, 200, 200, 0.15)'; // Fallback for safety
    const r = parseInt(hex.slice(1, 3), 16);
    const g = parseInt(hex.slice(3, 5), 16);
    const b = parseInt(hex.slice(5, 7), 16);
    return `rgba(${r}, ${g}, ${b}, ${alpha})`;
}

// Eksporter funksjoner som trenger å være tilgjengelige for andre script-filer (UENDRET)
window.updateResults = updateResults;
window.updateVisualization = updateVisualization;
