(function () {
  document.getElementById("year").textContent = new Date().getFullYear();

  var reduceMotion = window.matchMedia("(prefers-reduced-motion: reduce)");

  // Where a section should land: just below the fixed header.
  var landingY = function (target) {
    var bar = document.querySelector(".site-header");
    var y = target.getBoundingClientRect().top + window.pageYOffset - (bar ? bar.offsetHeight : 0) - 16;
    return Math.max(0, Math.min(y, document.documentElement.scrollHeight - window.innerHeight));
  };
  // One requestAnimationFrame loop, ease-in-out over 800ms. Any wheel, touch,
  // or key press hands control back to the reader. Reduced motion: jump.
  var scrollRun = 0;
  var smoothScrollTo = function (y) {
    var run = ++scrollRun;
    if (reduceMotion.matches) { window.scrollTo(0, y); return; }
    var from = window.pageYOffset, dist = y - from, start = null, duration = 800;
    if (Math.abs(dist) < 2) return;
    var ease = function (t) { return t < 0.5 ? 4 * t * t * t : 1 - Math.pow(-2 * t + 2, 3) / 2; };
    var step = function (now) {
      if (run !== scrollRun) return;
      if (start === null) start = now;
      var t = Math.min(1, (now - start) / duration);
      window.scrollTo(0, from + dist * ease(t));
      if (t < 1) window.requestAnimationFrame(step);
    };
    window.requestAnimationFrame(step);
  };
  ["wheel", "touchstart", "keydown"].forEach(function (type) {
    window.addEventListener(type, function () { scrollRun++; }, { passive: true });
  });

  // In-page links scroll without adding "#section" to the address bar.
  // Arriving with a hash (a link like "../#contact" from another page):
  // go straight to that section, then tidy the hash off the URL.
  if (location.hash) {
    var arrival = document.getElementById(location.hash.slice(1));
    history.replaceState(null, "", location.pathname + location.search);
    if (arrival) window.scrollTo(0, landingY(arrival));
  }
  document.addEventListener("click", function (event) {
    var link = event.target.closest("a");
    if (!link || link.classList.contains("skip-link")) return;
    if (event.metaKey || event.ctrlKey || event.shiftKey || event.altKey) return;
    var href = link.getAttribute("href");
    if (href === "#") { event.preventDefault(); return; } // placeholder links
    if (href === "./") {
      event.preventDefault();
      smoothScrollTo(0);
      return;
    }
    if (!href || href.charAt(0) !== "#") return;
    var target = document.getElementById(href.slice(1));
    if (!target) return;
    event.preventDefault();
    smoothScrollTo(landingY(target));
    target.setAttribute("tabindex", "-1");
    target.focus({ preventScroll: true });
  });

  // Press and hold on touch counts as hover: a panel lifts, a qualifying word
  // brightens. Released on lift-off, on pointercancel (which fires when the
  // gesture turns into a scroll), or on any page scroll, so nothing sticks.
  var pressed = null;
  var release = function () {
    if (pressed) { pressed.classList.remove("is-pressed"); pressed = null; }
  };
  document.addEventListener("pointerdown", function (event) {
    if (event.pointerType === "mouse") return;
    var el = event.target.closest(".box, .typelist li");
    if (!el) return;
    release();
    pressed = el;
    el.classList.add("is-pressed");
  }, { passive: true });
  document.addEventListener("pointerup", release, { passive: true });
  document.addEventListener("pointercancel", release, { passive: true });
  window.addEventListener("scroll", release, { passive: true });

  // Mobile menu: a toggle that turns into an X, and a drawer from the right
  // listing the same links as the desktop nav.
  var header = document.querySelector(".site-header");
  var navLinks = document.querySelectorAll(".site-nav a");
  if (header && navLinks.length) {
    var toggle = document.createElement("button");
    toggle.type = "button";
    toggle.className = "menu-toggle";
    toggle.setAttribute("aria-expanded", "false");
    toggle.setAttribute("aria-controls", "mobile-menu");
    toggle.setAttribute("aria-label", "Open menu");
    toggle.innerHTML = '<span class="bar"></span><span class="bar"></span><span class="bar"></span>';
    header.querySelector(".container").appendChild(toggle);

    var drawer = document.createElement("nav");
    drawer.id = "mobile-menu";
    drawer.className = "drawer";
    drawer.setAttribute("aria-label", "Menu");
    var list = document.createElement("ul");
    list.setAttribute("role", "list");
    var last = navLinks[navLinks.length - 1];
    navLinks.forEach(function (link) {
      if (link === last) return;
      var item = document.createElement("li");
      var copy = link.cloneNode(true);
      copy.className = "drawer-link";
      item.appendChild(copy);
      list.appendChild(item);
    });
    drawer.appendChild(list);
    var cta = last.cloneNode(true); // "Get in touch" becomes a full-width button
    cta.className = "btn";
    drawer.appendChild(cta);

    var backdrop = document.createElement("div");
    backdrop.className = "drawer-backdrop";
    header.after(backdrop, drawer);
    drawer.inert = true;

    var setOpen = function (open) {
      toggle.setAttribute("aria-expanded", String(open));
      toggle.setAttribute("aria-label", open ? "Close menu" : "Open menu");
      drawer.classList.toggle("is-open", open);
      backdrop.classList.toggle("is-open", open);
      document.documentElement.classList.toggle("menu-open", open);
      drawer.inert = !open;
      if (!open && drawer.contains(document.activeElement)) toggle.focus();
    };
    toggle.addEventListener("click", function () {
      setOpen(toggle.getAttribute("aria-expanded") !== "true");
    });
    backdrop.addEventListener("click", function () { setOpen(false); });
    // iOS can still scroll the page by dragging on the backdrop; stop that.
    backdrop.addEventListener("touchmove", function (event) { event.preventDefault(); }, { passive: false });
    drawer.addEventListener("click", function (event) {
      if (event.target.closest("a")) setOpen(false);
    });
    document.addEventListener("keydown", function (event) {
      if (event.key === "Escape" && drawer.classList.contains("is-open")) setOpen(false);
    });
    window.matchMedia("(min-width: 880px)").addEventListener("change", function (mq) {
      if (mq.matches) setOpen(false);
    });
  }

  // Accordion
  var triggers = document.querySelectorAll(".accordion-trigger");
  triggers.forEach(function (trigger) {
    var panel = document.getElementById(trigger.getAttribute("aria-controls"));
    panel.setAttribute("inert", "");
    trigger.addEventListener("click", function () {
      var open = trigger.getAttribute("aria-expanded") === "true";
      trigger.setAttribute("aria-expanded", String(!open));
      panel.setAttribute("data-open", String(!open));
      if (open) panel.setAttribute("inert", "");
      else panel.removeAttribute("inert");
    });
  });

  // Contact form: send in the background and confirm in place.
  // Without JS, the form still posts to Formspree normally.
  var form = document.querySelector(".form");
  var status = document.getElementById("form-status");
  form.addEventListener("submit", function (event) {
    event.preventDefault();
    var button = form.querySelector('button[type="submit"]');
    button.disabled = true;
    status.className = "form-note";
    status.textContent = "Sending...";
    fetch(form.action, {
      method: "POST",
      body: new FormData(form),
      headers: { Accept: "application/json" }
    }).then(function (response) {
      if (!response.ok) throw new Error(response.status);
      form.reset();
      status.className = "form-note is-sent";
      status.textContent = "Thanks. I'll be in touch within one business day.";
    }).catch(function () {
      status.className = "form-note is-error";
      status.textContent = "That didn't go through. Try again, or call or email me directly.";
    }).then(function () {
      button.disabled = false;
    });
  });

  // Horizontal panel tracks (home page: receptionist and Lead Scraper).
  // Wide screens with a mouse: the section pins and vertical scroll moves the
  // track sideways, over a finite distance equal to the track's overflow, then
  // normal scrolling resumes. Touch, narrow screens, or a viewport too short to
  // hold the pinned section: a native swipe carousel. Reduced motion: CSS lays
  // the panels out as a plain grid and nothing here pins or moves them.
  var pinQuery = window.matchMedia("(min-width: 900px) and (hover: hover) and (pointer: fine)");
  var tracks = [];
  document.querySelectorAll("[data-hscroll]").forEach(function (section) {
    var t = {
      section: section,
      pin: section.querySelector(".hscroll-pin") || section,
      inner: section.querySelector(".hscroll-sticky > .container"),
      track: section.querySelector(".hscroll-track"),
      bar: section.querySelector(".hscroll-progress"),
      pinned: false,
      travel: 0,
      offset: 0
    };
    t.track.addEventListener("scroll", function () { if (!t.pinned) progress(t); }, { passive: true });
    tracks.push(t);
  });

  function progress(t) {
    var p;
    if (t.pinned) {
      var into = t.offset - t.pin.getBoundingClientRect().top;
      p = Math.min(1, Math.max(0, into / t.travel));
      t.track.style.setProperty("--x", (p * t.travel).toFixed(1));
    } else {
      var max = t.track.scrollWidth - t.track.clientWidth;
      p = max > 0 ? t.track.scrollLeft / max : 0;
    }
    if (t.bar) t.bar.style.setProperty("--p", p.toFixed(4));
  }

  function layoutTracks() {
    var headerH = header ? header.offsetHeight : 0;
    var room = window.innerHeight - headerH;
    tracks.forEach(function (t) {
      t.section.classList.remove("is-pinned");
      t.pin.style.height = "";
      t.track.style.removeProperty("--x");
      t.pinned = false;
      if (!reduceMotion.matches && pinQuery.matches) {
        t.section.classList.add("is-pinned");
        t.travel = Math.max(0, t.track.scrollWidth - t.track.clientWidth);
        // Pin only if the whole section fits on screen and there is somewhere to go.
        if (t.travel > 8 && t.inner.offsetHeight <= room - 24) {
          t.pinned = true;
          t.offset = headerH;
          t.pin.style.height = (room + t.travel) + "px";
        } else {
          t.section.classList.remove("is-pinned");
        }
      }
      // A focusable list only when it really scrolls sideways (arrow keys move it).
      var scrolls = !t.pinned && !reduceMotion.matches;
      if (scrolls) t.track.setAttribute("tabindex", "0");
      else t.track.removeAttribute("tabindex");
      progress(t);
    });
  }

  if (tracks.length) {
    var queued = false;
    var onScroll = function () {
      if (queued) return;
      queued = true;
      window.requestAnimationFrame(function () {
        queued = false;
        tracks.forEach(function (t) { if (t.pinned) progress(t); });
      });
    };
    var relayout = function () { window.requestAnimationFrame(layoutTracks); };
    window.addEventListener("scroll", onScroll, { passive: true });
    window.addEventListener("resize", relayout);
    window.addEventListener("load", relayout);
    reduceMotion.addEventListener("change", relayout);
    pinQuery.addEventListener("change", relayout);
    layoutTracks();
  }

  // Headline gradient: one line runs left to right, two or more lines fall
  // off from the top left. Re-checked whenever the layout can change.
  var heads = document.querySelectorAll("main h1, main h2");
  var markHeads = function () {
    heads.forEach(function (h) {
      h.classList.add("grad");
      var lh = parseFloat(window.getComputedStyle(h).lineHeight);
      var lines = lh ? Math.round(h.getBoundingClientRect().height / lh) : 1;
      h.classList.toggle("grad--multi", lines > 1);
    });
  };
  markHeads();
  var headsQueued = false;
  window.addEventListener("resize", function () {
    if (headsQueued) return;
    headsQueued = true;
    window.requestAnimationFrame(function () { headsQueued = false; markHeads(); });
  });
  window.addEventListener("load", markHeads);
  if (document.fonts && document.fonts.ready) document.fonts.ready.then(markHeads);

  // Process animation: CSS keyframes on overlay spans (transform and opacity
  // only). The script only adds the spans and pauses the cycle off screen.
  document.querySelectorAll(".sequence").forEach(function (seq) {
    var steps = seq.querySelectorAll(".sequence-step");
    steps.forEach(function (step, i) {
      if (i < steps.length - 1) {
        var line = document.createElement("span");
        line.className = "seq-progress";
        line.setAttribute("aria-hidden", "true");
        step.appendChild(line);
      }
      var fill = document.createElement("span");
      fill.className = "seq-fill";
      fill.setAttribute("aria-hidden", "true");
      step.appendChild(fill);
    });
    if (!("IntersectionObserver" in window)) { seq.classList.add("is-running"); return; }
    new IntersectionObserver(function (entries) {
      seq.classList.toggle("is-running", entries[0].isIntersecting);
    }).observe(seq);
  });

  // Reveal: the one path every .reveal element on every page goes through.
  // Elements already on screen at load are shown after a double
  // requestAnimationFrame, so their hidden state has painted. Everything else
  // is shown by one IntersectionObserver as it enters. Either way a group
  // that appears together staggers in DOM order (data-reveal-step 0 to 4),
  // and no element is shown twice.
  var items = Array.prototype.slice.call(document.querySelectorAll(".reveal"));
  var root = document.documentElement;
  var showNow = function (el) { el.classList.add("is-visible", "is-done"); };
  // The CSS failsafe reveals everything 3s after first paint if this script
  // never runs. If it already fired (a very slow load), keep things visible.
  if (window.performance && performance.now() > 3000) items.forEach(showNow);
  root.classList.add("reveal-ready");
  if (reduceMotion.matches || !("IntersectionObserver" in window)) {
    items.forEach(showNow);
    return;
  }
  items.forEach(function (el) {
    el.addEventListener("transitionend", function (event) {
      if (event.target === el && event.propertyName === "opacity") {
        el.classList.add("is-done");
        el.removeAttribute("data-reveal-step");
      }
    });
  });
  var reveal = function (group) {
    var step = 0;
    group.forEach(function (el) {
      if (el.classList.contains("is-visible")) return;
      el.setAttribute("data-reveal-step", String(Math.min(step++, 4)));
      void el.offsetWidth; // commit the hidden state before changing it
      el.classList.add("is-visible");
    });
  };
  var afterPaint = function (fn) {
    window.requestAnimationFrame(function () { window.requestAnimationFrame(fn); });
  };
  var onScreen = [], later = [];
  items.forEach(function (el) {
    if (el.classList.contains("is-visible")) return;
    var box = el.getBoundingClientRect();
    (box.bottom > 0 && box.top < window.innerHeight ? onScreen : later).push(el);
  });
  afterPaint(function () { reveal(onScreen); });
  var observer = new IntersectionObserver(function (entries) {
    var group = [];
    entries.forEach(function (entry) {
      if (!entry.isIntersecting) return;
      observer.unobserve(entry.target);
      group.push(entry.target);
    });
    if (!group.length) return;
    group.sort(function (x, y) {
      return x.compareDocumentPosition(y) & Node.DOCUMENT_POSITION_FOLLOWING ? -1 : 1;
    });
    afterPaint(function () { reveal(group); });
  }, { rootMargin: "0px 0px -6% 0px", threshold: 0 });
  later.forEach(function (el) { observer.observe(el); });
})();
