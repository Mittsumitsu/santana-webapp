// 🔄 シンプル availability 構造拡張スクリプト
// backend/scripts/simple-migrate.js
// 既存の init-availability-data.js パターンに合わせた安全版

const admin = require('firebase-admin');
const config = require('../src/config.js');

console.log(`
🔄🔄🔄🔄🔄🔄🔄🔄🔄🔄🔄🔄🔄🔄🔄🔄🔄🔄🔄🔄
📅 SIMPLE AVAILABILITY STRUCTURE UPGRADE 📅
🚀 既存データを新構造に安全移行 🚀
🔄🔄🔄🔄🔄🔄🔄🔄🔄🔄🔄🔄🔄🔄🔄🔄🔄🔄🔄🔄
`);

class SimpleAvailabilityUpgrader {
  constructor() {
    this.stats = {
      checked: 0,
      upgraded: 0,
      skipped: 0,
      errors: 0
    };
  }

  async initialize() {
    console.log('\n🔥 INITIALIZING FIREBASE...');
    
    try {
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

  async checkCurrentStructure() {
    console.log('\n🔍 CHECKING CURRENT AVAILABILITY STRUCTURE...');
    
    try {
      const snapshot = await this.db.collection('availability').limit(5).get();
      console.log(`📊 Found ${snapshot.size} sample records`);
      
      if (snapshot.size === 0) {
        console.log('⚠️ No availability data found!');
        return false;
      }
      
      let needsUpgrade = false;
      
      snapshot.docs.forEach(doc => {
        const data = doc.data();
        console.log(`\n📅 Sample: ${doc.id}`);
        console.log(`  room_id: ${data.room_id}`);
        console.log(`  date: ${data.date}`);
        console.log(`  status: ${data.status}`);
        console.log(`  has status_info: ${!!data.status_info}`);
        console.log(`  has customer_visible: ${!!data.customer_visible}`);
        
        if (!data.status_info || !data.hasOwnProperty('customer_visible')) {
          needsUpgrade = true;
        }
      });
      
      console.log(`\n🎯 Upgrade needed: ${needsUpgrade ? 'YES' : 'NO'}`);
      return needsUpgrade;
      
    } catch (error) {
      console.error('❌ Structure check failed:', error.message);
      return false;
    }
  }

  async upgradeAllRecords() {
    console.log('\n🚀 STARTING RECORDS UPGRADE...');
    
    try {
      // ページネーション付きで安全に処理
      let lastDoc = null;
      const batchSize = 50;
      
      while (true) {
        let query = this.db.collection('availability')
          .orderBy('date')
          .limit(batchSize);
        
        if (lastDoc) {
          query = query.startAfter(lastDoc);
        }
        
        const snapshot = await query.get();
        
        if (snapshot.empty) {
          console.log('📋 No more records to process');
          break;
        }
        
        await this.processBatch(snapshot.docs);
        lastDoc = snapshot.docs[snapshot.docs.length - 1];
        
        console.log(`📊 Progress: ${this.stats.checked} checked, ${this.stats.upgraded} upgraded`);
        
        // 少し待機（レート制限対策）
        await new Promise(resolve => setTimeout(resolve, 100));
      }
      
      return true;
      
    } catch (error) {
      console.error('❌ Upgrade failed:', error.message);
      return false;
    }
  }

  async processBatch(docs) {
    const batch = this.db.batch();
    let operations = 0;
    
    for (const doc of docs) {
      const data = doc.data();
      this.stats.checked++;
      
      // 既に新構造かチェック
      if (data.status_info && data.hasOwnProperty('customer_visible')) {
        this.stats.skipped++;
        continue;
      }
      
      // 新しいフィールドを追加
      const upgradeData = this.createUpgradeData(data.status || 'available');
      
      batch.update(doc.ref, upgradeData);
      operations++;
      this.stats.upgraded++;
      
      console.log(`  🔄 Upgrading: ${doc.id}`);
    }
    
    if (operations > 0) {
      await batch.commit();
      console.log(`  ✅ Batch committed: ${operations} updates`);
    }
  }

  createUpgradeData(status) {
    // ステータス情報マップ
    const statusMap = {
      available: {
        name: "空室",
        customer_visible: true,
        staff_visible: true,
        bookable: true,
        color: "#28a745",
        icon: "⭕️"
      },
      booked: {
        name: "通常予約",
        customer_visible: false,
        staff_visible: true,
        bookable: false,
        color: "#dc3545",
        icon: "🔴"
      },
      tour_booking: {
        name: "ツアー予約",
        customer_visible: false,
        staff_visible: true,
        bookable: false,
        color: "#ffc107",
        icon: "🚌"
      },
      festival_booking: {
        name: "祭特別予約",
        customer_visible: true,
        staff_visible: true,
        bookable: false,
        color: "#6f42c1",
        icon: "🎭"
      },
      maintenance: {
        name: "メンテナンス",
        customer_visible: false,
        staff_visible: true,
        bookable: false,
        color: "#6c757d",
        icon: "🔧"
      }
    };
    
    const statusInfo = statusMap[status] || statusMap.available;
    
    return {
      status_info: {
        code: status,
        name: statusInfo.name,
        customer_visible: statusInfo.customer_visible,
        staff_visible: statusInfo.staff_visible,
        bookable: statusInfo.bookable,
        color: statusInfo.color,
        icon: statusInfo.icon
      },
      customer_visible: statusInfo.customer_visible,
      staff_notes: '',
      booking_type: 'none',
      migrated_at: admin.firestore.FieldValue.serverTimestamp(),
      migration_version: '1.0',
      updated_at: admin.firestore.FieldValue.serverTimestamp()
    };
  }

  printReport() {
    console.log(`
🎊🎊🎊🎊🎊🎊🎊🎊🎊🎊🎊🎊🎊🎊🎊🎊🎊🎊🎊🎊
🏆 AVAILABILITY STRUCTURE UPGRADE COMPLETE! 🏆
🎊🎊🎊🎊🎊🎊🎊🎊🎊🎊🎊🎊🎊🎊🎊🎊🎊🎊🎊🎊

📊 UPGRADE STATISTICS:
   📋 Records checked: ${this.stats.checked}
   🔄 Records upgraded: ${this.stats.upgraded}
   ⏭️ Records skipped (already new): ${this.stats.skipped}
   ❌ Errors: ${this.stats.errors}

🎯 NEW FEATURES ADDED:
   ✅ Status information objects
   ✅ Customer visibility flags
   ✅ Staff notes fields
   ✅ Booking type classification
   ✅ Enhanced metadata

🚀 SYSTEM READY FOR:
   ⭕️ 空室多い / 🔺 空室少ない / ❌ 満室 表示
   🎭 祭期間管理
   🚌 ツアー予約管理
   🔧 メンテナンス管理

📅 AVAILABILITY SYSTEM UPGRADED! 📅
`);
  }
}

// メイン実行関数
async function executeUpgrade() {
  const upgrader = new SimpleAvailabilityUpgrader();
  
  try {
    console.log('🎬 SIMPLE UPGRADE SHOWTIME! 🎬');

    // 初期化
    const initialized = await upgrader.initialize();
    if (!initialized) {
      console.log('💥 INITIALIZATION FAILED 💥');
      process.exit(1);
    }

    // 現在の構造チェック
    const needsUpgrade = await upgrader.checkCurrentStructure();
    if (!needsUpgrade) {
      console.log('🎉 NO UPGRADE NEEDED - STRUCTURE ALREADY UP TO DATE! 🎉');
      process.exit(0);
    }

    console.log('\n🚀 UPGRADE REQUIRED - PROCEEDING...');

    // アップグレード実行
    const upgraded = await upgrader.upgradeAllRecords();
    if (!upgraded) {
      console.log('💥 UPGRADE FAILED 💥');
      process.exit(1);
    }

    upgrader.printReport();
    console.log('\n🎆 SIMPLE UPGRADE MISSION ACCOMPLISHED! 🎆');
    
  } catch (error) {
    console.error('💥 MISSION FAILED 💥', error);
    process.exit(1);
  } finally {
    process.exit(0);
  }
}

// 実行
executeUpgrade();