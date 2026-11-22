/**
 * Nang Rong Secret Taste - Common Shared Logic
 * ฟังก์ชันส่วนกลางที่ใช้งานร่วมกันทุกหน้า (Navbar, Favorites, Randomizer, Toast)
 */

// Application Common State
const CommonState = {
  favorites: JSON.parse(localStorage.getItem('nangrong_favorites') || '[]'),
  surveys: JSON.parse(localStorage.getItem('nangrong_surveys') || JSON.stringify(INITIAL_SURVEY_RESPONSES)),
  userReviews: JSON.parse(localStorage.getItem('nangrong_reviews') || '{}'),
  suggestedPlaces: JSON.parse(localStorage.getItem('nangrong_suggested') || '[]')
};

// Initialize on DOM Ready
document.addEventListener('DOMContentLoaded', () => {
  if (window.lucide) {
    lucide.createIcons();
  }
  updateFavoritesBadge();
  highlightActiveNavLink();
});

/**
 * Highlight Current Active Page in Navigation Bar
 */
function highlightActiveNavLink() {
  const currentPath = window.location.pathname.split('/').pop() || 'index.html';
  const navLinks = document.querySelectorAll('.nav-link');
  
  navLinks.forEach(link => {
    const href = link.getAttribute('href');
    if (href === currentPath || (currentPath === '' && href === 'index.html')) {
      link.classList.add('text-orange-600', 'font-bold');
      link.classList.remove('text-slate-600');
    }
  });
}

/**
 * Toggle Favorite Restaurant ID
 */
function toggleFavorite(id) {
  const index = CommonState.favorites.indexOf(id);
  if (index === -1) {
    CommonState.favorites.push(id);
    showToast('บันทึกร้านนี้ไว้ในรายการโปรดแล้ว!', 'success');
  } else {
    CommonState.favorites.splice(index, 1);
    showToast('นำออกจากรายการโปรดแล้ว', 'info');
  }
  localStorage.setItem('nangrong_favorites', JSON.stringify(CommonState.favorites));
  updateFavoritesBadge();

  // If on restaurants page, refresh if needed
  if (typeof window.refreshRestaurantsList === 'function') {
    window.refreshRestaurantsList();
  }
}

/**
 * Update Favorites Counter in Navbar
 */
function updateFavoritesBadge() {
  const badge = document.getElementById('fav-count-badge');
  if (badge) {
    const count = CommonState.favorites.length;
    badge.textContent = count;
    badge.classList.toggle('hidden', count === 0);
  }
}

/**
 * Open Favorites View (Navigates to restaurants.html?fav=true)
 */
function openFavoritesView() {
  if (CommonState.favorites.length === 0) {
    showToast('ยังไม่มีร้านอาหารในรายการโปรด ลองกดรูปหัวใจที่ร้านดูสิ!', 'info');
    return;
  }
  window.location.href = 'restaurants.html?fav=true';
}

/**
 * Surprise / Random Secret Restaurant Modal
 */
function randomizeSecretSpot() {
  let randomModal = document.getElementById('random-modal');
  if (!randomModal) {
    // Inject modal if not already present
    const modalHtml = `
      <div id="random-modal" class="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/75 backdrop-blur-xs modal-overlay">
        <div class="bg-white w-full max-w-md rounded-3xl shadow-2xl p-6 relative">
          <button onclick="closeRandomModal()" class="absolute top-4 right-4 text-slate-400 hover:text-slate-600">
            <i data-lucide="x" class="w-5 h-5"></i>
          </button>
          <div id="random-result-container"></div>
        </div>
      </div>
    `;
    document.body.insertAdjacentHTML('beforeend', modalHtml);
    randomModal = document.getElementById('random-modal');
    if (window.lucide) lucide.createIcons();
  }

  randomModal.classList.remove('hidden');
  const resultContainer = document.getElementById('random-result-container');

  resultContainer.innerHTML = `
    <div class="py-12 text-center space-y-4">
      <div class="w-20 h-20 mx-auto rounded-full border-4 border-orange-500 border-t-transparent animate-spin flex items-center justify-center">
        <i data-lucide="utensils" class="w-8 h-8 text-orange-500"></i>
      </div>
      <h3 class="text-xl font-bold text-slate-800 animate-pulse">กำลังเขย่าเซียมซีสุ่มร้านลับนางรอง...</h3>
      <p class="text-xs text-slate-500">ค้นหาร้านอร่อยรสเด็ดจากทั่วอำเภอ</p>
    </div>
  `;
  if (window.lucide) lucide.createIcons();

  setTimeout(() => {
    const randomIndex = Math.floor(Math.random() * RESTAURANTS.length);
    const chosen = RESTAURANTS[randomIndex];
    const secret = SECRET_LEVELS[chosen.secretLevel];

    resultContainer.innerHTML = `
      <div class="text-center">
        <div class="inline-block p-2 rounded-full bg-orange-100 text-orange-600 mb-2">
          <i data-lucide="party-popper" class="w-8 h-8"></i>
        </div>
        <span class="text-xs font-semibold px-2.5 py-0.5 rounded-full ${secret.badgeClass} block w-fit mx-auto mb-2">
          ${secret.label}
        </span>
        <h3 class="text-2xl font-extrabold text-slate-900">${chosen.name}</h3>
        <p class="text-xs text-orange-600 font-medium mt-1">✨ ${chosen.highlight}</p>
        
        <div class="my-4 rounded-2xl overflow-hidden h-44 relative shadow-md">
          <img src="${chosen.coverImage}" class="w-full h-full object-cover">
          <div class="absolute bottom-2 left-2 right-2 px-3 py-1.5 rounded-xl bg-black/60 text-white text-xs flex justify-between">
            <span>เมนูเด็ด: ${chosen.signatureDishes[0]?.name}</span>
            <span class="font-bold text-amber-400">★ ${chosen.rating}</span>
          </div>
        </div>

        <p class="text-xs text-slate-600 line-clamp-2 mb-6">${chosen.description}</p>

        <div class="flex gap-2">
          <button onclick="randomizeSecretSpot()" class="flex-1 py-2.5 rounded-xl border border-slate-200 text-xs font-medium hover:bg-slate-50 transition">
            สุ่มใหม่อีกที
          </button>
          <a href="restaurant-detail.html?id=${chosen.id}" class="flex-1 py-2.5 rounded-xl bg-orange-600 text-white text-xs font-bold hover:bg-orange-700 shadow-md transition flex items-center justify-center">
            ดูรายละเอียดร้านนี้เลย!
          </a>
        </div>
      </div>
    `;
    if (window.lucide) lucide.createIcons();
  }, 1000);
}

function closeRandomModal() {
  const modal = document.getElementById('random-modal');
  if (modal) modal.classList.add('hidden');
}

/**
 * Toast Notification System
 */
function showToast(message, type = 'info') {
  let toastContainer = document.getElementById('toast-container');
  if (!toastContainer) {
    toastContainer = document.createElement('div');
    toastContainer.id = 'toast-container';
    toastContainer.className = 'fixed bottom-5 right-5 z-50 flex flex-col gap-2 pointer-events-none';
    document.body.appendChild(toastContainer);
  }

  const toast = document.createElement('div');
  const bgColors = {
    success: 'bg-emerald-600 text-white',
    warning: 'bg-amber-500 text-white',
    info: 'bg-slate-900 text-white'
  };

  toast.className = `${bgColors[type] || bgColors.info} px-4 py-3 rounded-2xl shadow-xl text-xs font-medium flex items-center gap-2 transform translate-y-4 opacity-0 transition-all duration-300 pointer-events-auto max-w-sm`;
  toast.innerHTML = `<span>${message}</span>`;

  toastContainer.appendChild(toast);

  setTimeout(() => {
    toast.classList.remove('translate-y-4', 'opacity-0');
  }, 10);

  setTimeout(() => {
    toast.classList.add('opacity-0', 'translate-y-2');
    setTimeout(() => toast.remove(), 300);
  }, 3500);
}
