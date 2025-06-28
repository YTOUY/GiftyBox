# GiftyBox - NFT Case Opening Game

Мини-игра для открытия кейсов с NFT подарками, интегрированная с Supabase для хранения данных.

## 🚀 Быстрый старт

### 1. Клонирование проекта
```bash
git clone <your-repo-url>
cd GiftyBox
```

### 2. Настройка Supabase
1. Создайте проект на [supabase.com](https://supabase.com)
2. Выполните SQL команды из файла `SUPABASE_SETUP.md`
3. Скопируйте URL и anon key из настроек проекта

### 3. Обновление ключей
Замените в файлах:
- `netlify/functions/api.js` (строки 4-5)
- `script.js` (строки 2-3)

### 4. Развертывание
Проект автоматически развернется на Netlify при пуше в репозиторий.

## 📁 Структура проекта

```
GiftyBox/
├── assets/nft/          # GIF анимации NFT
├── netlify/
│   └── functions/
│       ├── api.js       # Serverless функции
│       └── package.json # Зависимости
├── index.html           # Главная страница
├── script.js            # Основная логика
├── styles.css           # Стили
└── SUPABASE_SETUP.md    # Инструкции по настройке БД
```

## 🎮 Функции

- **Анимация рулетки**: Плавная анимация с разгоном и замедлением
- **Система кейсов**: 6 типов кейсов с разными редкостями
- **Инвентарь**: Сохранение и отображение полученных NFT
- **Статистика**: Отслеживание открытий и трат
- **Персистентность**: Данные сохраняются в Supabase

## 🛠 Технологии

- **Frontend**: HTML5, CSS3, JavaScript (ES6+)
- **Backend**: Netlify Functions
- **Database**: Supabase (PostgreSQL)
- **Deployment**: Netlify
- **Animations**: CSS Transitions + JavaScript

## 📊 База данных

### Таблицы:
- `users` - пользователи и их баланс
- `nfts` - информация о NFT
- `cases` - типы кейсов
- `inventory` - инвентарь пользователей
- `user_stats` - статистика пользователей

## 🎯 API Endpoints

### POST /.netlify/functions/api

**Действия:**
- `openCase` - открытие кейса
- `getInventory` - получение инвентаря
- `getUserStats` - получение статистики
- `getUser` - получение данных пользователя

## 🔧 Разработка

### Локальный запуск
```bash
# Установка зависимостей
cd netlify/functions
npm install

# Запуск Netlify Dev
netlify dev
```

### Тестирование
1. Откройте приложение
2. Попробуйте открыть кейс
3. Проверьте сохранение в Supabase
4. Обновите страницу для проверки загрузки данных

## 🐛 Возможные проблемы

### CORS ошибки
Добавьте домен в настройки Supabase:
Settings > API > Additional Allowed Origins

### Ошибки RLS
Временно отключите Row Level Security для тестирования.

### Проблемы с анимацией
Проверьте, что все GIF файлы загружаются корректно.

## 📈 Планы развития

- [ ] Аутентификация пользователей
- [ ] Система достижений
- [ ] Торговля NFT
- [ ] Реферальная система
- [ ] Мобильное приложение

## 📄 Лицензия

MIT License

## 🤝 Поддержка

При возникновении проблем создайте issue в репозитории.

# GiftyBox - TON Кошелек Интеграция

## 🚀 Настройка TON-кошелька для проекта

### Способы получения адреса кошелька:

#### 1. **Через Tonkeeper (Рекомендуется)**
1. Перейдите на [tonkeeper.com](https://tonkeeper.com)
2. Создайте новый кошелек
3. Скопируйте адрес (начинается с `EQ...`)
4. Замените в `script.js` строку `destinationAddress`

#### 2. **Через MyTonWallet**
1. Перейдите на [mytonwallet.org](https://mytonwallet.org)
2. Создайте новый кошелек
3. Скопируйте адрес
4. Замените в коде

#### 3. **Через любой TON-кошелек**
- OpenMask: [openmask.app](https://openmask.app)
- Tonhub: [tonhub.com](https://tonhub.com)
- TonSafe: [tonsafe.com](https://tonsafe.com)
- TonSpace: [tonspacewallet.com](https://tonspacewallet.com)

### 🔧 Замена адреса в коде:

Откройте файл `script.js` и найдите строку:
```javascript
const destinationAddress = 'EQD4FPq-PRDieyQKkizFTRtSDyucUIqrj0v_zXJmqaDp6_0t';
```

Замените на ваш реальный адрес:
```javascript
const destinationAddress = 'EQВАШ_РЕАЛЬНЫЙ_АДРЕС_КОШЕЛЬКА';
```

### ⚠️ Важные моменты:

1. **Безопасность**: Храните seed-фразу в безопасном месте
2. **Тестирование**: Сначала протестируйте с небольшими суммами
3. **Резервное копирование**: Сделайте бэкап кошелька
4. **Мониторинг**: Настройте уведомления о транзакциях

### 🎯 Текущий статус:

- ✅ Иконки кошельков добавлены
- ✅ TON Connect 2 интеграция готова
- ✅ API для пополнения баланса настроен
- ⚠️ Нужно заменить тестовый адрес на реальный

### 📱 Поддерживаемые кошельки:

- Tonkeeper
- MyTonWallet  
- OpenMask
- Tonhub
- TonSafe
- TonSpace
- И все остальные TON-кошельки 