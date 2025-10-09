// js/representatives.js (v2.1 - Fiks for placeholder-bilder)

document.addEventListener('DOMContentLoaded', () => {
    console.log("Representatives JS (v2.1): DOM loaded.");

    // Globale variabler
    let allRepresentativesData = [];
    let partiesMap = {};
    let currentlySelectedCard = null;

    // DOM-element referanser
    const groupingSelect = document.getElementById('grouping-select');
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
    const modalContentWrapper = modal?.querySelector('.quote-modal-content');
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
                allRepresentativesData = representatives
                    .filter(rep => rep.isActive === true)
                    .map(rep => ({
                        ...rep,
                        committees: parseCommitteeField(rep.committee)
                    }));
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
        const constituencies = [...new Set(allRepresentativesData.map(r => r.constituencyName))].sort();
        constituencies.forEach(name => {
            const option = document.createElement('option');
            option.value = name;
            option.textContent = name;
            constituencyFilter.appendChild(option);
        });

        activeParties.sort((a, b) => (a.position || 99) - (b.position || 99));
        activeParties.forEach(party => {
            const option = document.createElement('option');
            option.value = party.shorthand;
            option.textContent = party.name;
            partyFilter.appendChild(option);
        });

        const committees = [...new Set(allRepresentativesData.flatMap(r => r.committees || []))].sort();
        committees.forEach(name => {
            const option = document.createElement('option');
            option.value = name;
            option.textContent = name;
            committeeFilter.appendChild(option);
        });
    }

    // --- Event Listeners ---
    function setupEventListeners() {
        groupingSelect?.addEventListener('change', handleFilteringAndDisplay);
        constituencyFilter?.addEventListener('change', handleFilteringAndDisplay);
        partyFilter?.addEventListener('change', handleFilteringAndDisplay);
        committeeFilter?.addEventListener('change', handleFilteringAndDisplay);
        nameSearch?.addEventListener('input', debounce(handleFilteringAndDisplay, 300));
        
        representativeGrid?.addEventListener('click', (event) => {
            const card = event.target.closest('.representative-card[data-info]');
            if (card) handleCardInteraction(card);
        });

        closeModalBtn?.addEventListener('click', closeModal);
        modal?.addEventListener('click', (event) => {
            if (event.target === modal) {
                closeModal();
            }
        });

        window.addEventListener('keydown', (event) => {
            if (event.key === 'Escape' && isModalOpen()) {
                closeModal();
            }
        });

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
        openModal();
    }

    // =======================================================
    // === HER ER FIKSEN for placeholder-bildet ===
    // =======================================================
    function generateDetailHTML(rep, party, isModal = false) {
        // Bygg riktig sti til placeholder-bildet basert på parti
        const placeholderPath = `images/candidates/placeholder-${party.shorthand.toLowerCase()}.png`;

        const imageHtml = rep.imageUrl
            ? `<img src="${rep.imageUrl}" alt="${rep.name}" class="detail-image">`
            : `<img src="${placeholderPath}" alt="Placeholder for ${party.name}" class="detail-image">`;

        return `
            <div class="detail-image-container">${imageHtml}</div>
            <div class="detail-header">
                <img src="images/parties/${party.shorthand.toLowerCase()}.png" class="party-icon" alt="${party.name}">
                <h3>${rep.name}</h3>
            </div>
            <div class="detail-info">
                <p><strong>Parti:</strong> ${party.name}</p>
                <p><strong>Valgkrets:</strong> ${rep.constituencyName}</p>
                ${rep.committeeRole ? `<p><strong>Komitérolle:</strong> ${rep.committeeRole}</p>` : ''}
                ${formatCommitteeDetails(rep.committees)}
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

    function isModalOpen() {
        return modal && modal.style.display === 'flex';
    }

    function openModal() {
        if (!modal) return;
        modal.style.display = 'flex';
        modal.scrollTop = 0;
        if (modalContentWrapper) {
            modalContentWrapper.scrollTop = 0;
        }
        document.body.classList.add('modal-open');
    }

    function closeModal() {
        if (!modal) return;
        modal.style.display = 'none';
        document.body.classList.remove('modal-open');
    }
    
    // --- Filtrering og Visning ---
    function handleFilteringAndDisplay() {
        resetDetailPanel();
        
        const grouping = groupingSelect.value;
        const selectedConstituency = constituencyFilter.value;
        const selectedParty = partyFilter.value;
        const selectedCommittee = committeeFilter.value;
        const searchTerm = nameSearch.value.toLowerCase().trim();

        let filteredReps = allRepresentativesData.filter(rep => {
            const inConstituency = selectedConstituency === 'all' || rep.constituencyName === selectedConstituency;
            const inParty = selectedParty === 'all' || rep.partyShorthand === selectedParty;
            const inCommittee = selectedCommittee === 'all' || (rep.committees || []).includes(selectedCommittee);
            const matchesSearch = searchTerm === '' || rep.name.toLowerCase().includes(searchTerm);
            return inConstituency && inParty && inCommittee && matchesSearch;
        });

        displayGroupedRepresentatives(filteredReps, grouping);
        representativeCount.textContent = filteredReps.length;
    }
    
    function displayGroupedRepresentatives(reps, groupBy) {
        if (!representativeGrid) return;
        representativeGrid.innerHTML = '';
        if (reps.length === 0) {
            representativeGrid.innerHTML = '<p>Ingen representanter matcher filtrene.</p>';
            return;
        }

        let grouped = {};
        if (groupBy === 'party') {
            reps.sort((a,b) => (partiesMap[a.partyShorthand]?.position || 99) - (partiesMap[b.partyShorthand]?.position || 99) || a.name.localeCompare(b.name));
            grouped = reps.reduce((acc, rep) => {
                const key = rep.partyShorthand;
                if (!acc[key]) acc[key] = [];
                acc[key].push(rep);
                return acc;
            }, {});
        } else if (groupBy === 'committee') {
            reps.sort((a, b) => {
                const committeeA = (a.committees && a.committees[0]) || 'zzzz';
                const committeeB = (b.committees && b.committees[0]) || 'zzzz';
                if (committeeA === committeeB) {
                    return a.name.localeCompare(b.name);
                }
                if (committeeA === 'zzzz') return 1;
                if (committeeB === 'zzzz') return -1;
                return committeeA.localeCompare(committeeB);
            });
            grouped = reps.reduce((acc, rep) => {
                const committees = (rep.committees && rep.committees.length > 0) ? rep.committees : ['Ikke tildelt komité'];
                committees.forEach(name => {
                    if (!acc[name]) acc[name] = [];
                    acc[name].push(rep);
                });
                return acc;
            }, {});
        } else { // Default to constituency
            reps.sort((a,b) => a.constituencyName.localeCompare(b.constituencyName) || (partiesMap[a.partyShorthand]?.position || 99) - (partiesMap[b.partyShorthand]?.position || 99));
            grouped = reps.reduce((acc, rep) => {
                const key = rep.constituencyName;
                if (!acc[key]) acc[key] = [];
                acc[key].push(rep);
                return acc;
            }, {});
        }

        const sortedGroupKeys = Object.keys(grouped).sort((a, b) => {
            if (groupBy === 'party') {
                return (partiesMap[a]?.position || 99) - (partiesMap[b]?.position || 99);
            }
            if (groupBy === 'committee') {
                const priorityDiff = getCommitteeGroupPriority(a) - getCommitteeGroupPriority(b);
                if (priorityDiff !== 0) return priorityDiff;
                return a.localeCompare(b, 'nb');
            }
            return a.localeCompare(b, 'nb');
        });

        const isGroupedByCommittee = groupBy === 'committee';

        sortedGroupKeys.forEach(groupKey => {
            let separator;
            if (groupBy === 'party') {
                const partyInfo = partiesMap[groupKey];
                separator = document.createElement('div');
                separator.className = 'party-separator-card';
                separator.style.setProperty('--party-color', partyInfo.color);
                separator.innerHTML = `
                    <img src="images/parties/${partyInfo.shorthand.toLowerCase()}.png" alt="${partyInfo.name}">
                    <h2>${partyInfo.name}</h2>
                `;
            } else {
                separator = document.createElement('div');
                separator.className = 'group-separator';
                separator.textContent = groupKey;
            }
            representativeGrid.appendChild(separator);

            const representatives = isGroupedByCommittee
                ? [...grouped[groupKey]].sort(sortByCommitteeRoleThenName)
                : grouped[groupKey];

            representatives.forEach(rep => {
                const partyInfo = partiesMap[rep.partyShorthand];
                const card = createRepresentativeCard(rep, partyInfo, {
                    highlightCommitteeRole: isGroupedByCommittee
                });
                representativeGrid.appendChild(card);
            });
        });
    }

    function sortByCommitteeRoleThenName(a, b) {
        const priorityDiff = getCommitteeRolePriority(a.committeeRole) - getCommitteeRolePriority(b.committeeRole);
        if (priorityDiff !== 0) return priorityDiff;
        return a.name.localeCompare(b.name, 'nb');
    }

    function getCommitteeRolePriority(role = '') {
        if (!role) return 3;
        const normalized = role.trim().toLowerCase();
        switch (normalized) {
            case 'stortingspresident':
                return -1;
            case 'leder':
            case 'komiteleder':
            case 'komitéleder':
                return 0;
            case '1. nestleder':
            case '1.nestleder':
            case 'første nestleder':
                return 1;
            case '2. nestleder':
            case '2.nestleder':
            case 'andre nestleder':
                return 2;
            default:
                return 3;
        }
    }

    function createRepresentativeCard(rep, party, { highlightCommitteeRole = false } = {}) {
        const card = document.createElement('div');
        card.className = 'representative-card';
        card.style.setProperty('--party-color', party.color || '#ccc');

        const isStortingspresident = (rep.committees || []).includes('Stortingspresident')
            || (rep.committeeRole && rep.committeeRole.trim().toLowerCase() === 'stortingspresident');

        if (isStortingspresident) {
            card.classList.add('stortingspresident-card');
            card.style.setProperty('--party-color', '#d4af37');
        }
        card.dataset.info = JSON.stringify(rep);

        if (highlightCommitteeRole && rep.committeeRole) {
            card.classList.add('committee-role-highlight');
        }

        const committeeRoleMarkup = rep.committeeRole
            ? `<span class="committee-role-badge" aria-label="Komitérolle">${rep.committeeRole}</span>`
            : '';

        card.innerHTML = `
            <div class="card-header">
                <span class="representative-name">${rep.name}</span>
                <img src="images/parties/${party.shorthand.toLowerCase()}.png" class="party-icon" alt="${party.name}">
            </div>
            <div class="card-body">
                <div class="representative-meta">
                    ${committeeRoleMarkup}
                    <span>${formatCommitteeSummary(rep.committees)}</span>
                </div>
            </div>
        `;
        return card;
    }

    function parseCommitteeField(rawValue) {
        if (!rawValue) return [];
        if (Array.isArray(rawValue)) {
            return rawValue.map(value => value.trim()).filter(Boolean);
        }
        return rawValue
            .split(',')
            .map(value => value.trim())
            .filter(Boolean);
    }

    function formatCommitteeSummary(committees = []) {
        if (!committees || committees.length === 0) {
            return 'Ingen komité tildelt';
        }
        return committees.join(', ');
    }

    function formatCommitteeDetails(committees = []) {
        if (!committees || committees.length === 0) {
            return '';
        }
        const label = committees.length > 1 ? 'Komitéer' : 'Komité';
        return `<p><strong>${label}:</strong> ${committees.join(', ')}</p>`;
    }

    function getCommitteeGroupPriority(name = '') {
        if (name === 'Ikke tildelt komité') return 2;
        if (name === 'Stortingspresident') return 1;
        return 0;
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
