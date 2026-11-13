/* Curved gallery: a row of website screenshots streaming round the inside of
   a cylinder. Vanilla port of the "tilted grid hero" component; the math,
   slices, fade mask and reduced-motion behaviour are the same.

   Use it on any page:
     <link rel="stylesheet" href="gallery.css">        (../gallery.css from a subfolder)
     <div class="cg" data-curved-gallery></div>
     <script src="gallery.js" defer></script>          (../gallery.js from a subfolder)

   Optional data attributes on the element (defaults in brackets):
     data-speed        seconds for the row to advance one tile [4]
     data-tile-height  tile height, % of the gallery's height [34]
     data-aspect       tile width / height [16/9]
     data-gap          space between tiles, % of a tile's height [6]
     data-axis         vertical centre of the row, % of the height [52]
     data-curve        how far the row bends round by the edge, degrees [80]
     data-fade         width of the fade at each end, % of the width [12]
     data-narrow       on narrow screens, tiles grow by up to this factor of
                       the gallery's height (full at 390px wide, none from
                       1400px up, a straight line between, by viewport
                       width); pair it with a shorter --cg-height there so
                       the tiles keep their size and the edges come in [1]
     data-links-label  name of the plain link list under the gallery ["Example sites"]
     data-direction    "up" for a vertical column: tiles rise from the bottom
                       and loop, round a cylinder lying on its side (each tile
                       bends along its height, flat in the middle, curving
                       away toward the top and bottom), faded at the top and
                       bottom. The same slices and math with the axes
                       swapped; tile-height is then the tile's width, as a %
                       of the gallery's width, and axis its horizontal centre.
                       Default: sideways, right to left. */

(function () {
  /* ---------- TILES: edit this list ----------
     src    image path from the site root (works from any page, because it is
            resolved against this script's own location). WebP, 16:9.
     href   where the tile goes. Opens in a new tab.
     label  shown on hover, and used for the plain link under the gallery.
     Tiles play through this list in order and repeat. Links that appear more
     than once are listed once under the gallery. */
  var TILES = [
    { src: "assets/examples/level-up-home.webp",     href: "https://tutoring.yusufjax1.workers.dev/",              label: "Level Up Tutoring: Home" },
    { src: "assets/examples/level-up-subjects.webp", href: "https://tutoring.yusufjax1.workers.dev/subjects.html", label: "Level Up Tutoring: Subjects" },
    { src: "assets/examples/level-up-booking.webp",  href: "https://tutoring.yusufjax1.workers.dev/booking.html",  label: "Level Up Tutoring: Booking" },
    { src: "assets/examples/level-up-contact.webp",  href: "https://tutoring.yusufjax1.workers.dev/contact.html",  label: "Level Up Tutoring: Contact" }
  ];

  var script = document.currentScript;
  var BASE = script && script.src ? new URL(".", script.src).href : document.baseURI;
  TILES = TILES.map(function (t) {
    return { src: new URL(t.src, BASE).href, href: t.href, label: t.label };
  });

  if (!TILES.length || !("ResizeObserver" in window)) return;

  /* ---------- Geometry (unchanged from the component) ----------
     A CSS box can't bend, so every tile is cut into SLICES vertical strips,
     each a flat facet of the cylinder showing its share of the image. The
     strips sit still inside their tile, each turned its own few degrees round
     the cylinder's axis, and the tile (preserve-3d) is what moves: one
     rotateY about that same axis carries it along the arc. Only a tile's
     delay differs, and that sets where on the arc it sits. */
  var SLICES = 16;    // strips per tile
  var CAMERA = 1.6;   // camera distance, as a multiple of the cylinder's radius
  var MAX_WIDTH = 55; // a tile is never wider than this % of the gallery
  // How far each strip reaches over each neighbour, as a share of a strip's
  // width. Every strip is drawn and antialiased on its own, so strips that
  // only meet edge to edge leave seams where the page shows through (thin
  // dark lines that flicker as the row moves, worst when zoomed out). An
  // overlap this wide keeps every strip edge over its neighbour's solid
  // middle at any zoom. Both strips show the same pixels there.
  var OVERLAP = 0.4;

  // Cylinder radius, as a share of the width, that puts the frame's edge
  // `bend` radians round the arc as seen through the camera.
  function arc(bend) {
    return (CAMERA - 1 + Math.cos(bend)) / (2 * CAMERA * Math.sin(bend));
  }
  function round4(n) { return +n.toFixed(4); }

  // Lays the loop on the cylinder, in terms of the direction of travel
  // (`width`, along which the row moves and bends) and the one across it
  // (`height`); `aspect` is a tile's length along the travel over its size
  // across it. A vertical gallery passes its height, width and 1/aspect.
  // Angles in degrees: `unit` is the arc one tile-height spans, `limit` how far round a tile's centre can go before the
  // whole tile is off-screen, `sweep` how far round the loop's ends sit.
  function measure(width, height, tile, aspect, gap, bend) {
    var h = Math.min((tile / 100) * height, ((MAX_WIDTH / 100) * width) / aspect);
    var radius = width * arc(bend);
    if (!(h > 0) || !(radius > 0)) return { columns: 2, sweep: 0, unit: 0, limit: 0 };
    var deg = function (rad) { return (rad * 180) / Math.PI; };
    var unit = deg(h / radius);
    var pitch = (aspect + gap / 100) * unit;
    var limit = deg(bend) + (aspect * unit) / 2;
    var columns = Math.min(60, Math.max(2, Math.ceil((2 * limit) / pitch)));
    var sweep = round4((columns * pitch) / 2);
    return { columns: columns, sweep: sweep, unit: round4(unit), limit: round4(Math.min(sweep, limit)) };
  }

  var reduce = window.matchMedia("(prefers-reduced-motion: reduce)");
  var count = 0;

  function num(el, name, fallback) {
    var v = el.getAttribute("data-" + name);
    if (v == null || v === "") return fallback;
    if (v.indexOf("/") > 0) { var p = v.split("/"); return parseFloat(p[0]) / parseFloat(p[1]); }
    var n = parseFloat(v);
    return isNaN(n) ? fallback : n;
  }

  function setup(el) {
    var speed = num(el, "speed", 4);
    var tileHeight = num(el, "tile-height", 34);
    var aspect = num(el, "aspect", 16 / 9);
    var gap = num(el, "gap", 6);
    var axis = num(el, "axis", 52);
    var curve = num(el, "curve", 80);
    var fade = num(el, "fade", 12);
    var narrow = num(el, "narrow", 1);
    var up = el.getAttribute("data-direction") === "up";
    if (up) el.classList.add("cg--vertical");
    // A tile's length along the travel, over its size across it.
    var ratio = up ? 1 / aspect : aspect;
    // Tile height (% of the gallery's height) for the current viewport width.
    var tileFor = function () {
      var t = Math.min(1, Math.max(0, (window.innerWidth - 390) / (1400 - 390)));
      return round4(tileHeight * (narrow + (1 - narrow) * t));
    };
    var bend = (Math.min(85, Math.max(5, curve)) * Math.PI) / 180;
    var id = "cg" + (++count);
    var orbit = id + "-orbit";

    var style = document.createElement("style");
    var band = document.createElement("div");
    band.className = "cg-band";
    band.setAttribute("aria-hidden", "true");
    var mask = "linear-gradient(" + (up ? 180 : 90) + "deg,transparent,#000 " + fade + "%,#000 " + (100 - fade) + "%,transparent)";
    band.style.webkitMaskImage = mask;
    band.style.maskImage = mask;
    band.style.perspectiveOrigin = up ? axis + "% 50%" : "50% " + axis + "%";
    // The faded ends are not clickable: an empty cover the size of the fade.
    var endL = document.createElement("div"), endR = document.createElement("div");
    endL.className = up ? "cg-end cg-end--t" : "cg-end cg-end--l";
    endR.className = up ? "cg-end cg-end--b" : "cg-end cg-end--r";
    if (up) endL.style.height = endR.style.height = fade + "%";
    else endL.style.width = endR.style.width = fade + "%";
    el.appendChild(style);
    el.appendChild(band);
    el.appendChild(endL);
    el.appendChild(endR);

    // Plain links under the gallery, for keyboard and screen reader users
    // (the moving band itself is hidden from both).
    var seen = {};
    var list = document.createElement("ul");
    list.className = "cg-links";
    list.setAttribute("role", "list");
    list.setAttribute("aria-label", el.getAttribute("data-links-label") || "Example sites");
    TILES.forEach(function (t) {
      if (seen[t.href]) return;
      seen[t.href] = true;
      var li = document.createElement("li");
      var a = document.createElement("a");
      a.className = "example-link";
      a.href = t.href;
      a.target = "_blank";
      a.rel = "noopener";
      a.innerHTML = '<span></span> <span class="arrow" aria-hidden="true">&nearr;</span>';
      a.firstChild.textContent = t.label;
      li.appendChild(a);
      list.appendChild(li);
    });
    el.after(list);

    var layout = null;
    var shown = [];      // per tile: its position in the run of images
    var tiles = [];
    var loaded = false;  // images are only fetched once the gallery is near the screen

    // Each strip paints its share of the screenshot as its own background,
    // so the picture and the strip always share the same edges.
    function paint(tile) {
      var value = loaded && tile._src ? 'url("' + tile._src + '")' : "";
      for (var i = 0; i < tile.children.length; i++) {
        if (tile.children[i].style.backgroundImage !== value) tile.children[i].style.backgroundImage = value;
      }
    }

    // A tile's image, link and label change together, only when it wraps (out of sight).
    function apply(tile, n) {
      var item = TILES[n % TILES.length];
      tile.href = item.href;
      tile.title = item.label;
      tile.setAttribute("aria-label", item.label);
      tile._src = item.src;
      paint(tile);
    }

    function render(L) {
      var columns = L.columns, sweep = L.sweep, unit = L.unit, limit = L.limit, tileHeight = L.tile;
      // One unit is a tile's size across the travel. Sideways: its height,
      // from the gallery's height, capped by the width. Vertical: its width.
      var across = up ? "cqw" : "cqh", along = up ? "cqh" : "cqw";
      var u = function (n) {
        return "calc(" + round4(n) + " * min(" + tileHeight + across + ", " + round4(MAX_WIDTH / ratio) + along + "))";
      };
      var r = 100 * arc(bend);
      var radius = (+r.toFixed(3)) + along;
      // Sideways the row turns round the vertical axis, right to left;
      // vertical, round the horizontal axis, bottom to top (rotateX turns the
      // other way, hence the minus).
      var turn = function (deg) {
        return "translateZ(" + radius + ") " + (up ? "rotateX(" + round4(-deg) : "rotateY(" + round4(deg)) + "deg) translateZ(-" + radius + ")";
      };
      // Beyond `limit` a tile is wholly off-screen, so it is hidden there; the
      // loop's ends, where it wraps, fall inside that stretch.
      var hide = round4(((sweep - limit) / (2 * sweep || 1)) * 100);
      style.textContent =
        "@keyframes " + orbit + "{" +
        "from{transform:" + turn(-sweep) + "}to{transform:" + turn(sweep) + "}" +
        "0%," + hide + "%," + (100 - hide) + "%,100%{visibility:hidden}" +
        (hide + 0.001) + "%," + (100 - hide - 0.001) + "%{visibility:visible}}";
      band.style.perspective = (+(r * CAMERA).toFixed(3)) + along;

      var share = ratio / SLICES;
      var reach = share * OVERLAP;
      var duration = columns * speed;
      band.textContent = "";
      tiles = [];
      for (var t = 0; t < columns; t++) {
        // Tile columns-1 starts nearest the exit and tile 0 furthest back.
        var first = columns - 1 - t;
        if (shown[t] == null) shown[t] = first;
        var tile = document.createElement("a");
        tile.className = "cg-tile";
        tile.target = "_blank";
        tile.rel = "noopener";
        tile.tabIndex = -1;
        if (up) {
          tile.style.top = "calc(50% - " + u(ratio / 2) + ")";
          tile.style.left = "calc(" + axis + "% - " + u(0.5) + ")";
          tile.style.width = u(1);
          tile.style.height = u(ratio);
        } else {
          tile.style.left = "calc(50% - " + u(aspect / 2) + ")";
          tile.style.top = "calc(" + axis + "% - " + u(0.5) + ")";
          tile.style.width = u(aspect);
          tile.style.height = u(1);
        }
        // Duration and delay also as properties, so reduced motion can pin
        // them against the site-wide rule that shortens every animation.
        tile.style.setProperty("--cg-dur", duration + "s");
        tile.style.setProperty("--cg-delay", (-t * speed) + "s");
        // Longhands, not the shorthand: the shorthand would also set
        // play-state inline and override the pause in gallery.css.
        tile.style.animationName = orbit;
        tile.style.animationDuration = duration + "s";
        tile.style.animationTimingFunction = "linear";
        tile.style.animationDelay = (-t * speed) + "s";
        tile.style.animationIterationCount = "infinite";
        for (var k = 0; k < SLICES; k++) {
          var slice = document.createElement("span");
          slice.className = "cg-slice";
          // Reaches over both neighbours (not past the tile's own outer edges).
          // (Vertical: the same with left/width read as top/height.)
          var inL = k === 0 ? 0 : reach, inR = k === SLICES - 1 ? 0 : reach;
          // Turn about the strip's own share, wherever the overlap puts its box.
          slice.style.transform = turn((ratio / 2 - (k + 0.5) * share) * unit);
          if (up) {
            slice.style.left = "0";
            slice.style.top = u((ratio - share) / 2 - inL);
            slice.style.height = u(share + inL + inR);
            slice.style.width = u(1);
            slice.style.transformOrigin = "50% " + u(inL + share / 2);
            slice.style.backgroundSize = u(1) + " " + u(ratio);
            slice.style.backgroundPosition = "0 " + u(inL - k * share);
          } else {
            slice.style.left = u((aspect - share) / 2 - inL);
            slice.style.width = u(share + inL + inR);
            slice.style.height = u(1);
            slice.style.transformOrigin = u(inL + share / 2) + " 50%";
            slice.style.backgroundSize = u(aspect) + " " + u(1);
            slice.style.backgroundPosition = u(inL - k * share) + " 0";
          }
          tile.appendChild(slice);
        }
        (function (tile, t, first) {
          tile.addEventListener("animationiteration", function (e) {
            if (e.target !== tile) return;
            // elapsedTime counts whole loops, missed events included.
            var lap = Math.round(e.elapsedTime / duration);
            var next = lap * columns + first;
            if (shown[t] !== next) { shown[t] = next; apply(tile, next); }
          });
        })(tile, t, first);
        apply(tile, shown[t]);
        band.appendChild(tile);
        tiles.push(tile);
      }
    }

    new ResizeObserver(function (entries) {
      var box = entries[0].contentRect;
      var tile = tileFor();
      var next = up
        ? measure(box.height, box.width, tile, ratio, gap, bend)
        : measure(box.width, box.height, tile, aspect, gap, bend);
      next.tile = tile;
      if (layout && layout.columns === next.columns && layout.sweep === next.sweep && layout.unit === next.unit && layout.tile === next.tile) return;
      layout = next;
      render(next);
      el.classList.add("is-ready");
    }).observe(el);

    function load() {
      if (loaded) return;
      loaded = true;
      tiles.forEach(paint);
      // Fetch the rest now: a tile picks up its next image just before it
      // comes back into view, too late to start loading it then.
      TILES.forEach(function (t) { new Image().src = t.src; });
    }

    if ("IntersectionObserver" in window) {
      // Load a little before it scrolls into view; run only while on screen.
      new IntersectionObserver(function (entries) {
        if (entries[0].isIntersecting) load();
      }, { rootMargin: "400px 0px" }).observe(el);
      new IntersectionObserver(function (entries) {
        el.classList.toggle("is-playing", entries[0].isIntersecting && !reduce.matches);
      }).observe(el);
    } else {
      load();
      el.classList.add("is-playing");
    }
  }

  document.querySelectorAll("[data-curved-gallery]").forEach(setup);
})();
