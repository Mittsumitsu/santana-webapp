#!/usr/bin/env node

// 🔧 デバッグ版 究極移行スクリプト
// 💪 問題を特定して完璧に修正するぞ！

const admin = require('firebase-admin');
const fs = require('fs').promises;
const path = require('path');

console.log(`
🔧🔧🔧🔧🔧🔧🔧🔧🔧🔧🔧🔧🔧🔧🔧🔧🔧🔧🔧🔧
🚀 SANTANA DEBUG MIGRATION v2.0 🚀
🔍 FIND AND FIX ALL ISSUES! 🔍
🔧🔧🔧🔧🔧🔧🔧🔧🔧🔧🔧🔧🔧🔧🔧🔧🔧🔧🔧🔧
`);

// 大文字のみ文字セット
const ULTIMATE_CHARSET = '23456789ABCDEFGHJKLMNPQRSTUVWXYZ';

class DebugMigrationMaster {
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

  generateId(prefix, length) {
    let result = '';
    for (let i = 0; i < length; i++) {
      const randomIndex = Math.floor(Math.random() * ULTIMATE_CHARSET.length);
      result += ULTIMATE_CHARSET[randomIndex];
    }
    return prefix + result;
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
      console.log('✅ Firebase connection ESTABLISHED! 💪');
      return true;
      
    } catch (error) {
      console.error('❌ Firebase initialization FAILED:', error.message);
      return false;
    }
  }

  async loadExistingData() {
    console.log('\n📊 LOADING AND ANALYZING EXISTING DATA...');
    
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

      // 🔍 詳細デバッグ情報
      console.log('\n🔍 DETAILED DATA ANALYSIS:');
      
      // ユーザーデータ詳細
      console.log('\n👤 USERS ANALYSIS:');
      data.users.forEach((user, index) => {
        console.log(`  ${index + 1}. ID: ${user.id}`);
        console.log(`     Email: ${user.email || 'N/A'}`);
        console.log(`     Name: ${user.displayName || user.name?.kanji || 'N/A'}`);
      });

      // 親予約データ詳細
      console.log('\n📋 PARENT BOOKINGS ANALYSIS:');
      data.parent_bookings.forEach((booking, index) => {
        console.log(`  ${index + 1}. ID: ${booking.id}`);
        console.log(`     User ID: ${booking.user_id}`);
        console.log(`     Check-in: ${booking.check_in_date}`);
        console.log(`     Status: ${booking.status}`);
        console.log(`     Total Guests: ${booking.total_guests}`);
        console.log(`     Primary Contact: ${booking.primary_contact?.name_kanji || booking.primary_contact?.name_romaji || 'N/A'}`);
        
        // 🚨 user_idの存在チェック
        const userExists = data.users.find(u => u.id === booking.user_id);
        if (!userExists) {
          console.log(`     🚨 WARNING: User ID ${booking.user_id} NOT FOUND in users collection!`);
          this.errors.push(`Parent booking ${booking.id} references non-existent user ${booking.user_id}`);
        } else {
          console.log(`     ✅ User ID ${booking.user_id} EXISTS`);
        }
      });

      // 子予約データ詳細
      console.log('\n📅 CHILD BOOKINGS ANALYSIS:');
      data.bookings.forEach((booking, index) => {
        console.log(`  ${index + 1}. ID: ${booking.id}`);
        console.log(`     Parent ID: ${booking.parent_booking_id}`);
        console.log(`     User ID: ${booking.user_id}`);
        console.log(`     Room ID: ${booking.room_id}`);
        
        // 親予約の存在チェック
        const parentExists = data.parent_bookings.find(p => p.id === booking.parent_booking_id);
        if (!parentExists) {
          console.log(`     🚨 WARNING: Parent booking ${booking.parent_booking_id} NOT FOUND!`);
          this.errors.push(`Child booking ${booking.id} references non-existent parent ${booking.parent_booking_id}`);
        } else {
          console.log(`     ✅ Parent booking ${booking.parent_booking_id} EXISTS`);
        }
        
        // ユーザーの存在チェック
        const userExists = data.users.find(u => u.id === booking.user_id);
        if (!userExists) {
          console.log(`     🚨 WARNING: User ID ${booking.user_id} NOT FOUND in users collection!`);
          this.errors.push(`Child booking ${booking.id} references non-existent user ${booking.user_id}`);
        } else {
          console.log(`     ✅ User ID ${booking.user_id} EXISTS`);
        }
      });

      // エラーサマリー
      if (this.errors.length > 0) {
        console.log(`\n🚨 DATA INTEGRITY ISSUES FOUND: ${this.errors.length}`);
        this.errors.forEach((error, index) => {
          console.log(`  ${index + 1}. ${error}`);
        });
      } else {
        console.log('\n✅ NO DATA INTEGRITY ISSUES FOUND!');
      }

      return data;
    } catch (error) {
      console.error('❌ Data loading FAILED:', error.message);
      throw error;
    }
  }

  createIdMapping(existingData) {
    console.log('\n🗺️ CREATING ULTIMATE ID MAPPING...');
    
    // ユーザーID変換（存在するユーザーのみ）
    const validUsers = existingData.users.filter(user => user.id);
    validUsers.forEach(user => {
      const newId = this.generateId('U_', 8);
      this.idMapping.set(user.id, newId);
      this.stats.users.processed++;
      console.log(`✨ User: ${user.id} → ${newId}`);
    });

    // 親予約ID変換
    existingData.parent_bookings.forEach(booking => {
      const newId = this.generateId('B_', 12);
      this.idMapping.set(booking.id, newId);
      this.stats.parent_bookings.processed++;
      console.log(`✨ Parent Booking: ${booking.id} → ${newId}`);
    });

    // 子予約ID変換
    existingData.bookings.forEach(booking => {
      const newId = this.generateId('B_', 12);
      this.idMapping.set(booking.id, newId);
      this.stats.child_bookings.processed++;
      console.log(`✨ Child Booking: ${booking.id} → ${newId}`);
    });

    // 部屋ID変換
    existingData.rooms.forEach(room => {
      const newId = this.generateId('R_', 6);
      this.idMapping.set(room.id, newId);
      this.stats.rooms.processed++;
      console.log(`✨ Room: ${room.id} → ${newId}`);
    });

    console.log(`🎯 ID MAPPING COMPLETE! Generated ${this.idMapping.size} new IDs`);
    
    // マッピング検証
    console.log('\n🔍 MAPPING VALIDATION:');
    existingData.parent_bookings.forEach(booking => {
      const newUserId = this.idMapping.get(booking.user_id);
      if (!newUserId) {
        console.log(`🚨 ERROR: No mapping found for user_id ${booking.user_id} in booking ${booking.id}`);
        this.errors.push(`No user mapping for ${booking.user_id}`);
      } else {
        console.log(`✅ Booking ${booking.id} user_id ${booking.user_id} → ${newUserId}`);
      }
    });
  }

  async executeDebugMigration(existingData) {
    console.log('\n🚀 EXECUTING DEBUG MIGRATION...');
    
    if (this.errors.length > 0) {
      console.log('🚨 ABORTING MIGRATION DUE TO DATA INTEGRITY ISSUES!');
      console.log('Please fix the following issues first:');
      this.errors.forEach((error, index) => {
        console.log(`  ${index + 1}. ${error}`);
      });
      return false;
    }

    const batch = this.db.batch();
    let operationCount = 0;

    try {
      // ユーザー移行
      console.log('\n👤 MIGRATING USERS...');
      for (const user of existingData.users) {
        const newId = this.idMapping.get(user.id);
        if (!newId) {
          console.log(`🚨 SKIPPING user ${user.id} - no mapping found`);
          continue;
        }

        const newUser = {
          ...user,
          id: newId,
          migrated_at: admin.firestore.FieldValue.serverTimestamp(),
          migration_version: '2.0_DEBUG_UPPERCASE',
          migration_source: user.id
        };

        const userRef = this.db.collection('users').doc(newId);
        batch.set(userRef, newUser);
        operationCount++;
        this.stats.users.converted++;
        
        console.log(`✅ User: ${user.id} → ${newId}`);
      }

      // 統合予約移行
      console.log('\n📅 UNIFYING BOOKINGS...');
      for (const parentBooking of existingData.parent_bookings) {
        const newBookingId = this.idMapping.get(parentBooking.id);
        const newUserId = this.idMapping.get(parentBooking.user_id);

        if (!newBookingId) {
          console.log(`🚨 SKIPPING parent booking ${parentBooking.id} - no booking mapping`);
          continue;
        }

        if (!newUserId) {
          console.log(`🚨 SKIPPING parent booking ${parentBooking.id} - no user mapping for ${parentBooking.user_id}`);
          this.errors.push(`No user mapping for parent booking ${parentBooking.id}`);
          continue;
        }

        // 関連する子予約を取得
        const childBookings = existingData.bookings.filter(
          child => child.parent_booking_id === parentBooking.id
        );

        console.log(`📋 Processing parent ${parentBooking.id} with ${childBookings.length} children`);

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
          rooms: childBookings.map(child => {
            const newRoomId = this.idMapping.get(child.room_id);
            return {
              room_id: newRoomId || child.room_id, // フォールバック
              check_in_time: child.check_in_time,
              number_of_guests: child.number_of_guests,
              primary_guest: child.primary_guest,
              additional_guests: child.additional_guests || [],
              room_amount: child.total_amount
            };
          }),
          
          // メタデータ
          created_at: parentBooking.created_at,
          updated_at: admin.firestore.FieldValue.serverTimestamp(),
          migrated_at: admin.firestore.FieldValue.serverTimestamp(),
          migration_version: '2.0_DEBUG_UNIFIED_UPPERCASE',
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
        
        console.log(`🎯 Unified: ${parentBooking.id} (${childBookings.length} children) → ${newBookingId}`);
        console.log(`    User: ${parentBooking.user_id} → ${newUserId}`);
      }

      // 部屋データ移行
      console.log('\n🏠 MIGRATING ROOMS...');
      for (const room of existingData.rooms) {
        const newId = this.idMapping.get(room.id);
        if (!newId) {
          console.log(`🚨 SKIPPING room ${room.id} - no mapping found`);
          continue;
        }

        const newRoom = {
          ...room,
          id: newId,
          migrated_at: admin.firestore.FieldValue.serverTimestamp(),
          migration_version: '2.0_DEBUG_UPPERCASE',
          migration_source: room.id
        };

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
      console.error('Stack trace:', error.stack);
      this.errors.push(error);
      return false;
    }
  }

  async createBackup() {
    console.log('\n💾 CREATING DEBUG BACKUP...');
    
    try {
      const timestamp = new Date().toISOString().replace(/[:.]/g, '-');
      const backupDir = path.join(__dirname, '..', 'backups', `debug-migration-${timestamp}`);
      
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

      // エラーレポートも保存
      if (this.errors.length > 0) {
        await fs.writeFile(
          path.join(backupDir, 'errors.json'),
          JSON.stringify(this.errors, null, 2)
        );
      }

      console.log(`✅ Debug backup created at: ${backupDir}`);
      return backupDir;

    } catch (error) {
      console.error('❌ Backup creation FAILED:', error.message);
      throw error;
    }
  }

  printDebugStats() {
    console.log(`
🎊🎊🎊🎊🎊🎊🎊🎊🎊🎊🎊🎊🎊🎊🎊🎊🎊🎊🎊🎊
🏆 DEBUG MIGRATION COMPLETED! 🏆
🎊🎊🎊🎊🎊🎊🎊🎊🎊🎊🎊🎊🎊🎊🎊🎊🎊🎊🎊🎊

📊 TRANSFORMATION STATS:
   👤 Users: ${this.stats.users.converted}/${this.stats.users.processed} converted
   📅 Bookings: ${this.stats.parent_bookings.converted} unified (from ${this.stats.parent_bookings.processed} parent + ${this.stats.child_bookings.processed} child)
   🏠 Rooms: ${this.stats.rooms.converted}/${this.stats.rooms.processed} converted
   🎯 Total IDs Generated: ${this.idMapping.size}
`);

    if (this.errors.length > 0) {
      console.log(`🚨 Issues found: ${this.errors.length}`);
      this.errors.forEach((error, index) => {
        console.log(`   ${index + 1}. ${error}`);
      });
    } else {
      console.log('✅ NO ISSUES FOUND!');
    }
  }
}

// メイン実行
async function executeDebugMigration() {
  const migrationMaster = new DebugMigrationMaster();
  
  try {
    console.log('🎬 DEBUG SHOWTIME BEGINS! 🎬');

    const initialized = await migrationMaster.initialize();
    if (!initialized) {
      console.log('💥 INITIALIZATION FAILED 💥');
      process.exit(1);
    }

    const existingData = await migrationMaster.loadExistingData();
    migrationMaster.createIdMapping(existingData);
    await migrationMaster.createBackup();
    
    const success = await migrationMaster.executeDebugMigration(existingData);
    
    migrationMaster.printDebugStats();
    
    if (success) {
      console.log('\n🎆 DEBUG MISSION ACCOMPLISHED! 🎆');
    } else {
      console.log('\n💥 DEBUG MISSION REVEALED ISSUES 💥');
    }

  } catch (error) {
    console.error('\n💥 FATAL DEBUG ERROR:', error.message);
    console.error(error.stack);
    process.exit(1);
  }
}

if (require.main === module) {
  executeDebugMigration()
    .then(() => {
      console.log('\n🎯 DEBUG SCRIPT COMPLETE! 🎯');
      process.exit(0);
    })
    .catch(error => {
      console.error('\n💥 DEBUG SCRIPT FAILED:', error.message);
      process.exit(1);
    });
}

module.exports = { DebugMigrationMaster };