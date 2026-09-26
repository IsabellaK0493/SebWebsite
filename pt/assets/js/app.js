/* Sebastian C N Anderson Coaching — site behaviour */

// Where newsletter sign-ups go. Paste your email provider's form address here
// (Mailchimp, MailerLite, Systeme.io etc. all give one). Until then, sign-ups
// open an email to Seb so nobody is lost.
const NEWSLETTER_ACTION = "";
const NEWSLETTER_FALLBACK_EMAIL = "Seb@SebastianCNAnderson.com";

const CALENDLY_URL =
  "https://calendly.com/sebastiananderson/free-consultation?hide_gdpr_banner=1&primary_color=3589a1";

// Mobile menu
const menuBtn = document.querySelector(".menu-btn");
const mobileNav = document.getElementById("mobile-nav");
if (menuBtn && mobileNav) {
  menuBtn.addEventListener("click", () => {
    const open = mobileNav.classList.toggle("open");
    menuBtn.setAttribute("aria-expanded", String(open));
  });
  mobileNav.addEventListener("click", (e) => {
    if (e.target.closest("a")) {
      mobileNav.classList.remove("open");
      menuBtn.setAttribute("aria-expanded", "false");
    }
  });
}

// Booking buttons open Calendly in a pop-up; without JS they go to Calendly directly.
document.addEventListener("click", (e) => {
  const link = e.target.closest("[data-calendly]");
  if (!link || !window.Calendly) return;
  e.preventDefault();
  window.Calendly.initPopupWidget({ url: link.dataset.calendly || CALENDLY_URL });
});

// Hide the "loading" note once the inline calendar has drawn.
window.addEventListener("message", (e) => {
  if (typeof e.data === "object" && e.data && String(e.data.event || "").startsWith("calendly.")) {
    document.querySelectorAll(".calendly-box").forEach((b) => b.classList.add("loaded"));
  }
});

// Newsletter
document.querySelectorAll(".nl-form").forEach((form) => {
  const status = form.querySelector(".nl-status");
  form.addEventListener("submit", (e) => {
    const email = form.querySelector('[name="email"]');
    const name = form.querySelector('[name="name"]');
    if (!email.value || !email.checkValidity()) {
      e.preventDefault();
      status.className = "nl-status err";
      status.textContent = "Enter an email address like name@example.com.";
      email.focus();
      return;
    }
    if (NEWSLETTER_ACTION) {
      form.action = NEWSLETTER_ACTION;
      form.method = "post";
      return; // let the provider handle it
    }
    e.preventDefault();
    const body = `Please add me to the newsletter.\n\nName: ${name.value}\nEmail: ${email.value}`;
    window.location.href =
      `mailto:${NEWSLETTER_FALLBACK_EMAIL}?subject=${encodeURIComponent("Newsletter sign-up")}&body=${encodeURIComponent(body)}`;
    status.className = "nl-status ok";
    status.textContent = "Your email app has opened — press send to join the list.";
  });
});

// Scroll reveals
const reveals = document.querySelectorAll(".reveal");
if ("IntersectionObserver" in window && !matchMedia("(prefers-reduced-motion: reduce)").matches) {
  const io = new IntersectionObserver((entries) => {
    entries.forEach((en) => {
      if (en.isIntersecting) { en.target.classList.add("in"); io.unobserve(en.target); }
    });
  }, { rootMargin: "0px 0px -8% 0px" });
  reveals.forEach((el) => io.observe(el));
} else {
  reveals.forEach((el) => el.classList.add("in"));
}

// Footer year
document.querySelectorAll("[data-year]").forEach((el) => (el.textContent = new Date().getFullYear()));
