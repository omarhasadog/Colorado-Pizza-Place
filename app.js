let menu= [];
let cart = [];
let selectedPizza = null;
let toppingsData = {
    meat: [],
    veggie: [],
    cheese: []
}

const TOPPING_PRICE = 1.25;
const TAX_RATE = 0.0825;
const DELIVERY_FEE = 3.99;

async function loadMenu() {
    try {
        const response = await fetch('/api/menu');
        if (!response.ok) {
            throw new Error("Unable to load menu");
        }
        menu = await response.json();

        document.getElementById('menu').innerHTML = menu.map(pizza => `
        <article class="card">
            <div class="pizza-icon">🍕</div>
            <h3>${pizza.name}</h3>
            <p>${pizza.description}</p>
            <p><strong>Starting at $${pizza.basePrice.toFixed(2)}</strong></p>
            <button class="primary" onclick="openCustomize(${pizza.id})">Customize Pizza</button>
        </article>
    `).join('');
    } catch (error) {
        console.error(error);
        document.getElementById('menu').innerHTML = '<p>Unable to load the pizza menu</p>';
    }
}
//Load toppings options
async function loadToppings() {
    try {
        const response = await fetch('/api/toppings');
        if(!response.ok) {
            throw new Error('Unable to load toppings');
        }
        toppingsData = await response.json();
    } catch (error) {
        console.error(error);
        toppingsData = {
            meat: [],
            veggie: [],
            cheese: []
        };
    }
}
async function openCustomize(id) {
    selectedPizza = menu.find(p => p.id === id);
    if(!selectedPizza) {
        return;
    }
    await loadToppings();
    document.getElementById('customPizzaName').textContent = selectedPizza.name;
    document.getElementById('customPizzaDescription').textContent = selectedPizza.description;
    document.getElementById('meatToppings').innerHTML = createToppingOptions(toppingsData.meat);
    document.getElementById('veggieToppings').innerHTML = createToppingOptions(toppingsData.veggie);
    document.getElementById('cheeseToppings').innerHTML = createToppingOptions(toppingsData.cheese);
    document.getElementById('customizeModal').classList.remove('hidden');
    updatePrice();
}
// Create the checkbox list for topping
function createToppingOptions(toppings) {
    if (!toppings.length) {
        return '<p>No toppings available</p>';
    }
    return toppings.map(topping =>`
        <label class="topping-option">
            <input
                type="checkbox"
                value="${topping}"
                onchange="updatePrice()">
                
           ${topping} (+$${TOPPING_PRICE.toFixed(2)})
        </label>
    `).join(' ');
}
// Close customization window
function closeCustomize() { document.getElementById('customizeModal').classList.add('hidden'); }
// Calculate the size prices
function sizeFee() {
    const size = document.getElementById('size').value;
    const fees = {
        Small: 0,
        Medium: 2,
        Large: 4
    };
    return fees[size] || 0;
}
// Update the customized pizza prices
function updatePrice() {
    if (!selectedPizza) return;
    const toppings = [...document.querySelectorAll('#meatToppings input:checked,' +
        '#veggieToppings input:checked, ' + '#cheeseToppings input:checked')];
    const price = selectedPizza.basePrice + sizeFee() + toppings.length * TOPPING_PRICE;
    document.getElementById('customPrice').textContent = price.toFixed(2);
}
//Add customized pizza to cart
function addToCart() {
    if (!selectedPizza) {
        return;
    }
    const toppings = [...document.querySelectorAll('#meatToppings input:checked,' +
        '#veggieToppings input:checked, ' + '#cheeseToppings input:checked')].map(input => input.value);
    const item = {
        pizzaName: selectedPizza.name,
        size: document.getElementById('size').value,
        crust: document.getElementById('crust').value,
        toppings: toppings,
        unitPrice: Number(document.getElementById('customPrice').textContent),
        quantity: 1
    };
    cart.push(item);
    closeCustomize();
    updateCartCount();
    openCart();
}
// Update the number displayed on cart
function updateCartCount() {
    const count = cart.reduce(
        (sum, item) => sum + item.quantity, 0);
    document.getElementById('cartCount').textContent = count;
}
//Calculate the subtotal
function subtotal() {
    return cart.reduce(
        (sum, item) => sum + item.unitPrice * item.quantity, 0);
}
//Open and close cart
function openCart() {
    renderCart();
    document
        .getElementById('cartModal')
        .classList.remove('hidden');
}
function closeCart() {
    document
        .getElementById('cartModal')
        .classList.add('hidden');
}
//Display cart items
function renderCart() {
    const container =
        document.getElementById('cartItems');
    if (!cart.length) {
        container.innerHTML =
            '<p>Your cart is empty.</p>';
    } else {
        container.innerHTML = cart.map((item, i) => `
            <div class="cart-row">
                <div>
                    <strong>${item.pizzaName}</strong>
                    <br>
                    ${item.size}, ${item.crust}<br>
                    ${item.toppings.join(', ') || 'No extra toppings'}
                </div>
                <div class="qty">
                    $${(
            item.unitPrice * item.quantity).toFixed(2)}
                    <br>
                    <button onclick="changeQty(${i}, -1)">−</button>
                    ${item.quantity}
                    <button onclick="changeQty(${i}, 1)">+</button>
                    <button onclick="removeItem(${i})">Remove</button>
            </div>
        </div>
    `).join('');
    }
    updateSummary();
}
// Change quantity
function changeQty(index, change) {
    cart[index].quantity += change;
    if (cart[index].quantity <= 0) cart.splice(index, 1);
    updateCartCount();
    renderCart();
}
// Remove items from cart
function removeItem(index) {
    cart.splice(index, 1);
    updateCartCount();
    renderCart();
}
// Update order summary
function updateSummary() {
    const sub = subtotal();
    const selectedOrderType = document.querySelector('input[name="orderType"]:checked');
    const delivery = selectedOrderType && selectedOrderType.value === 'delivery';
    document
        .getElementById('deliveryFields')
        .classList.toggle('hidden', !delivery);
    document
        .getElementById('subtotal')
        .textContent = sub.toFixed(2);
    const tax = sub * TAX_RATE;
    document
        .getElementById('tax').textContent = tax.toFixed(2);
    document.getElementById('deliveryFee').textContent =
        delivery ? DELIVERY_FEE.toFixed(2) : '0.00';
    const total = sub + tax + (delivery ? DELIVERY_FEE : 0);
    document.getElementById('total').textContent =
        total.toFixed(2);
}
// Place the order
function placeOrder() {
    if (!cart.length) return showMessage('Add a pizza to the cart before placing an order.');
    
        // Check that the CAPTCHA was completed
    const captchaResponse =
        document.querySelector('[name="cf-turnstile-response"]')?.value;

    if (!captchaResponse) {
        showMessage('Please complete the I am not a robot verification.');
        return;
    }
    const selectedOrderType =
        document.querySelector(
            'input[name="orderType"]:checked');
    const delivery =
        selectedOrderType && selectedOrderType.value === 'delivery';
    if (delivery) {
        const address = document.getElementById('address').value.trim();
        const city = document.getElementById('city').value.trim();
        const zip = document.getElementById('zip').value.trim();
        if (!address || !city || !zip) {
            showMessage('Please complete the delivery address, city, and ZIP code.');
            return;
        }
    }
    const orderNumber = Math.floor(10000 + Math.random() * 90000);
    showMessage(`Order #${orderNumber} created successfully!` + `Total: $${document.getElementById('total').textContent}`);
    cart = [];
    updateCartCount();
    renderCart();
    if (typeof turnstile !== 'undefined') {
    turnstile.reset();
}
}
// Display a message to the customer
function showMessage(text) {
    document.getElementById('orderMessage').textContent =
        text; }
// Load the menu and toppings when the page starts
loadMenu();
loadToppings();
