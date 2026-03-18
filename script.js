document.addEventListener("DOMContentLoaded", () => {

  /* ===== HAMBURGER MENU ===== */
  const hamburger = document.querySelector('.hamburger');
  const navLinks = document.querySelector('.navbar-links');

  if (hamburger && navLinks) {
    hamburger.addEventListener('click', () => {
      const isOpen = navLinks.classList.toggle('open');
      hamburger.classList.toggle('open', isOpen);
      hamburger.setAttribute('aria-expanded', isOpen ? 'true' : 'false');
    });

    navLinks.querySelectorAll('a').forEach(link => {
      link.addEventListener('click', () => {
        navLinks.classList.remove('open');
        hamburger.classList.remove('open');
        hamburger.setAttribute('aria-expanded', 'false');
      });
    });

    document.addEventListener('click', (e) => {
      if (!hamburger.contains(e.target) && !navLinks.contains(e.target)) {
        navLinks.classList.remove('open');
        hamburger.classList.remove('open');
        hamburger.setAttribute('aria-expanded', 'false');
      }
    });
  }

  /* ===== CAROUSEL (présent uniquement sur Index) ===== */
  const track = document.querySelector(".carousel-track");

  if (track) {
    const btnNext = document.querySelector(".next");
    const btnPrev = document.querySelector(".prev");
    let isMoving = false;

    function getItems() {
      return Array.from(track.querySelectorAll("img"));
    }

    function updateClasses() {
      getItems().forEach((img, i) => {
        img.className = (i === 1) ? "center" : "side";
      });
    }

    function move(dir) {
      if (isMoving) return;
      isMoving = true;

      const items = getItems();
      const gap = parseInt(getComputedStyle(track).gap) || 8;
      const dist = items[0].offsetWidth + gap;

      track.style.transition = "transform 0.5s cubic-bezier(0.4, 0, 0.2, 1)";
      track.style.transform = `translateX(${dir === 1 ? -dist : dist}px)`;

      if (dir === 1) {
        if (items[2]) items[2].className = "center";
        items[1].className = "side";
        items[0].className = "side";
      } else {
        items[0].className = "center";
        items[1].className = "side";
        if (items[2]) items[2].className = "side";
      }

      setTimeout(() => {
        track.style.transition = "none";
        track.style.transform = "translateX(0)";
        if (dir === 1) {
          track.appendChild(items[0]);
        } else {
          track.prepend(items[items.length - 1]);
        }
        updateClasses();
        isMoving = false;
      }, 500);
    }

    if (btnNext && btnPrev) {
      btnNext.addEventListener("click", () => move(1));
      btnPrev.addEventListener("click", () => move(-1));
    }

    let touchStartX = 0;
    track.addEventListener("touchstart", (e) => {
      touchStartX = e.changedTouches[0].clientX;
    }, { passive: true });
    track.addEventListener("touchend", (e) => {
      const diff = e.changedTouches[0].clientX - touchStartX;
      if (Math.abs(diff) > 40) move(diff < 0 ? 1 : -1);
    }, { passive: true });
  }

  /* ===== FAQ ACCORDÉON ===== */
  const faqItems = document.querySelectorAll('.faq-item');

  if (faqItems.length) {
    faqItems.forEach(item => {
      const summary = item.querySelector('.faq-question');
      if (!summary) return;

      // Clic sur la question OU sur tout le container
      [item, summary].forEach(el => {
        el.addEventListener('click', (e) => {
          // Évite le double déclenchement si clic sur summary (qui bubble vers item)
          if (e.currentTarget === item && e.target.closest('.faq-question')) return;
          e.preventDefault();

          const isOpen = item.hasAttribute('open');

          // Ferme tous les items ouverts
          faqItems.forEach(other => other.removeAttribute('open'));

          // Ouvre uniquement si c'était fermé
          if (!isOpen) item.setAttribute('open', '');
        });
      });
    });

    // Ferme au clic dans le vide (hors FAQ)
    document.addEventListener('click', (e) => {
      if (!e.target.closest('.faq-item')) {
        faqItems.forEach(item => item.removeAttribute('open'));
      }
    });
  }

  /* ===== SCROLL ANIMATIONS ===== */
  const isMobile = window.innerWidth < 768;

  const scrollObserver = new IntersectionObserver((entries) => {
    entries.forEach(entry => {
      if (entry.isIntersecting) {
        entry.target.classList.add('visible');
        scrollObserver.unobserve(entry.target);
      }
    });
  }, { threshold: isMobile ? 0.08 : 0.15 });

  document.querySelectorAll('.animate-on-scroll').forEach(el => {
    scrollObserver.observe(el);
  });

  /* ===== FLOATING HELP ===== */
  const helpBtn = document.getElementById('helpBtn');
  const floatingActions = document.getElementById('floating-actions');
  const overlay = document.getElementById('page-blur-overlay');

  function openHelper() {
    floatingActions.classList.add('open');
    if (overlay) overlay.classList.add('active');
    helpBtn.textContent = '×';
    helpBtn.setAttribute('aria-expanded', 'true');
  }

  function closeHelper() {
    floatingActions.classList.remove('open');
    if (overlay) overlay.classList.remove('active');
    helpBtn.textContent = '?';
    helpBtn.setAttribute('aria-expanded', 'false');
  }

  if (helpBtn && floatingActions) {
    helpBtn.addEventListener('click', (e) => {
      e.stopPropagation();
      floatingActions.classList.contains('open') ? closeHelper() : openHelper();
    });

    if (overlay) {
      overlay.addEventListener('click', () => closeHelper());
    }

    document.addEventListener('click', (e) => {
      if (!helpBtn.contains(e.target) && !floatingActions.contains(e.target)) {
        closeHelper();
      }
    });
  }

});

/* ===== UTILITAIRES localStorage sécurisés (Safari navigation privée) ===== */
function lsGet(key) {
  try { return localStorage.getItem(key); } catch (e) { return null; }
}
function lsSet(key, val) {
  try { localStorage.setItem(key, val); } catch (e) { /* stockage indisponible, silencieux */ }
}

function loadThirdPartyContent() {
  document.querySelectorAll('iframe.requires-cookies').forEach(iframe => {
    const dataSrc = iframe.getAttribute('data-src');
    if (dataSrc) {
      iframe.src = dataSrc;
      const placeholder = iframe.nextElementSibling;
      if (placeholder && placeholder.classList.contains('cookie-placeholder')) {
        placeholder.style.display = 'none';
      }
    }
  });
}

function acceptCookies() {
  lsSet('cookie_consent', 'accepted');
  const banner = document.getElementById('cookie-banner');
  if (banner) banner.style.display = 'none';
  loadThirdPartyContent();
  if (!document.querySelector('script[src*="emailjs"]')) {
    var s1 = document.createElement('script');
    s1.src = 'https://cdn.jsdelivr.net/npm/@emailjs/browser@4/dist/email.min.js';
    s1.onload = function() { if (typeof initEmailJS === 'function') initEmailJS(); };
    document.head.appendChild(s1);
  }
  if (!document.querySelector('script[src*="recaptcha"]')) {
    var s2 = document.createElement('script');
    s2.src = 'https://www.google.com/recaptcha/api.js?render=6Ldup4osAAAAACCUSh7PHbTCISNPjY-ABHnM6h1H';
    s2.async = true;
    document.head.appendChild(s2);
  }
}

function refuseCookies() {
  lsSet('cookie_consent', 'refused');
  const banner = document.getElementById('cookie-banner');
  if (banner) banner.style.display = 'none';
}

(function initCookies() {
  const consent = lsGet('cookie_consent');
  const banner = document.getElementById('cookie-banner');
  if (consent === 'accepted') {
    if (banner) banner.style.display = 'none';
    window.addEventListener('load', loadThirdPartyContent);
    if (!document.querySelector('script[src*="emailjs"]')) {
      var s1 = document.createElement('script');
      s1.src = 'https://cdn.jsdelivr.net/npm/@emailjs/browser@4/dist/email.min.js';
      s1.onload = function() { if (typeof initEmailJS === 'function') initEmailJS(); };
      document.head.appendChild(s1);
    }
    if (!document.querySelector('script[src*="recaptcha"]')) {
      var s2 = document.createElement('script');
      s2.src = 'https://www.google.com/recaptcha/api.js?render=6Ldup4osAAAAACCUSh7PHbTCISNPjY-ABHnM6h1H';
      s2.async = true;
      document.head.appendChild(s2);
    }
  } else if (consent === 'refused') {
    if (banner) banner.style.display = 'none';
  }
})();