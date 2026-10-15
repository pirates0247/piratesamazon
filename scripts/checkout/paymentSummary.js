import {cart} from "../../data/cart.js";
import {getDeliveryOption} from "../../data/deliveryOptions.js";
import {getProduct} from "../../data/products.js";
import {calculateCartQuantity} from "../../data/cart.js";

export function renderPaymentSummary() {
  let productPrice = 0;
  let shippingPrice = 0;
  let paymentSummaryHTML = "";

  cart.forEach((cartItem) => {
    let product = getProduct(cartItem.productId);
    productPrice += product.rupees * cartItem.quantity;

    let deliveryOption = getDeliveryOption(cartItem.deliveryOptionId);
    shippingPrice += deliveryOption.rupees;
  });
  
  let cartQuantity = calculateCartQuantity();
  let totalBeforeTax = productPrice + shippingPrice;
  let tax = productPrice * 0.1;
  let totalPrice = totalBeforeTax + tax;

  paymentSummaryHTML += `
    <div class="payment-summary-title">
      Order Summary
    </div>
    <div class="payment-summary-row">
      <div>Items (${cartQuantity}):</div>
      <div class="payment-summary-money">₹${productPrice.toFixed(2)}</div>
    </div>
    <div class="payment-summary-row">
      <div>Shipping &amp; handling:</div>
      <div class="payment-summary-money">₹${shippingPrice.toFixed(2)}</div>
    </div>
    <div class="payment-summary-row subtotal-row">
      <div>Total before tax:</div>
      <div class="payment-summary-money">₹${totalBeforeTax.toFixed(2)}</div>
    </div>
    <div class="payment-summary-row">
       <div>Estimated tax (10%):</div>
        <div class="payment-summary-money">₹${tax.toFixed(2)}</div>
    </div>
    <div class="payment-summary-row total-row">
      <div>Order total:</div>
      <div class="payment-summary-money">₹${totalPrice.toFixed(2)}</div>
    </div>
    <button class="place-order-button button-primary js-place-order-btn">
      Proceed to Payment
    </button>
  `
  document.querySelector('.js-payment-summary')
   .innerHTML = paymentSummaryHTML;

  // Navigate to payment gateway
  document.querySelector('.js-place-order-btn')
    .addEventListener('click', () => {
      window.location.href = 'payment.html';
    });
}
//in 46th line we can use Math.round(totalPrice)