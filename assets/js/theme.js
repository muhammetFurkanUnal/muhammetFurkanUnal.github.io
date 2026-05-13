/* ============================================================
   Tema yönetimi — light / dark / system.
   Tercih localStorage'da saklanır.
   ============================================================ */

(function () {
  "use strict";

  const KEY = "mfu-theme";
  const root = document.documentElement;

  function getStored() {
    try { return localStorage.getItem(KEY); } catch { return null; }
  }
  function setStored(v) {
    try { localStorage.setItem(KEY, v); } catch {}
  }

  function systemPrefersDark() {
    return window.matchMedia && window.matchMedia("(prefers-color-scheme: dark)").matches;
  }

  function resolve(theme) {
    if (theme === "dark" || theme === "light") return theme;
    return systemPrefersDark() ? "dark" : "light";
  }

  function apply(theme) {
    root.setAttribute("data-theme", resolve(theme));
  }

  // İlk yükleme — flicker olmasın diye head'de erken çağrılıyor.
  const initial = getStored() || "system";
  apply(initial);

  // Sistem teması değişirse, kullanıcı "system" seçtiyse uygula
  if (window.matchMedia) {
    window.matchMedia("(prefers-color-scheme: dark)").addEventListener("change", () => {
      if ((getStored() || "system") === "system") apply("system");
    });
  }

  window.Theme = {
    current() { return getStored() || "system"; },
    resolved() { return root.getAttribute("data-theme"); },
    set(v) { setStored(v); apply(v); },
    toggle() {
      const next = this.resolved() === "dark" ? "light" : "dark";
      this.set(next);
      return next;
    },
  };
})();
