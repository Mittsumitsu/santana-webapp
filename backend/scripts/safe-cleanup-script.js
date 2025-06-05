#!/usr/bin/env node

// 🛡️ 安全なクリーンアップスクリプト（重要データ保護版）
// 💪 予約データのみ削除、ユーザー・部屋データは保護！

const admin = require('firebase-admin');

console.log(`
🛡️🛡️🛡️🛡️🛡️🛡️🛡️🛡️🛡️🛡️🛡️🛡️🛡️🛡️🛡️🛡️🛡️🛡️🛡️🛡️
🚀 SAFE CLEANUP SCRIPT - DATA PROTECTION MODE 🚀
💪 DELETE BOOKINGS ONLY, PROTECT ESSENTIAL DATA! 💪
🛡️🛡️🛡️🛡️🛡️🛡️🛡️🛡️🛡️🛡️🛡️🛡️🛡️🛡️🛡️🛡️🛡️🛡️🛡️🛡️
`);

class SafeCleanupMaster {
  constructor() {
    // 🛡️ 保護対象の定義
    this.PROTECTED_DATA = {
      users: [
        'U_B9Z3BRJN',        // テスト太郎（メインテストユーザー）
        'U_TESTHRO',         // 予備テストユーザー
        // 新IDフォーマットのユーザーは基本的に全保護
      ],
      user_patterns: [
        /^U_[A-Z0-9]{8}$/,   // 新IDフォーマットは保護
      ],
      collections: {
        rooms: 'ALL',        // 部屋データは全保護
        locations: 'ALL',    // 店舗データは全保護
        room_types: 'ALL',   // 部屋タイプは全保護
        system_settings: 'ALL'
      }
    };
    
    // 🗑️ 削除対象の定義
    this.DELETABLE_DATA = {
      collections: [
        'bookings',          // 予約データは削除OK
        'availability',      // 空室データは削除OK（再生成される）
      ],
      user_patterns: [
        /^temp_/,           // 一時ユーザーは削除
        /^test_/,           // テスト用ユーザーは削除
        /^guest_/,          // ゲストユーザーは削除
      ]
    };
    
    this.stats = {
      protected: { users: 0, collections: 0 },
      deleted: { bookings: 0, temp_users: 0, availability: 0 },
      total_operations: 0
    };
  }

  async initialize() {
    console.log('\n🔥 INITIALIZING SAFE CLEANUP...');
    
    try {
      const config = require('../src/config.js');
      
      if (admin.apps.length === 0) {
        admin.initializeApp({
          credential: admin.credential.cert(config.firebase.serviceAccount),
          projectId: config.firebase.projectId
        });
      }
      
      this.db = admin.firestore();
      console.log('✅ Firebase connection ESTABLISHED! 🛡️');
      return true;
      
    } catch (error) {
      console.error('❌ Firebase initialization FAILED:', error.message);
      return false;
    }
  }

  isProtectedUser(userId) {
    // 明示的に保護対象
    if (this.PROTECTED_DATA.users.includes(userId)) return true;
    
    // パターンマッチで保護対象
    return this.PROTECTED_DATA.user_patterns.some(pattern => pattern.test(userId));
  }

  isDeletableUser(userId) {
    // 保護対象は削除不可
    if (this.isProtectedUser(userId)) return false;
    
    // 削除パターンマッチ
    return this.DELETABLE_DATA.user_patterns.some(pattern => pattern.test(userId));
  }

  async analyzeAndPlan() {
    console.log('\n📊 ANALYZING DATA FOR SAFE CLEANUP...');
    
    try {
      // 現在のデータ状況を分析
      const collections = {
        users: await this.db.collection('users').get(),
        bookings: await this.db.collection('bookings').get(),
        availability: await this.db.collection('availability').get(),
        rooms: await this.db.collection('rooms').get()
      };

      console.log('\n📋 CURRENT STATE ANALYSIS:');
      
      // ユーザー分析
      console.log('\n👤 USERS ANALYSIS:');
      const users = [];
      collections.users.forEach(doc => {
        const userData = { id: doc.id, ...doc.data() };
        users.push(userData);
        
        const isProtected = this.isProtectedUser(userData.id);
        const isDeletable = this.isDeletableUser(userData.id);
        
        console.log(`  ${isProtected ? '🛡️' : isDeletable ? '🗑️' : '❓'} ${userData.id} - ${userData.displayName || 'N/A'} ${
          isProtected ? '(PROTECTED)' : 
          isDeletable ? '(DELETABLE)' : 
          '(WILL KEEP)'
        }`);
        
        if (isProtected) this.stats.protected.users++;
      });
      
      // 予約分析
      console.log('\n📅 BOOKINGS ANALYSIS:');
      collections.bookings.forEach(doc => {
        const booking = doc.data();
        console.log(`  🗑️ ${booking.id} - ${booking.check_in_date} (WILL DELETE)`);
      });
      
      // その他のコレクション
      console.log('\n🏠 ROOMS (PROTECTED):');
      collections.rooms.forEach(doc => {
        const room = doc.data();
        console.log(`  🛡️ ${room.id} - ${room.name} (PROTECTED)`);
      });

      console.log('\n🎯 CLEANUP PLAN:');
      console.log(`  🛡️ Protected users: ${this.stats.protected.users}`);
      console.log(`  🗑️ Bookings to delete: ${collections.bookings.size}`);
      console.log(`  🗑️ Availability to delete: ${collections.availability.size}`);
      console.log(`  🗑️ Temp users to delete: ${users.filter(u => this.isDeletableUser(u.id)).length}`);

      return { users, collections };

    } catch (error) {
      console.error('❌ Analysis FAILED:', error.message);
      throw error;
    }
  }

  async executeSafeCleanup(analysisData) {
    console.log('\n🧹 EXECUTING SAFE CLEANUP...');
    
    const batch = this.db.batch();
    let operationCount = 0;

    try {
      const { users, collections } = analysisData;

      // 1. 予約データを削除
      console.log('\n🗑️ DELETING BOOKINGS...');
      collections.bookings.forEach(doc => {
        batch.delete(doc.ref);
        operationCount++;
        this.stats.deleted.bookings++;
        console.log(`❌ Deleting booking: ${doc.data().id}`);
      });

      // 2. 空室データを削除
      console.log('\n🗑️ DELETING AVAILABILITY DATA...');
      collections.availability.forEach(doc => {
        batch.delete(doc.ref);
        operationCount++;
        this.stats.deleted.availability++;
      });

      // 3. 削除対象の一時ユーザーを削除
      console.log('\n🗑️ DELETING TEMPORARY USERS...');
      const deletableUsers = users.filter(user => this.isDeletableUser(user.id));
      deletableUsers.forEach(user => {
        const userRef = this.db.collection('users').doc(user.id);
        batch.delete(userRef);
        operationCount++;
        this.stats.deleted.temp_users++;
        console.log(`❌ Deleting temp user: ${user.id}`);
      });

      // 4. 保護対象ユーザーの確認（削除しない）
      console.log('\n🛡️ PROTECTED USERS (KEEPING):');
      const protectedUsers = users.filter(user => this.isProtectedUser(user.id));
      protectedUsers.forEach(user => {
        console.log(`✅ Keeping: ${user.id} - ${user.displayName} (${user.email})`);
      });

      // バッチ実行
      if (operationCount > 0) {
        console.log(`\n💥 EXECUTING SAFE CLEANUP BATCH (${operationCount} deletions)...`);
        await batch.commit();
        console.log('✅ SAFE CLEANUP SUCCESSFUL!');
      } else {
        console.log('ℹ️ No data needs to be deleted');
      }

      this.stats.total_operations = operationCount;
      return true;

    } catch (error) {
      console.error('❌ Safe cleanup FAILED:', error.message);
      return false;
    }
  }

  async verifyIntegrity() {
    console.log('\n🔍 VERIFYING POST-CLEANUP INTEGRITY...');
    
    try {
      const users = await this.db.collection('users').get();
      const bookings = await this.db.collection('bookings').get();
      const rooms = await this.db.collection('rooms').get();
      
      console.log('\n✅ POST-CLEANUP VERIFICATION:');
      console.log(`   👤 Users remaining: ${users.size}`);
      console.log(`   📅 Bookings remaining: ${bookings.size} (should be 0)`);
      console.log(`   🏠 Rooms remaining: ${rooms.size} (should be preserved)`);
      
      // 必須ユーザーの存在確認
      let hasTestTaro = false;
      users.forEach(doc => {
        const user = doc.data();
        if (user.id === 'U_B9Z3BRJN' || user.email === 'oo00mixan00oo@icloud.com') {
          hasTestTaro = true;
          console.log(`   🛡️ テスト太郎 confirmed: ${user.id}`);
        }
      });
      
      if (!hasTestTaro) {
        console.log('🚨 WARNING: テスト太郎 user missing!');
        return false;
      }
      
      console.log('✅ All critical data preserved successfully!');
      return true;

    } catch (error) {
      console.error('❌ Verification FAILED:', error.message);
      return false;
    }
  }

  printSafeCleanupStats() {
    console.log(`
🎊🎊🎊🎊🎊🎊🎊🎊🎊🎊🎊🎊🎊🎊🎊🎊🎊🎊🎊🎊
🏆 SAFE CLEANUP COMPLETE! 🏆
🎊🎊🎊🎊🎊🎊🎊🎊🎊🎊🎊🎊🎊🎊🎊🎊🎊🎊🎊🎊

🛡️ PROTECTED DATA:
   👤 Users preserved: ${this.stats.protected.users}
   🏠 Rooms preserved: ALL
   ⚙️ System data preserved: ALL

🗑️ DELETED DATA:
   📅 Bookings deleted: ${this.stats.deleted.bookings}
   📊 Availability deleted: ${this.stats.deleted.availability}
   👤 Temp users deleted: ${this.stats.deleted.temp_users}
   
💪 TOTAL OPERATIONS: ${this.stats.total_operations}

🔥 SAFETY ACHIEVEMENTS:
   ✅ テスト太郎 user protected
   ✅ All room data preserved
   ✅ No accidental system data loss
   ✅ Clean slate for new bookings
   ✅ Development continuity maintained

🎯 READY FOR:
   - New booking tests
   - Email authentication testing
   - User dashboard verification
   - Clean development environment

🚀 STATUS: SAFELY CLEANED & READY! 🚀
`);
  }
}

// メイン実行
async function executeSafeCleanup() {
  const master = new SafeCleanupMaster();
  
  try {
    console.log('🎬 SAFE CLEANUP SHOWTIME! 🎬');

    const initialized = await master.initialize();
    if (!initialized) {
      console.log('💥 INITIALIZATION FAILED 💥');
      process.exit(1);
    }

    const analysisData = await master.analyzeAndPlan();
    const success = await master.executeSafeCleanup(analysisData);
    
    if (success) {
      const integrityOk = await master.verifyIntegrity();
      
      if (integrityOk) {
        master.printSafeCleanupStats();
        console.log('\n🎆 SAFE CLEANUP MISSION ACCOMPLISHED! 🎆');
        console.log('🛡️ ALL ESSENTIAL DATA PROTECTED! 🛡️');
      } else {
        console.log('\n⚠️ INTEGRITY CHECK FAILED 🚨');
      }
    } else {
      console.log('\n💥 SAFE CLEANUP FAILED 💥');
      process.exit(1);
    }

  } catch (error) {
    console.error('\n💥 FATAL CLEANUP ERROR:', error.message);
    console.error(error.stack);
    process.exit(1);
  }
}

if (require.main === module) {
  executeSafeCleanup()
    .then(() => {
      console.log('\n🎯 SAFE CLEANUP SCRIPT COMPLETE! 🎯');
      console.log('🛡️ READY FOR PROTECTED DEVELOPMENT! 🛡️');
      process.exit(0);
    })
    .catch(error => {
      console.error('\n💥 SAFE CLEANUP SCRIPT FAILED:', error.message);
      process.exit(1);
    });
}

module.exports = { SafeCleanupMaster };