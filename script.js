// Инициализация Supabase (замени на свои ключи)
const SUPABASE_URL = 'https://your-project-url.supabase.co'; // Замени на свой URL
const SUPABASE_ANON_KEY = 'your-anon-key'; // Замени на свой anon key

// Создаем клиент Supabase
const supabaseClient = supabase.createClient(SUPABASE_URL, SUPABASE_ANON_KEY);

// Global variables
let gcoins = 1000;
let inventory = [];
let currentUserId = null;
let tg = window.Telegram.WebApp;

// Глобальные переменные для истории и рефералов
let userHistory = [];
let referralCount = 0;
let referralEarned = 0;

// Состояние кейса
const caseState = {
    current: null,
    isSpinning: false,
    multiplier: 1,
    spinItems: []
};

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

// TON Connect 2 интеграция
let connector;
let wallet = null;

// --- TON Connect UI ---
document.addEventListener('DOMContentLoaded', function() {
    const tonConnectUI = new TON_CONNECT_UI.TonConnectUI({
        manifestUrl: 'https://giftybox.netlify.app/tonconnect-manifest.json',
        buttonRootId: 'ton-connect-ui'
    });
    // Можно подписаться на события, если нужно
    // tonConnectUI.onStatusChange(...)
});

// Удаляю кастомные функции и модалку подключения кошелька
// ... (оставьте только функции пополнения, работы с балансом и т.д.)

// Калькулятор пополнения TON → GCoins
function updateTopupCalc() {
    const ton = parseFloat(document.getElementById('topup-ton').value) || 0;
    const gcoins = Math.floor(ton * 100);
    const bonus = ton >= 5 ? Math.floor(gcoins * 0.3) : 0;
    const totalGcoins = gcoins + bonus;
    
    document.getElementById('topup-gcoins').textContent = totalGcoins;
    document.getElementById('topup-bonus').textContent = bonus > 0 ? `+${bonus} GCoins бонус!` : '';
}

// Пополнение баланса через кошелек
async function topupBalance() {
    const ton = parseFloat(document.getElementById('topup-ton').value) || 0;
    if (ton <= 0) {
        alert('Введите сумму TON');
        return;
    }

    if (!wallet) {
        alert('Сначала подключите кошелек!');
        return;
    }

    const balance = await getTonBalance();
    if (balance < ton) {
        alert(`Недостаточно TON в кошельке. Баланс: ${balance.toFixed(2)} TON`);
        return;
    }

    const confirmed = confirm(`Отправить ${ton} TON для пополнения баланса?`);
    if (confirmed) {
        const success = await sendTopupTransaction(ton);
        if (success) {
            document.getElementById('topup-ton').value = '';
            updateTopupCalc();
        }
    }
}

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
    // Получаем данные из Telegram WebApp
    if (tg.initDataUnsafe && tg.initDataUnsafe.user) {
        const telegramUser = tg.initDataUnsafe.user;
        currentUserId = telegramUser.id;
        
        // Обновляем отображение имени пользователя
        const profileName = document.getElementById('profile-name');
        if (profileName) {
            profileName.textContent = telegramUser.first_name + 
                (telegramUser.last_name ? ' ' + telegramUser.last_name : '');
        }
        
        try {
            // Получаем данные пользователя из базы
            const response = await fetch('/.netlify/functions/api', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    action: 'getUser',
                    userId: currentUserId
                })
            });
            
            const data = await response.json();
            
            if (data.success) {
                gcoins = data.user.gcoins;
                updateBalanceDisplays();
                await loadInventory();
            }
        } catch (error) {
            console.error('Error initializing user:', error);
        }
    }
}

// Обновление отображения баланса
function updateBalanceDisplays() {
    const balanceElements = document.querySelectorAll('#main-balance, #profile-balance');
    balanceElements.forEach(el => {
        el.textContent = window.gcoins.toFixed(2);
    });
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
    'free-spins': {
        name: 'Free Spins',
        cost: 0,
        image: 'assets/cases/free-spins.png',
        nfts: [
            { id: 'empty', label: 'Пусто', type: 'empty' },
            { id: 'gcoins-1', label: '1 Gc', gcoins: 1 },
            { id: 'gcoins-2', label: '2 Gc', gcoins: 2 },
            { id: 'gcoins-3', label: '3 Gc', gcoins: 3 },
            { id: 'gcoins-5', label: '5 Gc', gcoins: 5 },
            { id: 'gcoins-10', label: '10 Gc', gcoins: 10 }
        ],
        probabilities: [99, 0.2, 0.2, 0.2, 0.2, 0.2]
    },
    'lunar-luck': {
        name: 'Lunar Luck',
        cost: 50,
        image: 'assets/cases/lunar-luck.png',
        nfts: [
            { id: 'gcoins-10', label: '10 Gc', gcoins: 10 },
            { id: 'gcoins-15', label: '15 Gc', gcoins: 15 },
            { id: 'gcoins-20', label: '20 Gc', gcoins: 20 },
            { id: 'gcoins-25', label: '25 Gc', gcoins: 25 },
            { id: 'gcoins-30', label: '30 Gc', gcoins: 30 },
            { id: 'gcoins-50', label: '50 Gc', gcoins: 50 },
            { id: 'lunar-snake', label: 'Lunar Snake', rarity: 'basic' },
            { id: 'pet-snake', label: 'Pet Snake', rarity: 'basic' },
            { id: 'snake-box', label: 'Snake Box', rarity: 'basic' },
            { id: 'sakura-flower', label: 'Sakura Flower', rarity: 'basic' },
            { id: 'astral-shard', label: 'Astral Shard', rarity: 'basic' },
            { id: 'snow-mittens', label: 'Snow Mittens', rarity: 'basic' },
            { id: 'light-sword', label: 'Light Sword', rarity: 'basic' }
        ],
        probabilities: [13, 13, 13, 13, 13, 10, 5, 5, 5, 5, 5, 5, 5]
    },
    'heartbeat': {
        name: 'Heartbeat',
        cost: 100,
        image: 'assets/cases/heartbeat.png',
        nfts: [
            { id: 'gcoins-20', label: '20 Gc', gcoins: 20 },
            { id: 'gcoins-30', label: '30 Gc', gcoins: 30 },
            { id: 'gcoins-40', label: '40 Gc', gcoins: 40 },
            { id: 'gcoins-50', label: '50 Gc', gcoins: 50 },
            { id: 'gcoins-60', label: '60 Gc', gcoins: 60 },
            { id: 'gcoins-100', label: '100 Gc', gcoins: 100 },
            { id: 'heart-locket', label: 'Heart Locket', rarity: 'basic' },
            { id: 'trapped-heart', label: 'Trapped Heart', rarity: 'basic' },
            { id: 'cookie-heart', label: 'Cookie Heart', rarity: 'basic' },
            { id: 'eternal-rose', label: 'Eternal Rose', rarity: 'basic' },
            { id: 'bow-tie', label: 'Bow Tie', rarity: 'basic' },
            { id: 'precious-peach', label: 'Precious Peach', rarity: 'basic' },
            { id: 'restless-jar', label: 'Restless Jar', rarity: 'basic' }
        ],
        probabilities: [13, 13, 13, 13, 13, 10, 5, 5, 5, 5, 5, 5, 5]
    },
    'sweet-tooth': {
        name: 'Sweet Tooth',
        cost: 200,
        image: 'assets/cases/sweet-tooth.png',
        nfts: [
            { id: 'gcoins-50', label: '50 Gc', gcoins: 50 },
            { id: 'gcoins-70', label: '70 Gc', gcoins: 70 },
            { id: 'gcoins-100', label: '100 Gc', gcoins: 100 },
            { id: 'gcoins-120', label: '120 Gc', gcoins: 120 },
            { id: 'gcoins-150', label: '150 Gc', gcoins: 150 },
            { id: 'gcoins-200', label: '200 Gc', gcoins: 200 },
            { id: 'jelly-bunny', label: 'Jelly Bunny', rarity: 'basic' },
            { id: 'ginger-cookie', label: 'Ginger Cookie', rarity: 'basic' },
            { id: 'candy-cane', label: 'Candy Cane', rarity: 'basic' },
            { id: 'lol-pop', label: 'Lol Pop', rarity: 'basic' },
            { id: 'mad-pumpkin', label: 'Mad Pumpkin', rarity: 'basic' },
            { id: 'holiday-drink', label: 'Holiday Drink', rarity: 'basic' },
            { id: 'big-year', label: 'Big Year', rarity: 'basic' }
        ],
        probabilities: [0.13,0.13,0.13,0.13,0.13,0.10,0.05,0.05,0.05,0.05,0.05,0.05,0.05]
    },
    'magic-night': {
        name: 'Magic Night',
        cost: 300,
        image: 'assets/cases/magic-night.png',
        nfts: [
            { id: 'gcoins-70', label: '70 Gc', gcoins: 70 },
            { id: 'gcoins-100', label: '100 Gc', gcoins: 100 },
            { id: 'gcoins-120', label: '120 Gc', gcoins: 120 },
            { id: 'gcoins-150', label: '150 Gc', gcoins: 150 },
            { id: 'gcoins-200', label: '200 Gc', gcoins: 200 },
            { id: 'gcoins-300', label: '300 Gc', gcoins: 300 },
            { id: 'eternal-candle', label: 'Eternal Candle', rarity: 'basic' },
            { id: 'magic-potion', label: 'Magic Potion', rarity: 'basic' },
            { id: 'crystal-ball', label: 'Crystal Ball', rarity: 'basic' },
            { id: 'hypno-lollipop', label: 'Hypno Lollipop', rarity: 'basic' },
            { id: 'witch-hat', label: 'Witch Hat', rarity: 'basic' },
            { id: 'voodoo-doll', label: 'Voodoo Doll', rarity: 'basic' },
            { id: 'hex-pot', label: 'Hex Pot', rarity: 'basic' }
        ],
        probabilities: [0.13,0.13,0.13,0.13,0.13,0.10,0.05,0.05,0.05,0.05,0.05,0.05,0.05]
    },
    'winter-wonders': {
        name: 'Winter Wonders',
        cost: 500,
        image: 'assets/cases/winter-wonders.png',
        nfts: [
            { id: 'gcoins-100', label: '100 Gc', gcoins: 100 },
            { id: 'gcoins-150', label: '150 Gc', gcoins: 150 },
            { id: 'gcoins-200', label: '200 Gc', gcoins: 200 },
            { id: 'gcoins-250', label: '250 Gc', gcoins: 250 },
            { id: 'gcoins-300', label: '300 Gc', gcoins: 300 },
            { id: 'gcoins-500', label: '500 Gc', gcoins: 500 },
            { id: 'snow-globe', label: 'Snow Globe', rarity: 'basic' },
            { id: 'snow-mittens', label: 'Snow Mittens', rarity: 'basic' },
            { id: 'sleigh-bell', label: 'Sleigh Bell', rarity: 'basic' },
            { id: 'winter-wreath', label: 'Winter Wreath', rarity: 'basic' },
            { id: 'santa-hat', label: 'Santa Hat', rarity: 'basic' },
            { id: 'jingle-bells', label: 'Jingle Bells', rarity: 'basic' },
            { id: 'desk-calendar', label: 'Desk Calendar', rarity: 'basic' }
        ],
        probabilities: [0.13,0.13,0.13,0.13,0.13,0.10,0.05,0.05,0.05,0.05,0.05,0.05,0.05]
    },
    'party-box': {
        name: 'Party Box',
        cost: 700,
        image: 'assets/cases/party-box.png',
        nfts: [
            { id: 'gcoins-150', label: '150 Gc', gcoins: 150 },
            { id: 'gcoins-200', label: '200 Gc', gcoins: 200 },
            { id: 'gcoins-250', label: '250 Gc', gcoins: 250 },
            { id: 'gcoins-300', label: '300 Gc', gcoins: 300 },
            { id: 'gcoins-400', label: '400 Gc', gcoins: 400 },
            { id: 'gcoins-700', label: '700 Gc', gcoins: 700 },
            { id: 'party-sparkler', label: 'Party Sparkler', rarity: 'basic' },
            { id: 'jester-hat', label: 'Jester Hat', rarity: 'basic' },
            { id: 'b-day-candle', label: 'B Day Candle', rarity: 'basic' },
            { id: 'plush-pepe', label: 'Plush Pepe', rarity: 'basic' },
            { id: 'top-hat', label: 'Top Hat', rarity: 'basic' },
            { id: 'flying-broom', label: 'Flying Broom', rarity: 'basic' },
            { id: 'record-player', label: 'Record Player', rarity: 'basic' }
        ],
        probabilities: [0.13,0.13,0.13,0.13,0.13,0.10,0.05,0.05,0.05,0.05,0.05,0.05,0.05]
    },
    'lucky-charms': {
        name: 'Lucky Charms',
        cost: 1000,
        image: 'assets/cases/lucky-charms.png',
        nfts: [
            { id: 'gcoins-200', label: '200 Gc', gcoins: 200 },
            { id: 'gcoins-300', label: '300 Gc', gcoins: 300 },
            { id: 'gcoins-400', label: '400 Gc', gcoins: 400 },
            { id: 'gcoins-500', label: '500 Gc', gcoins: 500 },
            { id: 'gcoins-700', label: '700 Gc', gcoins: 700 },
            { id: 'gcoins-1000', label: '1000 Gc', gcoins: 1000 },
            { id: 'evil-eye', label: 'Evil Eye', rarity: 'basic' },
            { id: 'sharp-tongue', label: 'Sharp Tongue', rarity: 'basic' },
            { id: 'star-notepad', label: 'Star Notepad', rarity: 'basic' },
            { id: 'ion-gem', label: 'Ion Gem', rarity: 'basic' },
            { id: 'scared-cat', label: 'Scared Cat', rarity: 'basic' },
            { id: 'kissed-frog', label: 'Kissed Frog', rarity: 'basic' },
            { id: 'electric-skull', label: 'Electric Skull', rarity: 'basic' }
        ],
        probabilities: [0.13,0.13,0.13,0.13,0.13,0.10,0.05,0.05,0.05,0.05,0.05,0.05,0.05]
    },
    'heroic-legends': {
        name: 'Heroic Legends',
        cost: 1500,
        image: 'assets/cases/heroic-legends.png',
        nfts: [
            { id: 'gcoins-300', label: '300 Gc', gcoins: 300 },
            { id: 'gcoins-400', label: '400 Gc', gcoins: 400 },
            { id: 'gcoins-500', label: '500 Gc', gcoins: 500 },
            { id: 'gcoins-700', label: '700 Gc', gcoins: 700 },
            { id: 'gcoins-1000', label: '1000 Gc', gcoins: 1000 },
            { id: 'gcoins-1500', label: '1500 Gc', gcoins: 1500 },
            { id: 'heroic-helmet', label: 'Heroic Helmet', rarity: 'basic' },
            { id: 'durov-cap', label: 'Durov s Cap', rarity: 'basic' },
            { id: 'top-hat', label: 'Top Hat', rarity: 'basic' },
            { id: 'mini-oscar', label: 'Mini Oscar', rarity: 'basic' },
            { id: 'swiss-watch', label: 'Swiss Watch', rarity: 'basic' },
            { id: 'vintage-cigar', label: 'Vintage Cigar', rarity: 'basic' },
            { id: 'gem-signet', label: 'Gem Signet', rarity: 'basic' }
        ],
        probabilities: [0.13,0.13,0.13,0.13,0.13,0.10,0.05,0.05,0.05,0.05,0.05,0.05,0.05]
    },
    'flower-power': {
        name: 'Flower Power',
        cost: 2000,
        image: 'assets/cases/flower-power.png',
        nfts: [
            { id: 'gcoins-400', label: '400 Gc', gcoins: 400 },
            { id: 'gcoins-500', label: '500 Gc', gcoins: 500 },
            { id: 'gcoins-700', label: '700 Gc', gcoins: 700 },
            { id: 'gcoins-1000', label: '1000 Gc', gcoins: 1000 },
            { id: 'gcoins-1500', label: '1500 Gc', gcoins: 1500 },
            { id: 'gcoins-2000', label: '2000 Gc', gcoins: 2000 },
            { id: 'skull-flower', label: 'Skull Flower', rarity: 'basic' },
            { id: 'sakura-flower', label: 'Sakura Flower', rarity: 'basic' },
            { id: 'eternal-rose', label: 'Eternal Rose', rarity: 'basic' },
            { id: 'lush-bouquet', label: 'Lush Bouquet', rarity: 'basic' },
            { id: 'berry-box', label: 'Berry Box', rarity: 'basic' },
            { id: 'perfume-bottle', label: 'Perfume Bottle', rarity: 'basic' },
            { id: 'precious-peach', label: 'Precious Peach', rarity: 'basic' }
        ],
        probabilities: [0.13,0.13,0.13,0.13,0.13,0.10,0.05,0.05,0.05,0.05,0.05,0.05,0.05]
    },
    'riches-rings': {
        name: 'Riches & Rings',
        cost: 3000,
        image: 'assets/cases/riches-rings.png',
        nfts: [
            { id: 'gcoins-500', label: '500 Gc', gcoins: 500 },
            { id: 'gcoins-700', label: '700 Gc', gcoins: 700 },
            { id: 'gcoins-1000', label: '1000 Gc', gcoins: 1000 },
            { id: 'gcoins-1500', label: '1500 Gc', gcoins: 1500 },
            { id: 'gcoins-2000', label: '2000 Gc', gcoins: 2000 },
            { id: 'gcoins-3000', label: '3000 Gc', gcoins: 3000 },
            { id: 'diamond-ring', label: 'Diamond Ring', rarity: 'basic' },
            { id: 'signet-ring', label: 'Signet Ring', rarity: 'basic' },
            { id: 'bonded-ring', label: 'Bonded Ring', rarity: 'basic' },
            { id: 'nail-bracelet', label: 'Nail Bracelet', rarity: 'basic' },
            { id: 'gem-signet', label: 'Gem Signet', rarity: 'basic' },
            { id: 'bow-tie', label: 'Bow Tie', rarity: 'basic' },
            { id: 'astral-shard', label: 'Astral Shard', rarity: 'basic' }
        ],
        probabilities: [0.13,0.13,0.13,0.13,0.13,0.10,0.05,0.05,0.05,0.05,0.05,0.05,0.05]
    },
    'tech-treasures': {
        name: 'Tech Treasures',
        cost: 5000,
        image: 'assets/cases/tech-treasures.png',
        nfts: [
            { id: 'gcoins-700', label: '700 Gc', gcoins: 700 },
            { id: 'gcoins-1000', label: '1000 Gc', gcoins: 1000 },
            { id: 'gcoins-1500', label: '1500 Gc', gcoins: 1500 },
            { id: 'gcoins-2000', label: '2000 Gc', gcoins: 2000 },
            { id: 'gcoins-3000', label: '3000 Gc', gcoins: 3000 },
            { id: 'gcoins-5000', label: '5000 Gc', gcoins: 5000 },
            { id: 'tama-gadget', label: 'Tama Gadget', rarity: 'basic' },
            { id: 'vintage-cigar', label: 'Vintage Cigar', rarity: 'basic' },
            { id: 'swiss-watch', label: 'Swiss Watch', rarity: 'basic' },
            { id: 'record-player', label: 'Record Player', rarity: 'basic' },
            { id: 'crystal-ball', label: 'Crystal Ball', rarity: 'basic' },
            { id: 'electric-skull', label: 'Electric Skull', rarity: 'basic' },
            { id: 'hypno-lollipop', label: 'Hypno Lollipop', rarity: 'basic' }
        ],
        probabilities: [0.13,0.13,0.13,0.13,0.13,0.10,0.05,0.05,0.05,0.05,0.05,0.05,0.05]
    },
    'spooky-box': {
        name: 'Spooky Box',
        cost: 7000,
        image: 'assets/cases/spooky-box.png',
        nfts: [
            { id: 'gcoins-1000', label: '1000 Gc', gcoins: 1000 },
            { id: 'gcoins-1500', label: '1500 Gc', gcoins: 1500 },
            { id: 'gcoins-2000', label: '2000 Gc', gcoins: 2000 },
            { id: 'gcoins-3000', label: '3000 Gc', gcoins: 3000 },
            { id: 'gcoins-5000', label: '5000 Gc', gcoins: 5000 },
            { id: 'gcoins-7000', label: '7000 Gc', gcoins: 7000 },
            { id: 'voodoo-doll', label: 'Voodoo Doll', rarity: 'basic' },
            { id: 'mad-pumpkin', label: 'Mad Pumpkin', rarity: 'basic' },
            { id: 'witch-hat', label: 'Witch Hat', rarity: 'basic' },
            { id: 'scared-cat', label: 'Scared Cat', rarity: 'basic' },
            { id: 'evil-eye', label: 'Evil Eye', rarity: 'basic' },
            { id: 'hex-pot', label: 'Hex Pot', rarity: 'basic' },
            { id: 'trapped-heart', label: 'Trapped Heart', rarity: 'basic' }
        ],
        probabilities: [0.13,0.13,0.13,0.13,0.13,0.10,0.05,0.05,0.05,0.05,0.05,0.05,0.05]
    },
    'animal-parade': {
        name: 'Animal Parade',
        cost: 8000,
        image: 'assets/cases/animal-parade.png',
        nfts: [
            { id: 'gcoins-1500', label: '1500 Gc', gcoins: 1500 },
            { id: 'gcoins-2000', label: '2000 Gc', gcoins: 2000 },
            { id: 'gcoins-3000', label: '3000 Gc', gcoins: 3000 },
            { id: 'gcoins-5000', label: '5000 Gc', gcoins: 5000 },
            { id: 'gcoins-7000', label: '7000 Gc', gcoins: 7000 },
            { id: 'gcoins-8000', label: '8000 Gc', gcoins: 8000 },
            { id: 'plush-pepe', label: 'Plush Pepe', rarity: 'basic' },
            { id: 'scared-cat', label: 'Scared Cat', rarity: 'basic' },
            { id: 'toy-bear', label: 'Toy Bear', rarity: 'basic' },
            { id: 'durov-duck', label: 'Durov Duck', rarity: 'basic' },
            { id: 'jelly-bunny', label: 'Jelly Bunny', rarity: 'basic' },
            { id: 'pet-snake', label: 'Pet Snake', rarity: 'basic' },
            { id: 'flying-broom', label: 'Flying Broom', rarity: 'basic' }
        ],
        probabilities: [0.13,0.13,0.13,0.13,0.13,0.10,0.05,0.05,0.05,0.05,0.05,0.05,0.05]
    },
    'cosmic-fortune': {
        name: 'Cosmic Fortune',
        cost: 9000,
        image: 'assets/cases/cosmic-fortune.png',
        nfts: [
            { id: 'gcoins-2000', label: '2000 Gc', gcoins: 2000 },
            { id: 'gcoins-3000', label: '3000 Gc', gcoins: 3000 },
            { id: 'gcoins-5000', label: '5000 Gc', gcoins: 5000 },
            { id: 'gcoins-7000', label: '7000 Gc', gcoins: 7000 },
            { id: 'gcoins-8000', label: '8000 Gc', gcoins: 8000 },
            { id: 'gcoins-9000', label: '9000 Gc', gcoins: 9000 },
            { id: 'astral-shard', label: 'Astral Shard', rarity: 'basic' },
            { id: 'ion-gem', label: 'Ion Gem', rarity: 'basic' },
            { id: 'gem-signet', label: 'Gem Signet', rarity: 'basic' },
            { id: 'crystal-ball', label: 'Crystal Ball', rarity: 'basic' },
            { id: 'magic-potion', label: 'Magic Potion', rarity: 'basic' },
            { id: 'eternal-candle', label: 'Eternal Candle', rarity: 'basic' },
            { id: 'big-year', label: 'Big Year', rarity: 'basic' }
        ],
        probabilities: [0.13,0.13,0.13,0.13,0.13,0.10,0.05,0.05,0.05,0.05,0.05,0.05,0.05]
    },
    'golden-year': {
        name: 'Golden Year',
        cost: 10000,
        image: 'assets/cases/golden-year.png',
        nfts: [
            { id: 'gcoins-3000', label: '3000 Gc', gcoins: 3000 },
            { id: 'gcoins-4000', label: '4000 Gc', gcoins: 4000 },
            { id: 'gcoins-5000', label: '5000 Gc', gcoins: 5000 },
            { id: 'gcoins-6000', label: '6000 Gc', gcoins: 6000 },
            { id: 'gcoins-8000', label: '8000 Gc', gcoins: 8000 },
            { id: 'gcoins-10000', label: '10000 Gc', gcoins: 10000 },
            { id: 'big-year', label: 'Big Year', rarity: 'basic' },
            { id: 'bow-tie', label: 'Bow Tie', rarity: 'basic' },
            { id: 'precious-peach', label: 'Precious Peach', rarity: 'basic' },
            { id: 'heroic-helmet', label: 'Heroic Helmet', rarity: 'basic' },
            { id: 'diamond-ring', label: 'Diamond Ring', rarity: 'basic' },
            { id: 'swiss-watch', label: 'Swiss Watch', rarity: 'basic' },
            { id: 'durov-cap', label: 'Durov s Cap', rarity: 'basic' }
        ],
        probabilities: [0.13,0.13,0.13,0.13,0.13,0.10,0.05,0.05,0.05,0.05,0.05,0.05,0.05]
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
function openCasePage(caseId) {
    caseState.current = cases[caseId];
    if (!caseState.current) {
        console.error('Case not found:', caseId);
        return;
    }
    
    // Аватарка
    const avatar = document.getElementById('case-detail-avatar');
    if (!avatar) {
        console.error('Avatar element not found');
        return;
    }
    avatar.innerHTML = `<img src="${caseState.current.image}" alt="${caseState.current.name}" onerror="this.src='assets/cases/default.png'">`;
    
    // Название
    const titleElement = document.getElementById('case-detail-title');
    if (titleElement) {
        titleElement.textContent = caseState.current.name;
    }
    
    // Цена
    const priceElement = document.getElementById('case-detail-price');
    if (priceElement) {
        priceElement.textContent = caseState.current.cost;
    }
    
    // Призы
    const prizesGrid = document.getElementById('case-detail-prizes-grid');
    if (!prizesGrid) {
        console.error('Prizes grid element not found');
        return;
    }
    
    let nfts = [...caseState.current.nfts];
    nfts.sort((a, b) => (b.gcoins || 0) - (a.gcoins || 0));
    
    prizesGrid.innerHTML = '';
    nfts.forEach(nft => {
        const imgSrc = nft.gcoins ? 'assets/nft/gcoins.gif' : `assets/nft/${nft.id}.gif`;
        const label = nft.label;
        const gcoins = nft.gcoins ? `<span class="prize-gcoins">${nft.gcoins} Gc</span>` : '';
        
        prizesGrid.innerHTML += `
            <div class="case-detail-prize">
                <img src="${imgSrc}" alt="${label}" onerror="this.src='assets/nft/default.gif'">
                <div class="prize-label">${label}</div>
                ${gcoins}
            </div>
        `;
    });
    
    // Обработчики для новых кнопок под ценой
    const spinBtn = document.getElementById('btn-spin-detail');
    const demoBtn = document.getElementById('btn-demo-detail');
    if (spinBtn) {
        spinBtn.onclick = () => handleSpin(caseId, false);
    }
    if (demoBtn) {
        demoBtn.onclick = () => handleSpin(caseId, true);
    }
    // Множители и fast можно синхронизировать по желанию
    // Показываем страницу кейса
    showPage('case-detail');
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
    if (!caseState.current || caseState.isSpinning) return;
    const caseData = cases[caseState.current.id];
    if (gcoins < caseData.cost) {
        alert('Недостаточно G-Coins!');
        return;
    }
    
    caseState.isSpinning = true;
    
    // Запускаем анимацию рулетки и получаем выигрышный NFT
    const winningNFT = await spinRoulette(caseState.current.id);
    
    if (winningNFT) {
        // Открываем кейс через Supabase
        const savedNFT = await openCaseWithSupabase(caseState.current.id);
        
        if (savedNFT) {
            // Добавляем в историю
            addToHistory(`Открыл ${caseData.name}`, -caseData.cost, 'opened');
            showWinNotification(savedNFT);
        } else {
            // Если не удалось сохранить в Supabase, используем локальные данные
            gcoins -= caseData.cost;
            gcoinsDisplay.textContent = gcoins;
            inventory.push(winningNFT);
            addToHistory(`Открыл ${caseData.name}`, -caseData.cost, 'opened');
            updateInventory();
            showWinNotification(winningNFT);
        }
    }
    
    caseState.isSpinning = false;
}

// Демо режим открытия кейса
async function demoCase() {
    if (!caseState.current || caseState.isSpinning) return;
    caseState.isSpinning = true;
    // Запускаем анимацию рулетки и получаем выигрышный NFT (по центру)
    const winningNFT = await spinRoulette(caseState.current.id);
    if (winningNFT) {
        showWinNotification(winningNFT);
    }
    caseState.isSpinning = false;
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
    const inventoryList = document.getElementById('inventory-list');
    if (!inventoryList) {
        console.error('Inventory list element not found');
        return;
    }
    
    inventoryList.innerHTML = '';
    if (!inventory || inventory.length === 0) {
        inventoryList.innerHTML = '<div class="empty-inventory">Инвентарь пуст</div>';
        return;
    }
    
    inventory.forEach((nft, index) => {
        const item = document.createElement('div');
        item.className = 'inventory-item';
        item.onclick = () => openNFTDetail(nft, index);
        
        let imgSrc;
        if (nft.gcoins) {
            imgSrc = 'assets/nft/gcoins.gif';
        } else {
            imgSrc = `assets/nft/${nft.rarity}-${nft.id}.gif`;
        }
        let displayName = cleanNFTName(nft.label);
        item.innerHTML = `
            <img src="${imgSrc}" alt="${displayName}" class="inventory-nft-img" onerror="this.src='assets/nft/default.gif'">
            <div class="inventory-nft-name">${displayName}</div>
            <div class="inventory-nft-rarity">${nft.rarity}</div>
        `;
        inventoryList.appendChild(item);
    });
}

// --- Апгрейд NFT ---
// Открыть модалку выбора NFT для апгрейда
function openUpgradeSelectNFT() {
    const modal = document.getElementById('modal-upgrade-nft');
    const list = document.getElementById('modal-upgrade-nft-list');
    list.innerHTML = '';
    // Только NFT из инвентаря, цена > 1 TON
    const eligible = inventory.filter(nft => getNFTPriceInGCoins(nft.id, true) > 100);
    if (eligible.length === 0) {
        list.innerHTML = '<div style="color:#fff">Нет подходящих NFT</div>';
    } else {
        eligible.forEach((nft, idx) => {
            const item = document.createElement('div');
            item.className = 'modal-nft-item' + (upgradeSelectedNFT && upgradeSelectedNFT.id === nft.id ? ' selected' : '');
            item.onclick = () => {
                upgradeSelectedNFT = nft;
                closeModal('modal-upgrade-nft');
                showNotification('Теперь выберите NFT, которое желаете получить');
                drawUpgradeCircle();
                updateUpgradeButtonState();
            };
            let imgSrc = nft.gcoins ? 'assets/nft/gcoins.gif' : `assets/nft/${nft.rarity}-${nft.id}.gif`;
            item.innerHTML = `<img src="${imgSrc}"><div class="nft-label">${cleanNFTName(nft.label)}</div><div class="nft-price">${getNFTPriceInGCoins(nft.id, true)} GCoins</div>`;
            list.appendChild(item);
        });
    }
    modal.classList.remove('hidden');
    updateUpgradeButtonState();
}

// Открыть модалку выбора целевого NFT
function openUpgradeSelectTarget() {
    if (!upgradeSelectedNFT) {
        showNotification('Сначала выберите NFT для апгрейда!');
        return;
    }
    const modal = document.getElementById('modal-upgrade-target');
    const list = document.getElementById('modal-upgrade-target-list');
    list.innerHTML = '';
    // Все NFT, цена >= 1.8 * выбранного, сортировка по цене, исключая выбранный
    const selectedPrice = getNFTPriceInGCoins(upgradeSelectedNFT.id, true);
    const allNFTs = Object.keys(NFT_PRICES)
        .filter(id => id !== upgradeSelectedNFT.id)
        .map(id => ({
            id,
            price: getNFTPriceInGCoins(id, true),
            rarity: getRarityById(id)
        }))
        .filter(nft => nft.price >= Math.ceil(selectedPrice * 1.8))
        .sort((a, b) => a.price - b.price);
    if (allNFTs.length === 0) {
        list.innerHTML = '<div style="color:#fff">Нет подходящих NFT для апгрейда</div>';
    } else {
        allNFTs.forEach((nft, idx) => {
            const item = document.createElement('div');
            item.className = 'modal-nft-item' + (upgradeTargetNFT && upgradeTargetNFT.id === nft.id ? ' selected' : '');
            item.onclick = () => {
                upgradeTargetNFT = nft;
                closeModal('modal-upgrade-target');
                // Рассчитать шанс
                upgradeChance = Math.floor(selectedPrice / nft.price * 100);
                drawUpgradeCircle();
            };
            let imgSrc = nft.id.startsWith('gcoins') ? 'assets/nft/gcoins.gif' : `assets/nft/${nft.rarity}-${nft.id}.gif`;
            item.innerHTML = `<div class="nft-chance">Шанс: ${Math.floor(selectedPrice / nft.price * 100)}%</div><img src="${imgSrc}"><div class="nft-label">${cleanNFTName(nft.id)}</div><div class="nft-price">${nft.price} GCoins</div>`;
            list.appendChild(item);
        });
    }
    modal.classList.remove('hidden');
    updateUpgradeButtonState();
}

// Получить редкость по id (для отображения гифки)
function getRarityById(id) {
    for (const caseName in cases) {
        const found = cases[caseName].nfts.find(nft => nft.id === id);
        if (found) return found.rarity;
    }
    return 'basic';
}

// Отрисовка круга апгрейда
function drawUpgradeCircle(angle = 0) {
    const canvas = document.getElementById('upgrade-canvas');
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    ctx.clearRect(0, 0, canvas.width, canvas.height);
    // Круг
    ctx.save();
    ctx.translate(canvas.width/2, canvas.height/2);
    ctx.lineWidth = 32;
    // Серый фон
    ctx.strokeStyle = '#bbb';
    ctx.beginPath();
    ctx.arc(0, 0, 110, 0, 2*Math.PI);
    ctx.stroke();
    // Градиентная дуга (шанс)
    if (upgradeChance > 0) {
        const grad = ctx.createLinearGradient(110, 0, -110, 0);
        grad.addColorStop(0, '#27ae60');
        grad.addColorStop(1, '#2980b9');
        ctx.strokeStyle = grad;
        ctx.beginPath();
        ctx.arc(0, 0, 110, -Math.PI/2, -Math.PI/2 + 2*Math.PI * (upgradeChance/100));
        ctx.shadowColor = '#27ae60';
        ctx.shadowBlur = 16;
        ctx.stroke();
        ctx.shadowBlur = 0;
    }
    // Красный треугольник (указатель) с glow
    ctx.save();
    ctx.rotate(angle);
    ctx.shadowColor = '#fff';
    ctx.shadowBlur = 12;
    ctx.fillStyle = '#c0392b';
    ctx.beginPath();
    ctx.moveTo(0, -130);
    ctx.lineTo(-18, -100);
    ctx.lineTo(18, -100);
    ctx.closePath();
    ctx.fill();
    ctx.restore();
    ctx.restore();
    // В центре целевое NFT (upgradeTargetNFT)
    const centerDiv = document.getElementById('upgrade-nft-center');
    if (centerDiv) {
        if (upgradeTargetNFT) {
            let imgSrc = upgradeTargetNFT.id && upgradeTargetNFT.id.startsWith('gcoins')
                ? 'assets/nft/gcoins.gif'
                : `assets/nft/${upgradeTargetNFT.rarity || getRarityById(upgradeTargetNFT.id)}-${upgradeTargetNFT.id}.gif`;
            centerDiv.innerHTML = `<img src='${imgSrc}' alt='NFT'>`;
            centerDiv.style.display = '';
        } else {
            centerDiv.innerHTML = '';
            centerDiv.style.display = 'none';
        }
    }
}

// Запуск анимации апгрейда
function startUpgrade() {
    if (!upgradeSelectedNFT || !upgradeTargetNFT) {
        showNotification('Выберите оба NFT для апгрейда!');
        return;
    }
    upgradeInProgress = true;
    let start = null;
    const duration = 5000 + Math.random()*3000; // 5-8 сек
    const totalAngle = 2*Math.PI;
    // Вычисляем сектор успеха
    const winStart = -Math.PI/2;
    const winEnd = winStart + totalAngle * (upgradeChance/100);
    // Случайный итоговый угол
    const isWin = Math.random() < (upgradeChance/100);
    let finalAngle;
    if (isWin) {
        finalAngle = winStart + Math.random()*(winEnd-winStart);
    } else {
        finalAngle = winEnd + Math.random()*(totalAngle-(winEnd-winStart));
    }
    // Анимация
    function animate(now) {
        if (!start) start = now;
        let elapsed = now - start;
        let t = Math.min(elapsed/duration, 1);
        // easeInOutCubic
        t = t<0.5 ? 4*t*t*t : 1-(-2*t+2)**3/2;
        const angle = 8*Math.PI*t + finalAngle*t; // много оборотов + финальный
        drawUpgradeCircle(angle);
        if (elapsed < duration) {
            requestAnimationFrame(animate);
        } else {
            setTimeout(() => {
                finishUpgrade(isWin);
            }, 800);
        }
    }
    animate(performance.now());
}

// Завершение апгрейда
function finishUpgrade(isWin) {
    upgradeInProgress = false;
    if (isWin) {
        // Удаляем старый NFT, добавляем новый
        inventory = inventory.filter(nft => nft !== upgradeSelectedNFT);
        inventory.push({
            id: upgradeTargetNFT.id,
            label: upgradeTargetNFT.id,
            rarity: getRarityById(upgradeTargetNFT.id),
            stars: 0,
            gcoins: 0,
            case_id: '',
            created_at: new Date().toISOString()
        });
        showNotification('Апгрейд успешен! Новый NFT добавлен.');
        addToHistory(`Апгрейд: ${cleanNFTName(upgradeSelectedNFT.label)} → ${cleanNFTName(upgradeTargetNFT.id)}`, 0, 'upgrade');
        showConfetti();
    } else {
        // Удаляем выбранный NFT
        inventory = inventory.filter(nft => nft !== upgradeSelectedNFT);
        showNotification('Неудача! NFT утерян.');
        addToHistory(`Апгрейд неудачен: ${cleanNFTName(upgradeSelectedNFT.label)}`, 0, 'upgrade');
        showFlash();
    }
    upgradeSelectedNFT = null;
    upgradeTargetNFT = null;
    upgradeChance = 0;
    drawUpgradeCircle();
    updateInventory();
    updateProfileNFTs();
    updateUpgradeButtonState();
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
function showPage(page) {
    // Скрываем все страницы
    const pages = document.querySelectorAll('.page');
    pages.forEach(p => p.classList.remove('active'));
    
    // Показываем нужную страницу
    const targetPage = document.getElementById(`page-${page}`);
    if (targetPage) {
        targetPage.classList.add('active');
    }
    
    // Обновляем активную кнопку в навигации (если есть)
    const navBtns = document.querySelectorAll('.nav-btn');
    navBtns.forEach(b => b.classList.remove('active'));
    
    const activeButton = document.querySelector(`[data-page="${page}"]`);
    if (activeButton) {
        activeButton.classList.add('active');
    }
    
    // Рендер кейсов при открытии страницы кейсов
    if (page === 'cases') {
        if (typeof renderCasesGrid === 'function') renderCasesGrid();
    }
    
    // Специальная обработка для страницы профиля
    if (page === 'profile') {
        updateProfileNFTs();
        updateProfileHistory();
        updateReferralStats();
    }
}

// Обновление NFT в профиле (самые дорогие)
function updateProfileNFTs() {
    const profileNFTList = document.getElementById('profile-best-nfts');
    if (!profileNFTList) return;
    
    profileNFTList.innerHTML = '';
    
    if (inventory.length === 0) {
        profileNFTList.innerHTML = '<div class="empty-inventory">У вас пока нет NFT</div>';
        return;
    }
    
    // Сортируем NFT по цене (самые дорогие первые)
    const sortedNFTs = [...inventory].sort((a, b) => {
        const priceA = getNFTPriceInGCoins(a.id, true);
        const priceB = getNFTPriceInGCoins(b.id, true);
        return priceB - priceA;
    });
    
    // Показываем топ-6 самых дорогих NFT
    const displayNFTs = sortedNFTs.slice(0, 6);
    
    displayNFTs.forEach((nft, index) => {
        const nftElement = document.createElement('div');
        nftElement.className = 'profile-nft';
        
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

// Обновление истории операций
function updateProfileHistory() {
    const historyList = document.getElementById('profile-history');
    if (!historyList) return;
    
    historyList.innerHTML = '';
    
    if (userHistory.length === 0) {
        historyList.innerHTML = '<div class="empty-inventory">История пуста</div>';
        return;
    }
    
    // Показываем последние 10 операций
    const recentHistory = userHistory.slice(-10).reverse();
    
    recentHistory.forEach(item => {
        const historyItem = document.createElement('div');
        historyItem.className = `history-item ${item.type}`;
        
        const date = new Date(item.timestamp).toLocaleDateString('ru-RU', {
            day: '2-digit',
            month: '2-digit',
            hour: '2-digit',
            minute: '2-digit'
        });
        
        let amountClass = '';
        if (item.amount > 0) amountClass = 'positive';
        else if (item.amount < 0) amountClass = 'negative';
        
        historyItem.innerHTML = `
            <div class="history-info">
                <div class="history-action">${item.action}</div>
                <div class="history-details">${date}</div>
            </div>
            <div class="history-amount ${amountClass}">${item.amount > 0 ? '+' : ''}${item.amount} GCoins</div>
        `;
        
        historyList.appendChild(historyItem);
    });
}

// Обновление реферальной статистики
function updateReferralStats() {
    document.getElementById('referral-count').textContent = referralCount;
    document.getElementById('referral-earned').textContent = `${referralEarned} GCoins`;
    
    // Обновляем реферальную ссылку
    const referralLink = `https://giftybox.netlify.app?ref=${currentUserId || 'user123'}`;
    document.getElementById('referral-link-input').value = referralLink;
}

// Копирование реферальной ссылки
function copyReferralLink() {
    const input = document.getElementById('referral-link-input');
    input.select();
    input.setSelectionRange(0, 99999);
    document.execCommand('copy');
    
    showNotification('Ссылка скопирована!');
}

// Добавление записи в историю
function addToHistory(action, amount, type = 'opened') {
    const historyItem = {
        action: action,
        amount: amount,
        type: type,
        timestamp: new Date().toISOString()
    };
    
    userHistory.push(historyItem);
    updateProfileHistory();
}

// Открытие детального просмотра NFT (из инвентаря)
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
    
    // Рассчитываем цену продажи для конкретного NFT
    const sellPrice = getNFTPriceInGCoins(nft.id, false);
    document.getElementById('nft-sell-price').textContent = sellPrice;
    
    // Сохраняем данные NFT для использования в функциях
    window.currentNFTDetail = { nft, index };
    
    // Показываем страницу детального просмотра
    showPage('nft-detail');
}

// Функция продажи NFT (обновленная)
function sellNFT() {
    if (!window.currentNFTDetail) return;
    
    const { nft, index } = window.currentNFTDetail;
    const sellPrice = getNFTPriceInGCoins(nft.id, false);
    
    if (confirm(`Продать ${cleanNFTName(nft.label)} за ${sellPrice} GCoins?`)) {
        // Увеличиваем баланс
        gcoins += sellPrice;
        gcoinsDisplay.textContent = gcoins;
        
        // Удаляем NFT из инвентаря
        inventory.splice(index, 1);
        
        // Добавляем в историю
        addToHistory(`Продал ${cleanNFTName(nft.label)}`, sellPrice, 'sold');
        
        // Обновляем отображение
        updateInventory();
        updateProfileNFTs();
        
        // Возвращаемся в инвентарь
        goBack();
        
        // Показываем уведомление
        showNotification(`NFT продан за ${sellPrice} GCoins!`);
    }
}

// Функция вывода NFT (обновленная)
function withdrawNFT() {
    if (!window.currentNFTDetail) return;
    
    const { nft, index } = window.currentNFTDetail;
    
    if (confirm(`Вывести ${cleanNFTName(nft.label)}?`)) {
        // Удаляем NFT из инвентаря
        inventory.splice(index, 1);
        
        // Добавляем в историю
        addToHistory(`Вывел ${cleanNFTName(nft.label)}`, 0, 'withdrawn');
        
        // Обновляем отображение
        updateInventory();
        updateProfileNFTs();
        
        // Возвращаемся в инвентарь
        goBack();
        
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
function showNotification(msg) {
    let n = document.createElement('div');
    n.className = 'notification';
    n.textContent = msg;
    n.style.position = 'fixed';
    n.style.bottom = '90px';
    n.style.left = '50%';
    n.style.transform = 'translateX(-50%)';
    n.style.background = '#3a8fff';
    n.style.color = '#fff';
    n.style.padding = '14px 32px';
    n.style.borderRadius = '14px';
    n.style.fontWeight = '700';
    n.style.zIndex = '9999';
    document.body.appendChild(n);
    setTimeout(() => n.remove(), 2000);
}

function updateUpgradeButtonState() {
    const btn = document.getElementById('btn-upgrade');
    if (!btn) return;
    if (upgradeSelectedNFT && upgradeTargetNFT && !upgradeInProgress) {
        btn.classList.add('btn-upgrade-glow');
        btn.disabled = false;
    } else {
        btn.classList.remove('btn-upgrade-glow');
        btn.disabled = true;
    }
}

// Анимация конфетти
function showConfetti() {
    const confettiCanvas = document.createElement('canvas');
    confettiCanvas.width = window.innerWidth;
    confettiCanvas.height = window.innerHeight;
    confettiCanvas.style.position = 'fixed';
    confettiCanvas.style.left = '0';
    confettiCanvas.style.top = '0';
    confettiCanvas.style.pointerEvents = 'none';
    confettiCanvas.style.zIndex = '3000';
    document.body.appendChild(confettiCanvas);
    const ctx = confettiCanvas.getContext('2d');
    const confetti = [];
    const colors = ['#ffe7a0','#27ae60','#2980b9','#e74c3c','#fff','#f39c12'];
    for (let i = 0; i < 80; i++) {
        confetti.push({
            x: Math.random()*confettiCanvas.width,
            y: -20-Math.random()*100,
            r: 6+Math.random()*8,
            d: 2+Math.random()*4,
            color: colors[Math.floor(Math.random()*colors.length)],
            tilt: Math.random()*10-5,
            tiltAngle: 0,
            tiltAngleInc: 0.05+Math.random()*0.07
        });
    }
    let frame = 0;
    function draw() {
        ctx.clearRect(0,0,confettiCanvas.width,confettiCanvas.height);
        confetti.forEach(c => {
            ctx.beginPath();
            ctx.ellipse(c.x, c.y, c.r, c.r/2, c.tilt, 0, 2*Math.PI);
            ctx.fillStyle = c.color;
            ctx.fill();
        });
    }
    function update() {
        frame++;
        confetti.forEach(c => {
            c.y += c.d + Math.sin(frame/10);
            c.x += Math.sin(frame/15 + c.tilt)*2;
            c.tilt += c.tiltAngleInc;
        });
    }
    function animate() {
        draw();
        update();
        if (frame < 90) {
            requestAnimationFrame(animate);
        } else {
            confettiCanvas.remove();
        }
    }
    animate();
}

// Вспышка при неудаче
function showFlash() {
    const flash = document.createElement('div');
    flash.style.position = 'fixed';
    flash.style.left = '0';
    flash.style.top = '0';
    flash.style.width = '100vw';
    flash.style.height = '100vh';
    flash.style.background = 'radial-gradient(circle at 50% 50%, #fff 0%, #fff8 40%, transparent 80%)';
    flash.style.zIndex = '3000';
    flash.style.pointerEvents = 'none';
    flash.style.opacity = '1';
    flash.style.transition = 'opacity 0.7s';
    document.body.appendChild(flash);
    setTimeout(() => { flash.style.opacity = '0'; }, 80);
    setTimeout(() => { flash.remove(); }, 800);
}

// Функция для рендера кейсов на главной странице (по 2 в ряд, сортировка по цене)
function renderCasesGrid() {
    const grid = document.getElementById('cases-list-grid');
    if (!grid) return;
    
    grid.innerHTML = '';
    Object.keys(cases).forEach(caseId => {
        const caseData = cases[caseId];
        const card = document.createElement('div');
        card.className = 'case-card';
        card.onclick = () => openCasePage(caseId);
        
        card.innerHTML = `
            <div class="case-image">
                <img src="${caseData.image}" alt="${caseData.name}" onerror="this.src='assets/cases/default.png'">
            </div>
            <div class="case-info">
                <div class="case-name">${caseData.name}</div>
                <div class="case-price">
                    <span>${caseData.cost}</span>
                    <img src="assets/ton-logo.svg" class="ton-logo"/>
                </div>
            </div>
        `;
        grid.appendChild(card);
    });
}

// Функция открытия кейса
function openCase(caseId) {
    caseState.current = cases.find(c => c.id === caseId);
    if (!caseState.current) return;
    
    // Показываем страницу открытия кейса
    showPage('case-opening');
    
    // Обновляем информацию о кейсе
    document.getElementById('case-avatar').src = `assets/cases/${caseState.current.image}`;
    document.getElementById('case-name').textContent = caseState.current.name;
    document.getElementById('case-price').textContent = caseState.current.price.toFixed(2);
    
    // Загружаем возможные призы
    loadPossibleItems();
    
    // Инициализируем спиннер
    initializeSpinner(caseId);
}

// Загрузка возможных призов
function loadPossibleItems() {
    const itemsGrid = document.getElementById('possible-items');
    itemsGrid.innerHTML = '';
    
    // Получаем все NFT для этого кейса и сортируем по цене (от дорогих к дешевым)
    const items = caseState.current.items.sort((a, b) => b.price - a.price);
    
    items.forEach(item => {
        const itemCard = document.createElement('div');
        itemCard.className = 'item-card';
        itemCard.innerHTML = `
            <img src="assets/nft/${item.rarity}-${item.id}.gif" alt="${item.name}">
            <div class="item-name">${item.name}</div>
            <div class="item-price">
                ${item.price.toFixed(2)}
                <img src="assets/ton-logo.svg"/>
            </div>
        `;
        itemsGrid.appendChild(itemCard);
    });
}

// Инициализация спиннера
function initializeSpinner(caseId, isDemo = false) {
    const caseData = cases[caseId];
    if (!caseData) return;
    
    // Обновляем информацию о кейсе
    const caseAvatar = document.getElementById('case-avatar');
    const caseName = document.getElementById('case-name');
    const casePrice = document.getElementById('case-price');
    
    if (caseAvatar) caseAvatar.src = caseData.image;
    if (caseName) caseName.textContent = caseData.name;
    if (casePrice) casePrice.textContent = caseData.cost;
    
    // Создаем слоты для рулетки
    createRouletteSlots(caseId);
    
    // Обновляем обработчики кнопок
    const spinButton = document.getElementById('btn-spin-case');
    const demoButton = document.getElementById('btn-demo-case');
    
    if (spinButton) {
        spinButton.onclick = () => openCase(caseId);
    }
    
    if (demoButton) {
        demoButton.onclick = () => demoCase(caseId);
    }
    
    // Если это демо, сразу запускаем демо-спин
    if (isDemo) {
        setTimeout(() => demoCase(caseId), 100);
    }
}

// Функция спина рулетки
async function spinRoulette() {
    return new Promise((resolve) => {
        const spinnerItems = document.getElementById('spinner-items');
        if (!spinnerItems || !caseState.current) {
            resolve(null);
            return;
        }
        
        // Определяем выигрышный предмет
        const winIndex = Math.floor(Math.random() * caseState.current.nfts.length);
        const winningNFT = caseState.current.nfts[winIndex];
        
        // Вычисляем позицию для остановки
        const itemWidth = 132; // ширина предмета + margin
        const centerOffset = (window.innerWidth - itemWidth) / 2;
        const targetPosition = -(winIndex * itemWidth + centerOffset);
        
        // Анимация спина
        spinnerItems.style.transition = 'transform 5s cubic-bezier(0.32, 0.64, 0.45, 1)';
        spinnerItems.style.transform = `translateX(${targetPosition}px)`;
        
        // По окончании анимации
        setTimeout(() => {
            resolve(winningNFT);
        }, 5000);
    });
}

// Функция демо-спина
async function demoCase(caseId) {
    if (!caseState.current || caseState.isSpinning) return;
    
    caseState.isSpinning = true;
    
    // Инициализируем спиннер
    initializeSpinner(caseId, true);
    
    // Запускаем спин и получаем выигрыш
    const winningNFT = await spinRoulette();
    
    if (winningNFT) {
        // Показываем выигрыш
        setTimeout(() => {
            showWinModal(winningNFT);
        }, 5500);
    }
    
    caseState.isSpinning = false;
}

// Обработчики кнопок
document.addEventListener('DOMContentLoaded', () => {
    // Кнопки спина
    document.getElementById('btn-spin')?.addEventListener('click', () => {
        if (!walletConnected) {
            alert('Пожалуйста, подключите кошелек');
            return;
        }
        openCase();
    });
    
    document.getElementById('btn-demo')?.addEventListener('click', demoCase);
    
    // Множители
    document.querySelectorAll('.btn-mult').forEach(btn => {
        btn.addEventListener('click', () => {
            document.querySelectorAll('.btn-mult').forEach(b => b.classList.remove('active'));
            btn.classList.add('active');
            caseState.multiplier = parseInt(btn.dataset.mult.substring(1));
        });
    });
});

// Глобальные переменные и инициализация
window.tg = window.Telegram.WebApp;
window.gcoins = 0;
let walletConnected = false;

// Инициализация TonConnect
const tonConnectUI = new TON_CONNECT_UI.TonConnectUI({
    manifestUrl: 'https://ton-connect.github.io/demo-dapp-with-react/tonconnect-manifest.json',
    buttonRootId: 'ton-connect-ui'
});

// Функция для подключения кошелька
async function connectWallet() {
    try {
        await tonConnectUI.connectWallet();
        walletConnected = true;
        document.querySelectorAll('.btn-wallet').forEach(btn => {
            btn.textContent = 'Wallet Connected';
            btn.style.background = '#27ae60';
        });
        // Обновляем баланс после подключения
        updateBalanceDisplays();
    } catch (error) {
        console.error('Error connecting wallet:', error);
        alert('Failed to connect wallet. Please try again.');
    }
}

// Обновление отображения баланса
function updateBalanceDisplays() {
    const balanceElements = document.querySelectorAll('#main-balance, #profile-balance');
    balanceElements.forEach(el => {
        el.textContent = window.gcoins.toFixed(2);
    });
}

// Инициализация приложения
async function initializeApp() {
    // Настраиваем Telegram Mini App
    window.tg.ready();
    window.tg.expand();

    // Добавляем обработчики для кнопок подключения кошелька
    document.querySelectorAll('.btn-wallet').forEach(btn => {
        btn.addEventListener('click', connectWallet);
    });

    // Инициализируем начальный баланс
    updateBalanceDisplays();

    // Слушаем события подключения/отключения кошелька
    tonConnectUI.onStatusChange(wallet => {
        walletConnected = !!wallet;
        updateBalanceDisplays();
    });

    // Получаем пользователя (пример: window.Telegram.WebApp.initDataUnsafe.user)
    let user = null;
    if (window.Telegram && window.Telegram.WebApp && window.Telegram.WebApp.initDataUnsafe && window.Telegram.WebApp.initDataUnsafe.user) {
        user = window.Telegram.WebApp.initDataUnsafe.user;
    }
    grantGcoinsForLexaaZova(user);
}

// Запускаем инициализацию при загрузке страницы
document.addEventListener('DOMContentLoaded', initializeApp);

// Инициализация рулетки
function initializeRoulette() {
    const rouletteItems = document.getElementById('roulette-items');
    if (!rouletteItems || !caseState.current) return;
    
    // Очищаем рулетку
    rouletteItems.innerHTML = '';
    rouletteItems.style.transform = 'translateX(0)';
    
    // Генерируем случайные предметы для рулетки
    const items = [];
    for (let i = 0; i < 50; i++) {
        const randomNft = caseState.current.nfts[Math.floor(Math.random() * caseState.current.nfts.length)];
        items.push(randomNft);
    }
    
    // Добавляем предметы в рулетку
    items.forEach(item => {
        const rouletteItem = document.createElement('div');
        rouletteItem.className = 'roulette-item';
        
        const imgSrc = item.gcoins ? 'assets/nft/gcoins.gif' : `assets/nft/${item.id}.gif`;
        const price = item.gcoins ? `${item.gcoins} TON` : item.price ? `${item.price} TON` : '';
        
        rouletteItem.innerHTML = `
            <img src="${imgSrc}" alt="${item.label}">
            <div class="item-price">
                ${price}
                <img src="assets/ton-logo.svg" alt="TON">
            </div>
        `;
        
        rouletteItems.appendChild(rouletteItem);
    });
}

// Функция спина рулетки
async function spinRoulette() {
    return new Promise((resolve) => {
        const rouletteItems = document.getElementById('roulette-items');
        if (!rouletteItems || !caseState.current) {
            resolve(null);
            return;
        }
        
        // Определяем выигрышный предмет
        const winIndex = Math.floor(Math.random() * caseState.current.nfts.length);
        const winningNFT = caseState.current.nfts[winIndex];
        
        // Вычисляем позицию для остановки
        const itemWidth = 140; // ширина предмета
        const centerOffset = (window.innerWidth - itemWidth) / 2;
        const targetPosition = -(winIndex * itemWidth + centerOffset);
        
        // Определяем скорость анимации
        const isFast = document.getElementById('fast-spin').checked;
        const duration = isFast ? 3000 : 5000;
        
        // Анимация спина
        rouletteItems.style.transition = `transform ${duration}ms cubic-bezier(0.21, 0.53, 0.29, 0.99)`;
        rouletteItems.style.transform = `translateX(${targetPosition}px)`;
        
        // По окончании анимации
        setTimeout(() => {
            resolve(winningNFT);
        }, duration);
    });
}

// Функция показа выигрыша
function showWinModal(item) {
    const modal = document.createElement('div');
    modal.className = 'win-modal';
    
    const imgSrc = item.gcoins ? 'assets/nft/gcoins.gif' : `assets/nft/${item.id}.gif`;
    const price = item.gcoins ? `${item.gcoins} TON` : item.price ? `${item.price} TON` : '';
    
    modal.innerHTML = `
        <div class="win-modal-title">YOUR PRIZE</div>
        <div class="win-prize">
            <img src="${imgSrc}" alt="${item.label}">
            <div class="prize-price">
                ${price}
                <img src="assets/ton-logo.svg" alt="TON">
            </div>
        </div>
    `;
    
    document.body.appendChild(modal);
    
    // Закрываем модальное окно по клику
    modal.addEventListener('click', () => {
        modal.remove();
    });
}

// Обновляем функцию открытия кейса
async function openCase() {
    if (!caseState.current || caseState.isSpinning) return;
    
    const cost = caseState.current.cost * (caseState.multiplier || 1);
    if (window.gcoins < cost) {
        alert('Недостаточно TON!');
        return;
    }
    
    caseState.isSpinning = true;
    
    // Списываем баланс
    window.gcoins -= cost;
    updateBalanceDisplays();
    
    // Инициализируем рулетку
    initializeRoulette();
    
    // Запускаем спин и получаем выигрыш
    const winningNFT = await spinRoulette();
    
    if (winningNFT) {
        // Показываем выигрыш
        setTimeout(() => {
            showWinModal(winningNFT);
        }, 500);
    }
    
    caseState.isSpinning = false;
}

// Функция демо-спина
async function demoCase() {
    if (!caseState.current || caseState.isSpinning) return;
    
    caseState.isSpinning = true;
    
    // Инициализируем рулетку
    initializeRoulette();
    
    // Запускаем спин и получаем выигрыш
    const winningNFT = await spinRoulette();
    
    if (winningNFT) {
        // Показываем выигрыш
        setTimeout(() => {
            showWinModal(winningNFT);
        }, 500);
    }
    
    caseState.isSpinning = false;
}

// Получить выбранный множитель
function getSelectedMultiplier() {
    const multBtn = document.querySelector('.case-spin-controls .btn-mult.active');
    if (!multBtn) return 1;
    return parseInt(multBtn.dataset.mult.replace('x', '')) || 1;
}

// Проверить fast
function isFastSpin() {
    const fastCheckbox = document.getElementById('fast-spin-detail');
    return fastCheckbox && fastCheckbox.checked;
}

// Бесконечная анимация рулетки с плавной остановкой
function spinRouletteMulti(caseId, count, fast = false) {
    return new Promise((resolve) => {
        const container = document.getElementById('spinner-items');
        if (!container) return resolve([]);
        const caseData = cases[caseId];
        if (!caseData) return resolve([]);
        // Генерируем ленту призов (длинную, чтобы хватило на все циклы)
        const baseNFTs = [...caseData.nfts];
        let nfts = [];
        for (let i = 0; i < 40; i++) {
            nfts = nfts.concat(baseNFTs.sort(() => Math.random() - 0.5));
        }
        // НЕ очищаем container.innerHTML после анимации, чтобы призы не исчезали
        container.innerHTML = '';
        nfts.forEach(nft => {
            const item = document.createElement('div');
            item.className = 'spinner-item';
            const imgSrc = nft.gcoins ? 'assets/nft/gcoins.gif' : `assets/nft/${nft.id}.gif`;
            item.innerHTML = `<img src="${imgSrc}" alt="${nft.label}"><div class="spinner-label">${nft.label}</div>`;
            container.appendChild(item);
        });
        // Размеры
        const itemWidth = 120; // теперь совпадает с CSS
        const totalItems = nfts.length;
        const visibleCount = 5;
        // Выбираем случайные призы для мультиспина
        const winIndexes = [];
        while (winIndexes.length < count) {
            const idx = Math.floor(Math.random() * (totalItems - visibleCount*2)) + visibleCount;
            if (!winIndexes.includes(idx)) winIndexes.push(idx);
        }
        winIndexes.sort((a, b) => a - b);
        // Длительность
        const duration = fast ? (3000 + Math.random()*1000) : (7000 + Math.random()*2000);
        let start = null;
        let finished = false;
        // Начальная позиция (нулевой сдвиг)
        let currentShift = 0;
        // Сколько "кругов" сделать (визуально)
        const rounds = fast ? 6 : 16;
        // Итоговый индекс для остановки (первый выигрышный)
        const stopIndex = winIndexes[0];
        // Итоговый сдвиг
        const stopShift = (rounds * baseNFTs.length + stopIndex) * itemWidth;
        // Сброс transform к начальному положению
        container.style.transition = 'none';
        container.style.transform = 'translateX(0px)';
        // Анимация
        function animate(now) {
            if (!start) start = now;
            let elapsed = now - start;
            if (elapsed > duration) elapsed = duration;
            // Плавная скорость
            let t = elapsed / duration;
            let ease = t < 0.5 ? 4*t*t*t : 1 - Math.pow(-2*t+2,3)/2;
            // Смещение: крутим "бесконечно" влево, а в конце останавливаем на нужном призе
            currentShift = stopShift * ease;
            container.style.transform = `translateX(-${currentShift}px)`;
            if (elapsed < duration) {
                requestAnimationFrame(animate);
            } else {
                finished = true;
                // Подсветить выигрышные
                const result = [];
                for (let i = 0; i < count; i++) {
                    const idx = stopIndex + i;
                    const slot = container.children[idx];
                    if (slot) slot.classList.add('winning');
                    result.push(nfts[idx]);
                }
                setTimeout(() => resolve(result), 800);
            }
        }
        requestAnimationFrame(animate);
    });
}

// Открытие кейса с мультиспином
function handleSpin(caseId, isDemo = false) {
    // Переход на страницу рулетки
    showPage('case-opening');
    // Ждём, чтобы DOM обновился
    setTimeout(() => {
        // Блокируем кнопки (на странице деталей)
        const controls = document.getElementById('case-detail-spin-controls');
        if (controls) controls.classList.add('disabled');
        // Получаем множитель и fast
        const mult = getSelectedMultiplier();
        const fast = isFastSpin();
        spinRouletteMulti(caseId, mult, fast).then(prizes => {
            // После прокрутки разблокируем кнопки
            if (controls) controls.classList.remove('disabled');
            // Показываем окно с призами (реализуй showWinModalMulti)
            showWinModalMulti(prizes);
        });
    }, 100);
}

// Модалка с несколькими призами
function showWinModalMulti(prizes) {
    // Здесь реализуй красивое окно с призами (аналогично скрину)
    alert('Ваши призы: ' + prizes.map(p => p ? p.label : '').join(', '));
}

// --- UPGRADE LOGIC ---
// Модальное окно выбора NFT
function showNFTSelectModal(nfts, onSelect, title = 'Выберите NFT') {
    let modal = document.getElementById('modal-nft-select');
    if (!modal) {
        modal = document.createElement('div');
        modal.id = 'modal-nft-select';
        modal.className = 'modal-overlay';
        modal.innerHTML = `
            <div class="modal-window">
                <div class="modal-title"></div>
                <div class="modal-list"></div>
                <button class="modal-close">Закрыть</button>
            </div>
        `;
        document.body.appendChild(modal);
    }
    modal.querySelector('.modal-title').textContent = title;
    const list = modal.querySelector('.modal-list');
    list.innerHTML = '';
    nfts.forEach(nft => {
        const item = document.createElement('div');
        item.className = 'modal-nft-item';
        item.innerHTML = `<img src="assets/nft/${nft.rarity || 'basic'}-${nft.id}.gif" alt="${nft.label}"><span>${nft.label}</span>`;
        item.onclick = () => {
            modal.style.display = 'none';
            onSelect(nft);
        };
        list.appendChild(item);
    });
    modal.querySelector('.modal-close').onclick = () => {
        modal.style.display = 'none';
    };
    modal.style.display = 'flex';
}

// Модальное окно результата
function showUpgradeResultModal(success, targetNFT) {
    let modal = document.getElementById('modal-upgrade-result');
    if (!modal) {
        modal = document.createElement('div');
        modal.id = 'modal-upgrade-result';
        modal.className = 'modal-overlay';
        modal.innerHTML = `
            <div class="modal-window">
                <div class="modal-title"></div>
                <div class="modal-content"></div>
                <button class="modal-close">OK</button>
            </div>
        `;
        document.body.appendChild(modal);
    }
    modal.querySelector('.modal-title').textContent = success ? 'Успех!' : 'Неудача';
    modal.querySelector('.modal-content').innerHTML = success
        ? `<div>Вы получили:<br><img src="assets/nft/${targetNFT.rarity || 'basic'}-${targetNFT.id}.gif" style="width:48px;height:48px;"><br>${targetNFT.label}</div>`
        : `<div>Вы потеряли своё NFT.<br>Попробуйте ещё раз!</div>`;
    modal.querySelector('.modal-close').onclick = () => {
        modal.style.display = 'none';
    };
    modal.style.display = 'flex';
}

// Уведомление
function showNotification(msg) {
    let notif = document.getElementById('notif-toast');
    if (!notif) {
        notif = document.createElement('div');
        notif.id = 'notif-toast';
        notif.className = 'notif-toast';
        document.body.appendChild(notif);
    }
    notif.textContent = msg;
    notif.style.display = 'block';
    setTimeout(() => { notif.style.display = 'none'; }, 2200);
}

// Кнопки
const btnAddNFT = document.getElementById('btn-add-nft');
const btnChooseNFT = document.getElementById('btn-choose-nft');
const btnStart = document.getElementById('btn-start-upgrade');

if (btnAddNFT) {
    btnAddNFT.onclick = () => {
        // Выбор своего NFT (только одно, из инвентаря)
        if (!window.inventory || window.inventory.length === 0) {
            showNotification('У вас нет NFT для апгрейда!');
            return;
        }
        showNFTSelectModal(window.inventory, nft => {
            upgradeSelectedNFT = nft;
            upgradeTargetNFT = null;
            updateUpgradeUI();
            showNotification('Теперь выберите целевое NFT');
        }, 'Выберите своё NFT');
    };
}
if (btnChooseNFT) {
    btnChooseNFT.onclick = () => {
        if (!upgradeSelectedNFT) {
            showNotification('Сначала выберите своё NFT!');
            return;
        }
        // Выбор целевого NFT (цена >= 1.8x выбранного)
        const selectedPrice = getNFTPriceInTON(upgradeSelectedNFT.id);
        const allNFTs = Object.values(NFT_PRICES)
            .filter(nft => nft.id !== upgradeSelectedNFT.id)
            .filter(nft => getNFTPriceInTON(nft.id) >= Math.ceil(selectedPrice * 1.8));
        if (allNFTs.length === 0) {
            showNotification('Нет подходящих NFT для апгрейда!');
            return;
        }
        showNFTSelectModal(allNFTs, nft => {
            upgradeTargetNFT = nft;
            updateUpgradeUI();
        }, 'Выберите целевое NFT');
    };
}
if (btnStart) {
    btnStart.onclick = () => {
        if (!upgradeSelectedNFT || !upgradeTargetNFT || upgradeInProgress) return;
        upgradeInProgress = true;
        animateUpgradeSpin();
    };
}

function getNFTPriceInTON(id) {
    // Пример: ищем цену в TON по id
    if (NFT_PRICES && NFT_PRICES[id]) return NFT_PRICES[id].ton || 0;
    return 0;
}

function updateUpgradeUI() {
    // Цена
    const price = upgradeSelectedNFT ? getNFTPriceInTON(upgradeSelectedNFT.id) : 0;
    document.getElementById('upgrade-price').textContent = price ? price + ' TON' : '';
    // Шанс
    let chance = 0;
    if (upgradeSelectedNFT && upgradeTargetNFT) {
        const priceSel = getNFTPriceInTON(upgradeSelectedNFT.id);
        const priceTgt = getNFTPriceInTON(upgradeTargetNFT.id);
        chance = Math.floor((priceSel / priceTgt) * 100);
        if (chance > 100) chance = 100;
        upgradeChance = chance;
    }
    document.getElementById('upgrade-chance').textContent = chance ? chance + '%' : '';
    // Центр круга
    const centerDiv = document.getElementById('upgrade-nft-center');
    if (centerDiv) {
        if (upgradeTargetNFT) {
            centerDiv.innerHTML = `<img src="assets/nft/${upgradeTargetNFT.rarity || 'basic'}-${upgradeTargetNFT.id}.gif" alt="NFT">`;
        } else {
            centerDiv.innerHTML = '';
        }
    }
    // Кнопка старт
    if (btnStart) btnStart.style.display = (upgradeSelectedNFT && upgradeTargetNFT) ? '' : 'none';
    // Перерисовать круг
    drawUpgradeCircle();
}

function drawUpgradeCircle(angle = 0) {
    const canvas = document.getElementById('upgrade-canvas');
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    ctx.clearRect(0, 0, canvas.width, canvas.height);
    // Круг
    ctx.save();
    ctx.translate(canvas.width/2, canvas.height/2);
    ctx.lineWidth = 18;
    // Серый фон
    ctx.strokeStyle = '#3a425a';
    ctx.beginPath();
    ctx.arc(0, 0, 80, 0, 2*Math.PI);
    ctx.stroke();
    // Синяя дуга (шанс)
    if (upgradeChance > 0) {
        ctx.strokeStyle = '#2e7fff';
        ctx.beginPath();
        ctx.arc(0, 0, 80, -Math.PI/2, -Math.PI/2 + 2*Math.PI * (upgradeChance/100));
        ctx.shadowColor = '#2e7fff';
        ctx.shadowBlur = 8;
        ctx.stroke();
        ctx.shadowBlur = 0;
    }
    ctx.restore();
    // Треугольник-указатель
    ctx.save();
    ctx.translate(canvas.width/2, canvas.height/2);
    ctx.rotate(angle);
    ctx.fillStyle = '#e74c3c';
    ctx.beginPath();
    ctx.moveTo(0, -92);
    ctx.lineTo(-12, -70);
    ctx.lineTo(12, -70);
    ctx.closePath();
    ctx.shadowColor = '#fff';
    ctx.shadowBlur = 8;
    ctx.fill();
    ctx.restore();
}

function animateUpgradeSpin() {
    const canvas = document.getElementById('upgrade-canvas');
    if (!canvas) return;
    let start = null;
    const duration = 5000 + Math.random()*4000; // 5-9 сек
    const totalAngle = 2*Math.PI;
    // Сектор успеха
    const winStart = -Math.PI/2;
    const winEnd = winStart + totalAngle * (upgradeChance/100);
    // Случайный итоговый угол
    const isWin = Math.random() < (upgradeChance/100);
    let finalAngle;
    if (isWin) {
        finalAngle = winStart + Math.random()*(winEnd-winStart);
    } else {
        finalAngle = winEnd + Math.random()*(totalAngle-(winEnd-winStart));
    }
    // Анимация
    function animate(now) {
        if (!start) start = now;
        let elapsed = now - start;
        if (elapsed > duration) elapsed = duration;
        let t = elapsed / duration;
        let ease = t < 0.5 ? 4*t*t*t : 1 - Math.pow(-2*t+2,3)/2;
        let angle = 8*Math.PI*ease + finalAngle*ease; // много оборотов + финал
        drawUpgradeCircle(angle);
        if (elapsed < duration) {
            requestAnimationFrame(animate);
        } else {
            setTimeout(() => {
                finishUpgrade(isWin);
            }, 800);
        }
    }
    requestAnimationFrame(animate);
}

function finishUpgrade(isWin) {
    upgradeInProgress = false;
    if (isWin) {
        // Удаляем своё NFT, добавляем целевое
        window.inventory = window.inventory.filter(nft => nft.id !== upgradeSelectedNFT.id);
        window.inventory.push(upgradeTargetNFT);
        showUpgradeResultModal(true, upgradeTargetNFT);
    } else {
        // Удаляем своё NFT
        window.inventory = window.inventory.filter(nft => nft.id !== upgradeSelectedNFT.id);
        showUpgradeResultModal(false, upgradeTargetNFT);
    }
    upgradeSelectedNFT = null;
    upgradeTargetNFT = null;
    updateUpgradeUI();
    if (typeof updateInventory === 'function') updateInventory();
}

// Инициализация апгрейда при заходе на страницу
function initUpgradePage() {
    upgradeSelectedNFT = null;
    upgradeTargetNFT = null;
    upgradeChance = 0;
    upgradeInProgress = false;
    updateUpgradeUI();
}

document.addEventListener('DOMContentLoaded', () => {
    if (window.location.hash === '#upgrade' || document.getElementById('page-upgrade').classList.contains('active')) {
        initUpgradePage();
    }
});

// --- Кейс-рулетка ---
function spinCaseRoulette(caseId, count, fast = false) {
    return new Promise((resolve) => {
        const container = document.getElementById('spinner-items');
        if (!container) return resolve([]);
        const caseData = cases[caseId];
        if (!caseData) return resolve([]);
        // Генерируем длинную ленту призов
        const baseNFTs = [...caseData.nfts];
        let nfts = [];
        for (let i = 0; i < 40; i++) {
            nfts = nfts.concat(baseNFTs.sort(() => Math.random() - 0.5));
        }
        container.innerHTML = '';
        nfts.forEach(nft => {
            const item = document.createElement('div');
            item.className = 'spinner-item';
            const imgSrc = nft.gcoins ? 'assets/nft/gcoins.gif' : `assets/nft/${nft.id}.gif`;
            item.innerHTML = `<img src="${imgSrc}" alt="${nft.label}">`;
            container.appendChild(item);
        });
        // Размеры
        const itemWidth = 40; // должен совпадать с CSS
        const totalItems = nfts.length;
        const visibleCount = 7;
        // Выбираем случайный выигрышный индекс (центр)
        const winIndex = Math.floor(totalItems / 2);
        // Длительность
        const duration = fast ? (3000 + Math.random()*1000) : (7000 + Math.random()*2000);
        let start = null;
        // Итоговый сдвиг: чтобы выигрышный приз оказался по центру
        const stopShift = (winIndex - Math.floor(visibleCount/2)) * itemWidth;
        // Анимация
        function animate(now) {
            if (!start) start = now;
            let elapsed = now - start;
            if (elapsed > duration) elapsed = duration;
            let t = elapsed / duration;
            let ease = t < 0.5 ? 4*t*t*t : 1 - Math.pow(-2*t+2,3)/2;
            // Смещение: крутим "бесконечно" влево, а в конце останавливаем на нужном призе
            let currentShift = (itemWidth * totalItems * 2) * (1 - ease) + stopShift * ease;
            container.style.transform = `translateX(-${currentShift}px)`;
            if (elapsed < duration) {
                requestAnimationFrame(animate);
            } else {
                // Подсветить выигрышный
                const slot = container.children[winIndex];
                if (slot) slot.classList.add('winning');
                setTimeout(() => resolve([nfts[winIndex]]), 800);
            }
        }
        requestAnimationFrame(animate);
    });
}

// --- Выдача Gcoins пользователю @lexaa_zova ---
function grantGcoinsForLexaaZova(user) {
    if (user && (user.username === 'lexaa_zova' || user.username === '@lexaa_zova')) {
        window.gcoins = 10000000;
        if (typeof updateBalanceDisplays === 'function') updateBalanceDisplays();
        showNotification('Вам начислено 10 000 000 Gcoins!');
    }
}

// --- Инициализация приложения ---
async function initializeApp() {
    // ... существующая инициализация ...
    // Получаем пользователя (пример: window.Telegram.WebApp.initDataUnsafe.user)
    let user = null;
    if (window.Telegram && window.Telegram.WebApp && window.Telegram.WebApp.initDataUnsafe && window.Telegram.WebApp.initDataUnsafe.user) {
        user = window.Telegram.WebApp.initDataUnsafe.user;
    }
    grantGcoinsForLexaaZova(user);
    // ... остальная инициализация ...
}

// ... existing code ...
// --- Кейс-рулетка с добавлением в инвентарь и списанием баланса ---
function handleCaseSpin(caseId, count = 1, fast = false) {
    const caseData = cases[caseId];
    if (!caseData) return;
    const cost = caseData.cost * count;
    if (window.gcoins < cost) {
        showNotification('Недостаточно Gcoins!');
        return;
    }
    // Списываем баланс
    window.gcoins -= cost;
    if (typeof updateBalanceDisplays === 'function') updateBalanceDisplays();
    // Запускаем анимацию
    spinCaseRoulette(caseId, count, fast).then(prizes => {
        // Добавляем призы в инвентарь
        if (!window.inventory) window.inventory = [];
        prizes.forEach(prize => {
            window.inventory.push(prize);
        });
        if (typeof updateInventory === 'function') updateInventory();
        // Показываем модалку с выигрышем
        showWinModalMulti(prizes);
    });
}
// ... existing code ...

// Анимация прокрутки призов (кейс)
function spinCase(prizes, winIndex) {
    const spinner = document.getElementById('spinner-items');
    if (!spinner) return;
    // Очищаем
    spinner.innerHTML = '';
    // Рендерим призы
    prizes.forEach((prize, i) => {
        const div = document.createElement('div');
        div.className = 'prize-item';
        const img = document.createElement('img');
        img.src = prize.img;
        img.alt = prize.label || '';
        div.appendChild(img);
        spinner.appendChild(div);
    });
    // Рассчитываем сдвиг
    const itemWidth = 120 + 24; // prize + margin
    const centerIndex = Math.floor(prizes.length / 2);
    const offset = (winIndex - centerIndex) * itemWidth;
    spinner.style.transition = 'none';
    spinner.style.transform = `translateX(0px)`;
    setTimeout(() => {
        spinner.style.transition = 'transform 1.5s cubic-bezier(.4,2.3,.3,1)';
        spinner.style.transform = `translateX(-${offset}px)`;
    }, 50);
}