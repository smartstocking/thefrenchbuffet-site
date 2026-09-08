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

    /* ---------- Contact form -> Formspree ----------
       Submitted via fetch() straight to Formspree so the request reaches us
       reliably, regardless of whether the visitor has an email client
       configured (the previous mailto: link silently failed for anyone
       without one set up, especially on desktop). */
    const FORM_MESSAGES = {
      de: {
        sending: 'Wird gesendet…',
        success: 'Danke! Ihre Anfrage wurde erfolgreich versendet. Wir melden uns innerhalb von 24 Stunden.',
        error: 'Es gab ein Problem beim Senden. Bitte versuchen Sie es erneut oder schreiben Sie uns direkt an contact@thefrenchbuffet.de.'
      },
      en: {
        sending: 'Sending…',
        success: 'Thank you! Your request has been sent successfully. We’ll get back to you within 24 hours.',
        error: 'Something went wrong while sending. Please try again or email us directly at contact@thefrenchbuffet.de.'
      },
      fr: {
        sending: 'Envoi en cours…',
        success: 'Merci ! Votre demande a bien été envoyée. Nous vous répondons sous 24 heures.',
        error: 'Une erreur est survenue lors de l’envoi. Merci de réessayer ou de nous écrire directement à contact@thefrenchbuffet.de.'
      }
    };

    const form = document.getElementById('contactForm');
    if(form){
      form.addEventListener('submit', function(e){
        e.preventDefault();
        const submitBtn = form.querySelector('button[type="submit"]');
        const statusEl = document.getElementById('formStatus');
        const msgs = FORM_MESSAGES[currentLang] || FORM_MESSAGES.de;
        const originalBtnText = submitBtn.textContent;

        submitBtn.disabled = true;
        submitBtn.textContent = msgs.sending;
        statusEl.hidden = true;
        statusEl.classList.remove('form-status--error', 'form-status--success');

        fetch(form.action, {
          method: 'POST',
          body: new FormData(form),
          headers: { 'Accept': 'application/json' }
        }).then(function(response){
          if(!response.ok){ throw new Error('Form submission failed'); }

          /* Google Ads conversion tracking: fires once the request has
             actually been delivered, not just on the click. */
          if(typeof gtag === 'function'){
            gtag('event', 'conversion', {'send_to': 'AW-18412704316/T_s6CNyjw-gcELyk7stE'});
          }

          form.reset();
          statusEl.textContent = msgs.success;
          statusEl.classList.add('form-status--success');
          statusEl.hidden = false;
        }).catch(function(){
          statusEl.textContent = msgs.error;
          statusEl.classList.add('form-status--error');
          statusEl.hidden = false;
        }).finally(function(){
          submitBtn.disabled = false;
          submitBtn.textContent = originalBtnText;
        });
      });
    }

    /* ---------- Click-to-call conversion tracking ---------- */
    /* Secondary Google Ads conversion (observation only, not used for bid
       optimization): fires whenever a visitor taps a tel: link, whether
       that's the "Anrufen" button near the contact form or the phone
       number in the footer. Reported to both Google Ads accounts tied to
       this business: AW-18412704316 is the live "Catering in Berlin"
       account, AW-18328755697 the other (currently paused) account. */
    const telLinks = document.querySelectorAll('a[href^="tel:"]');
    telLinks.forEach(function(link){
      link.addEventListener('click', function(){
        if(typeof gtag === 'function'){
          gtag('event', 'conversion', {'send_to': 'AW-18412704316/1V8yCOOuq-scELyk7stE'});
          gtag('event', 'conversion', {'send_to': 'AW-18328755697/yIyVCOOk5eocEPG76qNE'});
        }
      });
    });
  });
})();
