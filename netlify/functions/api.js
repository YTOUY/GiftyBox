exports.handler = async (event, context) => {
    if (event.httpMethod === 'POST') {
        const { action, gcoins, case: caseName } = JSON.parse(event.body);
        const cases = {
            'basic': { cost: 100, nfts: ['heart', 'teddybear', 'lunar-snake'], probabilities: [0.4, 0.4, 0.2] },
            'standard': { cost: 300, nfts: ['desk-calendar', 'b-day-candle', 'jester-hat'], probabilities: [0.4, 0.4, 0.2] },
            'rare': { cost: 500, nfts: ['evil-eye', 'homemade-cake', 'easter-egg'], probabilities: [0.4, 0.4, 0.2] },
            'epic': { cost: 800, nfts: ['light-sword', 'eternal-candle', 'candy-cane'], probabilities: [0.4, 0.4, 0.2] },
            'legendary': { cost: 1200, nfts: ['jelly-bunny', 'ginger-cookie', 'trapped-heart'], probabilities: [0.4, 0.4, 0.2] },
            'mythic': { cost: 1500, nfts: ['diamond-ring', 'neko-helmet', 'durov-cap'], probabilities: [0.4, 0.4, 0.2] }
        };

        let response = { statusCode: 200, body: JSON.stringify({ success: false }) };

        if (action === 'openCase' && gcoins >= cases[caseName]?.cost) {
            const caseData = cases[caseName];
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
            response.body = JSON.stringify({ success: true, nft, newGcoins: gcoins - caseData.cost });
        }

        return response;
    }

    return { statusCode: 400, body: JSON.stringify({ error: 'Invalid request' }) };
};