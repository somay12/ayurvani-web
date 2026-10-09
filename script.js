(function () {
  'use strict';
  var header = document.querySelector('header');
  var menu = document.querySelector('.menu-toggle');
  var nav = document.getElementById('primary-nav');
  var reduceMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches;

  // Mobile navigation, scroll progress, and current-section state.
  function setMenuOpen(open) {
    menu.setAttribute('aria-expanded', String(open));
    menu.setAttribute('aria-label', open ? 'मेन्यू बंद करें' : 'मेन्यू खोलें');
    nav.classList.toggle('is-open', open);
  }
  menu.addEventListener('click', function () {
    setMenuOpen(menu.getAttribute('aria-expanded') !== 'true');
  });
  nav.addEventListener('click', function (event) {
    if (event.target.closest('a')) {
      setMenuOpen(false);
      if (window.matchMedia('(max-width: 860px)').matches) {
        window.setTimeout(function () { menu.focus(); }, 0);
      }
    }
  });
  document.addEventListener('keydown', function (event) {
    if (event.key === 'Escape' && menu.getAttribute('aria-expanded') === 'true') {
      setMenuOpen(false);
      menu.focus();
    }
  });
  var navLinks = nav.querySelectorAll('a[href^="#"]');
  navLinks.forEach(function (link) {
    link.addEventListener('pointerenter', function () { link.classList.add('is-highlighted'); });
    link.addEventListener('pointerleave', function () {
      if (link.getAttribute('aria-current') !== 'location') link.classList.remove('is-highlighted');
    });
    link.addEventListener('focus', function () { link.classList.add('is-highlighted'); });
    link.addEventListener('blur', function () {
      if (link.getAttribute('aria-current') !== 'location') link.classList.remove('is-highlighted');
    });
  });
  var sections = Array.prototype.map.call(navLinks, function (link) {
    return document.querySelector(link.getAttribute('href'));
  }).filter(Boolean);
  if ('IntersectionObserver' in window) {
    var activeObserver = new IntersectionObserver(function (entries) {
      entries.forEach(function (entry) {
        navLinks.forEach(function (link) {
          if (link.getAttribute('href') === '#' + entry.target.id) {
            if (entry.isIntersecting) {
              link.setAttribute('aria-current', 'location');
              link.classList.add('is-highlighted');
            } else {
              link.removeAttribute('aria-current');
              if (!link.matches(':hover') && !link.matches(':focus')) link.classList.remove('is-highlighted');
            }
          }
        });
      });
    }, { rootMargin: '-25% 0px -65% 0px' });
    sections.forEach(function (section) { activeObserver.observe(section); });
  }
  var progressBar = document.getElementById('scroll-progress-bar');
  function updateScroll() {
    var max = document.documentElement.scrollHeight - window.innerHeight;
    var percent = max > 0 ? window.scrollY / max * 100 : 0;
    progressBar.style.width = Math.min(100, Math.max(0, percent)) + '%';
    header.classList.toggle('is-scrolled', window.scrollY > 8);
  }
  updateScroll();
  window.addEventListener('scroll', updateScroll, { passive: true });

  // Reveal cards progressively without hiding content when motion is reduced.
  if (!reduceMotion && 'IntersectionObserver' in window) {
    var revealObserver = new IntersectionObserver(function (entries, observer) {
      entries.forEach(function (entry) {
        if (entry.isIntersecting) {
          entry.target.classList.add('is-visible');
          observer.unobserve(entry.target);
        }
      });
    }, { threshold: 0.12 });
    document.querySelectorAll('.rv,.reveal,.herb-card,.checks li,.cert,.incl li').forEach(function (item, index) {
      item.style.setProperty('--reveal-delay', Math.min(index % 4, 3) * 75 + 'ms');
      item.classList.add('will-reveal');
      revealObserver.observe(item);
    });
  }

  // Parent check-in: five non-diagnostic prompts, no answer data is stored.
  var quiz = document.querySelector('.checkin');
  if (quiz) {
    var prompts = [
      'बच्चा शब्द या आवाज़ दोहराता है?',
      'बच्चा बोलते समय आवाज़ को खींचता है?',
      'शब्द शुरू करते समय बच्चा रुक जाता है?',
      'क्या बच्चा Class में बोलने से बचता है?',
      'क्या बच्चा अपनी बात कहने में झिझकता है?'
    ];
    var question = document.getElementById('quiz-question');
    var answers = document.getElementById('quiz-answers');
    var result = document.getElementById('quiz-result');
    var progress = quiz.querySelector('.quiz-progress');
    var progressBar = document.getElementById('quiz-progress-bar');
    var stepLabel = document.getElementById('quiz-step-label');
    var index = 0;
    function renderQuestion(animate) {
      var answerButtons = answers.querySelectorAll('.quiz-answer');
      if (animate) answerButtons.forEach(function (button) { button.disabled = true; });
      question.classList.add('is-changing');
      window.setTimeout(function () {
        question.textContent = prompts[index];
        stepLabel.textContent = 'सवाल ' + (index + 1) + ' / ' + prompts.length;
        progress.setAttribute('aria-valuenow', String(index));
        progressBar.style.width = index / prompts.length * 100 + '%';
        question.classList.remove('is-changing');
        if (animate) answerButtons.forEach(function (button) { button.disabled = false; });
      }, animate && !reduceMotion ? 140 : 0);
    }
    answers.addEventListener('click', function (event) {
      if (!event.target.closest('.quiz-answer')) return;
      index += 1;
      if (index < prompts.length) renderQuestion(true);
      else {
        progress.setAttribute('aria-valuenow', '5');
        progressBar.style.width = '100%';
        stepLabel.textContent = 'Check-in पूरा हुआ';
        question.hidden = true;
        answers.hidden = true;
        result.hidden = false;
        result.querySelector('a').focus();
      }
    });
    document.getElementById('quiz-restart').addEventListener('click', function () {
      index = 0;
      question.hidden = false;
      answers.hidden = false;
      result.hidden = true;
      renderQuestion(false);
      answers.querySelector('button').focus();
    });
  }

  // Herb explorer: button semantics provide keyboard and screen-reader support.
  document.querySelectorAll('.herb[aria-controls]').forEach(function (button) {
    button.addEventListener('click', function () {
      var expanded = button.getAttribute('aria-expanded') === 'true';
      button.setAttribute('aria-expanded', String(!expanded));
      document.getElementById(button.getAttribute('aria-controls')).hidden = expanded;
    });
  });

  // Daily routine tracker: date-scoped localStorage with in-memory fallback.
  var steps = document.querySelectorAll('.routine-step');
  if (steps.length) {
    var date = new Date();
    var dayKey = 'ayurvani-routine-' + date.getFullYear() + '-' +
      String(date.getMonth() + 1).padStart(2, '0') + '-' + String(date.getDate()).padStart(2, '0');
    var trackerStatus = document.getElementById('tracker-status');
    var completed = [false, false, false, false];
    var storageAvailable = true;
    try {
      var saved = localStorage.getItem(dayKey);
      if (saved !== null) {
        var parsed = JSON.parse(saved);
        if (!Array.isArray(parsed) || parsed.length !== steps.length ||
            parsed.some(function (value) { return typeof value !== 'boolean'; })) {
          throw new Error('Saved routine has an unexpected format.');
        }
        completed = parsed;
      }
    } catch (error) {
      storageAvailable = false;
      trackerStatus.textContent = 'Routine इस बार browser में save नहीं हो सकी; आप फिर भी इसे track कर सकते हैं।';
    }
    function updateTracker(announce) {
      var count = completed.filter(Boolean).length;
      document.getElementById('tracker-count').textContent = 'आज ' + count + '/4 पूरे';
      var ring = document.getElementById('progress-ring');
      ring.setAttribute('aria-valuenow', String(count));
      document.getElementById('ring-value').style.strokeDashoffset = String(188.5 * (1 - count / 4));
      steps.forEach(function (button, step) {
        var done = completed[step];
        button.setAttribute('aria-pressed', String(done));
        button.classList.toggle('is-done', done);
      });
      if (announce && storageAvailable) trackerStatus.textContent = 'आज ' + count + '/4 routine steps पूरे।';
    }
    steps.forEach(function (button, step) {
      button.addEventListener('click', function () {
        completed[step] = !completed[step];
        if (storageAvailable) {
          try {
            localStorage.setItem(dayKey, JSON.stringify(completed));
          } catch (error) {
            storageAvailable = false;
            trackerStatus.textContent = 'इस browser में save नहीं हो सकी। यह पेज खुला रहने तक आपकी progress दिखाई देगी।';
          }
        }
        updateTracker(true);
      });
    });
    updateTracker(false);
  }

  // Relaxed breathing guide: alternating calm 4-second phases, with explicit stop.
  var breathButton = document.getElementById('breath-toggle');
  if (breathButton) {
    var breathOrb = document.getElementById('breath-orb');
    var breathPhase = document.getElementById('breath-phase');
    var breathTimer = null;
    var inhale = true;
    function setBreathPhase() {
      inhale = !inhale;
      breathOrb.classList.toggle('is-inhaling', inhale);
      breathPhase.textContent = inhale ? 'सांस लें' : 'धीरे बोलें';
    }
    breathButton.addEventListener('click', function () {
      var running = breathButton.getAttribute('aria-pressed') === 'true';
      if (running) {
        window.clearInterval(breathTimer);
        breathTimer = null;
        breathButton.setAttribute('aria-pressed', 'false');
        breathButton.textContent = 'शुरू करें';
        breathOrb.classList.remove('is-inhaling');
        breathPhase.textContent = 'आराम से रहें';
      } else {
        inhale = false;
        setBreathPhase();
        breathButton.setAttribute('aria-pressed', 'true');
        breathButton.textContent = 'रोकें';
        breathTimer = window.setInterval(setBreathPhase, 4000);
      }
    });
  }

  // Verified-count animation remains inactive until the owner supplies a real count.
  var countCard = document.querySelector('[data-count-target]');
  if (countCard && Number(countCard.getAttribute('data-count-target')) > 0 &&
      'IntersectionObserver' in window) {
    var countValue = document.getElementById('customer-count');
    var targetCount = Number(countCard.getAttribute('data-count-target'));
    var countObserver = new IntersectionObserver(function (entries, observer) {
      if (!entries[0].isIntersecting) return;
      var start = performance.now();
      function draw(now) {
        var ratio = Math.min(1, (now - start) / 1200);
        countValue.textContent = Math.floor(targetCount * (1 - Math.pow(1 - ratio, 3))).toLocaleString('en-IN') + (ratio === 1 ? '+' : '');
        if (ratio < 1) requestAnimationFrame(draw);
      }
      if (reduceMotion) countValue.textContent = targetCount.toLocaleString('en-IN') + '+';
      else requestAnimationFrame(draw);
      observer.disconnect();
    }, { threshold: 0.5 });
    countObserver.observe(countCard);
  }

  // Testimonial slider supports swipe, dots, and pauses during hover/focus.
  var slider = document.getElementById('testimonial-slider');
  if (slider) {
    var track = document.getElementById('testimonial-track');
    var slides = slider.querySelectorAll('.testimonial-slide');
    var dots = slider.querySelectorAll('.slider-dot');
    var currentSlide = 0;
    var sliderTimer = null;
    function showSlide(next, smooth) {
      currentSlide = (next + slides.length) % slides.length;
      track.scrollTo({ left: currentSlide * track.clientWidth, behavior: smooth && !reduceMotion ? 'smooth' : 'auto' });
      dots.forEach(function (dot, dotIndex) {
        dot.classList.toggle('is-active', dotIndex === currentSlide);
        dot.setAttribute('aria-current', dotIndex === currentSlide ? 'true' : 'false');
      });
    }
    dots.forEach(function (dot) {
      dot.addEventListener('click', function () { showSlide(Number(dot.getAttribute('data-slide')), true); });
    });
    var scrollTimer;
    track.addEventListener('scroll', function () {
      window.clearTimeout(scrollTimer);
      scrollTimer = window.setTimeout(function () {
        var next = Math.round(track.scrollLeft / track.clientWidth);
        if (next >= 0 && next < slides.length) showSlide(next, false);
      }, 100);
    }, { passive: true });
    function pauseSlider() { window.clearInterval(sliderTimer); sliderTimer = null; }
    function startSlider() {
      if (reduceMotion || slides.length < 2 || sliderTimer) return;
      sliderTimer = window.setInterval(function () { showSlide(currentSlide + 1, true); }, 6000);
    }
    slider.addEventListener('mouseenter', pauseSlider);
    slider.addEventListener('mouseleave', startSlider);
    slider.addEventListener('focusin', pauseSlider);
    slider.addEventListener('focusout', function (event) {
      if (!slider.contains(event.relatedTarget)) startSlider();
    });
    document.addEventListener('visibilitychange', function () {
      if (document.hidden) pauseSlider();
      else if (!slider.matches(':hover') && !slider.contains(document.activeElement)) startSlider();
    });
    startSlider();
  }

  // FAQ answers use a CSS grid transition and retain native <details> behavior.
  document.querySelectorAll('details').forEach(function (item) {
    var summary = item.querySelector('summary');
    var panel = item.querySelector('.faq-panel');
    var closeTimer;
    summary.addEventListener('click', function (event) {
      event.preventDefault();
      if (!item.open) {
        item.open = true;
        item.classList.remove('is-closing');
        return;
      }
      if (item.classList.contains('is-closing')) return;
      item.classList.add('is-closing');
      var finishClose = function () {
        if (!item.classList.contains('is-closing')) return;
        item.open = false;
        item.classList.remove('is-closing');
      };
      panel.addEventListener('transitionend', finishClose, { once: true });
      closeTimer = window.setTimeout(finishClose, reduceMotion ? 20 : 350);
    });
    item.addEventListener('toggle', function () {
      if (closeTimer) window.clearTimeout(closeTimer);
    });
  });

  // Floating mobile CTA is hidden whenever the order form is on screen.
  var orderForm = document.getElementById('formbox');
  if (orderForm) {
    var hero = document.querySelector('.hero');
    function updateFloatingVisibility() {
      var formRect = orderForm.getBoundingClientRect();
      var heroRect = hero.getBoundingClientRect();
      document.body.classList.toggle('order-visible', formRect.top < window.innerHeight && formRect.bottom > 0);
      document.body.classList.toggle('hero-visible', heroRect.top < window.innerHeight && heroRect.bottom > 0);
    }
    updateFloatingVisibility();
    window.addEventListener('scroll', updateFloatingVisibility, { passive: true });
    window.addEventListener('resize', updateFloatingVisibility);
  }

  // Disable the WhatsApp placeholder so visitors are not sent to a fake contact.
  var whatsapp = document.querySelector('.whatsapp-float');
  if (whatsapp && /X/.test(new URL(whatsapp.href).pathname)) {
    whatsapp.setAttribute('aria-disabled', 'true');
    whatsapp.setAttribute('title', 'वास्तविक WhatsApp नंबर जोड़ने के बाद उपलब्ध होगा');
    whatsapp.addEventListener('click', function (event) { event.preventDefault(); });
  }

  // Order form: validate locally, show honest demo feedback, and expose CRM integration point.
  var form = document.getElementById('f');
  var nameInput = document.getElementById('n');
  var mobileInput = document.getElementById('m');
  var formMessage = document.getElementById('form-message');
  var submitButton = document.getElementById('form-submit');
  mobileInput.addEventListener('input', function () {
    mobileInput.value = mobileInput.value.replace(/\D/g, '').slice(0, 10);
  });
  function setError(input, errorId, message) {
    document.getElementById(errorId).textContent = message;
    input.setAttribute('aria-invalid', message ? 'true' : 'false');
  }
  [nameInput, mobileInput].forEach(function (input) {
    input.addEventListener('input', function () {
      var errorId = input === nameInput ? 'en' : 'em';
      if (input.getAttribute('aria-invalid') === 'true') setError(input, errorId, '');
      formMessage.textContent = '';
      formMessage.classList.remove('is-success');
    });
  });
  // TODO: Add the verified CRM or Google Sheet endpoint before collecting real enquiries.
  var CRM_ENDPOINT = '';
  form.addEventListener('submit', async function (event) {
    event.preventDefault();
    var valid = true;
    if (nameInput.value.trim().length < 2) {
      setError(nameInput, 'en', 'कृपया अपना नाम लिखें।');
      valid = false;
    } else setError(nameInput, 'en', '');
    if (!/^[6-9]\d{9}$/.test(mobileInput.value)) {
      setError(mobileInput, 'em', 'कृपया सही 10 अंकों का मोबाइल नंबर लिखें।');
      valid = false;
    } else setError(mobileInput, 'em', '');
    if (!valid) {
      formMessage.textContent = '';
      (nameInput.getAttribute('aria-invalid') === 'true' ? nameInput : mobileInput).focus();
      return;
    }
    submitButton.disabled = true;
    submitButton.setAttribute('aria-busy', 'true');
    submitButton.textContent = 'कृपया प्रतीक्षा करें…';
    formMessage.classList.remove('is-success');
    try {
      if (CRM_ENDPOINT) {
        var response = await fetch(CRM_ENDPOINT, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ name: nameInput.value.trim(), mobile: mobileInput.value })
        });
        if (!response.ok) throw new Error('Enquiry submission failed: ' + response.status);
        formMessage.textContent = 'धन्यवाद। आपकी जानकारी सफलतापूर्वक भेज दी गई है।';
      } else {
        await new Promise(function (resolve) { window.setTimeout(resolve, 350); });
        formMessage.textContent = 'जानकारी सही है। यह demo form है; आपकी जानकारी कहीं भेजी नहीं गई।';
      }
      formMessage.classList.add('is-success');
    } catch (error) {
      formMessage.textContent = 'जानकारी भेजी नहीं जा सकी। कृपया बाद में फिर कोशिश करें।';
      console.error(error);
    } finally {
      submitButton.disabled = false;
      submitButton.removeAttribute('aria-busy');
      submitButton.textContent = 'जानकारी जाँचें →';
    }
  });
})();
