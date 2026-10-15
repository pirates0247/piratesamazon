import {cart, removeFromCart, calculateCartQuantity, updateQuantity, updateDeliveryOption} from "../../data/cart.js";
import {products, getProduct} from "../../data/products.js";
import {deliveryOptions, getDeliveryOption, calculateDeliveryDate} from "../../data/deliveryOptions.js";
import {renderPaymentSummary} from "./paymentSummary.js";


export function renderOrderSummary() {

  // ── Empty cart state ──────────────────────────
  if (!cart || cart.length === 0) {
    document.querySelector('.js-order-summary').innerHTML = `
      <div class="empty-cart-state">
        <div class="empty-cart-icon">🛒</div>
        <h2 class="empty-cart-title">Your cart is empty</h2>
        <p class="empty-cart-subtitle">Looks like you haven't added anything to your cart yet.</p>
        <a href="index.html" class="empty-cart-btn button-primary">Browse Products</a>
      </div>
    `;
    document.querySelector('.js-payment-summary').innerHTML = '';
    document.querySelector('.js-return-to-home-link').innerHTML = '0 items';
    return;
  }

  let cartSummaryHTML = "";
  cart.forEach((cartItem) => {
    let productId = cartItem.productId;

    /*
    let matchingProduct;

    products.forEach((product) => {
      if(product.id === productId){
        matchingProduct = product;
      }
    });*/

    let matchingProduct = getProduct(productId);


    let deliveryOptionId = cartItem.deliveryOptionId;
    
    let deliveryOption = getDeliveryOption(deliveryOptionId);
   
    let dateString = calculateDeliveryDate(deliveryOption);


    cartSummaryHTML +=`
      <div class="cart-item-container js-cart-item-container-${matchingProduct.id}">
        <div class="delivery-date">
          Delivery date: ${dateString}
        </div>
        <div class="cart-item-details-grid">
          <img class="product-image"
            src="${matchingProduct.image}">
          <div class="cart-item-details">
            <div class="product-name">
              ${matchingProduct.name}
            </div>
            <div class="product-price">
              ${matchingProduct.getPrice()}
            </div>
            <div class="product-quantity">
              <span>
                Quantity: <span class="quantity-label js-quantity-label-${matchingProduct.id}">${cartItem.quantity}</span>
              </span>
              <span class="update-quantity-link link-primary js-update-link" data-product-id="${matchingProduct.id}">
                Update
              </span>
              <input class="quantity-input js-quantity-input-${matchingProduct.id}"><span class="save-quantity-link link-primary js-save-link" data-product-id="${matchingProduct.id}">Save</span>
              <span class="delete-quantity-link link-primary js-delete-link" data-product-id="${matchingProduct.id}">
                Delete
              </span>
            </div>
          </div>
          <div class="delivery-options">
            <div class="delivery-options-title">
              Choose a delivery option:
            </div>
            ${deliveryOptionsHTML(matchingProduct, cartItem)}
          </div>
        </div>
      </div>
    `;
  });

  function deliveryOptionsHTML(matchingProduct, cartItem) {
    let html = '';
    deliveryOptions.forEach((deliveryOption) => {
      let dateString = calculateDeliveryDate(deliveryOption);
      let priceString = deliveryOption.rupees === 0 ? 'FREE': `${deliveryOption.rupees}`;
      let isChecked = deliveryOption.id === cartItem.deliveryOptionId;
      html+=`
        <div class="delivery-option js-delivery-option" data-product-id="${matchingProduct.id}" data-delivery-option-id="${deliveryOption.id}">
          <input type="radio" ${isChecked ? 'checked' : ''}
            class="delivery-option-input"
            name="delivery-option-${matchingProduct.id}">
          <div>
            <div class="delivery-option-date">
              ${dateString}
            </div>
            <div class="delivery-option-price">
              &#x20B9 ${priceString} - Shipping
            </div>
          </div>
        </div>
      `
    });
    return html;
  }

  document.querySelector('.js-order-summary')
  .innerHTML = cartSummaryHTML;

  document.querySelectorAll('.js-update-link')
  .forEach((link) => {
    link.addEventListener('click',() => {
      let productId = link.dataset.productId;
      let container = document.querySelector(`.js-cart-item-container-${productId}`);
      container.classList.add('is-editing-quantity');
    }); 
  });

  document.querySelectorAll('.js-save-link')
  .forEach((link) => {
    link.addEventListener('click',() => {
      let productId = link.dataset.productId;
      let container = document.querySelector(`.js-cart-item-container-${productId}`);
      container.classList.remove('is-editing-quantity');
      let quantityInput = document.querySelector(`.js-quantity-input-${productId}`);
      let newQuantity = Number(quantityInput.value);
      if(newQuantity < 0){
        alert("Quantity cannot be negative");
        return;
      }
      // Auto-remove item when quantity is set to 0
      if(newQuantity === 0){
        removeFromCart(productId);
        renderOrderSummary();
        renderPaymentSummary();
        return;
      }
      //to limit cartquantity
      if(newQuantity > 50){
        alert("The maximum limit of a same product is reached!");
        return;
      }
      updateQuantity(productId, newQuantity);
      document.querySelector(`.js-quantity-label-${productId}`)
      .innerHTML = newQuantity;
      updateCartQuantity();
      renderPaymentSummary();
    });
  });

  document.querySelectorAll('.js-delete-link')
  .forEach((link) => {
    link.addEventListener('click',() => {
      let productId = link.dataset.productId;
      removeFromCart(productId);
      let container = document.querySelector(`.js-cart-item-container-${productId}`);
      container.remove();
      //we can use the below code also to update the page
      //renderOrderSummary();
      updateCartQuantity();
      renderPaymentSummary();
    });
  });
  function updateCartQuantity() {
    let cartQuantity = calculateCartQuantity();
    document.querySelector('.js-return-to-home-link')
    .innerHTML= `${cartQuantity} items`;
  }
  updateCartQuantity();

  document.querySelectorAll('.js-delivery-option')
    .forEach((element) => {
      element.addEventListener('click',() => {
        let productId = element.dataset.productId;
        let deliveryOptionId = element.dataset.deliveryOptionId;
        updateDeliveryOption(productId, deliveryOptionId);
        renderOrderSummary();
        renderPaymentSummary();
      });
    });
}