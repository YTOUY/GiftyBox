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

const cases = [
  {
    id: 'free-spins',
    name: 'Free Spins',
    cost: 0,
    image: 'assets/cases/free-spins.png',
    nfts: [
      { id: 'empty', label: 'Пусто', type: 'empty' },
      { id: 'gcoins-1', label: '1 Gcoin', gcoins: 1 },
      { id: 'gcoins-2', label: '2 Gcoins', gcoins: 2 },
      { id: 'gcoins-5', label: '5 Gcoins', gcoins: 5 },
      { id: 'gcoins-10', label: '10 Gcoins', gcoins: 10 },
      { id: 'gcoins-20', label: '20 Gcoins', gcoins: 20 }
    ],
    probabilities: [99, 0.2, 0.2, 0.2, 0.2, 0.2]
  },
  {
    id: 'simple-box',
    name: 'Simple Box',
    cost: 50,
    image: 'assets/cases/Simple-Box.png',
    nfts: [
      { id: 'gcoins-5', label: '5 Gcoins', gcoins: 5 },
      { id: 'gcoins-10', label: '10 Gcoins', gcoins: 10 },
      { id: 'gcoins-15', label: '15 Gcoins', gcoins: 15 },
      { id: 'gcoins-20', label: '20 Gcoins', gcoins: 20 },
      { id: 'gcoins-25', label: '25 Gcoins', gcoins: 25 },
      { id: 'gcoins-50', label: '50 Gcoins', gcoins: 50 },
      { id: 'lol-pop', label: 'Lol Pop' },
      { id: 'desk-calendar', label: 'Desk Calendar' },
      { id: 'candy-cane', label: 'Candy Cane' },
      { id: 'lunar-snake', label: 'Lunar Snake' },
      { id: 'b-day-candle', label: 'B-Day Candle' },
      { id: 'jingle-bells', label: 'Jingle Bells' },
      { id: 'cookie-heart', label: 'Cookie Heart' }
    ],
    probabilities: [13, 13, 13, 13, 13, 10, 5, 5, 5, 5, 5, 5, 5]
  },
  {
    id: 'lucky-box',
    name: 'Lucky Box',
    cost: 100,
    image: 'assets/cases/Lucky-Box.png',
    nfts: [
      { id: 'gcoins-10', label: '10 Gcoins', gcoins: 10 },
      { id: 'gcoins-20', label: '20 Gcoins', gcoins: 20 },
      { id: 'gcoins-30', label: '30 Gcoins', gcoins: 30 },
      { id: 'gcoins-40', label: '40 Gcoins', gcoins: 40 },
      { id: 'gcoins-50', label: '50 Gcoins', gcoins: 50 },
      { id: 'gcoins-100', label: '100 Gcoins', gcoins: 100 },
      { id: 'hypno-lollipop', label: 'Hypno Lollipop' },
      { id: 'homemade-cake', label: 'Homemade Cake' },
      { id: 'xmas-stocking', label: 'Xmas Stocking' },
      { id: 'snake-box', label: 'Snake Box' },
      { id: 'party-sparkler', label: 'Party Sparkler' },
      { id: 'winter-wreath', label: 'Winter Wreath' },
      { id: 'pet-snake', label: 'Pet Snake' }
    ],
    probabilities: [13, 13, 13, 13, 13, 10, 6, 6, 6, 6, 6, 6, 6]
  },
  {
    id: 'fun-box',
    name: 'Fun Box',
    cost: 200,
    image: 'assets/cases/Fun-Box.png',
    nfts: [
      { id: 'gcoins-20', label: '20 Gcoins', gcoins: 20 },
      { id: 'gcoins-30', label: '30 Gcoins', gcoins: 30 },
      { id: 'gcoins-40', label: '40 Gcoins', gcoins: 40 },
      { id: 'gcoins-50', label: '50 Gcoins', gcoins: 50 },
      { id: 'gcoins-75', label: '75 Gcoins', gcoins: 75 },
      { id: 'gcoins-150', label: '150 Gcoins', gcoins: 150 },
      { id: 'jack-in-the-box', label: 'Jack-in-the-Box' },
      { id: 'spiced-wine', label: 'Spiced Wine' },
      { id: 'tama-gadget', label: 'Tama Gadget' },
      { id: 'spy-agaric', label: 'Spy Agaric' },
      { id: 'witch-hat', label: 'Witch Hat' },
      { id: 'evil-eye', label: 'Evil Eye' },
      { id: 'star-notepad', label: 'Star Notepad' }
    ],
    probabilities: [13, 13, 13, 13, 13, 10, 7, 7, 7, 7, 7, 7, 7]
  },
  {
    id: 'joy-box',
    name: 'Joy Box',
    cost: 300,
    image: 'assets/cases/Joy-Box.png',
    nfts: [
      { id: 'gcoins-30', label: '30 Gcoins', gcoins: 30 },
      { id: 'gcoins-40', label: '40 Gcoins', gcoins: 40 },
      { id: 'gcoins-50', label: '50 Gcoins', gcoins: 50 },
      { id: 'gcoins-75', label: '75 Gcoins', gcoins: 75 },
      { id: 'gcoins-100', label: '100 Gcoins', gcoins: 100 },
      { id: 'gcoins-200', label: '200 Gcoins', gcoins: 200 },
      { id: 'hex-pot', label: 'Hex Pot' },
      { id: 'easter-egg', label: 'Easter Egg' },
      { id: 'big-year', label: 'Big Year' },
      { id: 'snow-globe', label: 'Snow Globe' },
      { id: 'restless-jar', label: 'Restless Jar' },
      { id: 'jelly-bunny', label: 'Jelly Bunny' },
      { id: 'snow-mittens', label: 'Snow Mittens' }
    ],
    probabilities: [13, 13, 13, 13, 13, 10, 8, 8, 8, 8, 8, 8, 8]
  },
  {
    id: 'sweet-box',
    name: 'Sweet Box',
    cost: 500,
    image: 'assets/cases/Sweet-Box.png',
    nfts: [
      { id: 'gcoins-40', label: '40 Gcoins', gcoins: 40 },
      { id: 'gcoins-50', label: '50 Gcoins', gcoins: 50 },
      { id: 'gcoins-75', label: '75 Gcoins', gcoins: 75 },
      { id: 'gcoins-100', label: '100 Gcoins', gcoins: 100 },
      { id: 'gcoins-150', label: '150 Gcoins', gcoins: 150 },
      { id: 'gcoins-300', label: '300 Gcoins', gcoins: 300 },
      { id: 'bunny-muffin', label: 'Bunny Muffin' },
      { id: 'sakura-flower', label: 'Sakura Flower' },
      { id: 'berry-box', label: 'Berry Box' },
      { id: 'hanging-star', label: 'Hanging Star' },
      { id: 'bow-tie', label: 'Bow Tie' },
      { id: 'flying-broom', label: 'Flying Broom' },
      { id: 'skull-flower', label: 'Skull Flower' }
    ],
    probabilities: [13, 13, 13, 13, 13, 10, 9, 9, 9, 9, 9, 9, 9]
  },
  {
    id: 'magic-box',
    name: 'Magic Box',
    cost: 1000,
    image: 'assets/cases/Magic-Box.png',
    nfts: [
      { id: 'gcoins-50', label: '50 Gcoins', gcoins: 50 },
      { id: 'gcoins-75', label: '75 Gcoins', gcoins: 75 },
      { id: 'gcoins-100', label: '100 Gcoins', gcoins: 100 },
      { id: 'gcoins-150', label: '150 Gcoins', gcoins: 150 },
      { id: 'gcoins-200', label: '200 Gcoins', gcoins: 200 },
      { id: 'gcoins-400', label: '400 Gcoins', gcoins: 400 },
      { id: 'love-potion', label: 'Love Potion' },
      { id: 'top-hat', label: 'Top Hat' },
      { id: 'record-player', label: 'Record Player' },
      { id: 'lush-bouquet', label: 'Lush Bouquet' },
      { id: 'voodoo-doll', label: 'Voodoo Doll' },
      { id: 'mad-pumpkin', label: 'Mad Pumpkin' },
      { id: 'eternal-rose', label: 'Eternal Rose' }
    ],
    probabilities: [13, 13, 13, 13, 13, 10, 10, 10, 10, 10, 10, 10, 10]
  },
  {
    id: 'party-box',
    name: 'Party Box',
    cost: 2000,
    image: 'assets/cases/Party-Box.png',
    nfts: [
      { id: 'gcoins-75', label: '75 Gcoins', gcoins: 75 },
      { id: 'gcoins-100', label: '100 Gcoins', gcoins: 100 },
      { id: 'gcoins-150', label: '150 Gcoins', gcoins: 150 },
      { id: 'gcoins-200', label: '200 Gcoins', gcoins: 200 },
      { id: 'gcoins-300', label: '300 Gcoins', gcoins: 300 },
      { id: 'gcoins-600', label: '600 Gcoins', gcoins: 600 },
      { id: 'diamond-ring', label: 'Diamond Ring' },
      { id: 'toy-bear', label: 'Toy Bear' },
      { id: 'vintage-cigar', label: 'Vintage Cigar' },
      { id: 'neko-helmet', label: 'Neko Helmet' },
      { id: 'electric-skull', label: 'Electric Skull' },
      { id: 'swiss-watch', label: 'Swiss Watch' },
      { id: 'sharp-tongue', label: 'Sharp Tongue' }
    ],
    probabilities: [13, 13, 13, 13, 13, 10, 11, 11, 11, 11, 11, 11, 11]
  },
  {
    id: 'star-box',
    name: 'Star Box',
    cost: 3000,
    image: 'assets/cases/Star-Box.png',
    nfts: [
      { id: 'gcoins-100', label: '100 Gcoins', gcoins: 100 },
      { id: 'gcoins-150', label: '150 Gcoins', gcoins: 150 },
      { id: 'gcoins-200', label: '200 Gcoins', gcoins: 200 },
      { id: 'gcoins-300', label: '300 Gcoins', gcoins: 300 },
      { id: 'gcoins-400', label: '400 Gcoins', gcoins: 400 },
      { id: 'gcoins-800', label: '800 Gcoins', gcoins: 800 },
      { id: 'scared-cat', label: 'Scared Cat' },
      { id: 'genie-lamp', label: 'Genie Lamp' },
      { id: 'magic-potion', label: 'Magic Potion' },
      { id: 'signet-ring', label: 'Signet Ring' },
      { id: 'astral-shard', label: 'Astral Shard' },
      { id: 'mini-oscar', label: 'Mini Oscar' },
      { id: 'perfume-bottle', label: 'Perfume Bottle' }
    ],
    probabilities: [13, 13, 13, 13, 13, 10, 12, 12, 12, 12, 12, 12, 12]
  },
  {
    id: 'premium-box',
    name: 'Premium Box',
    cost: 5000,
    image: 'assets/cases/Premium-Box.png',
    nfts: [
      { id: 'gcoins-150', label: '150 Gcoins', gcoins: 150 },
      { id: 'gcoins-200', label: '200 Gcoins', gcoins: 200 },
      { id: 'gcoins-300', label: '300 Gcoins', gcoins: 300 },
      { id: 'gcoins-400', label: '400 Gcoins', gcoins: 400 },
      { id: 'gcoins-600', label: '600 Gcoins', gcoins: 600 },
      { id: 'gcoins-1200', label: '1200 Gcoins', gcoins: 1200 },
      { id: 'gem-signet', label: 'Gem Signet' },
      { id: 'heroic-helmet', label: 'Heroic Helmet' },
      { id: 'nail-bracelet', label: 'Nail Bracelet' },
      { id: 'loot-bag', label: 'Loot Bag' },
      { id: 'heart-locket', label: 'Heart Locket' },
      { id: 'plush-pepe', label: 'Plush Pepe' }
    ],
    probabilities: [13, 13, 13, 13, 13, 10, 13, 13, 13, 13, 13, 0.01]
  },
  {
    id: 'super-box',
    name: 'Super Box',
    cost: 6000,
    image: 'assets/cases/Super-Box.png',
    nfts: [
      { id: 'gcoins-200', label: '200 Gcoins', gcoins: 200 },
      { id: 'gcoins-300', label: '300 Gcoins', gcoins: 300 },
      { id: 'gcoins-400', label: '400 Gcoins', gcoins: 400 },
      { id: 'gcoins-600', label: '600 Gcoins', gcoins: 600 },
      { id: 'gcoins-1200', label: '1200 Gcoins', gcoins: 1200 },
      { id: 'gcoins-2500', label: '2500 Gcoins', gcoins: 2500 },
      { id: 'heroic-helmet', label: 'Heroic Helmet' },
      { id: 'nail-bracelet', label: 'Nail Bracelet' },
      { id: 'loot-bag', label: 'Loot Bag' },
      { id: 'heart-locket', label: 'Heart Locket' },
      { id: 'plush-pepe', label: 'Plush Pepe' }
    ],
    probabilities: [13, 13, 13, 13, 13, 10, 8, 8, 8, 8, 0.01]
  },
  {
    id: 'ultra-box',
    name: 'Ultra Box',
    cost: 7000,
    image: 'assets/cases/Ultra-Box.png',
    nfts: [
      { id: 'gcoins-300', label: '300 Gcoins', gcoins: 300 },
      { id: 'gcoins-400', label: '400 Gcoins', gcoins: 400 },
      { id: 'gcoins-600', label: '600 Gcoins', gcoins: 600 },
      { id: 'gcoins-1200', label: '1200 Gcoins', gcoins: 1200 },
      { id: 'gcoins-2500', label: '2500 Gcoins', gcoins: 2500 },
      { id: 'gcoins-5000', label: '5000 Gcoins', gcoins: 5000 },
      { id: 'heroic-helmet', label: 'Heroic Helmet' },
      { id: 'nail-bracelet', label: 'Nail Bracelet' },
      { id: 'loot-bag', label: 'Loot Bag' },
      { id: 'heart-locket', label: 'Heart Locket' },
      { id: 'plush-pepe', label: 'Plush Pepe' }
    ],
    probabilities: [13, 13, 13, 13, 13, 10, 7, 7, 7, 7, 0.01]
  },
  {
    id: 'mega-box',
    name: 'Mega Box',
    cost: 8000,
    image: 'assets/cases/Mega-Box.png',
    nfts: [
      { id: 'gcoins-400', label: '400 Gcoins', gcoins: 400 },
      { id: 'gcoins-600', label: '600 Gcoins', gcoins: 600 },
      { id: 'gcoins-1200', label: '1200 Gcoins', gcoins: 1200 },
      { id: 'gcoins-2500', label: '2500 Gcoins', gcoins: 2500 },
      { id: 'gcoins-5000', label: '5000 Gcoins', gcoins: 5000 },
      { id: 'gcoins-8000', label: '8000 Gcoins', gcoins: 8000 },
      { id: 'heroic-helmet', label: 'Heroic Helmet' },
      { id: 'nail-bracelet', label: 'Nail Bracelet' },
      { id: 'loot-bag', label: 'Loot Bag' },
      { id: 'heart-locket', label: 'Heart Locket' },
      { id: 'plush-pepe', label: 'Plush Pepe' }
    ],
    probabilities: [13, 13, 13, 13, 13, 10, 6, 6, 6, 6, 0.01]
  },
  {
    id: 'diamond-box',
    name: 'Diamond Box',
    cost: 9000,
    image: 'assets/cases/Diamond-Box.png',
    nfts: [
      { id: 'gcoins-600', label: '600 Gcoins', gcoins: 600 },
      { id: 'gcoins-1200', label: '1200 Gcoins', gcoins: 1200 },
      { id: 'gcoins-2500', label: '2500 Gcoins', gcoins: 2500 },
      { id: 'gcoins-5000', label: '5000 Gcoins', gcoins: 5000 },
      { id: 'gcoins-8000', label: '8000 Gcoins', gcoins: 8000 },
      { id: 'gcoins-10000', label: '10000 Gcoins', gcoins: 10000 },
      { id: 'heroic-helmet', label: 'Heroic Helmet' },
      { id: 'nail-bracelet', label: 'Nail Bracelet' },
      { id: 'loot-bag', label: 'Loot Bag' },
      { id: 'heart-locket', label: 'Heart Locket' },
      { id: 'plush-pepe', label: 'Plush Pepe' }
    ],
    probabilities: [13, 13, 13, 13, 13, 10, 5, 5, 5, 5, 0.01]
  },
  {
    id: 'royal-box',
    name: 'Royal Box',
    cost: 10000,
    image: 'assets/cases/Royal-Box.png',
    nfts: [
      { id: 'gcoins-2500', label: '2500 Gcoins', gcoins: 2500 },
      { id: 'gcoins-5000', label: '5000 Gcoins', gcoins: 5000 },
      { id: 'gcoins-8000', label: '8000 Gcoins', gcoins: 8000 },
      { id: 'gcoins-10000', label: '10000 Gcoins', gcoins: 10000 },
      { id: 'gcoins-15000', label: '15000 Gcoins', gcoins: 15000 },
      { id: 'gcoins-20000', label: '20000 Gcoins', gcoins: 20000 },
      { id: 'heroic-helmet', label: 'Heroic Helmet' },
      { id: 'nail-bracelet', label: 'Nail Bracelet' },
      { id: 'loot-bag', label: 'Loot Bag' },
      { id: 'heart-locket', label: 'Heart Locket' },
      { id: 'plush-pepe', label: 'Plush Pepe' }
    ],
    probabilities: [13, 13, 13, 13, 13, 10, 4, 4, 4, 4, 0.01]
  }
];

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
    ctx.arc(0, 0, 130, 0, 2*Math.PI);
    ctx.stroke();
    // Градиентная дуга (шанс)
    if (typeof upgradeChance !== 'undefined' && upgradeChance > 0) {
        const grad = ctx.createLinearGradient(130, 0, -130, 0);
        grad.addColorStop(0, '#27ae60');
        grad.addColorStop(1, '#2980b9');
        ctx.strokeStyle = grad;
        ctx.beginPath();
        ctx.arc(0, 0, 130, -Math.PI/2, -Math.PI/2 + 2*Math.PI * (upgradeChance/100));
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
    ctx.moveTo(0, -150);
    ctx.lineTo(-22, -110);
    ctx.lineTo(22, -110);
    ctx.closePath();
    ctx.fill();
    ctx.restore();
    ctx.restore();
    // В центре целевое NFT (upgradeTargetNFT)
    const centerDiv = document.getElementById('upgrade-nft-center');
    if (centerDiv) {
        if (typeof upgradeTargetNFT !== 'undefined' && upgradeTargetNFT) {
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
    // Если открываем кейсы — рендерим их
    if (page === 'cases' && typeof renderCasesGrid === 'function') {
        renderCasesGrid();
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
    // Получаем массив кейсов, сортируем по цене (от дешевого к дорогому) и берём только первые 16
    const sortedCases = Object.entries(cases)
        .sort(([, a], [, b]) => a.cost - b.cost)
        .slice(0, 16);
    sortedCases.forEach(([caseId, caseData]) => {
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
                    <img src="assets/icons/gcoin.png" class="ton-logo"/>
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

// --- Исправленная функция загрузки возможных призов ---
function loadPossibleItems() {
    const itemsGrid = document.getElementById('possible-items');
    itemsGrid.innerHTML = '';
    if (!caseState.current || !caseState.current.nfts) return;
    const items = [...caseState.current.nfts].sort((a, b) => (b.gcoins || 0) - (a.gcoins || 0));
    items.forEach(item => {
        const imgSrc = item.gcoins ? 'assets/nft/gcoins.gif' : `assets/nft/${item.id}.gif`;
        const price = item.gcoins ? `${item.gcoins}` : '';
        itemsGrid.innerHTML += `
            <div class="item-card">
                <img src="${imgSrc}" alt="${item.label}">
                <div class="item-name">${item.label}</div>
                <div class="item-price">
                    ${price ? price + ' <img src=\'assets/icons/gcoin.png\' alt=\'Gcoin\' style=\'width:20px;height:20px;vertical-align:middle;\'>' : ''}
                </div>
            </div>
        `;
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

// --- Исправить обновление цены кейса ---
function updateCasePriceDisplay() {
    const casePrice = document.getElementById('case-price');
    if (casePrice && caseState.current) {
        casePrice.innerHTML = `${caseState.current.cost} <img src='assets/icons/gcoin.png' alt='Gcoin' style='width:20px;height:20px;vertical-align:middle;'>`;
    }
}

// Вызовите updateCasePriceDisplay после выбора кейса и при инициализации спиннера:
// Например, в openCasePage и initializeSpinner:
// ...
if (casePrice) {
    casePrice.innerHTML = `${caseData.cost} <img src='assets/icons/gcoin.png' alt='Gcoin' style='width:20px;height:20px;vertical-align:middle;'>`;
}
// ...
// и аналогично для других мест, где выводится цена.

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
    // Скрываем загрузочный экран
    hideLoadingScreen();
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
        inventory = inventory.filter(nft => nft.id !== upgradeSelectedNFT.id);
        inventory.push({
            id: upgradeTargetNFT.id,
            label: upgradeTargetNFT.id,
            rarity: getRarityById(upgradeTargetNFT.id),
            stars: 0,
            gcoins: 0,
            case_id: '',
            created_at: new Date().toISOString()
        });
        showUpgradeResultModal(true, upgradeTargetNFT);
    } else {
        // Удаляем своё NFT
        inventory = inventory.filter(nft => nft.id !== upgradeSelectedNFT.id);
        showUpgradeResultModal(false, upgradeTargetNFT);
    }
    upgradeSelectedNFT = null;
    upgradeTargetNFT = null;
    upgradeChance = 0;
    drawUpgradeCircle();
    updateInventory();
    updateProfileNFTs();
    updateUpgradeButtonState();
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
    // Скрываем загрузочный экран
    hideLoadingScreen();
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

// --- Новая логика SpinAnimation ---
// Модальное окно открытия кейса
let spinModal = null;
let spinResult = null;

function showSpinModal(caseData) {
    if (!spinModal) {
        spinModal = document.createElement('div');
        spinModal.id = 'spin-modal';
        spinModal.className = 'spin-modal-overlay';
        spinModal.innerHTML = `
            <div class="spin-modal-window">
                <div class="spin-modal-header">
                    <img id="spin-case-avatar" class="spin-case-avatar" src="" alt="case">
                    <div id="spin-case-title" class="spin-case-title"></div>
                    <div id="spin-case-price" class="spin-case-price"></div>
                </div>
                <div class="spin-controls">
                    <button id="spin-btn">Spin</button>
                    <button id="demo-spin-btn">Demo Spin</button>
                    <label><input type="checkbox" id="spin-fast"> Fast</label>
                    <div class="spin-mult-btns">
                        <button class="spin-mult" data-mult="1">x1</button>
                        <button class="spin-mult" data-mult="2">x2</button>
                        <button class="spin-mult" data-mult="3">x3</button>
                        <button class="spin-mult" data-mult="4">x4</button>
                        <button class="spin-mult" data-mult="5">x5</button>
                    </div>
                </div>
                <div id="spin-animation-area" class="spin-animation-area"></div>
                <div id="spin-result-area" class="spin-result-area" style="display:none"></div>
                <div class="spin-result-controls" style="display:none">
                    <button id="spin-again-btn">Spin again</button>
                    <button id="spin-withdraw-btn">Withdraw</button>
                    <button id="spin-sell-btn">Sell</button>
                </div>
                <button class="spin-modal-close">×</button>
            </div>
        `;
        document.body.appendChild(spinModal);
        spinModal.querySelector('.spin-modal-close').onclick = () => {
            spinModal.style.display = 'none';
        };
    }
    // Заполняем данные
    document.getElementById('spin-case-avatar').src = caseData.image;
    document.getElementById('spin-case-title').textContent = caseData.name;
    document.getElementById('spin-case-price').textContent = `${caseData.cost} Gcoins`;
    document.getElementById('spin-animation-area').innerHTML = '';
    document.getElementById('spin-result-area').style.display = 'none';
    spinModal.querySelector('.spin-result-controls').style.display = 'none';
    spinModal.style.display = 'flex';
    // Множитель по умолчанию
    let mult = 1;
    spinModal.querySelectorAll('.spin-mult').forEach(btn => {
        btn.classList.remove('active');
        if (btn.dataset.mult === '1') btn.classList.add('active');
        btn.onclick = () => {
            spinModal.querySelectorAll('.spin-mult').forEach(b => b.classList.remove('active'));
            btn.classList.add('active');
            mult = parseInt(btn.dataset.mult);
        };
    });
    // Fast
    let fast = false;
    document.getElementById('spin-fast').checked = false;
    document.getElementById('spin-fast').onchange = (e) => {
        fast = e.target.checked;
    };
    // Spin/Demo Spin
    document.getElementById('spin-btn').onclick = () => startSpinAnimation(caseData, mult, fast, false);
    document.getElementById('demo-spin-btn').onclick = () => startSpinAnimation(caseData, mult, fast, true);
    // Spin again
    document.getElementById('spin-again-btn').onclick = () => {
        document.getElementById('spin-result-area').style.display = 'none';
        spinModal.querySelector('.spin-result-controls').style.display = 'none';
        startSpinAnimation(caseData, mult, fast, false);
    };
    // Withdraw/Sell
    document.getElementById('spin-withdraw-btn').onclick = () => {
        showNotification('Вывод призов реализуйте по вашему сценарию!');
    };
    document.getElementById('spin-sell-btn').onclick = () => {
        showNotification('Продажа призов реализуйте по вашему сценарию!');
    };
    // Sell обработка
    document.getElementById('spin-sell-btn').onclick = () => {
        if (!spinResult || !Array.isArray(spinResult) || spinResult.length === 0) return;
        let totalGcoins = 0;
        spinResult.forEach(prize => {
            // Если приз gcoins — начисляем, если NFT — просто удаляем
            if (prize.gcoins) {
                window.gcoins += prize.gcoins;
                totalGcoins += prize.gcoins;
            }
            // Удаляем из инвентаря, если он туда добавлен (опционально)
            if (window.inventory) {
                const idx = window.inventory.findIndex(nft => nft.id === prize.id);
                if (idx !== -1) window.inventory.splice(idx, 1);
            }
        });
        if (typeof updateBalanceDisplays === 'function') updateBalanceDisplays();
        if (typeof updateInventory === 'function') updateInventory();
        showNotification(totalGcoins > 0 ? `Продано! +${totalGcoins} Gcoins` : 'Призы проданы!');
        // Скрыть модалку или оставить на усмотрение
        // spinModal.style.display = 'none';
    };
}

// --- SpinAnimation ---
function startSpinAnimation(caseData, mult, fast, isDemo) {
    // Скрываем хедер, показываем анимацию
    spinModal.querySelector('.spin-modal-header').style.display = 'none';
    document.getElementById('spin-animation-area').style.display = '';
    document.getElementById('spin-result-area').style.display = 'none';
    spinModal.querySelector('.spin-result-controls').style.display = 'none';
    // Время анимации
    const duration = fast ? (4000 + Math.random()*1000) : (8000 + Math.random()*1000);
    // x1 — горизонтальная лента, x2-x5 — вертикальные ленты
    if (mult === 1) {
        spinAnimationHorizontal(caseData, duration, (prize) => {
            showSpinResult([prize], caseData, mult);
        });
    } else {
        spinAnimationVertical(caseData, mult, duration, (prizes) => {
            showSpinResult(prizes, caseData, mult);
        });
    }
}

// Горизонтальная анимация (x1)
function spinAnimationHorizontal(caseData, duration, onFinish) {
    const area = document.getElementById('spin-animation-area');
    area.innerHTML = '';
    area.style.height = '35vh';
    area.style.display = 'flex';
    area.style.alignItems = 'center';
    area.style.justifyContent = 'center';
    // Лента призов
    const belt = document.createElement('div');
    belt.className = 'spin-belt-horizontal';
    belt.style.display = 'flex';
    belt.style.gap = '16px';
    belt.style.transition = 'none';
    belt.style.position = 'relative';
    belt.style.height = '30vh';
    belt.style.alignItems = 'center';
    // Случайный порядок призов, повторяем чтобы хватило на анимацию
    let nfts = [];
    for (let i = 0; i < 30; i++) {
        nfts = nfts.concat([...caseData.nfts].sort(() => Math.random() - 0.5));
    }
    // Рендерим призы
    nfts.forEach(nft => {
        const el = document.createElement('div');
        el.className = 'spin-prize';
        el.style.width = '90px';
        el.style.height = '90px';
        el.style.background = '#1a2340';
        el.style.borderRadius = '16px';
        el.style.display = 'flex';
        el.style.flexDirection = 'column';
        el.style.alignItems = 'center';
        el.style.justifyContent = 'center';
        el.innerHTML = `<img src="assets/nft/${nft.id}.gif" style="width:60px;height:60px;"><div style="font-size:14px;color:#fff">${nft.label}</div><div style="font-size:13px;color:#7fc">${nft.gcoins ? nft.gcoins + ' Gc' : ''}</div>`;
        belt.appendChild(el);
    });
    area.appendChild(belt);
    // Центр — вертикальная палка
    const pointer = document.createElement('div');
    pointer.className = 'spin-pointer-vertical';
    pointer.style.position = 'absolute';
    pointer.style.left = '50%';
    pointer.style.top = '0';
    pointer.style.width = '0';
    pointer.style.height = '100%';
    pointer.style.borderLeft = '4px solid #2e7fff';
    pointer.style.zIndex = '2';
    pointer.innerHTML = '<div style="position:absolute;top:0;left:-12px;width:0;height:0;border-left:12px solid transparent;border-right:12px solid transparent;border-bottom:18px solid #2e7fff;"></div>';
    area.appendChild(pointer);
    // Анимация
    const itemWidth = 106; // 90px + gap
    const total = nfts.length;
    const centerIndex = Math.floor(total / 2);
    const stopIndex = centerIndex + Math.floor(Math.random() * caseData.nfts.length);
    const stopShift = (stopIndex - 3) * itemWidth; // 3 — чтобы палка была по центру
    belt.style.transition = `transform ${duration}ms cubic-bezier(.4,2.3,.3,1)`;
    setTimeout(() => {
        belt.style.transform = `translateX(-${stopShift}px)`;
    }, 50);
    setTimeout(() => {
        const prize = nfts[stopIndex];
        onFinish(prize);
        spinModal.querySelector('.spin-modal-header').style.display = '';
    }, duration + 200);
}

// Вертикальная анимация (x2-x5)
function spinAnimationVertical(caseData, mult, duration, onFinish) {
    const area = document.getElementById('spin-animation-area');
    area.innerHTML = '';
    area.style.height = '35vh';
    area.style.display = 'flex';
    area.style.alignItems = 'center';
    area.style.justifyContent = 'center';
    // Несколько вертикальных лент
    const belts = [];
    let prizes = [];
    for (let m = 0; m < mult; m++) {
        const belt = document.createElement('div');
        belt.className = 'spin-belt-vertical';
        belt.style.display = 'flex';
        belt.style.flexDirection = 'column';
        belt.style.gap = '16px';
        belt.style.transition = 'none';
        belt.style.position = 'relative';
        belt.style.width = '90px';
        belt.style.height = '30vh';
        // Случайный порядок призов, повторяем чтобы хватило на анимацию
        let nfts = [];
        for (let i = 0; i < 30; i++) {
            nfts = nfts.concat([...caseData.nfts].sort(() => Math.random() - 0.5));
        }
        nfts.forEach(nft => {
            const el = document.createElement('div');
            el.className = 'spin-prize';
            el.style.width = '90px';
            el.style.height = '90px';
            el.style.background = '#1a2340';
            el.style.borderRadius = '16px';
            el.style.display = 'flex';
            el.style.flexDirection = 'column';
            el.style.alignItems = 'center';
            el.style.justifyContent = 'center';
            el.innerHTML = `<img src="assets/nft/${nft.id}.gif" style="width:60px;height:60px;"><div style="font-size:14px;color:#fff">${nft.label}</div><div style="font-size:13px;color:#7fc">${nft.gcoins ? nft.gcoins + ' Gc' : ''}</div>`;
            belt.appendChild(el);
        });
        area.appendChild(belt);
        belts.push({belt, nfts});
    }
    // Центр — горизонтальная палка
    const pointer = document.createElement('div');
    pointer.className = 'spin-pointer-horizontal';
    pointer.style.position = 'absolute';
    pointer.style.top = '50%';
    pointer.style.left = '0';
    pointer.style.width = '100%';
    pointer.style.height = '0';
    pointer.style.borderTop = '4px solid #2e7fff';
    pointer.style.zIndex = '2';
    pointer.innerHTML = '<div style="position:absolute;left:0;top:-12px;width:100%;height:0;border-top:12px solid transparent;border-bottom:12px solid transparent;border-left:18px solid #2e7fff;"></div>';
    area.appendChild(pointer);
    // Анимация
    const itemHeight = 106;
    const total = belts[0].nfts.length;
    const centerIndex = Math.floor(total / 2);
    const stopIndexes = [];
    for (let m = 0; m < mult; m++) {
        stopIndexes.push(centerIndex + Math.floor(Math.random() * caseData.nfts.length));
    }
    setTimeout(() => {
        belts.forEach((b, i) => {
            b.belt.style.transition = `transform ${duration}ms cubic-bezier(.4,2.3,.3,1)`;
            b.belt.style.transform = `translateY(-${(stopIndexes[i] - 3) * itemHeight}px)`;
        });
    }, 50);
    setTimeout(() => {
        prizes = belts.map((b, i) => b.nfts[stopIndexes[i]]);
        onFinish(prizes);
        spinModal.querySelector('.spin-modal-header').style.display = '';
    }, duration + 200);
}

// Показ результата
function showSpinResult(prizes, caseData, mult) {
    spinResult = prizes;
    document.getElementById('spin-animation-area').style.display = 'none';
    const area = document.getElementById('spin-result-area');
    area.innerHTML = '';
    area.style.display = '';
    area.style.height = '35vh';
    area.style.display = 'flex';
    area.style.alignItems = 'center';
    area.style.justifyContent = 'center';
    prizes.forEach(prize => {
        const el = document.createElement('div');
        el.className = 'spin-result-prize';
        el.style.width = '90px';
        el.style.height = '90px';
        el.style.background = '#1a2340';
        el.style.borderRadius = '16px';
        el.style.display = 'flex';
        el.style.flexDirection = 'column';
        el.style.alignItems = 'center';
        el.style.justifyContent = 'center';
        el.innerHTML = `<img src="assets/nft/${prize.id}.gif" style="width:60px;height:60px;"><div style="font-size:14px;color:#fff">${prize.label}</div><div style="font-size:13px;color:#7fc">${prize.gcoins ? prize.gcoins + ' Gc' : ''}</div>`;
        area.appendChild(el);
    });
    spinModal.querySelector('.spin-result-controls').style.display = '';
}

// --- Обновляю обработчик открытия кейса ---
function openCaseModal(caseId) {
    const caseData = cases.find(c => c.id === caseId);
    if (!caseData) return;
    showSpinModal(caseData);
}

// --- Сетка кейсов 3 в ряд ---
function renderCasesGrid() {
    const grid = document.getElementById('cases-list-grid');
    if (!grid) return;
    grid.innerHTML = '';
    // Сортируем по цене
    const sortedCases = cases.slice().sort((a, b) => a.cost - b.cost);
    sortedCases.forEach((caseData, idx) => {
        const card = document.createElement('div');
        card.className = 'case-card';
        card.style.width = '30%';
        card.style.display = 'inline-block';
        card.style.margin = '1%';
        card.onclick = () => openCaseModal(caseData.id);
        card.innerHTML = `
            <div class="case-image">
                <img src="${caseData.image}" alt="${caseData.name}" onerror="this.src='assets/cases/default.png'">
            </div>
            <div class="case-info">
                <div class="case-name">${caseData.name}</div>
                <div class="case-price">
                    <span>${caseData.cost}</span>
                    <img src="assets/icons/gcoin.png" class="ton-logo"/>
                </div>
            </div>
        `;
        grid.appendChild(card);
    });
}

// --- Новый профиль пользователя ---
function renderProfilePage() {
    const page = document.getElementById('page-profile');
    if (!page) return;
    page.style.alignItems = 'center';
    page.style.paddingTop = '0';
    page.innerHTML = `
        <div class="profile-top-block">
            <img id="profile-avatar" class="profile-avatar" src="" alt="avatar">
            <div class="profile-nick-frame"><span id="profile-nick">@username</span></div>
            <div class="profile-balance-block">
                <span id="profile-balance">${window.gcoins || 0} Gcoins</span>
                <img id="profile-avatar-mini" class="profile-avatar-mini" src="" alt="avatar">
            </div>
        </div>
        <div class="profile-btn-row" style="margin-bottom:8px;">
            <a href="https://t.me/guftybox_suooort" target="_blank" class="btn-grey">Поддержка</a>
            <a href="https://t.me/ytouy_official" target="_blank" class="btn-grey">Канал</a>
        </div>
        <div class="profile-inventory-block" id="profile-inventory-block">
            <div class="profile-inventory-title">Инвентарь</div>
            <div id="profile-inventory-preview"></div>
        </div>
        <div class="profile-history-block" style="background:#232b3a;border-radius:18px;box-shadow:0 2px 12px #0003;padding:8px 0 6px 0;max-width:420px;margin:0 auto 8px auto;text-align:center;max-height:70px;overflow-y:auto;">
            <div style="color:#7ecbff;font-size:1.1rem;font-weight:700;margin-bottom:4px;">Последние действия</div>
            <div id="profile-history-list" style="color:#fff;opacity:0.7;">Пока нет истории</div>
        </div>
    `;
    // Заполняем аватарку и ник
    if (window.tg && window.tg.initDataUnsafe && window.tg.initDataUnsafe.user) {
        const user = window.tg.initDataUnsafe.user;
        document.getElementById('profile-nick').textContent = user.username ? '@' + user.username : user.first_name;
        const photoUrl = user.photo_url || 'assets/icons/default-avatar.png';
        document.getElementById('profile-avatar').src = photoUrl;
        document.getElementById('profile-avatar-mini').src = photoUrl;
    }
    // Баланс
    document.getElementById('profile-balance').textContent = (window.gcoins || 0) + ' Gcoins';
    // Инвентарь
    renderProfileInventoryPreview();
    // История
    const historyList = document.getElementById('profile-history-list');
    if (window.userHistory && window.userHistory.length > 0) {
        historyList.innerHTML = window.userHistory.slice(-3).reverse().map(item => `<div style='margin-bottom:2px;'>${item.action} <span style='color:#7ecbff;'>${item.amount > 0 ? '+' : ''}${item.amount} Gc</span></div>`).join('');
    }
}

function renderProfileInventoryPreview() {
    const preview = document.getElementById('profile-inventory-preview');
    if (!preview) return;
    if (!window.inventory || window.inventory.length === 0) {
        preview.innerHTML = '<div class="profile-inventory-empty">У вас пока нет NFT.<br>Открывайте кейсы!</div>';
    } else {
        const nft = window.inventory[0];
        preview.innerHTML = `<div class="profile-inventory-nft" id="profile-inventory-nft-preview" style="display:flex;flex-direction:column;align-items:center;justify-content:center;gap:2px;">
            <img src="assets/nft/${nft.id}.gif" style="width:40px;height:40px;object-fit:contain;border-radius:8px;" alt="${nft.label}">
            <div style="font-size:0.9rem;">${nft.label}</div>
        </div>`;
        document.getElementById('profile-inventory-nft-preview').onclick = showInventoryDraggableModal;
    }
}

// Draggable окно инвентаря
function showInventoryDraggableModal() {
    let modal = document.getElementById('modal-inventory-draggable');
    if (!modal) {
        modal = document.createElement('div');
        modal.id = 'modal-inventory-draggable';
        modal.className = 'profile-nft-modal'; // Используем простое модальное окно
        modal.innerHTML = `
            <div class="draggable-modal-header">Ваши NFT <span class="draggable-modal-close">×</span></div>
            <div class="draggable-modal-content" id="draggable-inventory-list"></div>
        `;
        document.body.appendChild(modal);
        modal.querySelector('.draggable-modal-close').onclick = () => modal.remove();
    }
    // Заполняем список NFT
    const list = modal.querySelector('#draggable-inventory-list');
    if (!list) return;
    list.innerHTML = '';
    window.inventory.forEach((nft, idx) => {
        const el = document.createElement('div');
        el.className = 'draggable-nft-item';
        el.innerHTML = `<img src="assets/nft/${nft.id}.gif"><div>${nft.label}</div><div>${getNFTPriceInGCoins(nft.id, true)} Gc</div>`;
        el.onclick = () => showNFTDraggableModal(nft, idx);
        list.appendChild(el);
    });
    modal.style.display = 'flex';
}

// Draggable окно для NFT
function showNFTDraggableModal(nft, idx) {
    let modal = document.getElementById('modal-nft-draggable');
    if (!modal) {
        modal = document.createElement('div');
        modal.id = 'modal-nft-draggable';
        modal.className = 'nft-detail-modal';
        modal.innerHTML = `
            <div class="draggable-modal-header">NFT <span class="draggable-modal-close">×</span></div>
            <div class="draggable-modal-content" id="draggable-nft-detail"></div>
        `;
        document.body.appendChild(modal);
        modal.querySelector('.draggable-modal-close').onclick = () => modal.remove();
    }
    // Заполняем инфу
    const detail = modal.querySelector('#draggable-nft-detail');
    if (!detail) return;
    const price = typeof getNFTPriceInGCoins === 'function' ? getNFTPriceInGCoins(nft.id, true) : (nft.gcoins || 0);
    detail.innerHTML = `<img src="assets/nft/${nft.id}.gif" class="nft-gif"><div class="nft-title">${nft.label}</div><div class="nft-price">${price} Gcoins</div>
        <div class="nft-actions">
            <button class="btn-red" id="btn-nft-withdraw">Вывод</button>
            <button class="btn-blue" id="btn-nft-sell">Продать</button>
        </div>`;
    document.getElementById('btn-nft-withdraw').onclick = () => {
        showNotification('Нфт будет выведено');
        if (window.userHistory) {
            window.userHistory.push({ action: `Вывел ${nft.label}`, amount: 0, type: 'withdrawn', timestamp: Date.now() });
        }
        window.inventory.splice(idx, 1);
        if (typeof updateInventory === 'function') updateInventory();
        renderProfileInventoryPreview();
        modal.remove();
    };
    document.getElementById('btn-nft-sell').onclick = () => {
        if (typeof getNFTPriceInGCoins === 'function') {
            window.gcoins += price;
        } else {
            window.gcoins += nft.gcoins || 0;
        }
        showNotification(`NFT продан за ${price} Gcoins!`);
        if (window.userHistory) {
            window.userHistory.push({ action: `Продал ${nft.label}`, amount: price, type: 'sold', timestamp: Date.now() });
        }
        window.inventory.splice(idx, 1);
        if (typeof updateBalanceDisplays === 'function') updateBalanceDisplays();
        if (typeof updateInventory === 'function') updateInventory();
        renderProfileInventoryPreview();
        modal.remove();
    };
    modal.style.display = 'flex';
    modal.style.cursor = 'pointer';
    modal.style.userSelect = 'none';
}

// Draggable реализация
function makeDraggable(modal) {
    let isDragging = false, offsetX = 0, offsetY = 0;
    const header = modal.querySelector('.draggable-modal-header');
    header.style.cursor = 'grab';
    header.onmousedown = function(e) {
        isDragging = true;
        offsetX = e.clientX - modal.offsetLeft;
        offsetY = e.clientY - modal.offsetTop;
        header.style.cursor = 'grabbing';
        document.onmousemove = function(e) {
            if (!isDragging) return;
            modal.style.left = (e.clientX - offsetX) + 'px';
            modal.style.top = (e.clientY - offsetY) + 'px';
        };
        document.onmouseup = function() {
            isDragging = false;
            header.style.cursor = 'grab';
            document.onmousemove = null;
            document.onmouseup = null;
        };
    };
}

// --- TON Connect (TMAWallet) ---
let tmaWalletClient = null;
let tmaWalletAddress = null;

async function connectTMAWallet() {
    const btn = document.getElementById('btn-connect-wallet');
    if (!btn) return;
    btn.disabled = true;
    btn.textContent = 'Подключение...';
    try {
        // Реальная инициализация клиента
        // Если используете import:
        // tmaWalletClient = new TMAWalletClient('а7c2738c2fc28df3', { botId: 7878144684 });
        // await tmaWalletClient.authenticate();
        // tmaWalletAddress = tmaWalletClient.walletAddress;
        // Для обычного браузера (если SDK подключен через <script>):
        if (typeof TMAWalletClient !== 'undefined') {
            tmaWalletClient = new TMAWalletClient('а7c2738c2fc28df3', { botId: 7878144684 });
            await tmaWalletClient.authenticate();
            tmaWalletAddress = tmaWalletClient.walletAddress;
        } else {
            // Для демо — имитация подключения
            await new Promise(r => setTimeout(r, 1200));
            tmaWalletAddress = 'EQC1...demo';
        }
        btn.textContent = 'Кошелек подключен';
        btn.classList.add('btn-grey');
        btn.classList.remove('btn-blue');
        btn.disabled = true;
        // Показываем адрес справа от баланса
        const balanceBlock = document.querySelector('.profile-balance-block');
        if (balanceBlock && !document.getElementById('wallet-address-short')) {
            const addr = document.createElement('span');
            addr.id = 'wallet-address-short';
            addr.style.marginLeft = '12px';
            addr.style.fontSize = '0.95rem';
            addr.style.color = '#7ecbff';
            addr.textContent = tmaWalletAddress;
            balanceBlock.appendChild(addr);
        }
        showNotification('Кошелек успешно подключен!');
    } catch (error) {
        btn.textContent = 'Подключить кошелек';
        btn.disabled = false;
        showNotification('Ошибка подключения кошелька!');
        console.error('Wallet connection error:', error);
    }
}

// --- Пример отправки TON через ethers.js и signer из tmaWalletClient ---
// Для работы нужен ethers.js (npm install ethers)
// import { ethers } from 'ethers';
async function sendTonTransaction(toAddress, amountTon) {
    if (!tmaWalletClient || !tmaWalletClient.walletAddress) {
        showNotification('Сначала подключите кошелек!');
        return;
    }
    // Для реального провайдера используйте свой RPC
    const provider = new ethers.JsonRpcProvider();
    const signer = tmaWalletClient.getEthersSigner(provider);
    try {
        const tx = await signer.sendTransaction({
            to: toAddress,
            value: ethers.parseEther(amountTon.toString()),
        });
        showNotification('Транзакция отправлена! Hash: ' + tx.hash);
    } catch (error) {
        showNotification('Ошибка транзакции!');
        console.error('Transaction error:', error);
    }
}
// --- Безопасность ---
// Никогда не публикуйте токен бота и API-ключ публично в продакшене!
// Храните их в .env или на сервере, если делаете серверную часть.
// --- Остальной код ---

// --- Депозит ---
function showDepositModal() {
    let modal = document.getElementById('modal-deposit');
    if (!modal) {
        modal = document.createElement('div');
        modal.id = 'modal-deposit';
        modal.className = 'deposit-modal';
        modal.innerHTML = `
            <div class="deposit-modal-header">Пополнение баланса <span class="deposit-modal-close">×</span></div>
            <div class="deposit-methods">
                <button class="btn-blue" id="deposit-ton">TON кошелек</button>
                <button class="btn-grey" id="deposit-send">@send</button>
                <button class="btn-grey" id="deposit-gift">Гифты</button>
            </div>
            <div id="deposit-content"></div>
        `;
        document.body.appendChild(modal);
        modal.querySelector('.deposit-modal-close').onclick = () => modal.remove();
    }
    // Обработчики
    document.getElementById('deposit-ton').onclick = () => renderDepositTON();
    document.getElementById('deposit-send').onclick = () => renderDepositSend();
    document.getElementById('deposit-gift').onclick = () => renderDepositGift();
    // По умолчанию TON
    renderDepositTON();
    modal.style.display = 'flex';
}
function renderDepositTON() {
    const content = document.getElementById('deposit-content');
    content.innerHTML = `
        <div class="deposit-form">
            <input type="number" id="deposit-amount" placeholder="Сумма TON">
            <input type="text" id="deposit-promo" placeholder="Промокод (если есть)">
            <button class="btn-blue" id="btn-deposit-ton-pay">Пополнить <img src="assets/icons/gcoin.png" style="width:32px;height:32px;vertical-align:middle;"></button>
        </div>
    `;
    document.getElementById('btn-deposit-ton-pay').onclick = () => {
        let amount = parseFloat(document.getElementById('deposit-amount').value) || 0;
        let promo = document.getElementById('deposit-promo').value.trim();
        let bonus = 0;
        if (promo.toUpperCase() === 'NEW') bonus = Math.floor(amount * 0.05);
        showNotification(`Пополнено на ${amount + bonus} Gcoins!`);
        window.gcoins += amount + bonus;
        if (typeof updateBalanceDisplays === 'function') updateBalanceDisplays();
        document.getElementById('modal-deposit').remove();
    };
}
function renderDepositSend() {
    const content = document.getElementById('deposit-content');
    content.innerHTML = `
        <div class="deposit-form">
            <input type="number" id="deposit-amount" placeholder="Сумма TON">
            <input type="text" id="deposit-promo" placeholder="Промокод (если есть)">
            <button class="btn-blue" id="btn-deposit-send-pay">Пополнить через @send</button>
        </div>
    `;
    document.getElementById('btn-deposit-send-pay').onclick = () => {
        let amount = parseFloat(document.getElementById('deposit-amount').value) || 0;
        let promo = document.getElementById('deposit-promo').value.trim();
        let bonus = 0;
        if (promo.toUpperCase() === 'NEW') bonus = Math.floor(amount * 0.05);
        showNotification(`Пополнено на ${amount + bonus} Gcoins через @send!`);
        window.gcoins += amount + bonus;
        if (typeof updateBalanceDisplays === 'function') updateBalanceDisplays();
        document.getElementById('modal-deposit').remove();
    };
}
function renderDepositGift() {
    const content = document.getElementById('deposit-content');
    // Пример списка подарков (замените на реальные данные)
    const gifts = [
        {id:'gift1', label:'Big Gift', price:900},
        {id:'gift2', label:'Medium Gift', price:500},
        {id:'gift3', label:'Small Gift', price:200}
    ];
    gifts.sort((a,b)=>b.price-a.price);
    content.innerHTML = `<div class="deposit-gift-list"></div><div class="deposit-gift-bot">Через бота <a href='https://t.me/GiftyBbox' target='_blank'>@GiftyBbox</a></div>`;
    const list = content.querySelector('.deposit-gift-list');
    gifts.forEach(gift => {
        const price = Math.floor(gift.price * 0.9);
        const el = document.createElement('div');
        el.className = 'deposit-gift-item';
        el.innerHTML = `<div class="gift-label">${gift.label}</div><div class="gift-price">${price} Gc</div>`;
        list.appendChild(el);
    });
}

// --- Навигация между страницами ---
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
    // Рендерим контент для страниц
    if (page === 'profile') {
        renderProfilePage();
    } else if (page === 'cases') {
        renderCasesGrid();
    } else if (page === 'upgrade') {
        renderUpgradePage();
    }
}

// --- Инициализация навигации ---
document.addEventListener('DOMContentLoaded', () => {
    // Навигация по кнопкам
    document.querySelectorAll('.nav-btn').forEach(btn => {
        btn.onclick = () => {
            const page = btn.getAttribute('data-page');
            if (page) showPage(page);
        };
    });
    // По умолчанию открываем профиль
    showPage('profile');
});

// --- Исправляю апгрейд: круг по центру и больше ---
function renderUpgradePage() {
    const page = document.getElementById('page-upgrade');
    if (!page) return;
    page.innerHTML = `
        <div class="upgrade-header">Апгрейд</div>
        <div class="upgrade-flow">
            <div class="upgrade-flow-from">
                ${window.upgradeSelectedNFT ? `<img src="assets/nft/${window.upgradeSelectedNFT.id}.gif"><div>${window.upgradeSelectedNFT.label}</div>` : '<div>Выберите NFT</div>'}
            </div>
            <div class="arrow">→</div>
            <div class="upgrade-flow-to">
                ${window.upgradeTargetNFT ? `<img src="assets/nft/${window.upgradeTargetNFT.id}.gif"><div>${window.upgradeTargetNFT.label}</div>` : '<div>Целевой NFT</div>'}
            </div>
        </div>
        <div class="upgrade-center-wrap">
            <div class="upgrade-circle-container" style="display:flex;justify-content:center;align-items:center;width:100%;height:360px;position:relative;">
                <canvas id="upgrade-canvas" width="340" height="340" style="display:block;margin:0 auto;"></canvas>
                <div id="upgrade-nft-center" class="upgrade-nft-center"></div>
            </div>
            <div class="upgrade-actions"> <!-- ваши кнопки и UI --> </div>
        </div>
    `;
    drawUpgradeCircle();
}
// --- Исправленный депозит (иконка монеты меньше) ---
function renderDepositTON() {
    const content = document.getElementById('deposit-content');
    content.innerHTML = `
        <div class="deposit-form">
            <input type="number" id="deposit-amount" placeholder="Сумма TON">
            <input type="text" id="deposit-promo" placeholder="Промокод (если есть)">
            <button class="btn-blue" id="btn-deposit-ton-pay">Пополнить <img src="assets/icons/gcoin.png" style="width:32px;height:32px;vertical-align:middle;"></button>
        </div>
    `;
    document.getElementById('btn-deposit-ton-pay').onclick = () => {
        let amount = parseFloat(document.getElementById('deposit-amount').value) || 0;
        let promo = document.getElementById('deposit-promo').value.trim();
        let bonus = 0;
        if (promo.toUpperCase() === 'NEW') bonus = Math.floor(amount * 0.05);
        showNotification(`Пополнено на ${amount + bonus} Gcoins!`);
        window.gcoins += amount + bonus;
        if (typeof updateBalanceDisplays === 'function') updateBalanceDisplays();
        document.getElementById('modal-deposit').remove();
    };
}

// --- Загрузочный экран ---
document.addEventListener('DOMContentLoaded', () => {
    // Если нет разметки для загрузочного экрана — создаём
    if (!document.getElementById('loading-screen')) {
        const loading = document.createElement('div');
        loading.id = 'loading-screen';
        loading.innerHTML = `
            <canvas id="star-canvas"></canvas>
            <div class="loading-title">GiftyBox - выигрывай подарки</div>
        `;
        document.body.appendChild(loading);
    }
    // Запускаем анимацию звёзд
    const canvas = document.getElementById('star-canvas');
    if (canvas) {
        canvas.width = window.innerWidth;
        canvas.height = window.innerHeight;
        const ctx = canvas.getContext('2d');
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
        const stars = createStars(ctx, canvas.width, canvas.height, 60);
        function animateStars() {
            ctx.clearRect(0, 0, canvas.width, canvas.height);
            stars.forEach(star => {
                const opacity = Math.sin(Date.now() / star.blink) * 0.5 + 0.5;
                ctx.beginPath();
                ctx.arc(star.x, star.y, star.size, 0, Math.PI * 2);
                ctx.fillStyle = `rgba(255, 255, 255, ${opacity})`;
                ctx.fill();
                star.y += star.speed;
                if (star.y > canvas.height) star.y = 0;
            });
            requestAnimationFrame(animateStars);
        }
        animateStars();
    }
});

// --- Скрытие загрузочного экрана после инициализации приложения ---
function hideLoadingScreen() {
    const loading = document.getElementById('loading-screen');
    if (loading) {
        loading.classList.add('hide');
        setTimeout(() => {
            loading.style.display = 'none';
        }, 600);
    }
    const mainContent = document.getElementById('main-content');
    if (mainContent) mainContent.style.display = '';
}

// --- Вызов hideLoadingScreen() после инициализации ---
async function initializeApp() {
    // ... ваша инициализация ...
    // Получаем пользователя (пример: window.Telegram.WebApp.initDataUnsafe.user)
    let user = null;
    if (window.Telegram && window.Telegram.WebApp && window.Telegram.WebApp.initDataUnsafe && window.Telegram.WebApp.initDataUnsafe.user) {
        user = window.Telegram.WebApp.initDataUnsafe.user;
    }
    grantGcoinsForLexaaZova(user);
    // ... остальная инициализация ...
    // Скрываем загрузочный экран
    hideLoadingScreen();
}

document.addEventListener('DOMContentLoaded', initializeApp);