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
    'basic': {
        name: 'Basic',
        cost: 100,
        nfts: ['heart', 'teddybear', 'lunar-snake'],
        probabilities: [0.4, 0.4, 0.2],
        sticker: 'assets/nft/basic-heart.gif'
    },
    'standard': {
        name: 'Standard',
        cost: 300,
        nfts: ['desk-calendar', 'b-day-candle', 'jester-hat'],
        probabilities: [0.4, 0.4, 0.2],
        sticker: 'assets/nft/basic-rocket.gif'
    },
    'rare': {
        name: 'Rare',
        cost: 500,
        nfts: ['evil-eye', 'homemade-cake', 'easter-egg'],
        probabilities: [0.4, 0.4, 0.2],
        sticker: 'assets/nft/basic-trophy.gif'
    },
    'epic': {
        name: 'Epic',
        cost: 800,
        nfts: ['light-sword', 'eternal-candle', 'candy-cane'],
        probabilities: [0.4, 0.4, 0.2],
        sticker: 'assets/nft/epic-light-sword.gif'
    },
    'legendary': {
        name: 'Legendary',
        cost: 1200,
        nfts: ['jelly-bunny', 'ginger-cookie', 'trapped-heart'],
        probabilities: [0.4, 0.4, 0.2],
        sticker: 'assets/nft/mythic-neko-helmet.gif'
    },
    'mythic': {
        name: 'Mythic',
        cost: 1500,
        nfts: ['diamond-ring', 'neko-helmet', 'durov-cap'],
        probabilities: [0.4, 0.4, 0.2],
        sticker: 'assets/nft/mythic-durov-cap.gif'
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
    document.getElementById('case-title').textContent = caseData[caseKey].name;
    document.getElementById('case-roulette-sticker').src = caseData[caseKey].sticker;
    window.showPage('case');
};

window.openCase = function() {
    if (!currentCase) return;
    const rewards = caseData[currentCase].rewards;
    const reward = rewards[Math.floor(Math.random() * rewards.length)];
    setTimeout(() => {
        inventory.push(reward);
        window.updateInventory();
        window.showPage('inventory');
    }, 1800);
};

window.demoCase = function() {
    if (!currentCase) return;
    document.getElementById('case-roulette-sticker').classList.add('demo-spin');
    setTimeout(() => {
        document.getElementById('case-roulette-sticker').classList.remove('demo-spin');
    }, 1800);
};

window.updateInventory = function() {
    const inventoryList = document.getElementById('inventory-list');
    if (!inventory.length) {
        inventoryList.innerHTML = '';
        return;
    }
    inventoryList.innerHTML = inventory.map(nftObj => {
        return `<div class=\"inventory-item\"><img src=\"${nftObj.img}\" alt=\"${nftObj.id}\" class=\"inventory-nft-img\"><span>${nftObj.id.replace(/-/g, ' ')}</span></div>`;
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