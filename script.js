const experience = document.querySelector("#experience");
const cards = [...document.querySelectorAll("[data-card]")];
const sections = [...document.querySelectorAll(".page-section")];
const navItems = [...document.querySelectorAll(".side-index-item")];
const header = document.querySelector("#site-header");
const cardNumber = document.querySelector("#active-card-number");
const progressFill = document.querySelector("#experience-progress-fill");
const cardDeck = document.querySelector(".card-deck");
const desktopCardsQuery = window.matchMedia("(min-width: 901px)");
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
let creationsTextProgress = 0;
let creationsTextFrame = 0;
let currentCardIndex = 0;
let cardAnimating = false;
let cardLockTimer = 0;
let wheelAmount = 0;
let wheelDirection = 0;
let wheelLastAt = -Infinity;
let wheelGestureUsed = false;
let experienceEntrancePlayed = false;
let experienceEntranceAnimations = [];
let cardContentAnimations = [];

const cardAnimationDuration = 800;
const wheelIntentThreshold = 48;
const wheelGestureGap = 260;
if (!reducedMotion.matches) experience.classList.add("is-entrance-ready");
const cardTiltQuery = window.matchMedia("(hover: hover) and (pointer: fine)");
let tiltedCard = null;
let tiltedSurface = null;
let cardTiltFrame = 0;
let cardTiltLastFrame = 0;
const cardTiltCurrent = { x: 0, y: 0, scale: 1, glare: 0 };
const cardTiltTarget = { x: 0, y: 0, scale: 1, glare: 0 };

function resetCardTilt(immediate = true) {
  if (!tiltedSurface) return;
  Object.assign(cardTiltTarget, { x: 0, y: 0, scale: 1, glare: 0 });
  if (!immediate) {
    if (!cardTiltFrame) cardTiltFrame = requestAnimationFrame(animateCardTilt);
    return;
  }
  cancelAnimationFrame(cardTiltFrame);
  cardTiltFrame = 0;
  cardTiltLastFrame = 0;
  ["--tilt-x", "--tilt-y", "--tilt-scale", "--tilt-glare", "--glare-x", "--glare-y"].forEach((property) => tiltedSurface.style.removeProperty(property));
  Object.assign(cardTiltCurrent, { x: 0, y: 0, scale: 1, glare: 0 });
  tiltedCard = null;
  tiltedSurface = null;
}

function animateCardTilt(now) {
  cardTiltFrame = 0;
  if (!tiltedSurface) return;
  const elapsed = Math.min(50, Math.max(8, now - (cardTiltLastFrame || now - 16)));
  const blend = 1 - Math.exp(-elapsed / 85);
  cardTiltLastFrame = now;
  for (const key of ["x", "y", "scale", "glare"]) {
    cardTiltCurrent[key] += (cardTiltTarget[key] - cardTiltCurrent[key]) * blend;
  }
  tiltedSurface.style.setProperty("--tilt-x", `${cardTiltCurrent.x.toFixed(3)}deg`);
  tiltedSurface.style.setProperty("--tilt-y", `${cardTiltCurrent.y.toFixed(3)}deg`);
  tiltedSurface.style.setProperty("--tilt-scale", cardTiltCurrent.scale.toFixed(4));
  tiltedSurface.style.setProperty("--tilt-glare", cardTiltCurrent.glare.toFixed(3));
  const settled = ["x", "y", "scale", "glare"].every((key) => Math.abs(cardTiltTarget[key] - cardTiltCurrent[key]) < .002);
  if (!settled) cardTiltFrame = requestAnimationFrame(animateCardTilt);
  else if (cardTiltTarget.scale === 1 && cardTiltTarget.glare === 0) resetCardTilt();
}

function setupCardTilt() {
  cards.forEach((card) => {
    const surface = card.querySelector(".feature-card-surface");
    const update = (event) => {
      if (!cardTiltQuery.matches || reducedMotion.matches || event.pointerType !== "mouse" || document.hidden || pageTransition || cardAnimating || !cardAreaActive() || card !== cards[currentCardIndex]) return;
      if (tiltedCard !== card) resetCardTilt();
      tiltedCard = card;
      tiltedSurface = surface;
      const bounds = card.getBoundingClientRect();
      const x = clamp((event.clientX - bounds.left) / bounds.width);
      const y = clamp((event.clientY - bounds.top) / bounds.height);
      Object.assign(cardTiltTarget, { x: (0.5 - y) * 5.6, y: (x - 0.5) * 8, scale: 1.014, glare: 1 });
      surface.style.setProperty("--glare-x", `${(x * 100).toFixed(1)}%`);
      surface.style.setProperty("--glare-y", `${(y * 100).toFixed(1)}%`);
      if (!cardTiltFrame) cardTiltFrame = requestAnimationFrame(animateCardTilt);
    };
    card.addEventListener("pointerenter", update, { passive: true });
    card.addEventListener("pointermove", update, { passive: true });
    card.addEventListener("pointerleave", () => {
      if (tiltedCard === card) resetCardTilt(false);
    }, { passive: true });
  });
  cardTiltQuery.addEventListener("change", () => resetCardTilt());
}

function applyCardState() {
  const deckHeight = cardDeck.clientHeight;
  cards.forEach((card, index) => {
    const behind = currentCardIndex - index;
    const offset = behind >= 0
      ? index * 13 + behind * 16
      : behind === -1
        ? deckHeight - 24 + index * 13
        : deckHeight + 120 + index * 13;
    const scale = behind >= 0 ? 1 - behind * .012 : 1;
    card.style.transform = `translate3d(0, ${offset}px, 0) scale(${scale.toFixed(3)})`;
    card.style.zIndex = String(index + 1);
  });
  cardNumber.textContent = String(currentCardIndex + 1).padStart(2, "0");
  progressFill.style.width = `${currentCardIndex / Math.max(1, cards.length - 1) * 100}%`;
}

function syncCardLayout() {
  resetCardTilt();
  window.clearTimeout(cardLockTimer);
  cardAnimating = false;
  experience.classList.remove("is-card-ready");
  if (desktopCardsQuery.matches) {
    applyCardState();
    window.requestAnimationFrame(() => {
      if (desktopCardsQuery.matches) experience.classList.add("is-card-ready");
    });
  } else {
    cards.forEach((card) => {
      card.style.removeProperty("transform");
      card.style.removeProperty("z-index");
    });
  }
}

function animateExperiencePart(element, side, delay, duration = 760, distance = 42) {
  return element.animate([
    { opacity: 0, transform: `translate3d(${side === "left" ? -distance : distance}px, 0, 0)` },
    { opacity: 1, transform: "translate3d(0, 0, 0)" },
  ], { delay, duration, easing: "cubic-bezier(.16, 1, .3, 1)", fill: "both" });
}

function animateCardContent(card, offset = 0) {
  const parts = [
    [".feature-meta", "left", 0, 700, 30],
    [".feature-kicker", "left", 70, 680, 34],
    [".feature-copy h3", "left", 140, 780, 44],
    [".feature-description", "left", 220, 720, 36],
    [".feature-chips", "left", 300, 700, 30],
    [".feature-foot", "left", 360, 650, 28],
    [".feature-visual", "right", 80, 850, 48],
  ];
  return parts.map(([selector, side, delay, duration, distance]) =>
    animateExperiencePart(card.querySelector(selector), side, offset + delay, duration, distance));
}

function playExperienceEntrance() {
  if (experienceEntrancePlayed || reducedMotion.matches) return;
  experienceEntrancePlayed = true;
  const heading = experience.querySelector(".experience-heading-wrap");
  const parts = [
    [heading.querySelector(".eyebrow"), "left", 0, 690, 34],
    [heading.querySelector("h2"), "left", 90, 800, 48],
    [heading.querySelector("p:last-child"), "left", 210, 720, 34],
    [cardNumber.parentElement, "right", 120, 760, 38],
    [experience.querySelector(".experience-bottom"), "right", 350, 720, 28],
  ];
  const animations = parts.map(([element, side, delay, duration, distance]) =>
    animateExperiencePart(element, side, delay, duration, distance));
  animations.push(cardDeck.animate([{ opacity: 0 }, { opacity: 1 }],
    { delay: 170, duration: 760, easing: "cubic-bezier(.16, 1, .3, 1)", fill: "both" }));
  animations.push(...animateCardContent(cards[currentCardIndex], 210));
  experienceEntranceAnimations = animations;
  Promise.all(animations.map((animation) => animation.finished)).then(() => {
    if (experienceEntranceAnimations !== animations) return;
    experience.classList.remove("is-entrance-ready");
    animations.forEach((animation) => animation.cancel());
    experienceEntranceAnimations = [];
  }).catch(() => {});
}

function updateExperienceEntrance(viewportHeight) {
  if (reducedMotion.matches) return;
  const rect = experience.getBoundingClientRect();
  if (rect.bottom <= 0 || rect.top >= viewportHeight) {
    if (!experienceEntrancePlayed) return;
    experienceEntranceAnimations.forEach((animation) => animation.cancel());
    experienceEntranceAnimations = [];
    cardContentAnimations.forEach((animation) => animation.cancel());
    cardContentAnimations = [];
    experienceEntrancePlayed = false;
    experience.classList.add("is-entrance-ready");
  } else if (rect.top < viewportHeight * .55 && rect.bottom > viewportHeight * .25) {
    playExperienceEntrance();
  }
}

function switchCard(index) {
  if (!desktopCardsQuery.matches || cardAnimating || index < 0 || index >= cards.length || index === currentCardIndex) return false;
  resetCardTilt();
  cardAnimating = true;
  currentCardIndex = index;
  applyCardState();
  if (experienceEntrancePlayed && !reducedMotion.matches) {
    cardContentAnimations.forEach((animation) => animation.cancel());
    const animations = animateCardContent(cards[index]);
    cardContentAnimations = animations;
    Promise.all(animations.map((animation) => animation.finished)).then(() => {
      if (cardContentAnimations !== animations) return;
      animations.forEach((animation) => animation.cancel());
      cardContentAnimations = [];
    }).catch(() => {});
  }
  cardLockTimer = window.setTimeout(() => { cardAnimating = false; }, reducedMotion.matches ? 0 : cardAnimationDuration + 40);
  return true;
}

function cardAreaActive() {
  const y = window.scrollY;
  return desktopCardsQuery.matches && y >= experience.offsetTop - 2 && y < creations.offsetTop - 2;
}

function countWheelIntent(event, direction) {
  const now = performance.now();
  if (now - wheelLastAt > wheelGestureGap || direction !== wheelDirection) {
    wheelAmount = 0;
    wheelGestureUsed = false;
  }
  wheelLastAt = now;
  wheelDirection = direction;
  const pixels = event.deltaMode === 1 ? event.deltaY * 16 : event.deltaMode === 2 ? event.deltaY * window.innerHeight : event.deltaY;
  wheelAmount += Math.abs(pixels);
  if (wheelGestureUsed || wheelAmount < wheelIntentThreshold) return false;
  wheelGestureUsed = true;
  return true;
}

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

function finishCreationsLogoIntro() {
  creationsRevealed = true;
}

function renderCreationsText(progress) {
  const reveal = (start, end) => {
    const amount = clamp((progress - start) / (end - start));
    return amount * amount * (3 - 2 * amount);
  };
  creationsKicker.style.opacity = reveal(0, .17).toFixed(3);
  const starts = [.08, .25, .42, .59];
  creationsLines.forEach((line, index) => {
    const amount = reveal(starts[index], starts[index] + .29);
    line.style.opacity = amount.toFixed(3);
    line.style.transform = `translate3d(0, ${(30 * (1 - amount)).toFixed(1)}px, 0)`;
    line.style.filter = `blur(${(6 * (1 - amount)).toFixed(2)}px)`;
  });
}

function updateCreationsText() {
  creationsTextFrame = 0;
  if (reducedMotion.matches) {
    creationsTextProgress = 1;
    renderCreationsText(1);
    return;
  }
  const scrollDistance = Math.max(1, creations.offsetHeight - window.innerHeight);
  const target = clamp((window.scrollY - creations.offsetTop) / scrollDistance);
  const difference = target - creationsTextProgress;
  creationsTextProgress = Math.abs(difference) < .001 ? target : creationsTextProgress + difference * .16;
  renderCreationsText(creationsTextProgress);
  if (Math.abs(target - creationsTextProgress) >= .001) {
    creationsTextFrame = window.requestAnimationFrame(updateCreationsText);
  }
}

function requestCreationsTextUpdate() {
  if (!creationsTextFrame) creationsTextFrame = window.requestAnimationFrame(updateCreationsText);
}

function resetCreationsContent() {
  pauseLogoFloat();
  activeContentAnimations.forEach((animation) => animation.cancel());
  activeContentAnimations = [];
  creationsAnimating = false;
  creationsRevealed = false;
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

  return logoAnimations;
}

function finishLogoAnimationsWhenDone(animations) {
  Promise.all(animations.map((animation) => animation.finished)).then(() => {
    if (activeContentAnimations !== animations) return;
    const rect = creations.getBoundingClientRect();
    if (rect.bottom <= 0 || rect.top >= window.innerHeight) {
      resetCreationsContent();
      return;
    }
    finishCreationsLogoIntro();
    animations.forEach((animation) => animation.cancel());
    activeContentAnimations = [];
    creationsAnimating = false;
    playLogoFloat();
  }).catch(() => {});
}

function playCreationsStandalone() {
  if (creationsAnimating || creationsRevealed || pageTransition) return;
  if (reducedMotion.matches) {
    finishCreationsLogoIntro();
    return;
  }
  creationsAnimating = true;
  const animations = animateCreationElements(true);
  activeContentAnimations = animations;
  finishLogoAnimationsWhenDone(animations);
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
  requestCreationsTextUpdate();

  const viewportHeight = window.innerHeight;
  updateExperienceEntrance(viewportHeight);

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
  const start = desktopCardsQuery.matches ? experience.offsetTop : end - Math.min(80, window.innerHeight * 0.1);
  return { start, end };
}

function rememberGesture(direction) {
  lastGestureDirection = direction;
  lastGestureAt = performance.now();
}

function playPageTransition(direction) {
  if (pageTransition || reducedMotion.matches) return;
  resetCardTilt();

  const { start, end } = transitionBounds();
  const forward = direction === "forward";
  if (forward && !reducedMotion.matches) {
    creationsTextProgress = 0;
    renderCreationsText(0);
  }
  if (!forward && desktopCardsQuery.matches) {
    currentCardIndex = cards.length - 1;
    applyCardState();
  }
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
    if (forward) finishLogoAnimationsWhenDone(contentAnimations);

    stageAnimation.finished.then(() => {
      pageTransition.lockY = destination;
      window.scrollTo({ top: destination, behavior: "instant" });
      previousScrollY = destination;
      window.history.replaceState(null, "", forward ? "#creations" : "#experience");
      if (!forward) resetCreationsContent();
      creationsStage.classList.remove("is-screen-transition");
      creationsStage.style.removeProperty("transform");
      stageAnimation.cancel();
      document.documentElement.classList.remove("is-page-transitioning");
      pageTransition = null;
      lastGestureDirection = 0;
      lastGestureAt = -Infinity;
      requestUpdate();
    }).catch(() => {});
  });
}

function maybeStartPageTransition(direction) {
  if (pageTransition || reducedMotion.matches) return false;
  const { start, end } = transitionBounds();
  const y = window.scrollY;
  if (direction > 0 && (!desktopCardsQuery.matches || currentCardIndex === cards.length - 1) && y >= start - 2 && y < end) {
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

  if (desktopCardsQuery.matches && currentCardIndex < cards.length - 1 && y >= creations.offsetTop - 1 && previousScrollY < experience.offsetTop && lastGestureDirection > 0 && performance.now() - lastGestureAt < 700) {
    window.scrollTo({ top: experience.offsetTop, behavior: "instant" });
    previousScrollY = experience.offsetTop;
    requestUpdate();
    return;
  }

  if (desktopCardsQuery.matches && y > experience.offsetTop + 1 && y < creations.offsetTop - 1 && (currentCardIndex < cards.length - 1 || cardAnimating)) {
    window.scrollTo({ top: experience.offsetTop, behavior: "instant" });
    previousScrollY = experience.offsetTop;
    requestUpdate();
    return;
  }

  if (!desktopCardsQuery.matches && !reducedMotion.matches && performance.now() - lastGestureAt < 700) {
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
  if (cardAreaActive()) {
    const wantsCard = direction > 0 ? currentCardIndex < cards.length - 1 : currentCardIndex > 0;
    const wantsNextPage = direction > 0 && currentCardIndex === cards.length - 1 && !reducedMotion.matches;
    const intentional = countWheelIntent(event, direction);
    if (cardAnimating || wheelGestureUsed && !intentional) {
      event.preventDefault();
      return;
    }
    if (wantsCard || wantsNextPage) {
      event.preventDefault();
      if (intentional) {
        if (wantsCard) switchCard(currentCardIndex + direction);
        else playPageTransition("forward");
      }
      return;
    }
  }
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
  if (cardAreaActive()) {
    if (cardAnimating) {
      event.preventDefault();
      return;
    }
    if (switchCard(currentCardIndex + direction)) {
      event.preventDefault();
      return;
    }
  }
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
window.addEventListener("scroll", () => {
  if (tiltedCard && !cardAreaActive()) resetCardTilt();
}, { passive: true });
window.addEventListener("scroll", updateVideoPlayback, { passive: true });
window.addEventListener("resize", () => {
  syncCardLayout();
  requestUpdate();
}, { passive: true });
window.addEventListener("resize", updateVideoPlayback, { passive: true });
document.addEventListener("visibilitychange", updateVideoPlayback);
document.addEventListener("visibilitychange", () => {
  if (document.hidden) {
    pauseLogoFloat();
    resetCardTilt();
  }
  else requestUpdate();
});
reducedMotion.addEventListener("change", updateVideoPlayback);
reducedMotion.addEventListener("change", () => {
  if (reducedMotion.matches) {
    resetCardTilt();
    pauseLogoFloat();
    if (creationsAnimating && !pageTransition) resetCreationsContent();
    experienceEntranceAnimations.forEach((animation) => animation.cancel());
    experienceEntranceAnimations = [];
    cardContentAnimations.forEach((animation) => animation.cancel());
    cardContentAnimations = [];
    experienceEntrancePlayed = true;
    experience.classList.remove("is-entrance-ready");
  } else {
    experienceEntrancePlayed = false;
    experience.classList.add("is-entrance-ready");
  }
  requestUpdate();
});
document.querySelector('.side-index-item[data-target="creations"]').addEventListener("click", (event) => {
  event.preventDefault();
  if (!reducedMotion.matches) {
    creationsTextProgress = 0;
    renderCreationsText(0);
  }
  window.history.pushState(null, "", "#creations");
  window.scrollTo({ top: creations.offsetTop, behavior: "instant" });
  previousScrollY = window.scrollY;
  lastGestureAt = -Infinity;
  requestUpdate();
});
document.querySelector('.side-index-item[data-target="experience"]').addEventListener("click", () => {
  currentCardIndex = 0;
  syncCardLayout();
});

function setupCommunitySpotlight() {
  const hoverQuery = window.matchMedia("(hover: hover) and (pointer: fine)");
  document.querySelectorAll(".community-cell").forEach((cell) => {
    const updatePosition = (event) => {
      if (!hoverQuery.matches || reducedMotion.matches || event.pointerType !== "mouse") return;
      const bounds = cell.getBoundingClientRect();
      cell.style.setProperty("--mouse-x", `${event.clientX - bounds.left}px`);
      cell.style.setProperty("--mouse-y", `${event.clientY - bounds.top}px`);
    };
    cell.addEventListener("pointerenter", updatePosition, { passive: true });
    cell.addEventListener("pointermove", updatePosition, { passive: true });
  });
}

setupCommunitySpotlight();
setupCardTilt();
setupHeroFocus();
syncCardLayout();
updatePage();
updateVideoPlayback();
