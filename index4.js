 /* ========== CONFIG: exact values from your second file ========== */
    const firebaseConfig = {
      apiKey: "AIzaSyD7IIHG7txvgUwgthDOf3CtGLVdbmLk_X0",
      authDomain: "kamandell.firebaseapp.com",
      projectId: "kamandell-8bc28",
      // optional: storageBucket, messagingSenderId, appId
    };
    // WhatsApp number in international format WITHOUT plus, e.g. "2348012345678"
    const SELLER_WHATSAPP = "YOUR_WHATSAPP_NUMBER";

    const BANK_INFO = {
      bank: "REPLACE_BANK_NAME",
      accountName: "REPLACE_ACCOUNT_NAME",
      accountNumber: "REPLACE_ACCOUNT_NUMBER"
    };
    /* ========== END CONFIG ========== */

    // init firebase
    firebase.initializeApp(firebaseConfig);
    const db = firebase.firestore();
    const storage = firebase.storage();





    // Shortcuts & helpers
    const $ = s => document.querySelector(s);
    const fmt = n => new Intl.NumberFormat('en-NG',{style:'currency',currency:'NGN',maximumFractionDigits:0}).format(n);

    // Elements used by the cart/checkout system
    const cartBtn = $('#cartBtn');
    const cartPanel = $('#cartPanel');
    const closeCart = $('#closeCart');
    const cartItemsEl = $('#cartItems');
    const subtotalEl = $('#subtotal');
    const cartCountEl = $('#cartCount');
    const checkoutOverlay = $('#checkoutOverlay');
    const closeCheckout = $('#closeCheckout');
    const confirmPaymentBtn = $('#confirmPaymentBtn');
    const cancelCheckout = $('#cancelCheckout');
    const custName = $('#custName');
    const custEmail = $('#custEmail');
    const custPhone = $('#custPhone');
    const orderNote = $('#orderNote');
    const orderCodeEl = $('#orderCode');
    const amountToPay = $('#amountToPay');
    const whatsappLink = $('#whatsappLink');
    const bankNameEl = $('#bankName');
    const accountNameEl = $('#accountName');
    const accountNumberEl = $('#accountNumber');

    // Insert visible bank info
    bankNameEl.textContent = BANK_INFO.bank;
    accountNameEl.textContent = BANK_INFO.accountName;
    accountNumberEl.textContent = BANK_INFO.accountNumber;

    // Demo fallback products (copied)
    const DEMO_PRODUCTS = [
      { id:'p1', name:'Samba OG', brand:'adidas', price:200000, image:'https://images.unsplash.com/photo-1608231387042-66d1773070a5?q=80&w=1200&auto=format&fit=crop', tags:['shoes','men','lifestyle'], badge:'7% off' },
      { id:'p2', name:'Max Cushioning', brand:'Skechers', price:143000, image:'https://images.unsplash.com/photo-1525966222134-fcfa99b8ae77?q=80&w=1200&auto=format&fit=crop', tags:['shoes','women','running'], badge:'36% off' },
      { id:'p3', name:'Arsenal Jersey', brand:'adidas', price:179000, image:'https://images.unsplash.com/photo-1526676037777-05a232554f77?q=80&w=1200&auto=format&fit=crop', tags:['jersey','men','football'] },
      { id:'p4', name:'Havaianas Top', brand:'Havaianas', price:8000, image:'https://images.unsplash.com/photo-1509631179647-0177331693ae?q=80&w=1200&auto=format&fit=crop', tags:['slides','unisex','sale'], badge:'30% off' },
      { id:'p5', name:'Gazelle', brand:'adidas', price:179000, image:'https://images.unsplash.com/photo-1542291026-7eec264c27ff?q=80&w=1200&auto=format&fit=crop', tags:['shoes','men','lifestyle'] }
    ];

    // State
    let PRODUCTS = []; // loaded from Firestore or fallback
    let state = { query:'', tag:'all', cart: JSON.parse(localStorage.getItem('cart')||'[]') };
    let currentOrderCode = null;
    let currentOrderTotal = 0;
    let lastOrderId = null;
    let lastOrderCode = null;

    function saveCart(){ localStorage.setItem('cart', JSON.stringify(state.cart)); }
    function setCartCount(){ cartCountEl.textContent = state.cart.reduce((s,i)=>s+i.qty,0); }

    // Render cart contents and compute subtotal
    function renderCart(){
      const rows = state.cart.map(ci=>{
        const p = PRODUCTS.find(x=>x.id===ci.id) || DEMO_PRODUCTS.find(x=>x.id===ci.id) || {};
        const line = (p.price||0) * ci.qty;
        return `
          <div class="cart-row">
            <img src="${p.image||''}" alt="${p.name||'Product'}"/>
            <div>
              <div style="font-weight:600">${p.name||'Product'}</div>
              <div class="muted">${fmt(p.price||0)} × ${ci.qty}</div>
              <div class="qty">
                <button onclick="setQty('${ci.id}',-1)">−</button>
                <span>${ci.qty}</span>
                <button onclick="setQty('${ci.id}',+1)">+</button>
                <button onclick="removeFromCart('${ci.id}')" style="margin-left:8px;color:var(--danger)">Remove</button>
              </div>
            </div>
            <strong>${fmt(line)}</strong>
          </div>`;
      }).join('');
      cartItemsEl.innerHTML = rows || '<p class="muted" style="color:var(--muted)">Your cart is empty</p>';
      const total = state.cart.reduce((s,ci)=>{ const p = PRODUCTS.find(x=>x.id===ci.id) || DEMO_PRODUCTS.find(x=>x.id===ci.id) || {}; return s + ((p.price||0)*ci.qty); },0);
      subtotalEl.textContent = fmt(total);
      return total;
    }

    // Cart operations
    function addToCart(id){
      const item = state.cart.find(i=>i.id===id);
      if(item) item.qty++; else state.cart.push({id, qty:1});
      saveCart(); setCartCount(); renderCart(); cartPanel.classList.add('open');
    }
    function setQty(id,delta){
      const it = state.cart.find(i=>i.id===id); if(!it) return;
      it.qty = Math.max(1, it.qty + delta); saveCart(); setCartCount(); renderCart();
    }
    function removeFromCart(id){ state.cart = state.cart.filter(i=>i.id!==id); saveCart(); setCartCount(); renderCart(); }

    // Expose cart functions for inline onclicks in product lists
    window.addToCart = addToCart;
    window.setQty = setQty;
    window.removeFromCart = removeFromCart;

    // Load products (attempt Firestore, fallback to DEMO)
    async function loadProducts() {
      try {
        let queryRef = db.collection('products');
        if (state.tag && state.tag !== 'all') {
          queryRef = queryRef.where('tags', 'array-contains', state.tag);
        }
        const snap = await queryRef.get();
        if (!snap.empty) {
          PRODUCTS = snap.docs.map(d => {
            const data = d.data();
            return {
              id: d.id,
              name: data.name || 'No name',
              brand: data.brand || '',
              price: data.price || 0,
              image: data.image || '',
              tags: Array.isArray(data.tags) ? data.tags : [],
              badge: data.badge || ''
            };
          });
          if (state.query) {
            const q = state.query.toLowerCase();
            PRODUCTS = PRODUCTS.filter(p =>
              p.name.toLowerCase().includes(q) ||
              (p.brand || '').toLowerCase().includes(q) ||
              (p.tags || []).some(tag => tag.toLowerCase().includes(q))
            );
          }
        } else {
          PRODUCTS = DEMO_PRODUCTS;
        }
      } catch (err) {
        console.warn('Firestore unavailable, using demo products', err);
        PRODUCTS = DEMO_PRODUCTS;
      }

      // If your page has product grids etc, you can call renderProducts here.
      renderCart();
      setCartCount();
    }

    // Checkout helpers
    function generateOrderCode(){
      const a = Date.now().toString(36).slice(-6).toUpperCase();
      const b = Math.random().toString(36).slice(2,6).toUpperCase();
      return `ORD-${a}-${b}`;
    }

    // Open checkout overlay (prefill, compute total, WA link)
    document.getElementById('checkoutBtn').addEventListener('click', ()=>{
      if(state.cart.length===0){ alert('Your cart is empty'); return; }
      const last = JSON.parse(localStorage.getItem('lastBuyer')||'{}');
      if(last.name) custName.value = last.name;
      if(last.email) custEmail.value = last.email;
      if(last.phone) custPhone.value = last.phone;
      orderNote.value = '';

      currentOrderTotal = renderCart();
      currentOrderCode = generateOrderCode();
      orderCodeEl.textContent = currentOrderCode;
      amountToPay.textContent = fmt(currentOrderTotal);

      const message = encodeURIComponent(
        `Hello ${BANK_INFO.accountName}, I placed an order.\n`+
        `Code: ${currentOrderCode}\nTotal: ${fmt(currentOrderTotal)}\n`+
        `I will send the transfer receipt shortly.`
      );
      whatsappLink.href = `https://wa.me/${SELLER_WHATSAPP}?text=${message}`;

      checkoutOverlay.style.display = 'flex';
    });

    // Checkout overlay controls
    closeCheckout.addEventListener('click', ()=> checkoutOverlay.style.display='none');
    cancelCheckout.addEventListener('click', ()=> checkoutOverlay.style.display='none');

    // Save order (pending) when user clicks "Payment Done — Save Order"
    confirmPaymentBtn.addEventListener('click', async ()=>{
      try {
        const name = custName.value.trim();
        const email = custEmail.value.trim();
        const phone = custPhone.value.trim();
        if(!name || !email || !phone){
          alert('Please fill name, email and WhatsApp phone.');
          return;
        }

        if(!window.firebase || !db){
          console.error('Firebase not initialized or db missing', window.firebase, db);
          alert('Firebase is not initialized. Check your firebaseConfig in the store file.');
          return;
        }

        localStorage.setItem('lastBuyer', JSON.stringify({name,email,phone}));

        if(!Array.isArray(state.cart) || state.cart.length === 0){
          alert('Your cart is empty.');
          return;
        }

        currentOrderTotal = currentOrderTotal || renderCart();
        currentOrderCode = currentOrderCode || generateOrderCode();

        const items = state.cart.map(ci => {
          const prod = (PRODUCTS || []).find(p => p.id === ci.id) || (DEMO_PRODUCTS || []).find(p => p.id === ci.id) || {};
          return {
            id: ci.id || prod.id || null,
            name: prod.name || ci.name || 'Product',
            price: prod.price || ci.price || 0,
            quantity: (ci.qty !== undefined ? ci.qty : (ci.quantity !== undefined ? ci.quantity : 1))
          };
        });

        const payload = {
          code: currentOrderCode,
          buyer: { name, email, phone },
          items,
          amount: currentOrderTotal,
          currency: 'NGN',
          note: (orderNote.value||'').trim() || "—",
          status: 'pending',
          createdAt: firebase.firestore.FieldValue.serverTimestamp()
        };

        console.log('Saving order payload:', payload);

        const docRef = await db.collection('orders').add(payload);
        console.log('Order saved id', docRef.id);

        lastOrderId = docRef.id;
        lastOrderCode = currentOrderCode;

        alert(`✅ Order saved!\nOrder Code: ${currentOrderCode}\nRef: ${docRef.id}`);

        // Clear cart and close overlays
        state.cart = []; saveCart(); setCartCount(); renderCart();
        cartPanel.classList.remove('open');
        checkoutOverlay.style.display='none';

      } catch(err) {
        console.error('Failed to save order', err);
        alert('Failed to save order. Error: ' + (err && err.message ? err.message : err));
      }
    });

    // Initialization: cart button open/close + mobile menu interactions
    (function initUI(){
      // cart open/close
      cartBtn.addEventListener('click', ()=> cartPanel.classList.add('open'));
      closeCart.addEventListener('click', ()=> cartPanel.classList.remove('open'));

      // mobile menu
      const hamburger = document.getElementById("hamburger");
      const closeBtn = document.getElementById("closeBtn");
      const mobileMenu = document.getElementById("mobileMenu");
      const toggles = document.querySelectorAll(".mobile-menu .toggle");

      hamburger.addEventListener("click", () => { mobileMenu.classList.add("active"); });
      closeBtn.addEventListener("click", () => { mobileMenu.classList.remove("active"); });

      toggles.forEach(toggle => {
        toggle.addEventListener("click", e => {
          e.preventDefault();
          let parent = toggle.parentElement;
          document.querySelectorAll(".mobile-menu li").forEach(li => {
            if (li !== parent) li.classList.remove("active");
          });
          parent.classList.toggle("active");
        });
      });
    })();

    // Run initial load
    setCartCount();
    loadProducts();

    // Optional: if your pages include product listing markup, use this renderProducts sample function
    // (not automatically used on every page — kept here for ease if you add a #products container)
    window.renderProducts = function renderProducts(containerSelector = '#products'){
      const container = document.querySelector(containerSelector);
      if(!container) return;
      const q = state.query.toLowerCase();
      const tag = state.tag;
      const items = (PRODUCTS || DEMO_PRODUCTS).filter(p =>
        (tag==='all' || (p.tags||[]).includes(tag)) &&
        (!q ||
          p.name.toLowerCase().includes(q) ||
          (p.brand||'').toLowerCase().includes(q) ||
          (p.tags || []).some(t => t.toLowerCase().includes(q))
        )
      );
      container.innerHTML = items.map(p => `
        <article class="card" aria-label="${p.name}" style="background:transparent;color:inherit;border-radius:12px;margin:6px;padding:8px">
          <img src="${p.image}" alt="${p.name}" style="width:100%;aspect-ratio:4/3;object-fit:cover;border-radius:8px">
          <div style="padding:8px">
            <div style="font-weight:700">${p.name}</div>
            <div style="opacity:.8">${fmt(p.price)}</div>
            <div style="margin-top:8px"><button class="btn btn-primary" onclick="addToCart('${p.id}')">Add to cart</button></div>
          </div>
        </article>
      `).join('');
    };





    function findSize() {
    const cm = parseFloat(document.getElementById("footLength").value);
    if (!cm || cm < 20 || cm > 35) {
      document.getElementById("result").innerHTML = "Please enter a valid foot length between 20–35 cm.";
      return;
    }

    // Convert cm to inches
    const inches = (cm / 2.54).toFixed(1);

    // Simple example size mapping (can be expanded)
    let us = "-", uk = "-", eu = "-";
    if (cm >= 24 && cm < 25) { us = 6; uk = 5.5; eu = 39; }
    else if (cm >= 25 && cm < 26) { us = 7; uk = 6.5; eu = 40; }
    else if (cm >= 26 && cm < 27) { us = 8; uk = 7.5; eu = 41; }
    else if (cm >= 27 && cm < 28) { us = 9; uk = 8.5; eu = 42; }
    else if (cm >= 28 && cm < 29) { us = 10; uk = 9.5; eu = 43; }
    else if (cm >= 29 && cm < 30) { us = 11; uk = 10.5; eu = 44; }
    else if (cm >= 30 && cm < 31) { us = 12; uk = 11.5; eu = 45; }

    document.getElementById("result").innerHTML = `
      <strong>Results:</strong><br>
      CM: ${cm} cm<br>
      Inches: ${inches}"<br>
      US: ${us}<br>
      UK: ${uk}<br>
      EU: ${eu}
    `;
  }
  
  const slides = document.querySelectorAll('.slide');
    const prevBtn = document.querySelector('.arrow2.left');
    const nextBtn = document.querySelector('.arrow2.right');
    let currentIndex = 0;
    let slideInterval = setInterval(nextSlide, 5000); // auto-slide every 5s

    function showSlide(index) {
      slides.forEach((slide, i) => {
        slide.classList.remove('active');
        if (i === index) slide.classList.add('active');
      });
    }

    function nextSlide() {
      currentIndex = (currentIndex + 1) % slides.length;
      showSlide(currentIndex);
    }

    function prevSlide() {
      currentIndex = (currentIndex - 1 + slides.length) % slides.length;
      showSlide(currentIndex);
    }

    nextBtn.addEventListener('click', () => {
      nextSlide();
      resetInterval();
    });

    prevBtn.addEventListener('click', () => {
      prevSlide();
      resetInterval();
    });

    function resetInterval() {
      clearInterval(slideInterval);
      slideInterval = setInterval(nextSlide, 5000);
    }


// Open floating search when nav link is clicked
document.getElementById("openSearch").addEventListener("click", function(e) {
  e.preventDefault();
  document.getElementById("floatingSearch").classList.toggle("active");
  document.getElementById("q").focus();
});

// Redirect to product page with query
document.getElementById("q").addEventListener("keypress", function(e) {
  if (e.key === "Enter") {
    const query = this.value.trim();
    if (query) {
      window.location.href = "collection3.html?tag=" + encodeURIComponent(query);
    }
  }
});

// Section 1 scroll
function scrollCarousel(direction) {
      const carousel = document.getElementById('carousel');
      const scrollAmount = 300; // px per click
      carousel.scrollBy({ left: direction * scrollAmount, behavior: 'smooth' });
    }
    
// Footer
// set copyright year
document.getElementById('year').textContent = (new Date()).getFullYear();

// Accordion only on mobile (<=768)
const headers = document.querySelectorAll('.footer-links h4');

function handleToggle(e) {
  // only allow toggle on mobile widths
  if (window.innerWidth > 768) return;

  const header = e.currentTarget;
  const parent = header.closest('.footer-links');
  const isActive = parent.classList.contains('active');

  if (isActive) {
    parent.classList.remove('active');
    header.setAttribute('aria-expanded', 'false');
  } else {
    parent.classList.add('active');
    header.setAttribute('aria-expanded', 'true');
  }
}

headers.forEach(h => {
  // Click
  h.addEventListener('click', handleToggle);

  // Keyboard: Enter / Space → trigger click
  h.addEventListener('keydown', ev => {
    if (ev.key === 'Enter' || ev.key === ' ') {
      ev.preventDefault();
      h.click(); // ✅ use the real click event
    }
  });

  // Initialize aria-expanded
  h.setAttribute('aria-expanded', 'false');
});

// Optional: close all when window resized to desktop
window.addEventListener('resize', () => {
  if (window.innerWidth > 768) {
    document.querySelectorAll('.footer-links').forEach(el => {
      el.classList.remove('active');
      const hdr = el.querySelector('h4');
      if (hdr) hdr.setAttribute('aria-expanded', 'false');
    });
  }
});



// Just arrived 2

(function(){
  const cards = document.querySelectorAll('.product-card2');

  cards.forEach(card => {
    const raw = card.getAttribute('data-images');
    if (!raw) return;
    let images;
    try {
      images = JSON.parse(raw);
      if (!Array.isArray(images) || images.length === 0) throw new Error('no images');
    } catch (err) {
      console.error('Invalid data-images on card', err, raw);
      return;
    }

    const imgEl = card.querySelector('img');
    const btnPrev = card.querySelector('.prev');
    const btnNext = card.querySelector('.next');

    // Preload images
    images.forEach(src => { const i = new Image(); i.src = src; });

    // store current index on dataset (string)
    card.dataset.index = '0';

    const setIndex = (newIndex) => {
      const n = images.length;
      const idx = ((newIndex % n) + n) % n; // wrap
      card.dataset.index = String(idx);
      if (imgEl) imgEl.src = images[idx];
    };

    // initialize
    setIndex(0);

    // Next / Prev handlers
    if (btnNext) btnNext.addEventListener('click', (e) => {
      e.stopPropagation();
      const cur = parseInt(card.dataset.index || '0', 10);
      setIndex(cur + 1);
    });

    if (btnPrev) btnPrev.addEventListener('click', (e) => {
      e.stopPropagation();
      const cur = parseInt(card.dataset.index || '0', 10);
      setIndex(cur - 1);
    });

    // Hover behavior: advance once, then optionally revert after delay
    let hoverRevertTimeout = null;
    card.addEventListener('mouseenter', () => {
      // advance to next
      const cur = parseInt(card.dataset.index || '0', 10);
      setIndex(cur + 1);

      // clear any existing timeout
      if (hoverRevertTimeout) {
        clearTimeout(hoverRevertTimeout);
        hoverRevertTimeout = null;
      }

      // revert after 3s to previous image (so hover shows next briefly)
      hoverRevertTimeout = setTimeout(() => {
        // revert to previous (cur)
        setIndex(cur);
        hoverRevertTimeout = null;
      }, 3000);
    });

    // If user clicks inside card (e.g. quick-buy), don't change slider state
    const quick = card.querySelector('.quick-buy2');
    if (quick) {
      quick.addEventListener('click', (e) => {
        e.stopPropagation();
        // quick-buy action: you can attach navigation here later
      });
    }

    // cleanup on mouseleave: keep the revert timeout if scheduled
    card.addEventListener('mouseleave', () => {
      // no immediate action
    });
  });
})();


