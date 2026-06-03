/* ============================================
   蒙德里安教程 V4 - 全面修订
   翻页交互 + 目录 + 复制 + 手势
   ============================================ */

(function() {
  'use strict';

  // --- State ---
  let currentPage = 0;
  let totalPages = 0;
  let isAnimating = false;
  let touchStartX = 0;
  let touchStartY = 0;
  let touchEndX = 0;

  // --- DOM Elements ---
  const pages = document.querySelectorAll('.page');
  const progressBar = document.querySelector('.progress-bar');
  const pageCounter = document.querySelector('.page-counter');
  const prevBtn = document.querySelector('.nav-btn.prev');
  const nextBtn = document.querySelector('.nav-btn.next');
  const tocToggle = document.querySelector('.toc-toggle');
  const tocPanel = document.querySelector('.toc-panel');
  const tocOverlay = document.querySelector('.toc-overlay');
  const tocLinks = document.querySelectorAll('.toc-list a');
  const touchHint = document.querySelector('.touch-hint');

  totalPages = pages.length;

  // --- Reading Progress (localStorage) ---
  const STORAGE_KEY = 'ai-journal-reading-progress';
  
  function saveProgress(pageIndex) {
    try {
      localStorage.setItem(STORAGE_KEY, JSON.stringify({
        page: pageIndex,
        total: totalPages,
        timestamp: Date.now()
      }));
    } catch(e) {}
  }
  
  function loadProgress() {
    try {
      const data = JSON.parse(localStorage.getItem(STORAGE_KEY));
      if (data && data.page > 0 && data.page < totalPages) {
        return data.page;
      }
    } catch(e) {}
    return 0;
  }

  // --- Resume Toast ---
  function showResumeToast(pageNum) {
    const toast = document.createElement('div');
    toast.className = 'resume-toast';
    toast.innerHTML = `<span>╭─ 上次读到第 ${pageNum} 页，已帮你续上 ─╮</span><button class="resume-restart">从头开始</button>`;
    document.body.appendChild(toast);
    
    // Animate in
    requestAnimationFrame(() => toast.classList.add('visible'));
    
    // "从头开始" button
    toast.querySelector('.resume-restart').addEventListener('click', () => {
      toast.classList.remove('visible');
      setTimeout(() => toast.remove(), 400);
      goToPage(0);
    });
    
    // Auto dismiss after 4s
    setTimeout(() => {
      toast.classList.remove('visible');
      setTimeout(() => toast.remove(), 400);
    }, 4000);
  }

  // --- Init ---
  function init() {
    const savedPage = loadProgress();
    if (savedPage > 0) {
      goToPage(savedPage, false);
      setTimeout(() => showResumeToast(savedPage + 1), 500);
    } else {
      goToPage(0, false);
    }
    bindEvents();
    updateNavState();
    
    // Show touch hint on mobile
    if ('ontouchstart' in window) {
      setTimeout(() => {
        if (touchHint) {
          touchHint.classList.add('visible');
          setTimeout(() => touchHint.classList.remove('visible'), 3000);
        }
      }, 1500);
    }
  }

  // --- Navigation ---
  function goToPage(index, animate = true) {
    if (index < 0 || index >= totalPages) return;
    if (isAnimating && animate) return;

    const direction = index > currentPage ? 'forward' : 'backward';
    const currentEl = pages[currentPage];
    
    if (animate) {
      isAnimating = true;
      
      // Exit current page
      currentEl.classList.remove('active');
      const exitClass = direction === 'forward' ? 'exit-left' : 'exit-right';
      currentEl.classList.add(exitClass);
      
      setTimeout(() => {
        currentEl.classList.remove(exitClass);
      }, 400);
    } else {
      currentEl.classList.remove('active');
    }

    currentPage = index;

    // Enter new page
    const newEl = pages[currentPage];
    if (animate) {
      newEl.style.transform = direction === 'forward' ? 'translateX(60px)' : 'translateX(-60px)';
      newEl.style.opacity = '0';
      newEl.classList.add('active');
      
      // Force reflow then animate in
      void newEl.offsetWidth;
      newEl.style.transition = 'transform 0.35s ease, opacity 0.35s ease';
      newEl.style.transform = 'translateX(0)';
      newEl.style.opacity = '1';
      
      setTimeout(() => {
        newEl.style.transition = '';
        newEl.style.transform = '';
        newEl.style.opacity = '';
        isAnimating = false;
      }, 400);
    } else {
      newEl.classList.add('active');
    }

    // Scroll to top of page content
    newEl.scrollTop = 0;

    updateNavState();
    updateProgress();
    updateTOC();
    saveProgress(currentPage);
  }

  function nextPage() {
    if (currentPage < totalPages - 1) {
      goToPage(currentPage + 1);
    }
  }

  function prevPage() {
    if (currentPage > 0) {
      goToPage(currentPage - 1);
    }
  }

  function updateNavState() {
    if (prevBtn) prevBtn.disabled = currentPage === 0;
    if (nextBtn) nextBtn.disabled = currentPage === totalPages - 1;
    if (pageCounter) {
      pageCounter.textContent = `${currentPage + 1} / ${totalPages}`;
    }
  }

  function updateProgress() {
    if (progressBar) {
      const progress = ((currentPage + 1) / totalPages) * 100;
      progressBar.style.width = progress + '%';
    }
  }

  function updateTOC() {
    tocLinks.forEach(link => {
      link.classList.remove('active');
      const target = parseInt(link.dataset.page, 10);
      if (target === currentPage) {
        link.classList.add('active');
      }
    });
  }

  // --- TOC ---
  function openTOC() {
    tocPanel.classList.add('open');
    tocOverlay.classList.add('visible');
    tocToggle.classList.add('active');
  }

  function closeTOC() {
    tocPanel.classList.remove('open');
    tocOverlay.classList.remove('visible');
    tocToggle.classList.remove('active');
  }

  function toggleTOC() {
    if (tocPanel.classList.contains('open')) {
      closeTOC();
    } else {
      openTOC();
    }
  }

  // --- Copy Functionality ---
  function handleCopy(btn) {
    const card = btn.closest('.prompt-card');
    const code = card.querySelector('code') || card;
    const text = code.textContent.trim();
    
    navigator.clipboard.writeText(text).then(() => {
      btn.textContent = '已复制 ✓';
      btn.classList.add('copied');
      setTimeout(() => {
        btn.textContent = '复制';
        btn.classList.remove('copied');
      }, 2000);
    }).catch(() => {
      // Fallback
      const textarea = document.createElement('textarea');
      textarea.value = text;
      document.body.appendChild(textarea);
      textarea.select();
      document.execCommand('copy');
      document.body.removeChild(textarea);
      btn.textContent = '已复制 ✓';
      btn.classList.add('copied');
      setTimeout(() => {
        btn.textContent = '复制';
        btn.classList.remove('copied');
      }, 2000);
    });
  }

  // --- Events ---
  function bindEvents() {
    // Nav buttons
    if (prevBtn) prevBtn.addEventListener('click', prevPage);
    if (nextBtn) nextBtn.addEventListener('click', nextPage);

    // Keyboard
    document.addEventListener('keydown', (e) => {
      if (e.key === 'ArrowRight' || e.key === 'ArrowDown' || e.key === ' ') {
        e.preventDefault();
        nextPage();
      } else if (e.key === 'ArrowLeft' || e.key === 'ArrowUp') {
        e.preventDefault();
        prevPage();
      } else if (e.key === 'Escape') {
        closeTOC();
      }
    });

    // Touch / Swipe
    document.addEventListener('touchstart', (e) => {
      touchStartX = e.changedTouches[0].screenX;
      touchStartY = e.changedTouches[0].screenY;
    }, { passive: true });

    document.addEventListener('touchend', (e) => {
      touchEndX = e.changedTouches[0].screenX;
      const touchEndY = e.changedTouches[0].screenY;
      const diffX = touchStartX - touchEndX;
      const diffY = Math.abs(touchStartY - touchEndY);
      
      // Only trigger if horizontal swipe is dominant
      if (Math.abs(diffX) > 50 && diffY < 100) {
        if (diffX > 0) {
          nextPage();
        } else {
          prevPage();
        }
      }
    }, { passive: true });

    // TOC
    if (tocToggle) tocToggle.addEventListener('click', toggleTOC);
    if (tocOverlay) tocOverlay.addEventListener('click', closeTOC);

    tocLinks.forEach(link => {
      link.addEventListener('click', (e) => {
        e.preventDefault();
        const target = parseInt(link.dataset.page, 10);
        goToPage(target);
        closeTOC();
      });
    });

    // Copy buttons
    document.querySelectorAll('.prompt-card .copy-btn').forEach(btn => {
      btn.addEventListener('click', () => handleCopy(btn));
    });

    // Mouse wheel (with debounce)
    let wheelTimer = null;
    document.addEventListener('wheel', (e) => {
      if (wheelTimer) return;
      wheelTimer = setTimeout(() => { wheelTimer = null; }, 600);
      
      if (e.deltaY > 30) {
        nextPage();
      } else if (e.deltaY < -30) {
        prevPage();
      }
    }, { passive: true });
  }

  // --- Fix prompt-card code indentation ---
  function fixCodeIndent() {
    document.querySelectorAll('.prompt-card code').forEach(code => {
      const lines = code.textContent.split('\n');
      // Find minimum leading whitespace (ignoring empty lines)
      let minIndent = Infinity;
      lines.forEach(line => {
        if (line.trim().length === 0) return;
        const leading = line.match(/^(\s*)/)[1].length;
        if (leading < minIndent) minIndent = leading;
      });
      if (minIndent > 0 && minIndent < Infinity) {
        code.textContent = lines.map(line => line.slice(minIndent)).join('\n').trim();
      } else {
        code.textContent = code.textContent.trim();
      }
    });
  }

  // --- Start ---
  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', () => { fixCodeIndent(); init(); });
  } else {
    fixCodeIndent();
    init();
  }
})();
