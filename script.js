// ===========================================
// 1. Theme and Animation Logic (Your Original)
// ===========================================
const initTheme = () => {
    const html = document.documentElement;
    const savedTheme = localStorage.getItem('theme') || 'light';
    html.setAttribute('data-theme', savedTheme);
    const themeBtn = document.querySelector('.theme-btn');
    if (themeBtn) {
        themeBtn.textContent = savedTheme === 'dark' ? '☀️' : '🌙';
        const toggleTheme = (e) => {
            if (e) e.preventDefault();
            const isDark = html.getAttribute('data-theme') === 'dark';
            const newTheme = isDark ? 'light' : 'dark';
            html.setAttribute('data-theme', newTheme);
            localStorage.setItem('theme', newTheme);
            document.querySelectorAll('.theme-btn').forEach(btn => {
                btn.textContent = newTheme === 'dark' ? '☀️' : '🌙';
            });
        };
        themeBtn.addEventListener('click', toggleTheme);
    }
};

const initApp = () => {
    initTheme();
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
    cards.forEach((card) => {
        card.style.opacity = '0';
        card.style.transform = 'translateY(24px)';
        card.style.transition = 'opacity 0.5s ease, transform 0.5s ease';
        observer.observe(card);
    });
};

// ===========================================
// 2. Scan Logic (Clean and Centralized)
// ===========================================
document.addEventListener('DOMContentLoaded', () => {
    initApp();

    const trigger = document.getElementById('scanTrigger');
    const picker = document.getElementById('filePicker');

    if (trigger && picker) {
        // Trigger the hidden file input
        trigger.addEventListener('click', (e) => {
            e.preventDefault();
            e.stopPropagation();
            picker.click();
        });

        // Handle the file selection
        picker.addEventListener('change', async (e) => {
    const file = e.target.files[0];
    if (!file) return;

    alert("Compressing and Analyzing...");

    // Create an image object to resize
    const img = new Image();
    img.src = URL.createObjectURL(file);
    
    img.onload = async () => {
        const canvas = document.createElement('canvas');
        const maxSize = 800; // Resize to max 800px width
        let width = img.width;
        let height = img.height;

        if (width > height) {
            if (width > maxSize) { height *= maxSize / width; width = maxSize; }
        } else {
            if (height > maxSize) { width *= maxSize / height; height = maxSize; }
        }
        
        canvas.width = width;
        canvas.height = height;
        canvas.getContext('2d').drawImage(img, 0, 0, width, height);
        
        // Convert to small JPEG (0.7 quality)
        const compressedBase64 = canvas.toDataURL('image/jpeg', 0.7);

        try {
            const response = await fetch('/api/scan', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ image: compressedBase64 })
            });
            
            const data = await response.json();
            if (response.ok) {
                alert("Found: " + data.product_name + "\nPrice: " + data.price);
            } else {
                alert("Server Error: " + data.error);
            }
        } catch (err) {
            alert("Connection error: " + err.message);
        }
    };
});
