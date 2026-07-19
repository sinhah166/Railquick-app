// ── PRODUCT DATA ─────────────────────────────────────────────
const products = [
  { id:1,  name:'Amul Full Cream Milk', qty:'500 ml',   price:29,  mrp:32,  discount:'9%',  emoji:'🥛', cat:'dairy'    },
  { id:2,  name:"Lay's Classic Salted", qty:'52 g',     price:20,  mrp:30,  discount:'33%', emoji:'🍟', cat:'snacks'   },
  { id:3,  name:'Fresh Bananas',         qty:'6 pcs',   price:35,  mrp:45,  discount:'22%', emoji:'🍌', cat:'fresh'    },
  { id:4,  name:'Coke 750ml',            qty:'1 bottle',price:45,  mrp:50,  discount:'10%', emoji:'🥤', cat:'drinks'   },
  { id:5,  name:'Farm Fresh Eggs',       qty:'12 pcs',  price:84,  mrp:96,  discount:'12%', emoji:'🥚', cat:'dairy'    },
  { id:6,  name:'Maggi 2-Min Noodles',   qty:'70g × 4', price:56,  mrp:68,  discount:'17%', emoji:'🍜', cat:'snacks'   },
  { id:7,  name:'Red Tomatoes',          qty:'500 g',   price:28,  mrp:35,  discount:'20%', emoji:'🍅', cat:'fresh'    },
  { id:8,  name:'Britannia Bread',       qty:'400 g',   price:42,  mrp:50,  discount:'16%', emoji:'🍞', cat:'snacks'   },
  { id:9,  name:'Amul Butter',           qty:'100 g',   price:55,  mrp:60,  discount:'8%',  emoji:'🧈', cat:'dairy'    },
  { id:10, name:'Tropicana Orange',      qty:'1 L',     price:99,  mrp:130, discount:'23%', emoji:'🧃', cat:'drinks'   },
  { id:11, name:'Head & Shoulders',      qty:'340 ml',  price:295, mrp:399, discount:'26%', emoji:'🧴', cat:'personal' },
  { id:12, name:"Lay's Magic Masala",    qty:'52 g',    price:20,  mrp:30,  discount:'33%', emoji:'🌶️', cat:'snacks'   },
  { id:13, name:'Greek Yogurt',          qty:'400 g',   price:75,  mrp:95,  discount:'21%', emoji:'🥗', cat:'dairy'    },
  { id:14, name:'Fresh Lemons',          qty:'4 pcs',   price:22,  mrp:30,  discount:'26%', emoji:'🍋', cat:'fresh'    },
  { id:15, name:'Green Apples',          qty:'4 pcs',   price:89,  mrp:110, discount:'19%', emoji:'🍏', cat:'fresh'    },
  { id:16, name:'Sprite 750ml',          qty:'1 bottle',price:42,  mrp:50,  discount:'16%', emoji:'🫧', cat:'drinks'   },
];

const cart = {};

// ── NAVIGATION ────────────────────────────────────────────────
function goPage(name) {
  document.querySelectorAll('.page').forEach(p => p.classList.remove('active'));
  document.querySelectorAll('.nav-item').forEach(n => n.classList.remove('active'));
  document.getElementById('page-' + name).classList.add('active');
  document.getElementById('nav-' + name).classList.add('active');
  if (name === 'cart') updateCartPage();
  const float = document.getElementById('miniCartFloat');
  if (name === 'home') updateMiniCart();
  else float.classList.remove('visible');
}

function goSearch() {
  goPage('search');
  setTimeout(() => { const el = document.getElementById('searchInput'); if (el) el.focus(); }, 200);
}

// ── CATEGORY TABS ─────────────────────────────────────────────
function setTab(el, cat) {
  document.querySelectorAll('.cat-tab').forEach(t => t.classList.remove('active'));
  el.classList.add('active');
  const label = cat === 'all' ? 'all items' : cat;
  showToast('Showing ' + label + ' ⚡');
}

// ── PRODUCT CARD BUILDER ──────────────────────────────────────
function buildCard(p) {
  const qty = cart[p.id] || 0;
  const ctrl = qty > 0
    ? `<div class="qty-control">
         <button class="qty-btn" onclick="changeQty(${p.id},-1)">−</button>
         <span class="qty-num">${qty}</span>
         <button class="qty-btn" onclick="changeQty(${p.id},+1)">+</button>
       </div>`
    : `<button class="add-btn" onclick="changeQty(${p.id},+1)">+</button>`;
  return `
  <div class="product-card" id="pcard-${p.id}">
    <div class="product-discount-tag">${p.discount} off</div>
    <div class="product-img-wrap"><div class="product-emoji">${p.emoji}</div></div>
    <div class="product-qty">${p.qty}</div>
    <div class="product-name">${p.name}</div>
    <div class="product-price-row">
      <div>
        <div class="product-price">₹${p.price}</div>
        <div class="product-mrp">₹${p.mrp}</div>
      </div>
      <div id="btn-${p.id}">${ctrl}</div>
    </div>
  </div>`;
}

function changeQty(id, delta) {
  cart[id] = Math.max(0, (cart[id] || 0) + delta);
  if (cart[id] === 0) delete cart[id];
  refreshBtn(id);
  updateCartBadge();
  updateMiniCart();
  if (delta > 0) {
    const p = products.find(x => x.id === id);
    if (p) showToast(p.emoji + ' ' + p.name + ' added!');
  }
}

function refreshBtn(id) {
  const el = document.getElementById('btn-' + id);
  if (!el) return;
  const qty = cart[id] || 0;
  el.innerHTML = qty > 0
    ? `<div class="qty-control">
         <button class="qty-btn" onclick="changeQty(${id},-1)">−</button>
         <span class="qty-num">${qty}</span>
         <button class="qty-btn" onclick="changeQty(${id},+1)">+</button>
       </div>`
    : `<button class="add-btn" onclick="changeQty(${id},+1)">+</button>`;
}

function populateScrolls() {
  const best   = [1,2,3,4,5,6].map(id => products.find(p => p.id === id));
  const fresh  = products.filter(p => p.cat === 'fresh');
  const snacks = products.filter(p => p.cat === 'snacks');
  document.getElementById('bestSellersScroll').innerHTML = best.map(buildCard).join('');
  document.getElementById('freshPicksScroll').innerHTML  = fresh.map(buildCard).join('');
  document.getElementById('snacksScroll').innerHTML      = snacks.map(buildCard).join('');
}

// ── CART BADGE & MINI FLOAT ───────────────────────────────────
function updateCartBadge() {
  const total = Object.values(cart).reduce((a, b) => a + b, 0);
  const badge = document.getElementById('cartBadge');
  badge.textContent = total;
  badge.style.display = total > 0 ? 'flex' : 'none';
}

function getCartTotal() {
  return Object.entries(cart).reduce((sum, [id, qty]) => {
    const p = products.find(x => x.id == id);
    return sum + (p ? p.price * qty : 0);
  }, 0);
}

function updateMiniCart() {
  const count = Object.values(cart).reduce((a, b) => a + b, 0);
  const total = getCartTotal();
  const float = document.getElementById('miniCartFloat');
  const activePage = document.querySelector('.page.active');
  if (count > 0 && activePage && activePage.id === 'page-home') {
    document.getElementById('miniCartCount').textContent = count;
    document.getElementById('miniCartText').textContent  = count === 1 ? 'item in cart' : 'items in cart';
    document.getElementById('miniCartPrice').textContent = '₹' + (total + 2);
    float.classList.add('visible');
  } else {
    float.classList.remove('visible');
  }
}

// ── CART PAGE ─────────────────────────────────────────────────
function updateCartPage() {
  const content    = document.getElementById('cartContent');
  const billSec    = document.getElementById('billSection');
  const checkoutBtn= document.getElementById('checkoutBtn');
  const count      = Object.values(cart).reduce((a, b) => a + b, 0);
  const total      = getCartTotal();

  document.getElementById('cartSubtitle').textContent  = count + ' item' + (count !== 1 ? 's' : '') + ' · ₹' + total;
  document.getElementById('checkoutItems').textContent = count + ' item' + (count !== 1 ? 's' : '');
  document.getElementById('checkoutPrice').textContent = '₹' + (total + 2);
  document.getElementById('billItemTotal').textContent = '₹' + total;
  document.getElementById('billTotal').textContent     = '₹' + (total + 2);

  const savings = Object.entries(cart).reduce((sum, [id, qty]) => {
    const p = products.find(x => x.id == id);
    return sum + (p ? (p.mrp - p.price) * qty : 0);
  }, 0);
  document.getElementById('billSavings').textContent = savings > 0
    ? '🎉 You saved ₹' + savings + ' on this order!' : '';

  if (count === 0) {
    billSec.style.display = 'none';
    checkoutBtn.style.display = 'none';
    content.innerHTML = `
      <div class="empty-cart">
        <div class="empty-emoji">🛒</div>
        <div class="empty-title">Your cart is empty</div>
        <div class="empty-sub">Add items to get started</div>
        <button class="shop-btn" onclick="goPage('home')">Shop Now ⚡</button>
      </div>`;
    return;
  }

  billSec.style.display   = 'block';
  checkoutBtn.style.display = 'flex';

  content.innerHTML = '<div class="cart-items">' +
    Object.entries(cart).map(([id, qty]) => {
      const p = products.find(x => x.id == id);
      if (!p) return '';
      return `
      <div class="cart-item">
        <div class="cart-item-emoji">${p.emoji}</div>
        <div class="cart-item-info">
          <div class="cart-item-name">${p.name}</div>
          <div class="cart-item-qty-text">${p.qty}</div>
        </div>
        <div class="cart-item-price">₹${p.price * qty}</div>
        <div style="display:flex;align-items:center;gap:8px;">
          <button class="ci-btn" onclick="cartQty(${id},-1)">−</button>
          <span class="ci-num">${qty}</span>
          <button class="ci-btn" onclick="cartQty(${id},+1)">+</button>
        </div>
      </div>`;
    }).join('') + '</div>';
}

function cartQty(id, delta) {
  changeQty(id, delta);
  updateCartPage();
}

// ── SEARCH ────────────────────────────────────────────────────
function setSearch(val) {
  document.getElementById('searchInput').value = val;
  handleSearch(val);
}

function handleSearch(val) {
  const trending = document.getElementById('trendingSection');
  const results  = document.getElementById('searchResults');
  const label    = document.getElementById('searchResultsLabel');
  const grid     = document.getElementById('searchResultsGrid');

  if (!val.trim()) {
    trending.style.display = '';
    results.style.display  = 'none';
    return;
  }

  trending.style.display = 'none';
  results.style.display  = 'block';

  const filtered = products.filter(p =>
    p.name.toLowerCase().includes(val.toLowerCase()) ||
    p.cat.toLowerCase().includes(val.toLowerCase())
  );

  label.textContent = filtered.length > 0
    ? filtered.length + ' results for "' + val + '"'
    : 'No results for "' + val + '"';

  if (filtered.length === 0) {
    grid.innerHTML = `
      <div style="grid-column:1/-1;text-align:center;padding:40px 0;">
        <div style="font-size:48px;">😕</div>
        <div style="font-size:16px;font-weight:700;color:#1A0533;margin-top:8px;">Nothing found</div>
        <div style="font-size:13px;color:#9CA3AF;margin-top:4px;">Try "milk" or "chips"</div>
      </div>`;
    return;
  }

  grid.innerHTML = filtered.map(p => `
    <div style="background:#fff;border-radius:16px;padding:12px;box-shadow:0 2px 12px rgba(107,33,168,.08);">
      <div style="font-size:42px;text-align:center;margin-bottom:8px;">${p.emoji}</div>
      <div style="font-size:11px;color:#9CA3AF;">${p.qty}</div>
      <div style="font-size:13px;font-weight:700;color:#1A0533;margin:2px 0 6px;line-height:1.3;">${p.name}</div>
      <div style="display:flex;align-items:center;justify-content:space-between;">
        <div>
          <div style="font-size:14px;font-weight:800;">₹${p.price}</div>
          <div style="font-size:11px;color:#9CA3AF;text-decoration:line-through;">₹${p.mrp}</div>
        </div>
        <button onclick="changeQty(${p.id},+1)"
          style="background:#7C3AED;border:none;border-radius:8px;width:30px;height:30px;color:#fff;font-size:20px;cursor:pointer;display:flex;align-items:center;justify-content:center;box-shadow:0 4px 12px rgba(107,33,168,.4);">+</button>
      </div>
    </div>`).join('');
}

// ── TOAST ─────────────────────────────────────────────────────
let toastTimer;
function showToast(msg) {
  const t = document.getElementById('toast');
  t.textContent = msg;
  t.classList.add('show');
  clearTimeout(toastTimer);
  toastTimer = setTimeout(() => t.classList.remove('show'), 2500);
}

// ── SPLASH ────────────────────────────────────────────────────
window.addEventListener('DOMContentLoaded', () => {
  populateScrolls();
  const splash = document.getElementById('splash');
  setTimeout(() => {
    splash.style.opacity = '0';
    setTimeout(() => { splash.style.display = 'none'; }, 600);
  }, 2400);
});

document.getElementById('page-home').addEventListener('scroll', updateMiniCart);
