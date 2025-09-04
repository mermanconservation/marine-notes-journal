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
        
        // Initialize form handlers
        initFormHandlers();
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

    // Form handlers for submission and contact forms
    function initFormHandlers() {
        const manuscriptForm = document.getElementById('manuscriptForm');
        const contactForm = document.getElementById('contactForm');
        
        if (manuscriptForm) {
            manuscriptForm.addEventListener('submit', function(e) {
                e.preventDefault();
                
                // Collect form data
                const formData = new FormData(this);
                const data = Object.fromEntries(formData);
                
                // Create email content
                const subject = encodeURIComponent(`Manuscript Submission: ${data.title}`);
                const body = encodeURIComponent(`
Manuscript Submission Details:

Title: ${data.title}
Type: ${data.manuscriptType}
Corresponding Author: ${data.correspondingAuthor}
Email: ${data.email}
Institution: ${data.institution}

All Authors:
${data.authors}

Abstract:
${data.abstract}

Keywords: ${data.keywords}

Cover Letter:
${data.coverLetter}

---
Please find attached manuscript files as mentioned in the submission guidelines.
                `);
                
                // Open email client
                const mailtoLink = `mailto:editor@marinenotesjournal.com?subject=${subject}&body=${body}`;
                window.open(mailtoLink, '_blank');
                
                // Show success message (you could replace this with a more elegant notification)
                showNotification('Your email client will open with the submission details. Please attach your manuscript files before sending.');
            });
        }
        
        if (contactForm) {
            contactForm.addEventListener('submit', function(e) {
                e.preventDefault();
                
                // Collect form data
                const formData = new FormData(this);
                const data = Object.fromEntries(formData);
                
                // Create email content
                const subject = encodeURIComponent(data.subject);
                const body = encodeURIComponent(`
Name: ${data.name}
Email: ${data.email}
Inquiry Type: ${data.inquiry_type}
Subject: ${data.subject}

Message:
${data.message}
                `);
                
                // Open email client
                const mailtoLink = `mailto:editor@marinenotesjournal.com?subject=${subject}&body=${body}`;
                window.open(mailtoLink, '_blank');
                
                // Show success message and reset form
                showNotification('Your email client should open with the message pre-filled. Please send when ready.');
                this.reset();
            });
        }
    }

    // Simple notification system
    function showNotification(message) {
        // Create notification element
        const notification = document.createElement('div');
        notification.className = 'notification';
        notification.textContent = message;
        notification.style.cssText = `
            position: fixed;
            top: 20px;
            right: 20px;
            background: hsl(200, 85%, 35%);
            color: white;
            padding: 1rem 1.5rem;
            border-radius: 0.5rem;
            box-shadow: 0 4px 12px rgba(0, 0, 0, 0.15);
            z-index: 1000;
            max-width: 400px;
            font-family: var(--font-sans);
        `;
        
        document.body.appendChild(notification);
        
        // Remove after 5 seconds
        setTimeout(() => {
            notification.remove();
        }, 5000);
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
        },

        // Function to show notifications
        showNotification: showNotification
    };

})();