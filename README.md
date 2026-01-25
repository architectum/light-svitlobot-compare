# Firebase Deployment (Free Tier)

This guide explains how to build and deploy the app to Firebase Hosting using the free tier (Spark plan).

## Prerequisites

- Node.js 18+ installed
- A Firebase account with the Spark (free) plan
- Firebase CLI installed

```bash
npm install -g firebase-tools
```

## 1) Install dependencies

```bash
npm install
```

## 2) Build the client

This project uses Vite for the client build.

```bash
npm run build
```

The output will be in the Vite build directory (typically `dist`).

## 3) Initialize Firebase Hosting

Login to Firebase:

```bash
firebase login
```

Initialize Hosting in the project root:

```bash
firebase init hosting
```

Recommended answers:

- **Use an existing project** (or create one in the Firebase console)
- **Public directory**: `dist`
- **Single-page app**: `Yes` (if this is a SPA)
- **GitHub Actions**: optional

This will create `firebase.json` and `.firebaserc`.

## 4) Deploy to Firebase Hosting

```bash
firebase deploy --only hosting
```

Firebase will output the Hosting URL when the deploy completes.

## Environment Variables

If your app uses client-side environment variables, set them in `.env` files per Vite conventions (e.g., `VITE_` prefix) and ensure they are available during the build. Do not commit secrets.

## Updating Deploys

Repeat the build and deploy steps:

```bash
npm run build
firebase deploy --only hosting
```

## Notes on the Free Tier

- Spark plan includes limited Hosting bandwidth and storage.
- If you add Firebase Functions or other services, verify they remain within the free tier limits.

