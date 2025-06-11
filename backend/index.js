// backend/index.js - 管理者API追加版（完全版）
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
  
  const firebaseApp = admin.initializeApp({
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
    timestamp: new Date().toISOString(),
    version: '3.2.0',
    features: [
      'Room Management',
      'Booking System', 
      'User Profiles',
      'Auto-fill Forms',
      'Admin Dashboard'
    ]
  });
});

// Import routes
const roomRoutes = require('./src/routes/rooms');
const bookingRoutes = require('./src/routes/bookings');
// 🆕 新機能: ユーザールート追加
const userRoutes = require('./src/routes/users');

// Use routes with database
const db = admin.firestore();

// Database middleware for all routes
const dbMiddleware = (req, res, next) => {
  req.db = db;
  next();
};

// API routes
app.use('/api/rooms', dbMiddleware, roomRoutes);
app.use('/api/bookings', dbMiddleware, bookingRoutes);
// 🆕 新機能: ユーザー関連API追加
app.use('/api/users', dbMiddleware, userRoutes);

// 🛠️ 管理者専用API（一時実装）
app.get('/api/admin/bookings', dbMiddleware, async (req, res) => {
  try {
    console.log('🛠️ 管理者: 予約一覧取得');
    
    // 全予約を取得（管理者なので全情報表示）
    const bookingsSnapshot = await req.db.collection('bookings').get();
    const bookings = [];
    
    bookingsSnapshot.forEach(doc => {
      bookings.push({
        id: doc.id,
        ...doc.data()
      });
    });
    
    console.log(`✅ 管理者: ${bookings.length}件の予約を取得`);
    res.json(bookings);
    
  } catch (error) {
    console.error('❌ 管理者予約取得エラー:', error);
    res.status(500).json({ 
      error: '予約データの取得に失敗しました',
      message: error.message 
    });
  }
});

app.get('/api/admin/rooms', dbMiddleware, async (req, res) => {
  try {
    console.log('🛠️ 管理者: 部屋一覧取得');
    
    // 全部屋情報を取得（管理者なので部屋番号等も含む）
    const roomsSnapshot = await req.db.collection('rooms').get();
    const rooms = [];
    
    roomsSnapshot.forEach(doc => {
      rooms.push({
        id: doc.id,
        ...doc.data()
      });
    });
    
    console.log(`✅ 管理者: ${rooms.length}件の部屋を取得`);
    res.json(rooms);
    
  } catch (error) {
    console.error('❌ 管理者部屋取得エラー:', error);
    res.status(500).json({ 
      error: '部屋データの取得に失敗しました',
      message: error.message 
    });
  }
});

app.get('/api/admin/room-allocations', dbMiddleware, async (req, res) => {
  try {
    console.log('🛠️ 管理者: 部屋割り当て一覧取得');
    
    // 部屋割り当て情報を取得
    const allocationsSnapshot = await req.db.collection('room_allocations').get();
    const allocations = [];
    
    allocationsSnapshot.forEach(doc => {
      allocations.push({
        id: doc.id,
        ...doc.data()
      });
    });
    
    console.log(`✅ 管理者: ${allocations.length}件の割り当てを取得`);
    res.json(allocations);
    
  } catch (error) {
    console.error('❌ 管理者割り当て取得エラー:', error);
    res.status(500).json({ 
      error: '割り当てデータの取得に失敗しました',
      message: error.message 
    });
  }
});

// 🔍 管理者用全ユーザー取得
app.get('/api/admin/users', dbMiddleware, async (req, res) => {
  try {
    console.log('🛠️ 管理者: 全ユーザー一覧取得');
    
    const usersSnapshot = await req.db.collection('users').get();
    const users = [];
    
    usersSnapshot.forEach(doc => {
      const userData = doc.data();
      // 管理者には全情報を表示（パスワード等は除く）
      const { password, private_key, ...safeUserData } = userData;
      users.push({
        id: doc.id,
        ...safeUserData
      });
    });
    
    console.log(`✅ 管理者: ${users.length}人のユーザーを取得`);
    res.json(users);
    
  } catch (error) {
    console.error('❌ 管理者ユーザー取得エラー:', error);
    res.status(500).json({ 
      error: 'ユーザーデータの取得に失敗しました',
      message: error.message 
    });
  }
});

// Health check endpoint
app.get('/health', (req, res) => {
  res.json({
    status: 'healthy',
    timestamp: new Date().toISOString(),
    uptime: process.uptime(),
    memory: process.memoryUsage(),
    firebase: {
      connected: !!admin.apps.length,
      project: config.firebase.projectId
    }
  });
});

// API documentation endpoint
app.get('/api', (req, res) => {
  res.json({
    name: 'サンタナゲストハウス予約システム API',
    version: '3.2.0',
    endpoints: {
      rooms: {
        'GET /api/rooms': '全部屋一覧取得',
        'GET /api/rooms/available': '利用可能部屋検索',
        'GET /api/rooms/:id': '特定部屋詳細取得',
        'POST /api/rooms': '部屋作成',
        'PUT /api/rooms/:id': '部屋情報更新',
        'DELETE /api/rooms/:id': '部屋削除'
      },
      bookings: {
        'GET /api/bookings': '全予約一覧取得',
        'GET /api/bookings/user/:userId': 'ユーザー予約一覧取得',
        'GET /api/bookings/:id': '特定予約詳細取得',
        'POST /api/bookings': '予約作成',
        'POST /api/bookings/validate': '予約バリデーション',
        'PUT /api/bookings/:id': '予約更新',
        'DELETE /api/bookings/:id': '予約キャンセル'
      },
      users: {
        'GET /api/users/:userId': 'ユーザー情報取得',
        'PUT /api/users/:userId': 'ユーザー情報更新',
        'DELETE /api/users/:userId': 'ユーザー削除',
        'GET /api/users/:userId/profiles': 'プロフィール一覧取得',
        'POST /api/users/:userId/profiles': 'プロフィール作成',
        'PUT /api/users/:userId/profiles/:profileId': 'プロフィール更新',
        'DELETE /api/users/:userId/profiles/:profileId': 'プロフィール削除',
        'POST /api/users/:userId/profiles/:profileId/default': 'デフォルトプロフィール設定'
      },
      admin: {
        'GET /api/admin/bookings': '管理者: 全予約一覧',
        'GET /api/admin/rooms': '管理者: 全部屋一覧',
        'GET /api/admin/room-allocations': '管理者: 部屋割り当て一覧',
        'GET /api/admin/users': '管理者: 全ユーザー一覧'
      }
    },
    authentication: 'Firebase Auth',
    database: 'Cloud Firestore',
    id_system: 'U_XXXXXXXX (Users), B_XXXXXXXXXXXX (Bookings), P_XXXXXXXX_XXXXXX (Profiles)'
  });
});

// 404 handler
app.use('*', (req, res) => {
  res.status(404).json({
    error: 'Not Found',
    message: `Route ${req.originalUrl} not found`,
    availableRoutes: [
      'GET /',
      'GET /health', 
      'GET /api',
      'GET /api/rooms',
      'GET /api/bookings',
      'GET /api/users/:userId',
      'GET /api/admin/bookings',
      'GET /api/admin/rooms',
      'GET /api/admin/room-allocations',
      'GET /api/admin/users'
    ]
  });
});

// Global error handler
app.use((error, req, res, next) => {
  console.error('💥 サーバーエラー:', error);
  
  // Firebase Admin SDK specific errors
  if (error.code && error.code.startsWith('firebase')) {
    return res.status(500).json({
      error: 'Firebase Error',
      code: error.code,
      message: error.message,
      timestamp: new Date().toISOString()
    });
  }
  
  // Validation errors
  if (error.name === 'ValidationError') {
    return res.status(400).json({
      error: 'Validation Error',
      message: error.message,
      timestamp: new Date().toISOString()
    });
  }
  
  // Generic server error
  res.status(500).json({ 
    error: 'Internal Server Error',
    message: error.message,
    timestamp: new Date().toISOString()
  });
});

// Graceful shutdown
process.on('SIGTERM', () => {
  console.log('🔄 SIGTERM signal received: closing HTTP server');
  server.close(() => {
    console.log('💤 HTTP server closed');
    // Close database connections
    admin.app().delete().then(() => {
      console.log('🔥 Firebase Admin disconnected');
      process.exit(0);
    });
  });
});

process.on('SIGINT', () => {
  console.log('🔄 SIGINT signal received: closing HTTP server');
  server.close(() => {
    console.log('💤 HTTP server closed');
    admin.app().delete().then(() => {
      console.log('🔥 Firebase Admin disconnected');
      process.exit(0);
    });
  });
});

// Start server
const server = app.listen(port, () => {
  console.log(`🚀 Server running on port ${port}`);
  console.log(`📡 API endpoints available at http://localhost:${port}/api`);
  console.log(`🔍 API documentation: http://localhost:${port}/api`);
  console.log(`❤️ Health check: http://localhost:${port}/health`);
  console.log(`🔥 Firebase project: ${config.firebase.projectId}`);
  console.log(`🆕 New user profile endpoints:`);
  console.log(`   GET    /api/users/:userId/profiles`);
  console.log(`   POST   /api/users/:userId/profiles`);
  console.log(`   PUT    /api/users/:userId/profiles/:profileId`);
  console.log(`   DELETE /api/users/:userId/profiles/:profileId`);
  console.log(`   POST   /api/users/:userId/profiles/:profileId/default`);
  console.log(`🛠️ 管理者用APIエンドポイント:`);
  console.log(`   GET    /api/admin/bookings - 全予約一覧`);
  console.log(`   GET    /api/admin/rooms - 全部屋一覧`);  
  console.log(`   GET    /api/admin/room-allocations - 部屋割り当て一覧`);
  console.log(`   GET    /api/admin/users - 全ユーザー一覧`);
  console.log(`📋 システム準備完了 - プロフィール自動入力機能有効`);
  console.log(`🛠️ 管理者ダッシュボード機能有効`);
});

// Export for use in routes
module.exports = { db: admin.firestore(), app, server };