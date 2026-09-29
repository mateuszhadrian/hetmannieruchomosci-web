/* ==========================================================================
   Hetman Nieruchomości — skrypt wspólny (wersja referencyjna)
   Czysty JS, bez zależności. Każdy moduł włącza się sam, jeśli na stronie
   są jego elementy, więc plik jest ten sam dla wszystkich podstron.
   ========================================================================== */
(function () {
  'use strict';

  var mqDesktop = window.matchMedia('(min-width: 1025px)');
  var reduced = window.matchMedia('(prefers-reduced-motion: reduce)');

  /* --- 0. stabilna wysokość viewportu ----------------------------------- */
  /* Pasek adresu na telefonie chowa się i wraca w trakcie przewijania, co
     zmienia wysokość viewportu — sekcje pełnoekranowe rosły i malały skokowo.
     Jednostki svh tego nie ratują: część przeglądarek mobilnych (m.in.
     DuckDuckGo na Androidzie) liczy je dynamicznie, jak vh. Dlatego wysokość
     kadru trzymamy sami w --vph (patrz .vp-* w site.css):
       • na urządzeniu dotykowym zapisujemy ją przy wczytaniu i zmieniamy
         WYŁĄCZNIE przy zmianie szerokości (obrót ekranu, podzielony ekran) —
         zmiany samej wysokości to pasek adresu albo klawiatura, więc układ
         na nie nie reaguje;
       • przy myszce (desktop) i w iframe (podgląd) śledzimy każdą zmianę, bo
         tam wysokość zmienia tylko użytkownik.
     Trwała sonda `height:100svh` służy jako czuły wyzwalacz przez
     ResizeObserver: `resize` nie dociera np. do strony w iframe. */
  var vpW = window.innerWidth;
  var vph = 0;
  var vpCbs = [];
  var vpProbe = null;
  var vpFollowHeight = window.matchMedia('(hover: hover) and (pointer: fine)').matches;
  try { if (window.self !== window.top) vpFollowHeight = true; } catch (e) { vpFollowHeight = true; }

  function probe() {
    if (vpProbe && vpProbe.parentNode) return vpProbe;
    vpProbe = document.createElement('div');
    vpProbe.setAttribute('aria-hidden', 'true');
    vpProbe.style.cssText = 'position:fixed; top:0; left:0; width:0; height:100svh; visibility:hidden; pointer-events:none';
    (document.body || document.documentElement).appendChild(vpProbe);
    if ('ResizeObserver' in window) new ResizeObserver(onVpMaybeChanged).observe(vpProbe);
    return vpProbe;
  }

  /* Wysokość mierzymy sondą `100svh`, a nie `window.innerHeight`: do czasu
     uruchomienia skryptu sekcje pełnoekranowe stoją na `100svh` z CSS, a część
     przeglądarek mobilnych (Chrome na iOS) podaje w innerHeight kadr bez
     dolnego paska — przepisanie tej wartości do --vph podwyższało hero i cała
     treść skakała w dół w momencie zakończenia ładowania. Sonda daje dokładnie
     tę samą liczbę co CSS, więc podmiana jest bezszwowa. */
  function measureVph() {
    var p = probe();
    var h = p ? p.getBoundingClientRect().height : 0;
    return h > 0 ? h : window.innerHeight;
  }

  function setVph(h) {
    if (h === vph) return false;
    vph = h;
    document.documentElement.style.setProperty('--vph', h + 'px');
    return true;
  }

  function onViewportChange(fn) { vpCbs.push(fn); }

  function onVpMaybeChanged() {
    var w = window.innerWidth;
    var h = measureVph();
    var widthChanged = w !== vpW;
    vpW = w;
    var changed = (widthChanged || vpFollowHeight) ? setVph(h) : false;
    if (!changed && !widthChanged) return;
    vpCbs.forEach(function (fn) { fn(); });
  }

  window.addEventListener('resize', onVpMaybeChanged, { passive: true });
  if (window.visualViewport) {
    window.visualViewport.addEventListener('resize', onVpMaybeChanged);
  }
  window.addEventListener('orientationchange', function () {
    /* po obrocie wymiary bywają dostępne dopiero po chwili; wysokość
       przepisujemy zawsze, bo kadr faktycznie się zmienił */
    setTimeout(function () {
      vpW = window.innerWidth;
      setVph(measureVph());
      vpCbs.forEach(function (fn) { fn(); });
    }, 250);
  });

  probe();
  setVph(measureVph());

  /* --- 1. menu mobilne (bottom sheet) ----------------------------------- */
  /* Przy otwartym menu blokujemy scroll strony pod spodem: klasa na <html>
     (touch-action) + guardy na touchmove/wheel/klawisze. Overflow zostaje
     nietknięty, bo jego zmiana psuje sticky navbar i sheet.
     Gesty wewnątrz sheetu przechodzą. */
  var lockCount = 0;
  var SCROLL_KEYS = [' ', 'PageUp', 'PageDown', 'Home', 'End', 'ArrowUp', 'ArrowDown'];

  function guard(e) {
    var sheet = e.target.closest && e.target.closest('.mnav-sheet');
    /* gest wewnątrz sheetu przepuszczamy tylko wtedy, gdy sheet naprawdę
       ma co przewijać — inaczej scroll przechodziłby na stronę pod menu */
    if (sheet && sheet.scrollHeight > sheet.clientHeight + 1) return;
    e.preventDefault();
  }

  function guardKeys(e) {
    if (SCROLL_KEYS.indexOf(e.key) < 0) return;
    if (e.target.closest && e.target.closest('input, textarea, select, .mnav-sheet')) return;
    e.preventDefault();
  }

  function setScrollLock(on) {
    lockCount = Math.max(0, lockCount + (on ? 1 : -1));
    var locked = lockCount > 0;
    var html = document.documentElement;
    if (locked === html.classList.contains('mnav-lock')) return;
    html.classList.toggle('mnav-lock', locked);
    if (locked) {
      document.addEventListener('touchmove', guard, { passive: false });
      document.addEventListener('wheel', guard, { passive: false });
      document.addEventListener('keydown', guardKeys, { passive: false });
    } else {
      document.removeEventListener('touchmove', guard, { passive: false });
      document.removeEventListener('wheel', guard, { passive: false });
      document.removeEventListener('keydown', guardKeys, { passive: false });
    }
  }

  function initMenu(root) {
    var btn = root.querySelector('[data-menu-toggle]');
    var scrim = root.querySelector('.mnav-scrim');
    if (!btn) return;

    function set(open) {
      if (open === (root.getAttribute('data-open') === '1')) return;
      root.setAttribute('data-open', open ? '1' : '0');
      btn.setAttribute('aria-expanded', open ? 'true' : 'false');
      btn.setAttribute('aria-label', open ? 'Zamknij menu' : 'Otwórz menu');
      setScrollLock(open);
    }

    root.setAttribute('data-open', '0');
    btn.setAttribute('aria-expanded', 'false');
    btn.addEventListener('click', function () {
      set(root.getAttribute('data-open') !== '1');
    });
    if (scrim) scrim.addEventListener('click', function () { set(false); });
    document.addEventListener('keydown', function (e) {
      if (e.key === 'Escape') set(false);
    });
    /* przejście na desktop: menu mobilne znika, więc zdejmujemy blokadę */
    mqDesktop.addEventListener('change', function () {
      if (mqDesktop.matches) set(false);
    });
  }

  /* --- 2. formularze: wersja referencyjna nie wysyła danych -------------- */
  function initForm(form) {
    form.addEventListener('submit', function (e) {
      e.preventDefault();
      var note = form.querySelector('.ref-note');
      if (!note) {
        note = document.createElement('p');
        note.className = 'ref-note';
        note.setAttribute('role', 'status');
        note.textContent = 'To wersja referencyjna — formularz nie wysyła danych.';
        form.appendChild(note);
      }
    });
  }

  /* --- 3. strona główna: hero (wideo → zdjęcie) ------------------------- */
  function initHeroVideo(video) {
    var photo = video.parentNode.querySelector('[data-hero-photo]');
    var raf = 0;

    function showPhoto() {
      if (!photo) return;
      photo.style.transition = 'opacity 1200ms cubic-bezier(0.4,0,0.2,1)';
      requestAnimationFrame(function () { photo.style.opacity = '1'; });
    }

    /* pod koniec materiału wideo zwalnia do 0.2× i przechodzi w zdjęcie */
    function tick() {
      var tail = 1.5;
      var endRate = 0.2;
      if (video.ended) return;
      var remaining = video.duration - video.currentTime;
      if (isFinite(remaining)) {
        var p = remaining <= tail ? Math.min(1, Math.max(0, 1 - remaining / tail)) : 0;
        var rate = 1 + (endRate - 1) * p;
        if (Math.abs(video.playbackRate - rate) > 0.005) video.playbackRate = rate;
      }
      raf = requestAnimationFrame(tick);
    }

    function start() {
      if (video.dataset.started) return;
      if (!mqDesktop.matches) return;          // gałąź desktop jest ukryta
      video.dataset.started = '1';
      if (reduced.matches) { if (photo) photo.style.opacity = '1'; return; }
      video.preload = 'auto';
      video.load();
      video.playbackRate = 1;
      video.addEventListener('ended', showPhoto);
      var p = video.play();
      if (p && p.catch) p.catch(showPhoto);
      cancelAnimationFrame(raf);
      raf = requestAnimationFrame(tick);
    }

    if (photo) { photo.style.transition = 'none'; photo.style.opacity = '0'; }
    start();
    mqDesktop.addEventListener('change', start);
  }

  /* --- 4. strona główna: navbar przemalowany pozycją scrolla ------------ */
  function initScrollNav() {
    var navM = document.querySelector('[data-nav-m]');
    var navD = document.querySelector('[data-nav]');
    var lastKey = '';

    function mix(a, b, e) {
      return a.map(function (v, i) { return Math.round(v + (b[i] - v) * e); });
    }

    function paint() {
      var desktop = mqDesktop.matches;
      var nav = desktop ? navD : navM;
      if (!nav) return;
      var hero = (desktop ? document.querySelector('.br-d [data-hero]') : document.querySelector('.br-m [data-hero]'));
      if (!hero) return;

      var h = hero.offsetHeight || 900;
      var navH = nav.offsetHeight || 96;
      var start = h * 0.32;
      var end = h - navH;
      var p = Math.max(0, Math.min(1, (window.scrollY - start) / Math.max(1, end - start)));
      var e = p * p * (3 - 2 * p);

      var key = (desktop ? 'd' : 'm') + ':' + e.toFixed(3);
      if (key === lastKey) return;
      lastKey = key;

      var el;
      if (!desktop) {
        el = nav.querySelector('[data-navm-white]');
        if (el) el.style.opacity = e.toFixed(3);
        el = nav.querySelector('[data-navm-scrim]');
        if (el) el.style.opacity = (1 - e).toFixed(3);
        el = nav.querySelector('[data-navm-logo-light]');
        if (el) el.style.opacity = (1 - e).toFixed(3);
        el = nav.querySelector('[data-navm-logo-dark]');
        if (el) el.style.opacity = e.toFixed(3);
        var bar = 'rgb(' + mix([221, 221, 221], [24, 58, 107], e).join(',') + ')';
        nav.querySelectorAll('.hb-bar').forEach(function (b) { b.style.background = bar; });
        return;
      }

      el = nav.querySelector('.hn-white');
      if (el) el.style.opacity = e.toFixed(3);
      el = nav.querySelector('.hn-scrim');
      if (el) el.style.opacity = (1 - e).toFixed(3);
      el = nav.querySelector('.hn-logo-light');
      if (el) el.style.opacity = (1 - e).toFixed(3);
      el = nav.querySelector('.hn-logo-dark');
      if (el) el.style.opacity = e.toFixed(3);

      nav.querySelectorAll('.hn-l').forEach(function (link) {
        var base = mix([255, 255, 255], [26, 26, 26], e);
        var hover = mix(base, [24, 58, 107], e);
        var alpha = (0.88 + 0.12 * e).toFixed(3);
        link.style.setProperty('--nc', 'rgba(' + base.join(',') + ',' + alpha + ')');
        link.style.setProperty('--nch', 'rgba(' + hover.join(',') + ',' + alpha + ')');
        link.style.textShadow = '0 1px 6px rgba(0,0,0,' + (0.35 * (1 - e)).toFixed(3) + ')';
        link.style.setProperty('--nglow', '255,255,255');
        link.style.setProperty('--nhalo', (1 - e).toFixed(3));
      });

      el = nav.querySelector('.hn-tel');
      if (el) el.style.boxShadow = '0 2px 14px rgba(0,0,0,' + (0.22 * (1 - e)).toFixed(3) + ')';
    }

    var queued = false;
    function onScroll() {
      if (queued) return;
      queued = true;
      requestAnimationFrame(function () { queued = false; paint(); });
    }

    paint();
    window.addEventListener('scroll', onScroll, { passive: true });
    onViewportChange(function () { lastKey = ''; paint(); });
    mqDesktop.addEventListener('change', function () { lastKey = ''; paint(); });
  }


  /* --- 5. podstrona „Oferty": filtry, sortowanie, widok, paginacja -------- */
  function initOferty(root) {
    var ON = { bg: '#183a6b', fg: '#fff', bd: '#183a6b', fw: '600' };
    var OFF = { bg: '#fff', fg: '#183a6b', bd: 'rgba(24,58,107,0.3)', fw: '500' };
    var SORTS = { newest: 'Najnowsze', oldest: 'Najstarsze', priceAsc: 'Cena rosnąco', priceDesc: 'Cena malejąco' };

    function paint(el, on, kind) {
      el.style.background = on ? ON.bg : OFF.bg;
      el.style.color = on ? ON.fg : OFF.fg;
      if (kind !== 'seg') {
        el.style.borderColor = on ? ON.bd : OFF.bd;
        el.style.fontWeight = on ? ON.fw : OFF.fw;
      }
      el.setAttribute('aria-pressed', on ? 'true' : 'false');
    }
    function group(name) {
      return Array.prototype.filter.call(
        document.querySelectorAll('[data-act="pick"]'),
        function (b) { return b.dataset.args.split('|')[0] === name; }
      );
    }
    function chevron(btn, open) {
      var c = btn.querySelector('span[style*="transform"]');
      if (c) c.style.transform = open ? 'rotate(180deg)' : 'rotate(0deg)';
    }
    function setSortLabel(key) {
      document.querySelectorAll('[data-sort-label]').forEach(function (s) {
        s.setAttribute('data-sort-label', key);
        s.textContent = SORTS[key];
      });
      document.querySelectorAll('[data-act="pickSort"]').forEach(function (b) {
        var on = b.dataset.args === key;
        b.style.fontWeight = on ? '600' : '500';
        b.style.color = on ? '#183a6b' : '#1c1b19';
        var tick = b.querySelector('span[style*="visibility"]');
        if (tick) tick.style.visibility = on ? 'visible' : 'hidden';
      });
    }
    function sheet(kind, open) {
      var label = kind === 'sort' ? 'bottom sheet sortowanie' : 'bottom sheet filtry';
      var ov = document.querySelector('[data-screen-label="' + label + '"]');
      if (!ov) return;
      var dlg = ov.querySelector('[role="dialog"]');
      var scrim = ov.firstElementChild;
      ov.style.pointerEvents = open ? 'auto' : 'none';
      ov.style.visibility = open ? 'visible' : 'hidden';
      ov.style.transition = open ? 'visibility 0s linear 0s' : 'visibility 0s linear .45s';
      if (scrim) scrim.style.opacity = open ? '0.26' : '0';
      if (dlg) {
        dlg.style.transform = open ? 'translateY(0)' : 'translateY(101%)';
        dlg.setAttribute('aria-hidden', open ? 'false' : 'true');
      }
    }
    function closeSheets() { sheet('sort', false); sheet('filt', false); }

    var pending = 'newest';

    root.addEventListener('click', function (e) {
      var btn = e.target.closest('[data-act]');
      if (!btn || !root.contains(btn)) return;
      var act = btn.dataset.act;
      var args = (btn.dataset.args || '').split('|');
      var branch = btn.closest('[data-more]');

      if (btn.tagName === 'A' && btn.getAttribute('href') === '#') e.preventDefault();

      switch (act) {
        case 'pick':
          group(args[0]).forEach(function (b) { paint(b, b === btn, args[1]); });
          break;
        case 'status':
          document.querySelectorAll('[data-act="status"]').forEach(function (b) {
            if (b.dataset.args !== args[0]) return;
            paint(b, b.getAttribute('aria-pressed') !== 'true', 'pill');
          });
          break;
        case 'toggleMore': {
          var open = branch && branch.getAttribute('data-more') !== '1';
          if (branch) branch.setAttribute('data-more', open ? '1' : '0');
          chevron(btn, open);
          var lbl = document.querySelector('[data-more-label]');
          if (lbl) lbl.textContent = open ? 'Mniej filtrów' : 'Więcej filtrów';
          btn.style.borderBottomColor = open ? 'transparent' : 'rgba(24,58,107,0.12)';
          btn.setAttribute('aria-expanded', open ? 'true' : 'false');
          break;
        }
        case 'toggleSort': {
          var d = btn.closest('[data-sortopen]');
          var so = d.getAttribute('data-sortopen') !== '1';
          d.setAttribute('data-sortopen', so ? '1' : '0');
          btn.style.background = so ? '#f3f2ef' : '#fff';
          chevron(btn, so);
          btn.setAttribute('aria-expanded', so ? 'true' : 'false');
          break;
        }
        case 'pickSort': {
          setSortLabel(args[0]);
          var dd = btn.closest('[data-sortopen]');
          if (dd) dd.setAttribute('data-sortopen', '0');
          var tb = document.querySelector('[data-act="toggleSort"]');
          if (tb) { tb.style.background = '#fff'; chevron(tb, false); tb.setAttribute('aria-expanded', 'false'); }
          break;
        }
        case 'setGrid':
        case 'setList': {
          var g = act === 'setGrid';
          var wrap = btn.closest('[data-view]');
          if (wrap) wrap.setAttribute('data-view', g ? 'grid' : 'list');
          var gb = document.querySelector('[data-act="setGrid"]');
          var lb = document.querySelector('[data-act="setList"]');
          if (gb) { gb.style.background = g ? '#183a6b' : '#fff'; gb.style.color = g ? '#fff' : '#183a6b'; }
          if (lb) { lb.style.background = g ? '#fff' : '#183a6b'; lb.style.color = g ? '#183a6b' : '#fff'; }
          break;
        }
        case 'clear': {
          var def = { typ: 'Wszystkie', tr: 'Wszystkie', pok: null, ryn: 'Dowolny', win: 'Dowolnie', ume: 'Dowolnie' };
          Object.keys(def).forEach(function (k) {
            group(k).forEach(function (b) {
              var v = b.dataset.args.split('|');
              paint(b, v[2] === def[k], v[1]);
            });
          });
          document.querySelectorAll('[data-act="dropLoc"]').forEach(function (b) {
            var box = b.closest('div');
            if (box) box.remove();
          });
          break;
        }
        case 'applyD':
          if (branch) branch.setAttribute('data-more', '0');
          break;
        case 'dropLoc': {
          var box2 = btn.closest('div');
          if (box2) box2.remove();
          break;
        }
        case 'page':
        case 'pagePrev':
        case 'pageNext': {
          var links = Array.prototype.slice.call(document.querySelectorAll('[data-act="page"]'));
          var cur = links.findIndex(function (a) { return a.getAttribute('aria-current') === 'page'; });
          var next = act === 'page' ? links.indexOf(btn) : (act === 'pagePrev' ? cur - 1 : cur + 1);
          if (next < 0 || next >= links.length) break;
          links.forEach(function (a, i) {
            var on = i === next;
            a.style.background = on ? '#183a6b' : '#fff';
            a.style.color = on ? '#fff' : '#183a6b';
            a.style.borderColor = on ? '#183a6b' : 'rgba(24,58,107,0.25)';
            if (on) a.setAttribute('aria-current', 'page'); else a.removeAttribute('aria-current');
          });
          [['pagePrev', next === 0], ['pageNext', next === links.length - 1]].forEach(function (p) {
            var el = document.querySelector('[data-act="' + p[0] + '"]');
            if (!el) return;
            el.style.color = p[1] ? '#9a968f' : '#183a6b';
            el.style.borderColor = p[1] ? 'rgba(24,58,107,0.12)' : 'rgba(24,58,107,0.25)';
            el.style.cursor = p[1] ? 'default' : 'pointer';
            if (p[1]) el.setAttribute('aria-disabled', 'true'); else el.removeAttribute('aria-disabled');
          });
          break;
        }
        case 'openSort':
          pending = (document.querySelector('[data-sort-label]') || {}).dataset
            ? document.querySelector('[data-sort-label]').getAttribute('data-sort-label') : 'newest';
          document.querySelectorAll('[data-act="pendSort"]').forEach(function (b) {
            paint(b, b.dataset.args === pending, 'seg');
          });
          sheet('sort', true);
          break;
        case 'openFilt':
          sheet('filt', true);
          break;
        case 'pendSort':
          pending = args[0];
          document.querySelectorAll('[data-act="pendSort"]').forEach(function (b) {
            paint(b, b.dataset.args === pending, 'seg');
          });
          break;
        case 'apply':
          setSortLabel(pending);
          closeSheets();
          break;
        case 'close':
          closeSheets();
          break;
      }
    });

    document.addEventListener('keydown', function (e) {
      if (e.key !== 'Escape') return;
      closeSheets();
      var d = document.querySelector('[data-sortopen="1"]');
      if (d) d.setAttribute('data-sortopen', '0');
    });

    document.addEventListener('mousedown', function (e) {
      var d = document.querySelector('[data-sortopen="1"]');
      if (d && !e.target.closest('[data-act="toggleSort"]') && !e.target.closest('.js-sortmenu')) {
        d.setAttribute('data-sortopen', '0');
        var tb = document.querySelector('[data-act="toggleSort"]');
        if (tb) { tb.style.background = '#fff'; chevron(tb, false); }
      }
    });

    closeSheets();
  }


  /* --- 6. podstrona oferty: galeria (hero, miniatury, sheet, lightbox) ---- */
  function initOferta(root) {
    var photos = [];
    var heroIdx = 0;

    function tracks() {
      return Array.prototype.filter.call(
        document.querySelectorAll('[data-gal-track]'),
        function (t) { return t.offsetParent !== null || t.closest('.br-m,.br-d').offsetParent !== null; }
      );
    }
    function activeTrack() {
      var all = document.querySelectorAll('[data-gal-track]');
      for (var i = 0; i < all.length; i++) {
        var branch = all[i].closest('.br-m, .br-d');
        if (branch && getComputedStyle(branch).display !== 'none') return all[i];
      }
      return all[0];
    }
    function overlayOf(track) {
      var wrap = track.closest('[data-screen-label]');
      return wrap ? wrap.firstElementChild : null;
    }
    function padOf(el) { return parseFloat(getComputedStyle(el).paddingLeft) || 0; }

    function setOpen(track, open) {
      var ov = overlayOf(track);
      if (!ov) return;
      ov.style.pointerEvents = open ? 'auto' : 'none';
      ov.style.visibility = open ? 'visible' : 'hidden';
      ov.style.transition = open ? 'visibility 0s linear 0s' : 'visibility 0s linear .45s';
      Array.prototype.forEach.call(ov.children, function (c) {
        var st = c.getAttribute('style') || '';
        if (st.indexOf('#08101e') > -1) c.style.opacity = open ? '0.4' : '0';
      });
      var dlg = ov.querySelector('[role="dialog"]');
      if (!dlg) return;
      if ((dlg.getAttribute('style') || '').indexOf('opacity') > -1) {
        dlg.style.opacity = open ? '1' : '0';
        dlg.style.transform = open ? 'translateY(0)' : 'translateY(24px)';
      } else {
        dlg.style.transform = open ? 'translateY(0)' : 'translateY(101%)';
      }
      dlg.setAttribute('aria-hidden', open ? 'false' : 'true');
    }
    function closeAll() {
      document.querySelectorAll('[data-gal-track]').forEach(function (t) { setOpen(t, false); });
    }
    function idxOf(track) {
      var pad = padOf(track), best = 0, bd = Infinity;
      for (var i = 0; i < track.children.length; i++) {
        var d = Math.abs(track.children[i].offsetLeft - pad - track.scrollLeft);
        if (d < bd) { bd = d; best = i; }
      }
      return best;
    }
    function showCount(i, total) {
      document.querySelectorAll('[data-gal-count]').forEach(function (s) {
        s.textContent = (i + 1) + ' / ' + total;
      });
    }
    function goTo(track, i, smooth) {
      var kid = track.children[i];
      if (!kid) return;
      track.scrollTo({ left: kid.offsetLeft - padOf(track), behavior: smooth ? 'smooth' : 'auto' });
      showCount(i, track.children.length);
    }
    function setHero(i) {
      heroIdx = i;
      var img = document.querySelector('[data-gal-hero]');
      if (img && photos[i]) { img.src = photos[i].src; img.alt = photos[i].alt; }
      var c = document.querySelector('[data-gal-hero-count]');
      if (c) c.textContent = (i + 1) + ' / ' + photos.length;
      document.querySelectorAll('[data-gal-thumb]').forEach(function (b) {
        b.style.borderColor = Number(b.dataset.galThumb) === i ? '#c98236' : 'transparent';
      });
    }

    /* lista zdjęć czytana z pierwszego toru galerii */
    var first = document.querySelector('[data-gal-track]');
    if (first) {
      photos = Array.prototype.map.call(first.children, function (im) {
        return { src: im.getAttribute('src'), alt: im.getAttribute('alt') || '' };
      });
    }

    root.addEventListener('click', function (e) {
      var btn = e.target.closest('[data-act]');
      if (!btn || !root.contains(btn)) return;
      var act = btn.dataset.act;
      var arg = Number((btn.dataset.args || '0').split('|')[0]) || 0;
      var track = activeTrack();

      switch (act) {
        case 'noop':
          e.preventDefault();
          break;
        case 'galOpen':
          setOpen(track, true);
          requestAnimationFrame(function () { goTo(track, arg); requestAnimationFrame(function () { goTo(track, arg); }); });
          break;
        case 'galClose':
          closeAll();
          break;
        case 'lbPrev':
        case 'lbNext': {
          var total = track.children.length;
          var cur = idxOf(track);
          var next = act === 'lbPrev' ? (cur - 1 + total) % total : (cur + 1) % total;
          goTo(track, next);
          break;
        }
        case 'heroPrev':
          setHero((heroIdx - 1 + photos.length) % photos.length);
          break;
        case 'heroNext':
          setHero((heroIdx + 1) % photos.length);
          break;
        case 'copyLink': {
          try { if (navigator.clipboard) navigator.clipboard.writeText(location.href).catch(function () {}); } catch (err) {}
          var lbl = document.querySelector('[data-copy-label]');
          if (lbl) {
            lbl.textContent = 'Skopiowano';
            clearTimeout(lbl._t);
            lbl._t = setTimeout(function () { lbl.textContent = 'Skopiuj link'; }, 2000);
          }
          break;
        }
      }
    });

    document.querySelectorAll('[data-gal-track]').forEach(function (t) {
      t.addEventListener('scroll', function () { showCount(idxOf(t), t.children.length); }, { passive: true });
    });

    document.addEventListener('keydown', function (e) {
      if (e.key === 'Escape') closeAll();
    });

    closeAll();
  }


  /* --- 7. kotwice: skok do sekcji w widocznej gałęzi ---------------------- */
  /* Obie gałęzie są w DOM, więc sekcje mają sufiksy -m / -d. Ten moduł
     obsługuje wejścia z gołym hashem z innych podstron (np. uslugi.html#sprzedaje). */
  function initHashJump() {
    function visibleTarget(id) {
      var els = document.querySelectorAll('[id="' + id + '"], [id="' + id + '-m"], [id="' + id + '-d"]');
      for (var i = 0; i < els.length; i++) {
        var branch = els[i].closest('.br-m, .br-d');
        if (!branch || getComputedStyle(branch).display !== 'none') return els[i];
      }
      return null;
    }

    function jump() {
      var id = decodeURIComponent(location.hash.slice(1));
      if (!id) return;
      var direct = document.getElementById(id);
      if (direct) {
        var b = direct.closest('.br-m, .br-d');
        if (!b || getComputedStyle(b).display !== 'none') return;   // przeglądarka poradzi sobie sama
      }
      var el = visibleTarget(id);
      if (!el) return;
      var offset = parseFloat(getComputedStyle(el).scrollMarginTop) || 0;
      window.scrollTo(0, el.getBoundingClientRect().top + window.scrollY - offset);
    }

    window.addEventListener('hashchange', jump);
    if (location.hash) requestAnimationFrame(jump);
  }

  /* --- 8. oferta: pasek kotwic — skok, podświetlenie, odklejenie --------- */
  /* Obie gałęzie są w DOM, więc sekcje mobilne mają sufiks -m. Pasek:
     klik → płynny skok z zapasem na navbar + pasek; scroll → podświetlenie
     aktywnej sekcji (chip dojeżdża do widoku); po końcu sekcji kontakt pasek
     przestaje być przyklejony i odjeżdża w górę razem z treścią. */
  function initAnchorBar(bar) {
    var track = bar.firstElementChild;
    var links = Array.prototype.slice.call(bar.querySelectorAll('a[href^="#"]'));
    if (!track || !links.length) return;
    var suffix = bar.closest('.br-m') ? '-m' : '-d';
    if (!reduced.matches) bar.style.transition = 'transform .3s cubic-bezier(0.4,0,0.2,1)';

    function target(link) {
      var id = decodeURIComponent(link.getAttribute('href').slice(1));
      return document.getElementById(id + suffix) || document.getElementById(id);
    }
    function stickTop() { return parseFloat(getComputedStyle(bar).top) || 0; }
    function offset() { return stickTop() + bar.offsetHeight; }
    function behavior() { return reduced.matches ? 'auto' : 'smooth'; }

    function setActive(i) {
      links.forEach(function (a, n) {
        var on = n === i;
        a.style.color = on ? '#183a6b' : '#2f3a4c';
        a.style.boxShadow = 'inset 0 -2px 0 ' + (on ? '#c98236' : 'transparent');
        if (on) a.setAttribute('aria-current', 'true'); else a.removeAttribute('aria-current');
      });
      var act = links[i];
      if (!act) return;
      var max = Math.max(0, track.scrollWidth - track.clientWidth);
      var left = Math.max(0, Math.min(max, act.offsetLeft - (track.clientWidth - act.offsetWidth) / 2));
      if (Math.abs(track.scrollLeft - left) > 4) track.scrollTo({ left: left, behavior: behavior() });
    }

    bar.addEventListener('click', function (e) {
      var a = e.target.closest('a[href^="#"]');
      if (!a || !bar.contains(a)) return;
      var el = target(a);
      if (!el) return;
      e.preventDefault();
      var i = links.indexOf(a);
      intent = i;
      last = -1;
      setActive(i);
      goto(el, 0);
      if (history.replaceState) history.replaceState(null, '', a.getAttribute('href'));
    });

    /* dojazd korygowany po ustabilizowaniu układu — obrazy lazy potrafią
       przesunąć treść już w trakcie płynnego przewijania */
    function goto(el, tries) {
      clearTimeout(settle);
      var top = Math.max(0, el.getBoundingClientRect().top + window.scrollY - offset() + 2);
      if (Math.abs(window.scrollY - top) > 2) window.scrollTo({ top: top, behavior: behavior() });
      settle = setTimeout(function () {
        var now = Math.max(0, el.getBoundingClientRect().top + window.scrollY - offset() + 2);
        if (tries < 4 && Math.abs(now - window.scrollY) > 4) { goto(el, tries + 1); return; }
        intent = -1;
        last = -1;
        paint();
      }, tries === 0 ? 620 : 260);
    }

    var last = -1;
    var intent = -1;      // indeks kliknięty — trzyma podświetlenie do końca dojazdu
    var settle = 0;
    function paint() {
      if (!bar.offsetParent) return;                     // gałąź ukryta
      var doc = document.documentElement;
      var line = window.scrollY + offset() + 28;         // tolerancja na drobne przesunięcia
      var idx = 0;
      links.forEach(function (a, n) {
        var el = target(a);
        if (el && el.getBoundingClientRect().top + window.scrollY <= line) idx = n;
      });
      if (window.innerHeight + window.scrollY >= doc.scrollHeight - 2) idx = links.length - 1;
      if (intent >= 0) idx = intent;
      if (idx !== last) { last = idx; setActive(idx); }

      var end = target(links[links.length - 1]);
      if (!end) return;
      /* koniec sekcji kontakt → pasek się odkleja i chowa nad navbarem */
      var cap = stickTop() + bar.offsetHeight;
      var off = end.getBoundingClientRect().bottom <= cap;
      bar.style.transform = off ? 'translateY(' + (-cap) + 'px)' : '';
      bar.style.pointerEvents = off ? 'none' : '';
    }

    var queued = false;
    function onScroll() {
      if (queued) return;
      queued = true;
      requestAnimationFrame(function () { queued = false; paint(); });
    }

    paint();
    window.addEventListener('scroll', onScroll, { passive: true });
    onViewportChange(function () { last = -1; paint(); });
    mqDesktop.addEventListener('change', function () { last = -1; paint(); });
  }

  /* --- 9. strona główna: zoom hero + gaśnięcie nagłówka przy scrollu ---- */
  /* Warstwy [data-hero-zoom] w sekcji [data-hero] powiększają się do 1.06
     w miarę przewijania hero. IntersectionObserver pilnuje, żeby liczyć tylko
     gdy hero jest w viewporcie — po wyjechaniu listener scrolla jest zdejmowany. */
  function initHeroZoom() {
    if (reduced.matches) return;
    var MAX = 0.30;
    var groups = [];
    document.querySelectorAll('[data-hero]').forEach(function (hero) {
      var layers = Array.prototype.slice.call(hero.querySelectorAll('[data-hero-zoom]'));
      var fades = Array.prototype.slice.call(hero.querySelectorAll('[data-hero-fade]'));
      if (layers.length || fades.length) groups.push({ hero: hero, layers: layers, fades: fades, on: false });
    });
    if (!groups.length || !('IntersectionObserver' in window)) return;

    var live = 0;

    /* Wartości docelowe liczymy ze scrolla, ale dociągamy do nich stopniowo.
       Dzięki temu skok pozycji scrolla (przeglądarka mobilna chowa pasek
       adresu) nie daje pyknięcia obrazu — zoom dojeżdża płynnie. */
    var EASE = 0.2;
    var loop = 0;
    var lastT = 0;

    function targets() {
      groups.forEach(function (g) {
        if (!g.on) return;
        var r = g.hero.getBoundingClientRect();
        var h = r.height || 1;
        g.t = Math.max(0, Math.min(1, -r.top / h));
        g.fades.forEach(function (el) {
          var t0 = el._top0 || 1;
          el._t = Math.max(0, Math.min(1, 1 - el.getBoundingClientRect().top / t0));
        });
      });
    }

    /* k = ułamek drogi do celu w tym kroku; k >= 1 → wskakujemy na cel */
    function apply(k) {
      var moving = false;
      groups.forEach(function (g) {
        if (!g.on) return;
        if (g.c == null || k >= 1) g.c = g.t;
        else if (Math.abs(g.t - g.c) > 0.0005) { g.c += (g.t - g.c) * k; moving = true; }
        else g.c = g.t;
        var s = (1 + MAX * g.c).toFixed(4);
        g.layers.forEach(function (l) { l.style.transform = 'scale(' + s + ')'; });
        g.fades.forEach(function (el) {
          if (el._c == null || k >= 1) el._c = el._t;
          else if (Math.abs(el._t - el._c) > 0.0005) { el._c += (el._t - el._c) * k; moving = true; }
          else el._c = el._t;
          el.style.opacity = (1 - 0.7 * el._c).toFixed(3);
        });
      });
      return moving;
    }

    /* easing liczony z czasu klatki: przy długiej przerwie (karta w tle,
       throttling rAF) jedna spóźniona klatka ląduje dokładnie na celu */
    function frame(ts) {
      loop = 0;
      var now = ts || (window.performance ? performance.now() : Date.now());
      var dt = lastT ? now - lastT : 16;
      lastT = now;
      targets();
      var k = dt > 200 ? 1 : 1 - Math.pow(1 - EASE, dt / 16.67);
      if (apply(k)) loop = requestAnimationFrame(frame);
    }

    function paint(snap) {
      lastT = 0;
      targets();
      if (apply(snap === true ? 1 : EASE)) { if (!loop) loop = requestAnimationFrame(frame); }
    }

    function onScroll() {
      if (loop) return;
      loop = requestAnimationFrame(frame);
    }

    var attached = false;
    function setListener(want) {
      if (want === attached) return;
      attached = want;
      if (want) window.addEventListener('scroll', onScroll, { passive: true });
      else window.removeEventListener('scroll', onScroll, { passive: true });
    }

    var io = new IntersectionObserver(function (entries) {
      entries.forEach(function (e) {
        var g = groups.filter(function (x) { return x.hero === e.target; })[0];
        if (!g || g.on === e.isIntersecting) return;
        g.on = e.isIntersecting;
        live += e.isIntersecting ? 1 : -1;
        g.layers.forEach(function (l) {
          l.style.willChange = e.isIntersecting ? 'transform' : '';
          if (!e.isIntersecting) l.style.transform = '';
        });
        g.fades.forEach(function (el) {
          el.style.willChange = e.isIntersecting ? 'opacity' : '';
          if (!e.isIntersecting) el.style.opacity = '';
        });
      });
      live = Math.max(0, live);
      setListener(live > 0);
      if (live > 0) paint(true);
    });

    function measure() {
      groups.forEach(function (g) {
        g.fades.forEach(function (el) {
          if (!el.offsetParent) return;
          var cur = parseFloat(el.style.opacity);
          el.style.opacity = '';
          el._top0 = Math.max(1, el.getBoundingClientRect().top + window.scrollY);
          if (!isNaN(cur)) el.style.opacity = String(cur);
        });
      });
    }

    measure();
    groups.forEach(function (g) { io.observe(g.hero); });
    window.addEventListener('load', function () { measure(); paint(true); });
    onViewportChange(function () { measure(); paint(true); });
    mqDesktop.addEventListener('change', function () { measure(); paint(true); });
  }

  /* --- 10. animacje po scrollu: odsłanianie treści + parallax zdjęć ------ */
  /* Moduł działa tylko na podstronach z atrybutem data-anim na <body>
     (Strona główna, Sprzedaj z nami, O nas, Usługi) i wyłącza się przy
     prefers-reduced-motion.

     Odsłanianie: skrypt sam znajduje bloki treści w sekcjach <main> (bez
     nagłówka, stopki i menu, bez sekcji, które mają już własną animację —
     hero strony głównej), nadaje im [data-rv] i klasę .is-in, gdy wejdą
     w kadr. Cała robota siedzi w CSS-owej tranzycji, a IntersectionObserver
     odpala się raz na element — przy scrollu nie liczy się nic.

     Parallax: zdjęcia tła (position:absolute w kontenerze z overflow:hidden)
     oraz zdjęcia oznaczone data-px w treści (data-nopx wypisuje zdjęcie
     z parallaxu — tak wyłączone są kadry ofert na stronie głównej). Element dostaje skalę i jedzie
     w pionie o ułamek własnej wysokości — na desktopie ±8%, na mobile ±5%.
     Liczy jedna pętla rAF i tylko dla zdjęć aktualnie widocznych; poza
     kadrem listener scrolla jest zdejmowany. */
  function initScrollFx() {
    if (!document.body || !document.body.hasAttribute('data-anim')) return;
    if (reduced.matches) return;

    var SKIP = 'header, footer, nav, .mnav';
    var ANIMATED = '[data-hero-zoom], [data-hero-fade], [data-hero-video]';

    /* Wysokość kadru czytamy z niewidocznej sondy 100svh: window.innerHeight
       skacze przy chowaniu paska adresu na iOS i parallax szarpie obrazem
       dokładnie w momencie zwijania paska. */
    var probe = document.createElement('div');
    probe.style.cssText = 'position:fixed; top:0; left:0; width:0; height:100svh; visibility:hidden; pointer-events:none';
    document.body.appendChild(probe);
    function vpH() { return probe.offsetHeight || window.innerHeight || document.documentElement.clientHeight; }

    /* Na mobile bloki na szkle (backdrop-filter) nie animują się po scrollu —
       przy zmianie krycia rozmycie przelicza się skokowo i tło mruga. */
    function glassy(el) {
      for (var p = el; p && p !== document.body; p = p.parentElement) {
        var cs = getComputedStyle(p);
        if ((cs.backdropFilter || cs.webkitBackdropFilter || 'none') !== 'none') return true;
      }
      return !!el.querySelector('[style*="backdrop-filter"]');
    }

    function flowKids(el) {
      return Array.prototype.filter.call(el.children, function (k) {
        if (k.hasAttribute('aria-hidden')) return false;
        var cs = getComputedStyle(k);
        return cs.position !== 'absolute' && cs.position !== 'fixed' && cs.display !== 'none';
      });
    }

    /* schodzimy w dół, dopóki sekcja ma tylko jeden pojemnik z treścią */
    function contentRoot(sec) {
      var el = sec;
      for (var i = 0; i < 4; i++) {
        var kids = flowKids(el);
        if (kids.length === 1 && kids[0].children.length > 1 && !kids[0].hasAttribute('data-hero')) {
          el = kids[0];
          continue;
        }
        break;
      }
      return el;
    }

    function tag(box, depth) {
      if (box.querySelector(ANIMATED)) return;
      var kids = flowKids(contentRoot(box));
      kids.forEach(function (k, i) {
        if (k.hasAttribute('data-rv') || k.style.transform) return;
        if (k.hasAttribute('data-hero') && depth < 1) { tag(k, depth + 1); return; }
        if (!mqDesktop.matches && glassy(k)) return;
        /* duże bloki obrazowe dostają sam fade (bez wjazdu od dołu) */
        k.setAttribute('data-rv', k.tagName === 'IMG' ? 'soft' : '');
        k.style.setProperty('--rvd', (Math.min(i, 5) * 0.07).toFixed(2) + 's');
      });
    }

    document.querySelectorAll('main section').forEach(function (sec) {
      if (sec.closest(SKIP)) return;
      tag(sec, 0);
    });

    /* --- parallax: zebranie zdjęć ------------------------------------- */
    var items = [];

    function clipper(el) {
      for (var p = el.parentElement; p && p !== document.body; p = p.parentElement) {
        var cs = getComputedStyle(p);
        if (cs.overflow !== 'visible' || cs.overflowY !== 'visible') return p;
        if (p.tagName === 'SECTION' || p.tagName === 'MAIN') return null;
      }
      return null;
    }

    /* zdjęcie w treści dostaje kadr kadrujący, żeby ruch nie rozpychał układu */
    function wrapInFrame(img) {
      var box = document.createElement('span');
      box.style.cssText = 'display:block; overflow:hidden; width:100%; border-radius:' + getComputedStyle(img).borderRadius;
      if (img.hasAttribute('data-rv')) {
        box.setAttribute('data-rv', 'soft');
        box.style.setProperty('--rvd', img.style.getPropertyValue('--rvd'));
        img.removeAttribute('data-rv');
        img.style.removeProperty('--rvd');
      }
      img.parentNode.insertBefore(box, img);
      box.appendChild(img);
      return box;
    }

    document.querySelectorAll('main img').forEach(function (img) {
      if (img.closest(SKIP)) return;
      if (img.matches(ANIMATED)) return;
      if (img.hasAttribute('data-nopx')) return;
      var abs = getComputedStyle(img).position === 'absolute';
      var frame = abs ? clipper(img) : null;
      if (abs && !frame) return;
      if (!abs) {
        if (!img.hasAttribute('data-px')) return;
        frame = wrapInFrame(img);
      }
      img.setAttribute('data-px', img.getAttribute('data-px') || '');
      items.push({ el: img, frame: frame, dir: img.getAttribute('data-px') === '-1' ? -1 : 1, on: false });
    });

    /* --- odsłanianie ---------------------------------------------------- */
    /* Zamiast IntersectionObservera lecimy jednym przebiegiem po liście
       elementów jeszcze nieodsłoniętych: obserwator nie zgłasza elementu
       przeskoczonego jednym susem (kotwica, klawisz End, przywrócona pozycja
       scrolla) i taka sekcja zostawałaby pusta. Lista tylko się kurczy, a gdy
       jest pusta — listener scrolla znika. Elementy z ukrytej gałęzi mają
       zerowy prostokąt i czekają na swoją szerokość ekranu. */
    var pending = Array.prototype.slice.call(document.querySelectorAll('[data-rv]'));

    function sweep() {
      if (!pending.length) return;
      var vh = vpH();
      var rest = [];
      for (var i = 0; i < pending.length; i++) {
        var el = pending[i];
        var r = el.getBoundingClientRect();
        if (!r.height && !r.width) { rest.push(el); continue; }
        if (r.top < vh * 0.92) el.classList.add('is-in'); else rest.push(el);
      }
      pending = rest;
    }

    /* --- parallax: pętla ------------------------------------------------ */
    var active = [];
    var listening = false;
    var queued = false;

    /* siła: ułamek wysokości kadru, o jaki obraz jedzie w każdą stronę */
    function amp() { return mqDesktop.matches ? 0.1 : 0.08; }

    function paintItem(it, vh, a, s) {
      var r = it.frame.getBoundingClientRect();
      if (!r.height) return;
      var p = (vh - r.top) / (vh + r.height);
      p = p < 0 ? 0 : (p > 1 ? 1 : p);
      var y = (0.5 - p) * 2 * a * r.height * it.dir;
      it.el.style.transform = 'translate3d(0,' + y.toFixed(1) + 'px,0) scale(' + s + ')';
    }

    function paintAll() {
      if (!active.length) return;
      var vh = vpH();
      var a = amp();
      /* zapas: skala co najmniej 1 + 2·amt (+1% na zaokrąglenia), żeby przy
         skrajnym wychyleniu nie wyszło tło kadru */
      var s = (1 + 2 * a + 0.01).toFixed(3);
      for (var i = 0; i < active.length; i++) paintItem(active[i], vh, a, s);
    }

    function frame() {
      queued = false;
      sweep();
      paintAll();
      sync();
    }

    function onScroll() {
      if (queued) return;
      queued = true;
      requestAnimationFrame(frame);
    }

    function setListener(want) {
      if (want === listening) return;
      listening = want;
      if (want) window.addEventListener('scroll', onScroll, { passive: true });
      else window.removeEventListener('scroll', onScroll, { passive: true });
    }

    function sync() { setListener(pending.length > 0 || active.length > 0); }

    var pxIo = new IntersectionObserver(function (entries) {
      entries.forEach(function (e) {
        var it = items.filter(function (x) { return x.frame === e.target; })[0];
        if (!it) return;
        it.on = e.isIntersecting;
        it.el.style.willChange = e.isIntersecting ? 'transform' : '';
        if (!e.isIntersecting) it.el.style.transform = '';
      });
      active = items.filter(function (x) { return x.on; });
      sync();
      paintAll();
    }, { rootMargin: '15% 0px' });

    items.forEach(function (it) { pxIo.observe(it.frame); });

    /* Dokument potrafi urosnąć po dociągnięciu leniwych zdjęć — jeśli stanie się
       to po ostatnim scrollu, kolejne zdarzenie nigdy nie przyjdzie i blok
       zostałby niewidoczny. Obserwator wysokości domyka listę i sam się zdejmuje. */
    if (window.ResizeObserver) {
      new ResizeObserver(onScroll).observe(document.body);
    }
    if (document.fonts && document.fonts.ready) document.fonts.ready.then(frame);

    /* pierwsze odsłonięcie o klatkę później — treść nad zgięciem też wjeżdża */
    requestAnimationFrame(function () { sweep(); paintAll(); sync(); });
    window.addEventListener('load', frame);
    onViewportChange(frame);
    mqDesktop.addEventListener('change', frame);
  }

  /* --- 11. pole pliku (CV): nazwa wybranego pliku + przeciągnij i upuść --- */
  /* Pojemnik [data-file] zawiera input[type=file], strefę [data-file-zone]
     i napis [data-file-name]. Bez skryptu pole dalej działa jak zwykły input. */
  function initFileField(box) {
    var input = box.querySelector('input[type="file"]');
    var zone = box.querySelector('[data-file-zone]');
    var name = box.querySelector('[data-file-name]');
    if (!input || !zone) return;
    var idle = name ? name.textContent : '';

    function show() {
      if (!name) return;
      var f = input.files && input.files[0];
      name.textContent = f ? f.name : idle;
    }
    function hi(on) {
      zone.style.borderColor = on ? '#c98236' : 'rgba(24,58,107,0.42)';
      zone.style.background = on ? 'rgba(201,130,54,0.07)' : '#fff';
    }

    input.addEventListener('change', show);
    zone.addEventListener('dragover', function (e) { e.preventDefault(); hi(true); });
    zone.addEventListener('dragleave', function () { hi(false); });
    zone.addEventListener('drop', function (e) {
      e.preventDefault();
      hi(false);
      var fl = e.dataTransfer && e.dataTransfer.files;
      if (!fl || !fl.length) return;
      try { input.files = fl; } catch (err) {}
      show();
    });
  }

  /* --- start ------------------------------------------------------------ */
  document.querySelectorAll('[data-menu]').forEach(initMenu);
  document.querySelectorAll('form').forEach(initForm);
  document.querySelectorAll('[data-file]').forEach(initFileField);
  document.querySelectorAll('[data-hero-video]').forEach(initHeroVideo);
  initHeroZoom();
  if (document.querySelector('[data-scroll-nav]')) initScrollNav();
  if (document.querySelector('[data-act="pick"]')) initOferty(document);
  if (document.querySelector('[data-gal-track]')) initOferta(document);
  document.querySelectorAll('[data-anchors]').forEach(initAnchorBar);
  initScrollFx();
  initHashJump();
})();
