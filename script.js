// Function to handle theme switching
function toggleTheme() {
  const html = document.documentElement;
  const btn = document.querySelector('.theme-btn');
  const isDark = html.getAttribute('data-theme') === 'dark';
  
  const newTheme = isDark ? 'light' : 'dark';
  html.setAttribute('data-theme', newTheme);
  
  if (btn) btn.textContent = newTheme === 'dark' ? '☀️' : '🌙';
  localStorage.setItem('theme', newTheme);
}

// Initialize theme on load
const savedTheme = localStorage.getItem('theme') || 'light';
document.documentElement.setAttribute('data-theme', savedTheme);

// Attach event listeners to the theme button
const themeBtn = document.querySelector('.theme-btn');
if (themeBtn) {
  themeBtn.textContent = savedTheme === 'dark' ? '☀️' : '🌙';
  // Standard click
  themeBtn.addEventListener('click', toggleTheme);
  // Mobile Safari touch fix (prevents tap-delay issues)
  themeBtn.addEventListener('touchstart', (e) => {
    e.preventDefault(); 
    toggleTheme();
  }, { passive: false });
}

// Animation observer for cards
const cards = document.querySelectorAll('.feat, .result-card, .trend-card, .about-card');
const observer = new IntersectionObserver((entries) => {
  entries.forEach((entry, i) => {
    if (entry.isIntersecting) {
      setTimeout(() => {
        entry.target.style.opacity = '1';
        entry.target.style.transform = 'translateY(0)';
      }, i * 100);
      observer.unobserve(entry.target);
    }
  });
}, { threshold: 0.1 });

cards.forEach(card => {
  card.style.opacity = '0';
  card.style.transform = 'translateY(24px)';
  card.style.transition = 'opacity 0.5s ease, transform 0.5s ease';
  observer.observe(card);
});

// CTA and Nav Button listeners
const cta = document.querySelector('.cta-card');
if (cta) cta.addEventListener('click', () => window.location.href = 'search.html');
const navBtn = document.querySelector('.nav-btn');
if (navBtn) navBtn.addEventListener('click', () => window.location.href = 'search.html');
