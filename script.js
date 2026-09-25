const experience = document.querySelector("#experience");
const cards = [...document.querySelectorAll("[data-card]")];
const sections = [...document.querySelectorAll(".page-section")];
const navItems = [...document.querySelectorAll(".side-index-item")];
const header = document.querySelector("#site-header");
const cardNumber = document.querySelector("#active-card-number");
const progressFill = document.querySelector("#experience-progress-fill");
const heroVideo = document.querySelector("#hero-video");
const creations = document.querySelector("#creations");
const creationsStage = creations.querySelector(".creations-stage");
const gameLogos = [...creations.querySelectorAll(".game-logo")];
const creationsKicker = document.querySelector(".creations-kicker");
const creationsLines = [...document.querySelectorAll(".creations-line")];
const reducedMotion = window.matchMedia("(prefers-reduced-motion: reduce)");

const clamp = (value, min = 0, max = 1) => Math.min(max, Math.max(min, value));
let frameRequested = false;
let previousScrollY = window.scrollY;
let lastGestureDirection = 0;
let lastGestureAt = -Infinity;
let pageTransition = null;
let touchStartY = 0;
let creationsRevealed = false;
let creationsAnimating = false;
let activeContentAnimations = [];
let floatingAnimations = [];

function pauseLogoFloat() {
  floatingAnimations.forEach((animation) => animation.pause());
}

function playLogoFloat() {
  if (reducedMotion.matches || document.hidden) return;
  if (!floatingAnimations.length) {
    floatingAnimations = gameLogos.map((logo, index) => {
      const frame = logo.querySelector(".game-logo-frame");
      const x = [-8, 7, -5, 10, -7, 6, -11, 8, -6, 9, -7, 6, -9, 8, -5][index];
      const y = [-10, 8, 13, -7, 11, -12, 7, -9, 10, -8, 12, -7, 9, -10, 8][index];
      const rotate = [-.8, .9, -.6, 1.1, -.7, .8, -1, .6, -.9, .7, -1.1, .6, -.8, 1, -.7][index];
      const animation = frame.animate([
        { transform: "translate3d(0, 0, 0) rotate(0deg)" },
        { transform: `translate3d(${x}px, ${y}px, 0) rotate(${rotate}deg)` },
      ], { duration: 5600 + (index % 6) * 730, delay: index * 170, easing: "ease-in-out", direction: "alternate", iterations: Infinity });
      return animation;
    });
  }
  floatingAnimations.forEach((animation) => {
    if (getComputedStyle(animation.effect.target.closest(".game-logo")).display === "none") animation.pause();
    else animation.play();
  });
}

function setCreationsCopyVisible() {
  creationsKicker.style.opacity = "1";
  creationsKicker.style.transform = "none";
  creationsKicker.style.letterSpacing = ".25em";
  creationsLines.forEach((line) => {
    line.style.opacity = "1";
    line.style.transform = "none";
    line.style.removeProperty("clip-path");
  });
  creationsRevealed = true;
}

function resetCreationsContent() {
  pauseLogoFloat();
  activeContentAnimations.forEach((animation) => animation.cancel());
  activeContentAnimations = [];
  creationsAnimating = false;
  creationsRevealed = false;
  creationsKicker.style.removeProperty("opacity");
  creationsKicker.style.removeProperty("transform");
  creationsKicker.style.removeProperty("letter-spacing");
  creationsLines.forEach((line) => {
    line.style.removeProperty("opacity");
    line.style.removeProperty("transform");
    line.style.removeProperty("clip-path");
  });
}

function animateCreationElements(forward) {
  const easing = forward ? "cubic-bezier(.65, 0, .35, 1)" : "cubic-bezier(.22, 1, .36, 1)";
  const visibleLogos = gameLogos.filter((logo) => getComputedStyle(logo).display !== "none");
  const logoAnimations = visibleLogos.map((logo, index) => {
    const towardCenterX = (creationsStage.clientWidth / 2 - logo.offsetLeft) * .68;
    const towardCenterY = (creationsStage.clientHeight / 2 - logo.offsetTop) * .68;
    const gathered = `translate(-50%, -50%) translate3d(${towardCenterX.toFixed(1)}px, ${towardCenterY.toFixed(1)}px, 0) scale(${forward ? ".92" : ".78"})`;
    const scattered = "translate(-50%, -50%) translate3d(0, 0, 0) scale(1)";
    return logo.animate(forward
      ? [{ transform: gathered, opacity: 0 }, { transform: scattered, opacity: 1 }]
      : [{ transform: scattered, opacity: 1 }, { transform: gathered, opacity: 0 }],
    { duration: forward ? 1600 : 420, delay: (forward ? 100 : 0) + index * (forward ? 90 : 20), easing, fill: "both" });
  });

  if (!forward) return logoAnimations;
  const kickerAnimation = creationsKicker.animate([
    { opacity: 0 },
    { opacity: 1 },
  ], { duration: 400, delay: 430, easing: "cubic-bezier(.22, 1, .36, 1)", fill: "both" });
  const lineAnimations = creationsLines.map((line, index) => {
    return line.animate([
      { opacity: 0, transform: "translate3d(0, -34px, 0)" },
      { opacity: 1, transform: "translate3d(0, 0, 0)" },
    ], { duration: 820, delay: 780 + index * 180, easing: "cubic-bezier(.22, 1, .36, 1)", fill: "both" });
  });
  return [...logoAnimations, kickerAnimation, ...lineAnimations];
}

function playCreationsStandalone() {
  if (creationsAnimating || creationsRevealed || pageTransition) return;
  if (reducedMotion.matches) {
    setCreationsCopyVisible();
    return;
  }
  creationsAnimating = true;
  const animations = animateCreationElements(true);
  activeContentAnimations = animations;
  Promise.all(animations.map((animation) => animation.finished)).then(() => {
    if (activeContentAnimations !== animations) return;
    const rect = creations.getBoundingClientRect();
    if (rect.bottom <= 0 || rect.top >= window.innerHeight) {
      resetCreationsContent();
      return;
    }
    setCreationsCopyVisible();
    animations.forEach((animation) => animation.cancel());
    activeContentAnimations = [];
    creationsAnimating = false;
    playLogoFloat();
  }).catch(() => {});
}

function setupHeroFocus() {
  const title = document.querySelector(".hero-title");
  const words = [...title.querySelectorAll("[data-focus-word]")];
  const frame = title.querySelector(".hero-focus-frame");
  if (!words.length || !frame) return;

  let activeIndex = 0;
  let timer = 0;
  let resizeFrame = 0;
  let hovering = false;
  let introFinished = false;

  const placeFrame = (instant = false) => {
    const titleRect = title.getBoundingClientRect();
    const wordRect = words[activeIndex].getBoundingClientRect();
    const padX = Math.max(10, wordRect.height * .065);
    const padY = Math.max(6, wordRect.height * .035);
    if (instant) frame.style.transition = "none";
    frame.style.width = `${wordRect.width + padX * 2}px`;
    frame.style.height = `${wordRect.height + padY * 2}px`;
    frame.style.transform = `translate3d(${wordRect.left - titleRect.left - padX}px, ${wordRect.top - titleRect.top - padY}px, 0)`;
    title.classList.add("is-focus-ready");
    if (instant) window.requestAnimationFrame(() => frame.style.removeProperty("transition"));
  };

  const activate = (index, instant = false) => {
    activeIndex = index;
    words.forEach((word, wordIndex) => word.classList.toggle("is-focus-active", wordIndex === index));
    placeFrame(instant);
  };
  const stop = () => {
    window.clearInterval(timer);
    timer = 0;
  };
  const start = () => {
    stop();
    if (!introFinished || reducedMotion.matches || document.hidden || hovering) return;
    timer = window.setInterval(() => activate((activeIndex + 1) % words.length), 2600);
  };

  words.forEach((word, index) => {
    word.addEventListener("pointerenter", (event) => {
      if (!introFinished || event.pointerType === "touch") return;
      hovering = true;
      stop();
      activate(index);
    });
    word.addEventListener("pointerleave", () => {
      if (!introFinished) return;
      hovering = false;
      start();
    });
  });

  const finishIntro = () => {
    if (introFinished) return;
    introFinished = true;
    document.fonts.ready.then(() => {
      activate(0, true);
      start();
    });
  };
  if (reducedMotion.matches) finishIntro();
  else {
    const lastFold = words[words.length - 1].querySelector(".hero-title-layout");
    lastFold.addEventListener("animationend", finishIntro, { once: true });
  }
  window.addEventListener("resize", () => {
    if (!introFinished) return;
    window.cancelAnimationFrame(resizeFrame);
    resizeFrame = window.requestAnimationFrame(() => placeFrame(true));
  }, { passive: true });
  document.addEventListener("visibilitychange", start);
  reducedMotion.addEventListener("change", () => {
    if (reducedMotion.matches) {
      stop();
      if (introFinished) activate(0, true);
      else finishIntro();
    } else {
      start();
    }
  });
}

function updatePage() {
  frameRequested = false;

  const viewportHeight = window.innerHeight;
  const desktopCards = window.matchMedia("(min-width: 901px)").matches;

  if (desktopCards) {
    const sectionRect = experience.getBoundingClientRect();
    const scrollableHeight = Math.max(1, experience.offsetHeight - viewportHeight);
    const progress = clamp(-sectionRect.top / scrollableHeight);
    const lastCard = cards.length - 1;
    const step = clamp(-sectionRect.top / viewportHeight, 0, lastCard);
    const active = Math.min(lastCard, Math.round(step));

    cards.forEach((card, index) => {
      const entry = index === 0 ? 1 : clamp(step - (index - 1));
      const offset = (1 - entry) * viewportHeight * 1.04 + index * 13;
      const coveredBy = Math.max(0, Math.min(lastCard - index, Math.floor(step + 0.05) - index));
      const scale = 1 - coveredBy * 0.012;
      card.style.transform = `translate3d(0, ${offset.toFixed(1)}px, 0) scale(${scale.toFixed(3)})`;
      card.style.zIndex = String(index + 1);
      card.style.visibility = entry === 0 && index > 0 ? "hidden" : "visible";
    });

    cardNumber.textContent = String(active + 1).padStart(2, "0");
    progressFill.style.width = `${(progress * 100).toFixed(1)}%`;
  } else {
    cards.forEach((card) => {
      card.style.removeProperty("transform");
      card.style.removeProperty("visibility");
      card.style.removeProperty("z-index");
    });
  }

  const focusPoint = viewportHeight * 0.48;
  let activeSection = sections[0];
  for (const section of sections) {
    const rect = section.getBoundingClientRect();
    if (rect.top <= focusPoint && rect.bottom > focusPoint) {
      activeSection = section;
      break;
    }
  }

  navItems.forEach((item) => {
    const active = item.dataset.target === activeSection.id;
    item.classList.toggle("is-active", active);
    if (active) item.setAttribute("aria-current", "location");
    else item.removeAttribute("aria-current");
  });

  header.classList.toggle("is-scrolled", window.scrollY > 24);
  document.body.classList.toggle("light-section", activeSection.id === "creations" || activeSection.id === "community");
  if (!pageTransition) {
    if (activeSection.id === "creations") {
      if (!creationsAnimating && !creationsRevealed) playCreationsStandalone();
      else if (creationsRevealed) playLogoFloat();
    } else {
      pauseLogoFloat();
      const rect = creations.getBoundingClientRect();
      if ((rect.bottom <= 0 || rect.top >= viewportHeight) && (creationsAnimating || creationsRevealed)) resetCreationsContent();
    }
  }
}

function requestUpdate() {
  if (frameRequested) return;
  frameRequested = true;
  window.requestAnimationFrame(updatePage);
}

function transitionBounds() {
  const end = creations.offsetTop;
  const desktopCards = window.matchMedia("(min-width: 901px)").matches;
  const start = end - (desktopCards ? window.innerHeight : Math.min(80, window.innerHeight * 0.1));
  return { start, end };
}

function rememberGesture(direction) {
  lastGestureDirection = direction;
  lastGestureAt = performance.now();
}

function playPageTransition(direction) {
  if (pageTransition || reducedMotion.matches) return;

  const { start, end } = transitionBounds();
  const forward = direction === "forward";
  const destination = forward ? end : start;
  pageTransition = { lockY: start };
  if (forward) resetCreationsContent();
  else pauseLogoFloat();
  document.documentElement.classList.add("is-page-transitioning");
  creationsStage.classList.add("is-screen-transition");
  creationsStage.style.transform = forward ? "translate3d(0, 100%, 0)" : "translate3d(0, 0, 0)";
  window.scrollTo({ top: start, behavior: "instant" });
  previousScrollY = start;
  requestUpdate();

  window.requestAnimationFrame(() => {
    const easing = "cubic-bezier(.22, 1, .36, 1)";
    const stageAnimation = creationsStage.animate([
      { transform: forward ? "translate3d(0, 100%, 0)" : "translate3d(0, 0, 0)" },
      { transform: forward ? "translate3d(0, 0, 0)" : "translate3d(0, 100%, 0)" },
    ], { duration: 800, easing, fill: "forwards" });

    const contentAnimations = animateCreationElements(forward);
    activeContentAnimations = contentAnimations;
    creationsAnimating = true;

    Promise.all([stageAnimation, ...contentAnimations].map((animation) => animation.finished)).then(() => {
      pageTransition.lockY = destination;
      window.scrollTo({ top: destination, behavior: "instant" });
      previousScrollY = destination;
      window.history.replaceState(null, "", forward ? "#creations" : "#experience");
      if (forward) setCreationsCopyVisible();
      else resetCreationsContent();
      creationsStage.classList.remove("is-screen-transition");
      creationsStage.style.removeProperty("transform");
      stageAnimation.cancel();
      contentAnimations.forEach((animation) => animation.cancel());
      activeContentAnimations = [];
      creationsAnimating = false;
      document.documentElement.classList.remove("is-page-transitioning");
      pageTransition = null;
      lastGestureDirection = 0;
      lastGestureAt = -Infinity;
      if (forward) playLogoFloat();
      requestUpdate();
    }).catch(() => {});
  });
}

function maybeStartPageTransition(direction) {
  if (pageTransition || reducedMotion.matches) return false;
  const { start, end } = transitionBounds();
  const y = window.scrollY;
  if (direction > 0 && y >= start - 2 && y < end) {
    playPageTransition("forward");
    return true;
  }
  if (direction < 0 && y >= end - 2 && y <= end + 2) {
    playPageTransition("backward");
    return true;
  }
  return false;
}

function handlePageScroll() {
  const y = window.scrollY;
  if (pageTransition) {
    if (Math.abs(y - pageTransition.lockY) > 1) window.scrollTo({ top: pageTransition.lockY, behavior: "instant" });
    previousScrollY = pageTransition.lockY;
    requestUpdate();
    return;
  }

  if (!reducedMotion.matches && performance.now() - lastGestureAt < 700) {
    const { start, end } = transitionBounds();
    if (lastGestureDirection > 0 && y > previousScrollY && previousScrollY < end && y >= start) {
      playPageTransition("forward");
      return;
    }
    if (lastGestureDirection < 0 && y < previousScrollY && previousScrollY >= end && y < end && y >= experience.offsetTop) {
      playPageTransition("backward");
      return;
    }
  }
  previousScrollY = y;
  requestUpdate();
}

function updateVideoPlayback() {
  if (reducedMotion.matches || document.hidden) {
    heroVideo.pause();
    return;
  }

  const heroRect = document.querySelector("#home").getBoundingClientRect();
  if (heroRect.bottom > 0 && heroRect.top < window.innerHeight) {
    heroVideo.play().catch(() => {});
  } else {
    heroVideo.pause();
  }
}

window.addEventListener("wheel", (event) => {
  if (pageTransition) {
    event.preventDefault();
    return;
  }
  const direction = Math.sign(event.deltaY);
  if (!direction) return;
  rememberGesture(direction);
  if (maybeStartPageTransition(direction)) event.preventDefault();
}, { passive: false });
window.addEventListener("keydown", (event) => {
  if (event.target.closest("input, textarea, select, [contenteditable]")) return;
  const scrollKeys = ["ArrowDown", "PageDown", "ArrowUp", "PageUp", " "];
  if (!scrollKeys.includes(event.key)) return;
  if (pageTransition) {
    event.preventDefault();
    return;
  }
  const direction = ["ArrowUp", "PageUp"].includes(event.key) || (event.key === " " && event.shiftKey) ? -1 : 1;
  rememberGesture(direction);
  if (maybeStartPageTransition(direction)) event.preventDefault();
});
window.addEventListener("touchstart", (event) => { touchStartY = event.touches[0]?.clientY ?? 0; }, { passive: true });
window.addEventListener("touchmove", (event) => {
  if (pageTransition) {
    event.preventDefault();
    return;
  }
  const direction = Math.sign(touchStartY - (event.touches[0]?.clientY ?? touchStartY));
  if (direction) {
    rememberGesture(direction);
    if (maybeStartPageTransition(direction)) event.preventDefault();
  }
}, { passive: false });
window.addEventListener("scroll", handlePageScroll, { passive: true });
window.addEventListener("scroll", updateVideoPlayback, { passive: true });
window.addEventListener("resize", requestUpdate, { passive: true });
window.addEventListener("resize", updateVideoPlayback, { passive: true });
document.addEventListener("visibilitychange", updateVideoPlayback);
document.addEventListener("visibilitychange", () => {
  if (document.hidden) pauseLogoFloat();
  else requestUpdate();
});
reducedMotion.addEventListener("change", updateVideoPlayback);
reducedMotion.addEventListener("change", () => {
  if (reducedMotion.matches) {
    pauseLogoFloat();
    if (creationsAnimating && !pageTransition) resetCreationsContent();
  }
  requestUpdate();
});
document.querySelector('.side-index-item[data-target="creations"]').addEventListener("click", (event) => {
  event.preventDefault();
  window.history.pushState(null, "", "#creations");
  window.scrollTo({ top: creations.offsetTop, behavior: "instant" });
  previousScrollY = window.scrollY;
  lastGestureAt = -Infinity;
  requestUpdate();
});

setupHeroFocus();
updatePage();
updateVideoPlayback();
