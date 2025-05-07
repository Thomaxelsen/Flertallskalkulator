// js/navigation.js - Sentralisert logikk for desktop og mobil navigasjon (OPPDATERT for kategorier)

document.addEventListener('DOMContentLoaded', function() {
    console.log("Navigation JS (Categorized): DOM loaded.");

    if (typeof window.navigationConfig === 'undefined' || !window.navigationConfig.linkCategories) {
        console.error("Navigation JS: navigationConfig not found or is invalid (missing linkCategories).");
        return;
    }

    populateDesktopNav();
    populateMobileMenu();
    setupMenuEvents();
});

/**
 * Fyller navigasjonsområdet for desktop-visning med kategoriserte dropdowns.
 */
function populateDesktopNav() {
    const desktopNavContainer = document.querySelector('.nav-links');
    if (!desktopNavContainer) {
        console.log("Navigation JS: Desktop nav container (.nav-links) not found.");
        return;
    }
    desktopNavContainer.innerHTML = '';
    const currentPage = window.location.pathname.split('/').pop() || 'index.html';

    window.navigationConfig.linkCategories.forEach(category => {
        const categoryDropdownDiv = document.createElement('div');
        categoryDropdownDiv.className = 'nav-category-dropdown';

        const categoryTitleSpan = document.createElement('span');
        categoryTitleSpan.className = 'nav-category-title';
        categoryTitleSpan.textContent = category.categoryTitle;
        // Valgfritt: Legg til en pil eller indikator for dropdown
        // categoryTitleSpan.innerHTML += ' &#9662;'; // Nedoverpil

        categoryDropdownDiv.appendChild(categoryTitleSpan);

        const dropdownContentDiv = document.createElement('div');
        dropdownContentDiv.className = 'dropdown-content';

        let isCategoryActive = false;
        category.links.forEach(link => {
            const navLink = document.createElement('a');
            navLink.href = link.href;
            navLink.textContent = link.title;
            if (link.href === currentPage) {
                navLink.classList.add('active');
                isCategoryActive = true; // Merk kategorien som aktiv hvis en lenke i den er aktiv
            }
            dropdownContentDiv.appendChild(navLink);
        });

        if (isCategoryActive) {
            categoryTitleSpan.classList.add('active-category'); // For å style aktiv kategori annerledes
        }

        categoryDropdownDiv.appendChild(dropdownContentDiv);
        desktopNavContainer.appendChild(categoryDropdownDiv);
    });
    console.log("Navigation JS: Desktop nav populated with categories.");
}


/**
 * Fyller innholdet i mobilmenyen med kategorier.
 */
function populateMobileMenu() {
    const mobileMenuItemsContainer = document.getElementById('mobileMenuItems');
    if (!mobileMenuItemsContainer) {
        console.error("Navigation JS: Mobile menu item container (#mobileMenuItems) not found!");
        return;
    }
    mobileMenuItemsContainer.innerHTML = '';
    const currentPage = window.location.pathname.split('/').pop() || 'index.html';

    window.navigationConfig.linkCategories.forEach(category => {
        const categoryHeader = document.createElement('h4'); // Eller h3, div med klasse etc.
        categoryHeader.className = 'mobile-menu-category-title';
        categoryHeader.textContent = category.categoryTitle;
        mobileMenuItemsContainer.appendChild(categoryHeader);

        category.links.forEach(link => {
            const menuLink = document.createElement('a');
            menuLink.href = link.href;
            menuLink.textContent = link.title;
            if (link.href === currentPage) {
                menuLink.classList.add('active');
            }
            mobileMenuItemsContainer.appendChild(menuLink);
        });
    });
    console.log("Navigation JS: Mobile menu populated with categories.");
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

    if (!burgerMenuButton || !mobileMenuContainer || !closeMenuButton || !menuOverlay) {
        console.error("Navigation JS: One or more menu control elements not found.");
        return;
    }

    function openMenu() {
        mobileMenuContainer.classList.add('active');
        menuOverlay.classList.add('active');
        document.body.classList.add('menu-open');
    }

    function closeMenu() {
        mobileMenuContainer.classList.remove('active');
        menuOverlay.classList.remove('active');
        document.body.classList.remove('menu-open');
    }

    burgerMenuButton.addEventListener('click', openMenu);
    closeMenuButton.addEventListener('click', closeMenu);
    menuOverlay.addEventListener('click', closeMenu);
    console.log("Navigation JS: Menu events set up successfully.");
}
