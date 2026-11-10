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

  // Interruptor claro / oscuro de la pantalla de Inicio de la portada
  var botonesTema = document.querySelectorAll('.interruptor button');
  var pantallaInicio = document.getElementById('app');
  function ponerTema(tema) {
    botonesTema.forEach(function (b) { b.setAttribute('aria-pressed', b.dataset.tema === tema ? 'true' : 'false'); });
    if (pantallaInicio) pantallaInicio.dataset.tema = tema;
  }
  botonesTema.forEach(function (b) { b.addEventListener('click', function () { ponerTema(b.dataset.tema); }); });
  // Menú del programa arriba o a la izquierda, como deja elegir el programa
  var botonesMenu = document.querySelectorAll('[data-menu-modo]');
  botonesMenu.forEach(function (b) {
    b.addEventListener('click', function () {
      var modo = b.getAttribute('data-menu-modo');
      botonesMenu.forEach(function (o) { o.setAttribute('aria-pressed', o === b ? 'true' : 'false'); });
      if (pantallaInicio) pantallaInicio.dataset.menu = modo;
    });
  });
  // Grupos del menú lateral: se abre uno y se cierran los demás
  var grupos = document.querySelectorAll('.menulat-grupo');
  grupos.forEach(function (g) {
    var b = g.querySelector('button');
    b.addEventListener('click', function () {
      var abrir = !g.classList.contains('abierto');
      grupos.forEach(function (o) { o.classList.toggle('abierto', o === g && abrir); o.querySelector('button').setAttribute('aria-expanded', o === g && abrir ? 'true' : 'false'); });
    });
  });
  // Si el visitante usa el modo oscuro, la pantalla empieza en oscuro
  if (window.matchMedia && window.matchMedia('(prefers-color-scheme: dark)').matches) ponerTema('oscuro');

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
