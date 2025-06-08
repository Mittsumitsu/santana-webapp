#!/usr/bin/env node

// 🗄️ Firestore全データバックアップ・解析スクリプト
// 📊 全コレクションをバックアップして詳細解析！

const admin = require('firebase-admin');
const fs = require('fs').promises;
const path = require('path');

console.log(`
🗄️🗄️🗄️🗄️🗄️🗄️🗄️🗄️🗄️🗄️🗄️🗄️🗄️🗄️🗄️🗄️🗄️🗄️🗄️🗄️
📊 FIRESTORE COMPLETE BACKUP & ANALYSIS 📊
🔍 BACKUP ALL DATA & ANALYZE STRUCTURE! 🔍
🗄️🗄️🗄️🗄️🗄️🗄️🗄️🗄️🗄️🗄️🗄️🗄️🗄️🗄️🗄️🗄️🗄️🗄️🗄️🗄️
`);

class FirestoreAnalyzer {
  constructor() {
    this.backupData = {};
    this.analysis = {
      collections: {},
      totalDocuments: 0,
      dataStructures: {},
      anomalies: [],
      recommendations: []
    };
    this.backupTimestamp = new Date().toISOString().replace(/[:.]/g, '-');
  }

  async initialize() {
    console.log('\n🔥 INITIALIZING FIREBASE CONNECTION...');
    
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

  async backupAllCollections() {
    console.log('\n📥 STARTING COMPLETE BACKUP...');
    
    try {
      // 全コレクションを取得
      const collections = await this.db.listCollections();
      console.log(`📋 Found ${collections.length} collections:`);
      
      for (const collection of collections) {
        const collectionName = collection.id;
        console.log(`\n🗂️ Backing up collection: ${collectionName}`);
        
        const snapshot = await collection.get();
        const documents = [];
        
        snapshot.forEach(doc => {
          const data = doc.data();
          // Timestampオブジェクトを文字列に変換
          const cleanData = this.cleanFirestoreData(data);
          
          documents.push({
            id: doc.id,
            data: cleanData
          });
        });
        
        this.backupData[collectionName] = documents;
        console.log(`  ✅ ${documents.length} documents backed up`);
        
        // コレクション統計
        this.analysis.collections[collectionName] = {
          documentCount: documents.length,
          sampleStructure: documents.length > 0 ? this.getDataStructure(documents[0].data) : {},
          allIds: documents.map(doc => doc.id)
        };
        
        this.analysis.totalDocuments += documents.length;
      }
      
      console.log(`\n🎉 BACKUP COMPLETE! Total: ${this.analysis.totalDocuments} documents`);
      return true;
      
    } catch (error) {
      console.error('❌ Backup failed:', error.message);
      return false;
    }
  }

  cleanFirestoreData(obj) {
    if (obj === null || obj === undefined) return obj;
    
    if (obj.constructor && obj.constructor.name === 'Timestamp') {
      return obj.toDate().toISOString();
    }
    
    if (Array.isArray(obj)) {
      return obj.map(item => this.cleanFirestoreData(item));
    }
    
    if (typeof obj === 'object') {
      const cleaned = {};
      for (const [key, value] of Object.entries(obj)) {
        cleaned[key] = this.cleanFirestoreData(value);
      }
      return cleaned;
    }
    
    return obj;
  }

  getDataStructure(data) {
    if (!data || typeof data !== 'object') return {};
    
    const structure = {};
    for (const [key, value] of Object.entries(data)) {
      if (Array.isArray(value)) {
        structure[key] = `Array[${value.length}]`;
      } else if (value && typeof value === 'object') {
        structure[key] = 'Object';
      } else {
        structure[key] = typeof value;
      }
    }
    return structure;
  }

  async saveBackupFiles() {
    console.log('\n💾 SAVING BACKUP FILES...');
    
    try {
      const backupDir = path.join(__dirname, '..', 'backups', `firestore-backup-${this.backupTimestamp}`);
      await fs.mkdir(backupDir, { recursive: true });
      
      // 全体バックアップファイル
      const fullBackupPath = path.join(backupDir, 'complete-backup.json');
      await fs.writeFile(fullBackupPath, JSON.stringify(this.backupData, null, 2));
      console.log(`✅ Complete backup saved: ${fullBackupPath}`);
      
      // コレクション別バックアップ
      for (const [collectionName, documents] of Object.entries(this.backupData)) {
        const collectionPath = path.join(backupDir, `${collectionName}.json`);
        await fs.writeFile(collectionPath, JSON.stringify(documents, null, 2));
        console.log(`✅ ${collectionName} backup saved: ${collectionPath}`);
      }
      
      // 解析結果
      const analysisPath = path.join(backupDir, 'analysis-report.json');
      await fs.writeFile(analysisPath, JSON.stringify(this.analysis, null, 2));
      console.log(`✅ Analysis report saved: ${analysisPath}`);
      
      return backupDir;
      
    } catch (error) {
      console.error('❌ Failed to save backup files:', error.message);
      return null;
    }
  }

  analyzeDataStructures() {
    console.log('\n🔍 ANALYZING DATA STRUCTURES...');
    
    // Rooms構造解析
    if (this.backupData.rooms) {
      this.analyzeRoomsStructure();
    }
    
    // Bookings構造解析
    if (this.backupData.bookings) {
      this.analyzeBookingsStructure();
    }
    
    // Users構造解析
    if (this.backupData.users) {
      this.analyzeUsersStructure();
    }
    
    // ID形式の整合性チェック
    this.analyzeIdConsistency();
  }

  analyzeRoomsStructure() {
    console.log('\n🏠 ANALYZING ROOMS STRUCTURE...');
    
    const rooms = this.backupData.rooms;
    console.log(`📊 Total rooms: ${rooms.length}`);
    
    // ID形式分析
    const legacyIds = rooms.filter(room => room.id.includes('-'));
    const newIds = rooms.filter(room => room.id.startsWith('R_'));
    
    console.log(`  📋 Legacy IDs (delhi-302 format): ${legacyIds.length}`);
    console.log(`  🆕 New IDs (R_XXXXX format): ${newIds.length}`);
    
    // room_idフィールド確認
    const roomsWithRoomIdField = rooms.filter(room => room.data.room_id);
    console.log(`  🔗 Rooms with room_id field: ${roomsWithRoomIdField.length}`);
    
    if (roomsWithRoomIdField.length > 0) {
      console.log('\n📋 ROOM ID MAPPING EXAMPLES:');
      roomsWithRoomIdField.slice(0, 5).forEach(room => {
        console.log(`  🏠 Firestore ID: ${room.id} → room_id: ${room.data.room_id}`);
      });
    }
    
    // 不整合チェック
    if (legacyIds.length > 0 && newIds.length > 0) {
      this.analysis.anomalies.push({
        type: 'rooms_id_format_mixed',
        description: 'Rooms collection has mixed ID formats',
        legacy_count: legacyIds.length,
        new_count: newIds.length
      });
    }
    
    // Delhi部屋の確認
    const delhiRooms = rooms.filter(room => 
      room.data.location_id === 'delhi' || 
      room.data.room_id?.startsWith('delhi-') ||
      room.id.startsWith('delhi-')
    );
    
    console.log(`\n🏙️ DELHI ROOMS: ${delhiRooms.length} found`);
    delhiRooms.forEach(room => {
      console.log(`  🏠 ${room.id} - ${room.data.name || 'No name'} (${room.data.room_type_id || 'No type'})`);
      if (room.data.room_id) {
        console.log(`    room_id field: ${room.data.room_id}`);
      }
    });
  }

  analyzeBookingsStructure() {
    console.log('\n📅 ANALYZING BOOKINGS STRUCTURE...');
    
    const bookings = this.backupData.bookings;
    console.log(`📊 Total bookings: ${bookings.length}`);
    
    // ID形式分析
    const newIdBookings = bookings.filter(booking => booking.id.startsWith('B_'));
    console.log(`  🆕 New ID format bookings: ${newIdBookings.length}`);
    
    // ルーム参照分析
    bookings.forEach(booking => {
      if (booking.data.rooms && Array.isArray(booking.data.rooms)) {
        const roomIds = booking.data.rooms.map(room => room.room_id);
        console.log(`  📋 Booking ${booking.id} references rooms: ${roomIds.join(', ')}`);
      }
    });
  }

  analyzeUsersStructure() {
    console.log('\n👤 ANALYZING USERS STRUCTURE...');
    
    const users = this.backupData.users;
    console.log(`📊 Total users: ${users.length}`);
    
    const newIdUsers = users.filter(user => user.id.startsWith('U_'));
    console.log(`  🆕 New ID format users: ${newIdUsers.length}`);
    
    users.forEach(user => {
      console.log(`  👤 ${user.id} - ${user.data.displayName} (${user.data.email})`);
    });
  }

  analyzeIdConsistency() {
    console.log('\n🔍 ANALYZING ID CONSISTENCY...');
    
    // 予約で参照されている部屋IDと実際の部屋IDの整合性チェック
    if (this.backupData.bookings && this.backupData.rooms) {
      const roomIds = new Set();
      const roomIdFields = new Set();
      
      // 実際の部屋ID収集
      this.backupData.rooms.forEach(room => {
        roomIds.add(room.id);
        if (room.data.room_id) {
          roomIdFields.add(room.data.room_id);
        }
      });
      
      // 予約で参照されている部屋ID
      const referencedRoomIds = new Set();
      this.backupData.bookings.forEach(booking => {
        if (booking.data.rooms) {
          booking.data.rooms.forEach(room => {
            if (room.room_id) {
              referencedRoomIds.add(room.room_id);
            }
          });
        }
      });
      
      console.log('\n🏠 ROOM ID ANALYSIS:');
      console.log(`  📋 Firestore document IDs: ${roomIds.size}`);
      console.log(`  🔗 room_id fields: ${roomIdFields.size}`);
      console.log(`  📅 Referenced in bookings: ${referencedRoomIds.size}`);
      
      // 不整合の検出
      const missingRooms = [...referencedRoomIds].filter(id => 
        !roomIds.has(id) && !roomIdFields.has(id)
      );
      
      if (missingRooms.length > 0) {
        console.log('\n❌ MISSING ROOMS DETECTED:');
        missingRooms.forEach(id => {
          console.log(`  ❌ ${id} - referenced in bookings but not found in rooms`);
        });
        
        this.analysis.anomalies.push({
          type: 'missing_room_references',
          description: 'Bookings reference rooms that do not exist',
          missing_rooms: missingRooms
        });
      }
    }
  }

  printAnalysisReport() {
    console.log(`
🎊🎊🎊🎊🎊🎊🎊🎊🎊🎊🎊🎊🎊🎊🎊🎊🎊🎊🎊🎊
📊 FIRESTORE ANALYSIS COMPLETE! 📊
🎊🎊🎊🎊🎊🎊🎊🎊🎊🎊🎊🎊🎊🎊🎊🎊🎊🎊🎊🎊

📋 BACKUP SUMMARY:
   📁 Total Collections: ${Object.keys(this.backupData).length}
   📄 Total Documents: ${this.analysis.totalDocuments}
   🕐 Backup Time: ${this.backupTimestamp}

🏠 COLLECTIONS BREAKDOWN:
`);

    for (const [name, info] of Object.entries(this.analysis.collections)) {
      console.log(`   ${name}: ${info.documentCount} documents`);
    }

    if (this.analysis.anomalies.length > 0) {
      console.log(`
⚠️ ANOMALIES DETECTED: ${this.analysis.anomalies.length}
`);
      this.analysis.anomalies.forEach((anomaly, index) => {
        console.log(`   ${index + 1}. ${anomaly.type}: ${anomaly.description}`);
      });
    } else {
      console.log(`
✅ NO ANOMALIES DETECTED - DATA STRUCTURE LOOKS HEALTHY!
`);
    }

    console.log(`
💾 BACKUP FILES LOCATION:
   📁 backup/firestore-backup-${this.backupTimestamp}/
   
🔍 NEXT STEPS:
   1. Review the analysis report
   2. Check individual collection files
   3. Fix any detected anomalies
   
🎯 READY FOR DETAILED ANALYSIS! 🎯
`);
  }
}

// メイン実行
async function executeCompleteAnalysis() {
  const analyzer = new FirestoreAnalyzer();
  
  try {
    console.log('🎬 FIRESTORE ANALYSIS SHOWTIME! 🎬');

    // 初期化
    const initialized = await analyzer.initialize();
    if (!initialized) {
      console.log('💥 INITIALIZATION FAILED 💥');
      process.exit(1);
    }

    // 全データバックアップ
    const backupSuccess = await analyzer.backupAllCollections();
    if (!backupSuccess) {
      console.log('💥 BACKUP FAILED 💥');
      process.exit(1);
    }

    // データ構造解析
    analyzer.analyzeDataStructures();

    // バックアップファイル保存
    const backupDir = await analyzer.saveBackupFiles();
    if (!backupDir) {
      console.log('💥 BACKUP FILE SAVE FAILED 💥');
      process.exit(1);
    }

    // 解析レポート表示
    analyzer.printAnalysisReport();

    console.log('\n🎆 COMPLETE ANALYSIS FINISHED! 🎆');
    console.log(`📁 All files saved in: ${backupDir}`);

  } catch (error) {
    console.error('\n💥 FATAL ERROR:', error.message);
    console.error(error.stack);
    process.exit(1);
  }
}

if (require.main === module) {
  executeCompleteAnalysis()
    .then(() => {
      console.log('\n🎯 ANALYSIS COMPLETE! 🎯');
      console.log('🔍 CHECK THE BACKUP FILES FOR DETAILED DATA! 🔍');
      process.exit(0);
    })
    .catch(error => {
      console.error('\n💥 ANALYSIS FAILED:', error.message);
      process.exit(1);
    });
}

module.exports = { FirestoreAnalyzer };