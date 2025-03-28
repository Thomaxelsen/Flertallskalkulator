// navigation.js - Forenklet og robust mobilmeny
document.addEventListener('DOMContentLoaded', function() {
    console.log("DOM fully loaded");
    
    // Fyller desktop navigasjon
    populateDesktopNav();
    
    // Fyller mobilmeny
    populateMobileMenu();
    
    // Setter opp menyhendelser
    setupMenuEvents();
});

// Fyller desktop navigasjon
function populateDesktopNav() {
    const desktopNav = document.querySelector('.nav-links');
    if (!desktopNav) return;
    
    // Tøm eksisterende navigasjon
    desktopNav.innerHTML = '';
    
    // Finn gjeldende side
    const currentPage = window.location.pathname.split('/').pop() || 'index.html';
    
    // Legg til lenker fra konfigurasjon
    if (window.navigationConfig && window.navigationConfig.navLinks) {
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
    }
}

// Fyller mobilmeny
function populateMobileMenu() {
    const mobileMenuItems = document.getElementById('mobileMenuItems');
    if (!mobileMenuItems) return;
    
    // Tøm eksisterende navigasjon
    mobileMenuItems.innerHTML = '';
    
    // Finn gjeldende side
    const currentPage = window.location.pathname.split('/').pop() || 'index.html';
    
    // Legg til lenker fra konfigurasjon
    if (window.navigationConfig && window.navigationConfig.navLinks) {
        window.navigationConfig.navLinks.forEach(link => {
            const menuLink = document.createElement('a');
            menuLink.href = link.href;
            menuLink.textContent = link.title;
            
            // Marker aktiv side
            if (link.href === currentPage) {
                menuLink.className = 'active';
            }
            
            mobileMenuItems.appendChild(menuLink);
        });
    }
}

// Setter opp menyhendelser
function setupMenuEvents() {
    const burgerMenu = document.getElementById('burgerMenu');
    const mobileMenu = document.getElementById('mobileMenu');
    const closeMenu = document.getElementById('closeMenu');
    const menuOverlay = document.getElementById('menuOverlay');
    
    // Hvis disse elementene mangler, avbryt
    if (!burgerMenu || !mobileMenu || !closeMenu || !menuOverlay) {
        console.error("Needed menu elements not found");
        return;
    }
    
    // Åpne menyen når burgeren klikkes
    burgerMenu.addEventListener('click', function() {
        console.log("Burger clicked");
        mobileMenu.classList.add('active');
        menuOverlay.classList.add('active');
        document.body.style.overflow = 'hidden';
    });
    
    // Legg til onclick som backup
    burgerMenu.onclick = function() {
        mobileMenu.classList.add('active');
        menuOverlay.classList.add('active');
        document.body.style.overflow = 'hidden';
        return true;
    };
    
    // Lukk menyen når lukkeknappen klikkes
    closeMenu.addEventListener('click', function() {
        console.log("Close button clicked");
        mobileMenu.classList.remove('active');
        menuOverlay.classList.remove('active');
        document.body.style.overflow = '';
    });
    
    // Legg til onclick som backup
    closeMenu.onclick = function() {
        mobileMenu.classList.remove('active');
        menuOverlay.classList.remove('active');
        document.body.style.overflow = '';
        return true;
    };
    
    // Lukk menyen når overlay klikkes
    menuOverlay.addEventListener('click', function() {
        console.log("Overlay clicked");
        mobileMenu.classList.remove('active');
        menuOverlay.classList.remove('active');
        document.body.style.overflow = '';
    });
    
    // Legg til onclick som backup
    menuOverlay.onclick = function() {
        mobileMenu.classList.remove('active');
        menuOverlay.classList.remove('active');
        document.body.style.overflow = '';
        return true;
    };
}
