/* Renders the whole site from js/site.js and js/projects.js.
   Elements marked with data-edit / data-img / data-list are editable in edit mode
   (see editor/). You normally don't need to edit this file. */
(function () {
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
    { label: "Work", href: "index.html", key: "work" },
    { label: "About", href: "about.html", key: "about" },
    { label: "Contact", href: "contact.html", key: "contact" },
  ];

  const card = (p) => `
    <a class="card reveal" href="${projectUrl(p)}">
      <div class="card-media">${img(p.cover, p.title)}</div>
      <div class="card-meta">
        <h3>${esc(p.title)}</h3>
        <span class="muted">${esc(p.tagline)}</span>
      </div>
    </a>`;

  function header(S) {
    return `
    <div class="container header-inner">
      <a href="index.html" class="logo">${esc(S.name)}</a>
      <button class="menu-toggle" aria-label="Open menu" aria-expanded="false"><span></span><span></span></button>
      <nav class="nav">
        ${nav.map((n, k) => `<a href="${n.href}" class="${page === n.key || ((page === "project" || page === "home") && n.key === "work") ? "active" : ""}">${n.label}</a>${k < nav.length - 1 ? '<span class="comma">,</span>' : ""}`).join("")}
      </nav>
    </div>`;
  }

  function footer(S) {
    return `
    <div class="container">
      <section class="cta reveal">
        ${t("p", "site.cta.text", S.cta.text, "cta-text")}
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
        <span class="footer-name">${esc(S.name)}</span>
        <span>© ${new Date().getFullYear()}</span>
      </div>
    </div>`;
  }

  /* ---------- Page bodies ---------- */
  const pages = {
    home(S, P) {
      const html = pages.work(S, P);
      document.title = `${S.name} — ${S.tagline}`;
      return html;
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
        <ul class="list reveal" data-list="site.about.experience" data-new='{"role":"Role — Company","years":"2026"}'>
          ${A.experience.map((e, i) => `<li>${t("span", `site.about.experience.${i}.role`, e.role)}${t("span", `site.about.experience.${i}.years`, e.years, "muted")}</li>`).join("")}
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
          ${t("p", "site.contact.text", S.contact.text, "muted contact-text")}
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
          <div class="section-head"><h2>More works</h2><a href="index.html" class="link">View All</a></div>
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
    toggle.addEventListener("click", () => toggle.setAttribute("aria-expanded", h.classList.toggle("open")));

    let main = document.querySelector("main");
    if (!main) { main = document.createElement("main"); h.after(main); }
    main.innerHTML = (pages[page] || (() => ""))(S, P);

    let f = document.querySelector(".site-footer");
    if (!f) { f = document.createElement("footer"); f.className = "site-footer"; main.after(f); }
    f.innerHTML = footer(S);

    // reveal on scroll
    const els = document.querySelectorAll(".reveal");
    if (io) io.disconnect();
    if ("IntersectionObserver" in window && !window.EDITOR) {
      io = new IntersectionObserver((entries) => {
        entries.forEach((e) => { if (e.isIntersecting) { e.target.classList.add("in"); io.unobserve(e.target); } });
      }, { rootMargin: "0px 0px -8% 0px" });
      els.forEach((el) => io.observe(el));
    } else {
      els.forEach((el) => el.classList.add("in"));
    }
    document.dispatchEvent(new Event("site:rendered"));
    learnShapes();
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
