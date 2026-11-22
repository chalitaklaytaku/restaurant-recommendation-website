/**
 * Nang Rong Secret Taste - Main Application Logic
 * ระบบเว็บไซต์แนะนำร้านอาหารลับในอำเภอนางรอง จังหวัดบุรีรัมย์
 */

// Application State
const AppState = {
  activeCategory: 'all',
  searchQuery: '',
  priceFilter: 'all',
  secretFilter: 'all',
  openNowOnly: false,
  sortBy: 'rating-desc',
  favorites: JSON.parse(localStorage.getItem('nangrong_favorites') || '[]'),
  surveys: JSON.parse(localStorage.getItem('nangrong_surveys') || JSON.stringify(INITIAL_SURVEY_RESPONSES)),
  userReviews: JSON.parse(localStorage.getItem('nangrong_reviews') || '{}'),
  suggestedPlaces: JSON.parse(localStorage.getItem('nangrong_suggested') || '[]'),
  map: null,
  mapMarkers: [],
  surveyChart: null
};

// DOM Content Loaded
document.addEventListener('DOMContentLoaded', () => {
  // Initialize Lucide icons
  if (window.lucide) {
    lucide.createIcons();
  }

  // Render initial components
  renderCategories();
  renderFeaturedGems();
  filterAndRenderRestaurants();
  initMap();
  renderSurveyForm();
  updateSurveyDashboard();
  updateFavoritesCount();

  // Setup Event Listeners
  setupEventListeners();
});

/**
 * Setup Event Listeners
 */
function setupEventListeners() {
  // Search Input
  const searchInput = document.getElementById('search-input');
  if (searchInput) {
    searchInput.addEventListener('input', (e) => {
      AppState.searchQuery = e.target.value.trim().toLowerCase();
      filterAndRenderRestaurants();
    });
  }

  // Price Filter
  const priceFilter = document.getElementById('price-filter');
  if (priceFilter) {
    priceFilter.addEventListener('change', (e) => {
      AppState.priceFilter = e.target.value;
      filterAndRenderRestaurants();
    });
  }

  // Secret Level Filter
  const secretFilter = document.getElementById('secret-filter');
  if (secretFilter) {
    secretFilter.addEventListener('change', (e) => {
      AppState.secretFilter = e.target.value;
      filterAndRenderRestaurants();
    });
  }

  // Sort By
  const sortBy = document.getElementById('sort-by');
  if (sortBy) {
    sortBy.addEventListener('change', (e) => {
      AppState.sortBy = e.target.value;
      filterAndRenderRestaurants();
    });
  }

  // Open Now Toggle
  const openNowToggle = document.getElementById('opennow-toggle');
  if (openNowToggle) {
    openNowToggle.addEventListener('change', (e) => {
      AppState.openNowOnly = e.target.checked;
      filterAndRenderRestaurants();
    });
  }

  // Survey Form Submission
  const surveyForm = document.getElementById('survey-form');
  if (surveyForm) {
    surveyForm.addEventListener('submit', handleSurveySubmit);
  }

  // Suggest Form Submission
  const suggestForm = document.getElementById('suggest-form');
  if (suggestForm) {
    suggestForm.addEventListener('submit', handleSuggestSubmit);
  }
}

/**
 * Render Categories Buttons
 */
function renderCategories() {
  const container = document.getElementById('category-pills');
  if (!container) return;

  container.innerHTML = CATEGORIES.map(cat => {
    const isActive = AppState.activeCategory === cat.id;
    const activeClasses = isActive 
      ? 'bg-orange-600 text-white shadow-md shadow-orange-600/30 font-medium' 
      : 'bg-white text-slate-700 hover:bg-orange-50 border border-slate-200';

    return `
      <button 
        onclick="selectCategory('${cat.id}')"
        class="flex items-center gap-2 px-4 py-2.5 rounded-full text-sm transition-all whitespace-nowrap ${activeClasses}">
        <i data-lucide="${cat.icon}" class="w-4 h-4"></i>
        <span>${cat.name}</span>
      </button>
    `;
  }).join('');

  if (window.lucide) lucide.createIcons();
}

/**
 * Select Category Filter
 */
function selectCategory(catId) {
  AppState.activeCategory = catId;
  renderCategories();
  filterAndRenderRestaurants();

  // Scroll smoothly to list if clicked from hero
  const section = document.getElementById('restaurant-list-section');
  if (section) {
    section.scrollIntoView({ behavior: 'smooth' });
  }
}

/**
 * Render Featured Secret Spots
 */
function renderFeaturedGems() {
  const container = document.getElementById('featured-gems-container');
  if (!container) return;

  // Pick 3 top gems (ultra-secret and highest rating)
  const featured = RESTAURANTS.filter(r => r.secretLevel === 'ultra-secret' || r.rating >= 4.8).slice(0, 3);

  container.innerHTML = featured.map(place => {
    const secretInfo = SECRET_LEVELS[place.secretLevel];
    return `
      <div onclick="openRestaurantModal(${place.id})" class="cursor-pointer group relative overflow-hidden rounded-2xl bg-white shadow-lg border border-slate-100 card-hover">
        <div class="relative h-48 overflow-hidden">
          <img src="${place.coverImage}" alt="${place.name}" class="w-full h-full object-cover img-zoom">
          <div class="absolute inset-0 bg-gradient-to-t from-black/80 via-black/20 to-transparent"></div>
          <span class="absolute top-3 left-3 text-xs font-semibold px-2.5 py-1 rounded-full ${secretInfo.badgeClass}">
            ${secretInfo.label}
          </span>
          <div class="absolute bottom-3 left-3 right-3 text-white">
            <h4 class="text-lg font-bold truncate">${place.name}</h4>
            <p class="text-xs text-orange-200 flex items-center gap-1 mt-0.5">
              <i data-lucide="map-pin" class="w-3.5 h-3.5"></i>
              <span class="truncate">${place.highlight}</span>
            </p>
          </div>
        </div>
        <div class="p-4 flex items-center justify-between text-xs text-slate-600 bg-slate-50/70">
          <span class="flex items-center gap-1 font-semibold text-amber-600">
            <i data-lucide="star" class="w-4 h-4 fill-amber-400 text-amber-400"></i>
            ${place.rating} (${place.reviewCount})
          </span>
          <span class="font-medium text-slate-700">${place.priceRange}</span>
          <span class="text-orange-600 font-semibold group-hover:translate-x-1 transition-transform inline-flex items-center gap-0.5">
            ดูรายละเอียด <i data-lucide="chevron-right" class="w-3.5 h-3.5"></i>
          </span>
        </div>
      </div>
    `;
  }).join('');

  if (window.lucide) lucide.createIcons();
}

/**
 * Filter & Render Restaurant Cards
 */
function filterAndRenderRestaurants() {
  const container = document.getElementById('restaurants-grid');
  const countEl = document.getElementById('results-count');
  if (!container) return;

  let list = [...RESTAURANTS];

  // 1. Category Filter
  if (AppState.activeCategory !== 'all') {
    list = list.filter(item => item.category === AppState.activeCategory);
  }

  // 2. Search Query Filter
  if (AppState.searchQuery) {
    const q = AppState.searchQuery;
    list = list.filter(item => 
      item.name.toLowerCase().includes(q) ||
      item.description.toLowerCase().includes(q) ||
      item.address.toLowerCase().includes(q) ||
      item.highlight.toLowerCase().includes(q) ||
      item.signatureDishes.some(d => d.name.toLowerCase().includes(q))
    );
  }

  // 3. Price Filter
  if (AppState.priceFilter !== 'all') {
    const level = parseInt(AppState.priceFilter);
    list = list.filter(item => item.priceLevel === level);
  }

  // 4. Secret Level Filter
  if (AppState.secretFilter !== 'all') {
    list = list.filter(item => item.secretLevel === AppState.secretFilter);
  }

  // 5. Open Now Filter
  if (AppState.openNowOnly) {
    list = list.filter(item => item.isOpenNow);
  }

  // 6. Sort
  list.sort((a, b) => {
    if (AppState.sortBy === 'rating-desc') return b.rating - a.rating;
    if (AppState.sortBy === 'reviews-desc') return b.reviewCount - a.reviewCount;
    if (AppState.sortBy === 'price-asc') return a.priceLevel - b.priceLevel;
    if (AppState.sortBy === 'price-desc') return b.priceLevel - a.priceLevel;
    return 0;
  });

  // Update Count
  if (countEl) {
    countEl.textContent = `พบ ${list.length} ร้านอร่อย`;
  }

  // Empty State
  if (list.length === 0) {
    container.innerHTML = `
      <div class="col-span-full py-16 text-center">
        <div class="w-20 h-20 mx-auto rounded-full bg-orange-100 flex items-center justify-center text-orange-600 mb-4">
          <i data-lucide="search-x" class="w-10 h-10"></i>
        </div>
        <h3 class="text-xl font-bold text-slate-800">ไม่พบร้านอาหารที่ตรงตามเงื่อนไข</h3>
        <p class="text-sm text-slate-500 mt-1 max-w-md mx-auto">ลองเปลี่ยนคำค้นหา หรือรีเซ็ตตัวกรองเพื่อดูร้านอาหารทั้งหมดในอำเภอนางรอง</p>
        <button onclick="resetFilters()" class="mt-4 px-5 py-2 rounded-xl bg-orange-600 text-white text-sm font-medium hover:bg-orange-700 transition">
          รีเซ็ตตัวกรองทั้งหมด
        </button>
      </div>
    `;
    if (window.lucide) lucide.createIcons();
    updateMapMarkers(list);
    return;
  }

  // Render Grid
  container.innerHTML = list.map(item => {
    const secret = SECRET_LEVELS[item.secretLevel];
    const isFav = AppState.favorites.includes(item.id);

    return `
      <div class="bg-white rounded-2xl border border-slate-100 shadow-sm overflow-hidden card-hover flex flex-col h-full group">
        <!-- Card Image Header -->
        <div class="relative h-52 overflow-hidden cursor-pointer" onclick="openRestaurantModal(${item.id})">
          <img src="${item.coverImage}" alt="${item.name}" class="w-full h-full object-cover img-zoom">
          <div class="absolute inset-0 bg-gradient-to-t from-black/60 via-transparent to-black/20"></div>
          
          <!-- Secret Level Badge -->
          <span class="absolute top-3 left-3 text-xs font-semibold px-2.5 py-1 rounded-full ${secret.badgeClass}">
            ${secret.label}
          </span>

          <!-- Favorite Button -->
          <button 
            type="button" 
            onclick="event.stopPropagation(); toggleFavorite(${item.id})"
            class="absolute top-3 right-3 w-9 h-9 rounded-full bg-white/90 backdrop-blur-sm flex items-center justify-center text-slate-700 hover:text-rose-500 hover:scale-110 transition shadow">
            <i data-lucide="heart" class="w-4 h-4 ${isFav ? 'fill-rose-500 text-rose-500' : ''}"></i>
          </button>

          <!-- Status & Price Tag -->
          <div class="absolute bottom-3 left-3 right-3 flex items-center justify-between text-white text-xs">
            <span class="inline-flex items-center gap-1.5 px-2 py-0.5 rounded-full bg-emerald-500/90 backdrop-blur-sm">
              <span class="w-1.5 h-1.5 rounded-full bg-white animate-pulse"></span>
              เปิดอยู่
            </span>
            <span class="px-2.5 py-0.5 rounded-full bg-black/60 backdrop-blur-sm font-medium">
              ${item.priceRange}
            </span>
          </div>
        </div>

        <!-- Card Content Body -->
        <div class="p-5 flex-1 flex flex-col justify-between cursor-pointer" onclick="openRestaurantModal(${item.id})">
          <div>
            <div class="flex items-center justify-between gap-2 mb-1.5">
              <span class="text-xs font-medium text-orange-600 bg-orange-50 px-2 py-0.5 rounded-md">
                ${CATEGORIES.find(c => c.id === item.category)?.name || 'ทั่วไป'}
              </span>
              <div class="flex items-center gap-1 text-xs font-bold text-amber-500">
                <i data-lucide="star" class="w-3.5 h-3.5 fill-amber-400 text-amber-400"></i>
                <span>${item.rating}</span>
                <span class="text-slate-400 font-normal">(${item.reviewCount})</span>
              </div>
            </div>

            <h3 class="text-lg font-bold text-slate-900 group-hover:text-orange-600 transition truncate">
              ${item.name}
            </h3>

            <p class="text-xs text-slate-500 mt-1 line-clamp-2 leading-relaxed">
              ${item.description}
            </p>

            <!-- Signature Dish Badge -->
            <div class="mt-3 pt-3 border-t border-slate-100 flex items-center gap-1.5 text-xs text-slate-600">
              <i data-lucide="sparkles" class="w-3.5 h-3.5 text-orange-500 flex-shrink-0"></i>
              <span class="truncate font-medium text-slate-700">เมนูเด็ด: ${item.signatureDishes[0]?.name || '-'}</span>
            </div>
          </div>

          <!-- Card Footer Actions -->
          <div class="mt-4 pt-3 border-t border-slate-100 flex items-center justify-between text-xs">
            <span class="text-slate-500 flex items-center gap-1">
              <i data-lucide="clock" class="w-3.5 h-3.5"></i>
              ${item.openHours.split('(')[0]}
            </span>
            <span class="text-orange-600 font-semibold group-hover:translate-x-1 transition-transform inline-flex items-center gap-0.5">
              ดูรายละเอียด <i data-lucide="arrow-right" class="w-3.5 h-3.5"></i>
            </span>
          </div>
        </div>
      </div>
    `;
  }).join('');

  if (window.lucide) lucide.createIcons();
  updateMapMarkers(list);
}

/**
 * Reset All Search Filters
 */
function resetFilters() {
  AppState.activeCategory = 'all';
  AppState.searchQuery = '';
  AppState.priceFilter = 'all';
  AppState.secretFilter = 'all';
  AppState.openNowOnly = false;
  AppState.sortBy = 'rating-desc';

  // Update UI Inputs
  const searchInput = document.getElementById('search-input');
  if (searchInput) searchInput.value = '';
  const priceFilter = document.getElementById('price-filter');
  if (priceFilter) priceFilter.value = 'all';
  const secretFilter = document.getElementById('secret-filter');
  if (secretFilter) secretFilter.value = 'all';
  const sortBy = document.getElementById('sort-by');
  if (sortBy) sortBy.value = 'rating-desc';
  const openNowToggle = document.getElementById('opennow-toggle');
  if (openNowToggle) openNowToggle.checked = false;

  renderCategories();
  filterAndRenderRestaurants();
}

/**
 * Toggle Favorite Bookmark
 */
function toggleFavorite(id) {
  const index = AppState.favorites.indexOf(id);
  if (index === -1) {
    AppState.favorites.push(id);
    showToast('บันทึกร้านนี้ไว้ในรายการโปรดแล้ว!', 'success');
  } else {
    AppState.favorites.splice(index, 1);
    showToast('นำออกจากรายการโปรดแล้ว', 'info');
  }
  localStorage.setItem('nangrong_favorites', JSON.stringify(AppState.favorites));
  updateFavoritesCount();
  filterAndRenderRestaurants();
}

/**
 * Update Favorites Counter in Navbar
 */
function updateFavoritesCount() {
  const el = document.getElementById('fav-count-badge');
  if (el) {
    el.textContent = AppState.favorites.length;
    el.classList.toggle('hidden', AppState.favorites.length === 0);
  }
}

/**
 * Show Favorites Modal / Filter
 */
function showFavoritesList() {
  if (AppState.favorites.length === 0) {
    showToast('ยังไม่มีร้านโปรดที่บันทึกไว้ ลองกดรูปหัวใจที่ร้านอาหารดูสิ!', 'info');
    return;
  }
  // Filter by favorites
  const favRestaurants = RESTAURANTS.filter(r => AppState.favorites.includes(r.id));
  const container = document.getElementById('restaurants-grid');
  const countEl = document.getElementById('results-count');
  if (countEl) countEl.textContent = `ร้านโปรดของคุณ (${favRestaurants.length} ร้าน)`;

  // Scroll to list
  document.getElementById('restaurant-list-section')?.scrollIntoView({ behavior: 'smooth' });

  // Render favorite cards
  container.innerHTML = favRestaurants.map(item => {
    const secret = SECRET_LEVELS[item.secretLevel];
    return `
      <div class="bg-white rounded-2xl border border-rose-200 shadow-sm overflow-hidden card-hover flex flex-col h-full group">
        <div class="relative h-52 overflow-hidden cursor-pointer" onclick="openRestaurantModal(${item.id})">
          <img src="${item.coverImage}" alt="${item.name}" class="w-full h-full object-cover img-zoom">
          <span class="absolute top-3 left-3 text-xs font-semibold px-2.5 py-1 rounded-full ${secret.badgeClass}">
            ${secret.label}
          </span>
          <button 
            type="button" 
            onclick="event.stopPropagation(); toggleFavorite(${item.id})"
            class="absolute top-3 right-3 w-9 h-9 rounded-full bg-white flex items-center justify-center text-rose-500 shadow">
            <i data-lucide="heart" class="w-4 h-4 fill-rose-500 text-rose-500"></i>
          </button>
        </div>
        <div class="p-5 flex-1 flex flex-col justify-between cursor-pointer" onclick="openRestaurantModal(${item.id})">
          <div>
            <h3 class="text-lg font-bold text-slate-900 group-hover:text-orange-600 transition truncate">${item.name}</h3>
            <p class="text-xs text-slate-500 mt-1 line-clamp-2">${item.description}</p>
          </div>
          <div class="mt-4 pt-3 border-t border-slate-100 flex items-center justify-between text-xs">
            <span class="text-slate-500">${item.priceRange}</span>
            <span class="text-orange-600 font-semibold inline-flex items-center gap-0.5">
              ดูรายละเอียด <i data-lucide="arrow-right" class="w-3.5 h-3.5"></i>
            </span>
          </div>
        </div>
      </div>
    `;
  }).join('');
  if (window.lucide) lucide.createIcons();
}

/**
 * Open Restaurant Detail Modal
 */
function openRestaurantModal(id) {
  const place = RESTAURANTS.find(r => r.id === id);
  if (!place) return;

  const modal = document.getElementById('restaurant-modal');
  const modalBody = document.getElementById('modal-content-container');
  if (!modal || !modalBody) return;

  const secret = SECRET_LEVELS[place.secretLevel];
  const reviews = AppState.userReviews[place.id] || [];
  const googleMapsUrl = `https://www.google.com/maps/search/?api=1&query=${place.lat},${place.lng}`;

  modalBody.innerHTML = `
    <!-- Top Image & Navigation -->
    <div class="relative h-64 md:h-80 overflow-hidden rounded-t-3xl bg-slate-900">
      <img src="${place.coverImage}" alt="${place.name}" class="w-full h-full object-cover">
      <div class="absolute inset-0 bg-gradient-to-t from-black/85 via-black/30 to-black/20"></div>
      
      <!-- Close Button -->
      <button onclick="closeRestaurantModal()" class="absolute top-4 right-4 w-10 h-10 rounded-full bg-black/40 backdrop-blur-md text-white flex items-center justify-center hover:bg-black/60 transition z-10">
        <i data-lucide="x" class="w-5 h-5"></i>
      </button>

      <!-- Badges on image -->
      <div class="absolute top-4 left-4 flex flex-wrap gap-2">
        <span class="text-xs font-semibold px-3 py-1 rounded-full ${secret.badgeClass}">
          ${secret.label}
        </span>
        <span class="text-xs font-medium px-3 py-1 rounded-full bg-white/90 text-slate-800 backdrop-blur-sm">
          ${CATEGORIES.find(c => c.id === place.category)?.name}
        </span>
      </div>

      <!-- Title & Basic Info -->
      <div class="absolute bottom-4 left-4 right-4 text-white">
        <div class="flex items-center gap-2 mb-1">
          <div class="flex items-center gap-1 text-sm font-bold text-amber-400">
            <i data-lucide="star" class="w-4 h-4 fill-amber-400"></i>
            <span>${place.rating}</span>
            <span class="text-slate-300 font-normal">(${place.reviewCount} รีวิว)</span>
          </div>
          <span class="text-slate-400">•</span>
          <span class="text-xs bg-orange-600/90 px-2.5 py-0.5 rounded-full font-medium">ช่วงราคา: ${place.priceRange}</span>
        </div>
        <h2 class="text-2xl md:text-3xl font-bold leading-tight">${place.name}</h2>
        <p class="text-xs md:text-sm text-orange-200 mt-1 flex items-center gap-1">
          <i data-lucide="sparkles" class="w-4 h-4 text-amber-300 flex-shrink-0"></i>
          <span>${place.highlight}</span>
        </p>
      </div>
    </div>

    <!-- Modal Content Details -->
    <div class="p-6 md:p-8 space-y-6 max-h-[60vh] overflow-y-auto">
      <!-- Quick Action Buttons -->
      <div class="grid grid-cols-2 md:grid-cols-4 gap-3">
        <a href="${googleMapsUrl}" target="_blank" class="flex items-center justify-center gap-2 py-3 px-4 rounded-xl bg-orange-600 text-white font-medium text-xs hover:bg-orange-700 transition shadow-sm">
          <i data-lucide="navigation" class="w-4 h-4"></i>
          <span>นำทางด้วย Google Maps</span>
        </a>
        <a href="tel:${place.phone}" class="flex items-center justify-center gap-2 py-3 px-4 rounded-xl bg-slate-100 text-slate-800 font-medium text-xs hover:bg-slate-200 transition">
          <i data-lucide="phone-call" class="w-4 h-4 text-emerald-600"></i>
          <span>โทร: ${place.phone}</span>
        </a>
        <button onclick="shareRestaurant('${place.name}', '${place.highlight}')" class="flex items-center justify-center gap-2 py-3 px-4 rounded-xl bg-slate-100 text-slate-800 font-medium text-xs hover:bg-slate-200 transition">
          <i data-lucide="share-2" class="w-4 h-4 text-blue-600"></i>
          <span>แชร์ร้านลับนี้</span>
        </button>
        <button onclick="toggleFavorite(${place.id}); openRestaurantModal(${place.id})" class="flex items-center justify-center gap-2 py-3 px-4 rounded-xl border border-slate-200 font-medium text-xs hover:bg-rose-50 transition">
          <i data-lucide="heart" class="w-4 h-4 ${AppState.favorites.includes(place.id) ? 'fill-rose-500 text-rose-500' : 'text-slate-600'}"></i>
          <span>${AppState.favorites.includes(place.id) ? 'บันทึกแล้ว' : 'บันทึกเป็นร้านโปรด'}</span>
        </button>
      </div>

      <!-- Description -->
      <div>
        <h4 class="text-sm font-bold text-slate-900 mb-2 flex items-center gap-1.5">
          <i data-lucide="info" class="w-4 h-4 text-orange-600"></i>
          เรื่องราวและความเป็นมาของร้าน
        </h4>
        <p class="text-sm text-slate-600 leading-relaxed bg-orange-50/50 p-4 rounded-2xl border border-orange-100">
          ${place.description}
        </p>
      </div>

      <!-- Signature Dishes -->
      <div>
        <h4 class="text-sm font-bold text-slate-900 mb-3 flex items-center gap-1.5">
          <i data-lucide="utensils-crossed" class="w-4 h-4 text-orange-600"></i>
          เมนูแนะนำห้ามพลาด (Signature Dishes)
        </h4>
        <div class="grid grid-cols-1 md:grid-cols-2 gap-3">
          ${place.signatureDishes.map(dish => `
            <div class="p-3.5 rounded-xl border border-slate-100 bg-white hover:border-orange-200 transition shadow-sm flex items-start justify-between gap-3">
              <div>
                <h5 class="text-sm font-bold text-slate-800">${dish.name}</h5>
                <p class="text-xs text-slate-500 mt-0.5">${dish.desc}</p>
              </div>
              <span class="text-sm font-bold text-orange-600 whitespace-nowrap bg-orange-50 px-2.5 py-1 rounded-lg">
                ${dish.price}
              </span>
            </div>
          `).join('')}
        </div>
      </div>

      <!-- Location & Working Hours Info -->
      <div class="grid grid-cols-1 md:grid-cols-2 gap-4 bg-slate-50 p-4 rounded-2xl">
        <div class="space-y-2">
          <div class="flex items-start gap-2 text-xs text-slate-700">
            <i data-lucide="map-pin" class="w-4 h-4 text-rose-500 flex-shrink-0 mt-0.5"></i>
            <div>
              <span class="font-bold">สถานที่ตั้ง:</span>
              <p class="text-slate-500 mt-0.5">${place.address}</p>
            </div>
          </div>
          <div class="flex items-center gap-2 text-xs text-slate-700">
            <i data-lucide="clock" class="w-4 h-4 text-orange-500 flex-shrink-0"></i>
            <div>
              <span class="font-bold">เวลาทำการ:</span>
              <span class="text-slate-500 ml-1">${place.openHours}</span>
            </div>
          </div>
        </div>

        <div>
          <span class="text-xs font-bold text-slate-700 block mb-2">สิ่งอำนวยความสะดวก:</span>
          <div class="flex flex-wrap gap-1.5">
            ${place.facilities.map(fac => `
              <span class="text-[11px] px-2.5 py-1 rounded-lg bg-white border border-slate-200 text-slate-600 font-medium">
                ✓ ${fac}
              </span>
            `).join('')}
          </div>
        </div>
      </div>

      <!-- Mini Leaflet Map Preview inside Modal -->
      <div class="rounded-2xl overflow-hidden border border-slate-200 h-44 relative" id="modal-map-${place.id}">
        <!-- Map will be initialized via JS -->
      </div>

      <!-- Reviews Section -->
      <div class="pt-4 border-t border-slate-200">
        <div class="flex items-center justify-between mb-4">
          <h4 class="text-sm font-bold text-slate-900 flex items-center gap-1.5">
            <i data-lucide="message-square" class="w-4 h-4 text-orange-600"></i>
            รีวิวจากผู้ใช้งาน (${place.reviewCount + reviews.length} รีวิว)
          </h4>
        </div>

        <!-- Add Review Form -->
        <form onsubmit="handleReviewSubmit(event, ${place.id})" class="mb-6 bg-orange-50/40 p-4 rounded-2xl border border-orange-100">
          <h5 class="text-xs font-bold text-slate-800 mb-2">เขียนรีวิวและให้คะแนนร้านนี้:</h5>
          <div class="flex items-center gap-3 mb-3">
            <div class="flex items-center gap-1" id="star-rating-selector">
              ${[1, 2, 3, 4, 5].map(star => `
                <button type="button" onclick="setReviewRating(${star})" class="star-btn text-amber-400 hover:scale-125 transition" data-star="${star}">
                  <i data-lucide="star" class="w-5 h-5 fill-amber-400 text-amber-400"></i>
                </button>
              `).join('')}
            </div>
            <span class="text-xs text-slate-500 font-medium" id="rating-label">5 ดาว (ดีเยี่ยมมาก)</span>
            <input type="hidden" id="review-score" value="5">
          </div>
          <div class="grid grid-cols-1 md:grid-cols-2 gap-2 mb-2">
            <input type="text" id="review-author" required placeholder="ชื่อของคุณ หรือ นามแฝง" class="w-full text-xs px-3 py-2 rounded-xl border border-slate-200 focus:outline-none focus:border-orange-500">
            <input type="text" id="review-dish" placeholder="เมนูที่สั่ง (เช่น ขาหมูเนื้อหนัง)" class="w-full text-xs px-3 py-2 rounded-xl border border-slate-200 focus:outline-none focus:border-orange-500">
          </div>
          <textarea id="review-comment" required rows="2" placeholder="รสชาติเป็นอย่างไร? บรรยากาศ การบริการ แนะนำอะไรบ้าง..." class="w-full text-xs px-3 py-2 rounded-xl border border-slate-200 focus:outline-none focus:border-orange-500 mb-2"></textarea>
          <div class="text-right">
            <button type="submit" class="px-4 py-2 bg-orange-600 hover:bg-orange-700 text-white rounded-xl text-xs font-semibold shadow-sm transition">
              โพสต์รีวิว
            </button>
          </div>
        </form>

        <!-- Existing Reviews List -->
        <div class="space-y-3">
          ${reviews.map(r => `
            <div class="p-3.5 rounded-xl bg-white border border-slate-100 shadow-2xs">
              <div class="flex items-center justify-between text-xs mb-1">
                <span class="font-bold text-slate-800">${r.author}</span>
                <span class="text-slate-400">${r.date}</span>
              </div>
              <div class="flex items-center gap-1 text-amber-400 mb-1.5">
                ${Array(r.score).fill(0).map(() => '<i data-lucide="star" class="w-3.5 h-3.5 fill-amber-400"></i>').join('')}
              </div>
              <p class="text-xs text-slate-600">${r.comment}</p>
            </div>
          `).join('')}
          <div class="p-3.5 rounded-xl bg-white border border-slate-100 shadow-2xs">
            <div class="flex items-center justify-between text-xs mb-1">
              <span class="font-bold text-slate-800">นักชิมเมืองนางรอง</span>
              <span class="text-slate-400">เมื่อวานนี้</span>
            </div>
            <div class="flex items-center gap-1 text-amber-400 mb-1.5">
              <i data-lucide="star" class="w-3.5 h-3.5 fill-amber-400"></i>
              <i data-lucide="star" class="w-3.5 h-3.5 fill-amber-400"></i>
              <i data-lucide="star" class="w-3.5 h-3.5 fill-amber-400"></i>
              <i data-lucide="star" class="w-3.5 h-3.5 fill-amber-400"></i>
              <i data-lucide="star" class="w-3.5 h-3.5 fill-amber-400"></i>
            </div>
            <p class="text-xs text-slate-600">รสชาติสมคำร่ำลือมากครับ ร้านนี้มานางรองต้องแวะจริง ราคาไม่แพง ปริมาณคุ้มค่ามาก</p>
          </div>
        </div>
      </div>
    </div>
  `;

  modal.classList.remove('hidden');
  document.body.classList.add('overflow-hidden');

  if (window.lucide) lucide.createIcons();

  // Initialize mini map in modal
  setTimeout(() => {
    const miniMapEl = document.getElementById(`modal-map-${place.id}`);
    if (miniMapEl && window.L) {
      const miniMap = L.map(miniMapEl, { zoomControl: false }).setView([place.lat, place.lng], 15);
      L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
        attribution: '&copy; OpenStreetMap'
      }).addTo(miniMap);
      L.marker([place.lat, place.lng]).addTo(miniMap)
        .bindPopup(`<b>${place.name}</b><br><small>${place.address}</small>`)
        .openPopup();
    }
  }, 150);
}

/**
 * Star Rating selector in modal
 */
function setReviewRating(score) {
  const input = document.getElementById('review-score');
  const label = document.getElementById('rating-label');
  if (input) input.value = score;

  const labels = ['', '1 ดาว (ต้องปรับปรุง)', '2 ดาว (พอใช้)', '3 ดาว (ปานกลาง)', '4 ดาว (ดีมาก)', '5 ดาว (ดีเยี่ยมมาก)'];
  if (label) label.textContent = labels[score];

  const buttons = document.querySelectorAll('.star-btn');
  buttons.forEach((btn, idx) => {
    const icon = btn.querySelector('svg') || btn.querySelector('i');
    if (idx < score) {
      btn.classList.add('text-amber-400');
    } else {
      btn.classList.remove('text-amber-400');
      btn.classList.add('text-slate-300');
    }
  });
}

/**
 * Handle User Review Submission
 */
function handleReviewSubmit(e, restaurantId) {
  e.preventDefault();
  const author = document.getElementById('review-author').value.trim();
  const comment = document.getElementById('review-comment').value.trim();
  const score = parseInt(document.getElementById('review-score').value || 5);
  const dish = document.getElementById('review-dish')?.value.trim();

  if (!author || !comment) return;

  if (!AppState.userReviews[restaurantId]) {
    AppState.userReviews[restaurantId] = [];
  }

  const newReview = {
    author,
    comment: dish ? `[เมนู: ${dish}] ${comment}` : comment,
    score,
    date: 'วันนี้'
  };

  AppState.userReviews[restaurantId].unshift(newReview);
  localStorage.setItem('nangrong_reviews', JSON.stringify(AppState.userReviews));

  showToast('ขอบคุณสำหรับรีวิวของคุณ!', 'success');
  openRestaurantModal(restaurantId); // Re-render modal with new review
}

/**
 * Close Restaurant Detail Modal
 */
function closeRestaurantModal() {
  const modal = document.getElementById('restaurant-modal');
  if (modal) {
    modal.classList.add('hidden');
    document.body.classList.remove('overflow-hidden');
  }
}

/**
 * Share Restaurant Details
 */
function shareRestaurant(name, highlight) {
  if (navigator.share) {
    navigator.share({
      title: `${name} - ร้านลับนางรอง`,
      text: `แนะนำร้านเด็ดในอำเภอนางรอง: ${name} (${highlight})`,
      url: window.location.href
    }).catch(() => {});
  } else {
    navigator.clipboard.writeText(`${name} - ร้านลับอำเภอนางรอง: ${highlight} ${window.location.href}`);
    showToast('คัดลอกข้อมูลร้านและลิงก์เรียบร้อยแล้ว!', 'success');
  }
}

/**
 * Surprise / Random Secret Restaurant Wheel
 */
function randomizeSecretSpot() {
  const randomModal = document.getElementById('random-modal');
  const resultContainer = document.getElementById('random-result-container');
  if (!randomModal || !resultContainer) return;

  randomModal.classList.remove('hidden');

  resultContainer.innerHTML = `
    <div class="py-12 text-center space-y-4">
      <div class="w-20 h-20 mx-auto rounded-full border-4 border-orange-500 border-t-transparent animate-spin flex items-center justify-center">
        <i data-lucide="utensils" class="w-8 h-8 text-orange-500"></i>
      </div>
      <h3 class="text-xl font-bold text-slate-800 animate-pulse">กำลังเขย่าเซียมซีสุ่มร้านลับนางรอง...</h3>
      <p class="text-xs text-slate-500">คัดเลือกร้านอร่อยรสเด็ดจากทั่วอำเภอ</p>
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
        
        <div class="my-4 rounded-2xl overflow-hidden h-48 relative shadow-md">
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
          <button onclick="closeRandomModal(); openRestaurantModal(${chosen.id})" class="flex-1 py-2.5 rounded-xl bg-orange-600 text-white text-xs font-bold hover:bg-orange-700 shadow-md transition">
            ดูรายละเอียดร้านนี้เลย!
          </button>
        </div>
      </div>
    `;
    if (window.lucide) lucide.createIcons();
  }, 1200);
}

function closeRandomModal() {
  document.getElementById('random-modal')?.classList.add('hidden');
}

/**
 * Initialize Interactive Leaflet Map for Nang Rong
 */
function initMap() {
  const mapContainer = document.getElementById('leaflet-map');
  if (!mapContainer || !window.L) return;

  // Center coordinate of Nang Rong District (14.6367, 102.7917)
  AppState.map = L.map('leaflet-map', {
    scrollWheelZoom: false
  }).setView([14.6367, 102.7917], 14);

  L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
    maxZoom: 19,
    attribution: '&copy; OpenStreetMap contributors | นางรอง บุรีรัมย์'
  }).addTo(AppState.map);

  updateMapMarkers(RESTAURANTS);
}

/**
 * Update Leaflet Map Markers based on filtered list
 */
function updateMapMarkers(restaurants) {
  if (!AppState.map || !window.L) return;

  // Clear existing markers
  AppState.mapMarkers.forEach(marker => AppState.map.removeLayer(marker));
  AppState.mapMarkers = [];

  const bounds = L.latLngBounds();

  restaurants.forEach(place => {
    // Custom Marker Icon
    const customIcon = L.divIcon({
      className: 'custom-div-icon',
      html: `
        <div style="background-color: #EA580C; width: 34px; height: 34px; border-radius: 50%; display: flex; align-items: center; justify-content: center; color: white; border: 3px solid white; box-shadow: 0 4px 10px rgba(0,0,0,0.3); cursor: pointer;" class="hover:scale-125 transition-transform">
          <svg xmlns="http://www.w3.org/2000/svg" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="m16 2-2.3 2.3a3 3 0 0 0 0 4.2l1.8 1.8a3 3 0 0 0 4.2 0L22 8Z"/><path d="M15 15 3.3 3.3a4.2 4.2 0 0 0 0 6l7.3 7.3c.7.7 2 .7 2.8 0L15 15Zm0 0 7 7"/><path d="m2.1 21.8 6.4-6.3"/><path d="m19 5-7 7"/></svg>
        </div>
      `,
      iconSize: [34, 34],
      iconAnchor: [17, 17]
    });

    const marker = L.marker([place.lat, place.lng], { icon: customIcon }).addTo(AppState.map);

    const popupHtml = `
      <div style="width: 220px;" class="overflow-hidden">
        <img src="${place.coverImage}" style="width: 100%; height: 110px; object-fit: cover;">
        <div style="padding: 10px;">
          <h4 style="font-weight: bold; font-size: 14px; margin: 0; color: #1e293b;">${place.name}</h4>
          <p style="font-size: 11px; color: #ea580c; margin: 4px 0 6px 0;">★ ${place.rating} (${place.reviewCount}) • ${place.priceRange}</p>
          <p style="font-size: 11px; color: #64748b; margin-bottom: 8px;">${place.highlight}</p>
          <button onclick="openRestaurantModal(${place.id})" style="width: 100%; padding: 6px; background-color: #ea580c; color: white; border: none; border-radius: 8px; font-size: 11px; font-weight: bold; cursor: pointer;">
            ดูข้อมูลร้าน & นำทาง
          </button>
        </div>
      </div>
    `;

    marker.bindPopup(popupHtml);
    AppState.mapMarkers.push(marker);
    bounds.extend([place.lat, place.lng]);
  });

  if (restaurants.length > 0) {
    AppState.map.fitBounds(bounds, { padding: [50, 50], maxZoom: 15 });
  }
}

/**
 * Render Satisfaction Survey Form (5 Categories, Likert Scale 1-5)
 */
function renderSurveyForm() {
  const container = document.getElementById('survey-questions-container');
  if (!container) return;

  container.innerHTML = SURVEY_QUESTIONS.map(group => `
    <div class="mb-6 p-5 rounded-2xl bg-white border border-slate-100 shadow-xs">
      <h4 class="text-sm font-bold text-slate-800 mb-4 pb-2 border-b border-slate-100 flex items-center gap-2">
        <span class="w-2.5 h-2.5 rounded-full bg-orange-500"></span>
        ${group.category}
      </h4>
      <div class="space-y-4">
        ${group.items.map(item => `
          <div class="flex flex-col md:flex-row md:items-center justify-between gap-3 text-xs py-2 border-b border-slate-50 last:border-none">
            <span class="text-slate-700 font-medium md:max-w-md">${item.text}</span>
            <div class="flex items-center gap-3 justify-between md:justify-end">
              ${[5, 4, 3, 2, 1].map(score => `
                <label class="flex flex-col items-center gap-1 cursor-pointer group">
                  <input type="radio" name="${item.id}" value="${score}" required class="w-4 h-4 text-orange-600 focus:ring-orange-500">
                  <span class="text-[10px] text-slate-400 group-hover:text-orange-600">${score}</span>
                </label>
              `).join('')}
            </div>
          </div>
        `).join('')}
      </div>
    </div>
  `).join('');
}

/**
 * Calculate Survey Statistics (Mean, SD, and Interpretations for Senior Project Chapter 4)
 */
function calculateSurveyStats() {
  const responses = AppState.surveys;
  const n = responses.length;

  if (n === 0) return null;

  const questionKeys = ['q1', 'q2', 'q3', 'q4', 'q5', 'q6', 'q7', 'q8', 'q9', 'q10'];
  const questionStats = {};

  // Compute Mean and SD for each question
  questionKeys.forEach(qKey => {
    const scores = responses.map(r => r.scores[qKey]);
    const sum = scores.reduce((acc, curr) => acc + curr, 0);
    const mean = sum / n;

    // Variance & Standard Deviation (Sample SD)
    const variance = scores.reduce((acc, curr) => acc + Math.pow(curr - mean, 2), 0) / (n > 1 ? n - 1 : 1);
    const sd = Math.sqrt(variance);

    questionStats[qKey] = {
      mean: Number(mean.toFixed(2)),
      sd: Number(sd.toFixed(2)),
      interpretation: getInterpretation(mean)
    };
  });

  // Category Averages
  const categoryStats = [
    { name: '1. การออกแบบหน้าจอ (UI)', mean: Number(((questionStats.q1.mean + questionStats.q2.mean) / 2).toFixed(2)) },
    { name: '2. ความสะดวกในการใช้งาน', mean: Number(((questionStats.q3.mean + questionStats.q4.mean) / 2).toFixed(2)) },
    { name: '3. คุณภาพของข้อมูลร้าน', mean: Number(((questionStats.q5.mean + questionStats.q6.mean) / 2).toFixed(2)) },
    { name: '4. ระบบค้นหา & ฟังก์ชัน', mean: Number(((questionStats.q7.mean + questionStats.q8.mean) / 2).toFixed(2)) },
    { name: '5. ประโยชน์และการประยุกต์ใช้', mean: Number(((questionStats.q9.mean + questionStats.q10.mean) / 2).toFixed(2)) }
  ];

  // Overall Total
  const overallSum = Object.values(questionStats).reduce((acc, curr) => acc + curr.mean, 0);
  const overallMean = Number((overallSum / 10).toFixed(2));
  const overallSd = Number((Object.values(questionStats).reduce((acc, curr) => acc + curr.sd, 0) / 10).toFixed(2));

  return {
    sampleSize: n,
    questionStats,
    categoryStats,
    overallMean,
    overallSd,
    overallInterpretation: getInterpretation(overallMean)
  };
}

/**
 * Likert Scale 5-Level Interpretation (ตามเกณฑ์ประเมินงานวิจัย)
 */
function getInterpretation(score) {
  if (score >= 4.50) return 'มากที่สุด (Very High)';
  if (score >= 3.50) return 'มาก (High)';
  if (score >= 2.50) return 'ปานกลาง (Moderate)';
  if (score >= 1.50) return 'น้อย (Low)';
  return 'น้อยที่สุด (Very Low)';
}

/**
 * Update Survey Statistics Dashboard & Chart.js
 */
function updateSurveyDashboard() {
  const stats = calculateSurveyStats();
  if (!stats) return;

  // Update summary numbers
  const meanEl = document.getElementById('stat-overall-mean');
  const sdEl = document.getElementById('stat-overall-sd');
  const interpEl = document.getElementById('stat-overall-interp');
  const countEl = document.getElementById('stat-sample-size');

  if (meanEl) meanEl.textContent = stats.overallMean.toFixed(2);
  if (sdEl) sdEl.textContent = stats.overallSd.toFixed(2);
  if (interpEl) interpEl.textContent = stats.overallInterpretation;
  if (countEl) countEl.textContent = `${stats.sampleSize} คน`;

  // Render Table of Question Stats for Chapter 4
  const tableBody = document.getElementById('survey-stats-table-body');
  if (tableBody) {
    let index = 1;
    let rowsHtml = '';
    SURVEY_QUESTIONS.forEach(group => {
      group.items.forEach(item => {
        const qStat = stats.questionStats[item.id];
        rowsHtml += `
          <tr class="border-b border-slate-100 hover:bg-slate-50/70 text-xs">
            <td class="py-2.5 px-3 text-slate-700">${item.text}</td>
            <td class="py-2.5 px-3 text-center font-bold text-orange-600">${qStat.mean.toFixed(2)}</td>
            <td class="py-2.5 px-3 text-center text-slate-500">${qStat.sd.toFixed(2)}</td>
            <td class="py-2.5 px-3 text-center font-medium ${qStat.mean >= 4.5 ? 'text-emerald-600' : 'text-blue-600'}">
              ${qStat.interpretation.split(' ')[0]}
            </td>
          </tr>
        `;
      });
    });
    tableBody.innerHTML = rowsHtml;
  }

  // Render Chart.js
  const chartCanvas = document.getElementById('surveyChart');
  if (chartCanvas && window.Chart) {
    if (AppState.surveyChart) {
      AppState.surveyChart.destroy();
    }

    const labels = stats.categoryStats.map(c => c.name);
    const dataValues = stats.categoryStats.map(c => c.mean);

    AppState.surveyChart = new Chart(chartCanvas, {
      type: 'bar',
      data: {
        labels: labels,
        datasets: [{
          label: 'ค่าเฉลี่ยความพึงพอใจ (เต็ม 5.00)',
          data: dataValues,
          backgroundColor: [
            'rgba(234, 88, 12, 0.85)',
            'rgba(249, 115, 22, 0.85)',
            'rgba(217, 119, 6, 0.85)',
            'rgba(16, 185, 129, 0.85)',
            'rgba(139, 92, 246, 0.85)'
          ],
          borderRadius: 8,
          barThickness: 32
        }]
      },
      options: {
        responsive: true,
        maintainAspectRatio: false,
        plugins: {
          legend: { display: false },
          tooltip: {
            callbacks: {
              label: (context) => ` ค่าเฉลี่ย: ${context.parsed.y.toFixed(2)} (${getInterpretation(context.parsed.y)})`
            }
          }
        },
        scales: {
          y: {
            min: 3.0,
            max: 5.0,
            ticks: { stepSize: 0.5 }
          }
        }
      }
    });
  }

  // Render recent comments
  const commentsContainer = document.getElementById('recent-comments-container');
  if (commentsContainer) {
    const feedbackList = AppState.surveys.filter(s => s.comment).slice(-4).reverse();
    commentsContainer.innerHTML = feedbackList.map(item => `
      <div class="p-3 rounded-xl bg-white border border-slate-100 shadow-2xs text-xs space-y-1">
        <div class="flex items-center justify-between text-slate-500">
          <span class="font-bold text-slate-800">${item.name} (${item.gender}, ${item.age})</span>
          <span>${item.date}</span>
        </div>
        <p class="text-slate-600 leading-relaxed">${item.comment}</p>
      </div>
    `).join('');
  }
}

/**
 * Handle Survey Form Submit
 */
function handleSurveySubmit(e) {
  e.preventDefault();
  const form = e.target;
  const formData = new FormData(form);

  const scores = {};
  for (let i = 1; i <= 10; i++) {
    const val = formData.get(`q${i}`);
    if (!val) {
      showToast(`กรุณาตอบคำถามให้ครบทุกข้อ (ข้อ ${i})`, 'warning');
      return;
    }
    scores[`q${i}`] = parseInt(val);
  }

  const name = formData.get('respondent_name') || 'ผู้ใช้งานทั่วไป';
  const gender = formData.get('respondent_gender') || 'ไม่ระบุ';
  const age = formData.get('respondent_age') || 'ไม่ระบุ';
  const comment = formData.get('respondent_comment') || '';

  const newResponse = {
    id: Date.now(),
    name,
    gender,
    age,
    scores,
    comment,
    date: new Date().toISOString().split('T')[0]
  };

  AppState.surveys.push(newResponse);
  localStorage.setItem('nangrong_surveys', JSON.stringify(AppState.surveys));

  form.reset();
  updateSurveyDashboard();

  showToast('บันทึกการประเมินความพึงพอใจสำเร็จ! ขอบคุณสำหรับความคิดเห็นครับ', 'success');

  // Scroll to stats dashboard
  document.getElementById('survey-dashboard')?.scrollIntoView({ behavior: 'smooth' });
}

/**
 * Export Survey Data as CSV for Excel / SPSS
 */
function exportSurveyCSV() {
  const responses = AppState.surveys;
  if (!responses || responses.length === 0) {
    showToast('ยังไม่มีข้อมูลการประเมิน', 'info');
    return;
  }

  // Header row
  let csvContent = '\uFEFF'; // UTF-8 BOM for Thai language in Excel
  csvContent += 'ID,ผู้ประเมิน,เพศ,ช่วงอายุ,ข้อ1_UI,ข้อ2_องค์ประกอบ,ข้อ3_เมนูง่าย,ข้อ4_มือถือ,ข้อ5_ข้อมูลครบ,ข้อ6_แผนที่,ข้อ7_ค้นหาไว,ข้อ8_ความเร็ว,ข้อ9_ช่วยหาร้าน,ข้อ10_ภาพรวม,ความคิดเห็นเพิ่มเติม,วันที่ประเมิน\n';

  responses.forEach(r => {
    const row = [
      r.id,
      `"${r.name}"`,
      r.gender,
      `"${r.age}"`,
      r.scores.q1,
      r.scores.q2,
      r.scores.q3,
      r.scores.q4,
      r.scores.q5,
      r.scores.q6,
      r.scores.q7,
      r.scores.q8,
      r.scores.q9,
      r.scores.q10,
      `"${(r.comment || '').replace(/"/g, '""')}"`,
      r.date
    ];
    csvContent += row.join(',') + '\n';
  });

  const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
  const url = URL.createObjectURL(blob);
  const link = document.createElement('a');
  link.setAttribute('href', url);
  link.setAttribute('download', `nangrong_survey_results_${new Date().toISOString().split('T')[0]}.csv`);
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);

  showToast('ส่งออกไฟล์ข้อมูล CSV (Excel) สำเร็จแล้ว!', 'success');
}

/**
 * Handle Suggestion Form Submit
 */
function handleSuggestSubmit(e) {
  e.preventDefault();
  const form = e.target;
  const placeName = document.getElementById('suggest-name').value.trim();
  const placeCategory = document.getElementById('suggest-cat').value;
  const placeLocation = document.getElementById('suggest-loc').value.trim();
  const placeMenu = document.getElementById('suggest-menu').value.trim();
  const placeReason = document.getElementById('suggest-reason').value.trim();

  if (!placeName || !placeLocation) return;

  const newSuggest = {
    id: Date.now(),
    name: placeName,
    category: placeCategory,
    location: placeLocation,
    menu: placeMenu,
    reason: placeReason,
    date: new Date().toISOString().split('T')[0]
  };

  AppState.suggestedPlaces.push(newSuggest);
  localStorage.setItem('nangrong_suggested', JSON.stringify(AppState.suggestedPlaces));

  form.reset();
  closeSuggestModal();
  showToast('ส่งข้อมูลร้านลับเรียบร้อยแล้ว! ขอบคุณที่ช่วยแนะนำร้านอาหารในอำเภอนางรองครับ', 'success');
}

function openSuggestModal() {
  document.getElementById('suggest-modal')?.classList.remove('hidden');
}

function closeSuggestModal() {
  document.getElementById('suggest-modal')?.classList.add('hidden');
}

/**
 * Toast Notification Helper
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
