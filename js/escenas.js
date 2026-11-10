// Pincho Facturación — las pantallas del programa como escenas de vídeo (no hace falta tocar nada aquí)
// Las escenas pasan rápido, con la cámara siempre en movimiento y una transición distinta cada vez,
// para que se vea el aspecto del programa sin poder pararse en los detalles.
// Las imágenes son pequeñas a propósito y se dibujan en un lienzo, no como fotos sueltas de la página.
(function () {
  'use strict';
  var cine = document.querySelector('[data-escenas]');
  if (!cine) return;
  var lienzo = cine.querySelector('.cine-lienzo');
  var ctx = lienzo.getContext && lienzo.getContext('2d');
  if (!ctx) return;
  var quieto = !!(window.matchMedia && window.matchMedia('(prefers-reduced-motion: reduce)').matches);
  var titulo = cine.querySelector('.cine-titulo'), num = cine.querySelector('.cine-num'), texto = cine.querySelector('.cine-texto');
  var barra = cine.querySelector('.cine-progreso'), boton = cine.querySelector('.cine-pausa');
  var pies = Array.prototype.slice.call(cine.querySelectorAll('.cine-pie > div'));

  var FOTOS = {
    factura: 'img/escenas/factura.webp',
    lista: 'img/escenas/lista.webp',
    mant: 'img/escenas/mantenimientos.webp',
    acerca: 'img/escenas/acerca.webp'
  };
  var GRUPOS = ['Una factura, de principio a fin', 'Todas las facturas del año', 'Todas las tablas, igual de fáciles', 'Pincho Facturación'];
  // Cada toma: foto, grupo (título), zoom al empezar y al acabar, y el punto de la foto al que mira la cámara (0 a 1)
  var TOMAS = [
    { foto: 'factura', grupo: 0, z: [1.5, 1.2], c: [[0.2, 0.22], [0.3, 0.3]] },
    { foto: 'factura', grupo: 0, z: [1.0, 1.14], c: [[0.5, 0.5], [0.78, 0.42]] },
    { foto: 'lista', grupo: 1, z: [1.45, 1.2], c: [[0.22, 0.18], [0.4, 0.62]] },
    { foto: 'lista', grupo: 1, z: [1.12, 1.0], c: [[0.7, 0.55], [0.5, 0.5]] },
    { foto: 'mant', grupo: 2, z: [1.0, 1.2], c: [[0.5, 0.5], [0.3, 0.32]] },
    { foto: 'mant', grupo: 2, z: [1.35, 1.15], c: [[0.08, 0.5], [0.2, 0.62]] },
    { foto: 'acerca', grupo: 3, z: [1.22, 1.0], c: [[0.22, 0.4], [0.5, 0.5]] }
  ];
  // Transición con la que se pasa de cada toma a la siguiente
  var EFECTOS = ['barrido', 'persiana', 'mosaico', 'iris', 'barrido', 'persiana', 'mosaico'];
  var DUR = quieto ? 4500 : 2000, TRANS = quieto ? 700 : 620;
  var TOTAL = TOMAS.length * DUR;

  var fotos = {}, W = 1, H = 1, dpr = 1, t = 0, ultimo = 0, pedido = 0, visible = false, enPausa = false, grupo = -1;
  var aux = document.createElement('canvas'), actx = aux.getContext('2d');

  // Barra de progreso: un trocito por toma
  barra.innerHTML = TOMAS.map(function () { return '<i></i>'; }).join('');
  var trozos = Array.prototype.slice.call(barra.children);

  Object.keys(FOTOS).forEach(function (k) {
    var im = new Image();
    im.decoding = 'async';
    im.onload = function () { fotos[k] = im; if (!pedido) pintar(); };
    im.src = FOTOS[k];
  });

  function suave(p) { return p < 0.5 ? 4 * p * p * p : 1 - Math.pow(-2 * p + 2, 3) / 2; }
  function lim(v, a, b) { return Math.max(a, Math.min(b, v)); }

  // Dibuja una toma en el punto p (0 a 1) de su movimiento de cámara
  function dibujar(c, toma, p) {
    var im = fotos[toma.foto];
    if (!im) { c.fillStyle = '#0b1a30'; c.fillRect(0, 0, W, H); return; }
    var e = quieto ? 0.5 : suave(lim(p, 0, 1));
    var z = quieto ? 1 : toma.z[0] + (toma.z[1] - toma.z[0]) * e;
    var cx = quieto ? 0.5 : toma.c[0][0] + (toma.c[1][0] - toma.c[0][0]) * e;
    var cy = quieto ? 0.5 : toma.c[0][1] + (toma.c[1][1] - toma.c[0][1]) * e;
    var s = Math.max(W / im.width, H / im.height) * z, dw = im.width * s, dh = im.height * s;
    var x = lim(W / 2 - cx * dw, W - dw, 0), y = lim(H / 2 - cy * dh, H - dh, 0);
    c.drawImage(im, x, y, dw, dh);
  }

  function transicion(tipo, A, pA, B, pB, k) {
    var e = suave(k), i;
    if (quieto) tipo = 'fundido';
    if (tipo === 'fundido') {
      dibujar(ctx, A, pA);
      ctx.globalAlpha = e; dibujar(ctx, B, pB); ctx.globalAlpha = 1;
    } else if (tipo === 'persiana') {
      // Lamas verticales que giran una tras otra
      dibujar(ctx, A, pA);
      var n = W < 600 ? 6 : 9, ancho = W / n;
      for (i = 0; i < n; i++) {
        var es = suave(lim(k * 1.7 - (i / n) * 0.7, 0, 1));
        if (es <= 0) continue;
        var wl = ancho * es, xl = i * ancho + (ancho - wl) / 2;
        ctx.save(); ctx.beginPath(); ctx.rect(xl, 0, wl + 0.6, H); ctx.clip();
        dibujar(ctx, B, pB);
        ctx.restore();
        if (es < 1) {
          ctx.fillStyle = 'rgba(255,255,255,' + (0.55 * (1 - es)).toFixed(3) + ')';
          ctx.fillRect(xl, 0, 2, H); ctx.fillRect(xl + wl - 2, 0, 2, H);
        }
      }
    } else if (tipo === 'mosaico') {
      // La imagen se deshace en cuadros y la siguiente sale de ellos
      var ida = k < 0.5, fuerza = suave(ida ? k * 2 : (1 - k) * 2);
      var bloque = 1 + Math.round(fuerza * (W < 600 ? 22 : 34));
      var toma = ida ? A : B, p = ida ? pA : pB;
      if (bloque <= 1) { dibujar(ctx, toma, p); return; }
      var sw = Math.max(1, Math.ceil(W / bloque)), sh = Math.max(1, Math.ceil(H / bloque));
      aux.width = sw; aux.height = sh;
      actx.setTransform(sw / W, 0, 0, sh / H, 0, 0);
      dibujar(actx, toma, p);
      ctx.imageSmoothingEnabled = false;
      ctx.drawImage(aux, 0, 0, sw, sh, 0, 0, sw * bloque, sh * bloque);
      ctx.imageSmoothingEnabled = true;
    } else if (tipo === 'barrido') {
      // La cámara da un latigazo de lado, con estela y un destello
      var d = e * W, estela = Math.sin(k * Math.PI);
      ctx.save(); ctx.translate(-d, 0); dibujar(ctx, A, pA); ctx.restore();
      ctx.save(); ctx.translate(W - d, 0); dibujar(ctx, B, pB); ctx.restore();
      ctx.globalAlpha = 0.22 * estela;
      for (i = 1; i <= 3; i++) {
        var o = i * 26 * estela;
        ctx.save(); ctx.translate(-d + o, 0); dibujar(ctx, A, pA); ctx.restore();
        ctx.save(); ctx.translate(W - d + o, 0); dibujar(ctx, B, pB); ctx.restore();
      }
      ctx.globalAlpha = 1;
      ctx.fillStyle = 'rgba(190,220,255,' + (0.28 * estela).toFixed(3) + ')';
      ctx.fillRect(0, 0, W, H);
    } else {
      // Iris: la siguiente se abre en un círculo con un aro naranja
      dibujar(ctx, A, pA);
      var r = e * Math.hypot(W, H) * 0.62, cx = W * 0.5, cy = H * 0.52;
      ctx.save(); ctx.beginPath(); ctx.arc(cx, cy, Math.max(0.1, r), 0, 6.2832); ctx.clip();
      dibujar(ctx, B, pB);
      ctx.restore();
      ctx.strokeStyle = 'rgba(242,159,46,' + (1 - k).toFixed(3) + ')';
      ctx.lineWidth = 5;
      ctx.beginPath(); ctx.arc(cx, cy, Math.max(0.1, r), 0, 6.2832); ctx.stroke();
    }
  }

  function ponerGrupo(g) {
    if (g === grupo) return;
    grupo = g;
    num.textContent = '0' + (g + 1);
    texto.textContent = GRUPOS[g];
    titulo.classList.remove('cambia'); void titulo.offsetWidth; titulo.classList.add('cambia');
    pies.forEach(function (d, i) { d.classList.toggle('activo', i === g); });
  }

  function pintar() {
    ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
    var tt = t % TOTAL, i = Math.floor(tt / DUR), dentro = tt - i * DUR, A = TOMAS[i];
    var pA = (dentro + TRANS) / (DUR + TRANS);
    if (dentro < DUR - TRANS) {
      dibujar(ctx, A, pA);
      ponerGrupo(A.grupo);
    } else {
      var j = (i + 1) % TOMAS.length, B = TOMAS[j], k = (dentro - (DUR - TRANS)) / TRANS;
      transicion(EFECTOS[i], A, pA, B, (dentro - (DUR - TRANS)) / (DUR + TRANS), k);
      ponerGrupo(k < 0.5 ? A.grupo : B.grupo);
    }
    trozos.forEach(function (tr, n) { tr.style.setProperty('--p', n < i ? 1 : n > i ? 0 : (dentro / DUR).toFixed(3)); });
  }

  function cuadro(ahora) {
    pedido = 0;
    if (!visible || enPausa || document.hidden) return;
    if (ultimo) t += Math.min(ahora - ultimo, 100);
    ultimo = ahora;
    pintar();
    pedido = requestAnimationFrame(cuadro);
  }
  function arrancar() {
    if (pedido || enPausa || !visible) return;
    ultimo = 0;
    pedido = requestAnimationFrame(cuadro);
  }

  function medir() {
    var r = lienzo.getBoundingClientRect();
    W = Math.max(1, r.width); H = Math.max(1, r.height);
    // Poca resolución a propósito: se ve el aspecto, no la letra pequeña
    dpr = Math.min(window.devicePixelRatio || 1, 1.25);
    lienzo.width = Math.round(W * dpr); lienzo.height = Math.round(H * dpr);
    pintar();
  }

  boton.addEventListener('click', function () {
    enPausa = !enPausa;
    boton.setAttribute('aria-pressed', enPausa ? 'true' : 'false');
    boton.setAttribute('aria-label', enPausa ? 'Seguir con las escenas' : 'Pausar las escenas');
    if (!enPausa) arrancar();
  });
  // Sin menú de «guardar imagen» sobre el vídeo
  lienzo.addEventListener('contextmenu', function (e) { e.preventDefault(); });

  if ('IntersectionObserver' in window) {
    new IntersectionObserver(function (es) {
      visible = es[0].isIntersecting;
      if (visible) arrancar();
    }, { threshold: 0.15 }).observe(lienzo);
  } else { visible = true; }
  document.addEventListener('visibilitychange', function () { if (!document.hidden) arrancar(); });
  if ('ResizeObserver' in window) new ResizeObserver(medir).observe(lienzo);
  else window.addEventListener('resize', medir);
  medir();
  arrancar();
})();
