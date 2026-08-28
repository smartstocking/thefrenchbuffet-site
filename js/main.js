(function(){
  "use strict";

  /* ---------- Language switching ---------- */
  const STORAGE_KEY = 'tfb-lang';
  const deTexts = {}; // cache original German text per element (first run)
  let currentLang = localStorage.getItem(STORAGE_KEY) || 'de';

  function captureOriginals(){
    document.querySelectorAll('[data-i18n]').forEach(el=>{
      const key = el.getAttribute('data-i18n');
      deTexts[key] = { html: el.innerHTML, isOption: el.tagName === 'OPTION' };
    });
  }

  function applyLang(lang){
    document.documentElement.lang = lang;
    document.querySelectorAll('[data-i18n]').forEach(el=>{
      const key = el.getAttribute('data-i18n');
      if(lang === 'de'){
        el.innerHTML = deTexts[key] ? deTexts[key].html : el.innerHTML;
      } else {
        const dict = TRANSLATIONS[lang];
        if(dict && dict[key] !== undefined){
          el.innerHTML = dict[key];
        }
      }
    });
    document.querySelectorAll('.lang-btn').forEach(btn=>{
      btn.classList.toggle('active', btn.getAttribute('data-lang') === lang);
    });
    currentLang = lang;
    localStorage.setItem(STORAGE_KEY, lang);
    refreshReviewTranslations();
  }

  /* ---------- Optional review translation toggle ----------
     Reviews always show their authentic original text by default. If a
     translation into the site's current language is available (see
     REVIEW_TRANSLATIONS in translations.js), a small link lets visitors
     switch to it and back — same idea as Google's own "See translation". */
  function refreshReviewTranslations(){
    if(typeof REVIEW_TRANSLATIONS === 'undefined') return;
    document.querySelectorAll('.quote[data-review-id]').forEach(q=>{
      const data = REVIEW_TRANSLATIONS[q.getAttribute('data-review-id')];
      const btn = q.nextElementSibling && q.nextElementSibling.classList.contains('review-translate')
        ? q.nextElementSibling : null;
      if(!data || !btn) return;

      if(!q.dataset.original){ q.dataset.original = q.innerHTML; }
      // Any language change resets the card back to its original text.
      q.innerHTML = q.dataset.original;
      q.dataset.translated = 'false';

      if(currentLang === data.native || !data[currentLang]){
        btn.style.display = 'none';
        btn.onclick = null;
        return;
      }
      const labels = (typeof REVIEW_TOGGLE_LABELS !== 'undefined' && REVIEW_TOGGLE_LABELS[currentLang]) || { show:'See translation', original:'See original' };
      btn.style.display = '';
      btn.textContent = labels.show;
      btn.onclick = function(){
        if(q.dataset.translated === 'true'){
          q.innerHTML = q.dataset.original;
          q.dataset.translated = 'false';
          btn.textContent = labels.show;
        } else {
          q.innerHTML = data[currentLang];
          q.dataset.translated = 'true';
          btn.textContent = labels.original;
        }
      };
    });
  }

  /* ---------- Cookie consent (Google Consent Mode) ----------
     The Google tag is loaded with consent denied by default (see the
     inline script in <head>). Here we just react to the visitor's choice:
     remember it, re-apply it on later visits, and show the banner only
     when no choice has been recorded yet. */
  const CONSENT_KEY = 'tfb-consent';

  function grantConsent(){
    if(typeof gtag === 'function'){
      gtag('consent', 'update', {
        'ad_storage': 'granted',
        'ad_user_data': 'granted',
        'ad_personalization': 'granted',
        'analytics_storage': 'granted'
      });
    }
  }

  function initCookieConsent(){
    const banner = document.getElementById('cookieBanner');
    const acceptBtn = document.getElementById('cookieAccept');
    const declineBtn = document.getElementById('cookieDecline');
    if(!banner) return;

    const stored = localStorage.getItem(CONSENT_KEY);
    if(stored === 'granted'){
      grantConsent();
    } else if(stored !== 'denied'){
      banner.hidden = false;
    }

    if(acceptBtn){
      acceptBtn.addEventListener('click', ()=>{
        localStorage.setItem(CONSENT_KEY, 'granted');
        grantConsent();
        banner.hidden = true;
      });
    }
    if(declineBtn){
      declineBtn.addEventListener('click', ()=>{
        localStorage.setItem(CONSENT_KEY, 'denied');
        banner.hidden = true;
      });
    }
  }

  document.addEventListener('DOMContentLoaded', function(){
    captureOriginals();
    applyLang(currentLang);
    initCookieConsent();

    document.querySelectorAll('.lang-btn').forEach(btn=>{
      btn.addEventListener('click', ()=> applyLang(btn.getAttribute('data-lang')));
    });

    /* ---------- Hero video sound toggle ---------- */
    const heroVideo = document.getElementById('heroVideo');
    const heroSoundToggle = document.getElementById('heroSoundToggle');
    let heroSoundManuallyMuted = false;
    if(heroVideo && heroSoundToggle){
      heroSoundToggle.addEventListener('click', ()=>{
        heroVideo.muted = !heroVideo.muted;
        heroSoundManuallyMuted = heroVideo.muted;
        heroSoundToggle.setAttribute('aria-pressed', String(!heroVideo.muted));
      });

      /* Try to start with sound ON right away. Most browsers block audible
         autoplay on a visitor's very first page load (no exceptions possible —
         this is a hard browser security rule, not something the site controls),
         but some allow it once a visitor has engaged with the site's media
         before, or on later visits. So we attempt it immediately; if the
         browser rejects it we silently fall back to muted autoplay. */
      const tryStartWithSound = ()=>{
        heroVideo.muted = false;
        const playPromise = heroVideo.play();
        if(playPromise && playPromise.catch){
          playPromise.then(()=>{
            heroSoundToggle.setAttribute('aria-pressed','true');
          }).catch(()=>{
            heroVideo.muted = true;
            heroSoundToggle.setAttribute('aria-pressed','false');
            heroVideo.play().catch(()=>{});
          });
        }
      };
      tryStartWithSound();

      /* Fallback for the (common) case where the browser blocked sound above:
         any interaction with the page counts as a user gesture, so unmute
         automatically on the visitor's first scroll/click/keypress, unless
         they've explicitly muted it via the toggle. */
      const unmuteOnFirstInteraction = ()=>{
        if(!heroSoundManuallyMuted){
          heroVideo.muted = false;
          heroSoundToggle.setAttribute('aria-pressed','true');
        }
        ['scroll','click','keydown','touchstart'].forEach(evt=>
          document.removeEventListener(evt, unmuteOnFirstInteraction));
      };
      ['scroll','click','keydown','touchstart'].forEach(evt=>
        document.addEventListener(evt, unmuteOnFirstInteraction, {once:true, passive:true}));
    }

    /* ---------- Pause hero video (and its sound) once it's scrolled out of view ---------- */
    if(heroVideo && 'IntersectionObserver' in window){
      const heroVideoObserver = new IntersectionObserver((entries)=>{
        entries.forEach(entry=>{
          if(entry.isIntersecting){
            heroVideo.play().catch(()=>{});
          } else {
            heroVideo.pause();
          }
        });
      }, { threshold: 0.15 });
      heroVideoObserver.observe(heroVideo);

      /* Also pause if the browser tab/app loses focus, so it doesn't keep
         playing silently in the background — and resume if the hero is
         still on screen when focus returns. */
      document.addEventListener('visibilitychange', ()=>{
        if(document.hidden){
          heroVideo.pause();
        } else {
          const rect = heroVideo.getBoundingClientRect();
          if(rect.bottom > 0 && rect.top < window.innerHeight){
            heroVideo.play().catch(()=>{});
          }
        }
      });
    }

    /* ---------- Mobile menu ---------- */
    const burger = document.getElementById('burgerBtn');
    const mobileNav = document.getElementById('mobileNav');
    if(burger && mobileNav){
      burger.addEventListener('click', ()=>{
        mobileNav.classList.toggle('open');
      });
      mobileNav.querySelectorAll('a').forEach(a=>{
        a.addEventListener('click', ()=> mobileNav.classList.remove('open'));
      });
    }

    /* ---------- Lightbox for images ---------- */
    const lightbox = document.getElementById('lightbox');
    const lightboxImg = document.getElementById('lightboxImg');
    const lightboxClose = document.getElementById('lightboxClose');

    const items = document.querySelectorAll('.masonry-item');
    items.forEach(item=>{
      const img = item.querySelector('img');
      const video = item.querySelector('video');
      if(img){
        img.addEventListener('click', ()=>{
          lightboxImg.src = img.src;
          lightboxImg.alt = img.alt;
          lightbox.classList.add('open');
        });
      }
      if(video){
        const playBtn = item.querySelector('.play-btn');
        const togglePlay = ()=>{
          if(video.paused){
            video.play();
            video.setAttribute('controls','');
            if(playBtn) playBtn.style.display = 'none';
          }
        };
        video.addEventListener('click', togglePlay);
        if(playBtn) playBtn.addEventListener('click', togglePlay);
        video.addEventListener('pause', ()=>{ if(playBtn) playBtn.style.display = ''; });
      }
    });

    if(lightboxClose){
      lightboxClose.addEventListener('click', ()=> lightbox.classList.remove('open'));
      lightbox.addEventListener('click', (e)=>{ if(e.target === lightbox) lightbox.classList.remove('open'); });
    }

    /* ---------- Contact form -> email client ---------- */
    const form = document.getElementById('contactForm');
    if(form){
      form.addEventListener('submit', function(e){
        e.preventDefault();
        const data = new FormData(form);
        const email = data.get('email') || '';
        const eventtype = data.get('eventtype') || '';
        const guests = data.get('guests') || '';
        const message = data.get('message') || '';

        const subject = encodeURIComponent('Anfrage über thefrenchbuffet.de — ' + eventtype);
        const bodyLines = [
          'E-Mail: ' + email,
          'Art des Events: ' + eventtype,
          'Anzahl der Gäste: ' + (guests || '—'),
          '',
          'Nachricht:',
          message || '—'
        ];
        const body = encodeURIComponent(bodyLines.join('\n'));

        /* Google Ads conversion tracking: fires on the "Envoyer" click itself,
           since this form has no dedicated confirmation page to load (it opens
           the visitor's email client via mailto: instead). */
        if(typeof gtag === 'function'){
          gtag('event', 'conversion', {'send_to': 'AW-18412704316/T_s6CNyjw-gcELyk7stE'});
        }

        window.location.href = 'mailto:contact@thefrenchbuffet.de?subject=' + subject + '&body=' + body;
      });
    }
  });
})();
