(function () {
  document.getElementById("year").textContent = new Date().getFullYear();

  // In-page links scroll without adding "#section" to the address bar.
  // Arriving with a hash (a link like "../#examples" from another page):
  // go to that section, then tidy the hash off the URL.
  if (location.hash) {
    var arrival = document.getElementById(location.hash.slice(1));
    history.replaceState(null, "", location.pathname + location.search);
    if (arrival) arrival.scrollIntoView({ behavior: "instant" });
  }
  document.addEventListener("click", function (event) {
    var link = event.target.closest("a");
    if (!link || link.classList.contains("skip-link")) return;
    if (event.metaKey || event.ctrlKey || event.shiftKey || event.altKey) return;
    var href = link.getAttribute("href");
    if (href === "#") { event.preventDefault(); return; } // placeholder links
    if (href === "./") {
      event.preventDefault();
      window.scrollTo({ top: 0 });
      return;
    }
    if (!href || href.charAt(0) !== "#") return;
    var target = document.getElementById(href.slice(1));
    if (!target) return;
    event.preventDefault();
    target.scrollIntoView();
    target.setAttribute("tabindex", "-1");
    target.focus({ preventScroll: true });
  });

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
  var reduceMotion = window.matchMedia("(prefers-reduced-motion: reduce)");
  var pinQuery = window.matchMedia("(min-width: 900px) and (hover: hover) and (pointer: fine)");
  var tracks = [];
  document.querySelectorAll("[data-hscroll]").forEach(function (section) {
    var t = {
      section: section,
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
      var into = t.offset - t.section.getBoundingClientRect().top;
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
      t.section.style.height = "";
      t.track.style.removeProperty("--x");
      t.pinned = false;
      if (!reduceMotion.matches && pinQuery.matches) {
        t.section.classList.add("is-pinned");
        t.travel = Math.max(0, t.track.scrollWidth - t.track.clientWidth);
        // Pin only if the whole section fits on screen and there is somewhere to go.
        if (t.travel > 8 && t.inner.offsetHeight <= room - 24) {
          t.pinned = true;
          t.offset = headerH;
          t.section.style.height = (room + t.travel) + "px";
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

  // Scroll reveal
  var items = document.querySelectorAll(".reveal");
  var reduce = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
  if (reduce || !("IntersectionObserver" in window)) {
    items.forEach(function (el) { el.classList.add("is-visible"); });
    return;
  }
  var observer = new IntersectionObserver(function (entries) {
    entries.forEach(function (entry) {
      if (entry.isIntersecting) {
        entry.target.classList.add("is-visible");
        observer.unobserve(entry.target);
      }
    });
  }, { rootMargin: "0px 0px -8% 0px", threshold: 0.08 });
  items.forEach(function (el) { observer.observe(el); });
})();
