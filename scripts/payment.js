import { cart } from '../data/cart.js';
import { getProduct } from '../data/products.js';
import { getDeliveryOption } from '../data/deliveryOptions.js';
import { calculateCartQuantity, clearCart, loadCart } from '../data/cart.js';
import { loadProductsFetch } from '../data/products.js';
import { addOrder } from '../data/orders.js';


// ──────────────────────────────────────────────
// STATE & CONFIG
// ──────────────────────────────────────────────

let selectedPaymentMethod = 'UPI';
let totalAmount = 0;
let subtotalBeforeDiscount = 0;
let appliedCoupon = null;

const COD_CHARGE = 40;

function isCodActive() {
  const activeBtn = document.querySelector('.tab-btn.active');
  return activeBtn && activeBtn.dataset.tab === 'cod';
}

// ──────────────────────────────────────────────
// COUPON DEFINITIONS
// ──────────────────────────────────────────────
const COUPONS = {
  SAVE10: {
    code: 'SAVE10',
    type: 'percent',
    value: 10,
    description: '10% off on first UPI payment',
    requiredTab: 'upi',
    methodLabel: 'UPI',
  },
  HDFC5: {
    code: 'HDFC5',
    type: 'percent',
    value: 5,
    description: '5% cashback on HDFC cards',
    requiredTab: 'card',
    requiredBank: 'hdfc',
    methodLabel: 'HDFC Card',
  },
  PAYTM50: {
    code: 'PAYTM50',
    type: 'flat',
    value: 50,
    description: '₹50 off via Paytm Wallet',
    requiredTab: 'wallet',
    requiredWallet: 'paytm',
    methodLabel: 'Paytm Wallet',
  },
};

// ──────────────────────────────────────────────
// INIT
// ──────────────────────────────────────────────
async function initPaymentPage() {
  await loadProductsFetch();
  await new Promise((resolve) => {
    loadCart(() => resolve());
  });

  buildOrderSummary();
  setupTabs();
  setupEmptyCartState();

  // keep payment modal logic initialized after empty-state gating
  setupUpiApps();
  setupUpiVerify();
  setupCardForm();
  setupBankOptions();
  setupWalletOptions();
  setupPayButtons();
  setupModal();
  setupCoupons();
}

// ──────────────────────────────────────────────
// ORDER SUMMARY (Right Panel)
// ──────────────────────────────────────────────
function buildOrderSummary() {
  let productPrice = 0;
  let shippingPrice = 0;

  const itemsContainer = document.querySelector('.js-summary-items');

  let itemsHTML = '';

  cart.forEach((cartItem) => {
    const product = getProduct(cartItem.productId);
    productPrice += product.rupees * cartItem.quantity;

    const deliveryOption = getDeliveryOption(cartItem.deliveryOptionId);
    shippingPrice += deliveryOption.rupees;

    itemsHTML += `
      <div class="summary-item">
        <img class="summary-item-img" src="${product.image}" alt="${product.name}">
        <div class="summary-item-details">
          <div class="summary-item-name">${product.name}</div>
          <div class="summary-item-qty">Qty: ${cartItem.quantity}</div>
        </div>
        <div class="summary-item-price">₹${(product.rupees * cartItem.quantity).toFixed(2)}</div>
      </div>
    `;
  });

  itemsContainer.innerHTML = itemsHTML || '<p style="color:#767676;font-size:13px;">No items in cart</p>';

  const tax = productPrice * 0.1;
  const total = productPrice + shippingPrice + tax;
  subtotalBeforeDiscount = total;

  document.querySelector('.js-summary-items-price').textContent = `₹${productPrice.toFixed(2)}`;
  document.querySelector('.js-summary-shipping').textContent = `₹${shippingPrice.toFixed(2)}`;
  document.querySelector('.js-summary-tax').textContent = `₹${tax.toFixed(2)}`;

  updateCodChargesVisibility();
  updateTotalWithDiscount();
}

// ──────────────────────────────────────────────
// TABS
// ──────────────────────────────────────────────
function setupTabs() {
  const tabBtns = document.querySelectorAll('.tab-btn');
  const tabContents = document.querySelectorAll('.tab-content');


  tabBtns.forEach((btn) => {
    btn.addEventListener('click', () => {
      const targetTab = btn.dataset.tab;

      tabBtns.forEach(b => {
        b.classList.remove('active');
        b.setAttribute('aria-selected', 'false');
      });
      tabContents.forEach(c => c.classList.remove('active'));

      btn.classList.add('active');
      btn.setAttribute('aria-selected', 'true');
      document.getElementById(`content-${targetTab}`).classList.add('active');

      selectedPaymentMethod = btn.textContent.trim().replace(/[📱💳🏦👛📦]/gu, '').trim();

      // Auto-remove coupon if the new tab doesn't match the coupon's required tab
      if (appliedCoupon && appliedCoupon.requiredTab && appliedCoupon.requiredTab !== targetTab) {
        const couponCode = appliedCoupon.code;
        removeCoupon();
        showCouponMessage(`${couponCode} removed — requires a different payment method`, 'error');
      }

      // Toggle COD charges row
      updateCodChargesVisibility();
      updateTotalWithDiscount();
    });
  });
}

// ──────────────────────────────────────────────
// UPI APP SELECTION
// ──────────────────────────────────────────────
function setupUpiApps() {
  const upiApps = document.querySelectorAll('.js-upi-app');

  upiApps.forEach((app) => {
    app.addEventListener('click', () => {
      upiApps.forEach(a => a.classList.remove('selected'));
      app.classList.add('selected');

      const appName = app.querySelector('span').textContent;
      selectedPaymentMethod = appName;

      // Clear manual UPI input when app is selected
      const upiInput = document.getElementById('upi-id-input');
      if (upiInput) upiInput.value = '';
      clearUpiStatus();
    });
  });
}

// ──────────────────────────────────────────────
// UPI VERIFY
// ──────────────────────────────────────────────
function setupUpiVerify() {
  const verifyBtn = document.querySelector('.js-verify-upi');
  const upiInput = document.getElementById('upi-id-input');

  if (!verifyBtn || !upiInput) return;

  // Deselect app cards when typing
  upiInput.addEventListener('input', () => {
    document.querySelectorAll('.js-upi-app').forEach(a => a.classList.remove('selected'));
    clearUpiStatus();
  });

  verifyBtn.addEventListener('click', () => {
    const upiId = upiInput.value.trim();
    clearUpiStatus();

    if (!upiId) {
      showUpiError('Please enter a UPI ID');
      return;
    }

    const upiRegex = /^[\w.\-]+@[\w]+$/;
    if (!upiRegex.test(upiId)) {
      showUpiError('Invalid UPI ID format. Try: name@upi');
      return;
    }

    // Simulate verification
    verifyBtn.textContent = '...';
    verifyBtn.disabled = true;

    setTimeout(() => {
      verifyBtn.textContent = '✓';
      verifyBtn.disabled = false;
      showUpiSuccess(`UPI ID verified: ${upiId}`);
      selectedPaymentMethod = `UPI (${upiId})`;
      upiInput.classList.add('success');
    }, 1200);
  });
}

function showUpiError(msg) {
  document.getElementById('upi-error').textContent = msg;
  document.getElementById('upi-success').textContent = '';
  document.getElementById('upi-id-input').classList.add('error');
  document.getElementById('upi-id-input').classList.remove('success');
}

function showCodError(msg) {
  const codInput = document.getElementById('cod-phone');
  if (codInput) {
    codInput.classList.add('error');
  }

  const err = document.getElementById('cod-error');
  if (err) err.textContent = msg;
}

function clearCodError() {
  const codInput = document.getElementById('cod-phone');
  if (codInput) codInput.classList.remove('error');

  const err = document.getElementById('cod-error');
  if (err) err.textContent = '';
}


function showUpiSuccess(msg) {
  document.getElementById('upi-success').textContent = msg;
  document.getElementById('upi-error').textContent = '';
  document.getElementById('upi-id-input').classList.remove('error');
}

function clearUpiStatus() {
  document.getElementById('upi-error').textContent = '';
  document.getElementById('upi-success').textContent = '';
  document.getElementById('upi-id-input').classList.remove('error', 'success');
  document.getElementById('verify-upi-btn').textContent = 'Verify';
  document.getElementById('verify-upi-btn').disabled = false;
}

// ──────────────────────────────────────────────
// CARD FORM (Live Preview)
// ──────────────────────────────────────────────
function setupCardForm() {
  const cardNumberInput = document.getElementById('card-number-input');
  const cardNameInput = document.getElementById('card-name-input');
  const cardExpiryInput = document.getElementById('card-expiry-input');
  const cardCvvInput = document.getElementById('card-cvv-input');

  if (!cardNumberInput) return;

  // Card number formatting + preview
  cardNumberInput.addEventListener('input', (e) => {
    let value = e.target.value.replace(/\D/g, '').slice(0, 16);
    const formatted = value.replace(/(.{4})/g, '$1 ').trim();
    e.target.value = formatted;

    const display = value.padEnd(16, '•').replace(/(.{4})/g, '$1 ').trim();
    document.getElementById('card-display-number').textContent = display;
    document.getElementById('card-network-logo').textContent = detectCardNetwork(value);
    clearCardError('card-number-error');
  });

  // Name preview
  cardNameInput.addEventListener('input', (e) => {
    const name = e.target.value.toUpperCase() || 'YOUR NAME';
    document.getElementById('card-display-name').textContent = name;
  });

  // Expiry formatting + preview
  cardExpiryInput.addEventListener('input', (e) => {
    let value = e.target.value.replace(/\D/g, '').slice(0, 4);
    if (value.length >= 3) {
      value = value.slice(0, 2) + '/' + value.slice(2);
    }
    e.target.value = value;
    document.getElementById('card-display-expiry').textContent = value || 'MM/YY';
    clearCardError('expiry-error');
  });

  cardCvvInput.addEventListener('input', () => {
    clearCardError('cvv-error');
  });
}

function detectCardNetwork(number) {
  if (/^4/.test(number)) return 'VISA';
  if (/^5[1-5]/.test(number)) return 'MASTER';
  if (/^3[47]/.test(number)) return 'AMEX';
  if (/^6/.test(number)) return 'RUPAY';
  return 'CARD';
}

function clearCardError(id) {
  const el = document.getElementById(id);
  if (el) el.textContent = '';
}

function validateCardForm() {
  let valid = true;

  const cardNumber = document.getElementById('card-number-input').value.replace(/\s/g, '');
  const cardName = document.getElementById('card-name-input').value.trim();
  const expiry = document.getElementById('card-expiry-input').value.trim();
  const cvv = document.getElementById('card-cvv-input').value.trim();

  if (cardNumber.length < 16) {
    document.getElementById('card-number-error').textContent = 'Enter a valid 16-digit card number';
    valid = false;
  }

  if (!expiry.match(/^(0[1-9]|1[0-2])\/\d{2}$/)) {
    document.getElementById('expiry-error').textContent = 'Enter valid expiry (MM/YY)';
    valid = false;
  }

  if (cvv.length < 3) {
    document.getElementById('cvv-error').textContent = 'Enter valid CVV';
    valid = false;
  }

  return valid;
}

// ──────────────────────────────────────────────
// BANK OPTIONS (highlight selected)
// ──────────────────────────────────────────────
function setupBankOptions() {
  const bankCards = document.querySelectorAll('.js-bank-option');
  const bankSelect = document.getElementById('bank-select');

  bankCards.forEach((card) => {
    card.addEventListener('click', () => {
      const radio = card.querySelector('input[type="radio"]');
      if (radio) {
        radio.checked = true;
        if (bankSelect) bankSelect.value = radio.value;
      }
    });
  });

  if (bankSelect) {
    bankSelect.addEventListener('change', () => {
      bankCards.forEach((card) => {
        const radio = card.querySelector('input[type="radio"]');
        if (radio) radio.checked = radio.value === bankSelect.value;
      });
    });
  }
}

// ──────────────────────────────────────────────
// WALLET OPTIONS
// ──────────────────────────────────────────────
function setupWalletOptions() {
  const walletItems = document.querySelectorAll('.js-wallet-option');
  walletItems.forEach((item) => {
    item.addEventListener('click', () => {
      const radio = item.querySelector('input[type="radio"]');
      if (radio) radio.checked = true;
    });
  });
}

function setupEmptyCartState() {
  const emptyBox = document.querySelector('.js-payment-empty');
  const payButtons = document.querySelectorAll('.js-pay-now');

  const isEmpty = !cart || cart.length === 0;
  const isZeroTotal = Number.isFinite(totalAmount) ? totalAmount === 0 : isEmpty;

  if (!emptyBox) return;

  if (isEmpty || isZeroTotal) {
    emptyBox.style.display = 'block';
    payButtons.forEach((btn) => {
      btn.disabled = true;
      btn.style.opacity = '0.65';
      btn.style.cursor = 'not-allowed';
    });
  } else {
    emptyBox.style.display = 'none';
    payButtons.forEach((btn) => {
      btn.disabled = false;
      btn.style.opacity = '';
      btn.style.cursor = '';
    });
  }
}


// ──────────────────────────────────────────────
// PAY BUTTONS
// ──────────────────────────────────────────────
function setupPayButtons() {
  const payButtons = document.querySelectorAll('.js-pay-now');

  payButtons.forEach((btn) => {
    btn.addEventListener('click', () => {
      if (Number(totalAmount) === 0 || !cart || cart.length === 0) {
        const emptyBox = document.querySelector('.js-payment-empty');
        if (emptyBox) {
          emptyBox.style.display = 'block';
        }
        return;
      }

      const method = btn.dataset.method;

      // Validate card form if on card tab
      if (method === 'Card') {
        if (!validateCardForm()) return;
      }

      // Validate COD phone if COD tab
      if (method === 'Cash on Delivery') {
        const codInput = document.getElementById('cod-phone');
        const codValue = codInput ? codInput.value.trim() : '';

        if (!codValue) {
          showCodError('Enter your delivery contact number');
          return;
        }

        if (!/^\d{10}$/.test(codValue)) {
          showCodError('Phone number must be exactly 10 digits');
          return;
        }

        clearCodError();
      }

      // Validate UPI
      if (method === 'UPI') {
        const selectedApp = document.querySelector('.js-upi-app.selected');
        const upiInput = document.getElementById('upi-id-input').value.trim();

        if (!selectedApp && !upiInput) {
          showUpiError('Please select a UPI app or enter a UPI ID');
          return;
        }

        // If user entered UPI ID, ensure it looks valid before paying
        if (upiInput) {
          const upiRegex = /^[\w.\-]{2,256}@[\w]{2,64}$/;
          if (!upiRegex.test(upiInput)) {
            showUpiError('Enter a valid UPI ID (example: name@bank)');
            return;
          }
        }
      }

      // Validate Net Banking

      if (method === 'Net Banking') {

        const selectedBank = document.querySelector('input[name="bank"]:checked');
        const bankSelect = document.getElementById('bank-select');
        if (!selectedBank && (!bankSelect || !bankSelect.value)) {
          alert('Please select a bank to proceed.');
          return;
        }
      }

      processPayment(method);
    });
  });
}


// ──────────────────────────────────────────────
// PAYMENT PROCESSING
// ──────────────────────────────────────────────
function processPayment(method) {
  const modal = document.getElementById('payment-modal');
  const processing = document.getElementById('modal-processing');
  const success = document.getElementById('modal-success');
  const failure = document.getElementById('modal-failure');
  const methodName = document.getElementById('modal-method-name');

  // Show modal in processing state
  processing.style.display = 'block';
  success.style.display = 'none';
  failure.style.display = 'none';
  modal.classList.add('visible');
  methodName.textContent = `via ${method}`;

  // Simulate payment processing (90% success rate demo)
  const processingTime = 1800 + Math.random() * 1000;
  const willSucceed = Math.random() > 0.1;

  setTimeout(() => {
    if (willSucceed) {
      const products = cart.map(item => ({
        productId: item.productId,
        quantity: item.quantity,
        deliveryOptionId: item.deliveryOptionId
      }));

      const newOrder = {
        id: crypto.randomUUID(),
        totalCost: totalAmount,
        products,
        orderTime: new Date().toISOString(),
        status: 'Pending'
      };

      addOrder(newOrder);

      document.getElementById('success-order-id').textContent = `Order #${newOrder.id.slice(0, 8)} confirmed`;
      document.getElementById('success-amount-display').textContent = `₹${totalAmount.toFixed(2)}`;

      clearCart();

      processing.style.display = 'none';
      success.style.display = 'block';
    } else {
      processing.style.display = 'none';
      failure.style.display = 'block';
    }
  }, processingTime);
}

// ──────────────────────────────────────────────
// MODAL SETUP
// ──────────────────────────────────────────────
function setupModal() {
  const retryBtn = document.querySelector('.js-retry-payment');
  const modal = document.getElementById('payment-modal');

  if (retryBtn) {
    retryBtn.addEventListener('click', () => {
      modal.classList.remove('visible');
    });
  }

  // Close on overlay click (only on failure state)
  modal.addEventListener('click', (e) => {
    if (e.target === modal) {
      const failure = document.getElementById('modal-failure');
      if (failure && failure.style.display !== 'none') {
        modal.classList.remove('visible');
      }
    }
  });
}

// ──────────────────────────────────────────────
// COUPON SYSTEM
// ──────────────────────────────────────────────
function setupCoupons() {
  const couponInput = document.querySelector('.js-coupon-input');
  const applyBtn = document.querySelector('.js-coupon-apply');
  const offerItems = document.querySelectorAll('.js-offer-item');

  if (!couponInput || !applyBtn) return;

  // Apply / Remove button
  applyBtn.addEventListener('click', () => {
    if (appliedCoupon) {
      removeCoupon();
    } else {
      const code = couponInput.value.trim().toUpperCase();
      applyCoupon(code);
    }
  });

  // Enter key in coupon input
  couponInput.addEventListener('keydown', (e) => {
    if (e.key === 'Enter') {
      e.preventDefault();
      if (!appliedCoupon) {
        const code = couponInput.value.trim().toUpperCase();
        applyCoupon(code);
      }
    }
  });

  // Clicking offer items auto-fills and applies (with tab validation)
  offerItems.forEach((item) => {
    item.addEventListener('click', () => {
      const code = item.dataset.code;
      if (appliedCoupon && appliedCoupon.code === code) {
        removeCoupon();
        return;
      }

      // Validate the required tab before applying
      const coupon = COUPONS[code];
      if (coupon && coupon.requiredTab) {
        const activeTab = getActiveTab();
        if (activeTab !== coupon.requiredTab) {
          showCouponMessage(`Switch to ${coupon.methodLabel} payment to use ${code}`, 'error');
          return;
        }
      }

      if (appliedCoupon) removeCoupon();
      couponInput.value = code;
      applyCoupon(code);
    });
  });
}

function getActiveTab() {
  const activeBtn = document.querySelector('.tab-btn.active');
  return activeBtn ? activeBtn.dataset.tab : '';
}

function getDiscountAmount(coupon) {
  if (coupon.type === 'percent') {
    return subtotalBeforeDiscount * (coupon.value / 100);
  } else if (coupon.type === 'flat') {
    return Math.min(coupon.value, subtotalBeforeDiscount);
  }
  return 0;
}

function applyCoupon(code) {
  const couponInput = document.querySelector('.js-coupon-input');
  const coupon = COUPONS[code];

  if (!code) {
    showCouponMessage('Please enter a coupon code', 'error');
    couponInput.classList.add('error');
    return;
  }

  if (!coupon) {
    showCouponMessage('Invalid coupon code. Try SAVE10, HDFC5 or PAYTM50', 'error');
    couponInput.classList.add('error');
    return;
  }

  if (subtotalBeforeDiscount === 0) {
    showCouponMessage('Add items to cart first', 'error');
    couponInput.classList.add('error');
    return;
  }

  // Check if the right payment tab is selected
  const activeTab = getActiveTab();
  if (coupon.requiredTab && activeTab !== coupon.requiredTab) {
    showCouponMessage(`Switch to ${coupon.methodLabel} payment to use this coupon`, 'error');
    couponInput.classList.add('error');
    return;
  }

  // Apply the coupon
  appliedCoupon = coupon;
  const discount = getDiscountAmount(coupon);

  couponInput.classList.remove('error');
  couponInput.classList.add('success');
  couponInput.readOnly = true;
  couponInput.value = code;

  // Update apply button to remove
  const applyBtn = document.querySelector('.js-coupon-apply');
  applyBtn.textContent = 'Remove';
  applyBtn.classList.add('remove-btn');

  // Highlight the applied offer
  document.querySelectorAll('.js-offer-item').forEach((item) => {
    item.classList.remove('applied');
    if (item.dataset.code === code) {
      item.classList.add('applied');
    }
  });

  const savedText = coupon.type === 'percent'
    ? `${coupon.code} applied! You save ₹${discount.toFixed(2)} (${coupon.value}% off)`
    : `${coupon.code} applied! You save ₹${discount.toFixed(2)}`;
  showCouponMessage(savedText, 'success');

  updateTotalWithDiscount();
}

function removeCoupon() {
  appliedCoupon = null;

  const couponInput = document.querySelector('.js-coupon-input');
  const applyBtn = document.querySelector('.js-coupon-apply');

  couponInput.value = '';
  couponInput.readOnly = false;
  couponInput.classList.remove('success', 'error');

  applyBtn.textContent = 'Apply';
  applyBtn.classList.remove('remove-btn');

  document.querySelectorAll('.js-offer-item').forEach((item) => {
    item.classList.remove('applied');
  });

  showCouponMessage('', '');
  updateTotalWithDiscount();
}

function updateCodChargesVisibility() {
  const codRow = document.querySelector('.js-cod-charges-row');
  if (!codRow) return;
  codRow.style.display = isCodActive() ? 'flex' : 'none';
}

function updateTotalWithDiscount() {
  const discountRow = document.querySelector('.js-discount-row');
  const discountLabel = document.querySelector('.js-discount-label');
  const discountAmount = document.querySelector('.js-discount-amount');

  let discount = 0;
  if (appliedCoupon && subtotalBeforeDiscount > 0) {
    discount = getDiscountAmount(appliedCoupon);
    discountRow.style.display = 'flex';
    discountLabel.textContent = `Discount (${appliedCoupon.code})`;
    discountAmount.textContent = `-₹${discount.toFixed(2)}`;
  } else {
    discountRow.style.display = 'none';
  }

  // Add COD charges if COD tab is active
  const codCharges = isCodActive() ? COD_CHARGE : 0;

  const finalTotal = Math.max(0, subtotalBeforeDiscount - discount + codCharges);
  totalAmount = finalTotal;

  document.querySelector('.js-summary-total').textContent = `₹${finalTotal.toFixed(2)}`;

  // Update all pay button amounts
  document.querySelectorAll('.js-pay-amount').forEach((el) => {
    el.textContent = `• ₹${finalTotal.toFixed(2)}`;
  });
}

function showCouponMessage(msg, type) {
  const el = document.querySelector('.js-coupon-message');
  if (!el) return;
  el.textContent = msg;
  el.className = 'coupon-message js-coupon-message';
  if (type) el.classList.add(type);
}

// ──────────────────────────────────────────────
// START
// ──────────────────────────────────────────────
initPaymentPage();
