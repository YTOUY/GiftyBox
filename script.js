// Global variables
let gcoins = 1000;
let inventory = [];
let activeCase = null;
let isSpinning = false;

const loadingScreen = document.getElementById('loading-screen');
const mainContent = document.getElementById('main-content');
const caseGrid = document.getElementById('case-grid');
const gcoinsDisplay = document.getElementById('gcoins');
const inventoryList = document.getElementById('inventory-list');
const referralLink = document.getElementById('referral-link');

const canvas = document.getElementById('star-canvas');
const ctx = canvas.getContext('2d');
canvas.width = window.innerWidth;
canvas.height = window.innerHeight;

// --- Анимация звёзд на загрузочном экране ---
function createStars(ctx, width, height, count = 50) {
    const stars = [];
    for (let i = 0; i < count; i++) {
        stars.push({
            x: Math.random() * width,
            y: Math.random() * height,
            size: Math.random() * 2 + 1,
            speed: Math.random() * 0.3 + 0.1,
            blink: Math.random() * 1000
        });
    }
    return stars;
}

function animateStars(ctx, stars, width, height) {
    ctx.clearRect(0, 0, width, height);
    stars.forEach(star => {
        const opacity = Math.sin(Date.now() / star.blink) * 0.5 + 0.5;
        ctx.beginPath();
        ctx.arc(star.x, star.y, star.size, 0, Math.PI * 2);
        ctx.fillStyle = `rgba(255, 255, 255, ${opacity})`;
        ctx.fill();
        star.y += star.speed;
        if (star.y > height) star.y = 0;
    });
    requestAnimationFrame(() => animateStars(ctx, stars, width, height));
}

function startApp() {
    // Звёзды на загрузочном экране
    const stars = createStars(ctx, canvas.width, canvas.height, 60);
    animateStars(ctx, stars, canvas.width, canvas.height);
    setTimeout(() => {
        loadingScreen.style.display = 'none';
        mainContent.style.display = 'block';
        gcoinsDisplay.textContent = gcoins;
        referralLink.href = `https://t.me/share?url=https://GiftyBox.netlify.app&text=Присоединяйся к GiftyBox!`;
        updateInventory();
    }, 2000);
}

startApp();

const cases = {
    basic: {
        name: "Basic Case",
        cost: 100,
        nfts: [
            { id: "teddybear", label: "Мишка", rarity: "basic", stars: 15 },
            { id: "heart", label: "Сердце", rarity: "basic", stars: 15 },
            { id: "rose", label: "Роза", rarity: "basic", stars: 25 },
            { id: "rocket", label: "Ракета", rarity: "basic", stars: 50 },
            { id: "trophy", label: "Кубок", rarity: "basic", stars: 100 },
            { id: "lunar-snake", label: "Lunar Snake", rarity: "basic", stars: 75 },
            { id: "desk-calendar", label: "Desk Calendar", rarity: "standard", stars: 30 },
            { id: "gcoins-50", label: "50 GCoins", rarity: "special", gcoins: 50 }
        ],
        probabilities: [0.18, 0.18, 0.15, 0.13, 0.10, 0.10, 0.10, 0.06]
    },
    standard: {
        name: "Standard Case",
        cost: 250,
        nfts: [
            { id: "teddybear", label: "Мишка", rarity: "basic", stars: 15 },
            { id: "heart", label: "Сердце", rarity: "basic", stars: 15 },
            { id: "lunar-snake", label: "Lunar Snake", rarity: "basic", stars: 75 },
            { id: "desk-calendar", label: "Desk Calendar", rarity: "standard", stars: 30 },
            { id: "b-day-candle", label: "B-Day Candle", rarity: "standard", stars: 40 },
            { id: "jester-hat", label: "Jester Hat", rarity: "standard", stars: 45 },
            { id: "evil-eye", label: "Evil Eye", rarity: "rare", stars: 80 },
            { id: "gcoins-200", label: "200 GCoins", rarity: "special", gcoins: 200 }
        ],
        probabilities: [0.15, 0.15, 0.13, 0.13, 0.13, 0.12, 0.12, 0.07]
    },
    rare: {
        name: "Rare Case",
        cost: 500,
        nfts: [
            { id: "rose", label: "Роза", rarity: "basic", stars: 25 },
            { id: "rocket", label: "Ракета", rarity: "basic", stars: 50 },
            { id: "trophy", label: "Кубок", rarity: "basic", stars: 100 },
            { id: "b-day-candle", label: "B-Day Candle", rarity: "standard", stars: 40 },
            { id: "jester-hat", label: "Jester Hat", rarity: "standard", stars: 45 },
            { id: "evil-eye", label: "Evil Eye", rarity: "rare", stars: 80 },
            { id: "homemade-cake", label: "Homemade Cake", rarity: "rare", stars: 90 },
            { id: "easter-egg", label: "Easter Egg", rarity: "rare", stars: 95 }
        ],
        probabilities: [0.15, 0.14, 0.13, 0.13, 0.13, 0.12, 0.10, 0.10]
    },
    epic: {
        name: "Epic Case",
        cost: 1000,
        nfts: [
            { id: "b-day-candle", label: "B-Day Candle", rarity: "standard", stars: 40 },
            { id: "jester-hat", label: "Jester Hat", rarity: "standard", stars: 45 },
            { id: "evil-eye", label: "Evil Eye", rarity: "rare", stars: 80 },
            { id: "homemade-cake", label: "Homemade Cake", rarity: "rare", stars: 90 },
            { id: "easter-egg", label: "Easter Egg", rarity: "rare", stars: 95 },
            { id: "light-sword", label: "Light Sword", rarity: "epic", stars: 150 },
            { id: "eternal-candle", label: "Eternal Candle", rarity: "epic", stars: 180 },
            { id: "candy-cane", label: "Candy Cane", rarity: "epic", stars: 200 }
        ],
        probabilities: [0.15, 0.14, 0.13, 0.13, 0.12, 0.12, 0.11, 0.10]
    },
    legendary: {
        name: "Legendary Case",
        cost: 2000,
        nfts: [
            { id: "easter-egg", label: "Easter Egg", rarity: "rare", stars: 95 },
            { id: "light-sword", label: "Light Sword", rarity: "epic", stars: 150 },
            { id: "eternal-candle", label: "Eternal Candle", rarity: "epic", stars: 180 },
            { id: "candy-cane", label: "Candy Cane", rarity: "epic", stars: 200 },
            { id: "jelly-bunny", label: "Jelly Bunny", rarity: "legendary", stars: 300 },
            { id: "ginger-cookie", label: "Ginger Cookie", rarity: "legendary", stars: 350 },
            { id: "cookie-heart", label: "Cookie Heart", rarity: "legendary", stars: 400 },
            { id: "gcoins-2500", label: "2500 GCoins", rarity: "special", gcoins: 2500 }
        ],
        probabilities: [0.14, 0.13, 0.13, 0.13, 0.12, 0.12, 0.10, 0.13]
    },
    mythic: {
        name: "Mythic Case",
        cost: 5000,
        nfts: [
            { id: "light-sword", label: "Light Sword", rarity: "epic", stars: 150 },
            { id: "jelly-bunny", label: "Jelly Bunny", rarity: "legendary", stars: 300 },
            { id: "ginger-cookie", label: "Ginger Cookie", rarity: "legendary", stars: 350 },
            { id: "cookie-heart", label: "Cookie Heart", rarity: "legendary", stars: 400 },
            { id: "diamond-ring", label: "Diamond Ring", rarity: "mythic", stars: 500 },
            { id: "neko-helmet", label: "Neko Helmet", rarity: "mythic", stars: 600 },
            { id: "durov-cap", label: "Durov's Cap", rarity: "mythic", stars: 1000 },
            { id: "gcoins-7000", label: "7000 GCoins", rarity: "special", gcoins: 7000 }
        ],
        probabilities: [0.18, 0.15, 0.15, 0.13, 0.01, 0.01, 0.01, 0.36]
    }
};

// Функция для перехода на страницу кейса
function openCasePage(caseName) {
    activeCase = caseName;
    const caseData = cases[caseName];
    
    // Обновляем заголовок
    document.getElementById('case-title').textContent = caseData.name;
    
    // Создаем слоты для рулетки
    createRouletteSlots(caseName);
    
    // Показываем страницу кейса
    showPage('case');
}

// Создание слотов для рулетки
function createRouletteSlots(caseName) {
    const container = document.getElementById('nft-slots-container');
    container.innerHTML = '';
    
    const caseData = cases[caseName];
    const nfts = caseData.nfts;
    
    console.log(`Создаем слоты для кейса: ${caseName}`);
    console.log('NFT в кейсе:', nfts);
    
    // Создаем больше слотов для плавного вращения
    const totalSlots = 20;
    
    for (let i = 0; i < totalSlots; i++) {
        const nftIndex = i % nfts.length;
        const nft = nfts[nftIndex];
        
        const slot = document.createElement('div');
        slot.className = 'nft-slot';
        slot.dataset.nftId = nft.id;
        slot.dataset.nftIndex = nftIndex;
        
        const img = document.createElement('img');
        
        // Правильный путь к изображению
        if (nft.gcoins) {
            // Для G-Coins используем специальную иконку
            img.src = 'assets/nft/gcoins.gif';
        } else {
            // Для NFT используем формат {rarity}-{id}.gif
            img.src = `assets/nft/${nft.rarity}-${nft.id}.gif`;
        }
        
        console.log(`Загружаем изображение: ${img.src} для NFT: ${nft.label}`);
        
        img.alt = nft.label;
        
        // Обработка ошибки загрузки изображения
        img.onerror = function() {
            console.warn(`Не удалось загрузить изображение: ${img.src}`);
            // Показываем fallback текст
            this.style.display = 'none';
            const fallback = document.createElement('div');
            fallback.style.cssText = `
                width: 80px;
                height: 80px;
                background: #ffe7a0;
                color: #1a1f2a;
                display: flex;
                align-items: center;
                justify-content: center;
                border-radius: 8px;
                font-weight: bold;
                font-size: 0.8rem;
                text-align: center;
            `;
            fallback.textContent = nft.gcoins ? `${nft.gcoins} GCoins` : nft.label;
            slot.appendChild(fallback);
        };
        
        // Обработка успешной загрузки
        img.onload = function() {
            console.log(`Успешно загружено изображение: ${img.src}`);
        };
        
        slot.appendChild(img);
        container.appendChild(slot);
    }
}

// Функция открытия кейса
async function openCase() {
    if (!activeCase || isSpinning) return;
    
    const caseData = cases[activeCase];
    if (gcoins < caseData.cost) {
        alert('Недостаточно G-Coins!');
        return;
    }
    
    isSpinning = true;
    
    // Списываем G-Coins
    gcoins -= caseData.cost;
    gcoinsDisplay.textContent = gcoins;
    
    // Получаем случайный NFT
    const winningNFT = getRandomNFT(activeCase);
    
    // Запускаем анимацию рулетки
    await spinRoulette(winningNFT);
    
    // Добавляем NFT в инвентарь
    inventory.push(winningNFT);
    updateInventory();
    
    isSpinning = false;
    
    // Показываем уведомление о выигрыше
    showWinNotification(winningNFT);
}

// Функция демо режима
function demoCase() {
    if (!activeCase || isSpinning) return;
    
    isSpinning = true;
    
    // Получаем случайный NFT
    const winningNFT = getRandomNFT(activeCase);
    
    // Запускаем анимацию рулетки
    spinRoulette(winningNFT).then(() => {
        isSpinning = false;
        showWinNotification(winningNFT);
    });
}

// Получение случайного NFT по вероятности
function getRandomNFT(caseName) {
    const caseData = cases[caseName];
    const random = Math.random();
    let cumulative = 0;
    
    for (let i = 0; i < caseData.probabilities.length; i++) {
        cumulative += caseData.probabilities[i];
        if (random <= cumulative) {
            return caseData.nfts[i];
        }
    }
    
    return caseData.nfts[0]; // Fallback
}

// Обновление инвентаря
function updateInventory() {
    inventoryList.innerHTML = '';
    
    if (inventory.length === 0) {
        inventoryList.innerHTML = '<div class="empty-inventory">Инвентарь пуст</div>';
        return;
    }
    
    inventory.forEach((nft, index) => {
        const item = document.createElement('div');
        item.className = 'inventory-item';
        
        let imgSrc;
        if (nft.gcoins) {
            imgSrc = 'assets/nft/gcoins.gif';
        } else {
            imgSrc = `assets/nft/${nft.rarity}-${nft.id}.gif`;
        }
        
        item.innerHTML = `
            <img src="${imgSrc}" alt="${nft.label}" class="inventory-nft-img">
            <div class="inventory-nft-name">${nft.label}</div>
            <div class="inventory-nft-rarity">${nft.rarity}</div>
        `;
        inventoryList.appendChild(item);
    });
}

// Функция апгрейда NFT
function upgradeNFT() {
    const currentSelect = document.getElementById('current-nft');
    const targetSelect = document.getElementById('target-nft');
    
    const currentNFT = currentSelect.value;
    const targetNFT = targetSelect.value;
    
    if (!currentNFT || !targetNFT) {
        alert('Выберите NFT для апгрейда');
        return;
    }
    
    // Здесь должна быть логика апгрейда
    alert('Апгрейд выполнен!');
}

// Заполнение селектов для апгрейда
function populateNFTSelects() {
    const currentSelect = document.getElementById('current-nft');
    const targetSelect = document.getElementById('target-nft');
    
    currentSelect.innerHTML = '<option value="">Выберите NFT</option>';
    targetSelect.innerHTML = '<option value="">Выберите цель</option>';
    
    inventory.forEach((nft, index) => {
        const option = document.createElement('option');
        option.value = index;
        option.textContent = nft.label;
        currentSelect.appendChild(option);
    });
}

// Показ уведомления о выигрыше
function showWinNotification(nft) {
    const notification = document.createElement('div');
    notification.className = 'win-notification';
    
    let imgSrc;
    if (nft.gcoins) {
        imgSrc = 'assets/nft/gcoins.gif';
    } else {
        imgSrc = `assets/nft/${nft.rarity}-${nft.id}.gif`;
    }
    
    notification.innerHTML = `
        <div class="win-content">
            <img src="${imgSrc}" alt="${nft.label}">
            <h3>Поздравляем!</h3>
            <p>Вы получили: ${nft.label}</p>
        </div>
    `;
    
    document.body.appendChild(notification);
    
    setTimeout(() => {
        notification.remove();
    }, 3000);
}

// Анимация вращения рулетки
function spinRoulette(winningNFT) {
    return new Promise((resolve) => {
        const container = document.getElementById('nft-slots-container');
        const slots = container.querySelectorAll('.nft-slot');
        
        // Находим индекс выигрышного NFT
        let winningIndex = -1;
        slots.forEach((slot, index) => {
            if (slot.dataset.nftId === winningNFT.id) {
                winningIndex = index;
            }
        });
        
        if (winningIndex === -1) {
            winningIndex = 0;
        }
        
        // Вычисляем конечную позицию (центрируем выигрышный слот)
        const slotWidth = 136; // 120px + 16px margin
        const containerWidth = container.offsetWidth;
        const centerPosition = containerWidth / 2 - slotWidth / 2;
        const finalPosition = centerPosition - (winningIndex * slotWidth);
        
        // Добавляем несколько полных оборотов для эффекта
        const totalDistance = -(slots.length * slotWidth) + finalPosition;
        
        // Анимация вращения
        container.style.transition = 'transform 7.5s cubic-bezier(0.25, 0.46, 0.45, 0.94)';
        container.style.transform = `translateX(${totalDistance}px)`;
        
        // После завершения анимации
        setTimeout(() => {
            // Подсвечиваем выигрышный слот
            const centerSlot = slots[winningIndex];
            centerSlot.classList.add('winning');
            
            setTimeout(() => {
                centerSlot.classList.remove('winning');
                resolve();
            }, 1000);
        }, 7500);
    });
}

// Обработчики событий
document.addEventListener('DOMContentLoaded', () => {
    // Инициализация
    updateInventory();
    populateNFTSelects();
    
    // Обработчик изменения размера окна
    window.addEventListener('resize', () => {
        canvas.width = window.innerWidth;
        canvas.height = window.innerHeight;
    });
});

// Функция переключения страниц
function showPage(pageName) {
    // Скрываем все страницы
    document.querySelectorAll('.page').forEach(page => {
        page.classList.remove('active');
    });
    
    // Показываем нужную страницу
    document.getElementById(`page-${pageName}`).classList.add('active');
    
    // Обновляем активную кнопку в навигации
    document.querySelectorAll('.nav-btn').forEach(btn => {
        btn.classList.remove('active');
    });
    document.querySelector(`[data-page="${pageName}"]`).classList.add('active');
}