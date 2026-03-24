/* ═══════════════════════════════════════════════════
   sidebar.js — scroll-spy, expand/collapse, hamburger
   ═══════════════════════════════════════════════════ */

(function () {
  'use strict';

  const sidebar    = document.getElementById('sidebar');
  const overlay    = document.getElementById('sidebar-overlay');
  const hamburger  = document.getElementById('sb-hamburger');
  const expandBtn  = document.querySelector('.sb-expandable');
  const children   = document.querySelector('.sb-children');

  /* ── Hamburger / drawer ──────────────────────────── */
  function openSidebar() {
    sidebar.classList.add('is-open');
    overlay.classList.add('is-visible');
    document.body.style.overflow = 'hidden';
    hamburger.setAttribute('aria-expanded', 'true');
  }

  function closeSidebar() {
    sidebar.classList.remove('is-open');
    overlay.classList.remove('is-visible');
    document.body.style.overflow = '';
    hamburger.setAttribute('aria-expanded', 'false');
  }

  hamburger && hamburger.addEventListener('click', () => {
    sidebar.classList.contains('is-open') ? closeSidebar() : openSidebar();
  });

  overlay && overlay.addEventListener('click', closeSidebar);

  document.addEventListener('keydown', (e) => {
    if (e.key === 'Escape') closeSidebar();
  });

  /* ── Expand / collapse Design Work ──────────────── */
  function expandGroup() {
    children.classList.add('is-open');
    expandBtn.setAttribute('aria-expanded', 'true');
  }
  function collapseGroup() {
    children.classList.remove('is-open');
    expandBtn.setAttribute('aria-expanded', 'false');
  }
  function toggleGroup() {
    children.classList.contains('is-open') ? collapseGroup() : expandGroup();
  }

  expandBtn && expandBtn.addEventListener('click', toggleGroup);

  /* ── Smooth-scroll for sidebar links ────────────── */
  sidebar && sidebar.querySelectorAll('a.sb-item').forEach(link => {
    link.addEventListener('click', (e) => {
      const href = link.getAttribute('href');
      if (href && href.startsWith('#')) {
        e.preventDefault();
        const target = document.querySelector(href);
        if (target) {
          const navH = document.querySelector('nav') ? document.querySelector('nav').offsetHeight : 53;
          const top = target.getBoundingClientRect().top + window.scrollY - navH - 16;
          window.scrollTo({ top, behavior: 'smooth' });
        }
        // Close drawer on mobile after clicking
        if (window.innerWidth <= 900) closeSidebar();
      }
    });
  });

  /* ── Scroll-spy via IntersectionObserver ─────────── */
  const allItems = sidebar ? sidebar.querySelectorAll('[data-section]') : [];

  function setActive(id) {
    allItems.forEach(item => {
      const matches = item.dataset.section === id;
      item.classList.toggle('is-active', matches);
    });

    // Check if the active id is a feature child — auto-expand group
    const featureIds = [
      'feat-login','feat-dashboard','feat-shift-details',
      'feat-nurse-assignment','feat-profiles','feat-schedule',
      'feat-staff-mgmt','feat-audit-logs','design-work'
    ];
    if (featureIds.includes(id)) {
      expandGroup();
    }
  }

  // Collect all tracked sections in DOM order
  const sectionIds = [
    'context','product-understanding','design-work',
    'feat-login','feat-dashboard','feat-shift-details',
    'feat-nurse-assignment','feat-profiles','feat-schedule',
    'feat-staff-mgmt','feat-audit-logs',
    'visual-system','ux-decisions','reflection'
  ];

  let activeId = sectionIds[0];

  const observer = new IntersectionObserver((entries) => {
    entries.forEach(entry => {
      if (entry.isIntersecting) {
        activeId = entry.target.id;
        setActive(activeId);
      }
    });
  }, {
    rootMargin: '-10% 0px -80% 0px',
    threshold: 0
  });

  sectionIds.forEach(id => {
    const el = document.getElementById(id);
    if (el) observer.observe(el);
  });

  // Set initial active on load
  setActive(sectionIds[0]);

})();
