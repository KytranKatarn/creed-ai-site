/* app.js — Entry point for creed-ai.org
 * Dependencies: gsap (optional, .magnetic only), Effects
 * Nav is now <creed-nav> in creed-shell.js. Barba/Lenis removed: Barba swapped only
 * <main>, so per-page CSS and JS never loaded on in-site links. css/base.css already
 * sets html { scroll-behavior: smooth }, which is what Lenis was for.
 */

document.addEventListener('DOMContentLoaded', function () {
    'use strict';

        /* ---- Core Initialization ---- */
    Effects.init();

    /* ---- Page-Specific Init ---- */
    var page = document.querySelector('[data-barba-namespace]');
    var namespace = page ? page.getAttribute('data-barba-namespace') : '';

    switch (namespace) {
        case 'home':
            // Particle canvas init will go here
            break;
        case 'manifesto':
            if (typeof Manifesto !== 'undefined' && typeof Manifesto.init === 'function') Manifesto.init();
            break;
        case 'governance':
            if (typeof Governance !== 'undefined' && typeof Governance.init === 'function') Governance.init();
            break;
    }
});
