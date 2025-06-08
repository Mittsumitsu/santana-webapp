#!/usr/bin/env node

// 🔍 Firestore部屋データ確認・修復スクリプト
// 💪 rooms.jsonとFirestoreの同期チェック！

const admin = require('firebase-admin');
const fs = require('fs').promises;
const path = require('path');

console.log(`
🔍🔍🔍🔍🔍🔍🔍🔍🔍🔍🔍🔍🔍🔍🔍🔍🔍🔍🔍🔍
🏠 FIRESTORE ROOMS DATA CHECK & REPAIR 🏠
💪 CHECK ROOMS.JSON VS FIRESTORE SYNC! 💪
🔍🔍🔍🔍🔍🔍🔍🔍🔍🔍🔍🔍🔍🔍🔍🔍🔍🔍🔍🔍
`);

class RoomsDataChecker {
  constructor() {
    this.stats = {
      json_rooms: 0,
      firestore_rooms: 0,
      missing_in_firestore: 0,
      extra_in_firestore: 0,
      synced_rooms: 0
    };
    this.roomsJsonData = [];
    this.firestoreRooms = [];
  }

  async initialize() {
    console.log('\n🔥 INITIALIZING...');
    
    try {
      const config = require('../src/config.js');
      
      if (admin.apps.length === 0) {
        admin.initializeApp({
          credential: admin.credential.cert(config.firebase.serviceAccount),
          projectId: config.firebase.projectId
        });
      }
      
      this.db = admin.firestore();
      console.log('✅ Firebase connection established!');
      return true;
      
    } catch (error) {
      console.error('❌ Firebase initialization failed:', error.message);
      return false;
    }
  }

  async loadRoomsJson() {
    console.log('\n📁 LOADING ROOMS.JSON...');
    
    try {
      // rooms.jsonファイルの場所を探す
      const possiblePaths = [
        path.join(__dirname, '../../rooms.json'),
        path.join(__dirname, '../rooms.json'),
        path.join(__dirname, './rooms.json'),
        path.join(process.cwd(), 'rooms.json')
      ];
      
      let roomsData = null;
      let usedPath = null;
      
      for (const filePath of possiblePaths) {
        try {
          const data = await fs.readFile(filePath, 'utf8');
          roomsData = JSON.parse(data);
          usedPath = filePath;
          break;
        } catch (err) {
          // ファイルが見つからない場合は次のパスを試す
          continue;
        }
      }
      
      if (!roomsData) {
        throw new Error('rooms.jsonファイルが見つかりません');
      }
      
      this.roomsJsonData = roomsData;
      this.stats.json_rooms = roomsData.length;
      
      console.log(`✅ rooms.json loaded from: ${usedPath}`);
      console.log(`📊 rooms.json contains: ${roomsData.length} rooms`);
      
      // 最初の3件を表示
      console.log('\n📋 SAMPLE ROOMS FROM JSON:');
      roomsData.slice(0, 3).forEach(room => {
        console.log(`  🏠 ${room.id} - ${room.name} (${room.room_type_id})`);
      });
      
      return true;
      
    } catch (error) {
      console.error('❌ Failed to load rooms.json:', error.message);
      return false;
    }
  }

  async loadFirestoreRooms() {
    console.log('\n🔥 LOADING FIRESTORE ROOMS...');
    
    try {
      const snapshot = await this.db.collection('rooms').get();
      
      this.firestoreRooms = [];
      snapshot.forEach(doc => {
        this.firestoreRooms.push({
          id: doc.id,
          ...doc.data()
        });
      });
      
      this.stats.firestore_rooms = this.firestoreRooms.length;
      
      console.log(`✅ Firestore rooms loaded: ${this.firestoreRooms.length} rooms`);
      
      // 最初の3件を表示
      console.log('\n📋 SAMPLE ROOMS FROM FIRESTORE:');
      this.firestoreRooms.slice(0, 3).forEach(room => {
        console.log(`  🏠 ${room.id} - ${room.name} (${room.room_type_id})`);
      });
      
      return true;
      
    } catch (error) {
      console.error('❌ Failed to load Firestore rooms:', error.message);
      return false;
    }
  }

  analyzeDataSync() {
    console.log('\n🔍 ANALYZING DATA SYNCHRONIZATION...');
    
    const jsonRoomIds = new Set(this.roomsJsonData.map(room => room.id));
    const firestoreRoomIds = new Set(this.firestoreRooms.map(room => room.id));
    
    // JSONにあってFirestoreにない部屋
    const missingInFirestore = this.roomsJsonData.filter(room => 
      !firestoreRoomIds.has(room.id)
    );
    
    // Firestoreにあってjsonにない部屋
    const extraInFirestore = this.firestoreRooms.filter(room => 
      !jsonRoomIds.has(room.id)
    );
    
    // 同期されている部屋
    const syncedRooms = this.roomsJsonData.filter(room => 
      firestoreRoomIds.has(room.id)
    );
    
    this.stats.missing_in_firestore = missingInFirestore.length;
    this.stats.extra_in_firestore = extraInFirestore.length;
    this.stats.synced_rooms = syncedRooms.length;
    
    console.log('\n📊 SYNCHRONIZATION ANALYSIS:');
    console.log(`✅ Synced rooms: ${syncedRooms.length}`);
    console.log(`❌ Missing in Firestore: ${missingInFirestore.length}`);
    console.log(`⚠️ Extra in Firestore: ${extraInFirestore.length}`);
    
    if (missingInFirestore.length > 0) {
      console.log('\n🔍 ROOMS MISSING IN FIRESTORE:');
      missingInFirestore.forEach(room => {
        console.log(`  ❌ ${room.id} - ${room.name} (${room.room_type_id})`);
      });
    }
    
    if (extraInFirestore.length > 0) {
      console.log('\n🔍 EXTRA ROOMS IN FIRESTORE:');
      extraInFirestore.forEach(room => {
        console.log(`  ⚠️ ${room.id} - ${room.name || 'No name'}`);
      });
    }
    
    // 特定の部屋をチェック
    const delhiRooms = ['delhi-101', 'delhi-201', 'delhi-202', 'delhi-301', 'delhi-302', 'delhi-401'];
    console.log('\n🏙️ DELHI ROOMS STATUS:');
    delhiRooms.forEach(roomId => {
      const inJson = jsonRoomIds.has(roomId);
      const inFirestore = firestoreRoomIds.has(roomId);
      const status = inJson && inFirestore ? '✅' : '❌';
      console.log(`  ${status} ${roomId} - JSON:${inJson} Firestore:${inFirestore}`);
    });
    
    return {
      missingInFirestore,
      extraInFirestore,
      syncedRooms
    };
  }

  async syncMissingRooms(missingRooms) {
    if (missingRooms.length === 0) {
      console.log('✅ No rooms need to be synced!');
      return true;
    }
    
    console.log(`\n🔄 SYNCING ${missingRooms.length} MISSING ROOMS TO FIRESTORE...`);
    
    try {
      const batch = this.db.batch();
      
      missingRooms.forEach(room => {
        const roomRef = this.db.collection('rooms').doc(room.id);
        batch.set(roomRef, room);
        console.log(`📋 Added to batch: ${room.id} - ${room.name}`);
      });
      
      console.log('\n💥 EXECUTING BATCH SYNC...');
      await batch.commit();
      
      console.log('🎉 SYNC COMPLETED SUCCESSFULLY!');
      return true;
      
    } catch (error) {
      console.error('❌ Sync failed:', error.message);
      return false;
    }
  }

  printFinalReport() {
    console.log(`
🎊🎊🎊🎊🎊🎊🎊🎊🎊🎊🎊🎊🎊🎊🎊🎊🎊🎊🎊🎊
🏆 ROOMS DATA CHECK COMPLETE! 🏆
🎊🎊🎊🎊🎊🎊🎊🎊🎊🎊🎊🎊🎊🎊🎊🎊🎊🎊🎊🎊

📊 FINAL STATISTICS:
   📁 rooms.json: ${this.stats.json_rooms} rooms
   🔥 Firestore: ${this.stats.firestore_rooms} rooms
   ✅ Synced: ${this.stats.synced_rooms} rooms
   ❌ Missing in Firestore: ${this.stats.missing_in_firestore} rooms
   ⚠️ Extra in Firestore: ${this.stats.extra_in_firestore} rooms

🔥 DATA INTEGRITY STATUS:
   ${this.stats.missing_in_firestore === 0 ? '✅' : '❌'} All JSON rooms in Firestore
   ${this.stats.json_rooms === this.stats.firestore_rooms ? '✅' : '⚠️'} Room counts match
   
🎯 NEXT STEPS:
   1. Restart your server
   2. Try the booking again
   3. delhi-302 should now work!
   
🚀 BOOKING SYSTEM READY! 🚀
`);
  }
}

// メイン実行
async function executeRoomsCheck() {
  const checker = new RoomsDataChecker();
  
  try {
    console.log('🎬 ROOMS DATA CHECK SHOWTIME! 🎬');

    // 初期化
    const initialized = await checker.initialize();
    if (!initialized) {
      console.log('💥 INITIALIZATION FAILED 💥');
      process.exit(1);
    }

    // rooms.json読み込み
    const jsonLoaded = await checker.loadRoomsJson();
    if (!jsonLoaded) {
      console.log('💥 ROOMS.JSON LOAD FAILED 💥');
      process.exit(1);
    }

    // Firestore読み込み
    const firestoreLoaded = await checker.loadFirestoreRooms();
    if (!firestoreLoaded) {
      console.log('💥 FIRESTORE LOAD FAILED 💥');
      process.exit(1);
    }

    // 同期分析
    const analysis = checker.analyzeDataSync();
    
    // 不足している部屋を同期
    const syncSuccess = await checker.syncMissingRooms(analysis.missingInFirestore);
    
    if (syncSuccess) {
      checker.printFinalReport();
      console.log('\n🎆 ROOMS SYNC MISSION ACCOMPLISHED! 🎆');
      console.log('🔥 TRY BOOKING AGAIN - IT SHOULD WORK NOW! 🔥');
    } else {
      console.log('\n💥 SYNC FAILED 💥');
      process.exit(1);
    }

  } catch (error) {
    console.error('\n💥 FATAL ERROR:', error.message);
    console.error(error.stack);
    process.exit(1);
  }
}

if (require.main === module) {
  executeRoomsCheck()
    .then(() => {
      console.log('\n🎯 ROOMS CHECK COMPLETE! 🎯');
      console.log('🎊 FIRESTORE IS NOW SYNCED WITH ROOMS.JSON! 🎊');
      process.exit(0);
    })
    .catch(error => {
      console.error('\n💥 ROOMS CHECK FAILED:', error.message);
      process.exit(1);
    });
}

module.exports = { RoomsDataChecker };