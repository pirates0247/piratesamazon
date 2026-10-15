
import { getProduct, loadProductsFetch } from '../data/products.js';
import { calculateCartQuantity } from '../data/cart.js';
import { getOrder } from '../data/orders.js';
import dayjs from "https://unpkg.com/dayjs@1.11.10/esm/index.js";
import { getDeliveryOption } from '../data/deliveryOptions.js';

async function loadPage() {
  await loadProductsFetch();
  
  const url = new URL(window.location.href);
  const orderId = url.searchParams.get('orderId');
  const productId = url.searchParams.get('productId');

  const order = getOrder(orderId);
  const product = getProduct(productId);

  if (!order || !product) {
    document.querySelector('.js-order-tracking').innerHTML = `
      <div style="text-align:center; margin-top:50px;">
        <h2>Oops! Tracking information not found.</h2>
        <a href="orders.html" class="link-primary">Return to orders</a>
      </div>
    `;
    return;
  }

  let productDetails;
  order.products.forEach((details) => {
    if (details.productId === product.id) {
      productDetails = details;
    }
  });

  const deliveryOption = getDeliveryOption(productDetails.deliveryOptionId);
  const orderTime = dayjs(order.orderTime);
  const deliveryTime = dayjs(order.orderTime).add(deliveryOption.deliveryDays, 'day');
  const today = dayjs();
  const isDelivered = today.isAfter(deliveryTime);

  let progressPercent = ((today - orderTime) / (deliveryTime - orderTime)) * 100;
  if (progressPercent < 0) progressPercent = 0;
  if (progressPercent > 100) progressPercent = 100;
  
  // To ensure the animation visually happens from 0 to actual progress:
  const actualProgress = progressPercent;

  const trackingHTML = `
    <div class="view-all-orders-line">
      <a class="link-primary" href="orders.html">View all orders</a>
    </div>
    <div class="delivery-date">
      ${isDelivered ? `Product Delivered on ${deliveryTime.format('dddd, MMMM D')}` : `Arriving on ${deliveryTime.format('dddd, MMMM D')}`}
    </div>
    <div class="product-info-1">
      ${product.name}
    </div>
    <div class="product-info-2">
      Quantity: ${productDetails.quantity}
    </div>
    <img class="product-image" src="${product.image}">
    <div class="progress-label-container">
      <div class="progress-label ${actualProgress < 50 ? 'current-status' : ''}">
        Preparing
      </div>
      <div class="progress-label ${(actualProgress >= 50 && actualProgress < 100) ? 'current-status' : ''}">
        Shipped
      </div>
      <div class="progress-label ${actualProgress >= 100 ? 'current-status' : ''}">
        Delivered
      </div>
    </div>
    <div class="progress-bar-container">
      <div class="progress-bar js-progress-bar" style="width: 0%; transition: width 1s ease-in-out;"></div>
    </div>
  `;

  document.querySelector('.js-order-tracking').innerHTML = trackingHTML;

  setTimeout(() => {
    document.querySelector('.js-progress-bar').style.width = actualProgress + '%';
  }, 100);

  updateCartQuantity();
}

function updateCartQuantity() {
  const cartQuantity = calculateCartQuantity();
  const quantityEl = document.querySelector('.js-cart-quantity');
  if (quantityEl) {
    quantityEl.innerHTML = cartQuantity > 0 ? cartQuantity : '';
  }
}

loadPage();
