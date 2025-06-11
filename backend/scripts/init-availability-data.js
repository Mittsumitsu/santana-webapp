// backend/scripts/init-availability-data.js
// 🗓️ 空室管理データ初期化スクリプト

const admin = require('firebase-admin');
const config = require('../src/config.js');

console.log(`
🗓️🗓️🗓️🗓️🗓️🗓️🗓️🗓️🗓️🗓️🗓️🗓️🗓️🗓️🗓️🗓️🗓️🗓️🗓️🗓️
📅 AVAILABILITY DATA INITIALIZATION 📅
🚀 空室管理システム初期化スクリプト 🚀
🗓️🗓️🗓️🗓️🗓️🗓️🗓️🗓️🗓️🗓️🗓️🗓️🗓️🗓️🗓️🗓️🗓️🗓️🗓️🗓️
`);

class AvailabilityInitializer {
  constructor() {
    this.stats = {
      rooms_processed: 0,
      availability_records_created: 0,
      date_range_days: 90, // 3ヶ月分
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

  generateDateRange(startDate, days) {
    const dates = [];
    const current = new Date(startDate);
    
    for (let i = 0; i < days; i++) {
      dates.push(current.toISOString().split('T')[0]);
      current.setDate(current.getDate() + 1);
    }
    
    return dates;
  }

  async loadRooms() {
    console.log('\n🏠 LOADING ROOMS FROM FIRESTORE...');
    
    try {
      const snapshot = await this.db.collection('rooms').get();
      
      this.rooms = [];
      snapshot.forEach(doc => {
        this.rooms.push({
          id: doc.id,
          ...doc.data()
        });
      });
      
      console.log(`✅ Loaded ${this.rooms.length} rooms`);
      
      // Delhi部屋のみ表示
      const delhiRooms = this.rooms.filter(room => room.location_id === 'delhi');
      console.log(`\n🏙️ DELHI ROOMS (${delhiRooms.length} rooms):`);
      delhiRooms.forEach(room => {
        console.log(`  🏠 ${room.id} - ${room.name} (${room.room_type_id})`);
      });
      
      return this.rooms.length > 0;
      
    } catch (error) {
      console.error('❌ Failed to load rooms:', error.message);
      return false;
    }
  }

  async checkExistingAvailability() {
    console.log('\n📅 CHECKING EXISTING AVAILABILITY DATA...');
    
    try {
      const snapshot = await this.db.collection('availability').get();
      console.log(`📊 Current availability records: ${snapshot.size}`);
      
      if (snapshot.size > 0) {
        console.log('\n📋 SAMPLE AVAILABILITY RECORDS:');
        snapshot.docs.slice(0, 5).forEach(doc => {
          const data = doc.data();
          console.log(`  📅 ${doc.id} - Room: ${data.room_id}, Date: ${data.date}, Status: ${data.status}`);
        });
      }
      
      return snapshot.size;
      
    } catch (error) {
      console.error('❌ Failed to check availability:', error.message);
      return 0;
    }
  }

  async createAvailabilityData() {
    console.log('\n🚀 CREATING AVAILABILITY DATA...');
    
    const today = new Date();
    const startDate = today.toISOString().split('T')[0];
    const dateRange = this.generateDateRange(startDate, this.stats.date_range_days);
    
    console.log(`📅 Date range: ${startDate} to ${dateRange[dateRange.length - 1]} (${dateRange.length} days)`);
    
    try {
      const batch = this.db.batch();
      let batchCount = 0;
      const maxBatchSize = 500; // Firestore batch limit
      
      for (const room of this.rooms) {
        console.log(`\n🏠 Processing room: ${room.id} - ${room.name}`);
        
        for (const date of dateRange) {
          const availabilityId = `${room.id}_${date}`;
          
          const availabilityData = {
            room_id: room.id,
            date: date,
            status: 'available', // available, booked, maintenance
            booking_id: null,
            created_at: admin.firestore.FieldValue.serverTimestamp(),
            updated_at: admin.firestore.FieldValue.serverTimestamp()
          };
          
          const docRef = this.db.collection('availability').doc(availabilityId);
          batch.set(docRef, availabilityData);
          
          batchCount++;
          this.stats.availability_records_created++;
          
          // Execute batch when reaching limit
          if (batchCount >= maxBatchSize) {
            console.log(`💥 Executing batch (${batchCount} records)...`);
            await batch.commit();
            batchCount = 0;
            
            // Create new batch
            const newBatch = this.db.batch();
            Object.setPrototypeOf(batch, Object.getPrototypeOf(newBatch));
            Object.assign(batch, newBatch);
          }
        }
        
        this.stats.rooms_processed++;
        console.log(`  ✅ ${room.id} - ${dateRange.length} availability records queued`);
      }
      
      // Execute remaining batch
      if (batchCount > 0) {
        console.log(`💥 Executing final batch (${batchCount} records)...`);
        await batch.commit();
      }
      
      console.log('\n🎉 AVAILABILITY DATA CREATION COMPLETED!');
      return true;
      
    } catch (error) {
      console.error('❌ Failed to create availability data:', error.message);
      this.stats.errors++;
      return false;
    }
  }

  async verifyData() {
    console.log('\n🔍 VERIFYING CREATED DATA...');
    
    try {
      const snapshot = await this.db.collection('availability').get();
      const actualCount = snapshot.size;
      
      console.log(`📊 Verification results:`);
      console.log(`  📅 Total availability records: ${actualCount}`);
      console.log(`  🎯 Expected records: ${this.stats.availability_records_created}`);
      console.log(`  ✅ Match: ${actualCount === this.stats.availability_records_created ? 'YES' : 'NO'}`);
      
      // Sample verification
      if (actualCount > 0) {
        console.log('\n📋 SAMPLE CREATED RECORDS:');
        snapshot.docs.slice(0, 5).forEach(doc => {
          const data = doc.data();
          console.log(`  📅 ${doc.id} - Room: ${data.room_id}, Date: ${data.date}, Status: ${data.status}`);
        });
      }
      
      return actualCount > 0;
      
    } catch (error) {
      console.error('❌ Verification failed:', error.message);
      return false;
    }
  }

  printFinalReport() {
    console.log(`
🎊🎊🎊🎊🎊🎊🎊🎊🎊🎊🎊🎊🎊🎊🎊🎊🎊🎊🎊🎊
🏆 AVAILABILITY INITIALIZATION COMPLETE! 🏆
🎊🎊🎊🎊🎊🎊🎊🎊🎊🎊🎊🎊🎊🎊🎊🎊🎊🎊🎊🎊

📊 FINAL STATISTICS:
   🏠 Rooms processed: ${this.stats.rooms_processed}
   📅 Availability records created: ${this.stats.availability_records_created}
   🗓️ Date range: ${this.stats.date_range_days} days
   ❌ Errors: ${this.stats.errors}

🎯 SYSTEM STATUS:
   ✅ Availability data initialized
   ✅ Room booking status tracking ready
   ✅ 3-month booking window available

🚀 NEXT STEPS:
   1. Restart your server
   2. Try room search again
   3. Availability data should now work properly!
   
📅 AVAILABILITY SYSTEM READY! 📅
`);
  }
}

// メイン実行
async function executeInitialization() {
  const initializer = new AvailabilityInitializer();
  
  try {
    console.log('🎬 AVAILABILITY INITIALIZATION SHOWTIME! 🎬');

    // 初期化
    const initialized = await initializer.initialize();
    if (!initialized) {
      console.log('💥 INITIALIZATION FAILED 💥');
      process.exit(1);
    }

    // 部屋データ読み込み
    const roomsLoaded = await initializer.loadRooms();
    if (!roomsLoaded) {
      console.log('💥 ROOMS LOAD FAILED 💥');
      process.exit(1);
    }

    // 既存の空室データチェック
    const existingCount = await initializer.checkExistingAvailability();
    
    if (existingCount > 0) {
      console.log(`\n⚠️ EXISTING AVAILABILITY DATA FOUND (${existingCount} records)`);
      console.log('Do you want to proceed and create additional data? (This script will create new records)');
      console.log('🎯 Proceeding with creation...');
    }

    // 空室データ作成
    const created = await initializer.createAvailabilityData();
    if (!created) {
      console.log('💥 AVAILABILITY DATA CREATION FAILED 💥');
      process.exit(1);
    }

    // 検証
    const verified = await initializer.verifyData();
    if (!verified) {
      console.log('💥 DATA VERIFICATION FAILED 💥');
      process.exit(1);
    }

    initializer.printFinalReport();
    console.log('\n🎆 AVAILABILITY INITIALIZATION MISSION ACCOMPLISHED! 🎆');
    
  } catch (error) {
    console.error('💥 MISSION FAILED 💥', error);
    process.exit(1);
  } finally {
    process.exit(0);
  }
}

// 実行
executeInitialization();