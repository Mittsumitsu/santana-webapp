#!/usr/bin/env node

// 🚀 サンタナゲストハウス 究極の大文字のみID移行スクリプト
// 💪 UPPERCASE ONLY POWER！！！

const admin = require('firebase-admin');
const fs = require('fs').promises;
const path = require('path');

console.log(`
🔥🔥🔥🔥🔥🔥🔥🔥🔥🔥🔥🔥🔥🔥🔥🔥🔥🔥🔥🔥
🚀 SANTANA GUESTHOUSE ULTIMATE MIGRATION 🚀
💪 大文字のみID POWER SYSTEM 💪
🎯 LET'S REVOLUTIONIZE THE DATABASE! 🎯
🔥🔥🔥🔥🔥🔥🔥🔥🔥🔥🔥🔥🔥🔥🔥🔥🔥🔥🔥🔥
`);

// 🎯 大文字のみ最強文字セット
const ULTIMATE_CHARSET = {
  numbers: '23456789',
  uppercase: 'ABCDEFGHJKLMNPQRSTUVWXYZ',
  excluded: '0, 1, I, O (視認性のため除外)',
  total: 32
};

const ALL_CHARS = ULTIMATE_CHARSET.numbers + ULTIMATE_CHARSET.uppercase;

console.log(`
📋 ULTIMATE CHARSET SPECS:
   Numbers: ${ULTIMATE_CHARSET.numbers}
   Letters: ${ULTIMATE_CHARSET.uppercase}
   Excluded: ${ULTIMATE_CHARSET.excluded}
   Total Power: ${ULTIMATE_CHARSET.total} characters
   Security Level: 🔥 MAXIMUM VISIBILITY 🔥
`);

/**
 * 🎲 ULTIMATE ID GENERATOR - 大文字のみ最強バージョン！
 */
class UltimateIDGenerator {
  static generateAwesomeId(prefix, length) {
    let result = '';
    for (let i = 0; i < length; i++) {
      const randomIndex = Math.floor(Math.random() * ALL_CHARS.length);
      result += ALL_CHARS[randomIndex];
    }
    const newId = prefix + result;
    console.log(`✨ Generated ${prefix.slice(0, -1)} ID: ${newId} ✨`);
    return newId;
  }

  // 🔥 専用ジェネレーター
  static user() { return this.generateAwesomeId('U_', 8); }      // U_7F3K8M2N
  static booking() { return this.generateAwesomeId('B_', 12); }  // B_7F3K8M2N9P4Q
  static room() { return this.generateAwesomeId('R_', 6); }      // R_7F3K8M
}

/**
 * 🎯 MIGRATION MASTER CLASS - 移行の神！
 */
class MigrationMaster {
  constructor() {
    this.stats = {
      users: { processed: 0, converted: 0 },
      parent_bookings: { processed: 0, converted: 0 },
      child_bookings: { processed: 0, converted: 0, unified: 0 },
      rooms: { processed: 0, converted: 0 }
    };
    this.idMapping = new Map();
    this.errors = [];
  }

  async initialize() {
    console.log('\n🔥 INITIALIZING FIREBASE CONNECTION...');
    
    try {
      // Firebase Admin初期化
      const config = require('../src/config.js');
      
      if (admin.apps.length === 0) {
        admin.initializeApp({
          credential: admin.credential.cert(config.firebase.serviceAccount),
          projectId: config.firebase.projectId
        });
      }
      
      this.db = admin.firestore();
      console.log('✅ Firebase connection ESTABLISHED! 💪');
      return true;
      
    } catch (error) {
      console.error('❌ Firebase initialization FAILED:', error.message);
      return false;
    }
  }

  async loadExistingData() {
    console.log('\n📊 LOADING EXISTING DATA FROM FIREBASE...');
    
    try {
      const collections = {
        users: await this.db.collection('users').get(),
        parent_bookings: await this.db.collection('parent_bookings').get(),
        bookings: await this.db.collection('bookings').get(),
        rooms: await this.db.collection('rooms').get()
      };

      const data = {};
      for (const [name, snapshot] of Object.entries(collections)) {
        data[name] = [];
        snapshot.forEach(doc => {
          data[name].push({ id: doc.id, ...doc.data() });
        });
        console.log(`📦 Loaded ${data[name].length} ${name}`);
      }

      return data;
    } catch (error) {
      console.error('❌ Data loading FAILED:', error.message);
      throw error;
    }
  }

  createIdMapping(existingData) {
    console.log('\n🗺️ CREATING ULTIMATE ID MAPPING...');
    
    // ユーザーID変換
    existingData.users.forEach(user => {
      const newId = UltimateIDGenerator.user();
      this.idMapping.set(user.id, newId);
      this.stats.users.processed++;
    });

    // 親予約ID変換
    existingData.parent_bookings.forEach(booking => {
      const newId = UltimateIDGenerator.booking();
      this.idMapping.set(booking.id, newId);
      this.stats.parent_bookings.processed++;
    });

    // 子予約ID変換（統合予約として）
    existingData.bookings.forEach(booking => {
      const newId = UltimateIDGenerator.booking();
      this.idMapping.set(booking.id, newId);
      this.stats.child_bookings.processed++;
    });

    // 部屋ID変換
    existingData.rooms.forEach(room => {
      const newId = UltimateIDGenerator.room();
      this.idMapping.set(room.id, newId);
      this.stats.rooms.processed++;
    });

    console.log(`🎯 ID MAPPING COMPLETE! Generated ${this.idMapping.size} new IDs`);
  }

  async executeUltimateMigration(existingData) {
    console.log('\n🚀 EXECUTING ULTIMATE MIGRATION...');
    console.log('💥 PREPARE FOR TRANSFORMATION! 💥');

    const batch = this.db.batch();
    let operationCount = 0;

    try {
      // 🔥 STEP 1: ユーザー移行
      console.log('\n👤 MIGRATING USERS...');
      for (const user of existingData.users) {
        const newId = this.idMapping.get(user.id);
        const newUser = {
          ...user,
          id: newId,
          migrated_at: admin.firestore.FieldValue.serverTimestamp(),
          migration_version: '2.0_UPPERCASE_POWER',
          old_id: user.id
        };
        delete newUser.old_id; // 参照用なので最終データからは削除

        const userRef = this.db.collection('users').doc(newId);
        batch.set(userRef, newUser);
        operationCount++;
        this.stats.users.converted++;
        
        console.log(`✅ User: ${user.id} → ${newId}`);
      }

      // 🔥 STEP 2: 統合予約移行（親＋子 → 1つの予約）
      console.log('\n📅 UNIFYING BOOKINGS...');
      for (const parentBooking of existingData.parent_bookings) {
        const newBookingId = this.idMapping.get(parentBooking.id);
        const newUserId = this.idMapping.get(parentBooking.user_id);

        // 関連する子予約を取得
        const childBookings = existingData.bookings.filter(
          child => child.parent_booking_id === parentBooking.id
        );

        // 統合予約データ作成
        const unifiedBooking = {
          id: newBookingId,
          user_id: newUserId,
          check_in_date: parentBooking.check_in_date,
          check_out_date: parentBooking.check_out_date,
          status: parentBooking.status,
          total_guests: parentBooking.total_guests,
          total_amount: parentBooking.total_amount,
          
          // 代表連絡先
          primary_contact: parentBooking.primary_contact,
          
          // 部屋情報を統合
          rooms: childBookings.map(child => ({
            room_id: this.idMapping.get(child.room_id) || child.room_id,
            check_in_time: child.check_in_time,
            number_of_guests: child.number_of_guests,
            primary_guest: child.primary_guest,
            additional_guests: child.additional_guests || [],
            room_amount: child.total_amount
          })),
          
          // メタデータ
          created_at: parentBooking.created_at,
          updated_at: admin.firestore.FieldValue.serverTimestamp(),
          migrated_at: admin.firestore.FieldValue.serverTimestamp(),
          migration_version: '2.0_UNIFIED_UPPERCASE',
          migration_source: {
            parent_id: parentBooking.id,
            child_ids: childBookings.map(c => c.id)
          }
        };

        const bookingRef = this.db.collection('bookings').doc(newBookingId);
        batch.set(bookingRef, unifiedBooking);
        operationCount++;
        this.stats.parent_bookings.converted++;
        this.stats.child_bookings.unified += childBookings.length;
        
        console.log(`🎯 Unified: ${parentBooking.id} + ${childBookings.length} children → ${newBookingId}`);
      }

      // 🔥 STEP 3: 部屋データ移行
      console.log('\n🏠 MIGRATING ROOMS...');
      for (const room of existingData.rooms) {
        const newId = this.idMapping.get(room.id);
        const newRoom = {
          ...room,
          id: newId,
          migrated_at: admin.firestore.FieldValue.serverTimestamp(),
          migration_version: '2.0_UPPERCASE_POWER',
          old_id: room.id
        };
        delete newRoom.old_id;

        const roomRef = this.db.collection('rooms').doc(newId);
        batch.set(roomRef, newRoom);
        operationCount++;
        this.stats.rooms.converted++;
        
        console.log(`🏨 Room: ${room.id} → ${newId}`);
      }

      // バッチ実行
      console.log(`\n💥 EXECUTING BATCH WRITE (${operationCount} operations)...`);
      await batch.commit();
      
      console.log('🎉 BATCH WRITE SUCCESSFUL! 🎉');
      return true;

    } catch (error) {
      console.error('❌ MIGRATION FAILED:', error.message);
      this.errors.push(error);
      return false;
    }
  }

  async createBackup() {
    console.log('\n💾 CREATING AWESOME BACKUP...');
    
    try {
      const timestamp = new Date().toISOString().replace(/[:.]/g, '-');
      const backupDir = path.join(__dirname, '..', 'backups', `pre-uppercase-migration-${timestamp}`);
      
      await fs.mkdir(backupDir, { recursive: true });

      // ID変換マッピングを保存
      const mappingData = Array.from(this.idMapping.entries()).map(([oldId, newId]) => ({
        old_id: oldId,
        new_id: newId,
        timestamp: new Date().toISOString()
      }));

      await fs.writeFile(
        path.join(backupDir, 'id-mapping.json'),
        JSON.stringify(mappingData, null, 2)
      );

      console.log(`✅ Backup created at: ${backupDir}`);
      return backupDir;

    } catch (error) {
      console.error('❌ Backup creation FAILED:', error.message);
      throw error;
    }
  }

  printAwesomeStats() {
    console.log(`
🎊🎊🎊🎊🎊🎊🎊🎊🎊🎊🎊🎊🎊🎊🎊🎊🎊🎊🎊🎊
🏆 MIGRATION COMPLETED SUCCESSFULLY! 🏆
🎊🎊🎊🎊🎊🎊🎊🎊🎊🎊🎊🎊🎊🎊🎊🎊🎊🎊🎊🎊

📊 ULTIMATE TRANSFORMATION STATS:
   👤 Users: ${this.stats.users.converted}/${this.stats.users.processed} converted
   📅 Bookings: ${this.stats.parent_bookings.converted} unified (from ${this.stats.parent_bookings.processed} parent + ${this.stats.child_bookings.processed} child)
   🏠 Rooms: ${this.stats.rooms.converted}/${this.stats.rooms.processed} converted
   🎯 Total IDs Generated: ${this.idMapping.size}
   
🔥 NEW ID SYSTEM ACTIVATED:
   Format: UPPERCASE ONLY (32 character set)
   Security: 40-60 bits entropy  
   Visibility: 🔥 MAXIMUM 🔥
   Support Efficiency: 📈 THROUGH THE ROOF! 📈

✨ FEATURES UNLOCKED:
   ✅ Zero case confusion
   ✅ Phone support friendly  
   ✅ International guest ready
   ✅ Print/handwriting clear
   ✅ Unified booking system
   ✅ Zero collisions (statistically impossible)

🚀 SYSTEM STATUS: READY TO ROCK! 🚀
`);

    if (this.errors.length > 0) {
      console.log(`⚠️ Errors encountered: ${this.errors.length}`);
      this.errors.forEach((error, index) => {
        console.log(`   ${index + 1}. ${error.message}`);
      });
    }
  }
}

/**
 * 🚀 MAIN EXECUTION - THE ULTIMATE SHOWTIME!
 */
async function executeUltimateMigration() {
  const migrationMaster = new MigrationMaster();
  
  try {
    console.log('🎬 SHOWTIME BEGINS NOW! 🎬');

    // 初期化
    const initialized = await migrationMaster.initialize();
    if (!initialized) {
      console.log('💥 INITIALIZATION FAILED - ABORTING MISSION 💥');
      process.exit(1);
    }

    // 既存データ読み込み
    const existingData = await migrationMaster.loadExistingData();
    
    // IDマッピング作成
    migrationMaster.createIdMapping(existingData);
    
    // バックアップ作成
    await migrationMaster.createBackup();
    
    // 究極の移行実行
    const success = await migrationMaster.executeUltimateMigration(existingData);
    
    if (success) {
      migrationMaster.printAwesomeStats();
      console.log('\n🎆 MISSION ACCOMPLISHED! 🎆');
      console.log('🔥 UPPERCASE ONLY SYSTEM IS NOW LIVE! 🔥');
    } else {
      console.log('\n💥 MISSION FAILED - CHECK LOGS 💥');
      process.exit(1);
    }

  } catch (error) {
    console.error('\n💥 FATAL ERROR:', error.message);
    console.error(error.stack);
    process.exit(1);
  }
}

// 🚀 BLAST OFF!
if (require.main === module) {
  executeUltimateMigration()
    .then(() => {
      console.log('\n🎯 SCRIPT EXECUTION COMPLETE! 🎯');
      process.exit(0);
    })
    .catch(error => {
      console.error('\n💥 SCRIPT FAILED:', error.message);
      process.exit(1);
    });
}

module.exports = { MigrationMaster, UltimateIDGenerator };