/* Chronicles of the Still Lake — cinematic entrance.
   Black → a single ripple crosses the still water → the title resolves →
   dissolves into the site. Plays once per session, skippable, respects
   prefers-reduced-motion. Pure canvas + CSS; no assets to download. */
(function () {
  "use strict";
  try { if (sessionStorage.getItem("cotsl_intro")) return; } catch (e) {}
  var reduce = window.matchMedia && window.matchMedia("(prefers-reduced-motion: reduce)").matches;
  if (reduce) { try { sessionStorage.setItem("cotsl_intro", "1"); } catch (e) {} return; }

  function run() {
    var o = document.createElement("div");
    o.className = "intro";
    o.setAttribute("role", "presentation");
    o.innerHTML =
      '<canvas></canvas>' +
      '<div class="intro-title">' +
        '<span class="series">Chronicles of the Still Lake</span>' +
        '<span class="rule"></span>' +
        '<span class="sub">Bill McKibbin</span>' +
      '</div>' +
      '<button class="intro-skip" type="button" aria-label="Skip intro">Skip</button>';
    document.body.appendChild(o);
    document.body.classList.add("intro-lock");

    var c = o.querySelector("canvas"), ctx = c.getContext("2d");
    var W, H, DPR = Math.min(window.devicePixelRatio || 1, 2);
    function size() { W = c.width = window.innerWidth * DPR; H = c.height = window.innerHeight * DPR; }
    size();
    window.addEventListener("resize", size);

    var start = performance.now();
    var spawns = [0, 430, 900, 1430, 2050];   // staggered ripples (ms)
    var life = 2700;                           // each ripple lifetime (ms)
    function easeOut(p) { return 1 - Math.pow(1 - p, 3); }
    var raf;

    function frame(now) {
      var t = now - start, cx = W * 0.5, cy = H * 0.47, maxR = Math.max(W, H) * 0.64;
      ctx.clearRect(0, 0, W, H);
      for (var i = 0; i < spawns.length; i++) {
        var rt = t - spawns[i];
        if (rt <= 0 || rt >= life) continue;
        var p = rt / life, r = maxR * easeOut(p), a = (1 - p) * 0.5;
        ctx.beginPath();
        ctx.ellipse(cx, cy, r, r * 0.33, 0, 0, Math.PI * 2);
        ctx.strokeStyle = "rgba(205,216,218," + a.toFixed(3) + ")";
        ctx.lineWidth = 1.4 * DPR;
        ctx.stroke();
      }
      // the origin glint, fading as the rings travel out
      var g = 0.75 * (1 - Math.min(t / 2200, 1));
      if (g > 0) {
        ctx.beginPath();
        ctx.arc(cx, cy, 2.6 * DPR, 0, Math.PI * 2);
        ctx.fillStyle = "rgba(238,247,245," + g.toFixed(3) + ")";
        ctx.fill();
      }
      if (t < 3200) raf = requestAnimationFrame(frame);
    }
    raf = requestAnimationFrame(frame);

    var title = o.querySelector(".intro-title");
    var t1 = setTimeout(function () { title.classList.add("in"); }, 1450);

    var done = false, t2;
    function dismiss() {
      if (done) return; done = true;
      clearTimeout(t1); clearTimeout(t2);
      cancelAnimationFrame(raf);
      o.classList.add("hide");
      document.body.classList.remove("intro-lock");
      try { sessionStorage.setItem("cotsl_intro", "1"); } catch (e) {}
      setTimeout(function () { if (o.parentNode) o.parentNode.removeChild(o); }, 1300);
    }
    t2 = setTimeout(dismiss, 4600);
    o.addEventListener("click", dismiss);
    document.addEventListener("keydown", function (e) { if (e.key === "Escape") dismiss(); });
  }

  if (document.readyState === "loading") document.addEventListener("DOMContentLoaded", run);
  else run();
})();
