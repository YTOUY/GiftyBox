const { createClient } = require('@supabase/supabase-js');

// Инициализация Supabase (замени на свои ключи)
const supabase = createClient(
    'https://your-project-url.supabase.co', // Замени на свой URL
    'your-anon-key' // Замени на свой anon key
);

// Конфигурация кейсов
const cases = {
    'basic': { cost: 100, nfts: ['heart', 'teddybear', 'lunar-snake'], probabilities: [0.4, 0.4, 0.2] },
    'standard': { cost: 300, nfts: ['desk-calendar', 'b-day-candle', 'jester-hat'], probabilities: [0.4, 0.4, 0.2] },
    'rare': { cost: 500, nfts: ['evil-eye', 'homemade-cake', 'easter-egg'], probabilities: [0.4, 0.4, 0.2] },
    'epic': { cost: 800, nfts: ['light-sword', 'eternal-candle', 'candy-cane'], probabilities: [0.4, 0.4, 0.2] },
    'legendary': { cost: 1200, nfts: ['jelly-bunny', 'ginger-cookie', 'trapped-heart'], probabilities: [0.4, 0.4, 0.2] },
    'mythic': { cost: 1500, nfts: ['diamond-ring', 'neko-helmet', 'durov-cap'], probabilities: [0.4, 0.4, 0.2] }
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