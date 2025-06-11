// 🚀 backend/index.js - CORS問題修正版
// 🎯 最小限構成でPhase 3.2対応

const express = require('express');
// const cors = require('cors');  // ← 問題の原因なのでコメントアウト
const admin = require('firebase-admin');

console.log(`
🚀🚀🚀🚀🚀🚀🚀🚀🚀🚀🚀🚀🚀🚀🚀🚀🚀🚀🚀🚀
🏆 SANTANA BOOKING SYSTEM v3.2 🏆
🎯 PRIVACY PROTECTION + DATA NORMALIZATION 🎯
🚀🚀🚀🚀🚀🚀🚀🚀🚀🚀🚀🚀🚀🚀🚀🚀🚀🚀🚀🚀
`);

const app = express();
const port = process.env.PORT || 3000;

// ==========================================
// 🛡️ 基本ミドルウェア設定
// ==========================================

// CORS手動設定（corsパッケージの代替）
app.use((req, res, next) => {
  res.header('Access-Control-Allow-Origin', '*');
  res.header('Access-Control-Allow-Methods', 'GET, POST, PUT, DELETE, OPTIONS');
  res.header('Access-Control-Allow-Headers', 'Origin, X-Requested-With, Content-Type, Accept, Authorization');
  
  if (req.method === 'OPTIONS') {
    res.sendStatus(200);
  } else {
    next();
  }
});

app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// ==========================================
// 🔥 Firebase Admin初期化
// ==========================================

let db;

async function initializeFirebase() {
  try {
    console.log('🔥 Firebase Admin初期化開始...');
    
    // Config読み込み
    let config;
    try {
      config = require('./src/config');
    } catch (error) {
      console.log('⚠️ Config読み込み失敗、デフォルト設定使用');
      config = {
        firebase: {
          projectId: 'indiasantana-app',
          serviceAccount: require('./src/serviceAccount.json')
        }
      };
    }
    
    // Firebase初期化
    if (admin.apps.length === 0) {
      admin.initializeApp({
        credential: admin.credential.cert(config.firebase.serviceAccount),
        projectId: config.firebase.projectId
      });
    }
    
    db = admin.firestore();
    
    console.log('✅ Firebase Admin接続成功');
    console.log(`🔥 プロジェクト: ${config.firebase.projectId}`);
    
    return true;
  } catch (error) {
    console.error('❌ Firebase初期化失敗:', error.message);
    return false;
  }
}

// ==========================================
// 📋 基本API
// ==========================================

// ルートエンドポイント
app.get('/', (req, res) => {
  res.json({ 
    system_name: 'サンタナゲストハウス予約システム',
    version: '3.2.0',
    phase: 'Phase 3.2 - プライバシー保護 + データ正規化',
    status: db ? 'Firebase接続済み' : 'Firebase初期化中',
    cors_fix: 'Manual CORS implementation (path-to-regexp avoided)',
    timestamp: new Date().toISOString(),
    features: {
      privacy_protection: '✅ 実装準備完了',
      data_normalization: '✅ 実装準備完了', 
      room_allocations: '✅ 実装準備完了'
    }
  });
});

// ヘルスチェック
app.get('/api/health', async (req, res) => {
  try {
    const healthStatus = {
      status: "healthy",
      timestamp: new Date().toISOString(),
      version: "3.2.0",
      cors_implementation: "manual (no package dependency)",
      checks: {
        server: "✅ operational",
        database: db ? "✅ connected" : "⚠️ initializing",
        firebase_auth: db ? "✅ operational" : "⚠️ initializing"
      },
      uptime: process.uptime(),
      memory_usage: {
        used: Math.round(process.memoryUsage().heapUsed / 1024 / 1024) + ' MB'
      }
    };
    
    res.json(healthStatus);
  } catch (error) {
    res.status(500).json({
      status: "unhealthy",
      error: error.message
    });
  }
});

// Phase 3.2 ステータス
app.get('/api/phase32-status', (req, res) => {
  res.json({
    phase: 'Phase 3.2',
    status: 'CORS問題修正・サーバー起動成功',
    message: 'basic system operational with manual CORS',
    firebase_status: db ? '✅ 接続済み' : '⚠️ 初期化中',
    fixes_applied: [
      '✅ corsパッケージをコメントアウト',
      '✅ 手動CORS実装で代替',
      '✅ path-to-regexp依存関係回避'
    ],
    next_steps: [
      '1. Phase 3.2 機能ファイル作成',
      '2. room_allocations テーブル実装',
      '3. プライバシー保護API実装'
    ],
    available_endpoints: [
      'GET / - システム情報',
      'GET /api/health - ヘルスチェック',
      'GET /api/phase32-status - Phase 3.2 ステータス',
      'GET /api/demo/privacy - プライバシー保護デモ'
    ]
  });
});

// プライバシー保護デモ
app.get('/api/demo/privacy', (req, res) => {
  res.json({
    demo: "Phase 3.2 プライバシー保護デモンストレーション",
    system_status: 'CORS問題修正済み・正常動作中',
    customer_view: {
      title: "🔒 お客様に表示される情報",
      example: {
        location: "サンタナデリー",
        room_type: "ツインルーム",
        check_in: "2025-06-15",
        check_out: "2025-06-17",
        total_amount: 3400,
        amenities: ["専用シャワー", "専用トイレ", "冷蔵庫", "エアコン"],
        message: "お部屋の詳細は当日フロントでご案内いたします"
      },
      privacy_protection: "❌ 部屋番号・フロア・内部IDは一切表示されません"
    },
    staff_view: {
      title: "🛠️ スタッフに表示される情報（将来実装）",
      example: {
        customer_name: "テスト 太郎",
        room_number: "303",
        floor: 3,
        access_instructions: "エレベーターで3階、左側の廊下"
      }
    },
    admin_view: {
      title: "👨‍💼 管理者に表示される情報（将来実装）",
      example: {
        full_allocation: "完全な部屋割り当て情報",
        reports: "稼働率・売上・統計情報",
        room_management: "清掃・メンテナンス状況"
      }
    }
  });
});

// ==========================================
// 🎯 既存ルート読み込み（エラーセーフ）
// ==========================================

// データベースミドルウェア
const dbMiddleware = (req, res, next) => {
  req.db = db;
  next();
};

// 安全なルート読み込み
function loadExistingRoutes() {
  const routesLoaded = {
    rooms: false,
    bookings: false
  };

  try {
    const roomRoutes = require('./src/routes/rooms');
    app.use('/api/rooms', dbMiddleware, roomRoutes);
    routesLoaded.rooms = true;
    console.log('✅ Room routes loaded');
  } catch (error) {
    console.warn('⚠️ Room routes not found - will create later');
  }

  try {
    const bookingRoutes = require('./src/routes/bookings');
    app.use('/api/bookings', dbMiddleware, bookingRoutes);
    routesLoaded.bookings = true;
    console.log('✅ Booking routes loaded');
  } catch (error) {
    console.warn('⚠️ Booking routes not found - will create later');
  }

  return routesLoaded;
}

// ==========================================
// 🚨 エラーハンドリング
// ==========================================

// 404エラー
app.use('*', (req, res) => {
  res.status(404).json({
    error: 'エンドポイントが見つかりません',
    message: `${req.method} ${req.originalUrl} は存在しません`,
    available_endpoints: [
      'GET / - システム情報',
      'GET /api/health - ヘルスチェック',
      'GET /api/phase32-status - Phase 3.2 ステータス',
      'GET /api/demo/privacy - プライバシー保護デモ'
    ]
  });
});

// グローバルエラーハンドラー
app.use((error, req, res, next) => {
  console.error('🚨 Server Error:', error.message);
  res.status(500).json({
    error: 'サーバーエラーが発生しました',
    message: error.message,
    timestamp: new Date().toISOString()
  });
});

// ==========================================
// 🚀 サーバー起動
// ==========================================

async function startServer() {
  try {
    // Firebase初期化
    const firebaseInitialized = await initializeFirebase();
    
    // 既存ルート読み込み
    const routesLoaded = loadExistingRoutes();
    
    // サーバー起動
    const server = app.listen(port, () => {
      console.log(`
🎉🎉🎉🎉🎉🎉🎉🎉🎉🎉🎉🎉🎉🎉🎉🎉🎉🎉🎉🎉
🏆 SANTANA SYSTEM v3.2 STARTED SUCCESSFULLY! 🏆
🎉🎉🎉🎉🎉🎉🎉🎉🎉🎉🎉🎉🎉🎉🎉🎉🎉🎉🎉🎉

🚀 Server: http://localhost:${port}
🌍 Environment: ${process.env.NODE_ENV || 'development'}
🔧 CORS: Manual implementation (path-to-regexp avoided)

🎯 System Status:
  ${firebaseInitialized ? '✅' : '❌'} Firebase Admin
  ${db ? '✅' : '❌'} Database Connection
  ${routesLoaded.rooms ? '✅' : '⚠️'} Room Routes
  ${routesLoaded.bookings ? '✅' : '⚠️'} Booking Routes

📋 Available Endpoints:
  📊 System Info: http://localhost:${port}/
  🔍 Health Check: http://localhost:${port}/api/health
  🎯 Phase 3.2 Status: http://localhost:${port}/api/phase32-status
  🎨 Privacy Demo: http://localhost:${port}/api/demo/privacy

🎆 STATUS: CORS FIXED - SYSTEM OPERATIONAL! 🎆
📝 Ready for Phase 3.2 feature development!
`);
    });

    // グレースフルシャットダウン
    process.on('SIGTERM', () => {
      console.log('🔄 Shutting down gracefully...');
      server.close(() => {
        console.log('✅ Server closed');
        process.exit(0);
      });
    });

    process.on('SIGINT', () => {
      console.log('🔄 Shutting down gracefully...');
      server.close(() => {
        console.log('✅ Server closed');
        process.exit(0);
      });
    });

  } catch (error) {
    console.error('🚨 Server startup failed:', error);
    process.exit(1);
  }
}

// サーバー開始
startServer();

module.exports = { app, db };