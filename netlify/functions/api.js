// netlify/functions/api.js
exports.handler = async (event, context) => {
  if (event.httpMethod === 'POST') {
    const { action, gcoins } = JSON.parse(event.body);
    let response = { statusCode: 200, body: JSON.stringify({ success: false }) };

    if (action === 'openCase' && gcoins >= 100) {
      const nfts = ['heart', 'teddybear', 'lunar-snake', 'desk-calendar', 'b-day-candle'];
      const nft = nfts[Math.floor(Math.random() * nfts.length)];
      response.body = JSON.stringify({ success: true, nft, newGcoins: gcoins - 100 });
    }

    return response;
  }

  return { statusCode: 400, body: JSON.stringify({ error: 'Invalid request' }) };
};