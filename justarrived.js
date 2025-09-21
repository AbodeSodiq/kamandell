/*
 Robust per-card slider logic using dataset for index and JSON data-images.
 This implementation avoids closure/state bugs and ensures each card is independent.
*/
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