// WhatsApp number in international format WITHOUT plus, e.g. "2348012345678"
    const SELLER_WHATSAPP = "YOUR_WHATSAPP_NUMBER";

    const BANK_INFO = {
      bank: "REPLACE_BANK_NAME",
      accountName: "REPLACE_ACCOUNT_NAME",
      accountNumber: "REPLACE_ACCOUNT_NUMBER"
    };
    /* ========== END CONFIG ========== */

    // Initialization: cart button open/close + mobile menu interactions
(function initUI(){
  // Cart toggle
  cartBtn.addEventListener('click', ()=> cartPanel.classList.add('open'));
  closeCart.addEventListener('click', ()=> cartPanel.classList.remove('open'));

  // Hamburger menu
  const hamburger = document.getElementById("hamburger");
  const closeBtn = document.getElementById("closeBtn");
  const mobileMenu = document.getElementById("mobileMenu");

  if (hamburger && mobileMenu) {
    hamburger.addEventListener("click", () => {
      mobileMenu.classList.add("active");
      document.body.style.overflow = "hidden"; // prevent background scroll
    });
  }

  if (closeBtn && mobileMenu) {
    closeBtn.addEventListener("click", () => {
      mobileMenu.classList.remove("active");
      document.body.style.overflow = ""; // restore scroll
    });
  }

  // Dropdown toggles inside mobile menu
  const toggles = document.querySelectorAll(".mobile-menu .toggle");
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

// Search handlers
document.getElementById("openSearch").addEventListener("click", function(e) {
  e.preventDefault();
  const searchBox = document.getElementById("floatingSearch");
  searchBox.classList.toggle("active");
  document.getElementById("q").focus();
});

document.getElementById("q").addEventListener("keypress", function(e) {
  if (e.key === "Enter") {
    const query = this.value.trim();
    if (query) {
      // ✅ redirect to collection page with query
      window.location.href = "collection3.html?tag=" + encodeURIComponent(query);
    }
  }
});




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

