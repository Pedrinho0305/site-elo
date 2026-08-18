document.addEventListener('DOMContentLoaded', () => {
  const themeToggleBtn = document.getElementById('themeToggle');
  const menuToggleBtn = document.getElementById('menuToggle');
  const navLinks = document.getElementById('navLinks');
  const htmlElement = document.documentElement;

  // 1. Carregar e Aplicar Preferência de Tema
  const savedTheme = localStorage.getItem('elo-theme') || 'dark';
  htmlElement.setAttribute('data-theme', savedTheme);
  updateThemeIcon(savedTheme);

  // Alternar Tema Claro/Escuro
  themeToggleBtn.addEventListener('click', () => {
    const currentTheme = htmlElement.getAttribute('data-theme');
    const newTheme = currentTheme === 'dark' ? 'light' : 'dark';

    htmlElement.setAttribute('data-theme', newTheme);
    localStorage.setItem('elo-theme', newTheme);
    updateThemeIcon(newTheme);
  });

  function updateThemeIcon(theme) {
    const icon = themeToggleBtn.querySelector('i');
    if (theme === 'dark') {
      icon.className = 'fa-solid fa-sun';
    } else {
      icon.className = 'fa-solid fa-moon';
    }
  }

  // 2. Menu Hambúrguer (Mobile)
  menuToggleBtn.addEventListener('click', () => {
    navLinks.classList.toggle('show');
  });

  // Fechar menu mobile ao clicar em um link
  document.querySelectorAll('.nav-links a').forEach(link => {
    link.addEventListener('click', () => {
      navLinks.classList.remove('show');
    });
  });
});