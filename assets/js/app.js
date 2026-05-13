/* ============================================================
   Uygulama başlatma — harita kurulumu, UI bağlamaları,
   minimap güncellemesi, bölge navigasyonu.
   ============================================================ */

(function () {
  "use strict";

  document.addEventListener("DOMContentLoaded", () => {
    const mapEl = document.querySelector(".map");
    const map = new window.MapCanvas(mapEl);

    bindTopbar(map);
    bindControls(map);
    bindLegend(map);
    setupMinimap(map);
    setupCards(map);
    showOnboarding();
  });

  /* --- Üst çubuk: tema toggle --- */
  function bindTopbar(map) {
    const toggle = document.querySelector(".theme-toggle");
    if (toggle) toggle.addEventListener("click", () => window.Theme.toggle());

    const home = document.querySelector("[data-action='home']");
    if (home) home.addEventListener("click", () => map.reset());
  }

  /* --- Sağ kontrol paneli --- */
  function bindControls(map) {
    document.querySelectorAll("[data-action]").forEach((btn) => {
      const action = btn.dataset.action;
      btn.addEventListener("click", () => {
        if (action === "zoom-in") map.zoomCentered(1.25);
        else if (action === "zoom-out") map.zoomCentered(0.8);
        else if (action === "home") map.reset();
      });
    });
  }

  /* --- Alt bölge gezgini --- */
  function bindLegend(map) {
    document.querySelectorAll(".legend__btn").forEach((btn) => {
      btn.addEventListener("click", () => {
        const x = parseFloat(btn.dataset.x || 0);
        const y = parseFloat(btn.dataset.y || 0);
        const s = parseFloat(btn.dataset.scale || 1);
        map.flyTo(x, y, s, 800);
        document.querySelectorAll(".legend__btn").forEach((b) => b.dataset.active = "false");
        btn.dataset.active = "true";
      });
    });
  }

  /* --- Minimap: tüm kartları noktalar olarak göster + viewport çerçevesi --- */
  function setupMinimap(map) {
    const minimap = document.querySelector(".minimap__inner");
    if (!minimap) return;

    // Kartların içerik koordinatlarını oku
    const cards = Array.from(document.querySelectorAll(".card, .region-label"));
    if (cards.length === 0) return;

    // Sınırları hesapla
    let minX = Infinity, minY = Infinity, maxX = -Infinity, maxY = -Infinity;
    const points = cards.map((c) => {
      const x = parseFloat(getCustomProp(c, "--x") || "0");
      const y = parseFloat(getCustomProp(c, "--y") || "0");
      minX = Math.min(minX, x); maxX = Math.max(maxX, x);
      minY = Math.min(minY, y); maxY = Math.max(maxY, y);
      return { el: c, x, y };
    });

    // Biraz pay bırak
    const pad = 400;
    minX -= pad; maxX += pad; minY -= pad; maxY += pad;
    const worldW = maxX - minX;
    const worldH = maxY - minY;

    // Noktaları çiz
    points.forEach((p) => {
      const dot = document.createElement("div");
      dot.className = "minimap__dot";
      if (p.el.classList.contains("card--hero")) dot.classList.add("is-hero");
      const rect = minimap.getBoundingClientRect();
      // hesabı update'te yapacağız çünkü minimap boyutu CSS'te
      dot.dataset.x = p.x;
      dot.dataset.y = p.y;
      minimap.appendChild(dot);
    });

    // Viewport çerçevesi
    const vp = document.createElement("div");
    vp.className = "minimap__viewport";
    minimap.appendChild(vp);

    const update = () => {
      const rect = minimap.getBoundingClientRect();
      const sx = rect.width / worldW;
      const sy = rect.height / worldH;
      // Noktaları yeniden konumla
      minimap.querySelectorAll(".minimap__dot").forEach((d) => {
        const x = parseFloat(d.dataset.x);
        const y = parseFloat(d.dataset.y);
        d.style.left = `${(x - minX) * sx}px`;
        d.style.top = `${(y - minY) * sy}px`;
      });
      // Viewport
      const s = map.getState();
      const viewWworld = window.innerWidth / s.scale;
      const viewHworld = window.innerHeight / s.scale;
      const viewCenterX = -s.tx / s.scale;
      const viewCenterY = -s.ty / s.scale;
      vp.style.left = `${(viewCenterX - viewWworld / 2 - minX) * sx}px`;
      vp.style.top = `${(viewCenterY - viewHworld / 2 - minY) * sy}px`;
      vp.style.width = `${viewWworld * sx}px`;
      vp.style.height = `${viewHworld * sy}px`;
    };

    map.onChange(update);
    window.addEventListener("resize", update);
    update();
  }

  /* --- Kartlara çift tık ile odaklan --- */
  function setupCards(map) {
    document.querySelectorAll(".card").forEach((card) => {
      card.addEventListener("dblclick", (e) => {
        e.preventDefault();
        const x = parseFloat(getCustomProp(card, "--x") || "0");
        const y = parseFloat(getCustomProp(card, "--y") || "0");
        map.flyTo(x, y, 1.15, 600);
      });
    });
  }

  /* --- İlk açılışta ipucu göster --- */
  function showOnboarding() {
    const hint = document.querySelector(".hint");
    if (!hint) return;
    hint.classList.add("is-visible");
    let hidden = false;
    const hide = () => {
      if (hidden) return;
      hidden = true;
      hint.classList.remove("is-visible");
    };
    setTimeout(hide, 4500);
    window.addEventListener("wheel", hide, { once: true });
    window.addEventListener("mousedown", hide, { once: true });
    window.addEventListener("touchstart", hide, { once: true });
  }

  function getCustomProp(el, name) {
    return getComputedStyle(el).getPropertyValue(name).trim();
  }
})();
