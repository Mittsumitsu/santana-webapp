// backend/scripts/check-current-data.js
const admin = require('firebase-admin');
const config = require('../src/config');

// Firebase Admin初期化
admin.initializeApp({
  credential: admin.credential.cert(config.firebase.serviceAccount),
  projectId: config.firebase.projectId
});

const db = admin.firestore();

async function checkCurrentData() {
  console.log('🔍 現在のデータベース構造を確認中...\n');
  
  try {
    // 1. 親予約データ確認
    console.log('📊 親予約 (parent_bookings) の確認:');
    const parentBookingsSnapshot = await db.collection('parent_bookings').get();
    console.log(`  件数: ${parentBookingsSnapshot.size}`);
    
    if (parentBookingsSnapshot.size > 0) {
      const sampleParent = parentBookingsSnapshot.docs[0].data();
      console.log('  サンプルデータ構造:');
      console.log(`    - ID: ${sampleParent.id || 'N/A'}`);
      console.log(`    - user_id: ${sampleParent.user_id || 'N/A'}`);
      console.log(`    - check_in_date: ${sampleParent.check_in_date || 'N/A'}`);
      console.log(`    - child_bookings: ${sampleParent.child_bookings?.length || 0} 件`);
      console.log(`    - total_amount: ${sampleParent.total_amount || 'N/A'}`);
      console.log(`    - status: ${sampleParent.status || 'N/A'}`);
      console.log(`    - primary_contact: ${sampleParent.primary_contact?.email || 'N/A'}`);
    }
    
    // 2. 子予約データ確認
    console.log('\n📊 子予約 (bookings) の確認:');
    const childBookingsSnapshot = await db.collection('bookings').get();
    console.log(`  件数: ${childBookingsSnapshot.size}`);
    
    if (childBookingsSnapshot.size > 0) {
      const sampleChild = childBookingsSnapshot.docs[0].data();
      console.log('  サンプルデータ構造:');
      console.log(`    - ID: ${sampleChild.id || 'N/A'}`);
      console.log(`    - parent_booking_id: ${sampleChild.parent_booking_id || 'N/A'}`);
      console.log(`    - room_id: ${sampleChild.room_id || 'N/A'}`);
      console.log(`    - number_of_guests: ${sampleChild.number_of_guests || 'N/A'}`);
      console.log(`    - total_amount: ${sampleChild.total_amount || 'N/A'}`);
      console.log(`    - status: ${sampleChild.status || 'N/A'}`);
    }
    
    // 3. ユーザーデータ確認
    console.log('\n👤 ユーザー (users) の確認:');
    const usersSnapshot = await db.collection('users').get();
    console.log(`  件数: ${usersSnapshot.size}`);
    
    const tempUsers = await db.collection('users')
      .where('id', '>=', 'temp_')
      .where('id', '<', 'temp_z')
      .get();
    console.log(`  temp_ユーザー: ${tempUsers.size} 件`);
    
    if (usersSnapshot.size > 0) {
      const sampleUser = usersSnapshot.docs[0].data();
      console.log('  サンプルユーザー:');
      console.log(`    - ID: ${sampleUser.id || 'N/A'}`);
      console.log(`    - email: ${sampleUser.email || 'N/A'}`);
      console.log(`    - displayName: ${sampleUser.displayName || 'N/A'}`);
      console.log(`    - userType: ${sampleUser.userType || 'N/A'}`);
    }
    
    // 4. 部屋データ確認
    console.log('\n🏠 部屋 (rooms) の確認:');
    const roomsSnapshot = await db.collection('rooms').get();
    console.log(`  件数: ${roomsSnapshot.size}`);
    
    if (roomsSnapshot.size > 0) {
      const sampleRoom = roomsSnapshot.docs[0].data();
      console.log('  サンプル部屋:');
      console.log(`    - ID: ${sampleRoom.id || 'N/A'}`);
      console.log(`    - location_id: ${sampleRoom.location_id || 'N/A'}`);
      console.log(`    - room_type_id: ${sampleRoom.room_type_id || 'N/A'}`);
      console.log(`    - name: ${sampleRoom.name || 'N/A'}`);
      console.log(`    - capacity: ${sampleRoom.capacity || 'N/A'}`);
    }
    
    // 5. 空室状況データ確認
    console.log('\n📅 空室状況 (availability) の確認:');
    const availabilitySnapshot = await db.collection('availability').get();
    console.log(`  件数: ${availabilitySnapshot.size}`);
    
    if (availabilitySnapshot.size > 0) {
      const sampleAvailability = availabilitySnapshot.docs[0].data();
      console.log('  サンプル空室状況:');
      console.log(`    - room_id: ${sampleAvailability.room_id || 'N/A'}`);
      console.log(`    - date: ${sampleAvailability.date || 'N/A'}`);
      console.log(`    - status: ${sampleAvailability.status || 'N/A'}`);
      console.log(`    - booking_id: ${sampleAvailability.booking_id || 'N/A'}`);
    }
    
    // 6. 統合予約データ確認（既に存在する場合）
    console.log('\n🔄 統合予約 (unified_bookings) の確認:');
    const unifiedSnapshot = await db.collection('unified_bookings').get();
    console.log(`  件数: ${unifiedSnapshot.size}`);
    
    if (unifiedSnapshot.size > 0) {
      const sampleUnified = unifiedSnapshot.docs[0].data();
      console.log('  サンプル統合予約:');
      console.log(`    - ID: ${sampleUnified.id || 'N/A'}`);
      console.log(`    - user_id: ${sampleUnified.user_id || 'N/A'}`);
      console.log(`    - rooms: ${sampleUnified.rooms?.length || 0} 部屋`);
      console.log(`    - total_amount: ${sampleUnified.pricing?.total_amount || 'N/A'}`);
    }
    
    // 7. まとめ
    console.log('\n' + '='.repeat(50));
    console.log('📋 データ確認結果まとめ:');
    console.log('='.repeat(50));
    console.log(`  ├─ 親予約: ${parentBookingsSnapshot.size} 件`);
    console.log(`  ├─ 子予約: ${childBookingsSnapshot.size} 件`);
    console.log(`  ├─ ユーザー: ${usersSnapshot.size} 件 (temp_: ${tempUsers.size} 件)`);
    console.log(`  ├─ 部屋: ${roomsSnapshot.size} 件`);
    console.log(`  ├─ 空室状況: ${availabilitySnapshot.size} 件`);
    console.log(`  └─ 統合予約: ${unifiedSnapshot.size} 件`);
    
    // 8. 移行判定
    console.log('\n🎯 移行判定:');
    if (parentBookingsSnapshot.size > 0) {
      console.log('✅ 移行対象データが存在します');
      console.log('📋 移行対象:');
      console.log(`   • 親予約 ${parentBookingsSnapshot.size} 件 → 統合予約に変換`);
      console.log(`   • 子予約 ${childBookingsSnapshot.size} 件 → 統合予約に含める`);
      console.log(`   • temp_ユーザー ${tempUsers.size} 件 → 正規ユーザーIDに変換`);
      console.log('\n🚀 次のステップ: Step 2 (バックアップ作成) に進んでください');
    } else if (unifiedSnapshot.size > 0) {
      console.log('ℹ️  統合予約システムが既に運用されています');
      console.log('📋 確認事項:');
      console.log('   • 旧システムからの移行は完了済み');
      console.log('   • 新しい予約は統合形式で作成されています');
    } else {
      console.log('⚠️  移行対象の予約データが見つかりません');
      console.log('📋 推奨アクション:');
      console.log('   • 新規システムとして統合予約システムから開始');
      console.log('   • または他のコレクション名を確認');
    }
    
    // 9. 部屋データの詳細確認
    if (roomsSnapshot.size > 0) {
      console.log('\n🏠 部屋データの詳細:');
      const roomsByLocation = {};
      roomsSnapshot.docs.forEach(doc => {
        const room = doc.data();
        const location = room.location_id || 'unknown';
        if (!roomsByLocation[location]) {
          roomsByLocation[location] = [];
        }
        roomsByLocation[location].push(room);
      });
      
      Object.keys(roomsByLocation).forEach(location => {
        const rooms = roomsByLocation[location];
        console.log(`   ${location}: ${rooms.length} 部屋`);
        rooms.forEach(room => {
          console.log(`     • ${room.name} (${room.room_type_id}, ${room.capacity}名)`);
        });
      });
    }
    
  } catch (error) {
    console.error('❌ データ確認エラー:', error);
    console.error('詳細:', error.message);
    
    // エラーの原因分析
    if (error.message.includes('serviceAccount')) {
      console.error('\n🔧 解決方法:');
      console.error('  1. backend/src/serviceAccount.json ファイルが存在するか確認');
      console.error('  2. serviceAccount.json の権限が正しいか確認');
      console.error('  3. config.js の設定を確認');
    }
  } finally {
    process.exit(0);
  }
}

// 実行
checkCurrentData();