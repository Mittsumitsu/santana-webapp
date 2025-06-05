// 🇯🇵 日本語認証メール対応版 src/firebase/config.js
import { initializeApp } from 'firebase/app';
import { getAuth } from 'firebase/auth';
import { getFirestore } from 'firebase/firestore';

// Firebase設定
const firebaseConfig = {
  apiKey: process.env.REACT_APP_FIREBASE_API_KEY,
  authDomain: process.env.REACT_APP_FIREBASE_AUTH_DOMAIN,
  projectId: process.env.REACT_APP_FIREBASE_PROJECT_ID,
  storageBucket: process.env.REACT_APP_FIREBASE_STORAGE_BUCKET,
  messagingSenderId: process.env.REACT_APP_FIREBASE_MESSAGING_SENDER_ID,
  appId: process.env.REACT_APP_FIREBASE_APP_ID,
  measurementId: process.env.REACT_APP_FIREBASE_MEASUREMENT_ID
};

// 🔍 デバッグ用ログ
console.log('🔥 Firebase設定チェック:', {
  apiKey: process.env.REACT_APP_FIREBASE_API_KEY ? '✅ 設定済み' : '❌ 未設定',
  authDomain: process.env.REACT_APP_FIREBASE_AUTH_DOMAIN ? '✅ 設定済み' : '❌ 未設定',
  projectId: process.env.REACT_APP_FIREBASE_PROJECT_ID ? '✅ 設定済み' : '❌ 未設定',
  storageBucket: process.env.REACT_APP_FIREBASE_STORAGE_BUCKET ? '✅ 設定済み' : '❌ 未設定',
  messagingSenderId: process.env.REACT_APP_FIREBASE_MESSAGING_SENDER_ID ? '✅ 設定済み' : '❌ 未設定',
  appId: process.env.REACT_APP_FIREBASE_APP_ID ? '✅ 設定済み' : '❌ 未設定',
});

console.log('🆔 プロジェクトID:', process.env.REACT_APP_FIREBASE_PROJECT_ID);

// Firebase初期化
const app = initializeApp(firebaseConfig);

// Firebase Authentication
export const auth = getAuth(app);

// 🇯🇵 日本語設定
auth.languageCode = 'ja';

// Firestore Database
export const db = getFirestore(app);

// デフォルトエクスポート
export default app;