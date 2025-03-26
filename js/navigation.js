// navigation.js - Håndterer hamburgermeny og navigasjon

// Legg til debugging på global nivå
console.log("Navigation.js lastet");

// Flagg for å unngå dobbel initialisering
let navigationInitialized = false;

// Kjør initialisering umiddelbart
(function() {
    console.log("IIFE utføres");
    
    // Forsøker å initialisere umiddelbart
    tryInitialize();
    
    // Setter opp event listeners på flere nivåer for backup
    document.addEventListener('DOMContentLoaded', function() {
        console.log("DOMContentLoaded utløst");
        tryInitialize();
    });
    
    window.addEventListener('load', function() {
        console.log("Window load utløst");
        tryInitialize();
        
        // Ekstra forsinkelse på 500ms som siste utvei
        setTimeout(tryInitialize, 500);
    });
    
    // Ekstra sikkerhetstimer
    setTimeout(tryInitialize, 1000);
})();

// Funksjon som forsøker å initialisere nav
function tryInitialize() {
    if (navigationInitialized) {
        console.log("Navigation allerede initialisert, hopper over");
        return;
    }
    
    console.log("Forsøker å initialisere navigasjon");
    initializeNavigation();
}

// Hovedinitialisering
function initializeNavigation() {
    console.log("initializeNavigation kjører");
    
    // Unngå dobbel initialisering
    if (navigationInitialized) {
        console.log("Allerede initialisert, returnerer");
        return;
    }
    
    // Sjekk om hamburgermenyen allerede finnes
    if (document.querySelector('.hamburger-nav')) {
        console.log("Hamburgermeny eksisterer allerede");
        navigationInitialized = true;
        // Oppdater bare event listeners for eksisterende meny
        setupEventListeners();
        return;
    }
    
    // Marker at vi har initialisert
    navigationInitialized = true;
    console.log("Setter navigationInitialized = true");
    
    console.log("Oppretter hamburgermeny");
    // Opprett hamburgermenyen
    createHamburgerMenu();
    
    console.log("Setter opp event listeners");
    // Sett opp event listeners
    setupEventListeners();
}

function createHamburgerMenu() {
    // Opprett en container for hamburgermenyen
    const hamburgerNav = document.createElement('div');
    hamburgerNav.className = 'hamburger-nav';
    hamburgerNav.id = 'hamburgerNav';
    
    // Sett HTML-innhold
    hamburgerNav.innerHTML = `
        <button class="hamburger-button" id="hamburgerButton" aria-label="Meny">
            <span class="hamburger-line"></span>
            <span class="hamburger-line"></span>
            <span class="hamburger-line"></span>
        </button>
        <div class="nav-menu" id="navMenu">
            <div class="nav-menu-header">
                <span class="menu-title">Meny</span>
                <button class="close-menu" id="closeMenu">&times;</button>
            </div>
            <nav class="nav-menu-links">
                <a href="index.html" class="menu-link">Flertallskalkulator</a>
                <a href="party-overview.html" class="menu-link">Partioversikt</a>
            </nav>
        </div>
    `;
    
    // Legg til i siden
    const container = document.querySelector('.container');
    if (container) {
        console.log("Container funnet, legger til hamburgermeny");
        // Legg til som første barn innenfor container
        container.insertBefore(hamburgerNav, container.firstChild);
    } else {
        console.log("Container ikke funnet, legger til i body");
        // Fallback: Legg til i body
        document.body.appendChild(hamburgerNav);
    }
}

// Funksjon for å sette opp event listeners
function setupEventListeners() {
    console.log("setupEventListeners kjører");
    
    // Hent nødvendige elementer
    const hamburgerButton = document.getElementById('hamburgerButton');
    const closeMenuButton = document.getElementById('closeMenu');
    const navMenu = document.getElementById('navMenu');
    
    if (!hamburgerButton) {
        console.error("Hamburger-knapp ikke funnet");
    }
    
    if (!closeMenuButton) {
        console.error("Lukkeknapp ikke funnet");
    }
    
    if (!navMenu) {
        console.error("Nav-meny ikke funnet");
    }
    
    if (!hamburgerButton || !closeMenuButton || !navMenu) {
        console.error("Kunne ikke finne nødvendige menyelementer");
        return;
    }
    
    // Fjern eventuelle eksisterende event listeners
    // (Dette er umulig direkte i JavaScript, men vi kan erstatte elementene)
    const newHamburgerButton = hamburgerButton.cloneNode(true);
    hamburgerButton.parentNode.replaceChild(newHamburgerButton, hamburgerButton);
    
    const newCloseButton = closeMenuButton.cloneNode(true);
    closeMenuButton.parentNode.replaceChild(newCloseButton, closeMenuButton);
    
    // Oppdater referansene
    const updatedHamburgerButton = document.getElementById('hamburgerButton');
    const updatedCloseButton = document.getElementById('closeMenu');
    
    // Toggle meny når hamburgerknappen klikkes
    updatedHamburgerButton.addEventListener('click', function(e) {
        console.log("Hamburgerknapp klikket");
        e.preventDefault();
        e.stopPropagation();
        navMenu.classList.toggle('active');
        document.body.classList.toggle('menu-open'); // Hindrer scrolling når menyen er åpen
    });
    
    // Legg til inline onclick handler som backup
    updatedHamburgerButton.setAttribute('onclick', "document.getElementById('navMenu').classList.toggle('active'); document.body.classList.toggle('menu-open'); return false;");
    
    // Lukk meny når lukkeknappen klikkes
    updatedCloseButton.addEventListener('click', function(e) {
        console.log("Lukkeknapp klikket");
        e.preventDefault();
        e.stopPropagation();
        navMenu.classList.remove('active');
        document.body.classList.remove('menu-open');
    });
    
    // Inline onclick handler som backup
    updatedCloseButton.setAttribute('onclick', "document.getElementById('navMenu').classList.remove('active'); document.body.classList.remove('menu-open'); return false;");
    
    // Lukk menyen når man klikker utenfor
    document.addEventListener('click', function(event) {
        // Sjekk om klikket er utenfor menyen og hamburgerknappen
        if (navMenu.classList.contains('active') && 
            !navMenu.contains(event.target) && 
            !document.getElementById('hamburgerButton').contains(event.target)) {
            console.log("Klikk utenfor menyen oppdaget");
            navMenu.classList.remove('active');
            document.body.classList.remove('menu-open');
        }
    });
    
    // Marker aktiv side i menyen
    highlightCurrentPage();
}

// Funksjon for å markere aktiv side i menyen
function highlightCurrentPage() {
    // Finn nåværende side ved å sjekke URL
    const currentPage = window.location.pathname.split('/').pop();
    console.log("Nåværende side:", currentPage);
    
    // Finn alle navigasjonslenker
    const menuLinks = document.querySelectorAll('.menu-link');
    
    // Gå gjennom alle lenker og marker den aktive
    menuLinks.forEach(link => {
        const linkPage = link.getAttribute('href');
        
        if (currentPage === linkPage || 
            (currentPage === '' && linkPage === 'index.html') ||
            (currentPage === '/' && linkPage === 'index.html')) {
            link.classList.add('active');
            console.log("Markerte aktiv lenke:", linkPage);
        }
    });
}

// Eksporter funksjoner i tilfelle de trengs av andre moduler
window.navigationModule = {
    initialize: initializeNavigation,
    createMenu: createHamburgerMenu,
    setupEvents: setupEventListeners
};
