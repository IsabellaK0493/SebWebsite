(function () {
  "use strict";

  var reduce = window.matchMedia("(prefers-reduced-motion: reduce)").matches;

  /* ---------------- header ---------------- */
  var header = document.querySelector(".site-header");
  if (header) {
    var stick = function () { header.classList.toggle("is-stuck", window.scrollY > 40); };
    stick();
    window.addEventListener("scroll", stick, { passive: true });
  }

  /* ---------------- mobile sheet ---------------- */
  var burger = document.querySelector(".burger");
  var sheet = document.querySelector(".sheet");
  if (burger && sheet) {
    var setSheet = function (open) {
      burger.setAttribute("aria-expanded", String(open));
      sheet.classList.toggle("is-open", open);
      sheet.setAttribute("aria-hidden", String(!open));
      document.body.style.overflow = open ? "hidden" : "";
    };
    burger.addEventListener("click", function () {
      setSheet(burger.getAttribute("aria-expanded") !== "true");
    });
    sheet.querySelectorAll("a").forEach(function (a) {
      a.addEventListener("click", function () { setSheet(false); });
    });
    document.addEventListener("keydown", function (e) {
      if (e.key === "Escape" && sheet.classList.contains("is-open")) setSheet(false);
    });
  }

  /* ---------------- reveals ---------------- */
  var revealEls = document.querySelectorAll(".rise, .stagger, .profile");
  if (revealEls.length) {
    var showAll = function () {
      revealEls.forEach(function (el) { el.classList.add("is-in"); });
    };
    if (!("IntersectionObserver" in window)) {
      showAll();
    } else {
      var io = new IntersectionObserver(function (entries) {
        entries.forEach(function (e) {
          if (e.isIntersecting) { e.target.classList.add("is-in"); io.unobserve(e.target); }
        });
      }, { threshold: 0.12, rootMargin: "0px 0px -6% 0px" });
      revealEls.forEach(function (el) { io.observe(el); });
      /* failsafe: never leave content hidden if the observer is suspended */
      window.setTimeout(showAll, 2500);
    }
  }

  /* ---------------- hero headline ---------------- */
  var h1 = document.querySelector(".hero h1");
  if (h1 && !h1.querySelector(".w")) {
    var walk = function (node) {
      var out = [];
      node.childNodes.forEach(function (n) {
        if (n.nodeType === 3) {
          n.textContent.split(/(\s+)/).forEach(function (t) {
            if (!t.trim()) { out.push(document.createTextNode(t)); return; }
            var s = document.createElement("span");
            s.className = "w"; s.textContent = t;
            out.push(s);
          });
        } else if (n.nodeType === 1) {
          var clone = n.cloneNode(false);
          walk(n).forEach(function (c) { clone.appendChild(c); });
          out.push(clone);
        }
      });
      return out;
    };
    var parts = walk(h1);
    h1.textContent = "";
    parts.forEach(function (p) { h1.appendChild(p); });
    var words = h1.querySelectorAll(".w");
    words.forEach(function (w, i) { w.style.transitionDelay = (0.05 + i * 0.055) + "s"; });
    window.requestAnimationFrame(function () { h1.classList.add("is-in"); });
  }

  /* ---------------- hero clip cycle ----------------
     Three-to-four clips cross-faded, one playing at a time.
     Ticks double as manual controls. Pauses when off-screen
     or when the tab is hidden so it costs nothing in the
     background.                                                */
  var stage = document.querySelector(".hero-media");
  if (stage) {
    var clips = Array.prototype.slice.call(stage.querySelectorAll(".hero-clip"));
    var ticks = Array.prototype.slice.call(document.querySelectorAll(".hero-ticks button"));
    var idx = -1, timer = null, paused = false;

    /* The clips are short, so slowing playback is what actually calms the
       hero — it stretches each one and lets the cut come later, without
       shipping any more video. */
    var RATE = 0.65;

    /* Cut shortly before the clip ends so a loop-jump is never seen. */
    var dwell = function (v) {
      var d = v.duration;
      if (!d || !isFinite(d)) return 5200;
      return Math.min(6200, Math.max(2600, (d / RATE) * 1000 - 600));
    };

    /* Only clip 1 ships with the page; warm the next one just in time
       so a switch never stalls on the network. */
    var warm = function (i) {
      var n = clips[(i + 1) % clips.length];
      if (n && n.getAttribute("preload") !== "auto") {
        n.setAttribute("preload", "auto");
        try { n.load(); } catch (e) {}
      }
    };

    var show = function (i, auto) {
      if (i === idx) return;
      idx = i;
      clips.forEach(function (v, n) {
        var on = n === i;
        v.classList.toggle("is-active", on);
        if (on) {
          try { v.currentTime = 0; } catch (e) {}
          if (!reduce) { v.playbackRate = RATE; var p = v.play(); if (p && p.catch) p.catch(function () {}); }
        } else {
          v.pause();
        }
      });
      ticks.forEach(function (t, n) {
        t.setAttribute("aria-current", String(n === i));
        var bar = t.querySelector("span");
        if (bar) { bar.style.animation = "none"; void bar.offsetWidth; bar.style.animation = ""; }
      });
      warm(i);
      var ms = clips[i] ? dwell(clips[i]) : 5200;
      document.documentElement.style.setProperty("--clip-dur", (ms / 1000) + "s");
      window.clearTimeout(timer);
      if (!reduce && !paused && auto !== false) {
        timer = window.setTimeout(function () { show((idx + 1) % clips.length, true); }, ms);
      }
    };

    if (clips.length) {
      show(0, true);

      ticks.forEach(function (t, n) {
        t.addEventListener("click", function () {
          window.clearTimeout(timer);
          show(n, true);
        });
      });

      /* stop work when the hero is off-screen or the tab is hidden */
      if ("IntersectionObserver" in window) {
        new IntersectionObserver(function (es) {
          es.forEach(function (e) {
            paused = !e.isIntersecting;
            if (paused) {
              window.clearTimeout(timer);
              clips.forEach(function (v) { v.pause(); });
            } else if (!reduce) {
              var cur = clips[idx];
              if (cur) { cur.playbackRate = RATE; var p = cur.play(); if (p && p.catch) p.catch(function () {}); }
              window.clearTimeout(timer);
              timer = window.setTimeout(function () { show((idx + 1) % clips.length, true); }, dwell(clips[idx] || clips[0]));
            }
          });
        }, { threshold: 0.05 }).observe(stage);
      }

      document.addEventListener("visibilitychange", function () {
        if (document.hidden) {
          window.clearTimeout(timer);
          clips.forEach(function (v) { v.pause(); });
        } else if (!reduce && !paused) {
          var cur = clips[idx];
          if (cur) { cur.playbackRate = RATE; var p = cur.play(); if (p && p.catch) p.catch(function () {}); }
          timer = window.setTimeout(function () { show((idx + 1) % clips.length, true); }, dwell(clips[idx] || clips[0]));
        }
      });
    }
  }

  /* ---------------- FAQ ---------------- */
  document.querySelectorAll("[data-acc]").forEach(function (item) {
    var q = item.querySelector("button");
    var a = item.querySelector("[data-panel]");
    if (!q || !a) return;
    q.addEventListener("click", function () {
      var open = item.getAttribute("data-acc") === "open";
      item.setAttribute("data-acc", open ? "closed" : "open");
      q.setAttribute("aria-expanded", String(!open));
      a.style.maxHeight = open ? null : a.scrollHeight + "px";
    });
  });

  /* ---------------- enquiry form ---------------- */
  var form = document.querySelector("#enquiry");
  if (form) {
    form.addEventListener("submit", function (e) {
      e.preventDefault();
      var status = form.querySelector(".form-status");
      var submit = form.querySelector("button[type=submit]");
      var action = form.getAttribute("action") || "";
      var live = action && action.indexOf("REPLACE_ME") === -1;

      var d = {
        name: form.querySelector("#f-name").value.trim(),
        email: form.querySelector("#f-email").value.trim(),
        tour: form.querySelector("#f-tour").value,
        people: form.querySelector("#f-people").value,
        message: form.querySelector("#f-msg").value.trim()
      };

      if (!d.name || !d.email) {
        if (status) { status.setAttribute("data-state", "error"); status.textContent = "Add your name and email so Sebastian can reply."; }
        return;
      }

      var fallback = function () {
        var s = encodeURIComponent("Tour enquiry: " + (d.tour || "General"));
        var b = encodeURIComponent(
          "Name: " + d.name + "\nEmail: " + d.email + "\nTour: " + d.tour +
          "\nPeople: " + d.people + "\n\n" + d.message
        );
        window.location.href = "mailto:seb@sebastiancnanderson.com?subject=" + s + "&body=" + b;
        if (status) { status.removeAttribute("data-state"); status.textContent = "Opening your email app to send this to Sebastian…"; }
      };

      if (!live) { fallback(); return; }

      if (submit) submit.disabled = true;
      if (status) { status.removeAttribute("data-state"); status.textContent = "Sending…"; }

      fetch(action, {
        method: "POST",
        headers: { "Accept": "application/json", "Content-Type": "application/json" },
        body: JSON.stringify(d)
      }).then(function (r) {
        if (!r.ok) throw new Error();
        form.reset();
        if (status) { status.removeAttribute("data-state"); status.textContent = "Sent. Sebastian usually replies within a day."; }
      }).catch(fallback).then(function () {
        if (submit) submit.disabled = false;
      });
    });
  }
}());
