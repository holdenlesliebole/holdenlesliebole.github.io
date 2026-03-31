/* =============================================
   main.js — Portfolio interactivity
   - Sticky navbar on scroll
   - Mobile nav toggle
   - Active nav link on scroll
============================================= */

(function () {
  'use strict';

  const navbar = document.getElementById('navbar');
  const navToggle = document.getElementById('nav-toggle');
  const navLinks = document.getElementById('nav-links');
  const allNavLinks = navLinks.querySelectorAll('a[href^="#"]');

  // ---- Sticky navbar ----
  function onScroll() {
    if (window.scrollY > 40) {
      navbar.classList.add('scrolled');
    } else {
      navbar.classList.remove('scrolled');
    }
    updateActiveLink();
  }

  window.addEventListener('scroll', onScroll, { passive: true });

  // ---- Mobile nav toggle ----
  navToggle.addEventListener('click', function () {
    const isOpen = navLinks.classList.toggle('open');
    navToggle.setAttribute('aria-expanded', isOpen ? 'true' : 'false');
  });

  // Close mobile nav when a link is clicked
  allNavLinks.forEach(function (link) {
    link.addEventListener('click', function () {
      navLinks.classList.remove('open');
      navToggle.setAttribute('aria-expanded', 'false');
    });
  });

  // ---- Active link highlighting on scroll ----
  const sections = Array.from(
    document.querySelectorAll('section[id], div[id="home"]')
  ).filter(function (el) {
    return document.querySelector('.nav-links a[href="#' + el.id + '"]');
  });

  function updateActiveLink() {
    let current = '';
    const scrollMid = window.scrollY + window.innerHeight / 3;

    sections.forEach(function (section) {
      if (section.offsetTop <= scrollMid) {
        current = section.id;
      }
    });

    allNavLinks.forEach(function (link) {
      link.classList.toggle('active', link.getAttribute('href') === '#' + current);
    });
  }

  // Run once on load
  onScroll();
})();
