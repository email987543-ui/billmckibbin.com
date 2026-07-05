/* Chronicles of the Still Lake — cinematic entrance.
   A ripple spreads across the real reflected water (WebGL displacement of a
   photographic night-lake surface), the title resolves out of it, then it
   dissolves into the site. Once per session, skippable, respects
   prefers-reduced-motion. Falls back gracefully without WebGL. */
(function () {
  "use strict";
  try { if (sessionStorage.getItem("cotsl_intro")) return; } catch (e) {}
  var reduce = window.matchMedia && window.matchMedia("(prefers-reduced-motion: reduce)").matches;
  if (reduce) { try { sessionStorage.setItem("cotsl_intro", "1"); } catch (e) {} return; }

  var FRAG = [
    "precision highp float;",
    "uniform sampler2D u_tex;",
    "uniform vec2 u_res;",
    "uniform float u_time;",
    "void main(){",
    "  vec2 uv = gl_FragCoord.xy / u_res;",
    "  float sA = u_res.x / u_res.y;",
    "  vec2 uvC = (sA >= 1.0) ? vec2(uv.x, (uv.y-0.5)/sA + 0.5)",
    "                         : vec2((uv.x-0.5)*sA + 0.5, uv.y);",
    "  vec2 d = (uv - vec2(0.5)) * vec2(sA, 1.0);",
    "  float dist = length(d);",
    "  vec2 dir = dist > 0.0001 ? d/dist : vec2(0.0);",
    "  float disp = 0.0;",
    "  for(int i=0;i<3;i++){",
    "    float tt = u_time - float(i)*0.62;",
    "    if(tt <= 0.0) continue;",
    "    float radius = tt*0.33;",
    "    float band = exp(-pow((dist-radius)/0.075, 2.0));",
    "    float decay = exp(-tt*0.48);",
    "    disp += sin((dist - radius)*52.0) * band * decay;",
    "  }",
    "  vec2 off = dir * disp * 0.020;",
    "  vec3 col = texture2D(u_tex, uvC - off).rgb;",
    "  col += vec3(0.55,0.60,0.63) * abs(disp) * 0.13;",
    "  col *= smoothstep(1.18, 0.12, dist);",
    "  col *= 0.9;",
    "  gl_FragColor = vec4(col, 1.0);",
    "}"
  ].join("\n");
  var VERT = "attribute vec2 p; void main(){ gl_Position = vec4(p, 0.0, 1.0); }";

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

    var canvas = o.querySelector("canvas");
    var title = o.querySelector(".intro-title");
    var done = false, t1, t2, raf;

    function dismiss() {
      if (done) return; done = true;
      clearTimeout(t1); clearTimeout(t2); cancelAnimationFrame(raf);
      o.classList.add("hide");
      document.body.classList.remove("intro-lock");
      try { sessionStorage.setItem("cotsl_intro", "1"); } catch (e) {}
      setTimeout(function () { if (o.parentNode) o.parentNode.removeChild(o); }, 1300);
    }
    o.addEventListener("click", dismiss);
    document.addEventListener("keydown", function (e) { if (e.key === "Escape") dismiss(); });

    var gl = null;
    try { gl = canvas.getContext("webgl") || canvas.getContext("experimental-webgl"); } catch (e) {}

    var img = new Image();
    img.onload = function () {
      var started = gl && startGL();
      if (started) {
        t1 = setTimeout(function () { title.classList.add("in"); }, 1800);
        t2 = setTimeout(dismiss, 5600);
      } else {
        o.style.background = "#04070b url(" + img.src + ") center/cover no-repeat";
        t1 = setTimeout(function () { title.classList.add("in"); }, 1200);
        t2 = setTimeout(dismiss, 4600);
      }
    };
    img.onerror = function () {
      t1 = setTimeout(function () { title.classList.add("in"); }, 1000);
      t2 = setTimeout(dismiss, 4200);
    };
    img.src = "/assets/intro-water.jpg";

    function compile(type, src) {
      var s = gl.createShader(type); gl.shaderSource(s, src); gl.compileShader(s);
      if (!gl.getShaderParameter(s, gl.COMPILE_STATUS)) { console.error("intro shader:", gl.getShaderInfoLog(s)); return null; }
      return s;
    }

    function startGL() {
      var vs = compile(gl.VERTEX_SHADER, VERT), fs = compile(gl.FRAGMENT_SHADER, FRAG);
      if (!vs || !fs) return false;
      var prog = gl.createProgram();
      gl.attachShader(prog, vs); gl.attachShader(prog, fs); gl.linkProgram(prog);
      if (!gl.getProgramParameter(prog, gl.LINK_STATUS)) { console.error("intro link:", gl.getProgramInfoLog(prog)); return false; }
      gl.useProgram(prog);

      var buf = gl.createBuffer();
      gl.bindBuffer(gl.ARRAY_BUFFER, buf);
      gl.bufferData(gl.ARRAY_BUFFER, new Float32Array([-1,-1, 1,-1, -1,1, -1,1, 1,-1, 1,1]), gl.STATIC_DRAW);
      var loc = gl.getAttribLocation(prog, "p");
      gl.enableVertexAttribArray(loc);
      gl.vertexAttribPointer(loc, 2, gl.FLOAT, false, 0, 0);

      var tex = gl.createTexture();
      gl.bindTexture(gl.TEXTURE_2D, tex);
      gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_S, gl.CLAMP_TO_EDGE);
      gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_T, gl.CLAMP_TO_EDGE);
      gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MIN_FILTER, gl.LINEAR);
      gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MAG_FILTER, gl.LINEAR);
      gl.pixelStorei(gl.UNPACK_FLIP_Y_WEBGL, true);
      gl.texImage2D(gl.TEXTURE_2D, 0, gl.RGB, gl.RGB, gl.UNSIGNED_BYTE, img);

      var uRes = gl.getUniformLocation(prog, "u_res");
      var uTime = gl.getUniformLocation(prog, "u_time");
      gl.uniform1i(gl.getUniformLocation(prog, "u_tex"), 0);

      var DPR = Math.min(window.devicePixelRatio || 1, 2);
      function resize() { canvas.width = window.innerWidth * DPR; canvas.height = window.innerHeight * DPR; gl.viewport(0, 0, canvas.width, canvas.height); }
      resize(); window.addEventListener("resize", resize);

      var start = performance.now();
      function frame(now) {
        var t = (now - start) / 1000;
        gl.uniform2f(uRes, canvas.width, canvas.height);
        gl.uniform1f(uTime, t);
        gl.drawArrays(gl.TRIANGLES, 0, 6);
        if (t < 7.5 && !done) raf = requestAnimationFrame(frame);
      }
      raf = requestAnimationFrame(frame);
      return true;
    }
  }

  if (document.readyState === "loading") document.addEventListener("DOMContentLoaded", run);
  else run();
})();
