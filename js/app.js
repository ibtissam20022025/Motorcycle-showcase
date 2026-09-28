/* ============================================================
   MOTO X PERFORMANCE — animation engine
   Lenis · GSAP · ScrollTrigger · SplitText · canvas frame-scrub
   ============================================================ */

gsap.registerPlugin(ScrollTrigger);
const hasSplitText = typeof SplitText !== "undefined";
if (hasSplitText) gsap.registerPlugin(SplitText);

const REDUCED = window.matchMedia("(prefers-reduced-motion: reduce)").matches;

/* ---------- frame config ---------- */
const FRAME_COUNT = 240;
const FRAME_PATH = (i) => `frames/frame_${String(i + 1).padStart(4, "0")}.webp`;
const FRAME_SPEED = 2.0;           // product anim finishes ~50% of hero scroll
const IMAGE_SCALE = 0.9;           // padded-cover sweet spot

const canvas = document.getElementById("hero-canvas");
const HAS_CANVAS = !!canvas;       // only the home page has the frame-scrub hero
const ctx = HAS_CANVAS ? canvas.getContext("2d", { alpha: false }) : null;
const canvasWrap = document.getElementById("canvas-wrap");
const frames = new Array(FRAME_COUNT);
let currentFrame = 0;
let bgColor = "#02110C";
let dpr = Math.min(window.devicePixelRatio || 1, 2);

/* ============================================================
   CANVAS RENDER — padded cover mode
   ============================================================ */
function resizeCanvas() {
  if (!HAS_CANVAS) return;
  dpr = Math.min(window.devicePixelRatio || 1, 2);
  canvas.width = window.innerWidth * dpr;
  canvas.height = window.innerHeight * dpr;
  canvas.style.width = window.innerWidth + "px";
  canvas.style.height = window.innerHeight + "px";
  drawFrame(currentFrame);
}

function drawFrame(index) {
  const img = frames[index];
  if (!img || !img.complete) return;
  const cw = canvas.width, ch = canvas.height;
  const iw = img.naturalWidth, ih = img.naturalHeight;
  const scale = Math.max(cw / iw, ch / ih) * IMAGE_SCALE;
  const dw = iw * scale, dh = ih * scale;
  const dx = (cw - dw) / 2, dy = (ch - dh) / 2;
  ctx.fillStyle = bgColor;
  ctx.fillRect(0, 0, cw, ch);
  ctx.drawImage(img, dx, dy, dw, dh);
}

/* ============================================================
   PRELOADER — first 12 frames fast, rest in background
   ============================================================ */
const loaderEl = document.getElementById("loader");
const barEl = document.getElementById("loader-bar");
const pctEl = document.getElementById("loader-percent");
let loaded = 0;

function loadFrame(i) {
  return new Promise((resolve) => {
    const img = new Image();
    img.onload = img.onerror = () => {
      frames[i] = img;
      loaded++;
      const pct = Math.round((loaded / FRAME_COUNT) * 100);
      if (barEl) barEl.style.width = pct + "%";
      if (pctEl) pctEl.textContent = pct;
      if (i === 0) resizeCanvas();
      resolve();
    };
    img.src = FRAME_PATH(i);
  });
}

async function preload() {
  const FIRST = Math.min(12, FRAME_COUNT);
  for (let i = 0; i < FIRST; i++) await loadFrame(i);
  drawFrame(0);
  // background-load the rest
  await Promise.all(
    Array.from({ length: FRAME_COUNT - FIRST }, (_, k) => loadFrame(FIRST + k))
  );
}

/* ============================================================
   INIT
   ============================================================ */
async function init() {
  if (HAS_CANVAS) {
    resizeCanvas();
    await preload();
  }
  revealLoader();
  initLenis();
  if (HAS_CANVAS) initHeroScrub();
  initHeroText();
  initHeader();
  initSections();
  initMarquees();
  initCounters();
  initTilt();
  initMagnetic();
  initMobileMenu();
  ScrollTrigger.refresh();
}

function revealLoader() {
  if (!loaderEl) return;
  gsap.to(loaderEl, {
    opacity: 0, duration: 0.8, ease: "power2.inOut",
    onComplete: () => { loaderEl.classList.add("done"); }
  });
}

/* ============================================================
   LENIS SMOOTH SCROLL
   ============================================================ */
let lenis;
function initLenis() {
  if (REDUCED) return;
  lenis = new Lenis({
    duration: 1.2,
    easing: (t) => Math.min(1, 1.001 - Math.pow(2, -10 * t)),
    smoothWheel: true,
  });
  lenis.on("scroll", ScrollTrigger.update);
  gsap.ticker.add((time) => lenis.raf(time * 1000));
  gsap.ticker.lagSmoothing(0);

  // anchor links via Lenis
  document.querySelectorAll('a[href^="#"]').forEach((a) => {
    a.addEventListener("click", (e) => {
      const id = a.getAttribute("href");
      if (id.length < 2) return;
      const target = document.querySelector(id);
      if (!target) return;
      e.preventDefault();
      lenis.scrollTo(target, { offset: -10, duration: 1.4 });
      closeMobileMenu();
    });
  });
}

/* ============================================================
   HERO FRAME-SCRUB + CIRCLE-WIPE REVEAL
   ============================================================ */
function initHeroScrub() {
  const isMobile = window.matchMedia("(max-width:768px)").matches;
  const captions = gsap.utils.toArray(".hero-caption").map((el) => ({
    el,
    enter: parseFloat(el.dataset.enter),
    leave: parseFloat(el.dataset.leave),
  }));
  const FADE = 0.05;

  ScrollTrigger.create({
    trigger: "#hero",
    start: "top top",
    endTrigger: "#hero-scroll-space",
    end: "bottom bottom",
    scrub: true,
    onUpdate: (self) => {
      const p = self.progress;
      const accel = Math.min(p * FRAME_SPEED, 1);
      const idx = Math.min(Math.floor(accel * FRAME_COUNT), FRAME_COUNT - 1);
      if (idx !== currentFrame) {
        currentFrame = idx;
        requestAnimationFrame(() => drawFrame(currentFrame));
      }
      // canvas reveals via expanding circle as hero begins to scroll
      const wipe = Math.min(1, Math.max(0, (p - 0.01) / 0.08));
      canvasWrap.style.clipPath = `circle(${wipe * 115}% at 50% 55%)`;
      // canvas fades out near the end so content sections take over cleanly
      const fade = p > 0.85 ? 1 - (p - 0.85) / 0.15 : 1;
      canvasWrap.style.opacity = Math.max(0, fade);

      // motorcycle presentation captions fade/slide in their scroll window
      captions.forEach((c) => {
        let o = 0, shift = 14;
        if (p >= c.enter - FADE && p < c.enter) o = (p - (c.enter - FADE)) / FADE;
        else if (p >= c.enter && p <= c.leave) o = 1;
        else if (p > c.leave && p <= c.leave + FADE) o = 1 - (p - c.leave) / FADE;
        if (isMobile) {
          c.el.style.opacity = o;
          c.el.style.transform = `translateY(${20 - o * 20}px)`;
        } else {
          c.el.style.opacity = o;
          c.el.style.transform = `translateY(calc(-50% + ${shift * (1 - o)}px))`;
        }
      });
    },
  });
}

/* ============================================================
   HERO TEXT — split reveal + parallax
   ============================================================ */
function initHeroText() {
  const lines = gsap.utils.toArray(".hero-heading .line");
  const tl = gsap.timeline({ delay: 0.15 });

  if (hasSplitText && !REDUCED) {
    lines.forEach((line, i) => {
      const split = new SplitText(line, { type: "chars" });
      tl.from(split.chars, {
        yPercent: 120, opacity: 0, duration: 0.9, ease: "power4.out",
        stagger: 0.035,
      }, i * 0.12);
    });
  } else {
    tl.from(lines, { yPercent: 120, opacity: 0, duration: 0.9, ease: "power4.out", stagger: 0.12 });
  }

  tl.from(".hero-label", { y: 20, opacity: 0, duration: 0.7, ease: "power2.out" }, 0)
    .from(".hero-tagline", { y: 24, opacity: 0, duration: 0.8, ease: "power3.out" }, "-=0.5")
    .from(".hero-cta", { y: 24, opacity: 0, duration: 0.8, ease: "power3.out" }, "-=0.55");

  // about page: slow push-in on the hero backdrop
  if (!REDUCED && document.querySelector(".page-hero-bg")) {
    gsap.fromTo(".page-hero-bg", { scale: 1.18 }, {
      scale: 1, yPercent: 12, ease: "none",
      scrollTrigger: { trigger: "#hero", start: "top top", end: "bottom top", scrub: true },
    });
  }

  // parallax the hero content as it scrolls away
  if (!REDUCED) {
    gsap.to(".hero-content", {
      yPercent: -28, opacity: 0, ease: "none",
      scrollTrigger: { trigger: "#hero", start: "top top", end: "bottom top", scrub: true },
    });
  }
}

/* ============================================================
   HEADER — solidify on scroll
   ============================================================ */
function initHeader() {
  const header = document.getElementById("site-header");
  ScrollTrigger.create({
    start: 80, end: 99999,
    onUpdate: (self) => header.classList.toggle("scrolled", self.scroll() > 80),
  });
}

/* ============================================================
   SECTION ENTRANCE CHOREOGRAPHY
   each section a different animation, staggered children
   ============================================================ */
function initSections() {
  document.querySelectorAll(".section[data-animation]").forEach((section) => {
    const type = section.dataset.animation;
    const heading = section.querySelector(".section-heading");

    // split the heading for a richer reveal
    let headingTargets = heading ? [heading] : [];
    if (heading && hasSplitText && !REDUCED) {
      const sp = new SplitText(heading, { type: "lines,words", linesClass: "split-line" });
      headingTargets = sp.words;
    }

    const items = section.querySelectorAll(
      ".section-label, .section-body, .show-card, .gear-item, .part-card, .bike-card, .why-card, " +
      ".story-media, .story-text > p, .value-card"
    );

    const fromVars = {
      "fade-up":    { y: 60, opacity: 0 },
      "slide-left": { x: -90, opacity: 0 },
      "slide-right":{ x: 90, opacity: 0 },
      "scale-up":   { scale: 0.86, opacity: 0, transformOrigin: "center" },
      "clip-reveal":{ y: 50, opacity: 0 },
    }[type] || { y: 60, opacity: 0 };

    const ease = type === "scale-up" ? "power2.out" : "power3.out";

    const tl = gsap.timeline({
      scrollTrigger: { trigger: section, start: "top 75%", once: true },
    });

    if (headingTargets.length) {
      tl.from(headingTargets, {
        ...(type === "clip-reveal"
          ? { yPercent: 110, opacity: 0 }
          : { y: 50, opacity: 0 }),
        duration: 1, ease: "power4.out", stagger: 0.06,
      }, 0);
    }
    tl.from(items, { ...fromVars, duration: 0.9, ease, stagger: 0.1 }, 0.15);
  });
}

/* ============================================================
   MARQUEES — slide on scroll
   ============================================================ */
function initMarquees() {
  if (REDUCED) return;
  document.querySelectorAll(".marquee-wrap").forEach((wrap) => {
    const dir = wrap.classList.contains("reverse") ? 18 : -22;
    gsap.fromTo(
      wrap.querySelector(".marquee-text"),
      { xPercent: dir < 0 ? 5 : -25 },
      {
        xPercent: dir, ease: "none",
        scrollTrigger: { trigger: wrap, start: "top bottom", end: "bottom top", scrub: true },
      }
    );
  });
}

/* ============================================================
   COUNTERS — count up
   ============================================================ */
function initCounters() {
  document.querySelectorAll(".num[data-value]").forEach((el) => {
    const target = parseFloat(el.dataset.value);
    const decimals = parseInt(el.dataset.decimals || "0", 10);
    const obj = { v: 0 };
    gsap.to(obj, {
      v: target, duration: 2, ease: "power2.out",
      scrollTrigger: { trigger: el, start: "top 85%", once: true },
      onUpdate: () => { el.textContent = obj.v.toFixed(decimals); },
    });
  });
}

/* ============================================================
   3D TILT CARDS
   ============================================================ */
function initTilt() {
  if (REDUCED || window.matchMedia("(hover: none)").matches) return;
  document.querySelectorAll("[data-tilt]").forEach((card) => {
    const RX = 7, RY = 9;
    let raf = null;
    function move(e) {
      const r = card.getBoundingClientRect();
      const px = (e.clientX - r.left) / r.width - 0.5;
      const py = (e.clientY - r.top) / r.height - 0.5;
      if (raf) cancelAnimationFrame(raf);
      raf = requestAnimationFrame(() => {
        gsap.to(card, {
          rotateY: px * RY, rotateX: -py * RX,
          duration: 0.5, ease: "power2.out", transformPerspective: 900,
        });
      });
    }
    function leave() {
      gsap.to(card, { rotateX: 0, rotateY: 0, duration: 0.7, ease: "elastic.out(1,0.5)" });
    }
    card.addEventListener("mousemove", move);
    card.addEventListener("mouseleave", leave);
  });
}

/* ============================================================
   MAGNETIC BUTTONS
   ============================================================ */
function initMagnetic() {
  if (REDUCED || window.matchMedia("(hover: none)").matches) return;
  document.querySelectorAll(".btn-magnetic").forEach((btn) => {
    const STR = 0.35;
    btn.addEventListener("mousemove", (e) => {
      const r = btn.getBoundingClientRect();
      const x = (e.clientX - r.left - r.width / 2) * STR;
      const y = (e.clientY - r.top - r.height / 2) * STR;
      gsap.to(btn, { x, y, duration: 0.4, ease: "power2.out" });
    });
    btn.addEventListener("mouseleave", () => {
      gsap.to(btn, { x: 0, y: 0, duration: 0.6, ease: "elastic.out(1,0.4)" });
    });
  });
}

/* ============================================================
   MOBILE MENU
   ============================================================ */
function initMobileMenu() {
  const toggle = document.getElementById("nav-toggle");
  const menu = document.getElementById("mobile-menu");
  if (!toggle) return;
  toggle.addEventListener("click", () => {
    const open = menu.classList.toggle("open");
    toggle.classList.toggle("open", open);
    if (lenis) open ? lenis.stop() : lenis.start();
  });
}
function closeMobileMenu() {
  const menu = document.getElementById("mobile-menu");
  const toggle = document.getElementById("nav-toggle");
  menu && menu.classList.remove("open");
  toggle && toggle.classList.remove("open");
  if (lenis) lenis.start();
}

/* ---------- resize ---------- */
let rT;
window.addEventListener("resize", () => {
  clearTimeout(rT);
  rT = setTimeout(() => { resizeCanvas(); ScrollTrigger.refresh(); }, 150);
});

/* ---------- go ---------- */
init();
