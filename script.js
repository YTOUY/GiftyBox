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

function createStars() {
    const stars = [];
    for (let i = 0; i < 50; i++) {
        stars.push({
            x: Math.random() * canvas.width,
            y: Math.random() * canvas.height,
            size: Math.random() * 2 + 1,
            speed: Math.random() * 0.5 + 0.1,
            blink: Math.random() * 1000
        });
    }
    return stars;
}

let stars = createStars();

function animateStars() {
    ctx.clearRect(0, 0, canvas.width, canvas.height);
    stars.forEach(star => {
        const opacity = Math.sin(Date.now() / star.blink) * 0.5 + 0.5;
        ctx.beginPath();
        ctx.arc(star.x, star.y, star.size, 0, Math.PI * 2);
        ctx.fillStyle = `rgba(255, 255, 255, ${opacity})`;
        ctx.fill();
        star.y -= star.speed;
        if (star.y < 0) star.y = canvas.height;
    });
    requestAnimationFrame(animateStars);
}

function startApp() {
    animateStars();
    setTimeout(() => {
        loadingScreen.style.display = 'none';
        mainContent.style.display = 'block';
        gcoinsDisplay.textContent = gcoins;
        referralLink.href = `https://t.me/share?url=https://GiftyBox.netlify.app&text=Присоединяйся к GiftyBox!`;
        populateCases();
    }, 3000);
}

startApp();

const cases = {
    'basic': { cost: 100, nfts: ['heart', 'teddybear', 'lunar-snake'], probabilities: [0.4, 0.4, 0.2] },
    'standard': { cost: 300, nfts: ['desk-calendar', 'b-day-candle', 'jester-hat'], probabilities: [0.4, 0.4, 0.2] },
    'rare': { cost: 500, nfts: ['evil-eye', 'homemade-cake', 'easter-egg'], probabilities: [0.4, 0.4, 0.2] },
    'epic': { cost: 800, nfts: ['light-sword', 'eternal-candle', 'candy-cane'], probabilities: [0.4, 0.4, 0.2] },
    'legendary': { cost: 1200, nfts: ['jelly-bunny', 'ginger-cookie', 'trapped-heart'], probabilities: [0.4, 0.4, 0.2] },
    'mythic': { cost: 1500, nfts: ['diamond-ring', 'neko-helmet', 'durov-cap'], probabilities: [0.4, 0.4, 0.2] }
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
        <div class="nft-slot" data-nft="${cases[caseName].nfts[0]}"><img src="assets/nft/${caseName}-${cases[caseName].nfts[0]}.png" alt="${cases[caseName].nfts[0]}"></div>
        <div class="nft-slot" data-nft="${cases[caseName].nfts[1]}"><img src="assets/nft/${caseName}-${cases[caseName].nfts[1]}.png" alt="${cases[caseName].nfts[1]}"></div>
        <div class="nft-slot" data-nft="${cases[caseName].nfts[2]}"><img src="assets/nft/${caseName}-${cases[caseName].nfts[2]}.png" alt="${cases[caseName].nfts[2]}"></div>
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
        if (slot.dataset.nft === nft) {
            pointer.style.left = `${30 + slotIndex * 60}px`;
        }
    });
}

function updateInventory() {
    inventoryList.innerHTML = inventory.map(nft => {
        // Определяем кейс по названию nft
        let caseName = '';
        for (const [key, value] of Object.entries(cases)) {
            if (value.nfts.includes(nft)) {
                caseName = key;
                break;
            }
        }
        const imgSrc = `assets/nft/${caseName}-${nft}.png`;
        return `<div class="inventory-item"><img src="${imgSrc}" alt="${nft}" class="inventory-nft-img"><span>${nft}</span></div>`;
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
            option1.value = nft;
            option2.value = nft;
            option1.textContent = nft;
            option2.textContent = nft;
            currentSelect.appendChild(option1);
            targetSelect.appendChild(option2);
        });
    });
}

populateNFTSelects();

// SPA-навигация
const pages = document.querySelectorAll('.page');
const navBtns = document.querySelectorAll('.nav-btn');

function showPage(page) {
    pages.forEach(p => p.classList.remove('active'));
    document.getElementById('page-' + page).classList.add('active');
    navBtns.forEach(btn => btn.classList.remove('active'));
    document.querySelector('.nav-btn[data-page="' + page + '"]').classList.add('active');
}

// Открытие страницы кейса
const caseData = {
    basic: {
        name: 'Basic',
        sticker: 'assets/nft/basic-heart.png',
        rewards: [
            { id: 'basic-heart', img: 'assets/nft/basic-heart.png', animated: false },
            { id: 'basic-teddybear', img: 'assets/nft/basic-teddybear.png', animated: false },
            { id: 'basic-rose', img: 'assets/nft/basic-rose.png', animated: false },
            { id: 'basic-rocket', img: 'assets/nft/basic-rocket.png', animated: false },
            { id: 'basic-trophy', img: 'assets/nft/basic-trophy.png', animated: false }
        ]
    },
    standard: {
        name: 'Standard',
        sticker: 'https://t.me/portals/market?startapp=gift_2c57a8b3-7ca4-4ac2-ba52-6a2bd112ca3b',
        rewards: [
            { id: 'basic-lunar-snake', img: 'https://t.me/portals/market?startapp=gift_2c57a8b3-7ca4-4ac2-ba52-6a2bd112ca3b', animated: true },
            { id: 'standard-desk-calendar', img: 'https://t.me/portals/market?startapp=gift_8481c672-1e66-4a4b-9a5e-cb5c1c97380b', animated: true },
            { id: 'standard-b-day-candle', img: 'https://t.me/portals/market?startapp=gift_22d726af-ce76-4909-bbb6-ec3ebb82a548', animated: true },
            { id: 'standard-jester-hat', img: 'https://t.me/portals/market?startapp=gift_979396a9-1a78-4fee-998c-a6dead53a73b', animated: true }
        ]
    },
    rare: {
        name: 'Rare',
        sticker: 'https://t.me/portals/market?startapp=gift_6f53235f-1d4f-4f32-b03f-d09920765401',
        rewards: [
            { id: 'rare-evil-eye', img: 'https://t.me/portals/market?startapp=gift_6f53235f-1d4f-4f32-b03f-d09920765401', animated: true },
            { id: 'rare-homemade-cake', img: 'https://t.me/portals/market?startapp=gift_a4d7253d-e193-45b6-9fc7-d52181705b6a', animated: true },
            { id: 'rare-easter-egg', img: 'https://t.me/portals/market?startapp=gift_b88d1f73-2eb5-4255-8ff2-3a4517f18ea3', animated: true }
        ]
    },
    epic: {
        name: 'Epic',
        sticker: 'https://t.me/portals/market?startapp=gift_fdf5f5cd-a451-4ad8-9640-157038420186',
        rewards: [
            { id: 'epic-light-sword', img: 'https://t.me/portals/market?startapp=gift_fdf5f5cd-a451-4ad8-9640-157038420186', animated: true },
            { id: 'epic-eternal-candle', img: 'https://t.me/portals/market?startapp=gift_d0cc49bb-9c4d-45c2-a1a0-81e3474020d7', animated: true },
            { id: 'epic-candy-cane', img: 'https://t.me/portals/market?startapp=gift_8f04dd90-ed0c-4015-bab5-e8e539775c44', animated: true }
        ]
    },
    legendary: {
        name: 'Legendary',
        sticker: 'https://t.me/portals/market?startapp=gift_ce206ef2-f6c5-4b58-b441-f37fc75e6b67',
        rewards: [
            { id: 'legendary-jelly-bunny', img: 'https://t.me/portals/market?startapp=gift_ce206ef2-f6c5-4b58-b441-f37fc75e6b67', animated: true },
            { id: 'legendary-ginger-cookie', img: 'https://t.me/portals/market?startapp=gift_eedb0d9b-fc14-4e79-9864-4690d69a86cb', animated: true },
            { id: 'legendary-cookie-heart', img: 'https://t.me/portals/market?startapp=gift_a8027521-a9b8-439a-99c5-cb14deff877e', animated: true }
        ]
    },
    mythic: {
        name: 'Mythic',
        sticker: 'https://t.me/portals/market?startapp=gift_740eaf35-5c12-4e52-8bf5-28bb72190e74',
        rewards: [
            { id: 'mythic-diamond-ring', img: 'https://t.me/portals/market?startapp=gift_740eaf35-5c12-4e52-8bf5-28bb72190e74', animated: true },
            { id: 'mythic-neko-helmet', img: 'https://t.me/portals/market?startapp=gift_437c1633-ab14-4fd2-a966-320b68347db5', animated: true },
            { id: 'mythic-durov-cap', img: 'https://t.me/portals/market?startapp=gift_6d95e5b8-3c35-4188-8ebc-0c1f6efd151a', animated: true },
            { id: 'mythic-bonus', img: 'https://t.me/portals/market?startapp=gift_66e16bd8-4e39-49d1-a5a1-a7e0ebd7b2db', animated: true }
        ]
    }
};

let currentCase = null;

window.openCasePage = function(caseKey) {
    currentCase = caseKey;
    document.getElementById('case-title').textContent = caseData[caseKey].name;
    document.getElementById('case-roulette-sticker').src = caseData[caseKey].sticker;
    showPage('case');
}

window.openCase = function() {
    if (!currentCase) return;
    const rewards = caseData[currentCase].rewards;
    const reward = rewards[Math.floor(Math.random() * rewards.length)];
    setTimeout(() => {
        inventory.push(reward);
        updateInventory();
        showPage('inventory');
    }, 1800);
}

window.demoCase = function() {
    if (!currentCase) return;
    document.getElementById('case-roulette-sticker').classList.add('demo-spin');
    setTimeout(() => {
        document.getElementById('case-roulette-sticker').classList.remove('demo-spin');
    }, 1800);
}

function updateInventory() {
    const inventoryList = document.getElementById('inventory-list');
    if (!inventory.length) {
        inventoryList.innerHTML = '';
        return;
    }
    inventoryList.innerHTML = inventory.map(nftObj => {
        return `<div class=\"inventory-item\"><img src=\"${nftObj.img}\" alt=\"${nftObj.id}\" class=\"inventory-nft-img\"><span>${nftObj.id.replace(/-/g, ' ')}</span></div>`;
    }).join('');
}

// SPA: при загрузке показываем главную
showPage('home');