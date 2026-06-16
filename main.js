const modals = {
  bl: document.getElementById("modal-bl"),
  willab: document.getElementById("modal-willab"),
  fk: document.getElementById("modal-fk"),
  about: document.getElementById("modal-about"),
};

const prefersReducedMotion = window.matchMedia("(prefers-reduced-motion: reduce)");
const revealStaggerMs = 360;

let activeModal = null;
let revealTimeouts = [];
let carouselObservers = [];

function clearRevealTimeouts() {
  revealTimeouts.forEach(clearTimeout);
  revealTimeouts = [];
}

function getModalRevealItems(modal) {
  const panel = modal.querySelector(".modal__panel");
  const selectors = [
    ".modal__header",
    ".modal__title-row",
    ".case-intro",
    ".modal__quote",
    ".modal__content .modal__figure",
    ".modal__about-image",
    ".modal__about-text",
  ];

  return selectors.flatMap((selector) => [...panel.querySelectorAll(selector)]);
}

function resetModalReveal(modal) {
  clearRevealTimeouts();
  teardownModalCarousels(modal);
  modal.classList.remove("is-open");
  getModalRevealItems(modal).forEach((item) => item.classList.remove("is-visible"));
}

function revealModalItems(modal) {
  const items = getModalRevealItems(modal);

  if (prefersReducedMotion.matches) {
    items.forEach((item) => item.classList.add("is-visible"));
    return;
  }

  items.forEach((item, index) => {
    const timeoutId = setTimeout(() => {
      item.classList.add("is-visible");
    }, index * revealStaggerMs);
    revealTimeouts.push(timeoutId);
  });
}

function openModal(id) {
  const modal = modals[id];
  if (!modal) return;

  closeModal();
  modal.hidden = false;
  document.body.classList.add("modal-open");
  activeModal = modal;

  modal.classList.add("is-open");
  requestAnimationFrame(() => {
    revealModalItems(modal);
    setupModalCarousels(modal);
  });

  const closeButton = modal.querySelector(".modal__close");
  if (closeButton) closeButton.focus();
}

function closeModal() {
  if (!activeModal) return;

  resetModalReveal(activeModal);
  activeModal.hidden = true;
  document.body.classList.remove("modal-open");
  activeModal = null;
}

document.addEventListener("click", (event) => {
  const openTrigger = event.target.closest("[data-modal-open]");
  if (openTrigger) {
    openModal(openTrigger.dataset.modalOpen);
    return;
  }

  if (event.target.closest("[data-modal-close]")) {
    closeModal();
  }
});

document.addEventListener("keydown", (event) => {
  if (event.key === "Escape") {
    closeModal();
  }
});

function easeOutQuart(progress) {
  return 1 - Math.pow(1 - progress, 4);
}

function easeOutQuint(progress) {
  return 1 - Math.pow(1 - progress, 5);
}

function whenScrollerReady(scrollerEl, callback) {
  const images = [...scrollerEl.querySelectorAll("img")];
  const pending = images.filter((img) => !img.complete);

  if (pending.length === 0) {
    requestAnimationFrame(callback);
    return;
  }

  Promise.all(
    pending.map(
      (img) =>
        new Promise((resolve) => {
          img.addEventListener("load", resolve, { once: true });
          img.addEventListener("error", resolve, { once: true });
        })
    )
  ).then(() => requestAnimationFrame(callback));
}

function runHorizontalScrollIn(scrollerEl, options = {}) {
  const { ease = easeOutQuart, duration = 3000 } = options;

  if (scrollerEl.classList.contains("is-settled") || scrollerEl.classList.contains("is-scrolling-in")) {
    return;
  }

  const maxScroll = Math.max(scrollerEl.scrollWidth - scrollerEl.clientWidth, 0);

  if (maxScroll <= 0) {
    scrollerEl.classList.add("is-settled");
    return;
  }

  scrollerEl.classList.add("is-scrolling-in");
  scrollerEl.scrollLeft = maxScroll;
  scrollerEl.offsetHeight;

  const startTime = performance.now();

  function animate(now) {
    const progress = Math.min((now - startTime) / duration, 1);
    scrollerEl.scrollLeft = maxScroll * (1 - ease(progress));

    if (progress < 1) {
      requestAnimationFrame(animate);
    } else {
      scrollerEl.scrollLeft = 0;
      scrollerEl.classList.remove("is-scrolling-in");
      scrollerEl.classList.add("is-settled");
    }
  }

  requestAnimationFrame(animate);
}

function resetModalCarousel(viewport) {
  viewport.classList.remove("is-scrolling-in", "is-settled");
  viewport.scrollLeft = 0;
}

function teardownModalCarousels(modal) {
  carouselObservers.forEach((observer) => observer.disconnect());
  carouselObservers = [];

  if (!modal) return;

  modal.querySelectorAll("[data-modal-carousel]").forEach(resetModalCarousel);
}

function setupModalCarousels(modal) {
  teardownModalCarousels(modal);

  const panel = modal.querySelector(".modal__panel");
  if (!panel) return;

  modal.querySelectorAll("[data-modal-carousel]").forEach((viewport) => {
    if (prefersReducedMotion.matches) {
      viewport.classList.add("is-settled");
      return;
    }

    const observer = new IntersectionObserver(
      (entries) => {
        entries.forEach((entry) => {
          if (entry.isIntersecting) {
            whenScrollerReady(viewport, () =>
              runHorizontalScrollIn(viewport, { ease: easeOutQuint, duration: 2800 })
            );
            observer.disconnect();
          }
        });
      },
      {
        root: panel,
        threshold: 0.35,
      }
    );

    observer.observe(viewport);
    carouselObservers.push(observer);
  });
}

function getStartRevealItems() {
  const start = document.querySelector(".start");
  if (!start) return [];

  const selectors = [
    ".start__name-group .heading-xl",
    ".start__name-group .heading-l",
    ".start__about",
    ".start__label",
    ".cards",
  ];

  return selectors.flatMap((selector) => [...start.querySelectorAll(selector)]);
}

function startCardsScroll(cardsEl) {
  const isPortrait = window.matchMedia("(max-aspect-ratio: 1/1)").matches;

  if (!isPortrait) {
    runHorizontalScrollIn(cardsEl);
    return;
  }

  const track = cardsEl.querySelector(".cards__track");
  const maxScroll = Math.max(cardsEl.scrollHeight - cardsEl.clientHeight, 0);

  if (maxScroll <= 0) {
    cardsEl.classList.add("is-settled");
    return;
  }

  cardsEl.classList.add("is-scrolling-in");
  cardsEl.scrollTop = 0;
  track.style.willChange = "transform";
  const enterOffset = maxScroll + cardsEl.clientHeight;
  track.style.transform = `translateY(${enterOffset}px)`;
  cardsEl.offsetHeight;

  const duration = 3000;
  const startTime = performance.now();

  function animate(now) {
    const progress = Math.min((now - startTime) / duration, 1);
    const position = enterOffset * (1 - easeOutQuart(progress));
    track.style.transform = `translateY(${position}px)`;

    if (progress < 1) {
      requestAnimationFrame(animate);
    } else {
      track.style.transform = "";
      track.style.willChange = "";
      cardsEl.classList.remove("is-scrolling-in");
      cardsEl.classList.add("is-settled");
    }
  }

  requestAnimationFrame(animate);
}

function initStartPage() {
  const items = getStartRevealItems();

  if (prefersReducedMotion.matches) {
    items.forEach((item) => {
      item.classList.add("is-visible");
      if (item.classList.contains("cards")) {
        item.classList.add("is-settled");
      }
    });
    return;
  }

  items.forEach((item, index) => {
    const timeoutId = setTimeout(() => {
      item.classList.add("is-visible");
      if (item.classList.contains("cards")) {
        startCardsScroll(item);
      }
    }, index * revealStaggerMs);
    revealTimeouts.push(timeoutId);
  });
}

initStartPage();
