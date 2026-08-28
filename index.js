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