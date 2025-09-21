window.addEventListener("DOMContentLoaded", () => {
    // ================= FIREBASE CONFIG =================
const firebaseConfig = {
  apiKey: "AIzaSyD7IIHG7txvgUwgthDOf3CtGLVdbmLk_X0",
  authDomain: "kamandell.firebaseapp.com",
  projectId: "kamandell-8bc28"
};
firebase.initializeApp(firebaseConfig);
const db = firebase.firestore();

// ================= GLOBAL STATE =================
const productId = new URLSearchParams(window.location.search).get("id");
let currentImageIndex = 0;
let currentImages = [];

// ================= MAIN PRODUCT =================
function renderProduct(p) {
  currentImages = Array.isArray(p.image) ? p.image : [p.image];
  const thumbnails = currentImages.map((img, i) => `
    <img src="${img}" class="thumbnail ${i === 0 ? 'active' : ''}" data-index="${i}">
  `).join("");

  document.title = `${p.name} | Buy Online - MyStore`;
  if (p.shortDescription) {
    document.querySelector('meta[name="description"]')
      .setAttribute("content", p.shortDescription);
  }

  const descriptionHtml = `
    <p class="description">${p.shortDescription || ""}</p>
    <p class="long-description">${p.longDescriptionTop || ""}</p>
    <div class="features">
      <h4>${p.longDescriptionBottom?.intro || "Features:"}</h4>
      <ul>
        ${(p.longDescriptionBottom?.features || []).map(f => `<li>${f}</li>`).join("")}
      </ul>
      <p>${p.longDescriptionBottom?.closing || ""}</p>
    </div>
  `;

  document.getElementById("product-details").innerHTML = `
    <div class="image-section">
      <img id="main-image" src="${currentImages[0]}" class="main-image">
      <button class="image-arrow left">&#10094;</button>
      <button class="image-arrow right">&#10095;</button>
      <div class="thumbnails">${thumbnails}</div>
    </div>
    <div class="details">
      <h2>${p.name}</h2>
      <p><strong>Brand:</strong> ${p.brand}</p>
      <p class="price">₦${p.price.toLocaleString()}</p>
      ${descriptionHtml}
      <a href="#" class="btn">Add to Cart</a>
    </div>
  `;

  // Bind gallery arrows
  document.querySelector(".image-arrow.left")
    .addEventListener("click", () => navigateImage(-1));
  document.querySelector(".image-arrow.right")
    .addEventListener("click", () => navigateImage(1));

  // Bind thumbnails
  document.querySelectorAll(".thumbnail").forEach(thumb => {
    thumb.addEventListener("click", () => {
      const idx = parseInt(thumb.dataset.index);
      showImage(idx, thumb);
    });
  });
}

function showImage(index, el) {
  currentImageIndex = index;
  document.getElementById("main-image").src = currentImages[index];
  document.querySelectorAll(".thumbnail").forEach(t => t.classList.remove("active"));
  el.classList.add("active");
}

function navigateImage(direction) {
  currentImageIndex = (currentImageIndex + direction + currentImages.length) % currentImages.length;
  document.getElementById("main-image").src = currentImages[currentImageIndex];
  document.querySelectorAll(".thumbnail").forEach((t, i) => {
    t.classList.toggle("active", i === currentImageIndex);
  });
}

// ================= RELATED PRODUCTS =================
function renderRelated(products) {
  const container = document.getElementById("related-carousel");
  container.innerHTML = products.map(p => `
    <div class="product-card">
      <a href="productpage.html?id=${p.id}" style="text-decoration:none;">
        <img src="${Array.isArray(p.image) ? p.image[0] : p.image}" alt="${p.name}">
        <h4>${p.name}</h4>
        <p>₦${p.price.toLocaleString()}</p>
      </a>
    </div>
  `).join("");
}

//scroll section for you may also like 
function scrollCarousel(direction) {
  const carousel = document.getElementById("related-carousel");
  if (!carousel) return;

  const scrollAmount = 250;
  carousel.scrollBy({ left: direction * scrollAmount, behavior: 'smooth' });
}

// Bind related carousel arrows
document.getElementById("related-prev")
  .addEventListener("click", () => scrollCarousel(-1));
document.getElementById("related-next")
  .addEventListener("click", () => scrollCarousel(1));



// ================= DATA LOADING =================
async function loadProduct() {
  if (!productId) return;
  const doc = await db.collection("products").doc(productId).get();
  if (doc.exists) {
    const product = { id: doc.id, ...doc.data() };
    renderProduct(product);
    loadRelated(product);
  }
}

async function loadRelated(currentProduct) {
  let related = [];

  if (currentProduct.tags && currentProduct.tags.length > 0) {
    const snapshot = await db.collection("products")
      .where("tags", "array-contains-any", currentProduct.tags)
      .get();
    related = snapshot.docs
      .map(doc => ({ id: doc.id, ...doc.data() }))
      .filter(p => p.id !== currentProduct.id);
  }

  if (related.length === 0) {
    const snapshot = await db.collection("products").limit(10).get();
    related = snapshot.docs
      .map(doc => ({ id: doc.id, ...doc.data() }))
      .filter(p => p.id !== currentProduct.id);
  }

  related = related.sort(() => Math.random() - 0.5).slice(0, 6);
  renderRelated(related);
}

// ================= INIT =================

  loadProduct();

  // Bind related carousel arrows
  document.getElementById("prev-image")
    .addEventListener("click", () => scrollCarousel(-1));
  document.getElementById("next-image")
    .addEventListener("click", () => scrollCarousel(1));
});
