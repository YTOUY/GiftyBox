# Настройка Supabase для GiftyBox

## 1. Создание проекта в Supabase

1. Перейдите на [supabase.com](https://supabase.com)
2. Создайте новый проект
3. Запишите URL проекта и anon key

## 2. Создание таблиц в Supabase

Выполните следующие SQL команды в SQL Editor Supabase:

### Таблица пользователей
```sql
CREATE TABLE users (
    id TEXT PRIMARY KEY,
    gcoins INTEGER DEFAULT 1000,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);
```

### Таблица NFT
```sql
CREATE TABLE nfts (
    id TEXT PRIMARY KEY,
    name TEXT NOT NULL,
    rarity TEXT NOT NULL,
    stars INTEGER DEFAULT 0,
    gcoins INTEGER DEFAULT 0,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);
```

### Таблица кейсов
```sql
CREATE TABLE cases (
    id TEXT PRIMARY KEY,
    name TEXT NOT NULL,
    cost INTEGER NOT NULL,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);
```

### Таблица инвентаря
```sql
CREATE TABLE inventory (
    id SERIAL PRIMARY KEY,
    user_id TEXT REFERENCES users(id) ON DELETE CASCADE,
    nft_id TEXT REFERENCES nfts(id) ON DELETE CASCADE,
    case_id TEXT REFERENCES cases(id) ON DELETE CASCADE,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);
```

### Таблица статистики пользователей
```sql
CREATE TABLE user_stats (
    user_id TEXT PRIMARY KEY REFERENCES users(id) ON DELETE CASCADE,
    cases_opened INTEGER DEFAULT 0,
    total_spent INTEGER DEFAULT 0,
    total_earned INTEGER DEFAULT 0,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);
```

## 3. Заполнение данных NFT

```sql
INSERT INTO nfts (id, name, rarity, stars, gcoins) VALUES
-- Basic NFTs
('teddybear', 'Мишка', 'basic', 15, 0),
('heart', 'Сердце', 'basic', 15, 0),
('rose', 'Роза', 'basic', 25, 0),
('rocket', 'Ракета', 'basic', 50, 0),
('trophy', 'Кубок', 'basic', 100, 0),
('lunar-snake', 'Lunar Snake', 'basic', 75, 0),

-- Standard NFTs
('desk-calendar', 'Desk Calendar', 'standard', 30, 0),
('b-day-candle', 'B-Day Candle', 'standard', 40, 0),
('jester-hat', 'Jester Hat', 'standard', 45, 0),

-- Rare NFTs
('evil-eye', 'Evil Eye', 'rare', 80, 0),
('homemade-cake', 'Homemade Cake', 'rare', 90, 0),
('easter-egg', 'Easter Egg', 'rare', 95, 0),

-- Epic NFTs
('light-sword', 'Light Sword', 'epic', 150, 0),
('eternal-candle', 'Eternal Candle', 'epic', 180, 0),
('candy-cane', 'Candy Cane', 'epic', 200, 0),

-- Legendary NFTs
('jelly-bunny', 'Jelly Bunny', 'legendary', 300, 0),
('ginger-cookie', 'Ginger Cookie', 'legendary', 350, 0),
('cookie-heart', 'Cookie Heart', 'legendary', 400, 0),

-- Mythic NFTs
('diamond-ring', 'Diamond Ring', 'mythic', 500, 0),
('neko-helmet', 'Neko Helmet', 'mythic', 600, 0),
('durov-cap', 'Durov Cap', 'mythic', 1000, 0),

-- Special GCoins
('gcoins-50', '50 GCoins', 'special', 0, 50),
('gcoins-200', '200 GCoins', 'special', 0, 200),
('gcoins-2500', '2500 GCoins', 'special', 0, 2500),
('gcoins-7000', '7000 GCoins', 'special', 0, 7000);
```

## 4. Заполнение данных кейсов

```sql
INSERT INTO cases (id, name, cost) VALUES
('basic', 'Basic Case', 100),
('standard', 'Standard Case', 250),
('rare', 'Rare Case', 500),
('epic', 'Epic Case', 1000),
('legendary', 'Legendary Case', 2000),
('mythic', 'Mythic Case', 5000);
```

## 5. Настройка RLS (Row Level Security)

Включите RLS для всех таблиц:

```sql
ALTER TABLE users ENABLE ROW LEVEL SECURITY;
ALTER TABLE nfts ENABLE ROW LEVEL SECURITY;
ALTER TABLE cases ENABLE ROW LEVEL SECURITY;
ALTER TABLE inventory ENABLE ROW LEVEL SECURITY;
ALTER TABLE user_stats ENABLE ROW LEVEL SECURITY;
```

Создайте политики для доступа:

```sql
-- Политики для users
CREATE POLICY "Users can view their own data" ON users
    FOR SELECT USING (auth.uid()::text = id);

CREATE POLICY "Users can insert their own data" ON users
    FOR INSERT WITH CHECK (auth.uid()::text = id);

CREATE POLICY "Users can update their own data" ON users
    FOR UPDATE USING (auth.uid()::text = id);

-- Политики для inventory
CREATE POLICY "Users can view their own inventory" ON inventory
    FOR SELECT USING (auth.uid()::text = user_id);

CREATE POLICY "Users can insert into their own inventory" ON inventory
    FOR INSERT WITH CHECK (auth.uid()::text = user_id);

-- Политики для user_stats
CREATE POLICY "Users can view their own stats" ON user_stats
    FOR SELECT USING (auth.uid()::text = user_id);

CREATE POLICY "Users can insert their own stats" ON user_stats
    FOR INSERT WITH CHECK (auth.uid()::text = user_id);

CREATE POLICY "Users can update their own stats" ON user_stats
    FOR UPDATE USING (auth.uid()::text = user_id);

-- Политики для nfts и cases (публичный доступ для чтения)
CREATE POLICY "Anyone can view nfts" ON nfts FOR SELECT USING (true);
CREATE POLICY "Anyone can view cases" ON cases FOR SELECT USING (true);
```

## 6. Обновление ключей в коде

### В файле `netlify/functions/api.js`:
Замените строки 4-5:
```javascript
const supabase = createClient(
    'https://your-project-url.supabase.co', // Замените на свой URL
    'your-anon-key' // Замените на свой anon key
);
```

### В файле `script.js`:
Замените строки 2-3:
```javascript
const SUPABASE_URL = 'https://your-project-url.supabase.co'; // Замените на свой URL
const SUPABASE_ANON_KEY = 'your-anon-key'; // Замените на свой anon key
```

## 7. Развертывание на Netlify

1. Убедитесь, что все файлы сохранены
2. Закоммитьте изменения в git
3. Запушьте в репозиторий
4. Netlify автоматически развернет обновления

## 8. Проверка работы

1. Откройте приложение
2. Попробуйте открыть кейс
3. Проверьте, что данные сохраняются в Supabase
4. Обновите страницу и убедитесь, что данные загружаются

## 9. Возможные проблемы

### Ошибка CORS
Если возникают ошибки CORS, добавьте в настройки Supabase:
- Перейдите в Settings > API
- Добавьте домен вашего сайта в "Additional Allowed Origins"

### Ошибки аутентификации
Если возникают ошибки с RLS, временно отключите RLS для тестирования:
```sql
ALTER TABLE users DISABLE ROW LEVEL SECURITY;
ALTER TABLE inventory DISABLE ROW LEVEL SECURITY;
ALTER TABLE user_stats DISABLE ROW LEVEL SECURITY;
```

## 10. Дополнительные функции

После базовой настройки можно добавить:
- Аутентификацию пользователей
- Статистику открытий
- Систему достижений
- Торговлю NFT между пользователями 