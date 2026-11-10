// Pincho Facturación — lo que se mueve en la página (no hace falta tocar nada aquí)
// · El fondo en movimiento del programa (el mismo dibujo que FondoAnimado.cs de Pincho.Shell)
// · La pantalla de Inicio en directo: reloj, saludo, tarjetas que cuentan, gráfico y listas
// · Detalles que se animan al llegar a la vista: el total de funciones, el QR de VERI*FACTU y los pasos
// Quien tenga pedido «reducir movimiento» en su ordenador ve todo quieto.
(function () {
  'use strict';
  var quieto = !!(window.matchMedia && window.matchMedia('(prefers-reduced-motion: reduce)').matches);
  var hayIO = 'IntersectionObserver' in window;

  // ---------- Utilidades ----------
  function mezcla(a, b, p) { return [0, 1, 2].map(function (i) { return Math.round(a[i] + (b[i] - a[i]) * p); }); }
  function rgba(c, a) { return 'rgba(' + c[0] + ',' + c[1] + ',' + c[2] + ',' + a + ')'; }
  // Números como los enseña el programa: 7.254,35 (con punto de miles también en los de cuatro cifras)
  function num(v, dec) {
    var s = Math.abs(v).toFixed(dec).split('.');
    return (v < 0 ? '-' : '') + s[0].replace(/\B(?=(\d{3})+(?!\d))/g, '.') + (dec ? ',' + s[1] : '');
  }
  function eur(v) { return num(v, 2) + ' €'; }
  function dos(n) { return (n < 10 ? '0' : '') + n; }
  function alVerUnaVez(el, fn, umbral) {
    if (!hayIO) { fn(); return; }
    var io = new IntersectionObserver(function (es) {
      if (es[0].isIntersecting) { io.disconnect(); fn(); }
    }, { threshold: umbral || 0.25 });
    io.observe(el);
  }
  function contar(el, hasta, dec, suf, desdeCero) {
    var desde = desdeCero ? 0 : (el._v || 0);
    el._v = hasta;
    if (el._raf) cancelAnimationFrame(el._raf);
    if (quieto) { el.textContent = num(hasta, dec) + suf; return; }
    var t0 = performance.now(), dur = 1200;
    (function paso(ahora) {
      var p = Math.min(1, Math.max(0, (ahora - t0) / dur)), e = 1 - Math.pow(1 - p, 3);
      el.textContent = num(desde + (hasta - desde) * e, dec) + suf;
      if (p < 1) el._raf = requestAnimationFrame(paso);
    })(t0);
  }

  // ---------- El fondo en movimiento del programa ----------
  // Degradado oscuro del azul de la marca, tres luces que orbitan despacio, dos corrientes onduladas abajo y motas que suben.
  var MARCA = [56, 140, 235], NEGRO = [0, 0, 0], BLANCO = [255, 255, 255], AMBAR = [242, 163, 58];
  var OSCURO = mezcla(NEGRO, MARCA, 0.16), TINTE = mezcla(NEGRO, MARCA, 0.46), FRIA = mezcla(MARCA, BLANCO, 0.25);
  var FONDOS = {
    // Como en la ventana del programa: arriba a la izquierda, abajo a la izquierda y a lo largo de la barra de arriba
    programa: {
      luces: [
        { c: MARCA, alfa: 150, r: 240, fx: 0.21, fy: 0.17, d: 0.0, cx: 0.10, cy: 0.06, ax: 90, ay: 50 },
        { c: FRIA, alfa: 120, r: 260, fx: 0.15, fy: 0.23, d: 2.1, cx: 0.06, cy: 0.88, ax: 80, ay: 60 },
        { c: AMBAR, alfa: 45, r: 170, fx: 0.27, fy: 0.19, d: 4.0, cx: 0.45, cy: 0.02, ax: 260, ay: 30 }
      ],
      motas: 56
    },
    contacto: {
      luces: [
        { c: MARCA, alfa: 140, r: 300, fx: 0.21, fy: 0.17, d: 0.0, cx: 0.12, cy: 0.18, ax: 120, ay: 60 },
        { c: FRIA, alfa: 90, r: 320, fx: 0.15, fy: 0.23, d: 2.1, cx: 0.88, cy: 0.82, ax: 110, ay: 60 },
        { c: AMBAR, alfa: 40, r: 220, fx: 0.27, fy: 0.19, d: 4.0, cx: 0.55, cy: 0.06, ax: 320, ay: 30 }
      ],
      motas: 48
    },
    // Detrás de toda la página: las luces se reparten por la pantalla, se mueven un poco al bajar
    // y una de ellas sigue al ratón con calma
    pagina: {
      luces: [
        { c: MARCA, alfa: 150, r: 340, fx: 0.21, fy: 0.17, d: 0.0, cx: 0.14, cy: 0.16, ax: 140, ay: 70 },
        { c: FRIA, alfa: 95, r: 380, fx: 0.15, fy: 0.23, d: 2.1, cx: 0.86, cy: 0.78, ax: 130, ay: 70 },
        { c: AMBAR, alfa: 42, r: 260, fx: 0.27, fy: 0.19, d: 4.0, cx: 0.55, cy: 0.05, ax: 360, ay: 40 }
      ],
      motas: 70, relativo: true, dprMax: 1, raton: true, scroll: true
    }
  };
  var ONDAS = [
    // color, altura (0-1), amplitud, velocidad, longitud, fase, opacidad del relleno y de la línea (0-255)
    [MARCA, 0.90, 14, 0.55, 1.6, 0.0, 16, 70],
    [BLANCO, 0.95, 9, -0.40, 1.1, 1.7, 10, 34]
  ];

  function FondoVivo(canvas, ajustes) {
    var ctx = canvas.getContext && canvas.getContext('2d');
    if (!ctx) return;
    var luces = ajustes.luces, motas = ajustes.motas, nMotas = motas;
    var w = 0, h = 0, dpr = 1, t = 8, ultimo = 0, visible = !hayIO, pedido = 0, degradado = null, esc = 1;
    // Luz que sigue al ratón (solo en el fondo de la página) y desplazamiento al bajar
    var raton = null, luzRaton = null, bajado = 0;
    if (ajustes.raton && window.matchMedia && window.matchMedia('(pointer: fine)').matches) {
      window.addEventListener('pointermove', function (e) { raton = [e.clientX, e.clientY]; if (!luzRaton) luzRaton = raton.slice(); }, { passive: true });
    }
    if (ajustes.scroll) window.addEventListener('scroll', function () { bajado = window.scrollY || 0; if (quieto) pintar(); }, { passive: true });

    function medir() {
      var r = canvas.getBoundingClientRect();
      w = Math.max(1, Math.round(r.width));
      h = Math.max(1, Math.round(r.height));
      dpr = Math.min(window.devicePixelRatio || 1, ajustes.dprMax || (w > 900 ? 1.5 : 2));
      esc = ajustes.relativo ? Math.max(0.75, Math.max(w, h) / 1300) : 1;
      nMotas = ajustes.relativo && w < 700 ? Math.round(motas * 0.6) : motas;
      canvas.width = Math.round(w * dpr);
      canvas.height = Math.round(h * dpr);
      // Degradado a 35 grados, del tinte al oscuro (como el LinearGradientBrush del programa)
      var ang = 35 * Math.PI / 180, dx = Math.cos(ang), dy = Math.sin(ang), lon = (Math.abs(w * dx) + Math.abs(h * dy)) / 2;
      degradado = ctx.createLinearGradient(w / 2 - dx * lon, h / 2 - dy * lon, w / 2 + dx * lon, h / 2 + dy * lon);
      degradado.addColorStop(0, rgba(TINTE, 1));
      degradado.addColorStop(1, rgba(OSCURO, 1));
      pintar();
    }

    function pintar() {
      var s = t, i;
      ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
      ctx.globalCompositeOperation = 'source-over';
      ctx.fillStyle = degradado;
      ctx.fillRect(0, 0, w, h);

      var giro = ajustes.scroll ? bajado / 700 : 0;
      function luz(c, alfa, r, x, y) {
        var g = ctx.createRadialGradient(x, y, 0, x, y, r);
        g.addColorStop(0, rgba(c, (alfa / 255).toFixed(3)));
        g.addColorStop(1, rgba(c, 0));
        ctx.fillStyle = g;
        ctx.fillRect(x - r, y - r, r * 2, r * 2);
      }
      for (i = 0; i < luces.length; i++) {
        var l = luces[i], r = l.r * esc;
        var x = w * l.cx + l.ax * esc * Math.sin(s * l.fx + l.d) + (giro ? Math.sin(giro + i * 2.1) * w * 0.12 : 0);
        var y = h * l.cy + l.ay * esc * Math.cos(s * l.fy + l.d * 1.3) + (giro ? Math.cos(giro * 0.8 + i * 1.7) * h * 0.1 : 0);
        luz(l.c, l.alfa, r, x, y);
      }
      if (luzRaton) {
        luzRaton[0] += (raton[0] - luzRaton[0]) * 0.06;
        luzRaton[1] += (raton[1] - luzRaton[1]) * 0.06;
        luz(FRIA, 70, 230 * esc, luzRaton[0], luzRaton[1]);
      }

      for (i = 0; i < ONDAS.length; i++) {
        var o = ONDAS[i], puntos = [];
        for (var px = -8; px <= w + 8; px += 8) {
          var u = px / 100;
          var yy = Math.sin(u / o[4] * 2 + s * o[3] + o[5] + giro * 3) * 0.7 + Math.sin(u / o[4] * 3.7 - s * o[3] * 0.6 + o[5] * 2) * 0.3;
          puntos.push(px, h * o[1] + yy * o[2]);
        }
        ctx.beginPath();
        ctx.moveTo(puntos[0], puntos[1]);
        for (var k = 2; k < puntos.length; k += 2) ctx.lineTo(puntos[k], puntos[k + 1]);
        ctx.lineTo(w + 8, h + 1); ctx.lineTo(-8, h + 1); ctx.closePath();
        ctx.fillStyle = rgba(o[0], (o[6] / 255).toFixed(3));
        ctx.fill();
        ctx.beginPath();
        ctx.moveTo(puntos[0], puntos[1]);
        for (k = 2; k < puntos.length; k += 2) ctx.lineTo(puntos[k], puntos[k + 1]);
        ctx.strokeStyle = rgba(o[0], (o[7] / 255).toFixed(3));
        ctx.lineWidth = 1.5;
        ctx.stroke();
      }

      // Motas: suben despacio balanceándose y se desvanecen
      for (i = 0; i < nMotas; i++) {
        var vel = 0.035 + (i * 37 % 11) / 220, av = (s * vel + i * 0.137) % 1;
        var mx = w * ((i * 0.618034) % 1) + 10 * Math.sin(s * 0.9 + i), my = h - av * h;
        var tam = (1.5 + i % 4 * 0.9) * 1.15, al = Math.sin(av * Math.PI) * (i % 3 === 0 ? 110 : 70) / 255;
        ctx.fillStyle = rgba(i % 3 === 0 ? MARCA : BLANCO, Math.max(0, al).toFixed(3));
        ctx.beginPath();
        ctx.arc(mx, my, tam / 2, 0, 6.2832);
        ctx.fill();
      }
    }

    function cuadro(ahora) {
      pedido = 0;
      if (!visible || document.hidden) return;
      if (!ultimo) ultimo = ahora;
      var dt = (ahora - ultimo) / 1000;
      if (dt >= 1 / 30) { t += Math.min(dt, 0.25); ultimo = ahora; pintar(); }
      pedido = requestAnimationFrame(cuadro);
    }
    function arrancar() {
      if (quieto || pedido) return;
      ultimo = 0;
      pedido = requestAnimationFrame(cuadro);
    }
    if (hayIO) {
      new IntersectionObserver(function (es) {
        visible = es[0].isIntersecting;
        if (visible) arrancar();
      }).observe(canvas);
    }
    document.addEventListener('visibilitychange', function () { if (!document.hidden && visible) arrancar(); });
    if ('ResizeObserver' in window) new ResizeObserver(function () { medir(); }).observe(canvas);
    else window.addEventListener('resize', medir);
    medir();
    arrancar();
  }

  Array.prototype.forEach.call(document.querySelectorAll('canvas.fondo-vivo'), function (c) {
    FondoVivo(c, FONDOS[c.getAttribute('data-fondo')] || FONDOS.programa);
  });

  // ---------- Portada: titular palabra a palabra, palabras que cambian y logo que se inclina ----------
  var titular = document.querySelector('[data-palabras]');
  if (titular && !quieto) {
    titular.setAttribute('aria-label', titular.textContent);
    titular.innerHTML = titular.textContent.trim().split(/\s+/).map(function (p, i) {
      return '<span class="palabra" aria-hidden="true"><span style="--i:' + i + '">' + p + '</span></span>';
    }).join(' ');
  }
  var rotar = document.querySelector('[data-rotar]');
  if (rotar && !quieto) {
    var palabras = rotar.getAttribute('data-rotar').split('|'), nPal = 0;
    var letras = function (p) {
      return p.split('').map(function (c, i) { return '<i style="--l:' + i + '">' + (c === ' ' ? '&nbsp;' : c) + '</i>'; }).join('');
    };
    rotar.innerHTML = letras(palabras[0]);
    setTimeout(function cambiar() {
      if (!document.hidden) {
        rotar.className = 'sale';
        setTimeout(function () {
          nPal = (nPal + 1) % palabras.length;
          rotar.innerHTML = letras(palabras[nPal]);
          rotar.className = 'entra';
        }, 300 + palabras[nPal].length * 20);
      }
      setTimeout(cambiar, 2300);
    }, 3200);
  }
  var logo = document.querySelector('[data-logo]');
  if (logo) {
    // Al pulsarlo da una vuelta
    logo.addEventListener('click', function () {
      if (quieto) return;
      logo.classList.remove('gira'); void logo.offsetWidth; logo.classList.add('gira');
    });
    logo.addEventListener('animationend', function (e) { if (e.animationName === 'logo-gira') logo.classList.remove('gira'); });
    // Con el ratón se inclina hacia él, como una moneda que se mira de lado
    if (!quieto && window.matchMedia && window.matchMedia('(pointer: fine)').matches) {
      var portada = document.querySelector('.portada') || document.body;
      portada.addEventListener('pointermove', function (e) {
        var r = logo.getBoundingClientRect();
        var dx = (e.clientX - (r.left + r.width / 2)) / window.innerWidth, dy = (e.clientY - (r.top + r.height / 2)) / window.innerHeight;
        logo.style.transform = 'perspective(900px) rotateY(' + (dx * 28).toFixed(2) + 'deg) rotateX(' + (-dy * 22).toFixed(2) + 'deg)';
      });
      portada.addEventListener('pointerleave', function () { logo.style.transform = ''; });
    }
  }

  // ---------- La pantalla de Inicio en directo ----------
  var app = document.getElementById('app');
  if (app) iniciarPantalla(app);

  function iniciarPantalla(app) {
    var $ = function (s) { return app.querySelector(s); };
    var $$ = function (s) { return Array.prototype.slice.call(app.querySelectorAll(s)); };
    var MESES = ['ene', 'feb', 'mar', 'abr', 'may', 'jun', 'jul', 'ago', 'sept', 'oct', 'nov', 'dic'];
    var MESES_LARGOS = ['enero', 'febrero', 'marzo', 'abril', 'mayo', 'junio', 'julio', 'agosto', 'septiembre', 'octubre', 'noviembre', 'diciembre'];
    var DIAS = ['domingo', 'lunes', 'martes', 'miércoles', 'jueves', 'viernes', 'sábado'];

    // Datos de ejemplo, siempre «a día de hoy»: el año anterior completo y este año hasta hoy
    var hoy = new Date(), anio = hoy.getFullYear(), mes = hoy.getMonth(), dia = hoy.getDate();
    var parte = dia / new Date(anio, mes + 1, 0).getDate();
    var r2 = function (v) { return Math.round(v * 100) / 100; };
    var BASE = [15230.40, 16840.15, 19120.80, 17650.35, 20310.60, 21480.25, 18900.70, 12360.10, 19870.45, 21140.90, 20050.30, 22780.65];
    var CRECE = [1.111, 1.075, 1.116, 1.104, 1.121, 1.078, 1.092, 1.131, 1.094, 1.108, 1.112, 1.097];
    var anterior = BASE.slice();
    var actual = BASE.map(function (v, m) { return m < mes ? r2(v * CRECE[m]) : m === mes ? r2(v * CRECE[m] * parte) : 0; });
    var suma = function (a, n) { var s = 0; for (var i = 0; i < n; i++) s += a[i]; return s; };
    var datos = {
      mes: actual[mes], mesAnt: r2(anterior[mes] * parte),
      ano: r2(suma(actual, mes + 1)), anoAnt: r2(suma(anterior, mes) + anterior[mes] * parte)
    };
    var VENCIDOS = [
      ['Reformas Palmeral S. L.', 112, 1245.60], ['Talleres Mediterráneo', 96, 860.00], ['Cristalería del Centro', 64, 432.30],
      ['Electro Hogar Sur', 38, 718.40], ['Panadería La Espiga', 21, 389.90], ['Asesoría Romero y Asociados', 12, 666.40]
    ];
    var MEJORES = [
      ['Distribuciones Levante S. L.', 34, 13.7], ['Reformas Palmeral S. L.', 22, 9.3], ['Talleres Mediterráneo', 41, 8.6],
      ['Electro Hogar Sur', 17, 6.9], ['Cristalería del Centro', 12, 5.8], ['Panadería La Espiga', 48, 4.4]
    ];
    var conIva = false, tipo = 'barras', visto = false;

    $$('[data-anio]').forEach(function (e) { e.textContent = anio; });
    $$('[data-anio-ant]').forEach(function (e) { e.textContent = anio - 1; });

    // Saludo, fecha y hora (como SaludoConReloj del programa)
    function reloj() {
      var a = new Date(), h = a.getHours();
      $('[data-saludo]').textContent = h < 14 ? 'Buenos días' : h < 21 ? 'Buenas tardes' : 'Buenas noches';
      $('[data-fecha]').textContent = DIAS[a.getDay()] + ', ' + a.getDate() + ' de ' + MESES_LARGOS[a.getMonth()] + ' de ' + a.getFullYear();
      $('[data-hora]').textContent = dos(h) + ':' + dos(a.getMinutes());
    }
    reloj();
    setInterval(reloj, 10000);

    // El refrán del día, que va cambiando (y con sus flechas, como en el programa)
    var REFRANES = ['Cuentas claras, amistades largas', 'A quien madruga, Dios le ayuda', 'Poco a poco se va lejos',
      'Más vale prevenir que curar', 'No dejes para mañana lo que puedas hacer hoy', 'Quien guarda, halla', 'El tiempo es oro'];
    var nRefran = hoy.getDate() % REFRANES.length, textoRefran = $('[data-refran-texto]'), relojRefran;
    function ponerRefran(paso) {
      nRefran = (nRefran + paso + REFRANES.length) % REFRANES.length;
      if (quieto) { textoRefran.textContent = '«' + REFRANES[nRefran] + '»'; return; }
      textoRefran.classList.add('cambiando');
      setTimeout(function () { textoRefran.textContent = '«' + REFRANES[nRefran] + '»'; textoRefran.classList.remove('cambiando'); }, 250);
    }
    textoRefran.textContent = '«' + REFRANES[nRefran] + '»';
    $$('[data-refran]').forEach(function (b) {
      b.addEventListener('click', function () { ponerRefran(+b.getAttribute('data-refran')); clearInterval(relojRefran); relojRefran = setInterval(function () { ponerRefran(1); }, 9000); });
    });
    if (!quieto) relojRefran = setInterval(function () { ponerRefran(1); }, 9000);

    // Tarjetas
    function variacion(a, b) { var p = (a / b - 1) * 100; return { texto: (p >= 0 ? '▲ +' : '▼ ') + num(p, 1) + ' %', bien: p >= 0 }; }
    function tarjetas(desdeCero) {
      var iva = conIva ? 'con IVA' : 'sin IVA', k = conIva ? 1.21 : 1;
      $('[data-titulo="mes"]').textContent = 'Facturado en ' + MESES_LARGOS[mes] + ' · ' + iva;
      $('[data-titulo="ano"]').textContent = 'Facturado en ' + anio + ' · ' + iva;
      $('[data-titulo="grafico"]').textContent = 'Facturado por meses (' + iva + ')';
      var vm = variacion(datos.mes, datos.mesAnt), va = variacion(datos.ano, datos.anoAnt);
      var dm = $('[data-detalle="mes"]'), da = $('[data-detalle="ano"]');
      dm.textContent = num(Math.max(1, Math.round(datos.mes / 806)), 0) + ' facturas · ' + vm.texto + ' sobre 1-' + dia + ' ' + MESES[mes] + ' ' + (anio - 1) + ' (' + eur(datos.mesAnt * k) + ')';
      da.textContent = num(Math.round(datos.ano / 832), 0) + ' facturas · ' + va.texto + ' sobre ' + (anio - 1) + ' a la misma fecha (' + eur(datos.anoAnt * k) + ')';
      dm.className = 't-detalle ' + (vm.bien ? 'bien' : 'mal');
      da.className = 't-detalle ' + (va.bien ? 'bien' : 'mal');
      contar($('[data-valor="mes"]'), datos.mes * k, 2, ' €', desdeCero);
      contar($('[data-valor="ano"]'), datos.ano * k, 2, ' €', desdeCero);
      $('[data-detalle="albaranes"]').textContent = eur(2140 * k) + ' · ' + iva;
      $('[data-detalle="compras"]').textContent = '14 documentos · ' + eur(3512.90) + ' el mismo mes de ' + (anio - 1);
      if (desdeCero) {
        contar($('[data-valor="pendiente"]'), 31245.80, 2, ' €', true);
        contar($('[data-valor="borradores"]'), 3, 0, '', true);
        contar($('[data-valor="albaranes"]'), 5, 0, '', true);
        contar($('[data-valor="compras"]'), 3870.25, 2, ' €', true);
      }
    }

    // Gráfico: el año anterior en gris y el actual en azul; barras, líneas o áreas (como TipoGrafico del programa)
    var svg = $('.grafico-svg'), NS = 'http://www.w3.org/2000/svg';
    function nodo(nombre, attrs, padre, texto) {
      var e = document.createElementNS(NS, nombre);
      for (var a in attrs) e.setAttribute(a, attrs[a]);
      if (texto != null) e.textContent = texto;
      if (padre) padre.appendChild(e);
      return e;
    }
    function grafico(animar) {
      var W = svg.clientWidth, H = svg.clientHeight;
      if (!W || !H) return;
      while (svg.firstChild) svg.removeChild(svg.firstChild);
      svg.setAttribute('viewBox', '0 0 ' + W + ' ' + H);
      svg.setAttribute('class', 'grafico-svg' + (animar && !quieto ? ' animar' : ''));
      var k = conIva ? 1.21 : 1;
      var series = [[anterior, 's-ant', anio - 1], [actual, 's-act', anio]];
      var apiladas = tipo === 'apiladas';
      var maximo = (apiladas ? Math.max.apply(null, anterior.map(function (v, i) { return v + actual[i]; })) : Math.max.apply(null, anterior.concat(actual))) * k;
      var paso = maximo > 30000 ? 10000 : 5000;
      if (H < 170) paso *= 2;
      var tope = Math.ceil(maximo * 1.04 / paso) * paso;
      var izq = W < 420 ? 56 : 62, der = 10, arr = 24, aba = 20, an = W - izq - der, al = H - arr - aba;
      var y = function (v) { return arr + al - v / tope * al; };
      for (var v = 0; v <= tope; v += paso) {
        nodo('line', { x1: izq, x2: W - der, y1: y(v), y2: y(v), 'class': 'rejilla' }, svg);
        nodo('text', { x: izq - 7, y: y(v) + 3.5, 'text-anchor': 'end' }, svg, num(v, 0) + ' €');
      }
      var col = an / 12;
      MESES.forEach(function (m, i) {
        if (W < 420 && i % 2) return;
        nodo('text', { x: izq + col * i + col / 2, y: H - 6, 'text-anchor': 'middle' }, svg, m);
      });
      if (apiladas) {
        var anchoA = Math.max(4, Math.min(26, col * 0.5));
        anterior.forEach(function (va, i) {
          var a1 = va * k, a2 = actual[i] * k, x = izq + col * i + col / 2 - anchoA / 2;
          [[0, a1, 's-ant', anio - 1, a1], [a1, a1 + a2, 's-act', anio, a2]].forEach(function (b, j) {
            var r = nodo('rect', { x: x.toFixed(1), y: y(b[1]).toFixed(1), width: anchoA.toFixed(1), height: Math.max(0, y(b[0]) - y(b[1])).toFixed(1), 'class': 'barra ' + b[2], style: '--i:' + (i + j * 2) }, svg);
            nodo('title', {}, r, b[3] + ' · ' + MESES[i] + ': ' + eur(b[4]));
          });
        });
      } else if (tipo === 'barras') {
        var ancho = Math.max(3, Math.min(16, col * 0.34));
        series.forEach(function (s, j) {
          s[0].forEach(function (valor, i) {
            var vv = valor * k, x = izq + col * i + col / 2 + (j ? 1 : -1 - ancho);
            var r = nodo('rect', { x: x.toFixed(1), y: y(vv).toFixed(1), width: ancho.toFixed(1), height: Math.max(0, arr + al - y(vv)).toFixed(1), rx: 2, 'class': 'barra ' + s[1], style: '--i:' + (i + j * 2) }, svg);
            nodo('title', {}, r, s[2] + ' · ' + MESES[i] + ': ' + eur(vv));
          });
        });
      } else {
        series.forEach(function (s, j) {
          var n = j ? mes + 1 : 12;
          var pts = s[0].slice(0, n).map(function (valor, i) { return [izq + col * i + col / 2, y(valor * k), valor * k]; });
          var linea = 'M' + pts.map(function (p) { return p[0].toFixed(1) + ',' + p[1].toFixed(1); }).join('L');
          if (tipo === 'areas') {
            nodo('path', { d: linea + 'L' + pts[pts.length - 1][0].toFixed(1) + ',' + (arr + al) + 'L' + pts[0][0].toFixed(1) + ',' + (arr + al) + 'Z', 'class': 'area ' + s[1] }, svg);
          }
          nodo('path', { d: linea, 'class': 'linea ' + s[1], pathLength: 1 }, svg);
          pts.forEach(function (p, i) {
            var c = nodo('circle', { cx: p[0].toFixed(1), cy: p[1].toFixed(1), r: 3.4, 'class': 'punto ' + s[1], style: '--i:' + i }, svg);
            nodo('title', {}, c, s[2] + ' · ' + MESES[i] + ': ' + eur(p[2]));
          });
        });
      }
      svg.setAttribute('aria-label', 'Gráfico de ' + ({ barras: 'barras', apiladas: 'barras apiladas', lineas: 'líneas', areas: 'áreas' })[tipo] +
        ' de lo facturado cada mes en ' + (anio - 1) + ' y en ' + anio);
    }
    // El botón del tipo de gráfico abre su menú, como en el programa
    var botonTipo = $('[data-tipo-boton]'), menuTipo = $('[data-tipo-menu]');
    function menuTipoAbierto(si) { menuTipo.hidden = !si; botonTipo.setAttribute('aria-expanded', si ? 'true' : 'false'); }
    botonTipo.addEventListener('click', function (e) { e.stopPropagation(); menuTipoAbierto(menuTipo.hidden); });
    $$('[data-tipo]').forEach(function (b) {
      b.addEventListener('click', function () {
        tipo = b.getAttribute('data-tipo');
        $$('[data-tipo]').forEach(function (o) { o.setAttribute('aria-checked', o === b ? 'true' : 'false'); });
        menuTipoAbierto(false);
        grafico(true);
      });
    });

    // El menú Maestros se despliega al pasar el ratón o al pulsarlo
    var botonMenu = $('[data-menu]'), mega = $('#megamenu'), cierre = 0;
    function megaAbierto(si) { clearTimeout(cierre); mega.classList.toggle('abierto', si); botonMenu.setAttribute('aria-expanded', si ? 'true' : 'false'); }
    botonMenu.addEventListener('click', function (e) { e.stopPropagation(); megaAbierto(!mega.classList.contains('abierto')); });
    [botonMenu, mega].forEach(function (el) {
      el.addEventListener('pointerenter', function (e) { if (e.pointerType === 'mouse') megaAbierto(true); });
      el.addEventListener('pointerleave', function (e) { if (e.pointerType === 'mouse') cierre = setTimeout(function () { megaAbierto(false); }, 220); });
    });
    document.addEventListener('click', function (e) {
      if (!mega.contains(e.target)) megaAbierto(false);
      if (!menuTipo.contains(e.target)) menuTipoAbierto(false);
    });
    document.addEventListener('keydown', function (e) { if (e.key === 'Escape') { megaAbierto(false); menuTipoAbierto(false); } });
    var esperaTamano = 0;
    if ('ResizeObserver' in window) {
      new ResizeObserver(function () {
        cancelAnimationFrame(esperaTamano);
        esperaTamano = requestAnimationFrame(function () { grafico(false); });
      }).observe(svg);
    } else window.addEventListener('resize', function () { grafico(false); });

    // Listas: recibos vencidos (más de 90 días, en rojo) y mejores clientes con su barra de datos
    function fecha(diasAtras) {
      var f = new Date(hoy.getTime() - diasAtras * 864e5);
      return { texto: dos(f.getDate()) + '/' + dos(f.getMonth() + 1) + '/' + f.getFullYear(), anio: f.getFullYear() };
    }
    var SEMANA = [[1, 'Cobro', 'Distribuciones Levante S. L.', 1820.40], [2, 'Pago', 'Suministros Industriales del Este', 645.00],
      [3, 'Cobro', 'Electro Hogar Sur', 418.25], [4, 'Cobro', 'Talleres Mediterráneo', 2310.00], [5, 'Pago', 'Papelería Central', 96.80], [6, 'Cobro', 'Panadería La Espiga', 389.90]];
    var PRESUPUESTOS = [['Reformas Palmeral S. L.', 2, 4850.00], ['Cristalería del Centro', 5, 1236.40], ['Asesoría Romero y Asociados', 8, 720.00],
      ['Electro Hogar Sur', 12, 2980.75], ['Talleres Mediterráneo', 15, 615.30], ['Distribuciones Levante S. L.', 21, 9420.00]];
    var STOCK = [[1043, 'Papel A4 80 g (caja 5 paquetes)', 3, 10], [2210, 'Tóner impresora láser negro', 1, 4], [3105, 'Rollo térmico 80 mm', 12, 40],
      [4012, 'Etiquetas adhesivas 70×37', 2, 6], [5120, 'Archivador de palanca A4', 4, 12], [6008, 'Bolígrafo azul (caja 50)', 1, 3]];
    function listas() {
      var k = conIva ? 1.21 : 1;
      $('[data-tabla="semana"] tbody').innerHTML = SEMANA.map(function (r) {
        var f = fecha(-r[0]);
        return '<tr' + (r[1] === 'Pago' ? ' class="rojo"' : '') + '><td class="ocultable">' + f.texto + '</td><td>' + r[1] + '</td><td>' + r[2] + '</td><td class="num">' + num(r[3], 2) + '</td></tr>';
      }).join('');
      $('[data-tabla="presupuestos"] tbody').innerHTML = PRESUPUESTOS.map(function (r, i) {
        var f = fecha(r[1]);
        return '<tr><td>PRE-' + (342 - i * 3) + '</td><td class="ocultable">' + f.texto + '</td><td>' + r[0] + '</td><td class="num">' + num(r[2] * k, 2) + '</td><td class="num">' + r[1] + '</td></tr>';
      }).join('');
      $('[data-tabla="stock"] tbody').innerHTML = STOCK.map(function (r) {
        return '<tr><td class="num">' + r[0] + '</td><td>' + r[1] + '</td><td class="num">' + r[2] + '</td><td class="num">' + r[3] + '</td></tr>';
      }).join('');
      $('[data-tabla="vencidos"] tbody').innerHTML = VENCIDOS.map(function (r, i) {
        var f = fecha(r[1]);
        return '<tr' + (r[1] > 90 ? ' class="rojo"' : '') + '><td>' + r[0] + '</td><td>FAC-' + (87 + i * 13) +
          '</td><td class="ocultable">' + f.texto + '</td><td class="num">' + r[1] + '</td><td class="num">' + num(r[2], 2) + '</td></tr>';
      }).join('');
      $('[data-tabla="clientes"] tbody').innerHTML = MEJORES.map(function (r) {
        return '<tr><td>' + r[0] + '</td><td class="num ocultable">' + r[1] + '</td><td class="num">' + num(datos.ano * k * r[2] / 100, 2) +
          '</td><td class="num pct"><i style="--p:' + (r[2] / 15 * 100).toFixed(0) + '%"></i><span>' + num(r[2], 1) + ' %</span></td></tr>';
      }).join('');
    }
    $$('[data-lista]').forEach(function (b) {
      b.addEventListener('click', function () {
        var cual = b.getAttribute('data-lista');
        $$('[data-lista]').forEach(function (o) { o.setAttribute('aria-selected', o === b ? 'true' : 'false'); });
        $$('[data-tabla]').forEach(function (t) { t.hidden = t.getAttribute('data-tabla') !== cual; });
      });
    });
    var tiraPestanas = $('.listas-pestanas');
    $$('[data-desplazar]').forEach(function (b) {
      b.addEventListener('click', function () { tiraPestanas.scrollBy({ left: +b.getAttribute('data-desplazar') * 140, behavior: quieto ? 'auto' : 'smooth' }); });
    });

    // «Importes con IVA» y el botón de actualizar
    $('[data-con-iva]').addEventListener('change', function (e) {
      conIva = e.target.checked;
      tarjetas(false); grafico(true); listas();
    });
    var actualizar = $('[data-actualizar]');
    actualizar.addEventListener('click', function () {
      actualizar.classList.remove('girando');
      void actualizar.offsetWidth;
      actualizar.classList.add('girando');
      tarjetas(true); grafico(true);
    });

    // Los atajos se hunden un poco al pulsarlos
    $$('.atajo').forEach(function (a) {
      a.addEventListener('pointerdown', function () { a.classList.add('pulsado'); });
      ['pointerup', 'pointerleave', 'pointercancel'].forEach(function (ev) { a.addEventListener(ev, function () { a.classList.remove('pulsado'); }); });
    });

    listas();
    grafico(false);
    // La primera vez que se ve la pantalla, los importes cuentan desde cero y el gráfico crece
    alVerUnaVez(app, function () { visto = true; tarjetas(true); grafico(true); app.classList.add('vista'); }, 0.2);
  }

  // ---------- Detalles que se animan al llegar a la vista ----------
  Array.prototype.forEach.call(document.querySelectorAll('.qr i'), function (i, n) { i.style.setProperty('--n', n); });
  Array.prototype.forEach.call(document.querySelectorAll('[data-al-ver]'), function (el) {
    var ver = function () {
      el.classList.add('visto');
      Array.prototype.forEach.call(el.querySelectorAll('[data-contar]'), function (c) { contar(c, +c.getAttribute('data-contar'), 0, '', true); });
    };
    if (quieto) { el.classList.add('visto'); return; }
    alVerUnaVez(el, ver, 0.35);
  });
})();
