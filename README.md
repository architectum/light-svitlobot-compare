# Svitlobot Compare

Моніторинг відключень світла з даними з Telegram каналів Svitlobot.

## Архітектура деплою

Цей проект підтримує два варіанти деплою:

| Компонент | Варіант 1 (Firebase) | Варіант 2 (Firebase + Vercel) |
|-----------|---------------------|-------------------------------|
| **Frontend** | Firebase Hosting | Firebase Hosting |
| **Backend API** | Firebase Functions | Vercel Serverless |
| **Database** | Firestore | Firestore |

---

## 🔑 Firebase Credentials (FIREBASE_PRIVATE_KEY)

### Що це таке?

`FIREBASE_PRIVATE_KEY` — це приватний ключ сервісного акаунту Firebase, який дозволяє серверу (backend) автентифікуватись у Firebase Admin SDK для доступу до Firestore.

### Чому він потрібен?

- **Client-side Firebase SDK** (у браузері) використовує публічні ключі (`apiKey`, `projectId`) — вони безпечні для публікації
- **Server-side Firebase Admin SDK** потребує приватний ключ для повного доступу до бази даних без обмежень Security Rules

### Як отримати Firebase credentials?

1. Перейдіть до [Firebase Console](https://console.firebase.google.com/)
2. Виберіть ваш проект (або створіть новий)
3. Перейдіть до **Project Settings** (⚙️ іконка) → **Service accounts**
4. Натисніть **"Generate new private key"**
5. Завантажиться JSON файл з такою структурою:

```json
{
  "type": "service_account",
  "project_id": "your-project-id",
  "private_key_id": "...",
  "private_key": "-----BEGIN PRIVATE KEY-----\n...\n-----END PRIVATE KEY-----\n",
  "client_email": "firebase-adminsdk-xxxxx@your-project-id.iam.gserviceaccount.com",
  "client_id": "...",
  ...
}
```

6. З цього файлу візьміть:
   - `FIREBASE_PROJECT_ID` = `project_id`
   - `FIREBASE_CLIENT_EMAIL` = `client_email`
   - `FIREBASE_PRIVATE_KEY` = `private_key` (весь рядок включно з `-----BEGIN...`)

### ⚠️ Важливо про FIREBASE_PRIVATE_KEY

- **Ніколи не комітьте** цей ключ у Git!
- При копіюванні в `.env` файл, замініть реальні переноси рядків на `\n`:
  ```
  FIREBASE_PRIVATE_KEY="-----BEGIN PRIVATE KEY-----\nMIIEvQ...\n-----END PRIVATE KEY-----\n"
  ```
- У Vercel Dashboard вставляйте ключ як є (з реальними переносами рядків)

### Demo режим (без credentials)

Якщо ви не налаштували Firebase credentials, сервер запуститься в **demo режимі** з тестовими даними. Це зручно для локальної розробки та тестування UI.

---

## Варіант 1: Firebase Hosting + Functions (повністю Firebase)

### Prerequisites

```bash
npm install -g firebase-tools
firebase login
```

### Кроки деплою

```bash
# 1. Встановити залежності
npm install
cd functions && npm install && cd ..

# 2. Зібрати клієнт
npm run build

# 3. Задеплоїти
firebase deploy --only hosting,functions
```

### Environment Variables для Functions

```bash
firebase functions:config:set \
  firebase.project_id="your-project-id" \
  firebase.client_email="your-client-email" \
  firebase.private_key="your-private-key"
```

---

## Варіант 2: Firebase Hosting (client) + Vercel Serverless (API)

Цей варіант дозволяє хостити API на Vercel безкоштовно.

### Структура API endpoints на Vercel

```
api/
├── _lib/           # Спільний код (не експортується як endpoints)
│   ├── cors.ts
│   ├── firebase.ts
│   ├── scraper.ts
│   ├── storage.ts
│   └── types.ts
├── locations/
│   ├── index.ts        → GET /api/locations
│   ├── [id].ts         → GET /api/locations/:id
│   └── [id]/
│       └── scan.ts     → POST /api/locations/:id/scan
├── download/
│   ├── all.ts          → GET /api/download/all
│   └── [id].ts         → GET /api/download/:id
├── scan-all.ts         → POST /api/scan-all
└── charts-data.ts      → GET /api/charts-data
```

### Крок 1: Деплой API на Vercel

1. Створіть акаунт на [vercel.com](https://vercel.com)
2. Підключіть ваш GitHub репозиторій
3. У Vercel Dashboard → Settings → Environment Variables додайте:
   - `FIREBASE_PROJECT_ID`
   - `FIREBASE_CLIENT_EMAIL`
   - `FIREBASE_PRIVATE_KEY`

4. Vercel автоматично задеплоїть при push до main

Або через CLI:
```bash
npm i -g vercel
vercel login
vercel --prod
```

### Крок 2: Оновіть клієнт для використання Vercel API

Створіть/оновіть `.env` файл для клієнта:

```env
VITE_API_URL=https://your-vercel-app.vercel.app
```

### Крок 3: Деплой клієнта на Firebase Hosting

```bash
npm run build
firebase deploy --only hosting
```

### Налаштування CORS

API endpoints вже налаштовані для CORS. Якщо потрібно обмежити origins, відредагуйте [`api/_lib/cors.ts`](api/_lib/cors.ts:1).

---

## Локальна розробка

### Без Firebase credentials (Demo режим)

```bash
npm install
npm run dev
```

Сервер запуститься з тестовими даними.

### З Firebase credentials

Створіть `.env` файл:

```env
FIREBASE_PROJECT_ID=your-project-id
FIREBASE_CLIENT_EMAIL=firebase-adminsdk-xxxxx@your-project-id.iam.gserviceaccount.com
FIREBASE_PRIVATE_KEY="-----BEGIN PRIVATE KEY-----\n...\n-----END PRIVATE KEY-----\n"
```

```bash
npm install
npm run dev
```

---

## API Endpoints

| Method | Endpoint | Опис |
|--------|----------|------|
| GET | `/api/locations` | Список всіх локацій з подіями |
| GET | `/api/locations/:id` | Деталі однієї локації |
| POST | `/api/locations/:id/scan` | Сканувати Telegram канал локації |
| POST | `/api/scan-all` | Сканувати всі локації |
| GET | `/api/download/all` | Завантажити всі дані як JSON |
| GET | `/api/download/:id` | Завантажити дані локації як JSON |
| GET | `/api/charts-data` | Дані для графіків |

---

## Безкоштовні ліміти

### Firebase (Spark Plan)
- Hosting: 10 GB storage, 360 MB/day bandwidth
- Firestore: 1 GiB storage, 50K reads/day, 20K writes/day
- Functions: 125K invocations/month

### Vercel (Hobby Plan)
- 100 GB bandwidth/month
- Serverless Function execution: 100 GB-hours/month
- Unlimited deployments

---

## Troubleshooting

### "Firebase credentials are missing"

Переконайтесь, що всі три змінні середовища встановлені:
- `FIREBASE_PROJECT_ID`
- `FIREBASE_CLIENT_EMAIL`
- `FIREBASE_PRIVATE_KEY`

### CORS помилки

Перевірте, що ваш домен дозволений у [`api/_lib/cors.ts`](api/_lib/cors.ts:1).

### Vercel функції не працюють

1. Перевірте логи у Vercel Dashboard → Functions
2. Переконайтесь, що `@vercel/node` встановлений
3. Перевірте структуру файлів у `api/` директорії
