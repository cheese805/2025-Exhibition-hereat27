function positionPoster() {
  const poster = document.querySelector(".poster");
  const scrollBox = document.querySelector(".bottom-panel");
  if (!poster || !scrollBox) return;

  const deviceH = window.innerHeight;
  const scrollH = scrollBox.offsetHeight;
  const posterH = poster.offsetHeight;

  const available = deviceH - scrollH;
  const centerY = available / 2;

  let posterTop = centerY - posterH / 2;
  if (posterTop < 0 || Number.isNaN(posterTop)) posterTop = 0;

  poster.style.top = posterTop + "px";
}

function setPosterVersion() {
  const poster = document.querySelector(".poster");
  if (!poster) return;

  const isSmallScreen = window.innerHeight <= 700;
  const desiredSrc = isSmallScreen ? "img/poster-short.png" : "img/poster.png";

  if (poster.dataset.currentSrc === desiredSrc) {
    positionPoster();
    return;
  }

  poster.src = desiredSrc;
  poster.dataset.currentSrc = desiredSrc;
  poster.onload = () => positionPoster();
}

function setupScrollButton() {
  const scrollBtn = document.querySelector(".bottom-panel");
  const brochure = document.querySelector("#brochure");
  if (!scrollBtn || !brochure) return;

  scrollBtn.addEventListener("click", () => {
    brochure.scrollIntoView({ behavior: "smooth" });
  });
}

function setupFloorMapLinks() {
  // zone 버튼: data-href면 페이지 이동, data-target이면 해당 앵커로 스크롤
  document.addEventListener("click", (e) => {
    const btn = e.target.closest(".floor-zone");
    if (!btn) return;

    const href = btn.getAttribute("data-href");
    const target = btn.getAttribute("data-target");

    if (href) {
      window.location.href = href;
      return;
    }

    if (target) {
      const el = document.querySelector(target);
      if (el) el.scrollIntoView({ behavior: "smooth", block: "start" });
    }
  });
}

function setupBrochureSlider() {
  const container = document.querySelector("#brochure");
  if (!container) return;

  const track = container.querySelector(".brochure-track");
  if (!track) return;

  const panels = Array.from(track.querySelectorAll(".brochure-panel"));
  if (!panels.length) return;

  const panelGuide = track.querySelector(".panel-guide");
  const panelFloor1 = track.querySelector(".panel-floor1");
  const panelInfo = track.querySelector(".panel-info");

  let index = 0;
  let slides = [];

  function computeSlides() {
    // PC(>=1024): Guide / (1F+2F 같이) / Info → 3스텝
    if (window.innerWidth >= 1024 && panelGuide && panelFloor1 && panelInfo) {
      slides = [() => 0, () => panelFloor1.offsetLeft, () => panelInfo.offsetLeft];
    } else {
      // 모바일/태블릿: 패널 그대로 4스텝
      slides = panels.map((panel) => () => panel.offsetLeft);
    }
  }

  computeSlides();

  function goTo(newIndex, smooth = true) {
    const maxIndex = slides.length - 1;
    index = Math.max(0, Math.min(maxIndex, newIndex));

    const left = slides[index]();
    container.scrollTo({
      left,
      top: 0,
      behavior: smooth ? "smooth" : "auto",
    });
  }

  goTo(0, false);

  window.addEventListener("resize", () => {
    computeSlides();
    goTo(index, false);
  });

  // PC 휠 → 좌우 슬라이드 (락 걸어서 과민함 제거)
  let wheelLocked = false;
  const WHEEL_LOCK_MS = 650;

  container.addEventListener(
    "wheel",
    (e) => {
      // brochure 위에서만 휠을 슬라이드로 먹고, 그 외는 기본 스크롤 살려두기
      // (지금 구조상 #brochure가 화면 전체라 사실상 항상 여기로 들어옴)
      const delta = Math.abs(e.deltaY) > Math.abs(e.deltaX) ? e.deltaY : e.deltaX;
      if (!delta) return;

      e.preventDefault();

      if (wheelLocked) return;
      wheelLocked = true;

      if (delta > 0) goTo(index + 1);
      else goTo(index - 1);

      setTimeout(() => (wheelLocked = false), WHEEL_LOCK_MS);
    },
    { passive: false }
  );

  // 모바일 터치 스와이프
  let isTouching = false;
  let startX = 0;
  let startY = 0;
  let currentX = 0;
  let currentY = 0;
  let isHorizontal = false;
  let touchLocked = false;
  const TOUCH_LOCK_MS = 520;

  container.addEventListener("touchstart", (e) => {
    if (e.touches.length !== 1) return;
    if (touchLocked) return;

    isTouching = true;
    isHorizontal = false;

    startX = e.touches[0].clientX;
    startY = e.touches[0].clientY;
    currentX = startX;
    currentY = startY;
  }, { passive: true });
  container.addEventListener("touchmove", (e) => {
    if (!isTouching) return;

    currentX = e.touches[0].clientX;
    currentY = e.touches[0].clientY;

    const dx = currentX - startX;
    const dy = currentY - startY;
    if (!isHorizontal) {
      if (Math.abs(dx) > 8 && Math.abs(dx) > Math.abs(dy)) {
        isHorizontal = true;
      } else if (Math.abs(dy) > 8 && Math.abs(dy) > Math.abs(dx)) {
        isTouching = false;
        return;
      }
    }

    if (isHorizontal) {
      e.preventDefault(); 
    }
  }, { passive: false });

  container.addEventListener("touchend", () => {
    if (!isTouching) return;

    const diff = currentX - startX;
    const threshold = 40;

    if (touchLocked) {
      isTouching = false;
      return;
    }

    if (Math.abs(diff) > threshold) {
      touchLocked = true;
      const direction = diff < 0 ? 1 : -1;
      goTo(index + direction);

      setTimeout(() => (touchLocked = false), TOUCH_LOCK_MS);
    } else {
      goTo(index);
    }

    isTouching = false;
  });

}

// ====== ✅ 여기부터가 핵심: 초기화(이게 없어서 PC가 "깨져" 보였던 거) ======
function initMain() {
  setPosterVersion();
  setupScrollButton();
  setupFloorMapLinks();
  setupBrochureSlider();
  setupPosterToBrochureSnap();
}

window.addEventListener("load", initMain);
window.addEventListener("resize", setPosterVersion);

// (현재 main 페이지엔 .gallery-wall 없어서 여기 IIFE는 그냥 return됨)
(function () {
  const wall = document.querySelector(".gallery-wall");
  if (!wall) return;

  const prefersReduced =
    window.matchMedia && window.matchMedia("(prefers-reduced-motion: reduce)").matches;

  const items = () => Array.from(wall.querySelectorAll(".gallery-item"));

  function centerLeft(el) {
    return el.offsetLeft + el.offsetWidth / 2 - wall.clientWidth / 2;
  }

  function nearestIndex() {
    const arr = items();
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

  function goTo(i) {
    const arr = items();
    if (!arr.length) return;

    const index = Math.max(0, Math.min(arr.length - 1, i));
    wall.scrollTo({
      left: centerLeft(arr[index]),
      top: 0,
      behavior: prefersReduced ? "auto" : "smooth",
    });
  }

  let lock = false;

  wall.addEventListener(
    "wheel",
    (e) => {
      if (window.innerWidth < 1024) return;

      e.preventDefault();
      e.stopPropagation();

      if (lock) return;
      lock = true;

      const dir = e.deltaY > 0 ? 1 : -1;
      goTo(nearestIndex() + dir);

      setTimeout(() => {
        lock = false;
      }, 550);
    },
    { passive: false }
  );

  window.addEventListener("load", () => {
    if (window.innerWidth >= 1024) goTo(nearestIndex());
  });

  window.addEventListener("resize", () => {
    if (window.innerWidth >= 1024) goTo(nearestIndex());
  });
})();

//세로 스크롤 스냅
function setupPosterToBrochureSnap() {
  const poster = document.querySelector(".mobile-main");
  const brochure = document.querySelector("#brochure");
  if (!poster || !brochure) return;

  const prefersReduced =
    window.matchMedia && window.matchMedia("(prefers-reduced-motion: reduce)").matches;

  const LOCK_MS = 650;
  let locked = false;

  function brochureTop() {
    return brochure.getBoundingClientRect().top + window.pageYOffset;
  }

  function inPosterZone() {
    // 브로슈어 시작점 위에 있으면 "포스터 영역"으로 판단
    return window.scrollY < brochureTop() - 8;
  }

  function goBrochure() {
    if (locked) return;
    locked = true;

    brochure.scrollIntoView({
      behavior: prefersReduced ? "auto" : "smooth",
      block: "start",
    });

    setTimeout(() => (locked = false), LOCK_MS);
  }

  // ✅ 휠 한 번 = 바로 브로슈어로
  window.addEventListener(
    "wheel",
    (e) => {
      if (locked) return;

      // 아래로 스크롤 의도만 잡음
      if (e.deltaY <= 0) return;

      // 포스터 구간에서만 발동
      if (!inPosterZone()) return;

      e.preventDefault();
      goBrochure();
    },
    { passive: false }
  );

  // ✅ 터치 스와이프 한 번 = 바로 브로슈어로 (포스터 구간에서만)
  let t0 = 0;
  let y0 = 0;

  window.addEventListener(
    "touchstart",
    (e) => {
      if (!inPosterZone()) return;
      if (e.touches.length !== 1) return;
      t0 = Date.now();
      y0 = e.touches[0].clientY;
    },
    { passive: true }
  );

  window.addEventListener(
    "touchend",
    (e) => {
      if (!inPosterZone()) return;
      if (!t0) return;

      const dt = Date.now() - t0;
      const y1 = (e.changedTouches && e.changedTouches[0]?.clientY) ?? y0;
      const dy = y1 - y0; // 위로 스와이프면 음수

      // “한 번” 느낌: 짧고 확실한 스와이프만 인정
      const SWIPE_DIST = 45;
      const SWIPE_TIME = 450;

      if (dt <= SWIPE_TIME && dy < -SWIPE_DIST) {
        goBrochure();
      }

      t0 = 0;
    },
    { passive: true }
  );
}
