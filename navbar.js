   // ========== Mobile menu controls ==========
(function () {
  const hamburger = document.getElementById("hamburger");
  const closeBtn = document.getElementById("closeBtn");
  const mobileMenu = document.getElementById("mobileMenu");
  const toggles = document.querySelectorAll(".mobile-menu .toggle");

  if (hamburger && closeBtn && mobileMenu) {
    // open mobile menu
    hamburger.addEventListener("click", () => {
      mobileMenu.classList.add("active");
    });

    // close mobile menu
    closeBtn.addEventListener("click", () => {
      mobileMenu.classList.remove("active");
    });
  }

  if (toggles.length > 0) {
    toggles.forEach(toggle => {
      toggle.addEventListener("click", e => {
        e.preventDefault();
        let parent = toggle.parentElement;

        // close other open dropdowns
        document.querySelectorAll(".mobile-menu li").forEach(li => {
          if (li !== parent) li.classList.remove("active");
        });

        // toggle clicked one
        parent.classList.toggle("active");
      });
    });
  }
})();

     
    // === CONFIG: Firebase + Contact + Bank ===
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
    // === END CONFIG ===

    firebase.initializeApp(firebaseConfig);
    const db = firebase.firestore();
    const storage = firebase.storage();


    // Track the last created order so "Payment Done" can update it
    let lastOrderId = null;
    let lastOrderCode = null;


    // Shortcuts
    const $ = s=>document.querySelector(s);
    const fmt = n => new Intl.NumberFormat('en-NG',{style:'currency',currency:'NGN',maximumFractionDigits:0}).format(n);

    // Elements
    const productsEl = $('#products');
    const catbar = $('#catbar');
    const cartBtn = $('#cartBtn');
    const cartPanel = $('#cartPanel');
    const closeCart = $('#closeCart');
    const cartItemsEl = $('#cartItems');
    const subtotalEl = $('#subtotal');
    const cartCountEl = $('#cartCount');
    const searchInput = $('#q');
    const yearEl = $('#year');

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

    // Insert visible bank info
    $('#bankName').textContent = BANK_INFO.bank;
    $('#accountName').textContent = BANK_INFO.accountName;
    $('#accountNumber').textContent = BANK_INFO.accountNumber;

    // Demo fallback products
    const DEMO_PRODUCTS = [
      { id:'p1', name:'Samba OG', brand:'adidas', price:200000, image:'https://images.unsplash.com/photo-1608231387042-66d1773070a5?q=80&w=1200&auto=format&fit=crop', tags:['shoes','men','lifestyle'], badge:'7% off' },
      { id:'p2', name:'Max Cushioning', brand:'Skechers', price:143000, image:'https://images.unsplash.com/photo-1525966222134-fcfa99b8ae77?q=80&w=1200&auto=format&fit=crop', tags:['shoes','women','running'], badge:'36% off' },
      { id:'p3', name:'Arsenal Jersey', brand:'adidas', price:179000, image:'https://images.unsplash.com/photo-1526676037777-05a232554f77?q=80&w=1200&auto=format&fit=crop', tags:['jersey','men','football'] },
      { id:'p4', name:'Havaianas Top', brand:'Havaianas', price:8000, image:'https://images.unsplash.com/photo-1509631179647-0177331693ae?q=80&w=1200&auto=format&fit=crop', tags:['slides','unisex','sale'], badge:'30% off' },
      { id:'p5', name:'Gazelle', brand:'adidas', price:179000, image:'https://images.unsplash.com/photo-1542291026-7eec264c27ff?q=80&w=1200&auto=format&fit=crop', tags:['shoes','men','lifestyle'] }
    ];

    let PRODUCTS = [];
    let state = { query:'', tag:'all', cart: JSON.parse(localStorage.getItem('cart')||'[]') };
    let currentOrderCode = null; // generated on checkout open
    let currentOrderTotal = 0;

    function saveCart(){ localStorage.setItem('cart', JSON.stringify(state.cart)); }
    function setCartCount(){ cartCountEl.textContent = state.cart.reduce((s,i)=>s+i.qty,0); }

    // How many products per page
const PRODUCTS_PER_PAGE = 20;
let currentPage = 1;

// Read ?tag= query from URL and set state.tag
const params = new URLSearchParams(window.location.search);
if (params.has("tag")) {
  state.tag = params.get("tag");
}


// Load products (from Firestore or demo)
async function loadProducts() {
  try {
    let queryRef = db.collection('products');

    // If a tag is selected in URL (?tag=shoes), filter directly in Firestore
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

      // 🔎 Local search (name, brand, OR tags)
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

  currentPage = 1; // reset page whenever new products are loaded
  initCats();
  renderProducts();
  renderCart();
}

// Render products with pagination
function renderProducts(page = currentPage) {
  const q = state.query.toLowerCase();
  const tag = state.tag;

  // Filtered items
  const items = PRODUCTS.filter(p =>
    (tag === 'all' || (p.tags || []).includes(tag)) &&
    (!q ||
      p.name.toLowerCase().includes(q) ||
      (p.brand || '').toLowerCase().includes(q) ||
      (p.tags || []).some(t => t.toLowerCase().includes(q))
    )
  );

  // Slice for pagination
  const start = (page - 1) * PRODUCTS_PER_PAGE;
  const end = start + PRODUCTS_PER_PAGE;
  const pagedItems = items.slice(start, end);

  // Render product cards
  productsEl.innerHTML = pagedItems.map(p => `
    <article class="card" aria-label="${p.name}">
      <img src="${p.image}" alt="${p.name}">
      <div class="body">
        <div class="row">
          <span class="badge">${p.brand}</span>
          ${p.badge ? `<span class="badge" style="margin-left:8px">${p.badge}</span>` : ''}
        </div>
        <div class="title">${p.name}</div>
        <div class="muted">
          ${(p.tags || []).map(t => `<a href="?tag=${t}" onclick="selectTag('${t}');return false;" class="badge">${t}</a>`).join(' ')}
        </div>
        <div class="row">
          <span class="price">${fmt(p.price)}</span>
          <button class="btn btn-primary" onclick="addToCart('${p.id}')">Add to cart</button>
        </div>
      </div>
    </article>
  `).join('');

  renderPagination(items.length, page);
}

// Render pagination buttons
function renderPagination(totalItems, page) {
  const totalPages = Math.ceil(totalItems / PRODUCTS_PER_PAGE);
  const paginationEl = document.getElementById("pagination");
  if (!paginationEl) return;

  paginationEl.innerHTML = "";
  if (totalPages <= 1) return; // no pagination needed

  // Prev button
  const prev = document.createElement("button");
  prev.textContent = "Prev";
  prev.disabled = page === 1;
  prev.onclick = () => { currentPage--; renderProducts(); };
  paginationEl.appendChild(prev);

  // Numbered buttons (show max 5 at once with dots)
  const maxVisible = 5;
  let start = Math.max(1, page - Math.floor(maxVisible / 2));
  let end = start + maxVisible - 1;
  if (end > totalPages) {
    end = totalPages;
    start = Math.max(1, end - maxVisible + 1);
  }

  if (start > 1) {
    addPageButton(1, page, paginationEl);
    if (start > 2) {
      const dots = document.createElement("span");
      dots.textContent = "...";
      paginationEl.appendChild(dots);
    }
  }

  for (let i = start; i <= end; i++) {
    addPageButton(i, page, paginationEl);
  }

  if (end < totalPages) {
    if (end < totalPages - 1) {
      const dots = document.createElement("span");
      dots.textContent = "...";
      paginationEl.appendChild(dots);
    }
    addPageButton(totalPages, page, paginationEl);
  }

  // Next button
  const next = document.createElement("button");
  next.textContent = "Next";
  next.disabled = page === totalPages;
  next.onclick = () => { currentPage++; renderProducts(); };
  paginationEl.appendChild(next);
}

// Helper for page buttons
function addPageButton(num, current, container) {
  const btn = document.createElement("button");
  btn.textContent = num;
  btn.disabled = num === current;
  btn.onclick = () => { currentPage = num; renderProducts(); };
  container.appendChild(btn);
}


function selectTag(t){
  state.tag = t;
  initCats(); 
  renderProducts();
  // Update the URL so it can be shared/bookmarked
  const url = new URL(window.location);
  url.searchParams.set('tag', t);
  window.history.replaceState({}, '', url);
}



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
      cartItemsEl.innerHTML = rows || '<p class="muted">Your cart is empty</p>';
      const total = state.cart.reduce((s,ci)=>{ const p = PRODUCTS.find(x=>x.id===ci.id) || DEMO_PRODUCTS.find(x=>x.id===ci.id) || {}; return s + ((p.price||0)*ci.qty); },0);
      subtotalEl.textContent = fmt(total);
      return total;
    }

    // Cart ops
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

    // Categories
    function initCats(){
      const tags = new Set(['all']);
      PRODUCTS.forEach(p=> (p.tags||[]).forEach(t=>tags.add(t)));
     
    }
    function selectTag(t){ state.tag = t; initCats(); renderProducts(); }

    // UI events
    cartBtn.addEventListener('click', ()=> cartPanel.classList.add('open'));
    closeCart.addEventListener('click', ()=> cartPanel.classList.remove('open'));
    document.getElementById('q').addEventListener('input', (e) => {
  state.query = e.target.value.trim();
  loadProducts();
});


    // Helpers
    function generateOrderCode(){
      const a = Date.now().toString(36).slice(-6).toUpperCase();
      const b = Math.random().toString(36).slice(2,6).toUpperCase();
      return `ORD-${a}-${b}`;
    }

    // Open checkout: prefill buyer, compute total, generate code, set WA link
    $('#checkoutBtn').addEventListener('click', ()=>{
      if(state.cart.length===0){ alert('Your cart is empty'); return; }
      // Prefill
      const last = JSON.parse(localStorage.getItem('lastBuyer')||'{}');
      if(last.name) custName.value = last.name;
      if(last.email) custEmail.value = last.email;
      if(last.phone) custPhone.value = last.phone;
      orderNote.value = '';

      // Compute + code + WA
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

      // Show overlay
      checkoutOverlay.style.display = 'flex';
    });

    closeCheckout.addEventListener('click', ()=> checkoutOverlay.style.display='none');
    cancelCheckout.addEventListener('click', ()=> checkoutOverlay.style.display='none');

   // Save order (pending) when buyer clicks "Payment Done"
confirmPaymentBtn.addEventListener('click', async ()=>{
  try {
    // basic validation
    const name = custName.value.trim();
    const email = custEmail.value.trim();
    const phone = custPhone.value.trim();
    if(!name || !email || !phone){
      alert('Please fill name, email and WhatsApp phone.');
      return;
    }

    // check firebase/db
    if(!window.firebase || !db){
      console.error('Firebase not initialized or db missing', window.firebase, db);
      alert('Firebase is not initialized. Check your firebaseConfig in the store file.');
      return;
    }

    // save buyer for convenience
    localStorage.setItem('lastBuyer', JSON.stringify({name,email,phone}));

    // ensure cart is not empty
    if(!Array.isArray(state.cart) || state.cart.length === 0){
      alert('Your cart is empty.');
      return;
    }

    // ensure we have a code and total (fallbacks)
    currentOrderTotal = currentOrderTotal || renderCart();
    currentOrderCode = currentOrderCode || generateOrderCode();

    // build items array from cart (lookup product details when possible)
    const items = state.cart.map(ci => {
      // ci expected shape: { id: 'p1', qty: 2 } — handle other shapes too
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
      items,                                     // <-- items list for admin
      amount: currentOrderTotal,
      currency: 'NGN',
      note: (orderNote.value||'').trim() || "—",
      status: 'pending',
      createdAt: firebase.firestore.FieldValue.serverTimestamp()
    };

    console.log('Saving order payload:', payload);

    const docRef = await db.collection('orders').add(payload);
    console.log('Order saved id', docRef.id);

    // optional: remember last order id/code for further updates
    lastOrderId = docRef.id;
    lastOrderCode = currentOrderCode;

    alert(`✅ Order saved!\nOrder Code: ${currentOrderCode}\nRef: ${docRef.id}`);

    // Clear cart and close overlays
    state.cart = []; saveCart(); setCartCount(); renderCart();
    cartPanel.classList.remove('open');
    checkoutOverlay.style.display='none';

  } catch(err) {
    // show the real error to help debugging
    console.error('Failed to save order', err);
    alert('Failed to save order. Error: ' + (err && err.message ? err.message : err));
  }
});


    // Init
    yearEl.textContent = new Date().getFullYear();
    setCartCount();
    loadProducts();

    // expose for inline handlers
    window.addToCart = addToCart;
    window.setQty = setQty;
    window.removeFromCart = removeFromCart;
    window.selectTag = selectTag;

    //generate order code
    createOrderBtn.addEventListener('click', async ()=>{
  const name = custName.value.trim();
  const email = custEmail.value.trim();
  const phone = custPhone.value.trim();
  const note = orderNote.value.trim();
  if(!name || !email || !phone){ alert('Please fill name, email and phone.'); return; }

  localStorage.setItem('lastBuyer', JSON.stringify({name,email,phone}));

  const total = renderCart(); // naira
  if(!total){ alert('Your cart is empty'); return; }

  // Generate code and create Firestore order
  const code = generateOrderCode();
  const orderPayload = {
    code,
    buyer:{name,email,phone},
    cart: state.cart,
    amount: total,
    currency: 'NGN',
    note: note || '',
    status: 'pending', // admin will later mark as paid
    createdAt: firebase.firestore.FieldValue.serverTimestamp()
  };

  try{
    const docRef = await db.collection('orders').add(orderPayload);

    // Remember for "Payment Done"
    lastOrderId = docRef.id;
    lastOrderCode = code;

    // Show code + instructions + enable "Payment Done"
    orderCodeEl.textContent = code;
    orderCodeBlock.style.display = 'block';
    instructionsBlock.style.display = 'block';
    doneBtn.style.display = 'inline-block';

    // Update WhatsApp link with code and order id
    const message = encodeURIComponent(
      `Hello ${BANK_INFO.accountName},\nI have placed an order.\nOrder Code: ${code}\nRef: ${docRef.id}\nTotal: ₦${total.toLocaleString()}\nName: ${name}\nPhone: ${phone}`
    );
    whatsappLink.href = `https://wa.me/${SELLER_WHATSAPP}?text=${message}`;

    // Clear cart locally (order is saved in Firestore)
    state.cart = [];
    saveCart();
    setCartCount();
    renderCart();
    cartPanel.classList.remove('open');

    alert(`✅ Order created.\nCode: ${code}\nYou can now make transfer and tap "Payment Done".`);
  }catch(err){
    console.error(err);
    alert('Failed to create order. Please try again.');
  }
});


// payment done handler
doneBtn.addEventListener('click', async ()=>{
  try{
    // If customer skipped "Generate Order Code", create order now as a fallback
    if(!lastOrderId){
      const total = renderCart();
      if(!total){ alert('Your cart is empty'); return; }
      const name = custName.value.trim();
      const email = custEmail.value.trim();
      const phone = custPhone.value.trim();
      if(!name || !email || !phone){ alert('Please fill name, email and phone.'); return; }

      const code = generateOrderCode();
      const orderPayload = {
        code,
        buyer:{name,email,phone},
        cart: state.cart,
        amount: total,
        currency: 'NGN',
        note: (orderNote.value||'').trim(),
        status: 'pending',
        createdAt: firebase.firestore.FieldValue.serverTimestamp()
      };
      const ref = await db.collection('orders').add(orderPayload);
      lastOrderId = ref.id;
      lastOrderCode = code;
    }

    // Mark that buyer has submitted payment (awaiting admin confirmation)
    await db.collection('orders').doc(lastOrderId).update({
      status: 'payment_submitted',
      buyerConfirmedPayment: true,
      buyerConfirmedAt: firebase.firestore.FieldValue.serverTimestamp()
    });

    alert('✅ Thanks! We will confirm your payment shortly.');
    checkoutOverlay.style.display = 'none';
  }catch(err){
    console.error(err);
    alert('Could not update order. Please try again.');
  }
});



