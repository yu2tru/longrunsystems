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

  // Sequence marker: a blue dot hops along the process line, squashing on
  // take-off and landing, turns into a green check on the last step with a
  // small ring, then exits past the edge and comes back around. Runs only
  // while the panel is on screen. Reduced motion: CSS hides it and shows a
  // still check instead.
  var sequences = document.querySelectorAll(".sequence");
  if (sequences.length && !reduceMotion.matches && Element.prototype.animate) {
    sequences.forEach(runSequence);
  }

  function runSequence(seq) {
    var steps = seq.querySelectorAll(".sequence-step");
    if (steps.length < 2) return;
    var ball = document.createElement("span");
    ball.className = "seq-ball";
    ball.setAttribute("aria-hidden", "true");
    ball.innerHTML = '<span class="seq-ball-ring"></span><span class="seq-ball-dot"></span>' +
      '<svg class="seq-ball-check" viewBox="0 0 23 23" focusable="false"><path d="M7.4 11.9 L10.2 14.6 L15.6 8.9"/></svg>';
    seq.appendChild(ball);
    var dot = ball.querySelector(".seq-ball-dot");
    var ring = ball.querySelector(".seq-ball-ring");
    var tick = ball.querySelector(".seq-ball-check path");
    var styles = window.getComputedStyle(seq);
    var blue = styles.getPropertyValue("--accent").trim();
    var green = styles.getPropertyValue("--ok").trim();

    var visible = false, waiting = [];
    new IntersectionObserver(function (entries) {
      visible = entries[0].isIntersecting;
      if (visible) { waiting.forEach(function (go) { go(); }); waiting = []; }
    }).observe(seq);
    var whenVisible = function () {
      return visible ? Promise.resolve() : new Promise(function (go) { waiting.push(go); });
    };
    var wait = function (ms) { return new Promise(function (go) { setTimeout(go, ms); }); };
    // Play keyframes, then keep the end state as plain style so nothing piles up.
    var play = function (el, frames, opts) {
      var a = el.animate(frames, Object.assign({ fill: "forwards" }, opts));
      return a.finished.then(function () {
        var end = frames[frames.length - 1];
        Object.keys(end).forEach(function (k) { if (k !== "offset" && k !== "easing") el.style[k] = end[k]; });
        a.cancel();
      });
    };
    var at = function (p) { return "translate(" + p.x.toFixed(1) + "px," + p.y.toFixed(1) + "px)"; };
    // Center of step i's static dot, measured fresh each time (layout can change).
    var center = function (i) {
      var st = steps[i], cs = window.getComputedStyle(st, "::before");
      var sr = st.getBoundingClientRect(), qr = seq.getBoundingClientRect();
      return {
        x: sr.left - qr.left + parseFloat(cs.left) + parseFloat(cs.width) / 2,
        y: sr.top - qr.top + parseFloat(cs.top) + parseFloat(cs.height) / 2
      };
    };
    var squashUp = [{ transform: "scale(1,1)" }, { transform: "scale(1.24,0.76)", offset: 0.6 }, { transform: "scale(0.9,1.12)" }];
    var squashDown = [{ transform: "scale(0.94,1.07)" }, { transform: "scale(1.26,0.74)", offset: 0.35 }, { transform: "scale(0.97,1.03)", offset: 0.7 }, { transform: "scale(1,1)" }];
    // One hop: anticipation squash, an arc sampled point by point (bulging
    // up when moving sideways, outward when moving down), and a landing squash.
    var hop = function (a, b, lift) {
      var dx = b.x - a.x, dy = b.y - a.y, len = Math.sqrt(dx * dx + dy * dy) || 1;
      var nx = dy / len, ny = -dx / len, h = lift || Math.min(30, 10 + len * 0.1);
      var path = [];
      for (var i = 0; i <= 24; i++) {
        var t = i / 24, up = 4 * t * (1 - t) * h;
        path.push({ transform: at({ x: a.x + dx * t + nx * up, y: a.y + dy * t + ny * up }), offset: t });
      }
      return play(dot, squashUp, { duration: 170, easing: "ease-in-out" }).then(function () {
        return Promise.all([
          play(ball, path, { duration: Math.min(720, 380 + len * 0.6), easing: "cubic-bezier(0.45, 0.05, 0.55, 0.95)" }),
          play(dot, [{ transform: "scale(0.9,1.12)" }, { transform: "scale(1,1)", offset: 0.5 }, { transform: "scale(0.94,1.07)" }], { duration: Math.min(720, 380 + len * 0.6) })
        ]);
      }).then(function () {
        return play(dot, squashDown, { duration: 280, easing: "ease-out" });
      });
    };

    var loop = function () {
      var n = steps.length, i = 0;
      var next = function () {
        return whenVisible().then(function () { return wait(1000); }).then(function () {
          if (i < n - 1) { i++; return hop(center(i - 1), center(i)).then(i < n - 1 ? next : finish); }
          return finish();
        });
      };
      var finish = function () {
        // Blue to green, then into a check, with one quiet ring.
        return play(dot, [{ backgroundColor: blue }, { backgroundColor: green }], { duration: 240, easing: "ease-out" }).then(function () {
          return Promise.all([
            play(dot, [{ transform: "scale(1,1)" }, { transform: "scale(1.45,1.45)" }], { duration: 300, easing: "cubic-bezier(0.3, 1.3, 0.5, 1)" }),
            play(tick, [{ strokeDashoffset: "20" }, { strokeDashoffset: "0" }], { duration: 380, delay: 120, easing: "cubic-bezier(0.3, 0.7, 0.3, 1)" }),
            play(ring, [{ transform: "scale(1)", opacity: 0.7 }, { transform: "scale(3.4)", opacity: 0 }], { duration: 820, delay: 80, easing: "cubic-bezier(0.2, 0.7, 0.3, 1)" })
          ]);
        }).then(function () { return wait(2000); }).then(function () {
          // Back to a blue dot.
          return Promise.all([
            play(tick, [{ strokeDashoffset: "0" }, { strokeDashoffset: "20" }], { duration: 260, easing: "ease-in" }),
            play(dot, [{ transform: "scale(1.45,1.45)", backgroundColor: green }, { transform: "scale(1,1)", backgroundColor: blue }], { duration: 380, delay: 120, easing: "ease-in-out" })
          ]);
        }).then(function () { return wait(400); }).then(exitAndReturn);
      };
      // Hop to the far edge (right, or bottom when the line runs down), squash
      // against it, slip out, then come back in from the opposite edge.
      var exitAndReturn = function () {
        var first = center(0), second = center(1), last = center(n - 1);
        var across = Math.abs(second.x - first.x) >= Math.abs(second.y - first.y);
        var w = seq.clientWidth, hgt = seq.clientHeight;
        var edge = across ? { x: w - 7, y: last.y } : { x: last.x, y: hgt - 7 };
        var out = across ? { x: w + 18, y: last.y } : { x: last.x, y: hgt + 18 };
        var start = across ? { x: -18, y: first.y } : { x: first.x, y: -18 };
        var enter = across ? { x: 8, y: first.y } : { x: first.x, y: 8 };
        return hop(last, edge, 16).then(function () {
          return play(ball, [{ transform: at(edge), opacity: 1 }, { transform: at(out), opacity: 0 }], { duration: 320, easing: "ease-in" });
        }).then(function () { return wait(500); }).then(function () {
          return play(ball, [{ transform: at(start), opacity: 0 }, { transform: at(enter), opacity: 1 }], { duration: 300, easing: "ease-out" });
        }).then(function () {
          return hop(enter, center(0), 14);
        }).then(loop);
      };
      return next();
    };

    ball.style.transform = at(center(0));
    loop();
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
