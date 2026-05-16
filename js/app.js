// Theme Initialization (Blocking script to prevent FOUC)
const initTheme = () => {
    const savedTheme = localStorage.getItem('glamour-theme');
    const prefersLight = window.matchMedia('(prefers-color-scheme: light)').matches;
    
    if (savedTheme === 'light' || (!savedTheme && prefersLight)) {
        document.documentElement.setAttribute('data-theme', 'light');
    }
};
initTheme();

const app = (() => {
    // State
    let cart = [];
    let currentFilter = 'Tout';
    let searchQuery = '';

    // DOM Elements
    const sections = document.querySelectorAll('.spa-section');
    const navLinks = document.querySelectorAll('.nav-links a');
    const productsGrid = document.getElementById('productsGrid');
    const filterBtns = document.querySelectorAll('.filter-btn');
    const searchInput = document.getElementById('searchInput');
    const productDetailContainer = document.getElementById('productDetailContainer');
    
    const cartOpenBtn = document.getElementById('cartOpenBtn');
    const cartCloseBtn = document.getElementById('cartCloseBtn');
    const cartOverlay = document.getElementById('cartOverlay');
    const cartOverlayBg = document.getElementById('cartOverlayBg');
    const cartItemsContainer = document.getElementById('cartItemsContainer');
    const cartBadge = document.getElementById('cartBadge');
    const cartTotalPrice = document.getElementById('cartTotalPrice');
    
    const themeToggleBtn = document.getElementById('themeToggleBtn');
    const themeIcon = document.getElementById('themeIcon');

    // Navigation
    const navigateTo = (targetId) => {
        sections.forEach(sec => sec.classList.remove('active'));
        document.getElementById(targetId).classList.add('active');

        navLinks.forEach(link => {
            link.classList.remove('active');
            if (link.dataset.target === targetId) {
                link.classList.add('active');
            }
        });
        window.scrollTo(0, 0);
    };

    const setupNavigation = () => {
        navLinks.forEach(link => {
            link.addEventListener('click', (e) => {
                e.preventDefault();
                navigateTo(e.target.dataset.target);
            });
        });
    };

    // Render Products in Shop
    const renderProducts = () => {
        let filtered = products;

        // Filter by category
        if (currentFilter !== 'Tout') {
            filtered = filtered.filter(p => p.category === currentFilter);
        }

        // Filter by search
        if (searchQuery) {
            const query = searchQuery.toLowerCase();
            filtered = filtered.filter(p => 
                p.name.toLowerCase().includes(query) || 
                p.description.toLowerCase().includes(query)
            );
        }

        if (filtered.length === 0) {
            productsGrid.innerHTML = `<p style="grid-column: 1/-1; text-align: center; color: var(--clr-text-muted);">Aucun parfum trouvé.</p>`;
            return;
        }

        productsGrid.innerHTML = filtered.map(product => `
            <div class="product-card" onclick="app.viewProduct(${product.id})">
                <img src="${product.image}" alt="${product.name}" class="product-image">
                <div class="product-info">
                    <span class="product-category">${product.category}</span>
                    <h3 class="product-name">${product.name}</h3>
                    <p class="product-price">${product.price} MAD</p>
                    <button class="add-to-cart-btn" onclick="event.stopPropagation(); app.addToCart(${product.id})">
                        Ajouter au panier
                    </button>
                </div>
            </div>
        `).join('');
    };

    const setupFilters = () => {
        filterBtns.forEach(btn => {
            btn.addEventListener('click', (e) => {
                filterBtns.forEach(b => b.classList.remove('active'));
                e.target.classList.add('active');
                currentFilter = e.target.dataset.filter;
                renderProducts();
            });
        });

        searchInput.addEventListener('input', (e) => {
            searchQuery = e.target.value;
            renderProducts();
        });
    };

    const filterByCategory = (category) => {
        currentFilter = category;
        filterBtns.forEach(b => {
             b.classList.remove('active');
             if(b.dataset.filter === category) b.classList.add('active');
        });
        searchQuery = '';
        searchInput.value = '';
        renderProducts();
    };

    // View Single Product
    const viewProduct = (id) => {
        const product = products.find(p => p.id === id);
        if (!product) return;

        productDetailContainer.innerHTML = `
            <div class="product-detail-nav">
                <button class="back-btn" onclick="app.navigateTo('shop')">
                    <i class="ph ph-arrow-left"></i> Retour
                </button>
            </div>
            <div class="detail-image">
                <img src="${product.image}" alt="${product.name}">
            </div>
            <div class="detail-info">
                <span class="detail-brand">Pour ${product.category}</span>
                <h1 class="detail-title">${product.name}</h1>
                <div class="detail-price">${product.price} MAD</div>
                <p class="detail-desc">${product.description}</p>
                
                <div class="olfactory-notes">
                    <div class="note-item">
                        <span class="note-label">Notes de Tête</span>
                        <span class="note-value">${product.notes.tete}</span>
                    </div>
                    <div class="note-item">
                        <span class="note-label">Notes de Cœur</span>
                        <span class="note-value">${product.notes.coeur}</span>
                    </div>
                    <div class="note-item">
                        <span class="note-label">Notes de Fond</span>
                        <span class="note-value">${product.notes.fond}</span>
                    </div>
                </div>

                <div class="detail-actions">
                    <button class="btn btn-primary" onclick="app.addToCart(${product.id}, true)">Ajouter au panier</button>
                    <button class="btn" onclick="app.addToCart(${product.id}, true); app.checkout()">Acheter maintenant</button>
                </div>
            </div>
        `;
        navigateTo('product');
    };

    // Cart Management
    const toggleCart = () => {
        cartOverlay.classList.toggle('open');
        cartOverlayBg.classList.toggle('active');
    };

    const addToCart = (id, openCart = false) => {
        const product = products.find(p => p.id === id);
        const existingItem = cart.find(item => item.id === id);

        if (existingItem) {
            existingItem.qty += 1;
        } else {
            cart.push({ ...product, qty: 1 });
        }
        
        updateCartUI();
        if(openCart) toggleCart();
        else {
            // Flash badge to indicate addition
            cartBadge.style.transform = 'scale(1.5)';
            setTimeout(() => { cartBadge.style.transform = 'scale(1)'; }, 200);
        }
    };

    const updateQuantity = (id, delta) => {
        const item = cart.find(i => i.id === id);
        if(!item) return;
        
        item.qty += delta;
        if (item.qty <= 0) {
            removeItem(id);
        } else {
            updateCartUI();
        }
    };

    const removeItem = (id) => {
        cart = cart.filter(item => item.id !== id);
        updateCartUI();
    };

    const updateCartUI = () => {
        // Update badge
        const totalItems = cart.reduce((sum, item) => sum + item.qty, 0);
        cartBadge.textContent = totalItems;

        // Update list
        if (cart.length === 0) {
            cartItemsContainer.innerHTML = '<p style="color: var(--clr-text-muted); text-align: center; margin-top: 2rem;">Votre panier est vide.</p>';
            cartTotalPrice.textContent = '0 MAD';
            return;
        }

        cartItemsContainer.innerHTML = cart.map(item => `
            <div class="cart-item">
                <img src="${item.image}" alt="${item.name}">
                <div class="cart-item-info">
                    <h4 class="cart-item-title">${item.name}</h4>
                    <div class="cart-item-price">${item.price} MAD</div>
                    <div class="qty-controls">
                        <button class="qty-btn" onclick="app.updateQuantity(${item.id}, -1)">-</button>
                        <span>${item.qty}</span>
                        <button class="qty-btn" onclick="app.updateQuantity(${item.id}, 1)">+</button>
                    </div>
                </div>
                <div style="text-align: right;">
                    <br>
                    <span class="remove-item" onclick="app.removeItem(${item.id})">Supprimer</span>
                </div>
            </div>
        `).join('');

        // Update Total
        const total = cart.reduce((sum, item) => sum + (item.price * item.qty), 0);
        cartTotalPrice.textContent = `${total} MAD`;
    };

    const checkout = () => {
        if (cart.length === 0) {
            alert("Votre panier est vide !");
            return;
        }
        // Simulated checkout
        alert("Redirection vers la passerelle de paiement sécurisée... Merci de votre confiance !");
        cart = [];
        updateCartUI();
        toggleCart();
    };

    const setupTheme = () => {
        // Initial icon state
        if (document.documentElement.getAttribute('data-theme') === 'light') {
            themeIcon.classList.remove('ph-moon');
            themeIcon.classList.add('ph-sun');
        }

        themeToggleBtn.addEventListener('click', () => {
            const currentTheme = document.documentElement.getAttribute('data-theme');
            if (currentTheme === 'light') {
                document.documentElement.removeAttribute('data-theme');
                localStorage.setItem('glamour-theme', 'dark');
                themeIcon.classList.remove('ph-sun');
                themeIcon.classList.add('ph-moon');
            } else {
                document.documentElement.setAttribute('data-theme', 'light');
                localStorage.setItem('glamour-theme', 'light');
                themeIcon.classList.remove('ph-moon');
                themeIcon.classList.add('ph-sun');
            }
        });
    };

    const setupCartTriggers = () => {
        cartOpenBtn.addEventListener('click', toggleCart);
        cartCloseBtn.addEventListener('click', toggleCart);
        cartOverlayBg.addEventListener('click', toggleCart);
    };

    // Init
    const init = () => {
        setupNavigation();
        setupFilters();
        setupCartTriggers();
        setupTheme();
        renderProducts();
        updateCartUI(); // Initial clear state
    };

    // Public API
    return {
        init,
        viewProduct,
        addToCart,
        updateQuantity,
        removeItem,
        checkout,
        filterByCategory,
        navigateTo
    };
})();

// Boot App and Magical Preloader
document.addEventListener('DOMContentLoaded', () => {
    app.init();
    
    // Create Magic Particles
    const particlesContainer = document.getElementById('particlesContainer');
    if (particlesContainer) {
        for (let i = 0; i < 40; i++) {
            const particle = document.createElement('div');
            particle.classList.add('particle');
            
            // Random styling for depth and organic feel
            const size = Math.random() * 4 + 2; 
            const left = Math.random() * 100; 
            const delay = Math.random() * 5; 
            const duration = Math.random() * 5 + 7; 
            
            particle.style.width = `${size}px`;
            particle.style.height = `${size}px`;
            particle.style.left = `${left}%`;
            particle.style.animationDelay = `${delay}s`;
            particle.style.animationDuration = `${duration}s`;
            
            particlesContainer.appendChild(particle);
        }
    }
});

// Preloader & Reveal Logic
window.addEventListener('load', () => {
    // Add artificial delay to ensure the user sees the luxury preloader
    setTimeout(() => {
        document.body.classList.add('loaded');
        
        // Remove preloader from DOM after transition completes to clean up
        setTimeout(() => {
            const preloader = document.getElementById('preloader');
            if(preloader) preloader.remove();
        }, 1000); // Wait for the slide-up transition to finish
    }, 1500);
});
