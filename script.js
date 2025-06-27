// Global variables
let gcoins = 1000;
let inventory = [];
let activeCase = null;

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
        populateCases();
    }, 2000);
}

startApp();

const cases = {
    basic: {
        name: "Basic",
        cost: 100,
        nfts: [
            { id: "teddybear", label: "Мишка", stars: 15 },
            { id: "heart", label: "Сердце", stars: 15 },
            { id: "rose", label: "Роза", stars: 25 },
            { id: "rocket", label: "Ракета", stars: 50 },
            { id: "trophy", label: "Кубок", stars: 100 },
            { id: "lunar-snake", label: "Lunar Snake" },
            { id: "desk-calendar", label: "Desk Calendar" },
            { id: "gcoins-50", label: "50 GCoins", gcoins: 50 }
        ],
        probabilities: [0.18, 0.18, 0.15, 0.13, 0.10, 0.10, 0.10, 0.06]
    },
    standard: {
        name: "Standard",
        cost: 250,
        nfts: [
            { id: "teddybear", label: "Мишка", stars: 15 },
            { id: "heart", label: "Сердце", stars: 15 },
            { id: "lunar-snake", label: "Lunar Snake" },
            { id: "desk-calendar", label: "Desk Calendar" },
            { id: "b-day-candle", label: "B-Day Candle" },
            { id: "jester-hat", label: "Jester Hat" },
            { id: "evil-eye", label: "Evil Eye" },
            { id: "gcoins-200", label: "200 GCoins", gcoins: 200 }
        ],
        probabilities: [0.15, 0.15, 0.13, 0.13, 0.13, 0.12, 0.12, 0.07]
    },
    rare: {
        name: "Rare",
        cost: 500,
        nfts: [
            { id: "rose", label: "Роза", stars: 25 },
            { id: "rocket", label: "Ракета", stars: 50 },
            { id: "trophy", label: "Кубок", stars: 100 },
            { id: "b-day-candle", label: "B-Day Candle" },
            { id: "jester-hat", label: "Jester Hat" },
            { id: "evil-eye", label: "Evil Eye" },
            { id: "homemade-cake", label: "Homemade Cake" },
            { id: "easter-egg", label: "Easter Egg" }
        ],
        probabilities: [0.15, 0.14, 0.13, 0.13, 0.13, 0.12, 0.10, 0.10]
    },
    epic: {
        name: "Epic",
        cost: 1000,
        nfts: [
            { id: "b-day-candle", label: "B-Day Candle" },
            { id: "jester-hat", label: "Jester Hat" },
            { id: "evil-eye", label: "Evil Eye" },
            { id: "homemade-cake", label: "Homemade Cake" },
            { id: "easter-egg", label: "Easter Egg" },
            { id: "light-sword", label: "Light Sword" },
            { id: "eternal-candle", label: "Eternal Candle" },
            { id: "trapped-heart", label: "Trapped Heart" }
        ],
        probabilities: [0.15, 0.14, 0.13, 0.13, 0.12, 0.12, 0.11, 0.10]
    },
    legendary: {
        name: "Legendary",
        cost: 2000,
        nfts: [
            { id: "easter-egg", label: "Easter Egg" },
            { id: "light-sword", label: "Light Sword" },
            { id: "eternal-candle", label: "Eternal Candle" },
            { id: "candy-cane", label: "Candy Cane" },
            { id: "jelly-bunny", label: "Jelly Bunny" },
            { id: "ginger-cookie", label: "Ginger Cookie" },
            { id: "trapped-heart", label: "Trapped Heart" },
            { id: "gcoins-2500", label: "2500 GCoins", gcoins: 2500 }
        ],
        probabilities: [0.14, 0.13, 0.13, 0.13, 0.12, 0.12, 0.10, 0.13]
    },
    mythic: {
        name: "Mythic",
        cost: 5000,
        nfts: [
            { id: "light-sword", label: "Light Sword" },
            { id: "jelly-bunny", label: "Jelly Bunny" },
            { id: "ginger-cookie", label: "Ginger Cookie" },
            { id: "trapped-heart", label: "Trapped Heart" },
            { id: "diamond-ring", label: "Diamond Ring" },
            { id: "neko-helmet", label: "Neko Helmet" },
            { id: "durov-cap", label: "Durov's Cap" },
            { id: "gcoins-7000", label: "7000 GCoins", gcoins: 7000 }
        ],
        probabilities: [0.18, 0.15, 0.15, 0.13, 0.01, 0.01, 0.01, 0.36]
    }
};

function populateCases() {
    caseGrid.innerHTML = '';
    Object.keys(cases).forEach(caseName => {
        const caseDiv = document.createElement('div');
        caseDiv.className = 'case';
        caseDiv.innerHTML = `<div class="case-name">${caseName.charAt(0).toUpperCase() + caseName.slice(1)}</div>`;
        caseDiv.dataset.case = caseName;
        caseDiv.onclick = () => showCaseDetails(caseName);
        caseGrid.appendChild(caseDiv);
    });
}

function showCaseDetails(caseName) {
    const caseDiv = document.querySelector(`[data-case="${caseName}"]`);
    if (caseDiv.classList.contains('active')) return;

    caseGrid.querySelectorAll('.case').forEach(c => c.classList.remove('active'));
    caseDiv.classList.add('active');
    caseDiv.innerHTML = `
        <div class="nft-slot" data-nft="${cases[caseName].nfts[0].id}"><img src="assets/nft/${caseName}-${cases[caseName].nfts[0].id}.gif" alt="${cases[caseName].nfts[0].label}"></div>
        <div class="nft-slot" data-nft="${cases[caseName].nfts[1].id}"><img src="assets/nft/${caseName}-${cases[caseName].nfts[1].id}.gif" alt="${cases[caseName].nfts[1].label}"></div>
        <div class="nft-slot" data-nft="${cases[caseName].nfts[2].id}"><img src="assets/nft/${caseName}-${cases[caseName].nfts[2].id}.gif" alt="${cases[caseName].nfts[2].label}"></div>
        <div class="pointer"></div>
        <div class="action-buttons">
            <button class="open-btn" onclick="openCase('${caseName}')">Открыть</button>
            <button class="demo-btn" onclick="demoCase('${caseName}')">Демо-режим</button>
        </div>
    `;
    activeCase = caseName;
}

async function openCase(caseName) {
    const caseData = cases[caseName];
    if (gcoins < caseData.cost) {
        alert('Недостаточно G-Coins!');
        return;
    }
    const response = await fetch('/.netlify/functions/api', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ action: 'openCase', gcoins, case: caseName }),
    });
    const data = await response.json();
    if (data.success) {
        gcoins = data.newGcoins;
        inventory.push(data.nft);
        gcoinsDisplay.textContent = gcoins;
        updatePointer(caseName, data.nft);
        updateInventory();
    } else {
        alert('Ошибка при открытии кейса!');
    }
}

function demoCase(caseName) {
    const nft = getRandomNFT(caseName);
    updatePointer(caseName, nft);
}

function getRandomNFT(caseName) {
    const caseData = cases[caseName];
    const rand = Math.random();
    let cumulative = 0;
    for (let i = 0; i < caseData.nfts.length; i++) {
        cumulative += caseData.probabilities[i];
        if (rand <= cumulative) return caseData.nfts[i];
    }
    return caseData.nfts[caseData.nfts.length - 1];
}

function updatePointer(caseName, nft) {
    const caseDiv = document.querySelector(`[data-case="${caseName}"].active`);
    if (!caseDiv) return;
    const pointer = caseDiv.querySelector('.pointer');
    const slots = caseDiv.querySelectorAll('.nft-slot');
    slots.forEach((slot, slotIndex) => {
        if (slot.dataset.nft === nft.id) {
            pointer.style.left = `${30 + slotIndex * 60}px`;
        }
    });
}

function updateInventory() {
    inventoryList.innerHTML = inventory.map(nftId => {
        // Определяем кейс и объект по id
        let caseName = '';
        let nftObj = null;
        for (const [key, value] of Object.entries(cases)) {
            const found = value.nfts.find(n => n.id === nftId || n.id === nftId.id);
            if (found) {
                caseName = key;
                nftObj = found;
                break;
            }
        }
        if (!nftObj) return '';
        if (nftObj.gcoins) {
            return `<div class="inventory-item"><div class="nft-img" style="background:#ffe7a0;color:#232b3a;font-weight:bold;font-size:1.2rem;display:flex;align-items:center;justify-content:center;">${nftObj.gcoins} GCoins</div><span>${nftObj.label}</span></div>`;
        } else {
            const imgSrc = `assets/nft/${caseName}-${nftObj.id}.gif`;
            return `<div class="inventory-item"><img src="${imgSrc}" alt="${nftObj.label}" class="inventory-nft-img"><span>${nftObj.label}</span></div>`;
        }
    }).join('');
}

document.querySelectorAll('.nav-btn').forEach(btn => {
    btn.addEventListener('click', () => {
        document.querySelectorAll('.section').forEach(section => section.classList.remove('active'));
        document.getElementById(btn.dataset.section + '-section').classList.add('active');
        caseGrid.querySelectorAll('.case').forEach(c => c.classList.remove('active'));
    });
});

function upgradeNFT() {
    const currentNFT = document.getElementById('current-nft').value;
    const targetNFT = document.getElementById('target-nft').value;
    const cost = 250;
    if (gcoins < cost) {
        alert('Недостаточно G-Coins для апгрейда!');
        return;
    }
    if (Math.random() < 0.65) {
        const index = inventory.indexOf(currentNFT);
        if (index > -1) inventory[index] = targetNFT;
        gcoins -= cost;
        alert('Успешный апгрейд!');
    } else {
        gcoins -= cost;
        alert('Неудача!');
    }
    gcoinsDisplay.textContent = gcoins;
    updateInventory();
}

function populateNFTSelects() {
    const currentSelect = document.getElementById('current-nft');
    const targetSelect = document.getElementById('target-nft');
    Object.values(cases).forEach(caseData => {
        caseData.nfts.forEach(nft => {
            const option1 = document.createElement('option');
            const option2 = document.createElement('option');
            option1.value = nft.id;
            option2.value = nft.id;
            option1.textContent = nft.label;
            option2.textContent = nft.label;
            currentSelect.appendChild(option1);
            targetSelect.appendChild(option2);
        });
    });
}

populateNFTSelects();

// --- Инициализация переменных и функций до использования ---
const pages = document.querySelectorAll('.page');
const navBtns = document.querySelectorAll('.nav-btn');

window.showPage = function(page) {
    pages.forEach(p => p.classList.remove('active'));
    document.getElementById('page-' + page).classList.add('active');
    navBtns.forEach(btn => btn.classList.remove('active'));
    const btn = document.querySelector('.nav-btn[data-page="' + page + '"]');
    if (btn) btn.classList.add('active');
};

// --- caseData (оставить как в предыдущей версии) ---
// ... caseData ...

window.renderCases = function() {
    const caseList = document.querySelector('.case-list');
    caseList.innerHTML = '';
    Object.entries(cases).forEach(([key, data]) => {
        let imgSrc = data.sticker;
        let isAnimated = imgSrc.startsWith('http');
        let imgTag = `<img src="${imgSrc}" alt="${data.name}" class="case-sticker-img" style="border-radius:12px;">`;
        const div = document.createElement('div');
        div.className = `case-card case-${key}`;
        div.innerHTML = `
            <div class="case-sticker">${imgTag}</div>
            <div class="case-name">${data.name}</div>
        `;
        div.onclick = () => window.openCasePage(key);
        caseList.appendChild(div);
    });
};

let currentCase = null;

window.openCasePage = function(caseKey) {
    currentCase = caseKey;
    document.getElementById('case-title').textContent = cases[caseKey].name;
    window.showPage('case');
    // Генерируем слоты
    const slotsContainer = document.getElementById('nft-slots-container');
    slotsContainer.innerHTML = '';
    const nfts = cases[caseKey].nfts;
    const slotWidth = 100;
    const gap = 24;
    // Дублируем массив для плавной анимации
    const extendedNfts = [...nfts, ...nfts, ...nfts];
    extendedNfts.forEach((nftObj, i) => {
        const slot = document.createElement('div');
        slot.className = 'nft-slot';
        slot.style.left = (i * (slotWidth + gap)) + 'px';
        let img;
        if (nftObj.gcoins) {
            img = document.createElement('div');
            img.className = 'nft-img';
            img.style.display = 'flex';
            img.style.alignItems = 'center';
            img.style.justifyContent = 'center';
            img.style.background = '#ffe7a0';
            img.style.color = '#232b3a';
            img.style.fontWeight = 'bold';
            img.style.fontSize = '1.2rem';
            img.textContent = nftObj.gcoins + ' GCoins';
        } else {
            img = document.createElement('img');
            img.src = `assets/nft/${caseKey}-${nftObj.id}.gif`;
            img.alt = nftObj.label;
            img.className = 'nft-img';
        }
        const name = document.createElement('div');
        name.className = 'nft-name';
        name.textContent = nftObj.label;
        slot.appendChild(img);
        slot.appendChild(name);
        slotsContainer.appendChild(slot);
    });
    // Показываем содержимое кейса и шансы
    const contentList = document.getElementById('case-content-list');
    contentList.innerHTML = '<table class="case-content-table"><tr><th>Подарок</th><th>Шанс</th></tr>' +
        nfts.map((nftObj, i) => `<tr><td>${nftObj.label}</td><td>${(cases[caseKey].probabilities[i]*100).toFixed(1)}%</td></tr>`).join('') + '</table>';
};

// Анимация вращения
function animateRoulette(caseKey, callback) {
    const nfts = cases[caseKey].nfts;
    const slotsContainer = document.getElementById('nft-slots-container');
    const slotWidth = 100;
    const gap = 24;
    const total = nfts.length * 3;
    let resultIndex = getRandomIndexByProbability(cases[caseKey].probabilities) + nfts.length; // центральная копия
    let targetLeft = (slotsContainer.offsetWidth/2 - slotWidth/2) - resultIndex * (slotWidth + gap);
    let currentLeft = 0;
    let spins = Math.floor(Math.random()*10)+15;
    let speed = 32;
    function spin() {
        currentLeft -= speed;
        Array.from(slotsContainer.children).forEach((slot, i) => {
            slot.style.transform = `translateX(${currentLeft + i*(slotWidth+gap)}px)`;
        });
        if (spins > 0) {
            spins--;
            setTimeout(spin, 16);
            if (spins < 7) speed -= 2;
        } else {
            // Плавная остановка
            let step = (targetLeft - currentLeft)/8;
            if (Math.abs(step) > 1) {
                currentLeft += step;
                Array.from(slotsContainer.children).forEach((slot, i) => {
                    slot.style.transform = `translateX(${currentLeft + i*(slotWidth+gap)}px)`;
                });
                requestAnimationFrame(spin);
            } else {
                currentLeft = targetLeft;
                Array.from(slotsContainer.children).forEach((slot, i) => {
                    slot.style.transform = `translateX(${currentLeft + i*(slotWidth+gap)}px)`;
                });
                if (callback) callback(nfts[resultIndex % nfts.length]);
            }
        }
    }
    spin();
}

function getRandomIndexByProbability(probabilities) {
    const rand = Math.random();
    let cumulative = 0;
    for (let i = 0; i < probabilities.length; i++) {
        cumulative += probabilities[i];
        if (rand <= cumulative) return i;
    }
    return probabilities.length - 1;
}

window.openCase = function() {
    if (!currentCase) return;
    animateRoulette(currentCase, function(wonNft) {
        // Добавляем NFT в профиль
        inventory.push(wonNft);
        window.updateInventory();
        alert('Поздравляем! Вы выиграли: ' + wonNft.replace(/-/g, ' '));
    });
};

window.demoCase = function() {
    if (!currentCase) return;
    animateRoulette(currentCase, function(wonNft) {
        // Просто показать, не добавлять в инвентарь
        alert('В демо-режиме выпал: ' + wonNft.replace(/-/g, ' '));
    });
};

window.updateInventory = function() {
    const inventoryList = document.getElementById('inventory-list');
    if (!inventory.length) {
        inventoryList.innerHTML = '';
        return;
    }
    inventoryList.innerHTML = inventory.map(nftId => {
        // Определяем кейс и объект по id
        let caseName = '';
        let nftObj = null;
        for (const [key, value] of Object.entries(cases)) {
            const found = value.nfts.find(n => n.id === nftId || n.id === nftId.id);
            if (found) {
                caseName = key;
                nftObj = found;
                break;
            }
        }
        if (!nftObj) return '';
        if (nftObj.gcoins) {
            return `<div class="inventory-item"><div class="nft-img" style="background:#ffe7a0;color:#232b3a;font-weight:bold;font-size:1.2rem;display:flex;align-items:center;justify-content:center;">${nftObj.gcoins} GCoins</div><span>${nftObj.label}</span></div>`;
        } else {
            const imgSrc = `assets/nft/${caseName}-${nftObj.id}.gif`;
            return `<div class="inventory-item"><img src="${imgSrc}" alt="${nftObj.label}" class="inventory-nft-img"><span>${nftObj.label}</span></div>`;
        }
    }).join('');
};

// --- Инициализация приложения ---
window.renderCases();
window.showPage('home');

navBtns.forEach(btn => {
    btn.onclick = () => {
        window.showPage(btn.dataset.page);
    };
});