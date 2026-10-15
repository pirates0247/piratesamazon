
import { getProduct, loadProductsFetch } from '../data/products.js';
import { calculateCartQuantity, addToCart } from '../data/cart.js';
import { orders, getAllOrders } from '../data/orders.js';
import dayjs from "https://unpkg.com/dayjs@1.11.10/esm/index.js";
import { getDeliveryOption } from '../data/deliveryOptions.js';

// ── State ──────────────────────────────────────────────────────
let currentFilter = 'all';   // 'all' | 'arriving' | 'delivered'
let currentSearch = '';

// ── Boot ───────────────────────────────────────────────────────
async function loadPage() {
  await loadProductsFetch();
  setupSearch();
  setupFilters();
  renderOrders();
}

// ── Helpers ────────────────────────────────────────────────────
function getOrderStatus(order, productDetails) {
  const deliveryOption = getDeliveryOption(productDetails.deliveryOptionId);
  const deliveryDate = dayjs(order.orderTime).add(deliveryOption.deliveryDays, 'day');
  return dayjs().isAfter(deliveryDate) ? 'delivered' : 'arriving';
}

function orderMatchesSearch(order, query) {
  if (!query) return true;
  const q = query.toLowerCase();

  // Match by order ID
  if (order.id.toLowerCase().includes(q)) return true;

  // Match by product name
  for (const pd of order.products) {
    const product = getProduct(pd.productId);
    if (product && product.name.toLowerCase().includes(q)) return true;
  }

  // Match by delivery status keywords
  for (const pd of order.products) {
    const status = getOrderStatus(order, pd);
    if (status.includes(q)) return true;
  }

  // Match by date
  const dateStr = dayjs(order.orderTime).format('MMMM D YYYY').toLowerCase();
  if (dateStr.includes(q)) return true;

  return false;
}

function orderMatchesFilter(order, filter) {
  if (filter === 'all') return true;

  for (const pd of order.products) {
    const status = getOrderStatus(order, pd);
    if (status === filter) return true;
  }
  return false;
}

// ── Search ─────────────────────────────────────────────────────
function setupSearch() {
  const input = document.querySelector('.js-order-search-input');
  const btn = document.querySelector('.js-order-search-btn');

  if (!input) return;

  let debounceId;

  input.addEventListener('input', () => {
    clearTimeout(debounceId);
    debounceId = setTimeout(() => {
      currentSearch = input.value.trim();
      renderOrders();
    }, 250);
  });

  input.addEventListener('keydown', (e) => {
    if (e.key === 'Enter') {
      clearTimeout(debounceId);
      currentSearch = input.value.trim();
      renderOrders();
    }
  });

  if (btn) {
    btn.addEventListener('click', () => {
      currentSearch = input.value.trim();
      renderOrders();
    });
  }
}

// ── Filters ────────────────────────────────────────────────────
function setupFilters() {
  document.querySelectorAll('.js-filter-btn').forEach((btn) => {
    btn.addEventListener('click', () => {
      document.querySelectorAll('.js-filter-btn').forEach(b => b.classList.remove('active'));
      btn.classList.add('active');
      currentFilter = btn.dataset.filter;
      renderOrders();
    });
  });
}

// ── Render ─────────────────────────────────────────────────────
function renderOrders() {
  const allOrders = getAllOrders();

  // Filter and search
  const filtered = allOrders.filter((order) => {
    return orderMatchesFilter(order, currentFilter) && orderMatchesSearch(order, currentSearch);
  });

  // Search status banner
  const statusEl = document.querySelector('.js-orders-search-status');
  if (statusEl) {
    if (currentSearch) {
      statusEl.hidden = false;
      statusEl.innerHTML = `
        <span>Showing results for "<strong>${escapeHtml(currentSearch)}</strong>"</span>
        <span class="search-result-count">${filtered.length} order${filtered.length !== 1 ? 's' : ''} found</span>
        <button class="clear-search-btn js-clear-search">Clear</button>
      `;
      const clearBtn = statusEl.querySelector('.js-clear-search');
      if (clearBtn) {
        clearBtn.addEventListener('click', () => {
          currentSearch = '';
          const input = document.querySelector('.js-order-search-input');
          if (input) input.value = '';
          renderOrders();
        });
      }
    } else {
      statusEl.hidden = true;
      statusEl.innerHTML = '';
    }
  }

  let ordersHTML = '';

  filtered.forEach((order) => {
    const orderDate = dayjs(order.orderTime).format('MMMM D');

    let productsListHTML = '';

    order.products.forEach((productDetails) => {
      const product = getProduct(productDetails.productId);
      if (!product) return;
      
      const deliveryOption = getDeliveryOption(productDetails.deliveryOptionId);
      const estimatedDelivery = dayjs(order.orderTime).add(deliveryOption.deliveryDays, 'day').format('MMMM D');
      const isDelivered = dayjs().isAfter(dayjs(order.orderTime).add(deliveryOption.deliveryDays, 'day'));

      productsListHTML += `
        <div class="product-image-container">
          <img src="${product.image}">
        </div>
        <div class="product-details">
          <div class="product-name products-name-in-2-lines">
            ${product.name}
          </div>
          <div class="product-delivery-date">
            <span class="delivery-status-badge ${isDelivered ? 'delivered' : 'arriving'}">
              ${isDelivered ? '✓ Delivered' : '📦 Arriving'}
            </span>
            ${isDelivered ? `on ${estimatedDelivery}` : `on ${estimatedDelivery}`}
          </div>
          <div class="product-quantity">
            Quantity: ${productDetails.quantity}
          </div>
          <button class="buy-again-button button-primary js-buy-again" data-product-id="${product.id}">
            <img src="images/buy-again.png">
            <span class="buy-again-message">Buy it again</span>
          </button>
        </div>
        <div class="product-actions">
          <a href="tracking.html?orderId=${order.id}&productId=${product.id}">
            <button class="track-package-button button-secondary">
              Track package
            </button>
          </a>
        </div>
      `;
    });

    ordersHTML += `
      <div class="order-container">
        <div class="order-header">
          <div class="order-header-left-section">
            <div class="order-date-container">
              <div class="order-date">Order Placed:</div>
              <div>${orderDate}</div>
            </div>
            <div class="total">
              <div class="total-line">Total:</div>
              <div>&#x20B9 ${order.totalCost.toFixed(2)}</div>
            </div>
          </div>
          <div class="order-id-container">
            <div class="order-id-line">Order ID:</div>
            <div class="order-id-value">${order.id.slice(0, 8)}...</div>
          </div>
        </div>
        <div class="order-details-grid">
          ${productsListHTML}
        </div>
      </div>
    `;
  });

  const grid = document.querySelector('.js-orders-grid');
  if (grid) {
    if (allOrders.length === 0) {
      grid.innerHTML = `
        <div class="empty-orders">
          <div class="empty-orders-icon">📦</div>
          <h2>No orders yet</h2>
          <p>When you place an order, it will appear here.</p>
          <a href="index.html" class="button-primary empty-orders-btn">Start Shopping</a>
        </div>
      `;
    } else if (filtered.length === 0) {
      grid.innerHTML = `
        <div class="empty-orders">
          <div class="empty-orders-icon">🔍</div>
          <h2>No matching orders</h2>
          <p>Try a different search term or filter.</p>
        </div>
      `;
    } else {
      grid.innerHTML = ordersHTML;
    }
  }

  // Buy again handlers
  document.querySelectorAll('.js-buy-again').forEach((button) => {
    button.addEventListener('click', () => {
      const productId = button.dataset.productId;
      addToCart(productId);
      updateCartQuantity();

      const originalText = button.innerHTML;
      button.innerHTML = '✓ Added';
      button.style.backgroundColor = '#067d62';
      button.style.color = '#fff';
      setTimeout(() => {
        button.innerHTML = originalText;
        button.style.backgroundColor = '';
        button.style.color = '';
      }, 1500);
    });
  });

  updateCartQuantity();
}

function escapeHtml(str) {
  return String(str)
    .replaceAll('&', '&amp;')
    .replaceAll('<', '&lt;')
    .replaceAll('>', '&gt;')
    .replaceAll('"', '&quot;')
    .replaceAll("'", '&#039;');
}

function updateCartQuantity() {
  const cartQuantity = calculateCartQuantity();
  const quantityEl = document.querySelector('.js-cart-quantity');
  if (quantityEl) {
    quantityEl.innerHTML = cartQuantity > 0 ? cartQuantity : '';
  }
}

loadPage();
