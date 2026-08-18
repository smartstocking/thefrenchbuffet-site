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
  }

  document.addEventListener('DOMContentLoaded', function(){
    captureOriginals();
    applyLang(currentLang);

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

      /* Browsers block audible autoplay, but any user interaction with the
         page counts as a gesture — so unmute automatically on the visitor's
         first scroll/click/keypress, unless they've explicitly muted it. */
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
        window.location.href = 'mailto:contact@thefrenchbuffet.de?subject=' + subject + '&body=' + body;
      });
    }
  });
})();
