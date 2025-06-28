// Цены NFT на основе Portals Market (в TON)
// 1 TON = 100 GCoins

const NFT_PRICES = {
    // Basic NFTs
    'teddybear': { min: 0.15, max: 0.15, avg: 0.15 },
    'heart': { min: 0.15, max: 0.15, avg: 0.15 },
    'rose': { min: 0.25, max: 0.25, avg: 0.25 },
    'rocket': { min: 0.5, max: 0.5, avg: 0.5 },
    'trophy': { min: 1.0, max: 1.0, avg: 1.0 },
    'lunar-snake': { min: 0.6, max: 0.9, avg: 0.75 },
    
    // Standard NFTs
    'desk-calendar': { min: 1.6, max: 1.8, avg: 1.7 },
    'b-day-candle': { min: 1.5, max: 1.5, avg: 1.5 },
    'jester-hat': { min: 2.1, max: 2.3, avg: 2.2 },
    
    // Rare NFTs
    'evil-eye': { min: 3.5, max: 4.5, avg: 4.0 },
    'homemade-cake': { min: 1.5, max: 2.0, avg: 1.75 },
    'easter-egg': { min: 1.5, max: 2.5, avg: 2.0 },
    
    // Epic NFTs
    'light-sword': { min: 4, max: 6, avg: 5 },
    'eternal-candle': { min: 4, max: 6, avg: 5.0 },
    'candy-cane': { min: 1.5, max: 2.5, avg: 2.0 },
    
    // Legendary NFTs
    'jelly-bunny': { min: 4, max: 7, avg: 5.5 },
    'ginger-cookie': { min: 5.0, max: 8.0, avg: 6.5 },
    'cookie-heart': { min: 6.0, max: 8.0, avg: 7.0 },
    
    // Mythic NFTs
    'diamond-ring': { min: 15.0, max: 25.0, avg: 20.0 },
    'neko-helmet': { min: 30.0, max: 35.0, avg: 27.5 },
    'durov-cap': { min: 500, max: 800, avg: 650 },
    
    // Special GCoins (номинальная стоимость)
    'gcoins-50': { min: 0.5, max: 0.5, avg: 0.5 },
    'gcoins-200': { min: 2.0, max: 2.0, avg: 2.0 },
    'gcoins-2500': { min: 25, max: 25, avg: 25 },
    'gcoins-7000': { min: 70, max: 70, avg: 70 }
};

// Функция для получения цены NFT
function getNFTPrice(nftId, useAverage = false) {
    const priceData = NFT_PRICES[nftId];
    
    if (!priceData) {
        // Если NFT не найден, возвращаем базовую цену
        return { min: 0.1, max: 0.2, avg: 0.15 };
    }
    
    if (useAverage) {
        return priceData.avg;
    }
    
    // Возвращаем случайную цену в диапазоне
    const randomPrice = priceData.min + Math.random() * (priceData.max - priceData.min);
    return randomPrice;
}

// Функция для конвертации TON в GCoins
function tonToGCoins(tonAmount) {
    return Math.floor(tonAmount * 100);
}

// Функция для получения цены NFT в GCoins
function getNFTPriceInGCoins(nftId, useAverage = false) {
    const tonPrice = getNFTPrice(nftId, useAverage);
    return tonToGCoins(tonPrice);
}

// Экспорт для использования в других файлах
if (typeof module !== 'undefined' && module.exports) {
    module.exports = { NFT_PRICES, getNFTPrice, getNFTPriceInGCoins, tonToGCoins };
} 