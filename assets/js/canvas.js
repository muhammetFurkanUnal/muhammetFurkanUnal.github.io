/* ============================================================
   Sonsuz Harita — Pan & Zoom motoru.
   Mouse, trackpad ve dokunmatik destekler. Zoom imlecin altına
   hizalanır (Google Maps tarzı).
   ============================================================ */

(function () {
  "use strict";

  const MIN_SCALE = 0.25;
  const MAX_SCALE = 2.0;
  const WHEEL_ZOOM_FACTOR = 0.0015;
  const KEY_PAN_STEP = 80;
  const KEY_ZOOM_STEP = 0.15;
  const INERTIA_DECAY = 0.92;
  const INERTIA_MIN_VELOCITY = 0.05;

  class MapCanvas {
    constructor(rootEl) {
      this.root = rootEl;
      this.canvas = rootEl.querySelector(".map-canvas");
      this.grid = rootEl.querySelector(".map-grid");

      // İçerik koordinat sistemi. (0,0) = harita merkezi.
      // Bu offset, kanvasın HTML transform değeri.
      this.tx = 0;
      this.ty = 0;
      this.scale = 1;

      this.isPanning = false;
      this.dragStart = null;
      this.lastPointer = null;
      this.velocity = { x: 0, y: 0 };
      this._rafInertia = null;

      this.pinchState = null;

      this.listeners = new Set();

      this._bind();
      this._apply();
    }

    /* ---- Kayıt için public API ---- */
    onChange(fn) { this.listeners.add(fn); return () => this.listeners.delete(fn); }
    getState() { return { tx: this.tx, ty: this.ty, scale: this.scale }; }

    /* ---- Programatik kontrol ---- */
    panBy(dx, dy) {
      this.tx += dx; this.ty += dy;
      this._apply();
    }

    zoomAt(clientX, clientY, factor) {
      const newScale = clamp(this.scale * factor, MIN_SCALE, MAX_SCALE);
      const realFactor = newScale / this.scale;
      const rect = this.root.getBoundingClientRect();
      // İmlecin kanvas üstündeki konumu, ölçek değişince sabit kalsın.
      const cx = clientX - rect.left - rect.width / 2;
      const cy = clientY - rect.top - rect.height / 2;
      this.tx = cx - (cx - this.tx) * realFactor;
      this.ty = cy - (cy - this.ty) * realFactor;
      this.scale = newScale;
      this._apply();
    }

    zoomCentered(factor) {
      const rect = this.root.getBoundingClientRect();
      this.zoomAt(rect.left + rect.width / 2, rect.top + rect.height / 2, factor);
    }

    /**
     * Belirli bir nokta (içerik koordinatı) ekran ortasına gelecek şekilde
     * yumuşak geçişle git. Hedef scale opsiyonel.
     */
    flyTo(x, y, scale, duration = 700) {
      this._cancelInertia();
      const targetScale = scale != null ? clamp(scale, MIN_SCALE, MAX_SCALE) : this.scale;
      // Hedef tx/ty: orijin merkezde olduğundan, kart (x,y) noktasının ekran
      // ortasına gelmesi için tx = -x * scale.
      const targetTx = -x * targetScale;
      const targetTy = -y * targetScale;

      const startTx = this.tx, startTy = this.ty, startScale = this.scale;
      const t0 = performance.now();

      const step = (now) => {
        const t = Math.min(1, (now - t0) / duration);
        const k = easeInOutCubic(t);
        this.tx = startTx + (targetTx - startTx) * k;
        this.ty = startTy + (targetTy - startTy) * k;
        this.scale = startScale + (targetScale - startScale) * k;
        this._apply();
        if (t < 1) requestAnimationFrame(step);
      };
      requestAnimationFrame(step);
    }

    reset() { this.flyTo(0, 0, 1, 600); }

    /* ---- Olay bağlama ---- */
    _bind() {
      const r = this.root;

      r.addEventListener("mousedown", (e) => this._onPointerDown(e));
      window.addEventListener("mousemove", (e) => this._onPointerMove(e));
      window.addEventListener("mouseup", (e) => this._onPointerUp(e));
      r.addEventListener("wheel", (e) => this._onWheel(e), { passive: false });

      r.addEventListener("touchstart", (e) => this._onTouchStart(e), { passive: false });
      r.addEventListener("touchmove", (e) => this._onTouchMove(e), { passive: false });
      r.addEventListener("touchend", (e) => this._onTouchEnd(e));
      r.addEventListener("touchcancel", (e) => this._onTouchEnd(e));

      window.addEventListener("keydown", (e) => this._onKey(e));
      window.addEventListener("resize", () => this._apply());
    }

    /* ---- Pointer (mouse) ---- */
    _onPointerDown(e) {
      // Etkileşimli element üstünde sürükleme başlatma
      if (e.target.closest("a, button")) return;
      if (e.button !== 0) return;
      e.preventDefault();
      this._cancelInertia();
      this.isPanning = true;
      this.root.classList.add("is-panning");
      this.dragStart = { x: e.clientX, y: e.clientY, tx: this.tx, ty: this.ty };
      this.lastPointer = { x: e.clientX, y: e.clientY, t: performance.now() };
      this.velocity = { x: 0, y: 0 };
    }

    _onPointerMove(e) {
      if (!this.isPanning) return;
      const dx = e.clientX - this.dragStart.x;
      const dy = e.clientY - this.dragStart.y;
      this.tx = this.dragStart.tx + dx;
      this.ty = this.dragStart.ty + dy;

      const now = performance.now();
      const dt = Math.max(1, now - this.lastPointer.t);
      this.velocity = {
        x: (e.clientX - this.lastPointer.x) / dt * 16,
        y: (e.clientY - this.lastPointer.y) / dt * 16,
      };
      this.lastPointer = { x: e.clientX, y: e.clientY, t: now };
      this._apply();
    }

    _onPointerUp() {
      if (!this.isPanning) return;
      this.isPanning = false;
      this.root.classList.remove("is-panning");
      this._startInertia();
    }

    _startInertia() {
      const tick = () => {
        const v = this.velocity;
        if (Math.abs(v.x) < INERTIA_MIN_VELOCITY && Math.abs(v.y) < INERTIA_MIN_VELOCITY) {
          this._rafInertia = null;
          return;
        }
        this.tx += v.x;
        this.ty += v.y;
        v.x *= INERTIA_DECAY;
        v.y *= INERTIA_DECAY;
        this._apply();
        this._rafInertia = requestAnimationFrame(tick);
      };
      this._rafInertia = requestAnimationFrame(tick);
    }

    _cancelInertia() {
      if (this._rafInertia) cancelAnimationFrame(this._rafInertia);
      this._rafInertia = null;
      this.velocity = { x: 0, y: 0 };
    }

    /* ---- Wheel / trackpad ----
       Harita-standartı davranış:
       • dikey wheel  → zoom (mouse ve trackpad ortak)
       • yatay swipe  → yatay pan (trackpad iki parmak yan)
       • pinch        → zoom (Mac OS pinch'i ctrlKey ile sinyaller)
       • shift+wheel  → yatay pan (klavye kestirmesi)
    */
    _onWheel(e) {
      e.preventDefault();
      this._cancelInertia();

      // Shift basılıysa dikey delta'yı yatay pan'e çevir
      if (e.shiftKey) {
        this.tx -= (e.deltaX || e.deltaY);
        this._apply();
        return;
      }

      // Yatay baskın hareket = yatay pan (trackpad iki parmak yan kaydırma)
      if (Math.abs(e.deltaX) > Math.abs(e.deltaY)) {
        this.tx -= e.deltaX;
        this._apply();
        return;
      }

      // Pinch (Mac OS): ctrlKey otomatik true, hassas zoom
      // Klasik wheel: normal zoom
      const zoomBoost = (e.ctrlKey || e.metaKey) ? 4 : 1;
      const factor = Math.exp(-e.deltaY * WHEEL_ZOOM_FACTOR * zoomBoost);
      this.zoomAt(e.clientX, e.clientY, factor);
    }

    /* ---- Touch ---- */
    _onTouchStart(e) {
      this._cancelInertia();
      if (e.touches.length === 1) {
        const t = e.touches[0];
        this.isPanning = true;
        this.dragStart = { x: t.clientX, y: t.clientY, tx: this.tx, ty: this.ty };
        this.lastPointer = { x: t.clientX, y: t.clientY, t: performance.now() };
        this.velocity = { x: 0, y: 0 };
      } else if (e.touches.length === 2) {
        this.isPanning = false;
        this.pinchState = this._pinchInfo(e.touches);
        this.pinchState.startScale = this.scale;
      }
    }

    _onTouchMove(e) {
      e.preventDefault();
      if (e.touches.length === 1 && this.isPanning) {
        const t = e.touches[0];
        const dx = t.clientX - this.dragStart.x;
        const dy = t.clientY - this.dragStart.y;
        this.tx = this.dragStart.tx + dx;
        this.ty = this.dragStart.ty + dy;

        const now = performance.now();
        const dt = Math.max(1, now - this.lastPointer.t);
        this.velocity = {
          x: (t.clientX - this.lastPointer.x) / dt * 16,
          y: (t.clientY - this.lastPointer.y) / dt * 16,
        };
        this.lastPointer = { x: t.clientX, y: t.clientY, t: now };
        this._apply();
      } else if (e.touches.length === 2 && this.pinchState) {
        const next = this._pinchInfo(e.touches);
        const factor = next.dist / this.pinchState.dist;
        const targetScale = clamp(this.pinchState.startScale * factor, MIN_SCALE, MAX_SCALE);
        const realFactor = targetScale / this.scale;
        const rect = this.root.getBoundingClientRect();
        const cx = next.cx - rect.left - rect.width / 2;
        const cy = next.cy - rect.top - rect.height / 2;
        this.tx = cx - (cx - this.tx) * realFactor;
        this.ty = cy - (cy - this.ty) * realFactor;
        this.scale = targetScale;
        this._apply();
      }
    }

    _onTouchEnd(e) {
      if (e.touches.length === 0) {
        if (this.isPanning) this._startInertia();
        this.isPanning = false;
        this.pinchState = null;
      } else if (e.touches.length === 1) {
        this.pinchState = null;
        const t = e.touches[0];
        this.isPanning = true;
        this.dragStart = { x: t.clientX, y: t.clientY, tx: this.tx, ty: this.ty };
        this.lastPointer = { x: t.clientX, y: t.clientY, t: performance.now() };
      }
    }

    _pinchInfo(touches) {
      const [a, b] = touches;
      const dx = b.clientX - a.clientX;
      const dy = b.clientY - a.clientY;
      return {
        dist: Math.hypot(dx, dy),
        cx: (a.clientX + b.clientX) / 2,
        cy: (a.clientY + b.clientY) / 2,
      };
    }

    /* ---- Klavye ---- */
    _onKey(e) {
      if (e.target.matches("input, textarea")) return;
      switch (e.key) {
        case "ArrowUp":    this.panBy(0, KEY_PAN_STEP); break;
        case "ArrowDown":  this.panBy(0, -KEY_PAN_STEP); break;
        case "ArrowLeft":  this.panBy(KEY_PAN_STEP, 0); break;
        case "ArrowRight": this.panBy(-KEY_PAN_STEP, 0); break;
        case "+": case "=": this.zoomCentered(1 + KEY_ZOOM_STEP); break;
        case "-": case "_": this.zoomCentered(1 - KEY_ZOOM_STEP); break;
        case "0":          this.reset(); break;
        default: return;
      }
      e.preventDefault();
    }

    /* ---- Transform uygulama ---- */
    _apply() {
      // Kanvas merkezi (0,0). translate(tx,ty) sonra scale.
      this.canvas.style.transform =
        `translate3d(${this.tx}px, ${this.ty}px, 0) scale(${this.scale})`;

      // Grid'i de offsetle, paralaks değil — kanvasla birlikte hareket etsin.
      // Grid arka planı tüm ekrana yayılı, sadece pozisyonu kaydırıyoruz.
      const gx = this.tx % (parseFloat(getComputedStyle(this.root).getPropertyValue("--grid-size")) || 64);
      const gy = this.ty % (parseFloat(getComputedStyle(this.root).getPropertyValue("--grid-size")) || 64);
      if (this.grid) {
        this.grid.style.setProperty("--grid-x", `${gx}px`);
        this.grid.style.setProperty("--grid-y", `${gy}px`);
        // Zoom seviyesine göre grid opaklığı (uzaklaştıkça soluklaşır)
        this.grid.style.opacity = Math.min(1, this.scale);
      }

      this.listeners.forEach((fn) => fn(this.getState()));
    }
  }

  function clamp(v, min, max) { return Math.max(min, Math.min(max, v)); }
  function easeInOutCubic(t) { return t < 0.5 ? 4 * t * t * t : 1 - Math.pow(-2 * t + 2, 3) / 2; }

  window.MapCanvas = MapCanvas;
})();
