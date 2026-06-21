// Scroll to CTA on button click
document.querySelector('.nav-btn').addEventListener('click', () => {
  document.querySelector('.cta-card').scrollIntoView({ behavior: 'smooth' });
});

// Click action for CTA
document.querySelector('.cta-card').addEventListener('click', () => {
  alert('Shoplens AI engine is activating...');
});

// Simple fade-in for features
const features = document.querySelectorAll('.feat');
features.forEach((feat, index) => {
  feat.style.opacity = '0';
  feat.style.transition = `opacity 0.8s ease ${index * 0.2}s`;
  setTimeout(() => { feat.style.opacity = '1'; }, 100);
});
