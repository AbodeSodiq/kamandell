// ======================== FIREBASE INIT ========================
const firebaseConfig = {
  apiKey: "AIzaSyBU-6tWbnJW9R26PYvL5DCoZp72g1wAsBw",
  authDomain: "estore-38a16.firebaseapp.com",
  projectId: "estore-38a16",
  storageBucket: "estore-38a16.appspot.com",
  messagingSenderId: "98333861476",
  appId: "1:98333861476:web:07d89cd6e90524c177fb89",
  measurementId: "G-CPZKZS3YGG"
};

firebase.initializeApp(firebaseConfig);
const db = firebase.firestore();

// ======================== CART & ORDERS ========================
let cart = JSON.parse(localStorage.getItem("cart")) || [];
updateCartUI();

function saveCart() {
  localStorage.setItem("cart", JSON.stringify(cart));
}

function updateCartUI() {
  const cartItemsContainer = document.getElementById("cartItems");
  const cartCountElem = document.getElementById("cartCount");
  const subtotalElem = document.getElementById("subtotal");

  if (!cartItemsContainer || !cartCountElem || !subtotalElem) return; // navbar not loaded yet

  cartItemsContainer.innerHTML = "";
  let subtotal = 0;

  cart.forEach((item, index) => {
    subtotal += item.price * item.quantity;
    const div = document.createElement("div");
    div.className = "cart-item";
    div.innerHTML = `
      <img src="${item.image}" alt="${item.name}" />
      <div>
        <h4>${item.name}</h4>
        <p>₦${item.price.toLocaleString()} × ${item.quantity}</p>
      </div>
      <button onclick="removeFromCart(${index})">×</button>
    `;
    cartItemsContainer.appendChild(div);
  });

  cartCountElem.textContent = cart.length;
  subtotalElem.textContent = `₦${subtotal.toLocaleString()}`;
}

function addToCart(product) {
  const existing = cart.find(item => item.id === product.id);
  if (existing) {
    existing.quantity++;
  } else {
    cart.push({ ...product, quantity: 1 });
  }
  saveCart();
  updateCartUI();
}

function removeFromCart(index) {
  cart.splice(index, 1);
  saveCart();
  updateCartUI();
}

// ======================== ORDERS ========================
function saveOrder(order) {
  return db.collection("orders").add(order);
}

// ======================== CHECKOUT ========================
document.addEventListener("click", async (e) => {
  if (e.target.id === "checkoutBtn") {
    document.getElementById("checkoutOverlay").style.display = "block";
  }
  if (e.target.id === "closeCheckout" || e.target.id === "cancelCheckout") {
    document.getElementById("checkoutOverlay").style.display = "none";
  }
  if (e.target.id === "confirmPaymentBtn") {
    const order = {
      name: document.getElementById("custName").value,
      email: document.getElementById("custEmail").value,
      phone: document.getElementById("custPhone").value,
      note: document.getElementById("orderNote").value,
      items: cart,
      subtotal: cart.reduce((sum, i) => sum + i.price * i.quantity, 0),
      createdAt: new Date(),
      status: "pending"
    };
    await saveOrder(order);
    alert("Order saved successfully!");
    cart = [];
    saveCart();
    updateCartUI();
    document.getElementById("checkoutOverlay").style.display = "none";
  }
});

// ======================== NAVBAR LOAD ========================
document.addEventListener("DOMContentLoaded", () => {
  // Inject navbar.html
  fetch("navbar.html")
    .then(res => res.text())
    .then(html => {
      document.getElementById("navbar").innerHTML = html;
      attachNavbarEvents(); // re-bind events after load
      updateCartUI(); // refresh cart count
    })
    .catch(err => console.error("Navbar load error:", err));
});

function attachNavbarEvents() {
  const cartBtn = document.getElementById("cartBtn");
  const cartPanel = document.getElementById("cartPanel");
  const closeCart = document.getElementById("closeCart");

  if (cartBtn && cartPanel) {
    cartBtn.addEventListener("click", () => cartPanel.classList.add("open"));
  }
  if (closeCart && cartPanel) {
    closeCart.addEventListener("click", () => cartPanel.classList.remove("open"));
  }

  // floating search
  const openSearch = document.getElementById("openSearch");
  const floatingSearch = document.getElementById("floatingSearch");

  if (openSearch && floatingSearch) {
    openSearch.addEventListener("click", () => {
      floatingSearch.classList.toggle("show");
      document.getElementById("q").focus();
    });
  }
}

// ======================== PRODUCT LOADING ========================
let state = {
  tag: new URLSearchParams(window.location.search).get("tag") || "all",
  currentPage: 1,
  pageSize: 20,
};

async function loadProducts() {
  try {
    let queryRef = db.collection("products");

    if (state.tag && state.tag !== "all") {
      queryRef = queryRef.where("tags", "array-contains", state.tag);
    }

    const snapshot = await queryRef.get();
    const products = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));

    renderProducts(products);
    renderPagination(products.length);
  } catch (err) {
    console.error("Error loading products:", err);
  }
}

function renderProducts(products) {
  const grid = document.getElementById("productGrid");
  if (!grid) return;

  grid.innerHTML = "";
  const start = (state.currentPage - 1) * state.pageSize;
  const paginated = products.slice(start, start + state.pageSize);

  paginated.forEach(p => {
    const card = document.createElement("div");
    card.className = "product-card";
    card.innerHTML = `
      <img src="${p.image}" alt="${p.name}">
      <h4>${p.name}</h4>
      <p>₦${p.price.toLocaleString()}</p>
      <button onclick='addToCart(${JSON.stringify(p)})'>Add to Cart</button>
    `;
    grid.appendChild(card);
  });
}

function renderPagination(total) {
  const container = document.getElementById("pagination");
  if (!container) return;

  const pages = Math.ceil(total / state.pageSize);
  container.innerHTML = "";

  for (let i = 1; i <= pages; i++) {
    const btn = document.createElement("button");
    btn.textContent = i;
    if (i === state.currentPage) btn.classList.add("active");
    btn.addEventListener("click", () => {
      state.currentPage = i;
      loadProducts();
    });
    container.appendChild(btn);
  }
}

// ======================== SEARCH ========================
document.addEventListener("keypress", (e) => {
  if (e.target.id === "q" && e.key === "Enter") {
    const query = e.target.value.trim();
    if (query) {
      window.location.href = "collection.html?tag=" + encodeURIComponent(query);
    }
  }
});

// ======================== INITIAL LOAD ========================
if (document.getElementById("productGrid")) {
  loadProducts();
}
