// js/navigation.js - Sentralisert logikk for desktop og mobil navigasjon (OPPDATERT)

document.addEventListener('DOMContentLoaded', function() {
    console.log("Navigation JS: DOM loaded.");

    // Sjekk om konfigurasjonen er lastet
    if (typeof window.navigationConfig === 'undefined' || !window.navigationConfig.navLinks) {
        console.error("Navigation JS: navigationConfig not found or is invalid.");
        return; // Avslutt hvis konfigurasjonen mangler
    }

    // Fyller desktop navigasjon (nå med aktiv markering)
    populateDesktopNav();

    // Fyller mobilmeny (uendret logikk)
    populateMobileMenu();

    // Setter opp menyhendelser (åpne/lukke)
    setupMenuEvents();
});

/**
 * Fyller navigasjonsområdet for desktop-visning.
 * Viser ALLE lenker og markerer den aktive siden.
 */
function populateDesktopNav() {
    const desktopNav = document.querySelector('.nav-links'); // Bruker klasse for desktop nav container

    // Avslutt hvis container ikke finnes på denne siden
    if (!desktopNav) {
        console.log("Navigation JS: Desktop nav container (.nav-links) not found on this page.");
        return;
    }

    // Tøm eksisterende navigasjon
    desktopNav.innerHTML = '';

    // Finn gjeldende filnavn for å markere aktiv lenke
    const currentPage = window.location.pathname.split('/').pop() || 'index.html';
    console.log("Navigation JS: Current page for desktop nav active state:", currentPage);

    // Legg til lenker fra konfigurasjon
    window.navigationConfig.navLinks.forEach(link => {
        const navLink = document.createElement('a');
        navLink.href = link.href;
        navLink.className = 'nav-link'; // Bruker klasse fra styles.css
        navLink.textContent = link.title;

        // *** ENDRING: Marker aktiv side ***
        if (link.href === currentPage) {
            navLink.classList.add('active'); // Legg til 'active' klasse for styling
            console.log("Navigation JS: Marking desktop link as active:", link.href);
            // Gjør lenken ikke-klikkbar hvis ønskelig (via CSS: pointer-events: none;)
        }

        desktopNav.appendChild(navLink);
    });
    console.log("Navigation JS: Desktop nav populated with active state.");
}

/**
 * Fyller innholdet i mobilmenyen.
 * Markerer lenken til den gjeldende siden som aktiv.
 * (Denne funksjonen er uendret)
 */
function populateMobileMenu() {
    const mobileMenuItemsContainer = document.getElementById('mobileMenuItems');

    // Avslutt hvis container ikke finnes
    if (!mobileMenuItemsContainer) {
        console.error("Navigation JS: Mobile menu item container (#mobileMenuItems) not found!");
        return;
    }

    // Tøm eksisterende navigasjon
    mobileMenuItemsContainer.innerHTML = '';

    // Finn gjeldende filnavn for å markere aktiv lenke
    const currentPage = window.location.pathname.split('/').pop() || 'index.html';
    console.log("Navigation JS: Current page for mobile menu active state:", currentPage);

    // Legg til lenker fra konfigurasjon
    window.navigationConfig.navLinks.forEach(link => {
        const menuLink = document.createElement('a');
        menuLink.href = link.href;
        // Klassen settes i styles.css, ikke her
        menuLink.textContent = link.title;

        // Marker aktiv side
        if (link.href === currentPage) {
            menuLink.classList.add('active'); // Legg til 'active' klasse for styling
            console.log("Navigation JS: Marking mobile link as active:", link.href);
        }

        mobileMenuItemsContainer.appendChild(menuLink);
    });
    console.log("Navigation JS: Mobile menu populated.");
}

/**
 * Setter opp hendelseslyttere for å åpne og lukke mobilmenyen.
 * (Denne funksjonen er uendret)
 */
function setupMenuEvents() {
    const burgerMenuButton = document.getElementById('burgerMenu');
    const mobileMenuContainer = document.getElementById('mobileMenu');
    const closeMenuButton = document.getElementById('closeMenu');
    const menuOverlay = document.getElementById('menuOverlay');

    // Dobbeltsjekk at alle elementene finnes
    if (!burgerMenuButton || !mobileMenuContainer || !closeMenuButton || !menuOverlay) {
        console.error("Navigation JS: One or more menu control elements not found. IDs needed: burgerMenu, mobileMenu, closeMenu, menuOverlay");
        return; // Avslutt hvis et element mangler
    }
    console.log("Navigation JS: All menu elements found, setting up events.");

    // Funksjon for å åpne menyen
    function openMenu() {
        console.log("Navigation JS: Opening menu.");
        mobileMenuContainer.classList.add('active');
        menuOverlay.classList.add('active');
        document.body.classList.add('menu-open'); // Legg til klasse på body
    }

    // Funksjon for å lukke menyen
    function closeMenu() {
        console.log("Navigation JS: Closing menu.");
        mobileMenuContainer.classList.remove('active');
        menuOverlay.classList.remove('active');
        document.body.classList.remove('menu-open'); // Fjern klasse fra body
    }

    // Legg til hendelseslytter for burger-knappen
    burgerMenuButton.addEventListener('click', openMenu);

    // Legg til hendelseslytter for lukkeknappen
    closeMenuButton.addEventListener('click', closeMenu);

    // Legg til hendelseslytter for overlay-klikking
    menuOverlay.addEventListener('click', closeMenu);

    console.log("Navigation JS: Menu events set up successfully.");
}
