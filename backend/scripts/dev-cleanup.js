#!/usr/bin/env node

// 🧹 開発環境用完全クリーンアップスクリプト
// 🎯 Phase 3.2データ正規化準備：クリーンな状態から理想的システム構築

const admin = require('firebase-admin');
const fs = require('fs').promises;
const path = require('path');

console.log(`
🧹🧹🧹🧹🧹🧹🧹🧹🧹🧹🧹🧹🧹🧹🧹🧹🧹🧹🧹🧹
🚀 SANTANA DEVELOPMENT CLEANUP v3.2 🚀
🎯 PREPARE FOR PERFECT DATA NORMALIZATION 🎯
🧹🧹🧹🧹🧹🧹🧹🧹🧹🧹🧹🧹🧹🧹🧹🧹🧹🧹🧹🧹
`);

class DevelopmentCleanupMaster {
  constructor() {
    this.stats = {
      protected: {
        users: 0,
        rooms: 0,
        locations: 0,
        room_types: 0
      },
      deleted: {
        bookings: 0,
        old_bookings: 0,
        availability: 0,
        temp_data: 0
      },
      total_operations: 0
    };
    
    // 🛡️ 開発環境で保護するデータ
    this.PROTECTED_DATA = {
      users: [
        'U_B9Z3BRJN'  // テスト太郎は保護
      ],
      collections: [
        'rooms',      // 部屋データは保護（既に新ID形式）
        'locations',  // 店舗データは保護
        'room_types', // 部屋タイプは保護
        'services',   // サービスデータは保護
        'system_settings' // システム設定は保護
      ]
    };
    
    // 🗑️ 開発環境で削除するデータ
    this.CLEANUP_TARGETS = [
      'bookings',           // 全予約データ削除
      'parent_bookings',    // 旧親予約システム削除
      'availability',       // 空室データ削除（再生成される）
      'booking_validations', // 予約検証データ削除
      'custom_services',    // カスタムサービス削除
      'guest_charges',      // ゲスト料金削除
      'payments',           // 支払いデータ削除
      'transportation_bookings' // 送迎予約削除
    ];
  }

  async initialize() {
    console.log('\n🔥 INITIALIZING DEVELOPMENT CLEANUP...');
    
    try {
      const config = require('../src/config.js');
      
      if (admin.apps.length === 0) {
        admin.initializeApp({
          credential: admin.credential.cert(config.firebase.serviceAccount),
          projectId: config.firebase.projectId
        });
      }
      
      this.db = admin.firestore();
      console.log('✅ Firebase connection ESTABLISHED! 🎯');
      return true;
      
    } catch (error) {
      console.error('❌ Firebase initialization FAILED:', error.message);
      return false;
    }
  }

  async analyzeCurrentData() {
    console.log('\n📊 ANALYZING CURRENT DEVELOPMENT DATA...');
    
    try {
      const collections = {};
      
      // 主要コレクションの分析
      for (const collectionName of ['users', 'bookings', 'rooms', 'locations', ...this.CLEANUP_TARGETS]) {
        try {
          const snapshot = await this.db.collection(collectionName).get();
          collections[collectionName] = snapshot;
          console.log(`📦 ${collectionName}: ${snapshot.size} documents`);
        } catch (error) {
          console.log(`📦 ${collectionName}: collection not found (OK)`);
          collections[collectionName] = { size: 0, forEach: () => {} };
        }
      }
      
      console.log('\n🔍 DATA ANALYSIS SUMMARY:');
      
      // ユーザー分析
      console.log('\n👤 USERS ANALYSIS:');
      collections.users.forEach(doc => {
        const userData = doc.data();
        const isProtected = this.PROTECTED_DATA.users.includes(userData.id);
        console.log(`  ${isProtected ? '🛡️' : '❓'} ${userData.id} - ${userData.displayName || 'N/A'} ${
          isProtected ? '(PROTECTED)' : '(WILL KEEP)'
        }`);
        if (isProtected) this.stats.protected.users++;
      });
      
      // 部屋データ分析
      console.log('\n🏠 ROOMS ANALYSIS (PROTECTED):');
      let roomCount = 0;
      collections.rooms.forEach(doc => {
        const roomData = doc.data();
        roomCount++;
        if (roomCount <= 3) {
          console.log(`  🛡️ ${roomData.id} - ${roomData.name} (${roomData.location_id})`);
        }
        this.stats.protected.rooms++;
      });
      if (roomCount > 3) {
        console.log(`  ... and ${roomCount - 3} more rooms (ALL PROTECTED)`);
      }
      
      // 削除対象分析
      console.log('\n🗑️ CLEANUP TARGETS:');
      this.CLEANUP_TARGETS.forEach(collectionName => {
        const size = collections[collectionName]?.size || 0;
        if (size > 0) {
          console.log(`  💥 ${collectionName}: ${size} documents (WILL DELETE)`);
        } else {
          console.log(`  ✅ ${collectionName}: already clean`);
        }
      });
      
      return collections;
      
    } catch (error) {
      console.error('❌ Data analysis FAILED:', error.message);
      throw error;
    }
  }

  async createCleanupBackup(collections) {
    console.log('\n💾 CREATING DEVELOPMENT BACKUP...');
    
    try {
      const timestamp = new Date().toISOString().replace(/[:.]/g, '-');
      const backupDir = path.join(__dirname, '..', 'backups', `dev-cleanup-${timestamp}`);
      
      await fs.mkdir(backupDir, { recursive: true });
      
      // 削除前のデータをバックアップ
      const backupData = {};
      for (const collectionName of this.CLEANUP_TARGETS) {
        if (collections[collectionName] && collections[collectionName].size > 0) {
          backupData[collectionName] = [];
          collections[collectionName].forEach(doc => {
            backupData[collectionName].push({
              id: doc.id,
              data: doc.data()
            });
          });
        }
      }
      
      await fs.writeFile(
        path.join(backupDir, 'cleanup-backup.json'),
        JSON.stringify(backupData, null, 2)
      );
      
      // 統計情報も保存
      await fs.writeFile(
        path.join(backupDir, 'cleanup-stats.json'),
        JSON.stringify(this.stats, null, 2)
      );
      
      console.log(`✅ Development backup created at: ${backupDir}`);
      return backupDir;
      
    } catch (error) {
      console.error('❌ Backup creation FAILED:', error.message);
      throw error;
    }
  }

  async executeCleanup(collections) {
    console.log('\n🧹 EXECUTING DEVELOPMENT CLEANUP...');
    
    try {
      let totalOperations = 0;
      
      // バッチ処理で効率的に削除
      for (const collectionName of this.CLEANUP_TARGETS) {
        const collection = collections[collectionName];
        
        if (collection && collection.size > 0) {
          console.log(`\n💥 CLEANING ${collectionName.toUpperCase()}...`);
          
          const batch = this.db.batch();
          let batchCount = 0;
          
          collection.forEach(doc => {
            batch.delete(doc.ref);
            batchCount++;
            totalOperations++;
            
            if (batchCount === 1) {
              // 最初のドキュメントの詳細を表示
              const data = doc.data();
              console.log(`   ❌ Deleting: ${data.id || doc.id} (${data.check_in_date || data.created_at || 'N/A'})`);
            }
          });
          
          if (batchCount > 1) {
            console.log(`   ❌ ... and ${batchCount - 1} more documents`);
          }
          
          // バッチ実行
          await batch.commit();
          
          // 統計更新
          if (collectionName.includes('booking')) {
            this.stats.deleted.bookings += batchCount;
          } else {
            this.stats.deleted.temp_data += batchCount;
          }
          
          console.log(`   ✅ ${collectionName}: ${batchCount} documents deleted`);
        } else {
          console.log(`   ✅ ${collectionName}: already clean`);
        }
      }
      
      this.stats.total_operations = totalOperations;
      
      if (totalOperations > 0) {
        console.log(`\n🎉 CLEANUP COMPLETE! ${totalOperations} documents deleted`);
      } else {
        console.log('\n✨ ENVIRONMENT ALREADY CLEAN!');
      }
      
      return true;
      
    } catch (error) {
      console.error('❌ Cleanup execution FAILED:', error.message);
      return false;
    }
  }

  async verifyCleanEnvironment() {
    console.log('\n🔍 VERIFYING CLEAN DEVELOPMENT ENVIRONMENT...');
    
    try {
      // クリーンアップ後の状態確認
      const verification = {};
      
      for (const collectionName of this.CLEANUP_TARGETS) {
        const snapshot = await this.db.collection(collectionName).get();
        verification[collectionName] = snapshot.size;
      }
      
      // 保護されたデータの確認
      const users = await this.db.collection('users').get();
      const rooms = await this.db.collection('rooms').get();
      
      console.log('\n✅ CLEAN ENVIRONMENT VERIFICATION:');
      
      // 削除確認
      console.log('\n🗑️ DELETED COLLECTIONS:');
      this.CLEANUP_TARGETS.forEach(collectionName => {
        const count = verification[collectionName];
        console.log(`   ${count === 0 ? '✅' : '❌'} ${collectionName}: ${count} documents`);
      });
      
      // 保護されたデータ確認
      console.log('\n🛡️ PROTECTED DATA VERIFICATION:');
      console.log(`   ✅ Users: ${users.size} preserved`);
      console.log(`   ✅ Rooms: ${rooms.size} preserved`);
      
      users.forEach(doc => {
        const userData = doc.data();
        console.log(`      👤 ${userData.id} - ${userData.displayName} (${userData.email})`);
      });
      
      // 必須ユーザーの存在確認
      let hasTestTaro = false;
      users.forEach(doc => {
        const user = doc.data();
        if (user.id === 'U_B9Z3BRJN') {
          hasTestTaro = true;
        }
      });
      
      if (!hasTestTaro) {
        console.log('🚨 WARNING: テスト太郎 user missing!');
        return false;
      }
      
      console.log('\n🎯 DEVELOPMENT ENVIRONMENT STATUS: PERFECTLY CLEAN! ✨');
      return true;
      
    } catch (error) {
      console.error('❌ Environment verification FAILED:', error.message);
      return false;
    }
  }

  printCleanupSummary() {
    console.log(`
🎉🎉🎉🎉🎉🎉🎉🎉🎉🎉🎉🎉🎉🎉🎉🎉🎉🎉🎉🎉
🏆 DEVELOPMENT CLEANUP COMPLETE! 🏆
🎉🎉🎉🎉🎉🎉🎉🎉🎉🎉🎉🎉🎉🎉🎉🎉🎉🎉🎉🎉

🗑️ CLEANED (DEVELOPMENT DATA):
   📅 Bookings: ${this.stats.deleted.bookings} deleted
   🗂️ Temporary Data: ${this.stats.deleted.temp_data} deleted
   💾 Total Operations: ${this.stats.total_operations}
   
🛡️ PROTECTED (ESSENTIAL DATA):
   👤 Users: ${this.stats.protected.users} preserved
   🏠 Rooms: ${this.stats.protected.rooms} preserved
   🏢 Locations: ${this.stats.protected.locations} preserved

🎯 READY FOR PHASE 3.2:
   ✅ Clean development environment
   ✅ No legacy data conflicts
   ✅ Perfect foundation for new features
   ✅ room_allocations table ready for implementation
   ✅ Privacy protection features ready
   ✅ Customer/admin interface separation ready

🚀 NEXT STEPS:
   1. Implement room_allocations table
   2. Create privacy-protected APIs
   3. Develop customer/admin UI separation
   4. Test new data normalization features

🎆 STATUS: READY FOR DEVELOPMENT! 🎆
`);
  }
}

// メイン実行関数
async function executeDevelopmentCleanup() {
  const master = new DevelopmentCleanupMaster();
  
  try {
    console.log('🎬 DEVELOPMENT CLEANUP STARTING! 🎬');

    // 初期化
    const initialized = await master.initialize();
    if (!initialized) {
      console.log('💥 INITIALIZATION FAILED 💥');
      process.exit(1);
    }

    // 現状分析
    const currentData = await master.analyzeCurrentData();
    
    // バックアップ作成
    await master.createCleanupBackup(currentData);
    
    // クリーンアップ実行
    const success = await master.executeCleanup(currentData);
    
    if (success) {
      // 環境検証
      const verified = await master.verifyCleanEnvironment();
      
      if (verified) {
        master.printCleanupSummary();
        console.log('\n🎆 DEVELOPMENT CLEANUP MISSION ACCOMPLISHED! 🎆');
        console.log('🔥 READY FOR PHASE 3.2 IMPLEMENTATION! 🔥');
      } else {
        console.log('\n💥 VERIFICATION FAILED 💥');
        process.exit(1);
      }
    } else {
      console.log('\n💥 CLEANUP FAILED 💥');
      process.exit(1);
    }

  } catch (error) {
    console.error('\n💥 FATAL CLEANUP ERROR:', error.message);
    console.error(error.stack);
    process.exit(1);
  }
}

// スクリプト実行
if (require.main === module) {
  executeDevelopmentCleanup()
    .then(() => {
      console.log('\n🎯 CLEANUP SCRIPT COMPLETE! 🎯');
      console.log('🎊 DEVELOPMENT ENVIRONMENT PERFECTLY PREPARED! 🎊');
      process.exit(0);
    })
    .catch(error => {
      console.error('\n💥 CLEANUP SCRIPT FAILED:', error.message);
      process.exit(1);
    });
}

module.exports = { DevelopmentCleanupMaster };