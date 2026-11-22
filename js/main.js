/* Renders the whole site from js/site.js and js/projects.js.
   Elements marked with data-edit / data-img / data-list are editable in edit mode
   (see editor/). You normally don't need to edit this file. */
(function () {
  try { const saved = localStorage.getItem("theme"); if (saved) document.documentElement.dataset.theme = saved; } catch (e) {}
  const page = document.body.dataset.page;
  const $ = (sel) => document.querySelector(sel);
  const esc = (s) =>
    String(s ?? "").replace(/[&<>"']/g, (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" }[c]));
  const projectUrl = (p) => `project.html?p=${encodeURIComponent(p.slug)}`;

  // Editable text: <tag data-edit="path">value</tag>
  const t = (tag, path, value, cls = "") =>
    `<${tag}${cls ? ` class="${cls}"` : ""} data-edit="${path}">${esc(value)}</${tag}>`;
  // Image (or placeholder) that can be replaced in edit mode
  // Image, video or placeholder. Videos play silently on a loop, like a moving image.
  const isVideo = (src) => /\.(mp4|mov|m4v|webm)(\?|$)/i.test(src || "");
  const img = (src, alt, path, slug, eager) => {
    const edit = path ? `data-img="${path}" data-slug="${esc(slug)}"` : "";
    if (!src) return `<div class="img-placeholder" ${edit}>${path ? "Add image or video" : esc(alt)}</div>`;
    if (isVideo(src))
      return `<video src="${esc(src)}" autoplay muted loop playsinline preload="${eager ? "auto" : "metadata"}" aria-label="${esc(alt)}" ${edit}></video>`;
    return `<img src="${esc(src)}" alt="${esc(alt)}" ${eager ? "" : 'loading="lazy"'} ${edit}>`;
  };

  // Gallery items are either a path string or {src, shape} where shape is "portrait" or "landscape".
  const srcOf = (it) => (it && typeof it === "object" ? it.src : it);
  const shapeOf = (it) => (it && typeof it === "object" ? it.shape : undefined);
  const shapeFrom = (w, h) => (w && h && w / h < 1.15 ? "portrait" : "landscape");
  // Measure a photo or video's real shape (used by the editor on upload, and as a fallback here)
  function measure(src) {
    return new Promise((done) => {
      if (isVideo(src)) {
        const v = document.createElement("video");
        v.preload = "metadata"; v.muted = true;
        v.onloadedmetadata = () => done(shapeFrom(v.videoWidth, v.videoHeight));
        v.onerror = () => done("landscape");
        v.src = src;
      } else {
        const i = new Image();
        i.onload = () => done(shapeFrom(i.naturalWidth, i.naturalHeight));
        i.onerror = () => done("landscape");
        i.src = src;
      }
    });
  }
  window.siteMedia = { measure, srcOf, shapeOf };

  // Layout: two portraits side by side, landscape full width,
  // a single portrait sits in a half-width column (alternating left / right).
  function galleryLayout(items) {
    const out = [];
    let lone = 0;
    for (let k = 0; k < items.length; ) {
      if ((shapeOf(items[k]) || "landscape") === "portrait") {
        if (k + 1 < items.length && (shapeOf(items[k + 1]) || "landscape") === "portrait") {
          out.push("half", "half"); k += 2;
        } else {
          out.push(`half lone ${lone++ % 2 ? "right" : "left"}`); k += 1;
        }
      } else {
        out.push("full"); k += 1;
      }
    }
    return out;
  }

  const nav = [
    { label: "Cases", href: "cases.html", key: "cases" },
    { label: "About", href: "about.html", key: "about" },
    { label: "Contact", href: "#contact", key: "contact" },  // Contact = the footer: scrolls down to it
  ];

  const card = (p) => `
    <a class="card reveal${p.textColor === "dark" ? " card--dark" : ""}" href="${projectUrl(p)}">
      <div class="card-media">
        ${img(p.cover, p.title)}
        <div class="card-meta">
          <h3>${esc(p.title)}</h3>
          <span class="plus" aria-hidden="true"></span>
        </div>
      </div>
    </a>`;

  // Floating glass menu: a round-cornered button that folds open with all menu items.
  function header(S) {
    const active = (n) => page === n.key || (page === "project" && n.key === "cases");
    return `
    <div class="fmenu-wrap">
    <a href="index.html" class="fmenu-name glass">${esc(S.name)}</a>
    <div class="fmenu glass">
      <button class="menu-toggle fmenu-toggle" aria-label="Menu" aria-expanded="false" aria-controls="fmenu-list">
        <span class="burger" aria-hidden="true"></span>
      </button>
      <nav class="fmenu-list" id="fmenu-list">
        <div class="fmenu-inner">
          ${nav.map((n, k) => `<a href="${n.href}" class="${active(n) ? "active" : ""}" style="--i:${k}">${n.label}</a>`).join("")}
        </div>
      </nav>
    </div>
    <button class="theme-toggle glass" aria-label="Switch light / dark mode"><span class="theme-icon" aria-hidden="true"></span></button>
    <button class="planet-toggle glass" aria-label="Show all work as a globe">
      <svg viewBox="0 0 20 20" width="18" height="18" aria-hidden="true" fill="none" stroke="currentColor" stroke-width="1.4">
        <circle cx="10" cy="10" r="8"/><ellipse cx="10" cy="10" rx="3.6" ry="8"/>
        <path d="M10 2v16M2 10h16M3.6 5.6c3.8 1.6 9 1.6 12.8 0M3.6 14.4c3.8-1.6 9-1.6 12.8 0"/>
      </svg>
    </button>
    </div>`;
  }

  function footer(S) {
    return `
    <div class="container">
      <section class="cta">
        ${window.EDITOR
          ? t("p", "site.cta.text", S.cta.text, "cta-text")
          : // first sentence on its own line, the rest below it
            (() => {
              const m = String(S.cta.text).match(/^(.*?[.?!])\s+(.+)$/s);
              return `<p class="cta-text">${m ? `<span class="cta-first">${esc(m[1])}</span> ${esc(m[2])}` : esc(S.cta.text)}</p>`;
            })()}
        <a class="btn" href="${esc(S.cta.buttonLink)}">${t("span", "site.cta.buttonLabel", S.cta.buttonLabel)} <span aria-hidden="true">→</span></a>
      </section>
      <div class="footer-grid">
        <div>
          <p class="footer-label">Contact</p>
          <a href="mailto:${esc(S.email)}">${esc(S.email)}</a>
          ${S.phone ? `<a href="tel:${esc(S.phone.replace(/\s/g, ""))}">${esc(S.phone)}</a>` : ""}
          ${S.location ? `<span>${esc(S.location)}</span>` : ""}
        </div>
        <div>
          <p class="footer-label">Pages</p>
          ${nav.map((n) => `<a href="${n.href}">${n.label}</a>`).join("")}
        </div>
        <div>
          <p class="footer-label">Social</p>
          ${S.socials.map((s) => `<a href="${esc(s.url)}" target="_blank" rel="noopener">${esc(s.label)}</a>`).join("")}
        </div>
      </div>
      <div class="footer-bottom">
        <span>© ${new Date().getFullYear()}</span>
      </div>
    </div>`;
  }

  // List of cases (name, services, "View case" / note). A case links to its project page
  // when a project has the same title. Used on the homepage and the Cases page.
  function caseList(S, P) {
    const cases = S.cases || [];
    const byTitle = (name) => P.find((p) => p.title.trim().toLowerCase() === String(name || "").trim().toLowerCase());
    return `
      ${cases.length || window.EDITOR ? `
      <section class="container case-section">
        <ul class="case-list" data-list="site.cases" data-new='{"name":"Client name","services":"Services","note":"Confidential"}'>
          ${cases.map((c, i) => {
            const p = byTitle(c.name);
            // linked rows get a rounded thumbnail of the project cover that slides open on the right on hover
            const thumb = p && p.cover && !window.EDITOR ? `<span class="case-thumb" aria-hidden="true">${img(p.cover, "")}</span>` : "";
            const cells = `
              ${t("span", `site.cases.${i}.name`, c.name, "case-name")}
              ${t("span", `site.cases.${i}.services`, c.services, "case-services")}
              <span class="case-end">${thumb}${p && !window.EDITOR ? `<span class="case-action">View case</span>` : t("span", `site.cases.${i}.note`, c.note, "case-action")}</span>`;
            return p && !window.EDITOR
              ? `<li class="case reveal"><a class="case-row" href="${projectUrl(p)}">${cells}</a></li>`
              : `<li class="case reveal${p ? "" : " is-muted"}"><div class="case-row">${cells}</div></li>`;
          }).join("")}
        </ul>
      </section>` : ""}`;
  }

  /* ---------- Page bodies ---------- */
  const pages = {
    home(S, P) {
      document.title = `${S.name} — ${S.tagline}`;
      // Image grid: the first N rows (2 projects per row), then the list of cases.
      const rows = Number(S.homeImageRows) || 6;
      const shown = P.slice(0, rows * 2);
      // Intro: the showreel fills the screen, then shrinks into the first grid spot
      // while the first case slides in next to it (see setupIntro below).
      // In the editor it is shown as a plain full-width block so the video can be replaced.
      const reel = (path) => img(S.showreel, "Showreel", path, "showreel", true);
      if (window.EDITOR) {
        return `
      <section class="container home-reel-edit"><div class="showreel">${reel("site.showreel")}</div></section>
      <section class="container section home-work after-intro">
        <h2 class="work-title reveal">Work</h2>
        <div class="grid">${shown.map(card).join("")}</div>
      </section>${caseList(S, P)}`;
      }
      return `
      <section class="container home-intro">
        <div class="intro-sticky">
          <div class="showreel intro-a">${S.showreel ? reel() : `<div class="img-placeholder">Showreel</div>`}</div>
        </div>
      </section>
      <section class="container section home-work after-intro">
        <h2 class="work-title reveal">Work</h2>
        <div class="grid">${shown.map(card).join("")}</div>
      </section>${caseList(S, P)}`;

    },

    cases(S, P) {
      document.title = `Cases — ${S.name}`;
      return `
      <section class="container section home-work cases-page">
        <div class="grid">${P.slice(0, 4).map(card).join("")}</div>
      </section>${caseList(S, P)}`;
    },

    work(S, P) {
      document.title = `Work — ${S.name}`;
      return `
      <section class="container section home-work">
        <div class="grid">${P.map(card).join("")}</div>
      </section>`;
    },

    about(S) {
      document.title = `About — ${S.name}`;
      const A = S.about;
      return `
      <section class="container page-head">
        ${t("h1", "site.about.title", A.title, "reveal")}
      </section>
      ${A.image || window.EDITOR ? `<div class="container about-image reveal">${img(A.image, S.name, "site.about.image", "about", true)}</div>` : ""}
      <section class="container two-col">
        <div class="reveal"><p class="label">About</p></div>
        <div class="reveal">
          ${t("p", "site.about.intro", A.intro, "lead")}
          ${t("p", "site.about.body", A.body, "muted about-body")}
        </div>
      </section>
      <section class="container two-col">
        <div class="reveal"><p class="label">Services</p></div>
        <ul class="list reveal" data-list="site.about.services" data-new='"New service"'>
          ${A.services.map((s, i) => `<li>${t("span", `site.about.services.${i}`, s)}<span class="muted">${String(i + 1).padStart(2, "0")}</span></li>`).join("")}
        </ul>
      </section>
      <section class="container two-col">
        <div class="reveal"><p class="label">Experience</p></div>
        <ul class="list exp-list reveal" data-list="site.about.experience" data-new='{"company":"Company","role":"Role","years":"2026"}'>
          ${A.experience.map((e, i) => `<li>
            <span class="exp-main">
              ${t("span", `site.about.experience.${i}.company`, e.company || "", "exp-company")}
              ${t("span", `site.about.experience.${i}.role`, e.role, "exp-role")}
            </span>
            ${t("span", `site.about.experience.${i}.years`, e.years, "exp-years")}
          </li>`).join("")}
        </ul>
      </section>`;
    },

    contact(S) {
      document.title = `Contact — ${S.name}`;
      return `
      <section class="container page-head">
        ${t("h1", "site.contact.title", S.contact.title, "reveal")}
      </section>
      <section class="container two-col">
        <div class="reveal"><p class="label">Email</p></div>
        <div class="reveal">
          <a class="big-link link" href="mailto:${esc(S.email)}">${esc(S.email)}</a>
          ${window.EDITOR
            ? t("p", "site.contact.text", S.contact.text, "muted contact-text")
            : `<p class="muted contact-text">${esc(S.contact.text).replace(/\n/g, "<br>")}</p>`}
        </div>
      </section>`;
    },

    project(S, P) {
      const slug = new URLSearchParams(location.search).get("p");
      const i = P.findIndex((x) => x.slug === slug);
      const p = P[i];
      if (!p) {
        document.title = `Not found — ${S.name}`;
        return `<div class="container page-head"><h1>Project not found</h1><p style="margin-top:24px"><a class="btn" href="index.html">Back to work →</a></p></div>`;
      }
      document.title = `${p.title} — ${S.name}`;
      const base = `projects.${i}`;
      const more = P.filter((x) => x !== p);
      const nextUp = [...more.slice(i), ...more.slice(0, i)].slice(0, 3);
      const gallery = p.images || [];

      const layout = galleryLayout(gallery);
      window.__galleryProject = p;

      // Big intro sentence: split into words for the word-by-word reveal (plain text in edit mode)
      const intro = window.EDITOR
        ? t("p", `${base}.intro`, p.intro, "statement-text")
        : `<p class="statement-text words">${String(p.intro || "").split(/\s+/).map((w, k) => `<span style="--w:${k}">${esc(w)}</span>`).join(" ")}</p>`;

      return `
      <section class="container project-hero">
        <div class="project-title reveal">
          ${t("h1", `${base}.title`, p.title)}
          ${t("p", `${base}.tagline`, p.tagline, "project-tagline")}
        </div>
        <dl class="project-meta reveal">
          <div><dt>Client:</dt>${t("dd", `${base}.client`, p.client)}</div>
          <div><dt>Year:</dt>${t("dd", `${base}.year`, p.year)}</div>
          <div><dt>Type:</dt><dd data-edit="${base}.type" data-csv>${esc((p.type || []).join(", "))}</dd></div>
        </dl>
      </section>

      <div class="container"><div class="project-cover reveal">${img(p.cover, p.title, `${base}.cover`, p.slug, true)}</div></div>

      <section class="container statement reveal">${intro}</section>

      ${gallery.length || window.EDITOR ? `
        <section class="container media-grid" data-list="${base}.images" data-new='""' data-slug="${esc(p.slug)}">
          ${gallery.map((it, j) => `<div class="media ${layout[j]} reveal">${img(srcOf(it), p.title, `${base}.images.${j}`, p.slug)}</div>`).join("")}
        </section>` : ""}

      <section class="container project-details">
        <div class="details-col reveal">
          <h2 class="details-label">Project Description</h2>
          <div data-list="${base}.description" data-new='"New paragraph"'>
            ${(p.description || []).map((d, j) => `<div class="para">${t("p", `${base}.description.${j}`, d)}</div>`).join("")}
          </div>
          ${(p.credits || []).length || window.EDITOR ? `
            <h2 class="details-label credits-label">Credits</h2>
            <dl class="credits" data-list="${base}.credits" data-new='{"role":"Role","name":"Name"}'>
              ${(p.credits || []).map((c, j) => `<div>${t("dt", `${base}.credits.${j}.role`, c.role)}<span class="colon">:</span>${t("dd", `${base}.credits.${j}.name`, c.name)}</div>`).join("")}
            </dl>` : ""}
        </div>
      </section>

      ${nextUp.length ? `
        <section class="container section more-works">
          <div class="section-head"><h2>More works</h2><a href="cases.html" class="link">View All</a></div>
          <div class="grid grid-3">${nextUp.map(card).join("")}</div>
        </section>` : ""}`;
    },
  };

  /* ---------- Render ---------- */
  let io;
  function render() {
    const S = window.SITE, P = window.PROJECTS || [];
    let h = document.querySelector(".site-header");
    if (!h) {
      h = document.createElement("header");
      h.className = "site-header";
      document.body.prepend(h);
    }
    h.innerHTML = header(S);
    const toggle = h.querySelector(".menu-toggle");
    const setOpen = (on) => { h.classList.toggle("open", on); toggle.setAttribute("aria-expanded", on); };
    toggle.addEventListener("click", (e) => { e.stopPropagation(); setOpen(!h.classList.contains("open")); });
    h.querySelectorAll(".fmenu-list a").forEach((a) => a.addEventListener("click", () => setOpen(false)));
    h.querySelector(".planet-toggle").addEventListener("click", () => openPlanet(window.PROJECTS || []));
    // light / dark switch: remembers the choice in this browser
    h.querySelector(".theme-toggle").addEventListener("click", () => {
      const dark = document.documentElement.dataset.theme
        ? document.documentElement.dataset.theme === "dark"
        : matchMedia("(prefers-color-scheme: dark)").matches;
      document.documentElement.dataset.theme = dark ? "light" : "dark";
      try { localStorage.setItem("theme", document.documentElement.dataset.theme); } catch (e) {}
    });
    if (!window.__menuListeners) {
      window.__menuListeners = true;
      // At the end of the page the menu opens by itself; scrolling back up closes it again
      // (unless the visitor opened it themselves).
      let autoOpened = false;
      const atEnd = () => window.innerHeight + window.scrollY >= document.documentElement.scrollHeight - 80;
      window.addEventListener("scroll", () => {
        const hh = document.querySelector(".site-header");
        if (!hh || window.EDITOR) return;
        const open = hh.classList.contains("open");
        if (atEnd() && !open) {
          autoOpened = true;
          hh.classList.add("open"); hh.querySelector(".menu-toggle").setAttribute("aria-expanded", true);
        } else if (!atEnd() && open && autoOpened) {
          autoOpened = false;
          hh.classList.remove("open"); hh.querySelector(".menu-toggle").setAttribute("aria-expanded", false);
        }
      }, { passive: true });
      document.addEventListener("click", (e) => { if (e.target.closest(".menu-toggle")) autoOpened = false; }, true);
      // close when clicking outside the menu or pressing Escape
      document.addEventListener("click", (e) => {
        const hh = document.querySelector(".site-header");
        if (hh && hh.classList.contains("open") && !e.target.closest(".fmenu")) { hh.classList.remove("open"); hh.querySelector(".menu-toggle").setAttribute("aria-expanded", false); }
      });
      document.addEventListener("keydown", (e) => {
        const hh = document.querySelector(".site-header");
        if (e.key === "Escape" && hh) { hh.classList.remove("open"); hh.querySelector(".menu-toggle").setAttribute("aria-expanded", false); }
      });
    }

    let main = document.querySelector("main");
    if (!main) { main = document.createElement("main"); h.after(main); }
    main.innerHTML = (pages[page] || (() => ""))(S, P);

    let f = document.querySelector(".site-footer");
    if (!f) { f = document.createElement("footer"); f.className = "site-footer"; main.after(f); }
    f.id = "contact";
    // the footer is built by this script, so jump to #contact ourselves once it exists
    // (the footer sits behind the page, so "scrolling to it" means scrolling to the very end)
    const toEnd = (smooth) => window.scrollTo({ top: document.documentElement.scrollHeight, behavior: smooth ? "smooth" : "auto" });
    if (location.hash === "#contact") requestAnimationFrame(() => toEnd(false));
    document.querySelectorAll('a[href="#contact"]').forEach((a) => a.addEventListener("click", (e) => { e.preventDefault(); toEnd(true); }));
    f.innerHTML = footer(S);

    // Reveal on scroll, one by one: elements that come into view together are queued
    // top-to-bottom, left-to-right, and each starts STEP ms after the previous one.
    const STEP = 140;
    let nextAt = 0;
    const els = document.querySelectorAll(".reveal");
    if (io) io.disconnect();
    if ("IntersectionObserver" in window && !window.EDITOR) {
      io = new IntersectionObserver((entries) => {
        const now = performance.now();
        entries
          .filter((e) => e.isIntersecting)
          .sort((a, b) => a.boundingClientRect.top - b.boundingClientRect.top || a.boundingClientRect.left - b.boundingClientRect.left)
          .forEach((e) => {
            const el = e.target;
            const start = Math.max(now, nextAt);
            nextAt = start + STEP;
            el.style.transitionDelay = `${Math.round(start - now)}ms`;
            el.classList.add("in");
            io.unobserve(el);
            el.addEventListener("transitionend", function done(ev) {
              if (ev.target !== el) return;
              el.style.transitionDelay = "";
              el.classList.add("done");
              el.removeEventListener("transitionend", done);
            });
          });
      }, { rootMargin: "0px 0px -8% 0px" });
      els.forEach((el) => io.observe(el));
    } else {
      els.forEach((el) => el.classList.add("in"));
    }
    setupIntro();
    fitFooterGap();
    document.dispatchEvent(new Event("site:rendered"));
    learnShapes();
  }

  /* All project images/videos with the project they belong to and a first guess of their shape. */
  function allMedia(P) {
    const media = [];
    P.forEach((p) => {
      if (p.cover) media.push({ src: p.cover, p, ar: 16 / 9 });
      (p.images || []).forEach((it) => { if (srcOf(it)) media.push({ src: srcOf(it), p, ar: shapeOf(it) === "portrait" ? 3 / 4 : 16 / 9 }); });
    });
    return media;
  }
  // a link tile with the image or video; calls onShape(ar) once the real shape is known
  function mediaTile(cls, m, onShape) {
    const a = document.createElement("a");
    a.className = cls;
    a.href = projectUrl(m.p);
    a.title = m.p.title;
    a.innerHTML = isVideo(m.src)
      ? `<video src="${esc(m.src)}" autoplay muted loop playsinline preload="metadata"></video>`
      : `<img src="${esc(m.src)}" alt="${esc(m.p.title)}">`;
    const el = a.firstElementChild;
    const learn = (w, h) => { if (w && h) onShape(w / h); };
    if (el.tagName === "IMG") el.addEventListener("load", () => learn(el.naturalWidth, el.naturalHeight), { once: true });
    else el.addEventListener("loadedmetadata", () => learn(el.videoWidth, el.videoHeight), { once: true });
    return a;
  }
  // width/height for a tile of a given base size: same area for every tile, shape follows the image
  const tileSize = (base, ar) => { const area = base * base * 9 / 16; return [Math.sqrt(area * ar), Math.sqrt(area / ar)]; };

  /* Globe: all project images on a slowly turning 3D sphere (pure CSS 3D).
     Drag to spin, click an image to open its case, Esc or × to close. */
  function openPlanet(P) {
    if (document.querySelector(".planet")) return;
    const media = allMedia(P);
    if (!media.length) return;
    const N = Math.max(90, media.length);                  // fill the sphere: repeat media if there are few
    const ov = document.createElement("div");
    ov.className = "planet";
    ov.innerHTML = `<button class="planet-close glass" aria-label="Close">×</button><div class="planet-stage"><div class="planet-globe"></div></div>`;
    const globe = ov.querySelector(".planet-globe");
    const items = [];
    const golden = Math.PI * (3 - Math.sqrt(5));
    let R = 0;
    const sizeItem = (it) => {
      const [w, h] = tileSize(R * 0.3, it.ar);
      it.el.style.width = `${w}px`; it.el.style.height = `${h}px`;
      it.el.style.margin = `${-h / 2}px 0 0 ${-w / 2}px`;
      it.el.style.transform = `rotateY(${it.lon}deg) rotateX(${it.lat}deg) translateZ(${R}px)`;
    };
    for (let i = 0; i < N; i++) {
      const m = media[i % media.length];
      const y = 1 - (2 * (i + 0.5)) / N;                  // Fibonacci sphere: even spread over the surface
      const it = { ar: m.ar, lat: Math.asin(y) * 180 / Math.PI, lon: ((i * golden) * 180 / Math.PI) % 360 };
      it.el = mediaTile("planet-item", m, (ar) => { it.ar = ar; sizeItem(it); });
      it.el.style.setProperty("--d", `${(i % 20) * 30}ms`);
      globe.appendChild(it.el); items.push(it);
    }
    document.body.appendChild(ov);
    document.documentElement.classList.add("planet-open");
    const layout = () => { R = Math.min(window.innerWidth, window.innerHeight) * 0.36; items.forEach(sizeItem); };
    layout();

    // turning: slow auto-rotation + drag with a bit of inertia
    let rotY = 0, rotX = -12, vY = 0.08, vX = 0, dragging = false, lastX = 0, lastY = 0, raf, moved = 0;
    const tick = () => {
      if (!dragging) { vY += (0.08 - vY) * 0.02; vX *= 0.95; rotY += vY; rotX = Math.max(-60, Math.min(60, rotX + vX)); }
      globe.style.transform = `rotateX(${rotX}deg) rotateY(${rotY}deg)`;
      raf = requestAnimationFrame(tick);
    };
    tick();
    const down = (e) => { dragging = true; moved = 0; lastX = e.clientX; lastY = e.clientY; ov.classList.add("dragging"); };
    const move = (e) => {
      if (!dragging) return;
      const dx = e.clientX - lastX, dy = e.clientY - lastY;
      lastX = e.clientX; lastY = e.clientY; moved += Math.abs(dx) + Math.abs(dy);
      vY = dx * 0.25; vX = -dy * 0.25;
      rotY += vY; rotX = Math.max(-60, Math.min(60, rotX + vX));
    };
    const up = () => { dragging = false; ov.classList.remove("dragging"); };
    ov.addEventListener("pointerdown", down);
    window.addEventListener("pointermove", move);
    window.addEventListener("pointerup", up);
    // a drag should not count as a click on an image
    ov.addEventListener("click", (e) => { if (moved > 6 && e.target.closest(".planet-item")) e.preventDefault(); }, true);
    const onKey = (e) => { if (e.key === "Escape") close(); };
    function close() {
      ov.classList.remove("in");
      document.documentElement.classList.remove("planet-open");
      window.removeEventListener("pointermove", move);
      window.removeEventListener("pointerup", up);
      window.removeEventListener("resize", layout);
      document.removeEventListener("keydown", onKey);
      setTimeout(() => { cancelAnimationFrame(raf); ov.remove(); }, 500);
    }
    ov.querySelector(".planet-close").addEventListener("click", close);
    document.addEventListener("keydown", onKey);
    window.addEventListener("resize", layout);
    requestAnimationFrame(() => ov.classList.add("in"));
  }

  /* When scrolled all the way down, the last line of the page (e.g. the case list border) must not
     rest right behind the floating menu. If it would, push the footer down so the line ends up above the screen. */
  function fitFooterGap() {
    const main = document.querySelector("main"), f = document.querySelector(".site-footer");
    if (!main || !f) return;
    main.style.paddingBottom = "";
    const MENU_ZONE = 90;                                     // top area where the menu floats
    const pad = parseFloat(getComputedStyle(main).paddingBottom);
    const contentEnd = main.getBoundingClientRect().bottom + window.scrollY - pad;
    const fromBottom = document.documentElement.scrollHeight - contentEnd;
    const y = window.innerHeight - fromBottom;                // where the line sits when fully scrolled down
    if (y > -2 && y < MENU_ZONE) main.style.paddingBottom = `${pad + y + 2}px`;
  }
  if (!window.__footerGap) { window.__footerGap = true; window.addEventListener("resize", () => fitFooterGap()); }

  /* Homepage intro: the showreel starts edge to edge, filling the screen, and while scrolling
     settles into a full-width 16:9 block (with margins and rounded corners) above the case grid. */
  let introOff = null;
  function setupIntro() {
    if (introOff) { introOff(); introOff = null; }
    const sec = document.querySelector(".home-intro");
    if (!sec) return;
    const sticky = sec.querySelector(".intro-sticky");
    const reel = sec.querySelector(".intro-a");
    const HEADER = 0, GAP = 10, RADIUS = 12; // no header bar any more: the menu floats
    const lerp = (a, b, t) => a + (b - a) * t;
    const clamp = (v) => Math.min(1, Math.max(0, v));
    const ease = (t) => (t < 0.5 ? 4 * t * t * t : 1 - Math.pow(-2 * t + 2, 3) / 2);
    let m = {};

    function measure() {
      const W = sticky.clientWidth;                         // content width (inside the 16px margins)
      const vw = document.documentElement.clientWidth; const edge = (vw - W) / 2;            // distance to the screen edge
      m = { W, edge, fullW: vw, fullH: window.innerHeight - HEADER, endH: W * 9 / 16, D: window.innerHeight * 0.7 };
      // scroll distance + final height: it unpins exactly when it reaches its final size
      sec.style.height = `${m.D + m.endH}px`;
      sec.style.marginBottom = `${GAP}px`;
      update(true);
    }

    // the shrink follows the scroll with a bit of inertia, so it glides instead of moving 1:1 with the wheel
    let shown = null;
    const soft = (t) => 1 - Math.pow(1 - t, 3);            // ease-out: quick start, gentle landing
    function update(instant) {
      const target = clamp((HEADER - sec.getBoundingClientRect().top) / m.D);
      shown = shown == null || instant ? target : shown + (target - shown) * 0.14;
      if (Math.abs(target - shown) < 0.0005) shown = target;
      const e = soft(shown);
      const h = lerp(m.fullH, m.endH, e);
      reel.style.left = `${lerp(-m.edge, 0, e)}px`;
      reel.style.width = `${lerp(m.fullW, m.W, e)}px`;
      reel.style.height = `${h}px`;
      reel.style.borderRadius = `${lerp(0, RADIUS, e)}px`;
      sticky.style.height = `${h}px`;
      // no fade-in; it fades out while it scrolls away off the top of the screen
      const r = reel.getBoundingClientRect();
      reel.style.opacity = clamp(r.bottom / r.height);
      return shown !== target;
    }

    let ticking = false;
    const loop = () => { if (update()) requestAnimationFrame(loop); else ticking = false; };
    const onScroll = () => {
      if (ticking) return;
      ticking = true;
      requestAnimationFrame(loop);
    };
    window.addEventListener("scroll", onScroll, { passive: true });
    window.addEventListener("resize", measure);
    introOff = () => {
      window.removeEventListener("scroll", onScroll);
      window.removeEventListener("resize", measure);
    };
    measure();
  }

  function learnShapes() {
    const p = page === "project" ? window.__galleryProject : null;
    if (!p || !Array.isArray(p.images)) return;
    const unknown = p.images.map((it, j) => [it, j]).filter(([it]) => srcOf(it) && !shapeOf(it));
    if (!unknown.length) return;
    Promise.all(unknown.map(([it]) => measure(srcOf(it)))).then((shapes) => {
      unknown.forEach(([it, j], n) => { p.images[j] = { src: srcOf(it), shape: shapes[n] }; });
      document.dispatchEvent(new Event("site:shapes-learned"));
      const y = window.scrollY; render(); window.scrollTo(0, y);
    });
  }

  window.renderSite = render;
  render();
})();
