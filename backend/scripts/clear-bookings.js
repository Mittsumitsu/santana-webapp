#!/usr/bin/env node

// 🧹 予約データクリア + 新システムテスト準備スクリプト
// 💪 旧予約を削除して、新システムでの予約テストを準備！

const admin = require('firebase-admin');

console.log(`
🧹🧹🧹🧹🧹🧹🧹🧹🧹🧹🧹🧹🧹🧹🧹🧹🧹🧹🧹🧹
🚀 BOOKING DATA RESET + NEW SYSTEM TEST PREP 🚀
💪 CLEAR OLD BOOKINGS & PREPARE FOR FRESH TESTS! 💪
🧹🧹🧹🧹🧹🧹🧹🧹🧹🧹🧹🧹🧹🧹🧹🧹🧹🧹🧹🧹
`);

class BookingResetMaster {
  constructor() {
    this.stats = {
      deleted_bookings: 0,
      kept_users: 0,
      kept_rooms: 0
    };
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

  async analyzeCurrentBookings() {
    console.log('\n📊 ANALYZING CURRENT BOOKINGS...');
    
    try {
      const bookingsSnapshot = await this.db.collection('bookings').get();
      const usersSnapshot = await this.db.collection('users').get();
      const roomsSnapshot = await this.db.collection('rooms').get();

      console.log('\n📋 CURRENT STATE:');
      
      // 予約分析
      console.log(`\n📅 BOOKINGS TO DELETE: ${bookingsSnapshot.size}`);
      bookingsSnapshot.forEach(doc => {
        const booking = doc.data();
        console.log(`  🗑️ ${booking.id} - ${booking.check_in_date} to ${booking.check_out_date} (₹${booking.total_amount})`);
      });

      // ユーザー確認
      console.log(`\n👤 USERS TO KEEP: ${usersSnapshot.size}`);
      usersSnapshot.forEach(doc => {
        const user = doc.data();
        console.log(`  ✅ ${user.id} - ${user.displayName} (${user.email})`);
      });

      // 部屋確認
      console.log(`\n🏠 ROOMS TO KEEP: ${roomsSnapshot.size}`);
      let roomCount = 0;
      roomsSnapshot.forEach(doc => {
        const room = doc.data();
        roomCount++;
        if (roomCount <= 5) {
          console.log(`  ✅ ${room.id} - ${room.name}`);
        }
      });
      if (roomCount > 5) {
        console.log(`  ... and ${roomCount - 5} more rooms`);
      }

      return {
        bookings: bookingsSnapshot.size,
        users: usersSnapshot.size,
        rooms: roomsSnapshot.size
      };

    } catch (error) {
      console.error('❌ Analysis FAILED:', error.message);
      throw error;
    }
  }

  async clearAllBookings() {
    console.log('\n🗑️ CLEARING ALL BOOKING DATA...');
    
    try {
      const bookingsSnapshot = await this.db.collection('bookings').get();
      
      if (bookingsSnapshot.empty) {
        console.log('✅ No bookings to delete!');
        return true;
      }

      const batch = this.db.batch();
      let deletionCount = 0;

      bookingsSnapshot.forEach(doc => {
        batch.delete(doc.ref);
        deletionCount++;
        console.log(`❌ Queued for deletion: ${doc.data().id}`);
      });

      console.log(`\n💥 EXECUTING DELETION BATCH (${deletionCount} bookings)...`);
      await batch.commit();
      
      this.stats.deleted_bookings = deletionCount;
      console.log('🎉 ALL BOOKINGS DELETED SUCCESSFULLY! 🎉');

      return true;

    } catch (error) {
      console.error('❌ Booking deletion FAILED:', error.message);
      return false;
    }
  }

  async verifyCleanState() {
    console.log('\n🔍 VERIFYING CLEAN STATE...');
    
    try {
      const bookingsSnapshot = await this.db.collection('bookings').get();
      const usersSnapshot = await this.db.collection('users').get();
      const roomsSnapshot = await this.db.collection('rooms').get();

      console.log('\n✅ VERIFICATION RESULTS:');
      console.log(`   📅 Bookings remaining: ${bookingsSnapshot.size} (should be 0)`);
      console.log(`   👤 Users remaining: ${usersSnapshot.size} (should be 1)`);
      console.log(`   🏠 Rooms remaining: ${roomsSnapshot.size} (should be 29)`);

      this.stats.kept_users = usersSnapshot.size;
      this.stats.kept_rooms = roomsSnapshot.size;

      if (bookingsSnapshot.size === 0) {
        console.log('🎯 PERFECT! Ready for new booking tests!');
        return true;
      } else {
        console.log('⚠️ Some bookings still remain!');
        return false;
      }

    } catch (error) {
      console.error('❌ Verification FAILED:', error.message);
      return false;
    }
  }

  printResetStats() {
    console.log(`
🎊🎊🎊🎊🎊🎊🎊🎊🎊🎊🎊🎊🎊🎊🎊🎊🎊🎊🎊🎊
🏆 BOOKING RESET COMPLETE! 🏆
🎊🎊🎊🎊🎊🎊🎊🎊🎊🎊🎊🎊🎊🎊🎊🎊🎊🎊🎊🎊

🗑️ DELETION RESULTS:
   📅 Bookings deleted: ${this.stats.deleted_bookings}
   
✅ PRESERVED DATA:
   👤 Users kept: ${this.stats.kept_users} (テスト太郎)
   🏠 Rooms kept: ${this.stats.kept_rooms} (新IDシステム)

🔥 SYSTEM STATUS:
   ✅ Clean slate for new bookings
   ✅ User U_RCBCBK7V ready for testing
   ✅ All rooms available for booking
   ✅ New ID system fully operational

🎯 READY FOR TESTING:
   1. Go to localhost:3001
   2. Search for rooms
   3. Make a new booking
   4. Check dashboard for results
   
🚀 LET'S TEST THE NEW BOOKING SYSTEM! 🚀
`);
  }

  async showTestInstructions() {
    console.log('\n🎯 NEW BOOKING TEST INSTRUCTIONS:');
    console.log('================================');
    console.log('');
    console.log('1. 🌐 Open browser: http://localhost:3001');
    console.log('2. 🔍 Fill in search form:');
    console.log('   - Check-in: Tomorrow');
    console.log('   - Check-out: Day after tomorrow');
    console.log('   - Guests: 1 or 2 people');
    console.log('   - Location: Delhi/Varanasi/Puri');
    console.log('3. 🎯 Click "検索" button');
    console.log('4. 📋 Select a room combination');
    console.log('5. 📝 Fill booking form:');
    console.log('   - Name: テスト 太郎');
    console.log('   - Email: oo00mixan00oo@icloud.com');
    console.log('6. ✅ Submit booking');
    console.log('7. 🎉 Check success page');
    console.log('8. 📊 Go to /dashboard to see new booking');
    console.log('');
    console.log('🔥 EXPECTED RESULTS:');
    console.log('   - New booking ID: B_XXXXXXXXXXXX');
    console.log('   - User ID: U_RCBCBK7V');
    console.log('   - Room IDs: R_XXXXXX');
    console.log('   - Perfect visibility in dashboard');
    console.log('');
    console.log('📞 PHONE SUPPORT TEST:');
    console.log('   "Your booking ID is B underscore [12 uppercase chars]"');
    console.log('   🔥 ZERO CONFUSION GUARANTEED! 🔥');
  }
}

// メイン実行
async function executeBookingReset() {
  const master = new BookingResetMaster();
  
  try {
    console.log('🎬 BOOKING RESET SHOWTIME! 🎬');

    // 初期化
    const initialized = await master.initialize();
    if (!initialized) {
      console.log('💥 INITIALIZATION FAILED 💥');
      process.exit(1);
    }

    // 現状分析
    await master.analyzeCurrentBookings();
    
    // 予約データクリア
    const success = await master.clearAllBookings();
    
    if (success) {
      // 検証
      const verified = await master.verifyCleanState();
      
      if (verified) {
        master.printResetStats();
        await master.showTestInstructions();
        console.log('\n🎆 RESET MISSION ACCOMPLISHED! 🎆');
        console.log('🔥 READY FOR NEW BOOKING TESTS! 🔥');
      } else {
        console.log('\n⚠️ VERIFICATION FAILED 🚠');
      }
    } else {
      console.log('\n💥 RESET FAILED 💥');
      process.exit(1);
    }

  } catch (error) {
    console.error('\n💥 FATAL RESET ERROR:', error.message);
    console.error(error.stack);
    process.exit(1);
  }
}

if (require.main === module) {
  executeBookingReset()
    .then(() => {
      console.log('\n🎯 RESET SCRIPT COMPLETE! 🎯');
      console.log('🎊 START FRESH BOOKING TESTS NOW! 🎊');
      process.exit(0);
    })
    .catch(error => {
      console.error('\n💥 RESET SCRIPT FAILED:', error.message);
      process.exit(1);
    });
}

module.exports = { BookingResetMaster };