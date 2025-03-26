// navigation.js - Håndterer hamburgermeny og navigasjon

document.addEventListener('DOMContentLoaded', function() {
    // Legg til hamburgermenyen i DOM
    createHamburgerMenu();
    
    // Sett opp event listeners
    setupEventListeners();
});

// Funksjon for å lage hamburgermenyen
function createHamburgerMenu() {
    // Hent header-elementet
    const header = document.querySelector('header');
    
    // Opprett HTML for hamburgermenyen
    const menuHTML = `
        <div class="hamburger-nav">
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
                    <!-- Flere lenker kan legges til her etterhvert -->
                </nav>
            </div>
        </div>
    `;
    
    // Legg til hamburgermenyen i header
    // Bruk insertAdjacentHTML for å ikke overskrive eksisterende elementer
    header.insertAdjacentHTML('beforeend', menuHTML);
}

// Funksjon for å sette opp event listeners
function setupEventListeners() {
    // Hent nødvendige elementer
    const hamburgerButton = document.getElementById('hamburgerButton');
    const closeMenuButton = document.getElementById('closeMenu');
    const navMenu = document.getElementById('navMenu');
    
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