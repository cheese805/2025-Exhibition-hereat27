(function () {
  const wrapper = document.getElementById("exhibition-wrapper");
  const hero = document.querySelector(".panel-hero");
  const wall = document.querySelector(".gallery-wall");
  const backBtn = document.querySelector(".back-button");
  const next = document.querySelector(".gallery-next");
  const hint = document.getElementById("scrollHint");
  const hintBtn = hint ? hint.querySelector(".scroll-hint__btn") : null;

  if (!wrapper || !hero || !wall) return;

  const galleryPanel =
    wall.closest(".panel") || document.querySelector(".panel-gallery");

  const prefersReduced =
    window.matchMedia &&
    window.matchMedia("(prefers-reduced-motion: reduce)").matches;

  function isMobileLike() {
    return (
      window.matchMedia && window.matchMedia("(max-width: 1023px)").matches
    );
  }

  // ====== wrapper 슬라이드(데스크탑: 사진단위 / 모바일: hero<->gallery 2스텝) ======
  let slides = [];
  let currentIndex = 0;

  let wheelLocked = false;
  const WHEEL_LOCK_MS = 650;

  let hintEverShown = false;

  function getGalleryItems() {
    return Array.from(wall.querySelectorAll(".gallery-item"));
  }

  function computeSlides() {
    if (isMobileLike()) {
      const galleryLeft = galleryPanel ? galleryPanel.offsetLeft : window.innerWidth;
      slides = [0, galleryLeft]; // hero, gallery
      return;
    }

    // desktop: hero + each photo center
    const items = getGalleryItems();
    slides = [0];

    const windowCenter = window.innerWidth / 2;
    items.forEach((item) => {
      const itemCenter = item.offsetLeft + item.offsetWidth / 2;
      const scrollPos = itemCenter - windowCenter;
      slides.push(scrollPos);
    });
  }

  function showHint() {
    if (!hint) return;
    document.body.classList.add("hint-blur");
    hint.classList.add("is-visible");
    hint.setAttribute("aria-hidden", "false");
  }

  function hideHint() {
    if (!hint) return;
    document.body.classList.remove("hint-blur");
    hint.classList.remove("is-visible");
    hint.setAttribute("aria-hidden", "true");
  }

  function dismissHintOnly() {
    if (!hint) return;
    if (hint.getAttribute("aria-hidden") !== "false") return;
    hideHint();
  }

  function goTo(index, smooth = true) {
    const maxIndex = slides.length - 1;
    currentIndex = Math.max(0, Math.min(maxIndex, index));

    wrapper.scrollTo({
      left: slides[currentIndex],
      top: 0,
      behavior: prefersReduced || !smooth ? "auto" : "smooth",
    });

    updateUI();
  }

  function getNearestIndex() {
    const currentScroll = wrapper.scrollLeft;
    let bestIndex = 0;
    let minDiff = Infinity;

    slides.forEach((pos, i) => {
      const diff = Math.abs(currentScroll - pos);
      if (diff < minDiff) {
        minDiff = diff;
        bestIndex = i;
      }
    });

    return bestIndex;
  }

  let lastVisible = false;

  function setNextVisible(visible) {
    if (!next) return;
    next.classList.toggle("is-visible", !!visible);
  }

  function setupMobileNextObserver() {
    if (!next) return;

    const items = getGalleryItems();
    const last = items[items.length - 1];
    if (!last) return;

    if ("IntersectionObserver" in window) {
      const io = new IntersectionObserver(
        (entries) => {
          const entry = entries[0];
          lastVisible = entry && entry.isIntersecting && entry.intersectionRatio >= 0.75;
          setNextVisible(lastVisible);
        },
        {
          root: wall,
          threshold: [0, 0.25, 0.5, 0.75, 0.9, 1],
        }
      );

      io.observe(last);
      return;
    }

    function nearestWallIndex() {
      const arr = getGalleryItems();
      if (!arr.length) return 0;

      const target = wall.scrollLeft + wall.clientWidth / 2;
      let best = 0;
      let dist = Infinity;

      arr.forEach((el, i) => {
        const c = el.offsetLeft + el.offsetWidth / 2;
        const d = Math.abs(c - target);
        if (d < dist) {
          dist = d;
          best = i;
        }
      });

      return best;
    }

    wall.addEventListener(
      "scroll",
      () => {
        const idx = nearestWallIndex();
        lastVisible = idx === getGalleryItems().length - 1;
        setNextVisible(lastVisible);
      },
      { passive: true }
    );
  }

  function updateUI() {
    if (backBtn) {
      const isHero = currentIndex === 0;
      backBtn.classList.toggle("is-hero", isHero);
      backBtn.classList.toggle("is-gallery", !isHero);
    }

    if (!next) return;

    if (isMobileLike()) {
      setNextVisible(lastVisible);
      return;
    }

    const max = wrapper.scrollWidth - wrapper.clientWidth;
    const nearEnd = max > 0 && wrapper.scrollLeft >= max - 8;
    const isLastIndex = currentIndex === slides.length - 1;
    next.classList.toggle("is-visible", isLastIndex || nearEnd);

    if (hint && currentIndex > 0) hideHint();
  }

  window.addEventListener("resize", () => {
    computeSlides();
    goTo(currentIndex, false);

    if (isMobileLike()) {
      lastVisible = false;
      setNextVisible(false);
    }
  });

  window.addEventListener("load", () => {
    computeSlides();

    if (window.location.hash === "#floor1") {
      wrapper.scrollTo(0, 0);
      currentIndex = 0;
      updateUI();
    } else {
      goTo(0, false);
    }

    if (hint && !hintEverShown) {
      setTimeout(() => {
        if (currentIndex === 0) {
          showHint();
          hintEverShown = true;
        }
      }, 500);
    }
    if (isMobileLike()) {
      lastVisible = false;
      setNextVisible(false);
      setupMobileNextObserver();
    }
  });

  if (hintBtn) {
    hintBtn.addEventListener("click", () => {
      hideHint();
      goTo(1);
    });
  }

  window.addEventListener(
    "pointerdown",
    () => {
      dismissHintOnly();
    },
    { passive: true, capture: true }
  );

  wrapper.addEventListener(
    "wheel",
    (e) => {
      if (isMobileLike()) return;

      if (hint && hint.getAttribute("aria-hidden") === "false") {
        e.preventDefault();
        dismissHintOnly();
        return;
      }

      const delta =
        Math.abs(e.deltaY) > Math.abs(e.deltaX) ? e.deltaY : e.deltaX;
      if (!delta) return;

      e.preventDefault();

      if (wheelLocked) return;
      wheelLocked = true;

      const direction = delta > 0 ? 1 : -1;
      const nearest = getNearestIndex();
      goTo(nearest + direction);

      setTimeout(() => {
        wheelLocked = false;
      }, WHEEL_LOCK_MS);
    },
    { passive: false }
  );

  wrapper.addEventListener(
    "scroll",
    () => {
      currentIndex = getNearestIndex();
      updateUI();
    },
    { passive: true }
  );

  let wrapperTouching = false;
  let wStartX = 0;
  let wCurrentX = 0;

  wrapper.addEventListener("touchstart", (e) => {
    if (!isMobileLike()) return;

    if (hint && hint.getAttribute("aria-hidden") === "false") {
      dismissHintOnly();
      return;
    }

    if (e.target.closest(".gallery-wall")) return;

    if (currentIndex !== 0) return;

    if (e.touches.length !== 1) return;
    wrapperTouching = true;
    wStartX = e.touches[0].clientX;
    wCurrentX = wStartX;
  });

  wrapper.addEventListener("touchmove", (e) => {
    if (!wrapperTouching) return;
    wCurrentX = e.touches[0].clientX;
  });

  wrapper.addEventListener("touchend", () => {
    if (!wrapperTouching) return;

    const diff = wCurrentX - wStartX;
    const threshold = 50;

    if (diff < -threshold) goTo(1);
    else goTo(0);

    wrapperTouching = false;
  });

  let wallTouching = false;
  let gStartX = 0;
  let gCurrentX = 0;

  function isWallAtStart() {
    return wall.scrollLeft <= 2;
  }

  wall.addEventListener("touchstart", (e) => {
    if (!isMobileLike()) return;
    if (e.touches.length !== 1) return;

    wallTouching = true;
    gStartX = e.touches[0].clientX;
    gCurrentX = gStartX;
  });

  wall.addEventListener("touchmove", (e) => {
    if (!wallTouching) return;
    gCurrentX = e.touches[0].clientX;
  });

  wall.addEventListener("touchend", () => {
    if (!wallTouching) return;

    const diff = gCurrentX - gStartX;
    const threshold = 60;

    if (diff > threshold && isWallAtStart()) {
      goTo(0);
    }

    wallTouching = false;
  });

  wall.addEventListener(
    "scroll",
    () => {
      if (!isMobileLike()) return;
      setNextVisible(lastVisible);
    },
    { passive: true }
  );
})();

// lightbox
const lightbox = document.querySelector(".lightbox");
const lightboxImg = document.querySelector(".lightbox-img");

document.querySelectorAll(".gallery-item img").forEach((img) => {
  img.addEventListener("click", () => {
    lightboxImg.src = img.src;
    lightbox.classList.add("is-visible");
    lightbox.setAttribute("aria-hidden", "false");
  });
});

lightbox.addEventListener("click", () => {
  lightbox.classList.remove("is-visible");
  lightbox.setAttribute("aria-hidden", "true");
});
