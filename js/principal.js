// Pincho Facturación — comportamiento de la página (no hace falta tocar nada aquí)
(function () {
  // Línea bajo la barra superior al bajar
  var barra = document.querySelector('.barra');
  function revisarBarra() { if (barra) barra.classList.toggle('con-linea', window.scrollY > 8); }
  window.addEventListener('scroll', revisarBarra, { passive: true });
  revisarBarra();

  // Menú en el móvil
  var botonMenu = document.querySelector('.boton-menu');
  var menu = document.getElementById('menu');
  if (botonMenu && menu) {
    botonMenu.addEventListener('click', function () {
      var abierto = menu.classList.toggle('abierto');
      botonMenu.setAttribute('aria-expanded', abierto ? 'true' : 'false');
    });
    menu.addEventListener('click', function (e) {
      if (e.target.tagName === 'A') { menu.classList.remove('abierto'); botonMenu.setAttribute('aria-expanded', 'false'); }
    });
  }

  // Interruptor claro / oscuro de la captura de la portada
  var botonesTema = document.querySelectorAll('.interruptor button');
  var imagenesTema = document.querySelectorAll('.escaparate .ventana img');
  function ponerTema(tema) {
    botonesTema.forEach(function (b) { b.setAttribute('aria-pressed', b.dataset.tema === tema ? 'true' : 'false'); });
    imagenesTema.forEach(function (img) { img.classList.toggle('apagada', img.dataset.tema !== tema); });
  }
  botonesTema.forEach(function (b) { b.addEventListener('click', function () { ponerTema(b.dataset.tema); }); });
  // Si el visitante usa el modo oscuro, la captura empieza en oscuro
  if (window.matchMedia && window.matchMedia('(prefers-color-scheme: dark)').matches) ponerTema('oscuro');

  // Pestañas de pantallas (también con las flechas del teclado)
  var pestanas = Array.prototype.slice.call(document.querySelectorAll('.pestana'));
  function activar(p) {
    pestanas.forEach(function (q) {
      var sel = q === p;
      q.setAttribute('aria-selected', sel ? 'true' : 'false');
      q.tabIndex = sel ? 0 : -1;
      var panel = document.getElementById(q.getAttribute('aria-controls'));
      if (panel) { panel.classList.toggle('activo', sel); panel.hidden = !sel; }
    });
  }
  pestanas.forEach(function (p, i) {
    p.addEventListener('click', function () { activar(p); });
    p.addEventListener('keydown', function (e) {
      var j = e.key === 'ArrowRight' ? i + 1 : e.key === 'ArrowLeft' ? i - 1 : null;
      if (j === null) return;
      var otra = pestanas[(j + pestanas.length) % pestanas.length];
      activar(otra); otra.focus(); e.preventDefault();
    });
  });

  // Formulario de contacto: abre el programa de correo con el mensaje ya escrito
  var formulario = document.getElementById('formulario-contacto');
  if (formulario) {
    formulario.addEventListener('submit', function (e) {
      e.preventDefault();
      var d = new FormData(formulario);
      var asunto = 'Pincho Facturación: ' + (d.get('motivo') || 'Información');
      var cuerpo = 'Nombre: ' + d.get('nombre') + '\nEmpresa: ' + (d.get('empresa') || '') +
        '\nTeléfono: ' + (d.get('telefono') || '') + '\n\n' + (d.get('mensaje') || '');
      window.location.href = 'mailto:' + formulario.dataset.correo + '?subject=' + encodeURIComponent(asunto) + '&body=' + encodeURIComponent(cuerpo);
    });
  }

  var anio = document.getElementById('anio');
  if (anio) anio.textContent = new Date().getFullYear();
})();
