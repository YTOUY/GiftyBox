const { createClient } = require('@supabase/supabase-js');

// Инициализация Supabase (замени на свои ключи)
const supabase = createClient(
    'https://your-project-url.supabase.co', // Замени на свой URL
    'your-anon-key' // Замени на свой anon key
);

// Конфигурация кейсов
const cases = {
    'free-spins': {
        cost: 0,
        nfts: [
            { id: 'empty', label: 'Пусто', type: 'empty' },
            { id: 'gcoins-1', label: '1 Gc', gcoins: 1 },
            { id: 'gcoins-2', label: '2 Gc', gcoins: 2 },
            { id: 'gcoins-3', label: '3 Gc', gcoins: 3 },
            { id: 'gcoins-5', label: '5 Gc', gcoins: 5 },
            { id: 'gcoins-10', label: '10 Gc', gcoins: 10 }
        ],
        probabilities: [0.99, 0.002, 0.002, 0.002, 0.002, 0.002]
    },
    'lunar-luck': {
        cost: 50,
        nfts: [
            { id: 'gcoins-10', label: '10 Gc', gcoins: 10 },
            { id: 'gcoins-15', label: '15 Gc', gcoins: 15 },
            { id: 'gcoins-20', label: '20 Gc', gcoins: 20 },
            { id: 'gcoins-25', label: '25 Gc', gcoins: 25 },
            { id: 'gcoins-30', label: '30 Gc', gcoins: 30 },
            { id: 'gcoins-50', label: '50 Gc', gcoins: 50 },
            { id: 'lunar-snake', label: 'Lunar Snake' },
            { id: 'pet-snake', label: 'Pet Snake' },
            { id: 'snake-box', label: 'Snake Box' },
            { id: 'sakura-flower', label: 'Sakura Flower' },
            { id: 'astral-shard', label: 'Astral Shard' },
            { id: 'snow-mittens', label: 'Snow Mittens' },
            { id: 'light-sword', label: 'Light Sword' }
        ],
        probabilities: [0.13,0.13,0.13,0.13,0.13,0.10,0.05,0.05,0.05,0.05,0.05,0.05,0.05]
    },
    'heartbeat': {
        cost: 100,
        nfts: [
            { id: 'gcoins-20', label: '20 Gc', gcoins: 20 },
            { id: 'gcoins-30', label: '30 Gc', gcoins: 30 },
            { id: 'gcoins-40', label: '40 Gc', gcoins: 40 },
            { id: 'gcoins-50', label: '50 Gc', gcoins: 50 },
            { id: 'gcoins-60', label: '60 Gc', gcoins: 60 },
            { id: 'gcoins-100', label: '100 Gc', gcoins: 100 },
            { id: 'heart-locket', label: 'Heart Locket' },
            { id: 'trapped-heart', label: 'Trapped Heart' },
            { id: 'cookie-heart', label: 'Cookie Heart' },
            { id: 'eternal-rose', label: 'Eternal Rose' },
            { id: 'bow-tie', label: 'Bow Tie' },
            { id: 'precious-peach', label: 'Precious Peach' },
            { id: 'restless-jar', label: 'Restless Jar' }
        ],
        probabilities: [0.13,0.13,0.13,0.13,0.13,0.10,0.05,0.05,0.05,0.05,0.05,0.05,0.05]
    },
    'sweet-tooth': {
        cost: 200,
        nfts: [
            { id: 'gcoins-50', label: '50 Gc', gcoins: 50 },
            { id: 'gcoins-70', label: '70 Gc', gcoins: 70 },
            { id: 'gcoins-100', label: '100 Gc', gcoins: 100 },
            { id: 'gcoins-120', label: '120 Gc', gcoins: 120 },
            { id: 'gcoins-150', label: '150 Gc', gcoins: 150 },
            { id: 'gcoins-200', label: '200 Gc', gcoins: 200 },
            { id: 'jelly-bunny', label: 'Jelly Bunny' },
            { id: 'ginger-cookie', label: 'Ginger Cookie' },
            { id: 'candy-cane', label: 'Candy Cane' },
            { id: 'lol-pop', label: 'Lol Pop' },
            { id: 'mad-pumpkin', label: 'Mad Pumpkin' },
            { id: 'holiday-drink', label: 'Holiday Drink' },
            { id: 'big-year', label: 'Big Year' }
        ],
        probabilities: [0.13,0.13,0.13,0.13,0.13,0.10,0.05,0.05,0.05,0.05,0.05,0.05,0.05]
    },
    'magic-night': {
        cost: 300,
        nfts: [
            { id: 'gcoins-70', label: '70 Gc', gcoins: 70 },
            { id: 'gcoins-100', label: '100 Gc', gcoins: 100 },
            { id: 'gcoins-120', label: '120 Gc', gcoins: 120 },
            { id: 'gcoins-150', label: '150 Gc', gcoins: 150 },
            { id: 'gcoins-200', label: '200 Gc', gcoins: 200 },
            { id: 'gcoins-300', label: '300 Gc', gcoins: 300 },
            { id: 'eternal-candle', label: 'Eternal Candle' },
            { id: 'magic-potion', label: 'Magic Potion' },
            { id: 'crystal-ball', label: 'Crystal Ball' },
            { id: 'hypno-lollipop', label: 'Hypno Lollipop' },
            { id: 'witch-hat', label: 'Witch Hat' },
            { id: 'voodoo-doll', label: 'Voodoo Doll' },
            { id: 'hex-pot', label: 'Hex Pot' }
        ],
        probabilities: [0.13,0.13,0.13,0.13,0.13,0.10,0.05,0.05,0.05,0.05,0.05,0.05,0.05]
    },
    'winter-wonders': {
        cost: 500,
        nfts: [
            { id: 'gcoins-100', label: '100 Gc', gcoins: 100 },
            { id: 'gcoins-150', label: '150 Gc', gcoins: 150 },
            { id: 'gcoins-200', label: '200 Gc', gcoins: 200 },
            { id: 'gcoins-250', label: '250 Gc', gcoins: 250 },
            { id: 'gcoins-300', label: '300 Gc', gcoins: 300 },
            { id: 'gcoins-500', label: '500 Gc', gcoins: 500 },
            { id: 'snow-globe', label: 'Snow Globe' },
            { id: 'snow-mittens', label: 'Snow Mittens' },
            { id: 'sleigh-bell', label: 'Sleigh Bell' },
            { id: 'winter-wreath', label: 'Winter Wreath' },
            { id: 'santa-hat', label: 'Santa Hat' },
            { id: 'jingle-bells', label: 'Jingle Bells' },
            { id: 'desk-calendar', label: 'Desk Calendar' }
        ],
        probabilities: [0.13,0.13,0.13,0.13,0.13,0.10,0.05,0.05,0.05,0.05,0.05,0.05,0.05]
    },
    'party-box': {
        cost: 700,
        nfts: [
            { id: 'gcoins-150', label: '150 Gc', gcoins: 150 },
            { id: 'gcoins-200', label: '200 Gc', gcoins: 200 },
            { id: 'gcoins-250', label: '250 Gc', gcoins: 250 },
            { id: 'gcoins-300', label: '300 Gc', gcoins: 300 },
            { id: 'gcoins-400', label: '400 Gc', gcoins: 400 },
            { id: 'gcoins-700', label: '700 Gc', gcoins: 700 },
            { id: 'party-sparkler', label: 'Party Sparkler' },
            { id: 'jester-hat', label: 'Jester Hat' },
            { id: 'b-day-candle', label: 'B Day Candle' },
            { id: 'plush-pepe', label: 'Plush Pepe' },
            { id: 'top-hat', label: 'Top Hat' },
            { id: 'flying-broom', label: 'Flying Broom' },
            { id: 'record-player', label: 'Record Player' }
        ],
        probabilities: [0.13,0.13,0.13,0.13,0.13,0.10,0.05,0.05,0.05,0.05,0.05,0.05,0.05]
    },
    'lucky-charms': {
        cost: 1000,
        nfts: [
            { id: 'gcoins-200', label: '200 Gc', gcoins: 200 },
            { id: 'gcoins-300', label: '300 Gc', gcoins: 300 },
            { id: 'gcoins-400', label: '400 Gc', gcoins: 400 },
            { id: 'gcoins-500', label: '500 Gc', gcoins: 500 },
            { id: 'gcoins-700', label: '700 Gc', gcoins: 700 },
            { id: 'gcoins-1000', label: '1000 Gc', gcoins: 1000 },
            { id: 'evil-eye', label: 'Evil Eye' },
            { id: 'sharp-tongue', label: 'Sharp Tongue' },
            { id: 'star-notepad', label: 'Star Notepad' },
            { id: 'ion-gem', label: 'Ion Gem' },
            { id: 'scared-cat', label: 'Scared Cat' },
            { id: 'kissed-frog', label: 'Kissed Frog' },
            { id: 'electric-skull', label: 'Electric Skull' }
        ],
        probabilities: [0.13,0.13,0.13,0.13,0.13,0.10,0.05,0.05,0.05,0.05,0.05,0.05,0.05]
    },
    'heroic-legends': {
        cost: 1500,
        nfts: [
            { id: 'gcoins-300', label: '300 Gc', gcoins: 300 },
            { id: 'gcoins-400', label: '400 Gc', gcoins: 400 },
            { id: 'gcoins-500', label: '500 Gc', gcoins: 500 },
            { id: 'gcoins-700', label: '700 Gc', gcoins: 700 },
            { id: 'gcoins-1000', label: '1000 Gc', gcoins: 1000 },
            { id: 'gcoins-1500', label: '1500 Gc', gcoins: 1500 },
            { id: 'heroic-helmet', label: 'Heroic Helmet' },
            { id: 'durov-cap', label: 'Durov s Cap' },
            { id: 'top-hat', label: 'Top Hat' },
            { id: 'mini-oscar', label: 'Mini Oscar' },
            { id: 'swiss-watch', label: 'Swiss Watch' },
            { id: 'vintage-cigar', label: 'Vintage Cigar' },
            { id: 'gem-signet', label: 'Gem Signet' }
        ],
        probabilities: [0.13,0.13,0.13,0.13,0.13,0.10,0.05,0.05,0.05,0.05,0.05,0.05,0.05]
    },
    'flower-power': {
        cost: 2000,
        nfts: [
            { id: 'gcoins-400', label: '400 Gc', gcoins: 400 },
            { id: 'gcoins-500', label: '500 Gc', gcoins: 500 },
            { id: 'gcoins-700', label: '700 Gc', gcoins: 700 },
            { id: 'gcoins-1000', label: '1000 Gc', gcoins: 1000 },
            { id: 'gcoins-1500', label: '1500 Gc', gcoins: 1500 },
            { id: 'gcoins-2000', label: '2000 Gc', gcoins: 2000 },
            { id: 'skull-flower', label: 'Skull Flower' },
            { id: 'sakura-flower', label: 'Sakura Flower' },
            { id: 'eternal-rose', label: 'Eternal Rose' },
            { id: 'lush-bouquet', label: 'Lush Bouquet' },
            { id: 'berry-box', label: 'Berry Box' },
            { id: 'perfume-bottle', label: 'Perfume Bottle' },
            { id: 'precious-peach', label: 'Precious Peach' }
        ],
        probabilities: [0.13,0.13,0.13,0.13,0.13,0.10,0.05,0.05,0.05,0.05,0.05,0.05,0.05]
    },
    'riches-rings': {
        cost: 3000,
        nfts: [
            { id: 'gcoins-500', label: '500 Gc', gcoins: 500 },
            { id: 'gcoins-700', label: '700 Gc', gcoins: 700 },
            { id: 'gcoins-1000', label: '1000 Gc', gcoins: 1000 },
            { id: 'gcoins-1500', label: '1500 Gc', gcoins: 1500 },
            { id: 'gcoins-2000', label: '2000 Gc', gcoins: 2000 },
            { id: 'gcoins-3000', label: '3000 Gc', gcoins: 3000 },
            { id: 'diamond-ring', label: 'Diamond Ring' },
            { id: 'signet-ring', label: 'Signet Ring' },
            { id: 'bonded-ring', label: 'Bonded Ring' },
            { id: 'nail-bracelet', label: 'Nail Bracelet' },
            { id: 'gem-signet', label: 'Gem Signet' },
            { id: 'bow-tie', label: 'Bow Tie' },
            { id: 'astral-shard', label: 'Astral Shard' }
        ],
        probabilities: [0.13,0.13,0.13,0.13,0.13,0.10,0.05,0.05,0.05,0.05,0.05,0.05,0.05]
    },
    'tech-treasures': {
        cost: 5000,
        nfts: [
            { id: 'gcoins-700', label: '700 Gc', gcoins: 700 },
            { id: 'gcoins-1000', label: '1000 Gc', gcoins: 1000 },
            { id: 'gcoins-1500', label: '1500 Gc', gcoins: 1500 },
            { id: 'gcoins-2000', label: '2000 Gc', gcoins: 2000 },
            { id: 'gcoins-3000', label: '3000 Gc', gcoins: 3000 },
            { id: 'gcoins-5000', label: '5000 Gc', gcoins: 5000 },
            { id: 'tama-gadget', label: 'Tama Gadget' },
            { id: 'vintage-cigar', label: 'Vintage Cigar' },
            { id: 'swiss-watch', label: 'Swiss Watch' },
            { id: 'record-player', label: 'Record Player' },
            { id: 'crystal-ball', label: 'Crystal Ball' },
            { id: 'electric-skull', label: 'Electric Skull' },
            { id: 'hypno-lollipop', label: 'Hypno Lollipop' }
        ],
        probabilities: [0.13,0.13,0.13,0.13,0.13,0.10,0.05,0.05,0.05,0.05,0.05,0.05,0.05]
    },
    'spooky-box': {
        cost: 7000,
        nfts: [
            { id: 'gcoins-1000', label: '1000 Gc', gcoins: 1000 },
            { id: 'gcoins-1500', label: '1500 Gc', gcoins: 1500 },
            { id: 'gcoins-2000', label: '2000 Gc', gcoins: 2000 },
            { id: 'gcoins-3000', label: '3000 Gc', gcoins: 3000 },
            { id: 'gcoins-5000', label: '5000 Gc', gcoins: 5000 },
            { id: 'gcoins-7000', label: '7000 Gc', gcoins: 7000 },
            { id: 'voodoo-doll', label: 'Voodoo Doll' },
            { id: 'mad-pumpkin', label: 'Mad Pumpkin' },
            { id: 'witch-hat', label: 'Witch Hat' },
            { id: 'scared-cat', label: 'Scared Cat' },
            { id: 'evil-eye', label: 'Evil Eye' },
            { id: 'hex-pot', label: 'Hex Pot' },
            { id: 'trapped-heart', label: 'Trapped Heart' }
        ],
        probabilities: [0.13,0.13,0.13,0.13,0.13,0.10,0.05,0.05,0.05,0.05,0.05,0.05,0.05]
    },
    'animal-parade': {
        cost: 8000,
        nfts: [
            { id: 'gcoins-1500', label: '1500 Gc', gcoins: 1500 },
            { id: 'gcoins-2000', label: '2000 Gc', gcoins: 2000 },
            { id: 'gcoins-3000', label: '3000 Gc', gcoins: 3000 },
            { id: 'gcoins-5000', label: '5000 Gc', gcoins: 5000 },
            { id: 'gcoins-7000', label: '7000 Gc', gcoins: 7000 },
            { id: 'gcoins-8000', label: '8000 Gc', gcoins: 8000 },
            { id: 'plush-pepe', label: 'Plush Pepe' },
            { id: 'scared-cat', label: 'Scared Cat' },
            { id: 'toy-bear', label: 'Toy Bear' },
            { id: 'durov-duck', label: 'Durov Duck' },
            { id: 'jelly-bunny', label: 'Jelly Bunny' },
            { id: 'pet-snake', label: 'Pet Snake' },
            { id: 'flying-broom', label: 'Flying Broom' }
        ],
        probabilities: [0.13,0.13,0.13,0.13,0.13,0.10,0.05,0.05,0.05,0.05,0.05,0.05,0.05]
    },
    'cosmic-fortune': {
        cost: 9000,
        nfts: [
            { id: 'gcoins-2000', label: '2000 Gc', gcoins: 2000 },
            { id: 'gcoins-3000', label: '3000 Gc', gcoins: 3000 },
            { id: 'gcoins-5000', label: '5000 Gc', gcoins: 5000 },
            { id: 'gcoins-7000', label: '7000 Gc', gcoins: 7000 },
            { id: 'gcoins-8000', label: '8000 Gc', gcoins: 8000 },
            { id: 'gcoins-9000', label: '9000 Gc', gcoins: 9000 },
            { id: 'astral-shard', label: 'Astral Shard' },
            { id: 'ion-gem', label: 'Ion Gem' },
            { id: 'gem-signet', label: 'Gem Signet' },
            { id: 'crystal-ball', label: 'Crystal Ball' },
            { id: 'magic-potion', label: 'Magic Potion' },
            { id: 'eternal-candle', label: 'Eternal Candle' },
            { id: 'big-year', label: 'Big Year' }
        ],
        probabilities: [0.13,0.13,0.13,0.13,0.13,0.10,0.05,0.05,0.05,0.05,0.05,0.05,0.05]
    },
    'golden-year': {
        cost: 10000,
        nfts: [
            { id: 'gcoins-3000', label: '3000 Gc', gcoins: 3000 },
            { id: 'gcoins-4000', label: '4000 Gc', gcoins: 4000 },
            { id: 'gcoins-5000', label: '5000 Gc', gcoins: 5000 },
            { id: 'gcoins-6000', label: '6000 Gc', gcoins: 6000 },
            { id: 'gcoins-8000', label: '8000 Gc', gcoins: 8000 },
            { id: 'gcoins-10000', label: '10000 Gc', gcoins: 10000 },
            { id: 'big-year', label: 'Big Year' },
            { id: 'bow-tie', label: 'Bow Tie' },
            { id: 'precious-peach', label: 'Precious Peach' },
            { id: 'heroic-helmet', label: 'Heroic Helmet' },
            { id: 'diamond-ring', label: 'Diamond Ring' },
            { id: 'swiss-watch', label: 'Swiss Watch' },
            { id: 'durov-cap', label: 'Durov s Cap' }
        ],
        probabilities: [0.13,0.13,0.13,0.13,0.13,0.10,0.05,0.05,0.05,0.05,0.05,0.05,0.05]
    }
};

// Функция для генерации случайного NFT
function getRandomNFT(caseName) {
    const caseData = cases[caseName];
    if (!caseData) return null;
    
    const rand = Math.random();
    let cumulative = 0;
    let nft = caseData.nfts[0];
    
    for (let i = 0; i < caseData.nfts.length; i++) {
        cumulative += caseData.probabilities[i];
        if (rand <= cumulative) {
            nft = caseData.nfts[i];
            break;
        }
    }
    
    return nft;
}

// Функция для получения или создания пользователя
async function getOrCreateUser(userId) {
    try {
        // Проверяем, существует ли пользователь
        const { data: existingUser, error: fetchError } = await supabase
            .from('users')
            .select('*')
            .eq('id', userId)
            .single();

        if (fetchError && fetchError.code !== 'PGRST116') {
            throw fetchError;
        }

        if (existingUser) {
            return existingUser;
        }

        // Создаем нового пользователя
        const { data: newUser, error: insertError } = await supabase
            .from('users')
            .insert([
                {
                    id: userId,
                    gcoins: 1000,
                    created_at: new Date().toISOString()
                }
            ])
            .select()
            .single();

        if (insertError) throw insertError;
        return newUser;
    } catch (error) {
        console.error('Error in getOrCreateUser:', error);
        throw error;
    }
}

// Функция для обновления GCoins пользователя
async function updateUserGCoins(userId, newGcoins) {
    try {
        const { error } = await supabase
            .from('users')
            .update({ gcoins: newGcoins })
            .eq('id', userId);

        if (error) throw error;
        return true;
    } catch (error) {
        console.error('Error updating user GCoins:', error);
        throw error;
    }
}

// Функция для добавления NFT в инвентарь
async function addNFTToInventory(userId, nftId, caseId) {
    try {
        const { error } = await supabase
            .from('inventory')
            .insert([
                {
                    user_id: userId,
                    nft_id: nftId,
                    case_id: caseId,
                    created_at: new Date().toISOString()
                }
            ]);

        if (error) throw error;
        return true;
    } catch (error) {
        console.error('Error adding NFT to inventory:', error);
        throw error;
    }
}

// Функция для получения инвентаря пользователя
async function getUserInventory(userId) {
    try {
        const { data, error } = await supabase
            .from('inventory')
            .select(`
                *,
                nfts (
                    id,
                    name,
                    rarity,
                    stars,
                    gcoins
                )
            `)
            .eq('user_id', userId)
            .order('created_at', { ascending: false });

        if (error) throw error;
        return data || [];
    } catch (error) {
        console.error('Error getting user inventory:', error);
        throw error;
    }
}

// Функция для получения статистики пользователя
async function getUserStats(userId) {
    try {
        const { data, error } = await supabase
            .from('user_stats')
            .select('*')
            .eq('user_id', userId)
            .single();

        if (error && error.code !== 'PGRST116') {
            throw error;
        }

        return data || {
            user_id: userId,
            cases_opened: 0,
            total_spent: 0,
            total_earned: 0,
            created_at: new Date().toISOString()
        };
    } catch (error) {
        console.error('Error getting user stats:', error);
        throw error;
    }
}

// Функция для обновления статистики
async function updateUserStats(userId, caseCost, nftValue = 0) {
    try {
        const stats = await getUserStats(userId);
        
        const updatedStats = {
            cases_opened: stats.cases_opened + 1,
            total_spent: stats.total_spent + caseCost,
            total_earned: stats.total_earned + nftValue
        };

        const { error } = await supabase
            .from('user_stats')
            .upsert({
                user_id: userId,
                ...updatedStats,
                updated_at: new Date().toISOString()
            });

        if (error) throw error;
        return true;
    } catch (error) {
        console.error('Error updating user stats:', error);
        throw error;
    }
}

// Основной обработчик
exports.handler = async (event, context) => {
    // Настройка CORS
    const headers = {
        'Access-Control-Allow-Origin': '*',
        'Access-Control-Allow-Headers': 'Content-Type',
        'Access-Control-Allow-Methods': 'GET, POST, PUT, DELETE, OPTIONS'
    };

    // Обработка preflight запросов
    if (event.httpMethod === 'OPTIONS') {
        return {
            statusCode: 200,
            headers,
            body: ''
        };
    }

    try {
        if (event.httpMethod === 'POST') {
            const { action, userId, case: caseName, gcoins } = JSON.parse(event.body);

            switch (action) {
                case 'openCase':
                    return await handleOpenCase(userId, caseName, gcoins, headers);
                
                case 'getInventory':
                    return await handleGetInventory(userId, headers);
                
                case 'getUserStats':
                    return await handleGetUserStats(userId, headers);
                
                case 'getUser':
                    return await handleGetUser(userId, headers);
                
                case 'topup_balance':
                    try {
                        const { user_id, ton_amount, wallet_address } = JSON.parse(event.body);
                        
                        // Конвертируем TON в GCoins (1 TON = 100 GCoins)
                        const gcoins = Math.floor(ton_amount * 100);
                        // Бонус +30% при пополнении от 5 TON
                        const bonus = ton_amount >= 5 ? Math.floor(gcoins * 0.3) : 0;
                        const totalGcoins = gcoins + bonus;
                        
                        // Получаем текущий баланс пользователя
                        const { data: userData, error: userError } = await supabase
                            .from('users')
                            .select('balance')
                            .eq('id', user_id)
                            .single();
                        
                        if (userError) throw userError;
                        
                        const newBalance = userData.balance + totalGcoins;
                        
                        // Обновляем баланс пользователя
                        const { error: updateError } = await supabase
                            .from('users')
                            .update({ balance: newBalance })
                            .eq('id', user_id);
                        
                        if (updateError) throw updateError;
                        
                        // Добавляем запись в историю операций
                        const { error: historyError } = await supabase
                            .from('user_operations')
                            .insert({
                                user_id: user_id,
                                operation_type: 'topup',
                                amount: totalGcoins,
                                details: JSON.stringify({
                                    ton_amount: ton_amount,
                                    wallet_address: wallet_address,
                                    bonus: bonus
                                }),
                                created_at: new Date().toISOString()
                            });
                        
                        if (historyError) throw historyError;
                        
                        return {
                            statusCode: 200,
                            headers,
                            body: JSON.stringify({
                                success: true,
                                new_balance: newBalance,
                                gcoins_added: totalGcoins,
                                bonus: bonus
                            })
                        };
                    } catch (error) {
                        console.error('Ошибка пополнения баланса:', error);
                        return {
                            statusCode: 500,
                            headers,
                            body: JSON.stringify({
                                success: false,
                                error: error.message
                            })
                        };
                    }
                
                default:
                    return {
                        statusCode: 400,
                        headers,
                        body: JSON.stringify({ error: 'Invalid action' })
                    };
            }
        }

        return {
            statusCode: 405,
            headers,
            body: JSON.stringify({ error: 'Method not allowed' })
        };

    } catch (error) {
        console.error('API Error:', error);
        return {
            statusCode: 500,
            headers,
            body: JSON.stringify({ error: 'Internal server error' })
        };
    }
};

// Обработчик открытия кейса
async function handleOpenCase(userId, caseName, currentGcoins, headers) {
    try {
        // Проверяем существование кейса
        if (!cases[caseName]) {
            return {
                statusCode: 400,
                headers,
                body: JSON.stringify({ error: 'Invalid case' })
            };
        }

        const caseData = cases[caseName];

        // Проверяем достаточно ли GCoins
        if (currentGcoins < caseData.cost) {
            return {
                statusCode: 400,
                headers,
                body: JSON.stringify({ error: 'Insufficient GCoins' })
            };
        }

        // Получаем или создаем пользователя
        const user = await getOrCreateUser(userId);
        
        // Генерируем случайный NFT
        const nft = getRandomNFT(caseName);
        
        // Обновляем GCoins пользователя
        const newGcoins = user.gcoins - caseData.cost;
        await updateUserGCoins(userId, newGcoins);
        
        // Добавляем NFT в инвентарь
        await addNFTToInventory(userId, nft, caseName);
        
        // Обновляем статистику
        await updateUserStats(userId, caseData.cost);

        return {
            statusCode: 200,
            headers,
            body: JSON.stringify({
                success: true,
                nft,
                newGcoins,
                user: { ...user, gcoins: newGcoins }
            })
        };

    } catch (error) {
        console.error('Error in handleOpenCase:', error);
        return {
            statusCode: 500,
            headers,
            body: JSON.stringify({ error: 'Failed to open case' })
        };
    }
}

// Обработчик получения инвентаря
async function handleGetInventory(userId, headers) {
    try {
        const inventory = await getUserInventory(userId);
        
        return {
            statusCode: 200,
            headers,
            body: JSON.stringify({
                success: true,
                inventory
            })
        };

    } catch (error) {
        console.error('Error in handleGetInventory:', error);
        return {
            statusCode: 500,
            headers,
            body: JSON.stringify({ error: 'Failed to get inventory' })
        };
    }
}

// Обработчик получения статистики пользователя
async function handleGetUserStats(userId, headers) {
    try {
        const stats = await getUserStats(userId);
        
        return {
            statusCode: 200,
            headers,
            body: JSON.stringify({
                success: true,
                stats
            })
        };

    } catch (error) {
        console.error('Error in handleGetUserStats:', error);
        return {
            statusCode: 500,
            headers,
            body: JSON.stringify({ error: 'Failed to get user stats' })
        };
    }
}

// Обработчик получения пользователя
async function handleGetUser(userId, headers) {
    try {
        const user = await getOrCreateUser(userId);
        
        return {
            statusCode: 200,
            headers,
            body: JSON.stringify({
                success: true,
                user
            })
        };

    } catch (error) {
        console.error('Error in handleGetUser:', error);
        return {
            statusCode: 500,
            headers,
            body: JSON.stringify({ error: 'Failed to get user' })
        };
    }
}