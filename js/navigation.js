// navigation.js - Håndterer hovednavigasjon og hamburgermeny for alle sider
// Versjon 2.0 - Robust mobilmeny

// Flagg for å unngå dobbel initialisering
let navigationInitialized = false;

// Kjør initialisering når siden lastes
document.addEventListener('DOMContentLoaded', function() {
    console.log("DOM lastet - initialiserer navigasjon");
    initializeNavigation();
});

// Hovedfunksjon for å initialisere navigasjon
function initializeNavigation() {
    // Unngå dobbel initialisering
    if (navigationInitialized) {
        console.log("Navigasjon allerede initialisert, hopper over");
        return;
    }
    
    console.log("Initialiserer navigasjon");
    
    // Marker at vi har initialisert
    navigationInitialized = true;
    
    // Generer desktop-navigasjon
    updateDesktopNavigation();
    
    // Opprett mobilmeny
    createMobileMenu();
}

// Funksjon for å oppdatere desktop-navigasjonen
function updateDesktopNavigation() {
    const desktopNav = document.querySelector('.nav-links');
    if (!desktopNav) {
        console.warn("Desktop nav element ikke funnet");
        return;
    }
    
    // Tøm eksisterende navigasjon
    desktopNav.innerHTML = '';
    
    // Legg til lenker fra konfigurasjon
    if (window.navigationConfig && window.navigationConfig.navLinks) {
        // Finn gjeldende side
        const currentPage = window.location.pathname.split('/').pop() || 'index.html';
        
        window.navigationConfig.navLinks.forEach(link => {
            // Hvis lenken ikke er til gjeldende side, legg den til
            if (link.href !== currentPage) {
                const navLink = document.createElement('a');
                navLink.href = link.href;
                navLink.className = 'nav-link';
                navLink.textContent = link.title;
                desktopNav.appendChild(navLink);
            }
        });
    } else {
        console.warn("Navigasjonskonfigurasjon ikke funnet");
    }
}

// Funksjon for å opprette mobilmeny
function createMobileMenu() {
    console.log("Oppretter mobilmeny");
    
    // Sjekk om menyen allerede finnes
    if (document.getElementById('mobileMenuContainer')) {
        console.warn("Mobilmeny finnes allerede");
        return;
    }
    
    // 1. Opprett HTML-struktur for mobilmeny
    const menuContainer = document.createElement('div');
    menuContainer.id = 'mobileMenuContainer';
    
    // Hamburger-knapp
    const burgerButton = document.createElement('button');
    burgerButton.id = 'burgerButton';
    burgerButton.className = 'burger-button';
    burgerButton.setAttribute('aria-label', 'Åpne meny');
    burgerButton.innerHTML = `
        <span class="burger-line"></span>
        <span class="burger-line"></span>
        <span class="burger-line"></span>
    `;
    
    // Meny-container
    const mobileMenu = document.createElement('div');
    mobileMenu.id = 'mobileMenu';
    mobileMenu.className = 'mobile-menu';
    
    // Meny-header
    const menuHeader = document.createElement('div');
    menuHeader.className = 'menu-header';
    menuHeader.innerHTML = `
        <h3>Meny</h3>
        <button id="closeMenu" class="close-button" aria-label="Lukk meny">&times;</button>
    `;
    
    // Menylenker
    const menuItems = document.createElement('div');
    menuItems.className = 'menu-items';
    
    // Legg til navigasjonslenker
    if (window.navigationConfig && window.navigationConfig.navLinks) {
        window.navigationConfig.navLinks.forEach(link => {
            const menuLink = document.createElement('a');
            menuLink.href = link.href;
            menuLink.textContent = link.title;
            
            // Marker aktiv side
            const currentPage = window.location.pathname.split('/').pop() || 'index.html';
            if (link.href === currentPage) {
                menuLink.className = 'active';
            }
            
            menuItems.appendChild(menuLink);
        });
    } else {
        // Fallback hvis konfigurasjon mangler
        menuItems.innerHTML = `
            <a href="index.html">Flertallskalkulator</a>
            <a href="party-overview.html">Partioversikt</a>
            <a href="majority-coalitions.html">Flertallskoalisjoner</a>
        `;
    }
    
    // Overlay for mørk bakgrunn når menyen er åpen
    const overlay = document.createElement('div');
    overlay.id = 'menuOverlay';
    overlay.className = 'menu-overlay';
    
    // Sett sammen menystrukturen
    mobileMenu.appendChild(menuHeader);
    mobileMenu.appendChild(menuItems);
    
    menuContainer.appendChild(burgerButton);
    menuContainer.appendChild(mobileMenu);
    menuContainer.appendChild(overlay);
    
    // Legg til i DOM
    document.body.appendChild(menuContainer);
    
    // 2. Legg til CSS-stilene direkte (for å sikre at de er der)
    addMenuStyles();
    
    // 3. Legg til event listeners
    setupMobileMenuEvents();
}

// Funksjon for å legge til nødvendige CSS-stiler
function addMenuStyles() {
    // Sjekk om stilene allerede finnes
    if (document.getElementById('mobileMenuStyles')) {
        return;
    }
    
    const styleElement = document.createElement('style');
    styleElement.id = 'mobileMenuStyles';
    styleElement.textContent = `
        /* Mobilmeny-stiler */
        #burgerButton {
            position: fixed;
            top: 15px;
            left: 15px;
            z-index: 1001;
            background-color: white;
            border: none;
            border-radius: 5px;
            padding: 8px;
            box-shadow: 0 2px 5px rgba(0,0,0,0.2);
            cursor: pointer;
            display: none;
        }
        
        .burger-line {
            display: block;
            width: 25px;
            height: 3px;
            background-color: #003087;
            margin: 5px 0;
            border-radius: 3px;
        }
        
        .mobile-menu {
            position: fixed;
            top: 0;
            left: -280px;
            width: 280px;
            height: 100%;
            background-color: white;
            z-index: 1000;
            box-shadow: 2px 0 10px rgba(0,0,0,0.1);
            transition: left 0.3s ease;
            overflow-y: auto;
        }
        
        .mobile-menu.active {
            left: 0;
        }
        
        .menu-header {
            display: flex;
            justify-content: space-between;
            align-items: center;
            padding: 15px 20px;
            border-bottom: 1px solid #eee;
        }
        
        .menu-header h3 {
            margin: 0;
            color: #003087;
        }
        
        .close-button {
            background: none;
            border: none;
            font-size: 24px;
            color: #666;
            cursor: pointer;
        }
        
        .menu-items {
            padding: 20px;
        }
        
        .menu-items a {
            display: block;
            padding: 15px;
            margin-bottom: 10px;
            color: #333;
            text-decoration: none;
            border-radius: 8px;
            transition: background-color 0.2s;
        }
        
        .menu-items a:hover {
            background-color: #f0f0f0;
        }
        
        .menu-items a.active {
            background-color: #003087;
            color: white;
        }
        
        .menu-overlay {
            position: fixed;
            top: 0;
            left: 0;
            width: 100%;
            height: 100%;
            background-color: rgba(0,0,0,0.5);
            z-index: 999;
            display: none;
        }
        
        .menu-overlay.active {
            display: block;
        }
        
        body.menu-open {
            overflow: hidden;
        }
        
        /* Vis bare på mobil */
        @media (max-width: 768px) {
            #burgerButton {
                display: block;
            }
            
            .nav-links {
                display: none;
            }
        }
    `;
    
    document.head.appendChild(styleElement);
}

// Funksjon for å sette opp event listeners for mobilmenyen
function setupMobileMenuEvents() {
    console.log("Setter opp event listeners for mobilmeny");
    
    const burgerButton = document.getElementById('burgerButton');
    const mobileMenu = document.getElementById('mobileMenu');
    const closeButton = document.getElementById('closeMenu');
    const overlay = document.getElementById('menuOverlay');
    
    if (!burgerButton || !mobileMenu || !closeButton || !overlay) {
        console.error("Kunne ikke finne nødvendige menyelementer");
        return;
    }
    
    // Åpne menyen
    burgerButton.addEventListener('click', function(e) {
        e.preventDefault();
        e.stopPropagation();
        openMobileMenu();
    });
    
    // Direkte onclick som fallback
    burgerButton.onclick = function() {
        openMobileMenu();
        return false;
    };
    
    // Lukk menyen (via knapp)
    closeButton.addEventListener('click', function(e) {
        e.preventDefault();
        e.stopPropagation();
        closeMobileMenu();
    });
    
    // Direkte onclick som fallback
    closeButton.onclick = function() {
        closeMobileMenu();
        return false;
    };
    
    // Lukk menyen (via overlay)
    overlay.addEventListener('click', function() {
        closeMobileMenu();
    });
    
    // Lukk meny hvis vinduet blir resizet til desktop-størrelse
    window.addEventListener('resize', function() {
        if (window.innerWidth > 768 && mobileMenu.classList.contains('active')) {
            closeMobileMenu();
        }
    });
}

// Hjelpefunksjon for å åpne mobilmenyen
function openMobileMenu() {
    console.log("Åpner mobilmeny");
    const mobileMenu = document.getElementById('mobileMenu');
    const overlay = document.getElementById('menuOverlay');
    
    if (mobileMenu && overlay) {
        mobileMenu.classList.add('active');
        overlay.classList.add('active');
        document.body.classList.add('menu-open');
    }
}

// Hjelpefunksjon for å lukke mobilmenyen
function closeMobileMenu() {
    console.log("Lukker mobilmeny");
    const mobileMenu = document.getElementById('mobileMenu');
    const overlay = document.getElementById('menuOverlay');
    
    if (mobileMenu && overlay) {
        mobileMenu.classList.remove('active');
        overlay.classList.remove('active');
        document.body.classList.remove('menu-open');
    }
}

// Eksporter funksjoner for bruk i andre moduler
window.navigationModule = {
    initialize: initializeNavigation,
    updateDesktopNav: updateDesktopNavigation,
    openMobileMenu: openMobileMenu,
    closeMobileMenu: closeMobileMenu
};
