(function () {
  'use strict';

  const navbar = document.getElementById('navbar');
  const navToggle = document.getElementById('nav-toggle');
  const navLinks = document.getElementById('nav-links');
  const allNavLinks = navLinks.querySelectorAll('a[href^="#"]');

  function onScroll() {
    navbar.classList.toggle('scrolled', window.scrollY > 40);
    updateActiveLink();
  }

  window.addEventListener('scroll', onScroll, { passive: true });

  navToggle.addEventListener('click', function () {
    const isOpen = navLinks.classList.toggle('open');
    navToggle.setAttribute('aria-expanded', isOpen ? 'true' : 'false');
  });

  allNavLinks.forEach(function (link) {
    link.addEventListener('click', function () {
      navLinks.classList.remove('open');
      navToggle.setAttribute('aria-expanded', 'false');
    });
  });

  const sections = Array.from(document.querySelectorAll('section[id]')).filter(function (el) {
    return document.querySelector('.nav-links a[href="#' + el.id + '"]');
  });

  function updateActiveLink() {
    let current = '';
    const scrollMid = window.scrollY + window.innerHeight / 3;
    sections.forEach(function (section) {
      if (section.offsetTop <= scrollMid) current = section.id;
    });
    allNavLinks.forEach(function (link) {
      link.classList.toggle('active', link.getAttribute('href') === '#' + current);
    });
  }

  onScroll();
})();