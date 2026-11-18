/* deck.js: the example sites as a stack of browser windows.
   Every few seconds the front window slides off to the side and settles at
   the back of the stack, and the next one comes forward. Each window links to
   its page. Edit SITES below; images are 16:9 WebP from the site root.
   Pauses while off screen, while the tab is hidden, and while hovered.
   With reduced motion it shows the first window and does not move. */
(function () {
  var SITES = [
    { src: "assets/examples/level-up-home.webp",     href: "https://tutoring.yusufjax1.workers.dev/",              url: "tutoring.yusufjax1.workers.dev",          label: "Level Up Tutoring: Home" },
    { src: "assets/examples/level-up-subjects.webp", href: "https://tutoring.yusufjax1.workers.dev/subjects.html", url: "tutoring.yusufjax1.workers.dev/subjects", label: "Level Up Tutoring: Subjects" },
    { src: "assets/examples/level-up-booking.webp",  href: "https://tutoring.yusufjax1.workers.dev/booking.html",  url: "tutoring.yusufjax1.workers.dev/booking",  label: "Level Up Tutoring: Booking" },
    { src: "assets/examples/level-up-contact.webp",  href: "https://tutoring.yusufjax1.workers.dev/contact.html",  url: "tutoring.yusufjax1.workers.dev/contact",  label: "Level Up Tutoring: Contact" }
  ];
  var HOLD = 3200; // ms each window stays in front

  var script = document.currentScript;
  var BASE = script && script.src ? new URL(".", script.src).href : document.baseURI;
  var reduce = window.matchMedia("(prefers-reduced-motion: reduce)");

  document.querySelectorAll("[data-deck]").forEach(function (deck) {
    var cards = SITES.map(function (s, i) {
      var a = document.createElement("a");
      a.className = "deck-card";
      a.href = s.href;
      a.target = "_blank";
      a.rel = "noopener";
      a.setAttribute("aria-label", s.label + " (opens in a new tab)");
      a.innerHTML =
        '<span class="deck-bar"><span class="deck-dots"><i></i><i></i><i></i></span>' +
        '<span class="deck-url"></span></span>' +
        '<img alt="" loading="' + (i ? "lazy" : "eager") + '" width="960" height="540">';
      a.querySelector(".deck-url").textContent = s.url;
      a.querySelector("img").src = new URL(s.src, BASE).href;
      deck.appendChild(a);
      return a;
    });

    var order = cards.slice();
    var paint = function () {
      order.forEach(function (c, i) { c.dataset.pos = Math.min(i, 3); });
    };
    paint();
    if (reduce.matches || cards.length < 2) return;

    var visible = false, hovered = false, timer = null;
    var step = function () {
      var front = order.shift();
      front.classList.add("is-leaving");
      order.push(front);
      paint();
      front.dataset.pos = "out";
      setTimeout(function () {
        front.classList.remove("is-leaving");
        paint();
      }, 900);
    };
    var tick = function () {
      timer = null;
      if (visible && !hovered && !document.hidden) step();
      schedule();
    };
    var schedule = function () { if (!timer) timer = setTimeout(tick, HOLD); };
    deck.addEventListener("mouseenter", function () { hovered = true; });
    deck.addEventListener("mouseleave", function () { hovered = false; });
    deck.addEventListener("focusin", function () { hovered = true; });
    deck.addEventListener("focusout", function () { hovered = false; });
    if ("IntersectionObserver" in window) {
      new IntersectionObserver(function (e) { visible = e[0].isIntersecting; }, { threshold: 0.3 }).observe(deck);
    } else { visible = true; }
    schedule();
  });
})();
