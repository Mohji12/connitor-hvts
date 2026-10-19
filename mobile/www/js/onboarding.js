(function () {
  const SLIDES = [
    {
      id: 'visitor',
      title: 'Make hospital visits easy',
      image: 'assets/onboarding/hero-meeting.png',
      bullets: [
        'Find your doctor and pick an available slot',
        'Pay the visit fee from wallet or online',
        'Doctor confirms — then show your gate QR to check in and out',
      ],
    },
    {
      id: 'delivery',
      title: 'Deliveries without the queue',
      image: 'assets/onboarding/hero-delivery.png',
      bullets: [
        'Book an unload window that fits your vehicle',
        'Pay from the distributor wallet',
        'Driver gets a WhatsApp pass — security scans for entry and exit',
      ],
    },
    {
      id: 'attendant',
      title: 'Family visit passes at the gate',
      image: 'assets/onboarding/hero-attendant.png',
      bullets: [
        'Scan the hospital QR at reception or the security gate',
        'Primary attendant approves on WhatsApp',
        'Get today’s pass — security scans the QR at the gate',
      ],
    },
  ];

  function appHome() {
    const base =
      (window.__CONNINTER__ && window.__CONNINTER__.appHome) || 'https://www.conninter.com/app/';
    try {
      const url = new URL(base);
      url.searchParams.set('native', '1');
      return url.toString();
    } catch {
      return base.includes('?') ? `${base}&native=1` : `${base}?native=1`;
    }
  }

  function finish() {
    window.ConninterStorage.setHasCompletedOnboarding(true);
    window.location.replace(appHome());
  }

  document.addEventListener('DOMContentLoaded', () => {
    const track = document.getElementById('track');
    const dots = document.getElementById('dots');
    const nextBtn = document.getElementById('next-btn');
    const skipBtn = document.getElementById('skip-btn');
    if (!track || !dots || !nextBtn || !skipBtn) return;

    SLIDES.forEach((slide, i) => {
      const section = document.createElement('section');
      section.className = 'slide';
      section.dataset.index = String(i);
      section.innerHTML = `
        <div class="slide-hero">
          <img src="${slide.image}" alt="${slide.title}" />
        </div>
        <h1 class="slide-title">${slide.title}</h1>
        <ul class="bullets">
          ${slide.bullets
            .map(
              (b, bi) =>
                `<li><span class="bullet-num">${bi + 1}</span><span>${b}</span></li>`,
            )
            .join('')}
        </ul>
      `;
      track.appendChild(section);

      const dot = document.createElement('span');
      dot.className = 'dot' + (i === 0 ? ' is-active' : '');
      dots.appendChild(dot);
    });

    let index = 0;
    const dotEls = () => Array.from(dots.querySelectorAll('.dot'));

    function setIndex(next, { pushHistory = true } = {}) {
      index = Math.max(0, Math.min(SLIDES.length - 1, next));
      const width = track.clientWidth;
      track.scrollTo({ left: width * index, behavior: 'smooth' });
      dotEls().forEach((d, i) => d.classList.toggle('is-active', i === index));
      const last = index === SLIDES.length - 1;
      nextBtn.textContent = last ? 'Continue' : 'Next';
      skipBtn.hidden = last;
      if (pushHistory) {
        history.pushState({ onboardingSlide: index }, '', `#${index}`);
      }
    }

    // Seed history so phone Back walks slides, then leaves the page.
    history.replaceState({ onboardingSlide: 0 }, '', '#0');

    track.addEventListener(
      'scroll',
      () => {
        const next = Math.round(track.scrollLeft / Math.max(track.clientWidth, 1));
        if (next !== index && next >= 0 && next < SLIDES.length) {
          index = next;
          dotEls().forEach((d, i) => d.classList.toggle('is-active', i === index));
          const last = index === SLIDES.length - 1;
          nextBtn.textContent = last ? 'Continue' : 'Next';
          skipBtn.hidden = last;
        }
      },
      { passive: true },
    );

    nextBtn.addEventListener('click', () => {
      if (index >= SLIDES.length - 1) {
        finish();
        return;
      }
      setIndex(index + 1);
    });

    skipBtn.addEventListener('click', finish);

    window.addEventListener('popstate', (event) => {
      const slide = event.state && typeof event.state.onboardingSlide === 'number'
        ? event.state.onboardingSlide
        : 0;
      setIndex(slide, { pushHistory: false });
    });

    // Expose for native bridge / debugging
    window.ConninterOnboarding = {
      prev() {
        if (index > 0) setIndex(index - 1);
      },
      next() {
        if (index < SLIDES.length - 1) setIndex(index + 1);
        else finish();
      },
    };
  });
})();
