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
