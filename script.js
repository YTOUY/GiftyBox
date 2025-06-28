// Инициализация Supabase (замени на свои ключи)
const SUPABASE_URL = 'https://your-project-url.supabase.co'; // Замени на свой URL
const SUPABASE_ANON_KEY = 'your-anon-key'; // Замени на свой anon key

// Создаем клиент Supabase
const supabaseClient = supabase.createClient(SUPABASE_URL, SUPABASE_ANON_KEY);

// Global variables
let gcoins = 1000;
let inventory = [];
let activeCase = null;
let isSpinning = false;
let currentUserId = null; // ID текущего пользователя

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
    setTimeout(async () => {
        loadingScreen.style.display = 'none';
        mainContent.style.display = 'block';
        
        // Инициализируем пользователя
        await initializeUser();
        
        referralLink.href = `https://t.me/share?url=https://GiftyBox.netlify.app&text=Присоединяйся к GiftyBox!`;
    }, 2000);
}

startApp();

// --- Функции для работы с Supabase ---

// Генерация уникального ID пользователя
function generateUserId() {
    return 'user_' + Date.now() + '_' + Math.random().toString(36).substr(2, 9);
}

// Инициализация пользователя
async function initializeUser() {
    // Проверяем, есть ли сохраненный ID пользователя
    let userId = localStorage.getItem('giftybox_user_id');
    
    if (!userId) {
        userId = generateUserId();
        localStorage.setItem('giftybox_user_id', userId);
    }
    
    currentUserId = userId;
    
    try {
        // Получаем данные пользователя из Supabase
        const response = await fetch('/.netlify/functions/api', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
                action: 'getUser',
                userId: userId
            })
        });
        
        const data = await response.json();
        
        if (data.success) {
            gcoins = data.user.gcoins;
            gcoinsDisplay.textContent = gcoins;
            
            // Загружаем инвентарь
            await loadInventory();
        }
    } catch (error) {
        console.error('Error initializing user:', error);
        // В случае ошибки используем локальные данные
    }
}

// Загрузка инвентаря из Supabase
async function loadInventory() {
    if (!currentUserId) return;
    
    try {
        const response = await fetch('/.netlify/functions/api', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
                action: 'getInventory',
                userId: currentUserId
            })
        });
        
        const data = await response.json();
        
        if (data.success) {
            inventory = data.inventory.map(item => {
                const nftData = item.nfts || {};
                return {
                    id: item.nft_id,
                    label: nftData.name || item.nft_id,
                    rarity: nftData.rarity || 'basic',
                    stars: nftData.stars || 0,
                    gcoins: nftData.gcoins || 0,
                    case_id: item.case_id,
                    created_at: item.created_at
                };
            });
            updateInventory();
        }
    } catch (error) {
        console.error('Error loading inventory:', error);
    }
}

// Открытие кейса через Supabase
async function openCaseWithSupabase(caseName) {
    if (!currentUserId) {
        console.error('User not initialized');
        return null;
    }
    
    try {
        const response = await fetch('/.netlify/functions/api', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
                action: 'openCase',
                userId: currentUserId,
                case: caseName,
                gcoins: gcoins
            })
        });
        
        const data = await response.json();
        
        if (data.success) {
            gcoins = data.newGcoins;
            gcoinsDisplay.textContent = gcoins;
            
            // Добавляем NFT в локальный инвентарь
            const nft = data.nft;
            const nftData = {
                id: nft,
                label: nft,
                rarity: 'basic',
                stars: 0,
                gcoins: 0,
                case_id: caseName,
                created_at: new Date().toISOString()
            };
            
            inventory.push(nftData);
            updateInventory();
            
            return nftData;
        } else {
            console.error('Failed to open case:', data.error);
            return null;
        }
    } catch (error) {
        console.error('Error opening case:', error);
        return null;
    }
}

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
    const baseNFTs = [...caseData.nfts];
    const repeatCount = 7;
    const allNFTs = [];
    for (let r = 0; r < repeatCount; r++) {
        for (let i = 0; i < baseNFTs.length; i++) {
            allNFTs.push(baseNFTs[i]);
        }
    }
    const centerStart = Math.floor(repeatCount / 2) * baseNFTs.length;
    const centerNFTs = allNFTs.slice(centerStart, centerStart + baseNFTs.length);
    for (let i = centerNFTs.length - 1; i > 0; i--) {
        const j = Math.floor(Math.random() * (i + 1));
        [centerNFTs[i], centerNFTs[j]] = [centerNFTs[j], centerNFTs[i]];
    }
    for (let i = 0; i < baseNFTs.length; i++) {
        allNFTs[centerStart + i] = centerNFTs[i];
    }
    for (let i = 0; i < allNFTs.length; i++) {
        const nft = allNFTs[i];
        const slot = document.createElement('div');
        slot.className = 'nft-slot';
        const uniqueId = `${nft.id}-${nft.label}-${nft.rarity}`;
        slot.dataset.nftId = uniqueId;
        slot.dataset.nftRarity = nft.rarity;
        slot.dataset.nftLabel = nft.label;
        slot.dataset.nftRaw = JSON.stringify(nft);
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
    container._repeatCount = repeatCount;
    container._baseLength = baseNFTs.length;
}

// Получить NFT из DOM-слота (теперь возвращает исходный объект из data-nft-raw)
function getNFTFromSlot(slot) {
    if (!slot) return null;
    try {
        return JSON.parse(slot.dataset.nftRaw);
    } catch (e) {
        return null;
    }
}

// Плавная анимация рулетки (easeInOutCubic) и точное совпадение результата
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
        // Параметры
        const slotWidth = 136;
        const viewportWidth = viewport.offsetWidth;
        const repeatCount = container._repeatCount || 7;
        const baseLength = container._baseLength || Math.floor(slots.length / repeatCount);
        const centerStart = Math.floor(repeatCount / 2) * baseLength;
        // Начальная позиция: первый слот центральной копии по центру
        const initialOffset = (viewportWidth / 2) - (slotWidth / 2) - (centerStart * slotWidth);
        // Случайный целевой индекс в центральной копии
        const centerCopyStart = centerStart;
        const centerCopyEnd = centerStart + baseLength;
        const targetIndex = centerCopyStart + Math.floor(Math.random() * baseLength);
        // Итоговая позиция: целевой слот по центру
        const finalOffset = (viewportWidth / 2) - (slotWidth / 2) - (targetIndex * slotWidth);
        // Сколько "оборотов" сделать (визуально)
        const extraSpins = 3;
        const totalDistance = finalOffset - initialOffset - extraSpins * baseLength * slotWidth;
        // Длительность
        const duration = 7500;
        let start = null;
        // Плавная easeInOutCubic
        function easeInOutCubic(t) {
            return t < 0.5
                ? 4 * t * t * t
                : 1 - Math.pow(-2 * t + 2, 3) / 2;
        }
        let lastCenterSlot = null;
        function animate(now) {
            if (!start) start = now;
            let elapsed = now - start;
            if (elapsed > duration) elapsed = duration;
            let t = elapsed / duration;
            let eased = easeInOutCubic(t);
            if (eased > 1) eased = 1;
            const currentOffset = initialOffset + totalDistance * eased;
            container.style.transition = 'none';
            container.style.transform = `translateX(${currentOffset}px)`;
            // Координата палки — центр viewport
            const pointerX = viewport.getBoundingClientRect().left + viewportWidth / 2;
            // Находим слот, чья середина ближе всего к pointerX
            let minDist = Infinity;
            let centerSlot = null;
            slots.forEach(slot => {
                const rect = slot.getBoundingClientRect();
                const slotCenter = rect.left + rect.width / 2;
                const dist = Math.abs(slotCenter - pointerX);
                if (dist < minDist) {
                    minDist = dist;
                    centerSlot = slot;
                }
            });
            // Подсвечиваем только текущий центр
            if (lastCenterSlot && lastCenterSlot !== centerSlot) {
                lastCenterSlot.classList.remove('winning');
            }
            if (centerSlot) centerSlot.classList.add('winning');
            lastCenterSlot = centerSlot;
            if (elapsed < duration) {
                requestAnimationFrame(animate);
            } else {
                setTimeout(() => {
                    if (centerSlot) centerSlot.classList.remove('winning');
                    container.style.transition = 'none';
                    container.style.transform = `translateX(${finalOffset}px)`;
                    const nft = getNFTFromSlot(centerSlot);
                    resolve(nft);
                }, 1000);
            }
        }
        container.style.transition = 'none';
        container.style.transform = `translateX(${initialOffset}px)`;
        requestAnimationFrame(animate);
    });
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
    
    // Запускаем анимацию рулетки и получаем выигрышный NFT
    const winningNFT = await spinRoulette(activeCase);
    
    if (winningNFT) {
        // Открываем кейс через Supabase
        const savedNFT = await openCaseWithSupabase(activeCase);
        
        if (savedNFT) {
            showWinNotification(savedNFT);
        } else {
            // Если не удалось сохранить в Supabase, используем локальные данные
            gcoins -= caseData.cost;
            gcoinsDisplay.textContent = gcoins;
            inventory.push(winningNFT);
            updateInventory();
            showWinNotification(winningNFT);
        }
    }
    
    isSpinning = false;
}

// Демо режим открытия кейса
async function demoCase() {
    if (!activeCase || isSpinning) return;
    isSpinning = true;
    // Запускаем анимацию рулетки и получаем выигрышный NFT (по центру)
    const winningNFT = await spinRoulette(activeCase);
    if (winningNFT) {
        showWinNotification(winningNFT);
    }
    isSpinning = false;
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
    
    // Специальная обработка для страницы профиля
    if (pageName === 'profile') {
        updateProfileNFTs();
    }
}

// Обновление NFT в профиле
function updateProfileNFTs() {
    const profileNFTList = document.getElementById('profile-nft-list');
    if (!profileNFTList) return;
    
    profileNFTList.innerHTML = '';
    
    if (inventory.length === 0) {
        profileNFTList.innerHTML = '<div class="empty-inventory">У вас пока нет NFT</div>';
        return;
    }
    
    // Показываем первые 6 NFT в профиле
    const displayNFTs = inventory.slice(0, 6);
    
    displayNFTs.forEach((nft, index) => {
        const nftElement = document.createElement('div');
        nftElement.className = 'profile-nft';
        nftElement.onclick = () => openNFTDetail(nft, index);
        
        let imgSrc;
        if (nft.gcoins) {
            imgSrc = 'assets/nft/gcoins.gif';
        } else {
            imgSrc = `assets/nft/${nft.rarity}-${nft.id}.gif`;
        }
        
        nftElement.innerHTML = `<img src="${imgSrc}" alt="${nft.label}">`;
        profileNFTList.appendChild(nftElement);
    });
}

// Открытие детального просмотра NFT
function openNFTDetail(nft, index) {
    // Сохраняем текущую страницу для возврата
    window.previousPage = document.querySelector('.page.active').id.replace('page-', '');
    
    // Заполняем данные NFT
    document.getElementById('nft-detail-title').textContent = 'NFT';
    document.getElementById('nft-detail-name').textContent = cleanNFTName(nft.label);
    document.getElementById('nft-detail-rarity').textContent = nft.rarity;
    
    let imgSrc;
    if (nft.gcoins) {
        imgSrc = 'assets/nft/gcoins.gif';
    } else {
        imgSrc = `assets/nft/${nft.rarity}-${nft.id}.gif`;
    }
    document.getElementById('nft-detail-img').src = imgSrc;
    
    // Рассчитываем цену продажи на основе Portals Market
    const sellPrice = calculateNFTSellPrice(nft);
    document.getElementById('nft-sell-price').textContent = sellPrice;
    
    // Сохраняем данные NFT для использования в функциях
    window.currentNFTDetail = { nft, index };
    
    // Показываем страницу детального просмотра
    showPage('nft-detail');
}

// Расчет цены продажи NFT на основе Portals Market
function calculateNFTSellPrice(nft) {
    // Базовые цены в TON (примерные, основанные на Portals Market)
    const basePrices = {
        'basic': { min: 0.1, max: 0.5 },
        'standard': { min: 0.5, max: 2 },
        'rare': { min: 2, max: 10 },
        'epic': { min: 10, max: 50 },
        'legendary': { min: 50, max: 200 },
        'mythic': { min: 200, max: 1000 },
        'special': { min: 0.1, max: 0.5 } // для GCoins
    };
    
    const rarity = nft.rarity || 'basic';
    const priceRange = basePrices[rarity] || basePrices.basic;
    
    // Генерируем случайную цену в диапазоне
    const tonPrice = priceRange.min + Math.random() * (priceRange.max - priceRange.min);
    
    // Конвертируем в GCoins (1 TON = 100 GCoins)
    const gcoinsPrice = Math.floor(tonPrice * 100);
    
    // Для специальных NFT (GCoins) возвращаем их номинальную стоимость
    if (nft.gcoins) {
        return nft.gcoins;
    }
    
    return gcoinsPrice;
}

// Функция продажи NFT
function sellNFT() {
    if (!window.currentNFTDetail) return;
    
    const { nft, index } = window.currentNFTDetail;
    const sellPrice = calculateNFTSellPrice(nft);
    
    if (confirm(`Продать ${cleanNFTName(nft.label)} за ${sellPrice} GCoins?`)) {
        // Увеличиваем баланс
        gcoins += sellPrice;
        gcoinsDisplay.textContent = gcoins;
        
        // Удаляем NFT из инвентаря
        inventory.splice(index, 1);
        
        // Обновляем отображение
        updateInventory();
        updateProfileNFTs();
        
        // Возвращаемся в профиль
        goBack();
        
        // Показываем уведомление
        showNotification(`NFT продан за ${sellPrice} GCoins!`);
    }
}

// Функция вывода NFT
function withdrawNFT() {
    if (!window.currentNFTDetail) return;
    
    const { nft } = window.currentNFTDetail;
    
    // Показываем уведомление о выводе
    const notification = document.createElement('div');
    notification.className = 'withdraw-notification';
    notification.innerHTML = `
        <h3>Вывод NFT</h3>
        <p>Ваш подарок будет выведен</p>
    `;
    
    document.body.appendChild(notification);
    
    setTimeout(() => {
        notification.remove();
    }, 3000);
}

// Функция возврата назад
function goBack() {
    if (window.previousPage) {
        showPage(window.previousPage);
        window.previousPage = null;
    } else {
        showPage('profile');
    }
}

// Показ уведомления
function showNotification(message) {
    const notification = document.createElement('div');
    notification.className = 'win-notification';
    notification.innerHTML = `
        <div class="win-content">
            <h3>Уведомление</h3>
            <p>${message}</p>
        </div>
    `;
    
    document.body.appendChild(notification);
    
    setTimeout(() => {
        notification.remove();
    }, 3000);
}