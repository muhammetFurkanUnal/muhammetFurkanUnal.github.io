document.addEventListener('DOMContentLoaded', () => {
    const envelope = document.getElementById('envelope');
    const seal = document.getElementById('waxSeal');
    const letterPaper = document.getElementById('letterPaper');
    const pages = document.querySelectorAll('.letter-page');
    const prevBtn = document.getElementById('prevBtn');
    const nextBtn = document.getElementById('nextBtn');
    const closeBtn = document.getElementById('closeBtn');
    const totalPages = pages.length;

    let currentPage = 1;
    let isOpened = false;
    let isAnimating = false;

    // Clean up any persisted seal state from previous design iterations —
    // the seal always starts intact now.
    try { localStorage.removeItem('mektup-seal-broken'); } catch (_) {}

    function applyPaperOffset() {
        // Paper is `totalPages` sections tall. To move up by one section we
        // translate by (100 / totalPages)% of the paper's own height.
        const pct = (currentPage - 1) * (100 / totalPages);
        letterPaper.style.transform = `translateY(-${pct}%)`;
    }

    function updateNavArrows() {
        const atFirst = currentPage === 1;
        const atLast  = currentPage === totalPages;
        prevBtn.classList.toggle('active', !atFirst);
        nextBtn.classList.toggle('active', !atLast);
    }

    function openLetter() {
        if (isOpened) return;
        isOpened = true;
        envelope.classList.add('opened');
        // Mark the seal as broken for the rest of this session — closing the
        // letter won't restore it; only a page refresh does.
        seal.classList.add('broken');
        // After the envelope finishes growing, light up the controls.
        setTimeout(() => {
            closeBtn.classList.add('active');
            updateNavArrows();
        }, 950);
    }

    function closeLetter() {
        if (!isOpened) return;
        isOpened = false;
        envelope.classList.remove('opened');
        closeBtn.classList.remove('active');
        prevBtn.classList.remove('active');
        nextBtn.classList.remove('active');
        // Reset the paper back to page 1 without animating, so a reopen starts clean.
        setTimeout(() => {
            letterPaper.classList.add('no-transition');
            currentPage = 1;
            applyPaperOffset();
            void letterPaper.offsetWidth;
            letterPaper.classList.remove('no-transition');
        }, 850);
    }

    function goToPage(newPage) {
        if (isAnimating) return;
        if (newPage === currentPage || newPage < 1 || newPage > totalPages) return;
        isAnimating = true;
        currentPage = newPage;
        applyPaperOffset();
        updateNavArrows();
        setTimeout(() => { isAnimating = false; }, 820);
    }

    seal.addEventListener('click', openLetter);
    closeBtn.addEventListener('click', closeLetter);
    prevBtn.addEventListener('click', () => goToPage(currentPage - 1));
    nextBtn.addEventListener('click', () => goToPage(currentPage + 1));

    document.addEventListener('keydown', (e) => {
        if (!isOpened) return;
        if (e.key === 'ArrowUp')        goToPage(currentPage - 1);
        else if (e.key === 'ArrowDown') goToPage(currentPage + 1);
        else if (e.key === 'Escape')    closeLetter();
    });
});
