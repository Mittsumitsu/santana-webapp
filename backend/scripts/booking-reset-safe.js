#!/usr/bin/env node

// 🧹 予約データクリア + ダミーデータ1件保持スクリプト
// 💪 旧予約を削除して、ダミー1件だけ残してコレクション保持！

const admin = require('firebase-admin');

console.log(`
🧹🧹🧹🧹🧹🧹🧹🧹🧹🧹🧹🧹🧹🧹🧹🧹🧹🧹🧹🧹
🚀 SAFE BOOKING RESET + DUMMY DATA RETENTION 🚀
💪 CLEAR OLD BOOKINGS & KEEP 1 DUMMY FOR COLLECTION! 💪
🧹🧹🧹🧹🧹🧹🧹🧹🧹🧹🧹🧹🧹🧹🧹🧹🧹🧹🧹🧹
`);

class SafeBookingResetMaster {
  constructor() {
    this.stats = {
      deleted_bookings: 0,
      kept_dummy: 0,
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
      console.log(`\n📅 BOOKINGS ANALYSIS: ${bookingsSnapshot.size} total`);
      bookingsSnapshot.forEach((doc, index) => {
        const booking = doc.data();
        const action = index === 0 ? '🔒 KEEP AS DUMMY' : '🗑️ DELETE';
        console.log(`  ${action} ${booking.id} - ${booking.check_in_date} to ${booking.check_out_date} (₹${booking.total_amount})`);
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
        if (roomCount <= 3) {
          console.log(`  ✅ ${room.id} - ${room.name}`);
        }
      });
      if (roomCount > 3) {
        console.log(`  ... and ${roomCount - 3} more rooms`);
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

  async clearBookingsKeepOne() {
    console.log('\n🗑️ CLEARING BOOKINGS (KEEPING 1 DUMMY)...');
    
    try {
      const bookingsSnapshot = await this.db.collection('bookings').get();
      
      if (bookingsSnapshot.empty) {
        console.log('📝 No bookings exist. Creating dummy booking...');
        await this.createDummyBooking();
        return true;
      }

      const bookingDocs = bookingsSnapshot.docs;
      
      if (bookingDocs.length === 1) {
        console.log('✅ Only 1 booking exists. Keeping it as dummy!');
        this.stats.kept_dummy = 1;
        return true;
      }

      // 最初の1件を残して、残りを削除
      const batch = this.db.batch();
      let deletionCount = 0;
      let keptBooking = null;

      bookingDocs.forEach((doc, index) => {
        if (index === 0) {
          // 最初の予約はダミーとして保持
          keptBooking = doc.data();
          console.log(`🔒 KEEPING AS DUMMY: ${keptBooking.id}`);
          this.stats.kept_dummy = 1;
        } else {
          // 残りは削除
          batch.delete(doc.ref);
          deletionCount++;
          console.log(`❌ Queued for deletion: ${doc.data().id}`);
        }
      });

      if (deletionCount > 0) {
        console.log(`\n💥 EXECUTING DELETION BATCH (${deletionCount} bookings)...`);
        await batch.commit();
        this.stats.deleted_bookings = deletionCount;
        console.log('🎉 SELECTIVE DELETION COMPLETED! 🎉');
      } else {
        console.log('ℹ️ No bookings needed deletion.');
      }

      console.log(`🔒 DUMMY BOOKING RETAINED: ${keptBooking.id}`);
      console.log(`   📅 Dates: ${keptBooking.check_in_date} to ${keptBooking.check_out_date}`);
      console.log(`   👤 User: ${keptBooking.user_id}`);
      console.log(`   💰 Amount: ₹${keptBooking.total_amount}`);

      return true;

    } catch (error) {
      console.error('❌ Selective booking deletion FAILED:', error.message);
      return false;
    }
  }

  async createDummyBooking() {
    console.log('\n🔧 CREATING DUMMY BOOKING TO PRESERVE COLLECTION...');
    
    try {
      const dummyId = this.generateDummyBookingId();
      
      const dummyBooking = {
        id: dummyId,
        user_id: 'U_DUMMY001',
        check_in_date: '2020-01-01',
        check_out_date: '2020-01-02',
        status: 'completed',
        total_guests: 1,
        total_amount: 1000,
        primary_contact: {
          name_kanji: 'ダミー データ',
          name_romaji: 'DUMMY DATA',
          email: 'dummy@example.com',
          gender: 'male'
        },
        rooms: [{
          room_id: 'dummy-room',
          room_type_id: 'single',
          room_name: 'ダミールーム',
          check_in_time: '14:00',
          number_of_guests: 1,
          primary_guest: {
            name_romaji: 'DUMMY USER',
            gender: 'male'
          },
          additional_guests: [],
          room_amount: 1000,
          room_snapshot: {
            room_type_id: 'single',
            room_type_name: 'シングルルーム',
            capacity: 1,
            current_price: 1000,
            location_id: 'dummy',
            room_number: '000'
          }
        }],
        created_at: admin.firestore.Timestamp.fromDate(new Date('2020-01-01')),
        updated_at: admin.firestore.Timestamp.fromDate(new Date('2020-01-01')),
        created_by: 'U_DUMMY001',
        system_version: '2.0_NEW_ID_SYSTEM',
        booking_type: 'unified_booking',
        is_dummy: true,
        dummy_purpose: 'collection_preservation'
      };

      await this.db.collection('bookings').doc(dummyId).set(dummyBooking);
      
      console.log('✅ DUMMY BOOKING CREATED:');
      console.log(`   📋 ID: ${dummyId}`);
      console.log(`   🔒 Purpose: Collection preservation`);
      console.log(`   📅 Date: 2020-01-01 (old date)`);
      console.log(`   💰 Amount: ₹1,000`);
      
      this.stats.kept_dummy = 1;
      return true;

    } catch (error) {
      console.error('❌ Dummy booking creation FAILED:', error.message);
      return false;
    }
  }

  generateDummyBookingId() {
    return 'B_DUMMY000001';
  }

  async verifyFinalState() {
    console.log('\n🔍 VERIFYING FINAL STATE...');
    
    try {
      const bookingsSnapshot = await this.db.collection('bookings').get();
      const usersSnapshot = await this.db.collection('users').get();
      const roomsSnapshot = await this.db.collection('rooms').get();

      console.log('\n✅ VERIFICATION RESULTS:');
      console.log(`   📅 Bookings remaining: ${bookingsSnapshot.size} (should be 1 dummy)`);
      console.log(`   👤 Users remaining: ${usersSnapshot.size}`);
      console.log(`   🏠 Rooms remaining: ${roomsSnapshot.size}`);

      // ダミー予約の確認
      if (bookingsSnapshot.size === 1) {
        const dummyBooking = bookingsSnapshot.docs[0].data();
        console.log(`\n🔒 DUMMY BOOKING DETAILS:`);
        console.log(`   📋 ID: ${dummyBooking.id}`);
        console.log(`   📅 Date: ${dummyBooking.check_in_date}`);
        console.log(`   🎯 Purpose: ${dummyBooking.dummy_purpose || 'Preserved from original data'}`);
        
        if (dummyBooking.is_dummy) {
          console.log(`   ✅ Properly marked as dummy data`);
        }
      }

      this.stats.kept_users = usersSnapshot.size;
      this.stats.kept_rooms = roomsSnapshot.size;

      if (bookingsSnapshot.size === 1) {
        console.log('🎯 PERFECT! Collection preserved with 1 dummy booking!');
        return true;
      } else {
        console.log(`⚠️ Unexpected booking count: ${bookingsSnapshot.size}`);
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
🏆 SAFE BOOKING RESET COMPLETE! 🏆
🎊🎊🎊🎊🎊🎊🎊🎊🎊🎊🎊🎊🎊🎊🎊🎊🎊🎊🎊🎊

🗑️ DELETION RESULTS:
   📅 Bookings deleted: ${this.stats.deleted_bookings}
   
🔒 PRESERVATION RESULTS:
   📋 Dummy bookings kept: ${this.stats.kept_dummy}
   👤 Users kept: ${this.stats.kept_users}
   🏠 Rooms kept: ${this.stats.kept_rooms}

🔥 COLLECTION STATUS:
   ✅ Bookings collection preserved (not empty)
   ✅ Users collection intact
   ✅ Rooms collection intact
   ✅ 1 dummy booking for collection health

🎯 READY FOR TESTING:
   1. Collection structure maintained
   2. Old booking data cleared
   3. New booking tests can proceed
   4. Dummy data won't interfere
   
🚀 SAFE TO START NEW BOOKING TESTS! 🚀
`);
  }

  async showTestInstructions() {
    console.log('\n🎯 NEW BOOKING TEST INSTRUCTIONS:');
    console.log('================================');
    console.log('');
    console.log('✅ COLLECTION STATUS:');
    console.log('   - Bookings collection: PRESERVED (1 dummy)');
    console.log('   - Users collection: INTACT');
    console.log('   - Rooms collection: INTACT');
    console.log('');
    console.log('🧪 TEST PROCEDURE:');
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
    console.log('🔍 EXPECTED DASHBOARD RESULT:');
    console.log('   - Should show your new booking');
    console.log('   - Should NOT show the dummy booking (old date)');
    console.log('   - Room type should display correctly');
    console.log('');
    console.log('📞 PHONE SUPPORT TEST:');
    console.log('   "Your booking ID is B underscore [12 uppercase chars]"');
    console.log('   🔥 ZERO CONFUSION GUARANTEED! 🔥');
  }
}

// メイン実行
async function executeSafeBookingReset() {
  const master = new SafeBookingResetMaster();
  
  try {
    console.log('🎬 SAFE BOOKING RESET SHOWTIME! 🎬');

    // 初期化
    const initialized = await master.initialize();
    if (!initialized) {
      console.log('💥 INITIALIZATION FAILED 💥');
      process.exit(1);
    }

    // 現状分析
    await master.analyzeCurrentBookings();
    
    // 安全な予約データクリア（1件残し）
    const success = await master.clearBookingsKeepOne();
    
    if (success) {
      // 検証
      const verified = await master.verifyFinalState();
      
      if (verified) {
        master.printResetStats();
        await master.showTestInstructions();
        console.log('\n🎆 SAFE RESET MISSION ACCOMPLISHED! 🎆');
        console.log('🔒 COLLECTION PRESERVED & READY FOR TESTS! 🔒');
      } else {
        console.log('\n⚠️ VERIFICATION FAILED ⚠️');
      }
    } else {
      console.log('\n💥 SAFE RESET FAILED 💥');
      process.exit(1);
    }

  } catch (error) {
    console.error('\n💥 FATAL RESET ERROR:', error.message);
    console.error(error.stack);
    process.exit(1);
  }
}

if (require.main === module) {
  executeSafeBookingReset()
    .then(() => {
      console.log('\n🎯 SAFE RESET SCRIPT COMPLETE! 🎯');
      console.log('🔒 COLLECTION PRESERVED & READY FOR FRESH TESTS! 🔒');
      process.exit(0);
    })
    .catch(error => {
      console.error('\n💥 SAFE RESET SCRIPT FAILED:', error.message);
      process.exit(1);
    });
}

module.exports = { SafeBookingResetMaster };