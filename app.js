(function () {
  "use strict";
  const T = window.TOUR;
  const $ = (id) => document.getElementById(id);
  const els = { tabs: $("tabs"), img: $("planImg"), dots: $("dots"), empty: $("empty"), error: $("error"),
    caption: $("caption"), num: $("captionNum"), name: $("captionName"), pane: $("pane"),
    fs: $("fsBtn"), prev: $("prevBtn"), next: $("nextBtn") };
  let viewer = null, floor = null, current = null;
  const key = (p) => String(p.n);
  const unique = [];
  T.points.forEach((p) => { if (!unique.some((q) => key(q) === key(p))) unique.push(p); });
  const order = unique.slice().sort((a, b) => {
    const na = typeof a.n === "number", nb = typeof b.n === "number";
    if (na !== nb) return na ? -1 : 1;
    return na ? a.n - b.n : String(a.n).localeCompare(String(b.n));
  });
  const find = (n) => unique.find((p) => key(p) === String(n));
  document.title = T.title + " — тур 360°";

  T.floors.forEach((f) => {
    const b = document.createElement("button");
    b.type = "button"; b.className = "tab"; b.textContent = f.title; b.dataset.id = f.id;
    b.setAttribute("role", "tab");
    b.addEventListener("click", () => showFloor(f.id));
    els.tabs.appendChild(b);
  });

  function showFloor(id) {
    floor = id;
    const f = T.floors.find((x) => x.id === id);
    els.tabs.querySelectorAll(".tab").forEach((t) => t.setAttribute("aria-selected", t.dataset.id === id ? "true" : "false"));
    els.img.src = f.image; els.img.alt = "План: " + f.title;
    els.dots.innerHTML = "";
    T.points.filter((p) => p.floor === id).forEach((p) => {
      const d = document.createElement("button");
      d.type = "button";
      d.className = "dot" + (typeof p.n === "number" ? "" : " ext") + (current === key(p) ? " active" : "");
      d.style.left = p.x + "%"; d.style.top = p.y + "%";
      d.textContent = p.label; d.dataset.n = key(p);
      d.title = p.label + ". " + p.name;
      d.setAttribute("aria-label", "Точка " + p.label + ": " + p.name);
      d.addEventListener("click", () => open(key(p)));
      els.dots.appendChild(d);
    });
  }

  function open(n, fromHash) {
    const p = find(n); if (!p) return;
    const onFloor = T.points.some((q) => key(q) === key(p) && q.floor === floor);
    if (!onFloor) showFloor(p.floor);
    current = key(p);
    els.dots.querySelectorAll(".dot").forEach((d) => d.classList.toggle("active", d.dataset.n === current));
    els.empty.hidden = true; els.error.hidden = true;
    els.caption.hidden = false; els.fs.hidden = false; els.prev.hidden = false; els.next.hidden = false;
    els.num.textContent = p.label; els.name.textContent = p.name;
    if (viewer) { viewer.destroy(); viewer = null; }
    viewer = pannellum.viewer("pano", {
      type: "equirectangular", panorama: p.file, autoLoad: true,
      yaw: p.yaw || 0, pitch: 0, hfov: 100, minHfov: 35, maxHfov: 120,
      showFullscreenCtrl: false, showZoomCtrl: true, friction: 0.15,
      strings: { loadingLabel: "Загрузка…", loadButtonLabel: "Открыть панораму", bylineLabel: "",
        fileAccessError: "Файл %s недоступен.", genericWebGLError: "Браузер не поддерживает WebGL.",
        textureSizeError: "Изображение слишком большое для этого устройства.", unknownError: "Не удалось открыть панораму." }
    });
    viewer.on("error", () => showError(p));
    if (!fromHash) history.replaceState(null, "", "#" + p.label);
    if (window.matchMedia("(max-width:860px), (max-aspect-ratio:4/5)").matches && window.scrollY > 40) {
      window.scrollTo({ top: 0, behavior: "smooth" });
    }
  }

  function showError(p) {
    els.error.hidden = false; els.error.innerHTML = "";
    const t = document.createElement("p");
    t.append("Нет файла панорамы для точки " + p.label + ": ");
    const c = document.createElement("code"); c.textContent = p.file; t.appendChild(c);
    t.append(". Положите его в папку panos и опубликуйте сайт заново.");
    els.error.appendChild(t);
    els.pane.querySelectorAll(".pnlm-error-msg").forEach((e) => (e.style.display = "none"));
  }

  function step(dir) {
    const i = order.findIndex((p) => key(p) === current);
    const p = order[(i + dir + order.length) % order.length];
    open(key(p));
  }
  els.prev.addEventListener("click", () => step(-1));
  els.next.addEventListener("click", () => step(1));

  const fsEl = () => document.fullscreenElement || document.webkitFullscreenElement;
  const canFs = !!(document.documentElement.requestFullscreen || document.documentElement.webkitRequestFullscreen);
  els.fs.addEventListener("click", () => {
    if (canFs && !/iPhone|iPod/.test(navigator.userAgent)) {
      if (fsEl()) (document.exitFullscreen || document.webkitExitFullscreen).call(document);
      else (els.pane.requestFullscreen || els.pane.webkitRequestFullscreen).call(els.pane);
    } else {
      els.pane.classList.toggle("pseudo-fs");
      document.body.style.overflow = els.pane.classList.contains("pseudo-fs") ? "hidden" : "";
    }
    setTimeout(() => viewer && viewer.resize(), 120);
  });
  document.addEventListener("fullscreenchange", () => setTimeout(() => viewer && viewer.resize(), 120));
  document.addEventListener("keydown", (e) => {
    if (e.key === "Escape" && els.pane.classList.contains("pseudo-fs")) els.fs.click();
    if (current && (e.key === "ArrowRight" || e.key === "ArrowLeft") && e.altKey) step(e.key === "ArrowRight" ? 1 : -1);
  });
  window.addEventListener("resize", () => viewer && viewer.resize());

  const h = decodeURIComponent(location.hash.slice(1));
  if (h && find(h)) { showFloor(find(h).floor); open(h, true); } else showFloor(T.floors[0].id);
})();
