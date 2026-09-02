import { initScroll, gsap, ScrollTrigger } from './ui/scroll.js';
import { initChrome } from './ui/chrome.js';
import { initContent } from './ui/content.js';
import { initTransitions } from './ui/transition.js';
import { initReveals } from './ui/reveal.js';
import { initCounters } from './ui/counters.js';
import { initMarquees } from './ui/marquee.js';
import { initFaq } from './ui/faq.js';
import { initTestimonials } from './ui/testimonials.js';
import { initNav } from './ui/nav.js';
import { initCursor } from './ui/cursor.js';
import { initFlourish } from './ui/flourish.js';
import { initStages } from './ui/stages.js';
import { initTilt } from './ui/tilt.js';
import { whenGLNeeded } from './ui/lazy-gl.js';

/* -------------------------------------------------------------------------
   Preloader. Deliberately independent of WebGL — the page is readable long
   before three.js arrives, so holding the curtain for it would be a lie.
   ------------------------------------------------------------------------- */
function initLoader(onDone) {
  const loader = document.querySelector('[data-loader]');
  const bar = document.querySelector('[data-loader-bar]');
  const pct = document.querySelector('[data-loader-pct]');

  const state = { p: 0 };
  let settled = false;

  const paint = () => {
    if (bar) bar.style.width = state.p * 100 + '%';
    if (pct) pct.textContent = Math.round(state.p * 100);
  };

  const finish = () => {
    if (settled) return;
    settled = true;
    gsap.to(state, {
      p: 1, duration: 0.4, ease: 'power2.out', onUpdate: paint,
      onComplete() {
        document.documentElement.classList.remove('is-loading');
        if (loader) {
          gsap.to(loader, {
            clipPath: 'inset(0 0 100% 0)', duration: 0.85, ease: 'expo.inOut',
            onComplete: () => loader.remove(),
          });
        }
        onDone && onDone();
      },
    });
  };

  // Creep forward while fonts and CSS settle, then finish on load.
  gsap.to(state, { p: 0.8, duration: 1.1, ease: 'power1.out', onUpdate: paint });
  if (document.readyState === 'complete') setTimeout(finish, 250);
  else window.addEventListener('load', () => setTimeout(finish, 250));
  setTimeout(finish, 2600);

  paint();
}

/** Hero entrance — text only, so it never waits on the 3D. */
function playIntro() {
  const reduced = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
  if (reduced) {
    document.querySelectorAll('.hero__title .line, .scroll-hint').forEach((el) => {
      el.style.opacity = 1;
    });
    return;
  }
  gsap.timeline({ defaults: { ease: 'expo.out' } })
    .from('.hero__title .line', { yPercent: 108, opacity: 0, duration: 1.15, stagger: 0.09 })
    .from('.scroll-hint', { opacity: 0, duration: 0.8 }, '-=0.6')
    .from('.header__inner > *', { y: -22, opacity: 0, duration: 0.7, stagger: 0.06 }, '-=1.1');
}

function boot() {
  initChrome();
  initContent();   // before reveals, so new nodes get their triggers          // header/footer must exist before anything queries them
  initScroll();
  initTransitions();
  initNav();
  initCursor();
  initFlourish();

  initStages();
  initReveals();
  initCounters();
  initMarquees();
  initFaq();
  initTestimonials();
  initTilt();

  if (document.fonts && document.fonts.ready) {
    document.fonts.ready.then(() => ScrollTrigger.refresh());
  }

  initLoader(playIntro);

  // three.js and the acts arrive only once a 3D slot is close to the viewport.
  whenGLNeeded(async () => {
    const { mountHome } = await import('./gl/mount-home.js');
    const scenes = mountHome();
    if (scenes.globe) {
      const reduced = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
      gsap.to(scenes.globe.reveal, { v: 1, duration: reduced ? 0.3 : 2.2, ease: 'power2.out' });
    }
    ScrollTrigger.refresh();
  });
}

if (document.readyState === 'loading') {
  document.addEventListener('DOMContentLoaded', boot);
} else {
  boot();
}

document.addEventListener('DOMContentLoaded', () => {
  const activeTimers = new WeakMap();

  const runCipher = (el) => {
    // Clear any running animation for this element if scrolled quickly
    if (activeTimers.has(el)) {
      clearInterval(activeTimers.get(el));
    }

    const targetValue = parseInt(el.getAttribute('data-cipher'), 10);
    const padLength = parseInt(el.getAttribute('data-pad') || '0', 10);
    const suffix = el.getAttribute('data-suffix') || '';

    // Slower timing parameters
    const duration = 2200; // Total animation time (2.2 seconds)
    const intervalTime = 80; // Slower tick interval (80ms per tick)
    const startTime = performance.now();

    const timer = setInterval(() => {
      const elapsed = performance.now() - startTime;
      const progress = Math.min(elapsed / duration, 1);

      if (progress < 1) {
        // Generate random numbers with padding while cycling
        const randomNum = Math.floor(Math.random() * Math.pow(10, padLength || 1));
        const displayStr = String(randomNum).padStart(padLength, '0');
        el.textContent = displayStr + suffix;
      } else {
        // Lock in final value smoothly
        clearInterval(timer);
        const finalStr = String(targetValue).padStart(padLength, '0');
        el.textContent = finalStr + suffix;
      }
    }, intervalTime);

    activeTimers.set(el, timer);
  };

  const resetCipher = (el) => {
    // Stop ongoing animation and reset to initial zeros when leaving viewport
    if (activeTimers.has(el)) {
      clearInterval(activeTimers.get(el));
    }
    const padLength = parseInt(el.getAttribute('data-pad') || '0', 10);
    const suffix = el.getAttribute('data-suffix') || '';
    el.textContent = '0'.repeat(padLength) + suffix;
  };

  // IntersectionObserver configured for repeat scroll triggering
  const observerOptions = {
    threshold: 0.3 // Triggers when 30% of the element is visible
  };

  const observer = new IntersectionObserver((entries) => {
    entries.forEach(entry => {
      if (entry.isIntersecting) {
        runCipher(entry.target);
      } else {
        // Reset when scrolled out of view so it animates when you scroll back
        resetCipher(entry.target);
      }
    });
  }, observerOptions);

  document.querySelectorAll('[data-cipher]').forEach(el => observer.observe(el));
});
document.addEventListener('DOMContentLoaded', () => {
  const carousel = document.querySelector('[data-carousel]');
  if (!carousel) return;

  const slides = carousel.querySelectorAll('.carousel__slide');
  let currentIndex = 0;

  function nextSlide() {
    slides[currentIndex].classList.remove('is-active');
    currentIndex = (currentIndex + 1) % slides.length;
    slides[currentIndex].classList.add('is-active');
  }

  // Change image every 3.5 seconds (3500ms)
  setInterval(nextSlide, 3500);
});
document.addEventListener('DOMContentLoaded', () => {
  const carousel = document.querySelector('[data-carousel]');
  if (!carousel) return;

  const track = carousel.querySelector('[data-track]');
  let slides = Array.from(track.querySelectorAll('.card--slide'));
  const dotsContainer = carousel.querySelector('[data-dots]');

  let currentIndex = 0;
  let autoTimer = null;
  const intervalTime = 3000; // Time per card change (3 seconds)

  // Build Pagination Dots
  if (dotsContainer) {
    dotsContainer.innerHTML = '';
    slides.forEach((_, idx) => {
      const dot = document.createElement('button');
      dot.classList.add('carousel__dot');
      if (idx === 0) dot.classList.add('is-active');
      dot.addEventListener('click', () => {
        stopAutoPlay();
        goToSlide(idx);
        startAutoPlay();
      });
      dotsContainer.appendChild(dot);
    });
  }

  function getDots() {
    return dotsContainer ? Array.from(dotsContainer.querySelectorAll('.carousel__dot')) : [];
  }

  // Slide to Specific Card Index
  function goToSlide(index) {
    currentIndex = index;

    // Loop around smoothly
    if (currentIndex >= slides.length) {
      currentIndex = 0;
    } else if (currentIndex < 0) {
      currentIndex = slides.length - 1;
    }

    const targetSlide = slides[currentIndex];
    const scrollPosition = targetSlide.offsetLeft - track.offsetLeft;

    track.scrollTo({
      left: scrollPosition,
      behavior: 'smooth'
    });

    updateActiveState();
  }

  // Update active class and dots
  function updateActiveState() {
    const dots = getDots();
    slides.forEach((slide, idx) => {
      const isActive = idx === currentIndex;
      slide.classList.toggle('is-active', isActive);
      if (dots[idx]) dots[idx].classList.toggle('is-active', isActive);
    });
  }

  // Auto-slide trigger
  function nextSlide() {
    goToSlide(currentIndex + 1);
  }

  function startAutoPlay() {
    stopAutoPlay();
    autoTimer = setInterval(nextSlide, intervalTime);
  }

  function stopAutoPlay() {
    if (autoTimer) {
      clearInterval(autoTimer);
      autoTimer = null;
    }
  }

  // Pause on Mouse Hover / Touch
  carousel.addEventListener('mouseenter', stopAutoPlay);
  carousel.addEventListener('mouseleave', startAutoPlay);
  carousel.addEventListener('touchstart', stopAutoPlay, { passive: true });
  carousel.addEventListener('touchend', startAutoPlay, { passive: true });

  // Handle Drag / Touch Swipe
  let isDragging = false;
  let startX = 0;
  let scrollLeft = 0;

  track.addEventListener('mousedown', (e) => {
    isDragging = true;
    stopAutoPlay();
    track.classList.add('is-dragging');
    startX = e.pageX - track.offsetLeft;
    scrollLeft = track.scrollLeft;
  });

  track.addEventListener('mouseup', () => {
    if (!isDragging) return;
    isDragging = false;
    track.classList.remove('is-dragging');
    
    // Snap to nearest slide after drag
    const cardWidth = slides[0].offsetWidth + 28; // card width + gap
    const nearestIndex = Math.round(track.scrollLeft / cardWidth);
    goToSlide(nearestIndex);
    
    startAutoPlay();
  });

  track.addEventListener('mousemove', (e) => {
    if (!isDragging) return;
    e.preventDefault();
    const x = e.pageX - track.offsetLeft;
    const walk = (x - startX) * 1.2;
    track.scrollLeft = scrollLeft - walk;
  });

  // Initialize
  updateActiveState();
  startAutoPlay();
});
document.addEventListener('DOMContentLoaded', () => {
  const carousel = document.querySelector('[data-carousel]');
  if (!carousel) return;

  const track = carousel.querySelector('[data-track]');
  const slides = Array.from(track.querySelectorAll('.card--slide'));
  const dotsContainer = carousel.querySelector('[data-dots]');

  let currentIndex = 0;
  let autoTimer = null;
  const intervalTime = 3200; // Time per slide shift (3.2s)

  // 1. Generate Pagination Dots dynamically
  if (dotsContainer) {
    dotsContainer.innerHTML = '';
    slides.forEach((_, idx) => {
      const dot = document.createElement('button');
      dot.classList.add('carousel__dot');
      if (idx === 0) dot.classList.add('is-active');
      dot.addEventListener('click', () => {
        stopAutoPlay();
        goToSlide(idx);
        startAutoPlay();
      });
      dotsContainer.appendChild(dot);
    });
  }

  const dots = dotsContainer ? Array.from(dotsContainer.querySelectorAll('.carousel__dot')) : [];

  // 2. Transform Slide Shift Function
  function goToSlide(index) {
    // Loop bounds calculation
    if (index >= slides.length) {
      currentIndex = 0;
    } else if (index < 0) {
      currentIndex = slides.length - 1;
    } else {
      currentIndex = index;
    }

    const cardWidth = slides[0].offsetWidth;
    const gap = 32; // Matches CSS gap: 2rem (32px)
    const shiftAmount = (cardWidth + gap) * currentIndex;

    // Smoothly shift the track
    track.style.transform = `translateX(-${shiftAmount}px)`;

    // Update active visual states
    slides.forEach((slide, idx) => {
      const isActive = idx === currentIndex;
      slide.classList.toggle('is-active', isActive);
      if (dots[idx]) dots[idx].classList.toggle('is-active', isActive);
    });
  }

  // 3. Auto Play Controls
  function nextSlide() {
    goToSlide(currentIndex + 1);
  }

  function startAutoPlay() {
    stopAutoPlay();
    autoTimer = setInterval(nextSlide, intervalTime);
  }

  function stopAutoPlay() {
    if (autoTimer) {
      clearInterval(autoTimer);
      autoTimer = null;
    }
  }

  // 4. Hover to Pause / Resume
  carousel.addEventListener('mouseenter', stopAutoPlay);
  carousel.addEventListener('mouseleave', startAutoPlay);

  // 5. Drag & Touch Gesture Swipe
  let isDragging = false;
  let startX = 0;
  let currentTranslate = 0;
  let prevTranslate = 0;

  track.addEventListener('mousedown', dragStart);
  track.addEventListener('mouseup', dragEnd);
  track.addEventListener('mouseleave', dragEnd);
  track.addEventListener('mousemove', dragAction);

  track.addEventListener('touchstart', dragStart, { passive: true });
  track.addEventListener('touchend', dragEnd);
  track.addEventListener('touchmove', dragAction, { passive: true });

  function dragStart(e) {
    isDragging = true;
    stopAutoPlay();
    track.classList.add('is-dragging');
    startX = getPositionX(e);
    const cardWidth = slides[0].offsetWidth + 32;
    prevTranslate = -currentIndex * cardWidth;
  }

  function dragAction(e) {
    if (!isDragging) return;
    const currentPosition = getPositionX(e);
    currentTranslate = prevTranslate + (currentPosition - startX);
    track.style.transform = `translateX(${currentTranslate}px)`;
  }

  function dragEnd() {
    if (!isDragging) return;
    isDragging = false;
    track.classList.remove('is-dragging');

    const movedBy = currentTranslate - prevTranslate;

    // Threshold for swipe trigger (if moved more than 50px)
    if (movedBy < -50) {
      goToSlide(currentIndex + 1);
    } else if (movedBy > 50) {
      goToSlide(currentIndex - 1);
    } else {
      goToSlide(currentIndex);
    }

    startAutoPlay();
  }

  function getPositionX(e) {
    return e.type.includes('mouse') ? e.pageX : e.touches[0].clientX;
  }

  // Initialize carousel position
  goToSlide(0);
  startAutoPlay();
});
document.addEventListener("DOMContentLoaded", () => {
  const carousel = document.querySelector("[data-carousel]");
  const track = document.querySelector("[data-track]");

  if (!carousel || !track) return;

  const originalCards = Array.from(track.children);
  
  // Clone cards to create seamless infinite loop
  originalCards.forEach((card) => {
    const clone = card.cloneNode(true);
    track.appendChild(clone);
  });

  let animationFrameId = null;
  let currentTranslate = 0;
  let isPaused = false;
  const speed = 1.2; // Adjust speed here (higher = faster)

  const getSingleLoopWidth = () => {
    const trackStyle = window.getComputedStyle(track);
    const gap = parseFloat(trackStyle.gap) || 0;
    let width = 0;
    
    originalCards.forEach((card) => {
      width += card.offsetWidth + gap;
    });
    
    return width;
  };

  const moveSlider = () => {
    if (!isPaused) {
      currentTranslate -= speed;
      const singleLoopWidth = getSingleLoopWidth();

      // Reset translate seamlessly when half track width is reached
      if (Math.abs(currentTranslate) >= singleLoopWidth) {
        currentTranslate = 0;
      }

      track.style.transform = `translateX(${currentTranslate}px)`;
    }

    animationFrameId = requestAnimationFrame(moveSlider);
  };

  // Pause movement on hover
  carousel.addEventListener("mouseenter", () => {
    isPaused = true;
  });

  carousel.addEventListener("mouseleave", () => {
    isPaused = false;
  });

  // Start continuous motion loop
  animationFrameId = requestAnimationFrame(moveSlider);
});