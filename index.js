// Toggle Mobile Menu
const menuToggle = document.getElementById('menuToggle');
const navLinks = document.getElementById('navLinks');

menuToggle.addEventListener('click', () => {
    navLinks.classList.toggle('active');
    menuToggle.innerHTML = navLinks.classList.contains('active') ? '✕' : '☰';
});

// Fechar menu ao clicar num link (mobile)
document.querySelectorAll('.nav-links a').forEach(link => {
    link.addEventListener('click', () => {
        navLinks.classList.remove('active');
        menuToggle.innerHTML = '☰';
    });
});

// Dark Mode Toggle
const themeToggle = document.getElementById('themeToggle');
const htmlElement = document.documentElement;

const savedTheme = localStorage.getItem('theme');
if (savedTheme === 'dark') {
    htmlElement.setAttribute('data-theme', 'dark');
    themeToggle.innerHTML = '☀️';
}

themeToggle.addEventListener('click', () => {
    if (htmlElement.getAttribute('data-theme') === 'dark') {
        htmlElement.removeAttribute('data-theme');
        localStorage.setItem('theme', 'light');
        themeToggle.innerHTML = '🌙';
    } else {
        htmlElement.setAttribute('data-theme', 'dark');
        localStorage.setItem('theme', 'dark');
        themeToggle.innerHTML = '☀️';
    }
});

// Intersection Observer para as Animações de Scroll
const observerOptions = {
    root: null,
    rootMargin: '0px',
    threshold: 0.15 // Dispara a animação quando 15% do elemento estiver visível
};

const observer = new IntersectionObserver((entries, observer) => {
    entries.forEach(entry => {
        if (entry.isIntersecting) {
            entry.target.classList.add('visible');
            // Descomente a linha abaixo caso queira que a animação ocorra apenas uma vez
            // observer.unobserve(entry.target); 
        }
    });
}, observerOptions);

// Inicia a observação de todos os elementos com a classe .animate-on-scroll
document.querySelectorAll('.animate-on-scroll').forEach(element => {
    observer.observe(element);
});