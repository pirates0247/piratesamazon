import { cart, addToCart, calculateCartQuantity } from "../data/cart.js";
import { products, loadProducts } from "../data/products.js";
import { getSearchResults } from "./amazonSearch.js";

loadProducts(renderProductsGrid);

function renderProductsGrid() {


  let productsHTML = "";

  //here we can use arrow function. This one changes from "products.forEach(function(product){})" to "products.forEach((product) =>{})"

  products.forEach((product) => {

    productsHTML += `
          <div class="products-container">
            <div class="products-image">
              <img src="${product.image}">
            </div>
            <div id="products-name-in-2-lines" class="products-name products-name-in-2-lines js-products-name js-products-name-${product.id}" data-product-id="${product.id}">
              ${product.name}
            </div>
            <div class="ratings">
              <img src="${product.getRatingsUrl()}">
              <div class="rating-number link-primary">${product.rating.count}</div>
            </div>
            <div class="price">
              <span>${product.getPrice()}</span>
            </div>
            <div class="product-quantity-selector">
              <select class="js-quantity-selector-${product.id}">
                <option selected value="1">1</option>
                <option value="2">2</option>
                <option value="3">3</option>
                <option value="4">4</option>
                <option value="5">5</option>
                <option value="6">6</option>
                <option value="7">7</option>
                <option value="8">8</option>
                <option value="9">9</option>
                <option value="10">10</option>
              </select>
            </div>
              ${product.extraInfoHTML()}
            <div class="prodduct-separator"></div>
            <div class="added-to-cart js-added-to-cart-${product.id}">
              <img src="icons/checkmark.png">
              Added
            </div>
            <button class="add-to-cart-button button-primary js-add-to-cart-button"
            data-product-id="${product.id}">
              Add to Cart
            </button>
          </div>`
  });

  document.querySelector('.js-products-grid').
    innerHTML = productsHTML;

  function updateCartQuantity() {
    let cartQuantity = calculateCartQuantity();
    if (cartQuantity > 99) {
      document.querySelector('.js-cart-quantity')
        .innerHTML = "99+";
    }
    else {
      document.querySelector('.js-cart-quantity')
        .innerHTML = cartQuantity;
    }
  }
  updateCartQuantity();

  document.querySelectorAll('.js-add-to-cart-button')
    .forEach((button) => {
      let previousTimeoutId;
      button.addEventListener('click', () => {
        let productId = button.dataset.productId;
        //shorthand property for the above code is "const {productId} = button.dataset;"
        let addedToCartMsg;
        let timeoutId;
        addedToCartMsg = document.querySelector(`.js-added-to-cart-${productId}`)
          .classList.add('added-to-cart-msg');
        if (previousTimeoutId) {
          clearTimeout(previousTimeoutId);
        }
        timeoutId = setTimeout(() => {
          document.querySelector(`.js-added-to-cart-${productId}`)
            .classList.remove('added-to-cart-msg');
        }, 2000);
        previousTimeoutId = timeoutId;
        //below we can also write addToCart(productId,matchingItem,quantitySelector,quantity); to access variables outside function
        addToCart(productId);
        updateCartQuantity();
      });
    });

  document.querySelectorAll('.js-see-more-msg')
    .forEach((message) => {
      message.addEventListener('click', () => {
        const productId = message.dataset.productId;
        document.querySelector(`.js-products-name-${productId}`).classList.add('products-full-name');
        message.remove();
      });
    });

  setupSearch();
}

let searchDebounceTimeoutId;

function setupSearch() {
  const searchInput = document.querySelector('.js-search-input');
  const searchBtn = document.querySelector('.js-search-btn');
  const resultsBox = document.querySelector('.js-search-results');
  const resultsList = document.querySelector('.js-search-results-list');
  const resultsEmpty = document.querySelector('.js-search-results-empty');

  if (!searchInput || !resultsBox || !resultsList || !resultsEmpty) return;

  const hide = () => {
    resultsBox.hidden = true;
    resultsList.innerHTML = '';
    resultsEmpty.hidden = true;
  };

  const renderResults = (query) => {
    const q = query.trim();
    if (!q) {
      hide();
      return;
    }

    const { top, similar } = getSearchResults(q, 6);

    resultsList.innerHTML = '';

    const all = [...top, ...similar];
    if (!all.length) {
      resultsEmpty.hidden = false;
      resultsBox.hidden = false;
      return;
    }

    resultsEmpty.hidden = true;

    const sectionHtml = (label, list) => {
      if (!list.length) return '';
      const itemsHtml = list.map((p) => {
        return `
          <div class="search-result-item" role="option" data-product-id="${p.id}">
            <img class="search-result-img" src="${p.image}" alt="${p.name}">
            <div>
              <div class="search-result-name">${p.name}</div>
              <div class="search-result-price">${p.getPrice()}</div>
            </div>
          </div>
        `;
      }).join('');

      return `
        <div style="padding: 6px 14px; font-size: 11.5px; font-weight: 700; color: #767676; border-top: 1px solid #e5e8ed; background: #fff;">${label}</div>
        ${itemsHtml}
      `;
    };

    const html = `${sectionHtml('Top results', top)}${sectionHtml('Similar', similar)}`;

    resultsList.innerHTML = html;
    resultsBox.hidden = false;
  };

  const run = () => {
    renderResults(searchInput.value);
  };

  searchInput.addEventListener('input', () => {
    if (searchDebounceTimeoutId) clearTimeout(searchDebounceTimeoutId);
    searchDebounceTimeoutId = setTimeout(run, 180);
  });

  searchBtn.addEventListener('click', () => {
    run();
    searchInput.focus();
  });

  document.addEventListener('click', (e) => {
    if (!resultsBox.contains(e.target) && e.target !== searchInput && e.target !== searchBtn) {
      hide();
    }
  });

  resultsList.addEventListener('click', (e) => {
    const item = e.target.closest('.search-result-item');
    if (!item) return;

    const productId = item.dataset.productId;
    // Scroll product name into view and highlight by using existing grid markup
    const target = document.querySelector(`.js-products-name-${productId}`);
    if (target) {
      target.scrollIntoView({ behavior: 'smooth', block: 'center' });
      target.classList.add('products-full-name');
      setTimeout(() => target.classList.remove('products-full-name'), 1800);
    }

    hide();
  });
}

/*function countLines(element) {
    // Create a temporary element to measure line height
    const temp = document.createElement('div');
    temp.style.position = 'absolute';
    temp.style.visibility = 'hidden';
    temp.style.whiteSpace = 'nowrap';
    temp.style.width = element.clientWidth + 'px';
    temp.style.fontSize = window.getComputedStyle(element).fontSize;
    temp.style.fontFamily = window.getComputedStyle(element).fontFamily;
    temp.innerText = 'A'; // Single character to measure line height
    document.body.appendChild(temp);

    // Measure the height of a single line
    const lineHeight = temp.clientHeight;
    document.body.removeChild(temp);

    // Measure the total height of the element
    const totalHeight = element.clientHeight;

    // Calculate the number of lines
    const numberOfLines = Math.round(totalHeight / lineHeight);
    return numberOfLines;
}
     <!-- <div class="see-more-msg link-primary js-see-more-msg" data-product-id="${product.id}">
            see more
          </div>
          -->
*/
