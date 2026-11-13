/* Service visuals: the call screen, the automation flow and the sample lead
   search, on the home page and in the service page heroes. This file builds
   each one into its empty container (data-showcase) and loops it through its
   own list below. Every visual runs on its own clock, which only counts while
   the visual is on screen and the tab is visible, so a scenario never plays
   out of sight.
   Reduced motion: the same steps play, but styles.css removes the movement
   (no spinning border, no travelling dot, no voice bars, no slides). */

(function () {
  /* ---------- Shared timing (all three visuals) ----------
     Taken from the receptionist's original loop: once a scenario finished it
     stayed up for about 3.5s, faded out over 0.8s, and the screen stayed empty
     for about 1.4s before the next one. */
  var END_HOLD = 3500; // finished state stays on screen
  var FADE = 800;      // finished state fades away
  var PAUSE = 1400;    // empty, before the next scenario starts
  document.documentElement.style.setProperty("--showcase-fade", FADE + "ms");
  var reduce = window.matchMedia("(prefers-reduced-motion: reduce)");

  /* ---------- Receptionist: three calls, in this order ----------
     caller: right, agent: left, tool: a centered green confirmation. */
  var CALLS = [
    {
      name: "New caller",
      number: "(555) 010-0142",
      lines: [
        ["caller", "Hi, my kitchen sink is leaking. Can someone come out?"],
        ["agent", "Of course. What's the address?"],
        ["caller", "123 Main Street."],
        ["agent", "Thanks! I have Tuesday at 2 PM or Thursday at 10 AM."],
        ["caller", "Tuesday at 2 PM."],
        ["tool", "Booked for Tuesday 2:00 PM"],
        ["agent", "You're on the calendar for Tuesday at 2 PM. Have a nice day!"]
      ]
    },
    {
      name: "Jerry",
      number: "(555) 010-0187",
      lines: [
        ["agent", "Hey Jerry! Thanks for calling Brightside Dental. How can I help?"],
        ["caller", "Hi, I want to cancel my appointment this Friday."],
        ["tool", "Cleared Friday 11:00 AM"],
        ["agent", "All set. Your Friday 11 AM appointment is cancelled. Have a good one!"]
      ]
    },
    {
      name: "New caller",
      number: "(555) 010-0233",
      lines: [
        ["caller", "Hi, what kind of work do you do?"],
        ["agent", "Thanks for calling Summit Roofing. We do roof repairs, full replacements and storm damage inspections."],
        ["caller", "What does a storm damage inspection include?"],
        ["agent", "We check shingles, flashing and gutters, then send you a photo report. It's free."],
        ["caller", "Great, thanks! I'm ready to book now."],
        ["agent", "Perfect. What day works best for you?"]
      ]
    }
  ];

  /* ---------- Automation: three examples, four steps each ----------
     body: "fields" (a form), value (large text) or text (a message). */
  var FLOWS = [
    [
      { label: "Request", fields: true, detail: "A form comes in" },
      { label: "Quote", value: "$480", detail: "Priced and sent" },
      { label: "Follow-up", text: "Still interested? Reply YES to book.", detail: "Texted two days later" },
      { label: "Scheduled", value: "Thu 9:00", detail: "On the calendar" }
    ],
    [
      { label: "Job finished", value: "2:40 PM", detail: "Marked complete" },
      { label: "Invoice sent", value: "$320", detail: "Emailed to the customer" },
      { label: "Reminder sent", text: "Your $320 invoice is due Friday.", detail: "Texted three days later" },
      { label: "Paid", value: "$320", detail: "Paid by card" }
    ],
    [
      { label: "Appointment ends", value: "3:15 PM", detail: "Cut and style done" },
      { label: "Rebook text sent", text: "See you in 6 weeks. Tap to pick a time.", detail: "Texted on the way out" },
      { label: "Reply", text: "Saturday at 10 works.", detail: "She picks a time" },
      { label: "Rebooked", value: "Sat 10:00", detail: "Back on the calendar" }
    ]
  ];

  /* ---------- Lead Scraper: three sample searches ----------
     Made-up businesses and 555 numbers. [name, rating, phone, reviews] */
  var SEARCHES = [
    {
      query: "Home services, no website",
      tag: "No website",
      leads: [
        ["Sample Roofing Co.", "4.6", "(555) 010-0118"],
        ["Example Pool Care", "4.2", "(555) 010-0164"],
        ["Demo Lawn & Garden", "4.8", "(555) 010-0127"],
        ["Placeholder Plumbing", "3.9", "(555) 010-0193"]
      ]
    },
    {
      query: "Dentists in Austin, TX",
      tag: "Low reviews",
      leads: [
        ["Sample Smile Dental", "4.3", "(555) 010-0141", 8],
        ["Example Family Dentistry", "4.0", "(555) 010-0152", 11],
        ["Demo Dental Studio", "4.7", "(555) 010-0176", 6],
        ["Placeholder Orthodontics", "4.5", "(555) 010-0108", 9]
      ]
    },
    {
      query: "Landscapers in Denver, CO",
      tag: "High potential",
      leads: [
        ["Sample Yard Works", "4.4", "(555) 010-0135"],
        ["Example Green Landscaping", "4.1", "(555) 010-0162"],
        ["Demo Stone & Sod", "4.6", "(555) 010-0149"],
        ["Placeholder Lawn Care", "3.8", "(555) 010-0181"]
      ]
    }
  ];

  /* ---------- A clock that only runs while its visual is on screen ----------
     run(wait, clock) is the visual's loop. wait(ms) resolves after ms of
     on-screen time. clock.now() is on-screen time in ms (it stands still while
     the visual is off screen or the tab is hidden), and clock.frame(fn) is
     requestAnimationFrame that holds its callback until the visual is back.
     styles.css pauses the CSS animations too (via .is-playing). */
  function player(el, run) {
    var on = false, seen = false, started = false;
    var timer = 0, left = 0, armedAt = 0, resolve = null;
    var spent = 0, since = 0, held = [];
    var clock = {
      now: function () { return spent + (on ? performance.now() - since : 0); },
      frame: function (fn) { if (on) requestAnimationFrame(fn); else held.push(fn); }
    };
    var fire = function () { timer = 0; var r = resolve; resolve = null; if (r) r(); };
    var arm = function () { armedAt = performance.now(); timer = setTimeout(fire, left); };
    var halt = function () {
      if (!timer) return;
      clearTimeout(timer);
      timer = 0;
      left = Math.max(0, left - (performance.now() - armedAt));
    };
    var wait = function (ms) {
      return new Promise(function (r) { resolve = r; left = ms; if (on) arm(); });
    };
    var update = function () {
      var was = on;
      on = seen && !document.hidden;
      el.classList.toggle("is-playing", on);
      if (on && !was) since = performance.now();
      if (!on && was) spent += performance.now() - since;
      if (!on) { halt(); return; }
      if (!started) { started = true; run(wait, clock); }
      else if (resolve && !timer) arm();
      held.splice(0).forEach(function (fn) { requestAnimationFrame(fn); });
    };
    if ("IntersectionObserver" in window) {
      new IntersectionObserver(function (entries) { seen = entries[0].isIntersecting; update(); }).observe(el);
    } else { seen = true; update(); }
    document.addEventListener("visibilitychange", update);
  }

  // Apply a state change with transitions switched off, for resets.
  function instantly(el, fn) {
    el.classList.add("is-resetting");
    fn();
    void el.offsetWidth;
    el.classList.remove("is-resetting");
  }

  /* ---------- Receptionist ----------
     Built here (one copy for every page): a frame at the phone's display
     size, a .phone-scale that scales the fixed-size phone to that frame, and
     .phone-swing, which carries the whole pose (tilt, enter, exit) in one
     transform. */
  var PHONE =
    '<div class="phone-frame"><div class="phone-scale"><div class="phone-swing"><div class="iphone">' +
    '<span class="iphone-key iphone-key--action"></span><span class="iphone-key iphone-key--up"></span>' +
    '<span class="iphone-key iphone-key--down"></span><span class="iphone-key iphone-key--power"></span>' +
    '<div class="iphone-screen"><span class="iphone-island"></span>' +
    '<div class="call-head"><p class="call-status"><span class="call-dot"></span>On a call</p>' +
    '<div class="call-id"><p class="call-name"></p><p class="call-number"></p></div>' +
    '<div class="voice"><span></span><span></span><span></span><span></span><span></span><span></span><span></span></div></div>' +
    '<div class="call-chat"><div class="call-thread"></div></div>' +
    '</div></div></div></div></div>';
  var PHONE_H = 560; // the phone's layout height (styles.css, .phone-scale)

  /* Voice bars: one amplitude, 0 (flat) to 1 (talking), eased up over
     VOICE_UP ms when a call starts and down over VOICE_DOWN ms when it ends.
     Each bar swings on its own period (and offset) between flat and full, and
     the amplitude scales that swing, so the bars grow out of the resting
     line and settle back into it with no snap. */
  var VOICE_UP = 400, VOICE_DOWN = 600;
  var VOICE_PERIODS = [1.1, 0.8, 1.3, 0.7, 1.2, 0.9, 1.05]; // s, flat to full
  var VOICE_OFFSETS = [0, 0.3, 0.6, 0.2, 0.9, 0.5, 0.1];
  var REST = 0.2; // flat resting height, as a share of full

  function voice(el, clock) {
    var bars = el.querySelectorAll(".voice span");
    var level = 0, target = 0, last = 0, running = false;
    var smooth = function (x) { return x * x * (3 - 2 * x); };
    var paint = function (now) {
      var a = smooth(level);
      for (var i = 0; i < bars.length; i++) {
        var t = now / 1000 + VOICE_OFFSETS[i];
        var swing = 0.5 - 0.5 * Math.cos((Math.PI * t) / VOICE_PERIODS[i]);
        bars[i].style.transform = "scaleY(" + (REST + (1 - REST) * a * swing).toFixed(3) + ")";
      }
    };
    var tick = function () {
      var now = clock.now(), dt = Math.min(100, now - last);
      last = now;
      level = target > level ? Math.min(1, level + dt / VOICE_UP) : Math.max(0, level - dt / VOICE_DOWN);
      paint(now);
      if (level === 0 && target === 0) { running = false; return; }
      clock.frame(tick);
    };
    return function (on) {
      target = on ? 1 : 0;
      if (reduce.matches || running) return; // reduced motion: the bars stay flat
      running = true;
      last = clock.now();
      clock.frame(tick);
    };
  }
  // The swap between calls: the phone leaves to the right, and the next one
  // swings in from the left. Both fit inside FADE + PAUSE, the same time the
  // old fade between calls took, so a full loop lasts as long as before.
  var EXIT = 800;
  var ENTER = 900;

  var SVG = ' viewBox="0 0 24 24" fill="none" stroke="#fff" stroke-width="1.6" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"';
  var ICONS = {
    // a head above open shoulders
    caller: '<svg class="msg-icon"' + SVG + '><circle cx="12" cy="8" r="3.6"/><path d="M4.8 20.5c0-4 3.2-6.6 7.2-6.6s7.2 2.6 7.2 6.6"/></svg>',
    // a rounded square robot head with an antenna and two dot eyes, above open shoulders
    agent: '<svg class="msg-icon"' + SVG + '><path d="M12 3.2v2.3"/><circle cx="12" cy="2.6" r="0.6" fill="#fff"/><rect x="7.2" y="5.5" width="9.6" height="7.6" rx="2.4"/><circle cx="10.2" cy="9.3" r="0.75" fill="#fff" stroke="none"/><circle cx="13.8" cy="9.3" r="0.75" fill="#fff" stroke="none"/><path d="M4.8 21c0-3.6 3.2-5.7 7.2-5.7s7.2 2.1 7.2 5.7"/></svg>'
  };

  function callScreen(el) {
    el.innerHTML = PHONE;
    var frame = el.querySelector(".phone-frame");
    var swing = el.querySelector(".phone-swing");
    // Scale the fixed-size phone to its frame, uniformly.
    var fit = function () {
      if (frame.offsetHeight) frame.style.setProperty("--phone-s", (frame.offsetHeight / PHONE_H).toFixed(4));
    };
    fit();
    if ("ResizeObserver" in window) new ResizeObserver(fit).observe(frame);
    var name = el.querySelector(".call-name");
    var number = el.querySelector(".call-number");
    var chat = el.querySelector(".call-chat");
    var thread = el.querySelector(".call-thread");
    name.textContent = CALLS[0].name;
    number.textContent = CALLS[0].number;

    // The newest message stays in view: once the thread is taller than the
    // chat, it slides up and the oldest messages fade under the top edge.
    var follow = function () {
      var over = Math.max(0, thread.offsetHeight - chat.clientHeight);
      thread.style.transform = over ? "translateY(" + -over + "px)" : "";
      chat.classList.toggle("is-scrolled", over > 0);
    };
    var add = function (kind, text) {
      var row = document.createElement("div");
      row.className = "msg msg--" + kind;
      var bubble = document.createElement("p");
      bubble.className = kind === "tool" ? "bubble bubble--done" : "bubble";
      if (kind === "tool") bubble.innerHTML = '<span class="bubble-check"></span>';
      bubble.appendChild(document.createTextNode(text));
      row.appendChild(bubble);
      if (kind === "caller") row.insertAdjacentHTML("beforeend", ICONS.caller);
      if (kind === "agent") row.insertAdjacentHTML("afterbegin", ICONS.agent);
      thread.appendChild(row);
      follow();
    };
    // Time before the next line: long enough to read the one before it.
    var gap = function (prev, kind) {
      if (kind === "tool") return 900;
      return Math.min(3000, Math.max(1300, 700 + prev.length * 24));
    };

    player(el, async function (wait, clock) {
      var talk = voice(el, clock);
      for (var i = 0; ; i = (i + 1) % CALLS.length) {
        var call = CALLS[i];
        el.classList.add("is-talking");
        talk(true);
        await wait(600);
        for (var j = 0; j < call.lines.length; j++) {
          if (j) await wait(gap(call.lines[j - 1][1], call.lines[j][0]));
          add(call.lines[j][0], call.lines[j][1]);
        }
        await wait(600); // the last message settles
        el.classList.remove("is-talking");
        talk(false); // the bars ease down to flat and rest until the next call
        await wait(END_HOLD);
        // Exit: off to the right, turning away, back and a little smaller.
        swing.classList.add("is-exiting");
        await wait(EXIT);
        // Out of sight: the next caller, an empty chat.
        var next = CALLS[(i + 1) % CALLS.length];
        name.textContent = next.name;
        number.textContent = next.number;
        instantly(thread, function () { thread.textContent = ""; follow(); });
        // Jump (unseen) to the start of the entrance: off to the left.
        instantly(swing, function () { swing.classList.add("is-before"); swing.classList.remove("is-exiting"); });
        await wait(FADE + PAUSE - EXIT - ENTER);
        // Enter: swings in to the resting tilt.
        swing.classList.remove("is-before");
        await wait(ENTER);
      }
    });
  }

  /* ---------- Automation ----------
     One timeline per example: every event (each box starting and finishing,
     where the dash is) is computed from the example's start time and the
     measured length of each line, then read off on every frame. The dash and
     the beams use the same clock and the same frame, so they cannot drift
     apart. A box starts working the moment the dash's leading edge touches
     it, finishes after WORK, and the dash leaves for the next box.
     The lines are SVG paths from each box's centre to the next one's, with
     square bends (rounded slightly) so they follow the zigzag; the boxes
     cover the ends. The dash is a stroke dash moved along the current path,
     so it follows every bend. Distances are measured along the path. */
  var SPEED = 183;     // dash speed in px per second (its old average speed)
  var WORK = 1200;     // how long each box works before it turns green
  var LEAVE = 150;     // after a box turns green, before the dash sets off
  var STREAK = 36;     // the dash's length, px along the line
  var BEND = 10;       // corner radius of the line's bends
  var NS = "http://www.w3.org/2000/svg";
  var FLOW =
    '<svg class="flow-lines" aria-hidden="true"><path class="flow-rail"/><path class="flow-rail"/><path class="flow-rail"/>' +
    '<g class="flow-streak"><path/><path/><path/></g></svg>' +
    [0, 1, 2, 3].map(function () {
      return '<div class="flow-node beam"><p class="flow-label"><span class="flow-mark"></span><span class="flow-name"></span></p>' +
        '<div class="flow-body"></div><p class="flow-detail"></p></div>';
    }).join("");

  function flow(el) {
    el.innerHTML = FLOW;
    var nodes = Array.prototype.slice.call(el.querySelectorAll(".flow-node"));
    var rails = el.querySelectorAll(".flow-rail");
    var streak = el.querySelector(".flow-streak");
    var dashes = streak.querySelectorAll("path");
    var DASHES = [STREAK, STREAK * 0.6, STREAK * 0.28]; // tail to head

    var fill = function (steps) {
      nodes.forEach(function (node, k) {
        var step = steps[k];
        node.querySelector(".flow-name").textContent = step.label;
        var body = node.querySelector(".flow-body");
        body.textContent = "";
        if (step.fields) {
          body.innerHTML = '<span class="flow-field"></span><span class="flow-field flow-field--short"></span><span class="flow-field"></span>';
        } else {
          var p = document.createElement("p");
          p.className = step.value ? "flow-value" : "flow-text";
          p.textContent = step.value || step.text;
          body.appendChild(p);
        }
        node.querySelector(".flow-detail").textContent = step.detail;
      });
    };
    // Every beam, mark, check and the dash back to the start.
    var reset = function () {
      instantly(el, function () {
        nodes.forEach(function (n) { n.classList.remove("is-working", "is-done"); });
        streak.classList.remove("is-moving");
      });
    };
    // The line from box a's centre to box b's, in layout px (unaffected by
    // any scaling of the whole visual). Wide: across, down or up half way
    // between the boxes, across again. Narrow: down, across half way between
    // the boxes, down again. Returns the path and where it leaves a and
    // enters b, as distances along it.
    var path = function (a, b, vertical) {
      var ax = a.offsetLeft + a.offsetWidth / 2, ay = a.offsetTop + a.offsetHeight / 2;
      var bx = b.offsetLeft + b.offsetWidth / 2, by = b.offsetTop + b.offsetHeight / 2;
      var d, out, into;
      if (vertical) {
        var ym = (a.offsetTop + a.offsetHeight + b.offsetTop) / 2;
        var sx = bx > ax ? 1 : -1, rx = Math.min(BEND, Math.abs(bx - ax) / 2);
        d = "M" + ax + " " + ay + "V" + (ym - rx) + "Q" + ax + " " + ym + " " + (ax + sx * rx) + " " + ym +
          "H" + (bx - sx * rx) + "Q" + bx + " " + ym + " " + bx + " " + (ym + rx) + "V" + by;
        out = a.offsetHeight / 2; into = b.offsetHeight / 2;
      } else {
        var xm = (a.offsetLeft + a.offsetWidth + b.offsetLeft) / 2;
        var sy = by > ay ? 1 : -1, ry = Math.min(BEND, Math.abs(by - ay) / 2);
        d = ry < 0.5 ? "M" + ax + " " + ay + "H" + bx :
          "M" + ax + " " + ay + "H" + (xm - ry) + "Q" + xm + " " + ay + " " + xm + " " + (ay + sy * ry) +
          "V" + (by - sy * ry) + "Q" + xm + " " + by + " " + (xm + ry) + " " + by + "H" + bx;
        out = a.offsetWidth / 2; into = b.offsetWidth / 2;
      }
      return { d: d, out: out, into: into };
    };
    var measure = function () {
      var vertical = nodes[1].offsetTop >= nodes[0].offsetTop + nodes[0].offsetHeight;
      el.classList.toggle("is-vertical", vertical);
      var lines = [];
      for (var k = 0; k < nodes.length - 1; k++) {
        var p = path(nodes[k], nodes[k + 1], vertical);
        rails[k].setAttribute("d", p.d);
        var total = rails[k].getTotalLength();
        // Drawn only between the two boxes' edges, so nothing shows through
        // a translucent (glass) box.
        rails[k].style.strokeDasharray = "0 " + p.out.toFixed(1) + " " + (total - p.out - p.into).toFixed(1) + " " + total.toFixed(1);
        lines.push({ d: p.d, total: total, from: p.out, to: total - p.into });
      }
      return { vertical: vertical, length: STREAK, lines: lines };
    };
    // Redraw the lines if the layout changes while an example plays.
    if ("ResizeObserver" in window) new ResizeObserver(function () { measure(); }).observe(el);
    // Every event of one example, in ms from its start.
    var plan = function (g) {
      var events = [{ at: 0, node: 0, state: "is-working" }];
      var runs = [];
      var t = WORK;
      events.push({ at: t, node: 0, state: "is-done" });
      g.lines.forEach(function (line, k) {
        var depart = t + LEAVE;
        var arrive = depart + ((line.to - line.from) / SPEED) * 1000; // leading edge touches the next box
        var gone = arrive + (g.length / SPEED) * 1000;               // and is fully under it
        runs.push({ line: line, depart: depart, gone: gone });
        events.push({ at: arrive, node: k + 1, state: "is-working" });
        t = arrive + WORK;
        events.push({ at: t, node: k + 1, state: "is-done" });
      });
      return { events: events, runs: runs, end: t };
    };
    var current = null;
    var place = function (g, p, t) {
      var run = null;
      for (var k = 0; k < p.runs.length; k++) if (t >= p.runs[k].depart && t < p.runs[k].gone) run = p.runs[k];
      streak.classList.toggle("is-moving", !!run);
      if (!run) return;
      if (current !== run) {
        current = run;
        for (var j = 0; j < dashes.length; j++) {
          dashes[j].setAttribute("d", run.line.d);
          dashes[j].style.strokeDasharray = DASHES[j] + " " + (run.line.total + STREAK * 2);
        }
      }
      var lead = run.line.from + ((t - run.depart) / 1000) * SPEED; // the dash's leading edge
      for (var i = 0; i < dashes.length; i++) dashes[i].style.strokeDashoffset = String(-(lead - DASHES[i]));
    };

    player(el, async function (wait, clock) {
      for (var i = 0; ; i = (i + 1) % FLOWS.length) {
        fill(FLOWS[i]);
        reset();
        if (el.classList.contains("is-leaving")) {
          // Coming back in from above, after the pause.
          instantly(el, function () { el.classList.add("is-entering"); el.classList.remove("is-leaving"); });
          el.classList.remove("is-entering");
          await wait(FADE);
        }
        await wait(300);
        var g = measure(), p = plan(g), start = clock.now(), applied = 0;
        await new Promise(function (finish) {
          var frame = function () {
            var t = clock.now() - start;
            while (applied < p.events.length && p.events[applied].at <= t) {
              var e = p.events[applied++];
              if (e.state === "is-done") nodes[e.node].classList.replace("is-working", "is-done");
              else nodes[e.node].classList.add("is-working");
            }
            place(g, p, t);
            if (t >= p.end) finish();
            else clock.frame(frame);
          };
          clock.frame(frame);
        });
        await wait(END_HOLD);
        el.classList.add("is-leaving"); // boxes and lines fade out, moving down
        await wait(FADE);
        await wait(PAUSE);
      }
    });
  }

  /* ---------- Lead Scraper ---------- */
  var STAR = '<svg viewBox="0 0 12 12" aria-hidden="true"><path d="M6 .8l1.6 3.3 3.6.5-2.6 2.5.6 3.6L6 9l-3.2 1.7.6-3.6L.8 4.6l3.6-.5z"/></svg>';
  var LEADS =
    '<div class="leads-head"><p class="leads-search"><span class="leads-label">Sample</span><span class="leads-query"></span></p>' +
    '<p class="leads-count">4 of 20 leads</p></div><ul class="leads-list" role="list"></ul>';

  function leads(el) {
    el.innerHTML = LEADS;
    var head = el.querySelector(".leads-search");
    var query = el.querySelector(".leads-query");
    var list = el.querySelector(".leads-list");

    var add = function (lead, tag) {
      var li = document.createElement("li");
      li.className = "lead";
      li.innerHTML =
        '<div><p class="lead-name"></p><p class="lead-meta"><span class="lead-rating">' + STAR + '<span></span></span>' +
        (lead[3] ? '<span class="lead-reviews"></span>' : "") + '<span class="lead-phone"></span></p></div>' +
        '<span class="lead-tag"><span class="lead-flag"></span><span></span></span>';
      li.querySelector(".lead-name").textContent = lead[0];
      li.querySelector(".lead-rating > span").textContent = lead[1];
      if (lead[3]) li.querySelector(".lead-reviews").textContent = lead[3] + " reviews";
      li.querySelector(".lead-phone").textContent = lead[2];
      li.querySelector(".lead-tag > span:last-child").textContent = tag;
      list.appendChild(li);
    };

    query.textContent = SEARCHES[0].query;
    player(el, async function (wait) {
      for (var i = 0; ; i = (i + 1) % SEARCHES.length) {
        var search = SEARCHES[i];
        query.textContent = search.query;
        el.classList.add("is-working"); // blue arcs circle while the leads come in
        await wait(400);
        for (var k = 0; k < search.leads.length; k++) {
          add(search.leads[k], search.tag);
          await wait(k < search.leads.length - 1 ? 850 : 650);
        }
        el.classList.replace("is-working", "is-done"); // the last lead landed: wrap and turn green
        await wait(END_HOLD);
        // The cards go, and the border with them.
        list.classList.add("is-leaving");
        el.classList.remove("is-done");
        await wait(FADE);
        list.textContent = "";
        list.classList.remove("is-leaving");
        // The pause: the search line fades over to the next search.
        head.classList.add("is-swapping");
        await wait(PAUSE / 2);
        query.textContent = SEARCHES[(i + 1) % SEARCHES.length].query;
        head.classList.remove("is-swapping");
        await wait(PAUSE / 2);
      }
    });
  }

  var setups = { call: callScreen, flow: flow, leads: leads };
  document.querySelectorAll("[data-showcase]").forEach(function (el) {
    var setup = setups[el.getAttribute("data-showcase")];
    if (setup) setup(el);
  });

  /* ---------- Fit (service page heroes) ----------
     A visual marked data-fit is scaled down, never up, to fit the box it sits
     in, so it never makes that box (or the hero) any taller. It is also moved
     so its centre sits on the box's centre: a visual taller than the box is
     laid out from the box's top, and scaling it about its own centre alone
     would leave it low and spilling out of the bottom. */
  document.querySelectorAll("[data-fit]").forEach(function (fit) {
    var box = fit.parentElement;
    var size = function () {
      var w = fit.offsetWidth, h = fit.offsetHeight;
      if (!w || !h || !box.clientWidth) return;
      var s = Math.min(1, box.clientWidth / w, box.clientHeight / h);
      // offsetLeft/Top ignore transforms, so this is the layout position.
      var dx = box.clientWidth / 2 - (fit.offsetLeft + w / 2);
      var dy = box.clientHeight / 2 - (fit.offsetTop + h / 2);
      var move = Math.abs(dx) > 0.5 || Math.abs(dy) > 0.5 ? "translate(" + dx.toFixed(1) + "px," + dy.toFixed(1) + "px) " : "";
      fit.style.transform = move + (s < 1 ? "scale(" + s.toFixed(4) + ")" : "");
    };
    if (!("ResizeObserver" in window)) { size(); return; }
    var ro = new ResizeObserver(size);
    ro.observe(box);
    ro.observe(fit);
  });
})();
