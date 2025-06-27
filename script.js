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

    caseGrid.querySelectorAll('.case').forCaseEach(c => c.classList.remove('active'));
    caseDiv.classList.add('active');
    caseDiv.innerHTML = `
        <div class="nft-slot" data-nft="${cases[caseName].nfts[0]}"></div>
        <div class="nft-slot" data-nft="${cases[caseName].nfts[1]}"></div>
        <div class="nft-slot" data-nft="${cases[caseName].nfts[2]}"></div>
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
    inventoryList.innerHTML = inventory.map(nft => `<div>${nft}</div>`).join('');
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