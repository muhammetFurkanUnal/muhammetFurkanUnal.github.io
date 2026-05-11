const envelope = document.getElementById('envelope');
const letterContent = document.getElementById('letterContent');
const pages = document.querySelectorAll('.letter-page');
const prevBtn = document.getElementById('prevBtn');
const nextBtn = document.getElementById('nextBtn');
const closeBtn = document.getElementById('closeBtn');

let currentPage = 1;
let isOpened = false;

envelope.addEventListener('click', () => {
    if (!isOpened) {
        isOpened = true;
        envelope.classList.add('opened');
        letterContent.classList.add('active');
        closeBtn.classList.add('active');
    }
});

closeBtn.addEventListener('click', () => {
    isOpened = false;
    envelope.classList.remove('opened');
    letterContent.classList.remove('active');
    closeBtn.classList.remove('active');
    currentPage = 1;
    showPage(1);
});

function showPage(pageNum) {
    pages.forEach(page => {
        page.classList.remove('active');
    });
    document.querySelector(`[data-page="${pageNum}"]`).classList.add('active');

    // Ok düğmelerini kontrol et
    prevBtn.style.opacity = pageNum === 1 ? '0.3' : '0.7';
    nextBtn.style.opacity = pageNum === 4 ? '0.3' : '0.7';
    prevBtn.style.pointerEvents = pageNum === 1 ? 'none' : 'auto';
    nextBtn.style.pointerEvents = pageNum === 4 ? 'none' : 'auto';
}

prevBtn.addEventListener('click', () => {
    if (currentPage > 1) {
        currentPage--;
        showPage(currentPage);
    }
});

nextBtn.addEventListener('click', () => {
    if (currentPage < 4) {
        currentPage++;
        showPage(currentPage);
    }
});

// Klavye navigasyonu
document.addEventListener('keydown', (e) => {
    if (!isOpened) return;
    if (e.key === 'ArrowLeft' && currentPage > 1) {
        currentPage--;
        showPage(currentPage);
    } else if (e.key === 'ArrowRight' && currentPage < 4) {
        currentPage++;
        showPage(currentPage);
    }
});