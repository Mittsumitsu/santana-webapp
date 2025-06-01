// backend/index.js - Firebase初期化修正版
const express = require('express');
const cors = require('cors');
const admin = require('firebase-admin');
const config = require('./src/config');

const app = express();
const port = config.port;

// Middleware
app.use(cors());
app.use(express.json());

// Firebase Admin初期化
try {
  console.log('🔥 Firebase Admin初期化開始...');
  
  // 既存のアプリがあれば削除
  if (admin.apps.length > 0) {
    console.log('🔄 既存のFirebaseアプリを削除');
    admin.app().delete();
  }
  
  const app = admin.initializeApp({
    credential: admin.credential.cert(config.firebase.serviceAccount),
    projectId: config.firebase.projectId
  });
  
  console.log('✅ Firebase Admin接続成功');
  console.log(`🔥 プロジェクト: ${config.firebase.projectId}`);
  console.log(`📧 サービスアカウント: ${config.firebase.serviceAccount.client_email}`);
  
  // Firestoreテスト
  const db = admin.firestore();
  console.log('🗄️ Firestore初期化成功');
  
} catch (error) {
  console.error('❌ Firebase初期化失敗:', error.message);
  console.error('🔧 解決方法:');
  console.error('  1. serviceAccount.json が正しく配置されているか確認');
  console.error('  2. サービスアカウントキーが有効か確認');
  console.error('  3. プロジェクトIDが正しいか確認');
  process.exit(1);
}

// Routes
app.get('/', (req, res) => {
  res.json({ 
    message: 'サンタナゲストハウス予約システム',
    status: 'Firebase Admin接続済み',
    project: config.firebase.projectId,
    serviceAccount: config.firebase.serviceAccount.client_email,
    timestamp: new Date().toISOString()
  });
});

// Import routes
const roomRoutes = require('./src/routes/rooms');
const bookingRoutes = require('./src/routes/bookings');

// Use routes with database
const db = admin.firestore();

app.use('/api/rooms', (req, res, next) => {
  req.db = db;
  next();
}, roomRoutes);

app.use('/api/bookings', (req, res, next) => {
  req.db = db;
  next();
}, bookingRoutes);

// Global error handler
app.use((error, req, res, next) => {
  console.error('💥 サーバーエラー:', error);
  res.status(500).json({ 
    error: 'Internal server error',
    message: error.message,
    timestamp: new Date().toISOString()
  });
});

app.listen(port, () => {
  console.log(`🚀 Server running on port ${port}`);
  console.log(`📡 API endpoints available at http://localhost:${port}/api`);
  console.log(`🔥 Firebase project: ${config.firebase.projectId}`);
});

// Export for use in routes
module.exports = { db };