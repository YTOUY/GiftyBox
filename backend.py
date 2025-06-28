import sqlite3
from flask import Flask, request, jsonify

app = Flask(__name__)
DB_PATH = 'giftybox.db'

def get_db():
    conn = sqlite3.connect(DB_PATH)
    conn.row_factory = sqlite3.Row
    return conn

@app.route('/api/user/<telegram_id>', methods=['GET'])
def get_user(telegram_id):
    db = get_db()
    user = db.execute('SELECT * FROM users WHERE telegram_id = ?', (telegram_id,)).fetchone()
    if user:
        return dict(user)
    return {}, 404

@app.route('/api/user', methods=['POST'])
def create_user():
    data = request.json
    db = get_db()
    db.execute('INSERT INTO users (telegram_id, username, gcoins) VALUES (?, ?, ?)',
               (data['telegram_id'], data['username'], data.get('gcoins', 0)))
    db.commit()
    return {'status': 'ok'}

@app.route('/api/inventory/<telegram_id>', methods=['GET'])
def get_inventory(telegram_id):
    db = get_db()
    user = db.execute('SELECT id FROM users WHERE telegram_id = ?', (telegram_id,)).fetchone()
    if not user:
        return [], 404
    items = db.execute('''
        SELECT nfts.* FROM user_inventory
        JOIN nfts ON user_inventory.nft_id = nfts.id
        WHERE user_inventory.user_id = ?
    ''', (user['id'],)).fetchall()
    return jsonify([dict(item) for item in items])

# ...добавьте другие нужные эндпоинты (открытие кейса, статистика и т.д.)

if __name__ == '__main__':
    app.run(debug=True)