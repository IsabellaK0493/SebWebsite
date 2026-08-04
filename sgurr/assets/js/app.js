(function () {
  "use strict";

  var reduceMotion = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
  var rafPending = false;

  /* ---------- header scroll state ---------- */
  var header = document.querySelector(".site-header");

  /* ---------- A. the margin rail ---------- */
  var rail = document.querySelector(".rail");
  var railTick = document.querySelector(".rail-tick");
  var railLabel = document.querySelector(".rail-label");
  var railIndex = document.querySelector(".rail-index");
  var railSections = Array.prototype.slice.call(document.querySelectorAll("[data-rail]"));

  /* ---------- D. drift on the ghosted tally ---------- */
  var driftHost = document.querySelector(".compleat");

  function onFrame() {
    rafPending = false;
    var y = window.scrollY;

    if (header) header.classList.toggle("is-scrolled", y > 40);

    if (railTick) {
      var doc = document.documentElement;
      var scrollable = doc.scrollHeight - window.innerHeight;
      var progress = scrollable > 0 ? Math.min(1, Math.max(0, y / scrollable)) : 0;
      railTick.style.transform = "translateY(" + (progress * (window.innerHeight - 2)) + "px)";
      if (railIndex) railIndex.textContent = String(Math.round(progress * 100)).padStart(3, "0");
    }

    if (driftHost && !reduceMotion) {
      var rect = driftHost.getBoundingClientRect();
      if (rect.bottom > 0 && rect.top < window.innerHeight) {
        var centred = (rect.top + rect.height / 2 - window.innerHeight / 2) / window.innerHeight;
        driftHost.style.setProperty("--drift", (centred * -46).toFixed(1) + "px");
      }
    }
  }

  function requestFrame() {
    if (!rafPending) {
      rafPending = true;
      window.requestAnimationFrame(onFrame);
    }
  }

  onFrame();
  window.addEventListener("scroll", requestFrame, { passive: true });
  window.addEventListener("resize", requestFrame, { passive: true });

  /* rail label tracks the section you are actually reading */
  if (rail && railSections.length && "IntersectionObserver" in window) {
    var labelObserver = new IntersectionObserver(
      function (entries) {
        entries.forEach(function (entry) {
          if (entry.isIntersecting && railLabel) {
            var next = entry.target.getAttribute("data-rail") || "";
            if (railLabel.textContent !== next) {
              railLabel.style.opacity = "0";
              window.setTimeout(function () {
                railLabel.textContent = next;
                railLabel.style.opacity = "1";
              }, 180);
            }
          }
        });
      },
      { rootMargin: "-45% 0px -45% 0px" }
    );
    railSections.forEach(function (s) { labelObserver.observe(s); });
  }

  /* ---------- mobile nav ---------- */
  var toggle = document.querySelector(".nav-toggle");
  var panel = document.querySelector(".mobile-panel");
  if (toggle && panel) {
    toggle.addEventListener("click", function () {
      var open = toggle.getAttribute("aria-expanded") === "true";
      toggle.setAttribute("aria-expanded", String(!open));
      panel.classList.toggle("is-open", !open);
      panel.setAttribute("aria-hidden", String(open));
      document.body.style.overflow = open ? "" : "hidden";
    });
    panel.querySelectorAll("a").forEach(function (a) {
      a.addEventListener("click", function () {
        toggle.setAttribute("aria-expanded", "false");
        panel.classList.remove("is-open");
        panel.setAttribute("aria-hidden", "true");
        document.body.style.overflow = "";
      });
    });
    document.addEventListener("keydown", function (e) {
      if (e.key === "Escape" && panel.classList.contains("is-open")) toggle.click();
    });
  }

  /* ---------- reveal ---------- */
  var revealEls = document.querySelectorAll(".reveal, .reveal-stagger, .reveal-type");
  if (revealEls.length) {
    /* Failsafe: if the observer is throttled or suspended (hidden tab,
       background render), show everything rather than leave it blank. */
    window.setTimeout(function () {
      revealEls.forEach(function (el) { el.classList.add("is-visible"); });
    }, 2500);

    if (!("IntersectionObserver" in window)) {
      revealEls.forEach(function (el) { el.classList.add("is-visible"); });
    } else {
      var io = new IntersectionObserver(
        function (entries) {
          entries.forEach(function (entry) {
            if (entry.isIntersecting) {
              entry.target.classList.add("is-visible");
              io.unobserve(entry.target);
            }
          });
        },
        { threshold: 0.12, rootMargin: "0px 0px -6% 0px" }
      );
      revealEls.forEach(function (el) { io.observe(el); });
    }
  }

  /* ---------- hero contour lines ---------- */
  var contourHost = document.querySelector(".hero-contours");
  if (contourHost) {
    var svgns = "http://www.w3.org/2000/svg";
    var svg = document.createElementNS(svgns, "svg");
    svg.setAttribute("viewBox", "0 0 1200 800");
    svg.setAttribute("preserveAspectRatio", "xMidYMax slice");
    svg.setAttribute("aria-hidden", "true");

    var lines = 9;
    for (var i = 0; i < lines; i++) {
      var y = 120 + i * 62;
      var amp = 30 + i * 6;
      var d = "M -50 " + y;
      for (var x = 0; x <= 1250; x += 125) {
        var wobble = Math.sin((x / 210) + i * 1.3) * amp + Math.sin((x / 70) + i) * (amp * 0.25);
        d += " L " + x + " " + (y + wobble);
      }
      var path = document.createElementNS(svgns, "path");
      path.setAttribute("d", d);
      /* two-tone only: gold reads as a surveyed line, grey as the ground */
      path.setAttribute("stroke", i % 3 === 0 ? "#C68A3E" : "#8B897C");
      path.setAttribute("stroke-opacity", (0.42 - i * 0.03).toFixed(2));
      svg.appendChild(path);

      if (!reduceMotion) {
        var len = 2200;
        path.style.strokeDasharray = len;
        path.style.strokeDashoffset = len;
        path.style.transition = "stroke-dashoffset " + (1.7 + i * 0.2) + "s cubic-bezier(.16,1,.3,1)";
        path.style.transitionDelay = (i * 0.075) + "s";
        window.requestAnimationFrame(function (p) {
          return function () { p.style.strokeDashoffset = "0"; };
        }(path));
      }
    }
    contourHost.appendChild(svg);
  }

  /* ---------- FAQ accordion ---------- */
  document.querySelectorAll(".faq-item").forEach(function (item) {
    var q = item.querySelector(".faq-q");
    var a = item.querySelector(".faq-a");
    if (!q || !a) return;
    q.addEventListener("click", function () {
      var isOpen = item.getAttribute("data-open") === "true";
      document.querySelectorAll(".faq-item").forEach(function (other) {
        other.setAttribute("data-open", "false");
        other.querySelector(".faq-a").style.maxHeight = null;
        other.querySelector(".faq-q").setAttribute("aria-expanded", "false");
      });
      if (!isOpen) {
        item.setAttribute("data-open", "true");
        q.setAttribute("aria-expanded", "true");
        a.style.maxHeight = a.scrollHeight + "px";
      }
    });
  });

  /* ---------- tour filter ---------- */
  var filterBar = document.querySelector(".filter-bar");
  if (filterBar) {
    var cards = document.querySelectorAll("[data-tier]");
    filterBar.addEventListener("click", function (e) {
      var btn = e.target.closest("button");
      if (!btn) return;
      filterBar.querySelectorAll("button").forEach(function (b) {
        b.classList.remove("is-active");
        b.setAttribute("aria-pressed", "false");
      });
      btn.classList.add("is-active");
      btn.setAttribute("aria-pressed", "true");
      var tier = btn.getAttribute("data-filter");
      cards.forEach(function (card) {
        var match = tier === "all" || card.getAttribute("data-tier") === tier;
        card.style.display = match ? "" : "none";
      });
    });
  }

  /* ---------- contact form ----------
     Posts to a real endpoint. Falls back to the visitor's mail
     client if the endpoint is unconfigured or unreachable.      */
  var form = document.querySelector("#contact-form");
  if (form) {
    form.addEventListener("submit", function (e) {
      e.preventDefault();
      var status = form.querySelector(".form-status");
      var submit = form.querySelector("button[type=submit]");
      var endpoint = form.getAttribute("action") || "";
      var configured = endpoint.indexOf("REPLACE_ME") === -1 && endpoint !== "";

      var data = {
        name: form.querySelector("#name").value.trim(),
        email: form.querySelector("#email").value.trim(),
        route: form.querySelector("#route").value,
        message: form.querySelector("#message").value.trim()
      };

      if (!data.name || !data.email) {
        if (status) {
          status.setAttribute("data-state", "error");
          status.textContent = "Add your name and email so we can reply.";
        }
        return;
      }

      function mailtoFallback() {
        var subject = encodeURIComponent("Enquiry: " + (data.route || "General enquiry"));
        var body = encodeURIComponent(
          "Name: " + data.name + "\nEmail: " + data.email +
          "\nRoute of interest: " + data.route + "\n\n" + data.message
        );
        window.location.href = "mailto:hello@sgurrguides.scot?subject=" + subject + "&body=" + body;
        if (status) {
          status.removeAttribute("data-state");
          status.textContent = "Opening your email client to send this to hello@sgurrguides.scot…";
        }
      }

      if (!configured) { mailtoFallback(); return; }

      if (submit) { submit.disabled = true; }
      if (status) { status.removeAttribute("data-state"); status.textContent = "Sending…"; }

      fetch(endpoint, {
        method: "POST",
        headers: { "Accept": "application/json", "Content-Type": "application/json" },
        body: JSON.stringify(data)
      }).then(function (res) {
        if (!res.ok) throw new Error("bad status");
        form.reset();
        if (status) {
          status.removeAttribute("data-state");
          status.textContent = "Enquiry sent. A guide will reply within a day.";
        }
      }).catch(function () {
        mailtoFallback();
      }).then(function () {
        if (submit) submit.disabled = false;
      });
    });
  }
}());
