// js/representatives.js

document.addEventListener('DOMContentLoaded', () => {
    console.log("Representatives JS: DOM loaded.");

    // Globale variabler
    let allRepresentativesData = [];
    let partiesMap = {};
    let currentlySelectedCard = null;

    // DOM-element referanser
    const constituencyFilter = document.getElementById('constituency-filter');
    const partyFilter = document.getElementById('party-filter');
    const committeeFilter = document.getElementById('committee-filter');
    const nameSearch = document.getElementById('name-search');
    const representativeCount = document.getElementById('representative-count');
    const representativeGrid = document.getElementById('representative-grid');
    const loader = representativeGrid ? representativeGrid.querySelector('.loader') : null;
    const detailPanel = document.getElementById('representative-detail-panel');
    const detailPanelContent = detailPanel?.querySelector('.panel-content');
    const modal = document.getElementById('representative-detail-modal');
    const modalContentContainer = document.getElementById('representative-detail-content');
    const closeModalBtn = document.getElementById('close-representative-modal');

    // --- Datainnlasting ---
    function loadData() {
        if (loader) loader.style.display = 'block';

        const partiesPromise = window.partiesDataLoaded ? Promise.resolve(window.partiesData) : fetch('data/parties.json').then(r => r.json());
        const representativesPromise = fetch('data/representatives.json').then(r => r.json());

        Promise.all([partiesPromise, representativesPromise])
            .then(([parties, representatives]) => {
                if (!window.partiesDataLoaded) {
                    window.partiesData = parties;
                    window.partiesDataLoaded = true;
                }
                allRepresentativesData = representatives.filter(rep => rep.isActive === true); // Vis kun aktive representanter

                parties.forEach(p => { partiesMap[p.shorthand] = p; });

                const activeParties = parties.filter(p => allRepresentativesData.some(r => r.partyShorthand === p.shorthand));
                
                populateFilters(activeParties);
                setupEventListeners();
                handleFilteringAndDisplay();
            })
            .catch(error => {
                console.error("Error loading data:", error);
                if (representativeGrid) representativeGrid.innerHTML = `<p>Kunne ikke laste representantdata. Feil: ${error.message}</p>`;
                if (representativeCount) representativeCount.textContent = 'Feil';
            })
            .finally(() => {
                if (loader) loader.style.display = 'none';
            });
    }

    // --- Fylle ut filter-menyer ---
    function populateFilters(activeParties) {
        // Valgkretser
        const constituencies = [...new Set(allRepresentativesData.map(r => r.constituencyName))].sort();
        constituencies.forEach(name => {
            const option = document.createElement('option');
            option.value = name;
            option.textContent = name;
            constituencyFilter.appendChild(option);
        });

        // Partier
        activeParties.sort((a, b) => (a.position || 99) - (b.position || 99));
        activeParties.forEach(party => {
            const option = document.createElement('option');
            option.value = party.shorthand;
            option.textContent = party.name;
            partyFilter.appendChild(option);
        });

        // Komiteer
        const committees = [...new Set(allRepresentativesData.map(r => r.committee).filter(Boolean))].sort();
        committees.forEach(name => {
            const option = document.createElement('option');
            option.value = name;
            option.textContent = name;
            committeeFilter.appendChild(option);
        });
    }

    // --- Event Listeners ---
    function setupEventListeners() {
        constituencyFilter?.addEventListener('change', handleFilteringAndDisplay);
        partyFilter?.addEventListener('change', handleFilteringAndDisplay);
        committeeFilter?.addEventListener('change', handleFilteringAndDisplay);
        nameSearch?.addEventListener('input', debounce(handleFilteringAndDisplay, 300));
        
        representativeGrid?.addEventListener('click', (event) => {
            const card = event.target.closest('.representative-card[data-info]');
            if (card) handleCardInteraction(card);
        });

        closeModalBtn?.addEventListener('click', () => { if (modal) modal.style.display = 'none'; });
        modal?.addEventListener('click', (event) => { if (event.target === modal) modal.style.display = 'none'; });

        resetDetailPanel();
    }
    
    // --- Håndtering av Interaksjon ---
    function handleCardInteraction(cardElement) {
        if (currentlySelectedCard) currentlySelectedCard.classList.remove('selected-detail');
        cardElement.classList.add('selected-detail');
        currentlySelectedCard = cardElement;

        try {
            const info = JSON.parse(cardElement.dataset.info);
            const usePanel = window.innerWidth >= 1024;
            if (usePanel && detailPanelContent) {
                displayInPanel(info);
            } else if (modal && modalContentContainer) {
                displayInModal(info);
            }
        } catch (e) {
            console.error("Error parsing data from card:", e);
        }
    }

    function displayInPanel(rep) {
        const partyInfo = partiesMap[rep.partyShorthand];
        detailPanelContent.innerHTML = generateDetailHTML(rep, partyInfo);
        if (detailPanel) detailPanel.scrollTop = 0;
    }

    function displayInModal(rep) {
        const partyInfo = partiesMap[rep.partyShorthand];
        modalContentContainer.innerHTML = generateDetailHTML(rep, partyInfo, true);
        modal.style.display = 'block';
    }

    function generateDetailHTML(rep, party, isModal = false) {
        const imageHtml = rep.imageUrl
            ? `<img src="${rep.imageUrl}" alt="${rep.name}" class="detail-image">`
            : `<img src="images/placeholder-generic.png" alt="Placeholder" class="detail-image">`;

        return `
            <div class="detail-image-container">${imageHtml}</div>
            <div class="detail-header">
                <img src="images/parties/${party.shorthand.toLowerCase()}.png" class="party-icon" alt="${party.name}">
                <h3>${rep.name}</h3>
            </div>
            <div class="detail-info">
                <p><strong>Parti:</strong> ${party.name}</p>
                <p><strong>Valgkrets:</strong> ${rep.constituencyName}</p>
                ${rep.committee ? `<p><strong>Komité:</strong> ${rep.committee}</p>` : ''}
                ${rep.phone ? `<p><strong>Telefon:</strong> <a href="tel:${rep.phone}">${rep.phone}</a></p>` : ''}
                ${rep.email ? `<p><strong>E-post:</strong> <a href="mailto:${rep.email}">${rep.email}</a></p>` : ''}
                ${rep.regionOffice ? `<p><strong>Regionkontor:</strong> ${rep.regionOffice}</p>` : ''}
                ${rep.kfContact ? `<p><strong>KF-kontakt:</strong> ${rep.kfContact}</p>` : ''}
            </div>
            ${rep.profileUrl ? `<a href="${rep.profileUrl}" class="profile-link-btn" target="_blank" rel="noopener noreferrer">Se profil i Microsoft Lists</a>` : ''}
            <p class="${isModal ? 'privacy-notice' : 'privacy-notice-panel'}">Husk personvern ved bruk av kontaktinformasjon.</p>
        `;
    }

    function resetDetailPanel() {
        if (detailPanelContent) detailPanelContent.innerHTML = `<div class="placeholder-text"><h3>Representantinformasjon</h3><p>Velg en representant for å se detaljer.</p></div>`;
        if (currentlySelectedCard) {
            currentlySelectedCard.classList.remove('selected-detail');
            currentlySelectedCard = null;
        }
    }
    
    // --- Filtrering og Visning ---
    function handleFilteringAndDisplay() {
        resetDetailPanel();
        
        const selectedConstituency = constituencyFilter.value;
        const selectedParty = partyFilter.value;
        const selectedCommittee = committeeFilter.value;
        const searchTerm = nameSearch.value.toLowerCase().trim();

        let filteredReps = allRepresentativesData.filter(rep => {
            const inConstituency = selectedConstituency === 'all' || rep.constituencyName === selectedConstituency;
            const inParty = selectedParty === 'all' || rep.partyShorthand === selectedParty;
            const inCommittee = selectedCommittee === 'all' || rep.committee === selectedCommittee;
            const matchesSearch = searchTerm === '' || rep.name.toLowerCase().includes(searchTerm);
            return inConstituency && inParty && inCommittee && matchesSearch;
        });

        filteredReps.sort((a, b) => {
            if (a.constituencyName !== b.constituencyName) return a.constituencyName.localeCompare(b.constituencyName);
            const pA = partiesMap[a.partyShorthand]?.position || 99;
            const pB = partiesMap[b.partyShorthand]?.position || 99;
            return pA - pB;
        });
        
        displayRepresentatives(filteredReps);
        representativeCount.textContent = filteredReps.length;
    }
    
    function displayRepresentatives(reps) {
        if (!representativeGrid) return;
        representativeGrid.innerHTML = '';
        if (reps.length === 0) {
            representativeGrid.innerHTML = '<p>Ingen representanter matcher filtrene.</p>';
            return;
        }

        let currentConstituency = null;
        reps.forEach(rep => {
            const partyInfo = partiesMap[rep.partyShorthand];
            if (!partyInfo) return;

            if (rep.constituencyName !== currentConstituency) {
                const separator = document.createElement('div');
                separator.className = 'constituency-separator';
                separator.textContent = rep.constituencyName;
                representativeGrid.appendChild(separator);
                currentConstituency = rep.constituencyName;
            }

            const card = createRepresentativeCard(rep, partyInfo);
            representativeGrid.appendChild(card);
        });
    }

    function createRepresentativeCard(rep, party) {
        const card = document.createElement('div');
        card.className = 'representative-card';
        card.style.setProperty('--party-color', party.color || '#ccc');
        card.dataset.info = JSON.stringify(rep);

        card.innerHTML = `
            <div class="card-header">
                <span class="representative-name">${rep.name}</span>
                <img src="images/parties/${party.shorthand.toLowerCase()}.png" class="party-icon" alt="${party.name}">
            </div>
            <div class="card-body">
                <div class="representative-meta">
                    <span>${rep.committee || 'Ingen komité tildelt'}</span>
                </div>
            </div>
        `;
        return card;
    }
    
    function debounce(func, wait) {
        let timeout;
        return function executedFunction(...args) {
            const later = () => {
                clearTimeout(timeout);
                func(...args);
            };
            clearTimeout(timeout);
            timeout = setTimeout(later, wait);
        };
    }

    // --- Start Lasting ---
    loadData();
});
