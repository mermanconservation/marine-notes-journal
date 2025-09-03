// Marine Notes Journal - Weebly Theme JavaScript

(function() {
    'use strict';

    // Initialize theme when DOM is loaded
    document.addEventListener('DOMContentLoaded', function() {
        initTheme();
    });

    function initTheme() {
        // Add smooth scrolling to anchor links
        initSmoothScrolling();
        
        // Add intersection observer for animations
        initScrollAnimations();
        
        // Initialize mobile menu if needed
        initMobileMenu();
    }

    // Smooth scrolling for anchor links
    function initSmoothScrolling() {
        const links = document.querySelectorAll('a[href^="#"]');
        
        links.forEach(link => {
            link.addEventListener('click', function(e) {
                const targetId = this.getAttribute('href').substring(1);
                const target = document.getElementById(targetId);
                
                if (target) {
                    e.preventDefault();
                    target.scrollIntoView({
                        behavior: 'smooth',
                        block: 'start'
                    });
                }
            });
        });
    }

    // Scroll animations using Intersection Observer
    function initScrollAnimations() {
        const observerOptions = {
            threshold: 0.1,
            rootMargin: '0px 0px -50px 0px'
        };

        const observer = new IntersectionObserver((entries) => {
            entries.forEach(entry => {
                if (entry.isIntersecting) {
                    entry.target.classList.add('animate-in');
                }
            });
        }, observerOptions);

        // Observe elements that should animate
        const animatedElements = document.querySelectorAll('.feature-card, .article-card');
        animatedElements.forEach(el => observer.observe(el));
    }

    // Mobile menu functionality
    function initMobileMenu() {
        const menuToggle = document.querySelector('.mobile-menu-toggle');
        const mobileMenu = document.querySelector('.mobile-menu');
        
        if (menuToggle && mobileMenu) {
            menuToggle.addEventListener('click', function() {
                mobileMenu.classList.toggle('active');
                this.classList.toggle('active');
            });
        }
    }

    // Add utility functions for Weebly editor
    window.MarineNotesTheme = {
        // Function to handle dynamic content updates
        updateContent: function(selector, content) {
            const element = document.querySelector(selector);
            if (element) {
                element.innerHTML = content;
            }
        },

        // Function to handle image lazy loading
        initLazyLoading: function() {
            const images = document.querySelectorAll('img[data-src]');
            
            const imageObserver = new IntersectionObserver((entries) => {
                entries.forEach(entry => {
                    if (entry.isIntersecting) {
                        const img = entry.target;
                        img.src = img.dataset.src;
                        img.classList.remove('lazy');
                        imageObserver.unobserve(img);
                    }
                });
            });

            images.forEach(img => imageObserver.observe(img));
        }
    };

})();