export let cart;

loadFromStorage();

function getUserId() {
  let uid = localStorage.getItem('pirates_user_id');
  if (!uid) {
    uid = 'user_' + crypto.randomUUID();
    localStorage.setItem('pirates_user_id', uid);
  }
  return uid;
}

function getCartKey() {
  return `cart_${getUserId()}`;
}

export function loadFromStorage() {
  cart = JSON.parse(localStorage.getItem(getCartKey())) || [];
}

function saveToStorage() {
  localStorage.setItem(getCartKey(), JSON.stringify(cart));
}

export function addToCart(productId) {
  let matchingItem;
  let quantitySelector;
  let quantity;
  let cartQuantity = calculateCartQuantity();
  quantitySelector = document.querySelector(`.js-quantity-selector-${productId}`);
  if (quantitySelector) {
    quantity = Number(quantitySelector.value);
  } else {
    quantity = 1;
  }
  //to check whether the item is already in the cart
  cart.forEach((cartItem) => {
    if(productId===cartItem.productId){
      matchingItem=cartItem;
    }
  });
  if(cartQuantity + quantity > 1000){
    alert("The cart is full!");
    return;
  }
  if(matchingItem){
    //to limit cartquantity
    if(matchingItem.quantity + quantity > 50){
      alert("The maximum limit of a same product is reached!");
      document.querySelector(`.js-added-to-cart-${productId}`)
        .classList.remove('added-to-cart-msg');
      return;
    }
    matchingItem.quantity+=quantity;
  }
  else{
    cart.push({
      productId:productId,
      quantity:quantity,
      deliveryOptionId: '1'
    });
  }
  saveToStorage();
}

export function removeFromCart(productId) {
  let newCart = [];

  cart.forEach((cartItem) => {
    if(cartItem.productId !== productId) {
      newCart.push(cartItem);
    }
  });
  cart = newCart;
  saveToStorage();
}

export function calculateCartQuantity() {
  let cartQuantity=0;
  cart.forEach((cartItem) => {
    cartQuantity+=cartItem.quantity;
  });
  saveToStorage();
  return cartQuantity;
}

export function updateQuantity(productId, newQuantity){
  let matchingItem;
  cart.forEach((cartItem) => {
    if(productId === cartItem.productId){
      matchingItem = cartItem;
    }
  });
  matchingItem.quantity = newQuantity;
  saveToStorage();
}

export function updateDeliveryOption(productId, deliveryOptionId) {
  let matchingItem;
  cart.forEach((cartItem) => {
    if(productId === cartItem.productId){
      matchingItem = cartItem;
    }
  });
  matchingItem.deliveryOptionId = deliveryOptionId;
  saveToStorage();
}

export function loadCart(fun) {
  const xhr = new XMLHttpRequest();

  xhr.addEventListener('load', () => {
    console.log('load cart');
    fun();
  });
  xhr.open('GET', 'https://supersimplebackend.dev/cart/');
  xhr.send();
}

export function clearCart() {
  cart = [];
  saveToStorage();
}
