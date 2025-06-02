const express = require('express');
const cors = require('cors');
// const admin = require('firebase-admin');  // 一時的にコメントアウト

const app = express();
const port = 3000;

// Middleware
app.use(cors());
app.use(express.json());

// Firebase設定を一時的にコメントアウト
/*
try {
  const serviceAccount = require('./src/config.js');
  
  admin.initializeApp({
    credential: admin.credential.cert(serviceAccount)
  });
  
  console.log('Connected to Firebase');
} catch (error) {
  console.error('Firebase connection failed:', error.message);
}

const db = admin.firestore();
*/

// テスト用のモックデータ
const mockRooms = [
  {
    id: 'room1',
    name: 'ドミトリー男性用',
    type: 'dormitory',
    capacity: 6,
    price: 700,
    location: 'delhi',
    genderRestriction: 'male'
  },
  {
    id: 'room2', 
    name: 'ドミトリー女性用',
    type: 'dormitory',
    capacity: 4,
    price: 700,
    location: 'delhi',
    genderRestriction: 'female'
  },
  {
    id: 'room3',
    name: 'シングルルーム',
    type: 'single',
    capacity: 1,
    price: 1400,
    location: 'delhi',
    genderRestriction: null
  }
];

// Routes - テスト用の簡単なエンドポイント
app.get('/', (req, res) => {
  res.json({ 
    message: 'サンタナゲストハウス予約システム - テストモード',
    status: 'running',
    timestamp: new Date().toISOString()
  });
});

// 全部屋取得（モックデータ）
app.get('/api/rooms', (req, res) => {
  res.json({
    success: true,
    rooms: mockRooms
  });
});

// 空室検索（モックデータ）
app.get('/api/rooms/available', (req, res) => {
  const { checkIn, checkOut, maleGuests, femaleGuests, location } = req.query;
  
  console.log('検索パラメータ:', { checkIn, checkOut, maleGuests, femaleGuests, location });
  
  // 簡単なフィルタリング
  let availableRooms = mockRooms.filter(room => {
    if (location && room.location !== location) return false;
    return true;
  });
  
  // テスト用の組み合わせデータ（フロントエンドが期待する形式）
  const testCombinations = [
    {
      id: 'combo1',
      rooms: [
        {
          ...availableRooms[0],
          guestCount: parseInt(maleGuests || 0) + parseInt(femaleGuests || 0)
        }
      ],
      totalPrice: 700,
      efficiency: 100,
      checkIn: checkIn,
      checkOut: checkOut
    }
  ];
  
  if (availableRooms.length > 1) {
    testCombinations.push({
      id: 'combo2',
      rooms: [
        {
          ...availableRooms[1],
          guestCount: parseInt(maleGuests || 0) + parseInt(femaleGuests || 0)
        }
      ],
      totalPrice: 700,
      efficiency: 95,
      checkIn: checkIn,
      checkOut: checkOut
    });
  }
  
  res.json({
    success: true,
    searchParams: { checkIn, checkOut, maleGuests, femaleGuests, location },
    availableRooms: availableRooms,
    combinations: testCombinations
  });
});

// 特定部屋詳細
app.get('/api/rooms/:id', (req, res) => {
  const room = mockRooms.find(r => r.id === req.params.id);
  if (!room) {
    return res.status(404).json({ error: 'Room not found' });
  }
  res.json(room);
});

// 予約作成（モック）
app.post('/api/bookings', (req, res) => {
  console.log('予約データ受信:', req.body);
  res.json({
    success: true,
    bookingId: 'test-booking-' + Date.now(),
    message: '予約が作成されました（テストモード）'
  });
});

app.listen(port, () => {
  console.log(`🚀 Server running on port ${port}`);
  console.log(`📡 API endpoints available at http://localhost:${port}/api`);
  console.log(`🧪 Test mode - Firebase disabled`);
});