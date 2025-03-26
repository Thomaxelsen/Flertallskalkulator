// navigation.js - Håndterer hamburgermeny og navigasjon

// Selvutførende funksjon for å garantere initialisering uavhengig av når scriptet laster
(function() {
    // Prøv å initialisere med det samme om dokumentet allerede er lastet
    if (document.readyState === 'complete' || document.readyState === 'interactive') {
        setTimeout(initializeNavigation, 1);
    } else {
        document.addEventListener('DOMContentLoaded', initializeNavigation);
    }
    
    // Backup: Kjør på window.load uansett
    window.addEventListener('load', initializeNavigation);
})();

// Flagg for å unngå dobbel initialisering
let navigationInitialized = false;

function initializeNavigation() {
    // Legg til en liten forsinkelse for å sikre at andre script har fullført rendering
    setTimeout(function() {
        // Unngå dobbel initialisering
        if (navigationInitialized) return;
        navigationInitialized = true;
        
        // Sjekk om hamburgermenyen allerede finnes
        if (document.querySelector('.hamburger-nav')) return;
        
        // Legg til hamburgermenyen direkte i body istedenfor header
        createHamburgerMenu();
        setupEventListeners();
    }, 100);
}

function createHamburgerMenu() {
    // Opprett en container for hamburgermenyen
    const hamburgerNav = document.createElement('div');
    hamburgerNav.className = 'hamburger-nav';
    
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
        // Legg til som første barn innenfor container
        container.insertBefore(hamburgerNav, container.firstChild);
    } else {
        // Fallback: Legg til i body
        document.body.appendChild(hamburgerNav);
    }
}

// Funksjon for å sette opp event listeners
function setupEventListeners() {
    // Hent nødvendige elementer
    const hamburgerButton = document.getElementById('hamburgerButton');
    const closeMenuButton = document.getElementById('closeMenu');
    const navMenu = document.getElementById('navMenu');
    
    if (!hamburgerButton || !closeMenuButton || !navMenu) {
        console.error("Kunne ikke finne nødvendige menyelementer");
        return;
    }
    
    // Toggle meny når hamburgerknappen klikkes
    hamburgerButton.addEventListener('click', function() {
        navMenu.classList.toggle('active');
        document.body.classList.toggle('menu-open'); // Hindrer scrolling når menyen er åpen
    });
    
    // Lukk meny når lukkeknappen klikkes
    closeMenuButton.addEventListener('click', function() {
        navMenu.classList.remove('active');
        document.body.classList.remove('menu-open');
    });
    
    // Lukk menyen når man klikker utenfor
    document.addEventListener('click', function(event) {
        // Sjekk om klikket er utenfor menyen og hamburgerknappen
        if (!navMenu.contains(event.target) && !hamburgerButton.contains(event.target)) {
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
    
    // Finn alle navigasjonslenker
    const menuLinks = document.querySelectorAll('.menu-link');
    
    // Gå gjennom alle lenker og marker den aktive
    menuLinks.forEach(link => {
        const linkPage = link.getAttribute('href');
        
        if (currentPage === linkPage || 
            (currentPage === '' && linkPage === 'index.html') ||
            (currentPage === '/' && linkPage === 'index.html')) {
            link.classList.add('active');
        }
    });
}
