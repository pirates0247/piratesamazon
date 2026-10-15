/**
 * data/orders.js
 * Persistent, per-user order storage using localStorage.
 *
 * A unique user ID is generated once per browser profile and stored
 * permanently. All orders are keyed under `orders_<userId>`, so
 * different users on different machines/browsers get isolated data
 * that survives page reloads and browser restarts.
 */

// ── Per-user identity ───────────────────────────────────────────
function getUserId() {
  let uid = localStorage.getItem('pirates_user_id');
  if (!uid) {
    uid = 'user_' + crypto.randomUUID();
    localStorage.setItem('pirates_user_id', uid);
  }
  return uid;
}

function getOrdersKey() {
  return `orders_${getUserId()}`;
}

// ── State ───────────────────────────────────────────────────────
export let orders = JSON.parse(localStorage.getItem(getOrdersKey())) || [];

function saveToStorage() {
  localStorage.setItem(getOrdersKey(), JSON.stringify(orders));
}

// ── Public API ──────────────────────────────────────────────────
export function addOrder(order) {
  orders.unshift(order);
  saveToStorage();
}

export function getOrder(orderId) {
  return orders.find((o) => o.id === orderId) || null;
}

export function getAllOrders() {
  return orders;
}
