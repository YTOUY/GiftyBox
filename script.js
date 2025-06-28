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
            { id: "teddybear", label: "Мишка", rarity: "basic", stars: 15 },
            { id: "teddybear", label: "Мишка", rarity: "basic", stars: 15 },
            { id: "heart", label: "Сердце", rarity: "basic", stars: 15 },
            { id: "heart", label: "Сердце", rarity: "basic", stars: 15 },
            { id: "rose", label: "Роза", rarity: "basic", stars: 25 },
            { id: "rocket", label: "Ракета", rarity: "basic", stars: 50 },
            { id: "trophy", label: "Кубок", rarity: "basic", stars: 100 },
            { id: "lunar-snake", label: "Lunar Snake", rarity: "basic", stars: 75 },
            { id: "desk-calendar", label: "Desk Calendar", rarity: "standard", stars: 30 },
            { id: "gcoins-50", label: "50 GCoins", rarity: "special", gcoins: 50 },
            { id: "gcoins-50", label: "50 GCoins", rarity: "special", gcoins: 50 }
        ],
        probabilities: [0.15, 0.15, 0.15, 0.12, 0.12, 0.10, 0.08, 0.06, 0.05, 0.04, 0.04, 0.04]
    },
    standard: {
        name: "Standard Case",
        cost: 250,
        nfts: [
            { id: "teddybear", label: "Мишка", rarity: "basic", stars: 15 },
            { id: "heart", label: "Сердце", rarity: "basic", stars: 15 },
            { id: "lunar-snake", label: "Lunar Snake", rarity: "basic", stars: 75 },
            { id: "lunar-snake", label: "Lunar Snake", rarity: "basic", stars: 75 },
            { id: "desk-calendar", label: "Desk Calendar", rarity: "standard", stars: 30 },
            { id: "desk-calendar", label: "Desk Calendar", rarity: "standard", stars: 30 },
            { id: "b-day-candle", label: "B-Day Candle", rarity: "standard", stars: 40 },
            { id: "b-day-candle", label: "B-Day Candle", rarity: "standard", stars: 40 },
            { id: "jester-hat", label: "Jester Hat", rarity: "standard", stars: 45 },
            { id: "evil-eye", label: "Evil Eye", rarity: "rare", stars: 80 },
            { id: "gcoins-200", label: "200 GCoins", rarity: "special", gcoins: 200 },
            { id: "gcoins-200", label: "200 GCoins", rarity: "special", gcoins: 200 }
        ],
        probabilities: [0.12, 0.12, 0.10, 0.10, 0.10, 0.10, 0.09, 0.09, 0.08, 0.05, 0.03, 0.03]
    },
    rare: {
        name: "Rare Case",
        cost: 500,
        nfts: [
            { id: "rose", label: "Роза", rarity: "basic", stars: 25 },
            { id: "rocket", label: "Ракета", rarity: "basic", stars: 50 },
            { id: "trophy", label: "Кубок", rarity: "basic", stars: 100 },
            { id: "b-day-candle", label: "B-Day Candle", rarity: "standard", stars: 40 },
            { id: "b-day-candle", label: "B-Day Candle", rarity: "standard", stars: 40 },
            { id: "jester-hat", label: "Jester Hat", rarity: "standard", stars: 45 },
            { id: "jester-hat", label: "Jester Hat", rarity: "standard", stars: 45 },
            { id: "evil-eye", label: "Evil Eye", rarity: "rare", stars: 80 },
            { id: "evil-eye", label: "Evil Eye", rarity: "rare", stars: 80 },
            { id: "homemade-cake", label: "Homemade Cake", rarity: "rare", stars: 90 },
            { id: "homemade-cake", label: "Homemade Cake", rarity: "rare", stars: 90 },
            { id: "easter-egg", label: "Easter Egg", rarity: "rare", stars: 95 }
        ],
        probabilities: [0.10, 0.10, 0.08, 0.09, 0.09, 0.09, 0.09, 0.08, 0.08, 0.07, 0.07, 0.06]
    },
    epic: {
        name: "Epic Case",
        cost: 1000,
        nfts: [
            { id: "jester-hat", label: "Jester Hat", rarity: "standard", stars: 45 },
            { id: "evil-eye", label: "Evil Eye", rarity: "rare", stars: 80 },
            { id: "homemade-cake", label: "Homemade Cake", rarity: "rare", stars: 90 },
            { id: "easter-egg", label: "Easter Egg", rarity: "rare", stars: 95 },
            { id: "easter-egg", label: "Easter Egg", rarity: "rare", stars: 95 },
            { id: "light-sword", label: "Light Sword", rarity: "epic", stars: 150 },
            { id: "light-sword", label: "Light Sword", rarity: "epic", stars: 150 },
            { id: "eternal-candle", label: "Eternal Candle", rarity: "epic", stars: 180 },
            { id: "candy-cane", label: "Candy Cane", rarity: "epic", stars: 200 },
            { id: "jelly-bunny", label: "Jelly Bunny", rarity: "legendary", stars: 300 },
            { id: "ginger-cookie", label: "Ginger Cookie", rarity: "legendary", stars: 350 },
            { id: "cookie-heart", label: "Cookie Heart", rarity: "legendary", stars: 400 }
        ],
        probabilities: [0.08, 0.08, 0.08, 0.08, 0.08, 0.10, 0.10, 0.09, 0.09, 0.08, 0.08, 0.06]
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
            { id: "jelly-bunny", label: "Jelly Bunny", rarity: "legendary", stars: 300 },
            { id: "ginger-cookie", label: "Ginger Cookie", rarity: "legendary", stars: 350 },
            { id: "ginger-cookie", label: "Ginger Cookie", rarity: "legendary", stars: 350 },
            { id: "cookie-heart", label: "Cookie Heart", rarity: "legendary", stars: 400 },
            { id: "cookie-heart", label: "Cookie Heart", rarity: "legendary", stars: 400 },
            { id: "gcoins-2500", label: "2500 GCoins", rarity: "special", gcoins: 2500 },
            { id: "gcoins-2500", label: "2500 GCoins", rarity: "special", gcoins: 2500 }
        ],
        probabilities: [0.08, 0.08, 0.08, 0.08, 0.10, 0.10, 0.10, 0.10, 0.09, 0.09, 0.05, 0.05]
    },
    mythic: {
        name: "Mythic Case",
        cost: 5000,
        nfts: [
            { id: "light-sword", label: "Light Sword", rarity: "epic", stars: 150 },
            { id: "light-sword", label: "Light Sword", rarity: "epic", stars: 150 },
            { id: "jelly-bunny", label: "Jelly Bunny", rarity: "legendary", stars: 300 },
            { id: "ginger-cookie", label: "Ginger Cookie", rarity: "legendary", stars: 350 },
            { id: "cookie-heart", label: "Cookie Heart", rarity: "legendary", stars: 400 },
            { id: "cookie-heart", label: "Cookie Heart", rarity: "legendary", stars: 400 },
            { id: "diamond-ring", label: "Diamond Ring", rarity: "mythic", stars: 500 },
            { id: "neko-helmet", label: "Neko Helmet", rarity: "mythic", stars: 600 },
            { id: "durov-cap", label: "Durov's Cap", rarity: "mythic", stars: 1000 },
            { id: "gcoins-7000", label: "7000 GCoins", rarity: "special", gcoins: 7000 },
            { id: "gcoins-7000", label: "7000 GCoins", rarity: "special", gcoins: 7000 },
            { id: "gcoins-7000", label: "7000 GCoins", rarity: "special", gcoins: 7000 }
        ],
        probabilities: [0.10, 0.10, 0.10, 0.10, 0.10, 0.10, 0.01, 0.01, 0.01, 0.12, 0.12, 0.12]
    }
};

// Вспомогательная функция для очистки названий от слов редкости
function cleanNFTName(label) {
    let displayName = label;
    const rarityWords = ['Basic', 'Standard', 'Rare', 'Epic', 'Legendary', 'Mythic'];
    rarityWords.forEach(word => {
        displayName = displayName.replace(word, '').trim();
    });
    return displayName;
}

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
    if (!container) return;
    container.innerHTML = '';
    const caseData = cases[caseName];
    if (!caseData) return;
    // Используем существующий массив NFT (они уже повторяются в данных)
    const baseNFTs = [...caseData.nfts];
    // Дублируем массив 7 раз для бесконечной рулетки
    const repeatCount = 7;
    const allNFTs = [];
    for (let r = 0; r < repeatCount; r++) {
        for (let i = 0; i < baseNFTs.length; i++) {
            allNFTs.push(baseNFTs[i]);
        }
    }
    // Перемешиваем только центральную копию для случайности
    const centerStart = Math.floor(repeatCount / 2) * baseNFTs.length;
    const centerNFTs = allNFTs.slice(centerStart, centerStart + baseNFTs.length);
    for (let i = centerNFTs.length - 1; i > 0; i--) {
        const j = Math.floor(Math.random() * (i + 1));
        [centerNFTs[i], centerNFTs[j]] = [centerNFTs[j], centerNFTs[i]];
    }
    for (let i = 0; i < baseNFTs.length; i++) {
        allNFTs[centerStart + i] = centerNFTs[i];
    }
    // Рендерим слоты
    for (let i = 0; i < allNFTs.length; i++) {
        const nft = allNFTs[i];
        const slot = document.createElement('div');
        slot.className = 'nft-slot';
        const uniqueId = `${nft.id}-${nft.label}-${nft.rarity}`;
        slot.dataset.nftId = uniqueId;
        slot.dataset.nftRarity = nft.rarity;
        slot.dataset.nftLabel = nft.label;
        let imgSrc;
        if (nft.gcoins) {
            imgSrc = 'assets/nft/gcoins.gif';
        } else {
            imgSrc = `assets/nft/${nft.rarity}-${nft.id}.gif`;
        }
        let displayName = cleanNFTName(nft.label);
        slot.innerHTML = `
            <img src="${imgSrc}" alt="${displayName}" class="nft-slot-img">
            <div class="nft-slot-name">${displayName}</div>
            <div class="nft-slot-rarity ${nft.rarity}">${nft.rarity}</div>
        `;
        container.appendChild(slot);
    }
    // Сохраняем параметры для анимации
    container._repeatCount = repeatCount;
    container._baseLength = baseNFTs.length;
}

// Анимация вращения рулетки с ускорением и плавным замедлением
function spinRoulette(caseName) {
    return new Promise((resolve) => {
        const container = document.getElementById('nft-slots-container');
        const viewport = container.parentElement;
        if (!container || !viewport) {
            console.error('Контейнер слотов или viewport не найден!');
            resolve(null);
            return;
        }
        const slots = container.querySelectorAll('.nft-slot');
        if (slots.length === 0) {
            console.error('Слоты не найдены!');
            resolve(null);
            return;
        }
        // Индексы центральной копии
        const repeatCount = container._repeatCount || 7;
        const baseLength = container._baseLength || Math.floor(slots.length / repeatCount);
        const centerStart = Math.floor(repeatCount / 2) * baseLength;
        const centerEnd = centerStart + baseLength;
        // Выбираем случайный индекс центрального слота (под палкой)
        const slotWidth = 136;
        const viewportWidth = viewport.offsetWidth;
        const centerSlotIndex = centerStart + Math.floor(baseLength / 2);
        // Анимация
        const initialOffset = (viewportWidth / 2) - (slotWidth / 2) - (centerStart * slotWidth);
        const finalOffset = (viewportWidth / 2) - (slotWidth / 2) - (centerSlotIndex * slotWidth);
        const duration = 4000; // 4 сек — быстрее
        const start = performance.now();
        function easeOutCubic(t) { return 1 - Math.pow(1 - t, 3); }
        function animate(now) {
            let elapsed = now - start;
            if (elapsed > duration) elapsed = duration;
            const progress = elapsed / duration;
            const eased = easeOutCubic(progress);
            const currentOffset = initialOffset + (finalOffset - initialOffset) * eased;
            container.style.transition = 'none';
            container.style.transform = `translateX(${currentOffset}px)`;
            if (elapsed < duration) {
                requestAnimationFrame(animate);
            } else {
                const centerSlot = slots[centerSlotIndex];
                if (centerSlot) centerSlot.classList.add('winning');
                setTimeout(() => {
                    if (centerSlot) centerSlot.classList.remove('winning');
                    container.style.transition = 'none';
                    container.style.transform = `translateX(${finalOffset}px)`;
                    // Получаем NFT из центрального слота
                    const nft = getNFTFromSlot(centerSlot, caseName);
                    resolve(nft);
                }, 1000);
            }
        }
        container.style.transition = 'none';
        container.style.transform = `translateX(${initialOffset}px)`;
        requestAnimationFrame(animate);
    });
}

// Получить NFT из DOM-слота
function getNFTFromSlot(slot, caseName) {
    if (!slot) return null;
    const id = slot.dataset.nftId;
    const caseData = cases[caseName];
    if (!caseData) return null;
    // Находим NFT по уникальному id
    return caseData.nfts.find(nft => `${nft.id}-${nft.label}-${nft.rarity}` === id) || null;
}

// Открытие кейса: теперь ждет spinRoulette и добавляет именно тот NFT, который оказался по центру
async function openCase() {
    if (!activeCase || isSpinning) return;
    const caseData = cases[activeCase];
    if (gcoins < caseData.cost) {
        alert('Недостаточно G-Coins!');
        return;
    }
    isSpinning = true;
    gcoins -= caseData.cost;
    gcoinsDisplay.textContent = gcoins;
    // Запускаем анимацию рулетки и получаем выигрышный NFT
    const winningNFT = await spinRoulette(activeCase);
    if (winningNFT) {
        inventory.push(winningNFT);
        updateInventory();
        showWinNotification(winningNFT);
    }
    isSpinning = false;
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
        
        // Убираем слова редкости из названия
        let displayName = cleanNFTName(nft.label);
        
        item.innerHTML = `
            <img src="${imgSrc}" alt="${displayName}" class="inventory-nft-img">
            <div class="inventory-nft-name">${displayName}</div>
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
        
        // Убираем слова редкости из названия
        let displayName = cleanNFTName(nft.label);
        
        option.textContent = displayName;
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
    
    // Убираем слова редкости из названия
    let displayName = cleanNFTName(nft.label);
    
    notification.innerHTML = `
        <div class="win-content">
            <img src="${imgSrc}" alt="${displayName}">
            <h3>Поздравляем!</h3>
            <p>Вы получили: ${displayName}</p>
        </div>
    `;
    
    document.body.appendChild(notification);
    
    setTimeout(() => {
        notification.remove();
    }, 3000);
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
    const targetPage = document.getElementById(`page-${pageName}`);
    if (targetPage) {
        targetPage.classList.add('active');
    }
    
    // Обновляем активную кнопку в навигации (если есть)
    const navButtons = document.querySelectorAll('.nav-btn');
    if (navButtons.length > 0) {
        navButtons.forEach(btn => {
            btn.classList.remove('active');
        });
        
        const activeButton = document.querySelector(`[data-page="${pageName}"]`);
        if (activeButton) {
            activeButton.classList.add('active');
        }
    }
}