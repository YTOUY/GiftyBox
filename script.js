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
    
    console.log('Создаем слоты для кейса:', caseName);
    console.log('NFT в кейсе:', caseData.nfts);
    
    // Используем существующий массив NFT (они уже повторяются в данных)
    const allNFTs = [...caseData.nfts];
    
    // Перемешиваем массив для случайного порядка
    for (let i = allNFTs.length - 1; i > 0; i--) {
        const j = Math.floor(Math.random() * (i + 1));
        [allNFTs[i], allNFTs[j]] = [allNFTs[j], allNFTs[i]];
    }
    
    // Создаем больше слотов для бесконечной ленты
    const totalSlots = 100; // Увеличиваем количество слотов
    
    for (let i = 0; i < totalSlots; i++) {
        const nft = allNFTs[i % allNFTs.length];
        const slot = document.createElement('div');
        slot.className = 'nft-slot';
        
        // Создаем уникальный идентификатор для каждого NFT
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
        
        // Убираем слова редкости из названия
        let displayName = cleanNFTName(nft.label);
        
        console.log('Загружаем изображение:', imgSrc, 'для NFT:', displayName);
        
        slot.innerHTML = `
            <img src="${imgSrc}" alt="${displayName}" class="nft-slot-img" 
                 onload="console.log('Успешно загружено изображение:', '${imgSrc}')"
                 onerror="console.log('Не удалось загрузить изображение:', '${imgSrc}')">
            <div class="nft-slot-name">${displayName}</div>
            <div class="nft-slot-rarity ${nft.rarity}">${nft.rarity}</div>
        `;
        
        container.appendChild(slot);
    }
    
    console.log(`Создано ${totalSlots} слотов для бесконечной ленты`);
    console.log('Контейнер слотов:', container);
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

// Анимация вращения рулетки
function spinRoulette(winningNFT) {
    return new Promise((resolve) => {
        const container = document.getElementById('nft-slots-container');
        
        if (!container) {
            console.error('Контейнер слотов не найден!');
            resolve();
            return;
        }
        
        const slots = container.querySelectorAll('.nft-slot');
        
        if (slots.length === 0) {
            console.error('Слоты не найдены!');
            resolve();
            return;
        }
        
        console.log('Начинаем анимацию рулетки');
        console.log('Выигрышный NFT:', winningNFT);
        console.log('Количество слотов:', slots.length);
        
        // Создаем уникальный идентификатор для выигрышного NFT
        const winningUniqueId = `${winningNFT.id}-${winningNFT.label}-${winningNFT.rarity}`;
        
        // Находим все слоты с выигрышным NFT
        const winningSlots = [];
        slots.forEach((slot, index) => {
            if (slot.dataset.nftId === winningUniqueId) {
                winningSlots.push(index);
            }
        });
        
        // Выбираем случайный выигрышный слот
        const winningIndex = winningSlots[Math.floor(Math.random() * winningSlots.length)];
        
        console.log('Индекс выигрышного слота:', winningIndex);
        
        // Сбрасываем предыдущие трансформации
        container.style.transition = 'none';
        container.style.transform = 'translateX(0)';
        
        // Принудительно перерисовываем
        container.offsetHeight;
        
        // Вычисляем размеры
        const slotWidth = 136; // 120px + 16px gap
        const containerWidth = container.parentElement.offsetWidth;
        const centerPosition = containerWidth / 2 - slotWidth / 2;
        
        // Вычисляем конечную позицию (центрируем выигрышный слот)
        const finalPosition = centerPosition - (winningIndex * slotWidth);
        
        // Добавляем несколько полных оборотов для эффекта
        // Используем меньшее расстояние для более плавной анимации
        const totalDistance = -(slots.length * slotWidth * 1.5) + finalPosition;
        
        console.log('Параметры анимации:', {
            slotWidth,
            containerWidth,
            centerPosition,
            finalPosition,
            totalDistance
        });
        
        // Запускаем анимацию
        container.style.transition = 'transform 7.5s cubic-bezier(0.25, 0.46, 0.45, 0.94)';
        container.style.transform = `translateX(${totalDistance}px)`;
        
        // После завершения анимации
        setTimeout(() => {
            console.log('Анимация завершена');
            
            // Подсвечиваем выигрышный слот
            const centerSlot = slots[winningIndex];
            if (centerSlot) {
                centerSlot.classList.add('winning');
                console.log('Подсвечиваем выигрышный слот');
            }
            
            setTimeout(() => {
                if (centerSlot) {
                    centerSlot.classList.remove('winning');
                }
                console.log('Анимация полностью завершена');
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