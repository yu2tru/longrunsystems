(function () {
  document.getElementById("year").textContent = new Date().getFullYear();

  var reduceMotion = window.matchMedia("(prefers-reduced-motion: reduce)");

  // Scroll position: with restoration set to manual (see <head>), a reload
  // opens at the top. Back and forward still return to where you were: the
  // position is saved when you leave and put back only for a back_forward
  // navigation that reloaded the page. A page restored from bfcache is
  // already where you left it and is not touched.
  var scrollKey = "scroll:" + location.pathname;
  var navEntry = window.performance && performance.getEntriesByType ? performance.getEntriesByType("navigation")[0] : null;
  try {
    if (navEntry && navEntry.type === "back_forward" && !location.hash) {
      var saved = parseInt(sessionStorage.getItem(scrollKey), 10);
      if (saved > 0) window.scrollTo(0, saved);
    }
  } catch (e) {}
  window.addEventListener("pagehide", function () {
    try { sessionStorage.setItem(scrollKey, String(Math.round(window.pageYOffset))); } catch (e) {}
  });

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

    // While open, no drag or wheel anywhere moves the page; the drawer still
    // scrolls if its links ever overflow it (overscroll-behavior keeps that
    // from chaining to the page). Listening only while open keeps normal
    // scrolling passive and fast.
    var holdScroll = function (event) {
      if (drawer.contains(event.target) && drawer.scrollHeight > drawer.clientHeight + 1) return;
      event.preventDefault();
    };
    var setOpen = function (open) {
      var method = open ? "addEventListener" : "removeEventListener";
      document[method]("touchmove", holdScroll, { passive: false });
      document[method]("wheel", holdScroll, { passive: false });
      toggle.setAttribute("aria-expanded", String(open));
      toggle.setAttribute("aria-label", open ? "Close menu" : "Open menu");
      drawer.classList.toggle("is-open", open);
      backdrop.classList.toggle("is-open", open);
      document.documentElement.classList.toggle("menu-open", open);
      drawer.inert = !open;
      // Opening moves nothing: no focus change, no scrolling, no change to
      // overflow or position anywhere (see .menu-open in styles.css).
      if (!open && drawer.contains(document.activeElement)) toggle.focus({ preventScroll: true });
    };
    toggle.addEventListener("click", function () {
      setOpen(toggle.getAttribute("aria-expanded") !== "true");
    });
    backdrop.addEventListener("click", function () { setOpen(false); });
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
      var cs = window.getComputedStyle(h);
      var lh = parseFloat(cs.lineHeight);
      var textHeight = h.getBoundingClientRect().height - parseFloat(cs.paddingTop) - parseFloat(cs.paddingBottom);
      var lines = lh ? Math.round(textHeight / lh) : 1;
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

  // Hero headline, letter by letter. Split at runtime into words (kept
  // together so lines still break between words) and letters. Each letter is
  // an outer .ch that animates and an inner .ch-in that carries a slice of the
  // headline's one gradient: background sized to the whole headline and
  // offset by the letter's position. The heading keeps its text as an
  // aria-label; the letter spans are hidden from screen readers. Reduced
  // motion: not split at all, the headline shows as it always has.
  var heroHead = document.querySelector(".hero h1");
  var placeLetters = function () {};
  if (heroHead && !reduceMotion.matches && heroHead.parentElement.classList.contains("reveal")) {
    heroHead.setAttribute("aria-label", heroHead.textContent.replace(/\s+/g, " ").trim());
    var letters = [];
    var splitNode = function (node) {
      Array.prototype.slice.call(node.childNodes).forEach(function (child) {
        if (child.nodeType === 1) { splitNode(child); return; }
        if (child.nodeType !== 3) return;
        var frag = document.createDocumentFragment();
        child.textContent.split(/(\s+)/).forEach(function (part) {
          if (!part) return;
          if (/^\s+$/.test(part)) { frag.appendChild(document.createTextNode(" ")); return; }
          var word = document.createElement("span");
          word.className = "hl-word";
          word.setAttribute("aria-hidden", "true");
          Array.prototype.forEach.call(part, function (chr) {
            // Punctuation stays in the same span as the letter before it, so
            // that pair keeps its kerning (a lone "." drifts away otherwise).
            var prev = word.lastChild;
            if (prev && /[.,;:?'"\u2019)]/.test(chr)) { prev.firstChild.textContent += chr; return; }
            var ch = document.createElement("span");
            ch.className = "ch";
            var inner = document.createElement("span");
            inner.className = "ch-in";
            inner.textContent = chr;
            ch.appendChild(inner);
            word.appendChild(ch);
            letters.push(ch);
          });
          frag.appendChild(word);
        });
        node.replaceChild(frag, child);
      });
    };
    splitNode(heroHead);
    heroHead.classList.add("hl");
    heroHead.parentElement.classList.add("hl-host");
    letters.forEach(function (ch, i) { ch.style.setProperty("--i", i); });
    heroHead.style.setProperty("--hl-step", "calc(var(--hl-spread) / " + Math.max(1, letters.length - 1) + ")");
    // Each letter's position inside the headline, from layout offsets, which
    // ignore the animation transforms. A transformed .ch becomes its inner
    // span's offsetParent, so walk the chain up to the heading and add it up.
    var offsetIn = function (el) {
      var x = 0, y = 0;
      while (el && el !== heroHead) { x += el.offsetLeft; y += el.offsetTop; el = el.offsetParent; }
      return { x: x, y: y };
    };
    // The headline's gradient (see .grad in styles.css), restated in pixels
    // on a canvas M px larger on every side: one line runs left to right
    // (30% bright, then to the muted tone at the far edge), two or more lines
    // fall off from the top left (a farthest-corner ellipse, radii W and H
    // times root 2). Inside the headline box it is the same gradient; past
    // the edges the end colours simply carry on.
    var M = 200;
    placeLetters = function () {
      var W = heroHead.offsetWidth, H = heroHead.offsetHeight;
      var css = window.getComputedStyle(heroHead);
      var bright = css.getPropertyValue("--text").trim(), muted = css.getPropertyValue("--text-tone").trim();
      var grad = heroHead.classList.contains("grad--multi")
        ? "radial-gradient(ellipse " + (W * Math.SQRT2) + "px " + (H * Math.SQRT2) + "px at " + M + "px " + M + "px, " + bright + " 30%, " + muted + " 100%)"
        : "linear-gradient(to right, " + bright + " " + M + "px, " + bright + " " + (M + W * 0.3) + "px, " + muted + " " + (M + W) + "px)";
      heroHead.style.setProperty("--hl-grad", grad);
      heroHead.style.setProperty("--hl-w", (W + 2 * M) + "px");
      heroHead.style.setProperty("--hl-h", (H + 2 * M) + "px");
      letters.forEach(function (ch) {
        var at = offsetIn(ch.firstChild);
        ch.firstChild.style.setProperty("--x", -(at.x + M) + "px");
        ch.firstChild.style.setProperty("--y", -(at.y + M) + "px");
      });
    };
    placeLetters();
    var lettersQueued = false;
    window.addEventListener("resize", function () {
      if (lettersQueued) return;
      lettersQueued = true;
      window.requestAnimationFrame(function () { lettersQueued = false; markHeads(); placeLetters(); });
    });
    window.addEventListener("load", placeLetters);
    if (document.fonts && document.fonts.ready) document.fonts.ready.then(function () { markHeads(); placeLetters(); });
  }

  // Hero shader: greyscale smoke drawn with WebGL behind the hero.
  // Capped at 30fps, drawn at device resolution (capped at 2x, 1.5x on
  // phones), stepped down in resolution if frames are measured slow, paused
  // off screen and in background tabs. No WebGL, or a lost context: no
  // canvas, and the CSS background stays as it is.
  var heroSection = document.querySelector(".hero");
  if (heroSection) (function () {
    var canvas = document.createElement("canvas");
    canvas.className = "hero-shader";
    canvas.setAttribute("aria-hidden", "true");
    var gl = null;
    try {
      var opts = { alpha: false, antialias: false, depth: false, stencil: false, premultipliedAlpha: false, powerPreference: "low-power" };
      gl = canvas.getContext("webgl", opts) || canvas.getContext("experimental-webgl", opts);
    } catch (e) { gl = null; }
    if (!gl) return;
    var vert = "attribute vec2 p; void main() { gl_Position = vec4(p, 0.0, 1.0); }";
    var frag = [
      "#ifdef GL_FRAGMENT_PRECISION_HIGH",
      "precision highp float;",
      "#else",
      "precision mediump float;",
      "#endif",
      "uniform vec2 u_res;",
      "uniform float u_time;",
      "uniform vec2 u_seed;",
      "float hash(vec2 p) { p = fract(p * vec2(123.34, 456.21)); p += dot(p, p + 45.32); return fract(p.x * p.y); }",
      "float noise(vec2 p) {",
      "  vec2 i = floor(p); vec2 f = fract(p); vec2 u = f * f * (3.0 - 2.0 * f);",
      "  return mix(mix(hash(i), hash(i + vec2(1.0, 0.0)), u.x), mix(hash(i + vec2(0.0, 1.0)), hash(i + vec2(1.0, 1.0)), u.x), u.y);",
      "}",
      // 4x4 ordered (Bayer) dither, fixed in screen space: breaks up banding
      // at under one 8-bit step, and never changes from frame to frame.
      "float bayer2(vec2 a) { a = floor(a); return fract(a.x / 2.0 + a.y * a.y * 0.75); }",
      "float bayer4(vec2 a) { return bayer2(0.5 * a) * 0.25 + bayer2(a); }",
      "float fbm(vec2 p) {",
      "  float v = 0.0; float a = 0.5;",
      "  for (int i = 0; i < 4; i++) { v += a * noise(p); p = p * 2.03 + vec2(1.7, 9.2); a *= 0.5; }",
      "  return v;",
      "}",
      // three octaves for the two warp layers: they only bend the field, so
      // the fourth octave is invisible there and costs a quarter of the work
      "float fbm3(vec2 p) {",
      "  float v = 0.0; float a = 0.5;",
      "  for (int i = 0; i < 3; i++) { v += a * noise(p); p = p * 2.03 + vec2(1.7, 9.2); a *= 0.5; }",
      "  return v;",
      "}",
      "void main() {",
      "  vec2 uv = gl_FragCoord.xy / u_res;",
      // billows about the size of the reference's, sized to the hero's height
      // (a phone and a desktop show the same smoke scale), offset by a random seed
      "  vec2 p = gl_FragCoord.xy / u_res.y * 2.8 + u_seed;",
      "  float t = u_time;",
      // smoke: noise warping noise twice, each layer flowing its own way
      "  vec2 q = vec2(fbm3(p + vec2(0.30, 0.20) * t), fbm3(p + vec2(5.2, 1.3) - vec2(0.20, 0.30) * t));",
      // a moderate warp (2.4) keeps it puffy smoke rather than marbled ridges,
      // a touch softer than the reference
      "  vec2 r = vec2(fbm3(p + 2.4 * q + vec2(1.7, 9.2) + 0.45 * t), fbm3(p + 2.4 * q + vec2(8.3, 2.8) - 0.38 * t));",
      "  float f = fbm(p + 2.4 * r);",
      // shade it in greys: denser smoke is lighter, the warp adds dark folds
      // and bright wisps
      "  float c = mix(0.10, 0.34, clamp(f * f * 4.0, 0.0, 1.0));",
      "  c = mix(c, 0.03, clamp(length(q), 0.0, 1.0) * 0.55);",
      "  c = mix(c, 0.72, clamp(r.x * r.x, 0.0, 1.0) * 0.5);",
      "  float l = (f * f * f + 0.6 * f * f + 0.5 * f) * c * 1.75;",
      // a little calmer behind the text block so the headline stays readable
      "  vec2 d = (uv - vec2(0.5, 0.56)) * vec2(1.0, 1.35);",
      "  l *= mix(0.55, 1.0, smoothstep(0.12, 0.62, length(d)));",
      "  l = clamp(l, 0.0, 0.62);",
      "  l += (bayer4(gl_FragCoord.xy) - 0.5) / 255.0;",
      "  gl_FragColor = vec4(vec3(l), 1.0);",
      "}"
    ].join("\n");
    var compile = function (type, src) {
      var sh = gl.createShader(type);
      gl.shaderSource(sh, src);
      gl.compileShader(sh);
      return gl.getShaderParameter(sh, gl.COMPILE_STATUS) ? sh : null;
    };
    var vs = compile(gl.VERTEX_SHADER, vert), fs = compile(gl.FRAGMENT_SHADER, frag);
    if (!vs || !fs) return;
    var prog = gl.createProgram();
    gl.attachShader(prog, vs);
    gl.attachShader(prog, fs);
    gl.linkProgram(prog);
    if (!gl.getProgramParameter(prog, gl.LINK_STATUS)) return;
    gl.useProgram(prog);
    var buf = gl.createBuffer();
    gl.bindBuffer(gl.ARRAY_BUFFER, buf);
    gl.bufferData(gl.ARRAY_BUFFER, new Float32Array([-1, -1, 3, -1, -1, 3]), gl.STATIC_DRAW);
    var loc = gl.getAttribLocation(prog, "p");
    gl.enableVertexAttribArray(loc);
    gl.vertexAttribPointer(loc, 2, gl.FLOAT, false, 0, 0);
    var uRes = gl.getUniformLocation(prog, "u_res"), uTime = gl.getUniformLocation(prog, "u_time");
    // a different pattern every time a page opens
    gl.uniform2f(gl.getUniformLocation(prog, "u_seed"), Math.random() * 100, Math.random() * 100);

    heroSection.insertBefore(canvas, heroSection.firstChild);
    var small = window.matchMedia("(max-width: 767px)");
    var offset = Math.random() * 200; // and a different moment in its motion
    var speed = 0.24;                 // fast enough to see the smoke move within seconds
    var started = null, last = 0, raf = 0, onScreenNow = true, alive = true;
    // Backing store = the canvas's own CSS size times the pixel ratio (capped
    // at 2x on desktop, 1.5x under 768px), times the current render stage; the
    // CSS size stays 100% of the hero. Stages only step down, and only when
    // measured frames are slow (see frame() below). A renderer that reports
    // itself as software starts at the lowest stage instead of failing.
    var STAGES = [1, 0.75, 0.5, 0.35];
    var stage = 0;
    try {
      var info = gl.getExtension("WEBGL_debug_renderer_info");
      var renderer = String(gl.getParameter(info ? info.UNMASKED_RENDERER_WEBGL : gl.RENDERER) || "");
      if (/swiftshader|llvmpipe|softpipe|software|basic render/i.test(renderer)) stage = STAGES.length - 1;
    } catch (e) {}
    var size = function () {
      var ratio = Math.min(window.devicePixelRatio || 1, small.matches ? 1.5 : 2) * STAGES[stage];
      var w = Math.max(1, Math.round(canvas.clientWidth * ratio));
      var h = Math.max(1, Math.round(canvas.clientHeight * ratio));
      if (canvas.width !== w || canvas.height !== h) { canvas.width = w; canvas.height = h; }
      gl.viewport(0, 0, w, h);
      gl.uniform2f(uRes, w, h);
    };
    var draw = function (seconds) {
      gl.uniform1f(uTime, offset + seconds * speed);
      gl.drawArrays(gl.TRIANGLES, 0, 3);
    };
    // Frame-rate check: over two seconds of drawing, compare the draws made
    // with the 30fps target. Below 24 means frames are genuinely slow, so step
    // the render scale down one stage and measure again. Holding the rate
    // settles it (no more checks). If even the lowest stage cannot hold it,
    // keep the last frame as a still image.
    var windowStart = 0, drawsInWindow = 0, settled = false, still = false;
    var frame = function (now) {
      raf = 0;
      if (!alive || still) return;
      if (started === null) started = now;
      if (now - last >= 1000 / 30 - 1) {
        last = now;
        draw((now - started) / 1000);
        if (!settled) {
          drawsInWindow++;
          if (!windowStart) windowStart = now;
          if (now - windowStart >= 2000) {
            var fps = drawsInWindow * 1000 / (now - windowStart);
            if (fps >= 24) settled = true;
            else if (stage < STAGES.length - 1) { stage++; size(); }
            else { still = true; return; }
            windowStart = 0;
            drawsInWindow = 0;
          }
        }
      }
      schedule();
    };
    // The shader runs whatever the reduced-motion setting: it is a slow
    // greyscale wash with nothing sudden in it, and that setting is often on
    // by default on capable Windows machines. It still pauses off screen and
    // in background tabs.
    var schedule = function () {
      if (!raf && alive && !still && onScreenNow && !document.hidden) raf = window.requestAnimationFrame(frame);
    };
    size();
    draw(0);
    canvas.classList.add("is-on");
    heroSection.classList.add("has-shader");
    schedule();
    var resized = function () {
      if (!alive) return;
      size();
      draw(started === null ? 0 : (performance.now() - started) / 1000);
    };
    window.addEventListener("resize", resized);
    window.addEventListener("orientationchange", resized);
    // Coming back from a pause starts a fresh measuring window, so time spent
    // off screen or in a background tab never counts as slow rendering.
    var resume = function () { windowStart = 0; drawsInWindow = 0; schedule(); };
    document.addEventListener("visibilitychange", resume);
    if ("IntersectionObserver" in window) {
      new IntersectionObserver(function (entries) {
        onScreenNow = entries[0].isIntersecting;
        resume();
      }).observe(heroSection);
    }
    canvas.addEventListener("webglcontextlost", function (event) {
      event.preventDefault();
      alive = false;
      if (raf) window.cancelAnimationFrame(raf);
      canvas.remove();
      heroSection.classList.remove("has-shader");
    });
  })();

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
    if (el.classList.contains("hl-host")) { el.classList.add("is-done"); return; }
    el.addEventListener("animationend", function (event) {
      if (event.target === el && event.animationName === "reveal-in") el.classList.add("is-done");
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
    // Same bottom margin as the observer: text in the bottom 6% of the screen
    // (or behind a mobile toolbar) waits for the scroll instead of fading
    // out of sight at load.
    (box.bottom > 0 && box.top < window.innerHeight * 0.94 ? onScreen : later).push(el);
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
