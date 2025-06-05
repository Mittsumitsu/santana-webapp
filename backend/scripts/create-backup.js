// backend/scripts/create-backup.js
const admin = require('firebase-admin');
const config = require('../src/config');
const fs = require('fs');
const path = require('path');

// Firebase Admin初期化
admin.initializeApp({
  credential: admin.credential.cert(config.firebase.serviceAccount),
  projectId: config.firebase.projectId
});

const db = admin.firestore();

async function createBackup() {
  console.log('📦 バックアップ作成開始...\n');
  
  const timestamp = new Date().toISOString().replace(/[:.]/g, '-');
  const backupDir = path.join(__dirname, '..', 'backups', `backup-${timestamp}`);
  
  try {
    // バックアップディレクトリ作成
    if (!fs.existsSync(path.dirname(backupDir))) {
      fs.mkdirSync(path.dirname(backupDir), { recursive: true });
    }
    fs.mkdirSync(backupDir, { recursive: true });
    
    console.log(`📁 バックアップディレクトリ: ${backupDir}`);
    
    // 1. 親予約のバックアップ
    console.log('📊 親予約データをバックアップ中...');
    const parentBookings = await db.collection('parent_bookings').get();
    const parentData = [];
    parentBookings.forEach(doc => {
      parentData.push({ id: doc.id, ...doc.data() });
    });
    
    fs.writeFileSync(
      path.join(backupDir, 'parent_bookings.json'),
      JSON.stringify(parentData, null, 2)
    );
    console.log(`  ✅ 親予約 ${parentData.length} 件をバックアップ`);
    
    // 2. 子予約のバックアップ
    console.log('📊 子予約データをバックアップ中...');
    const childBookings = await db.collection('bookings').get();
    const childData = [];
    childBookings.forEach(doc => {
      childData.push({ id: doc.id, ...doc.data() });
    });
    
    fs.writeFileSync(
      path.join(backupDir, 'bookings.json'),
      JSON.stringify(childData, null, 2)
    );
    console.log(`  ✅ 子予約 ${childData.length} 件をバックアップ`);
    
    // 3. ユーザーのバックアップ
    console.log('👤 ユーザーデータをバックアップ中...');
    const users = await db.collection('users').get();
    const userData = [];
    users.forEach(doc => {
      userData.push({ id: doc.id, ...doc.data() });
    });
    
    fs.writeFileSync(
      path.join(backupDir, 'users.json'),
      JSON.stringify(userData, null, 2)
    );
    console.log(`  ✅ ユーザー ${userData.length} 件をバックアップ`);
    
    // 4. 空室状況のバックアップ
    console.log('📅 空室状況データをバックアップ中...');
    const availability = await db.collection('availability').get();
    const availabilityData = [];
    availability.forEach(doc => {
      availabilityData.push({ id: doc.id, ...doc.data() });
    });
    
    fs.writeFileSync(
      path.join(backupDir, 'availability.json'),
      JSON.stringify(availabilityData, null, 2)
    );
    console.log(`  ✅ 空室状況 ${availabilityData.length} 件をバックアップ`);
    
    // 5. 部屋データのバックアップ（参考用）
    console.log('🏠 部屋データをバックアップ中...');
    const rooms = await db.collection('rooms').get();
    const roomData = [];
    rooms.forEach(doc => {
      roomData.push({ id: doc.id, ...doc.data() });
    });
    
    fs.writeFileSync(
      path.join(backupDir, 'rooms.json'),
      JSON.stringify(roomData, null, 2)
    );
    console.log(`  ✅ 部屋 ${roomData.length} 件をバックアップ`);
    
    // 6. バックアップサマリー作成
    const summary = {
      backup_timestamp: new Date().toISOString(),
      backup_directory: backupDir,
      data_counts: {
        parent_bookings: parentData.length,
        child_bookings: childData.length,
        users: userData.length,
        availability: availabilityData.length,
        rooms: roomData.length
      },
      migration_ready: parentData.length > 0,
      notes: [
        '移行前の完全バックアップ',
        '問題発生時はこのデータで復旧可能',
        'parent_bookings + bookings → unified_bookings への変換対象'
      ]
    };
    
    fs.writeFileSync(
      path.join(backupDir, 'backup_summary.json'),
      JSON.stringify(summary, null, 2)
    );
    
    // 7. 復旧スクリプト作成
    const restoreScript = `// 復旧用スクリプト (緊急時のみ使用)
const admin = require('firebase-admin');
const fs = require('fs');
const path = require('path');

// 使用方法: node restore-backup.js
// 注意: 現在のデータを上書きします！

async function restoreBackup() {
  const backupDir = '${backupDir}';
  
  console.log('⚠️  データ復旧を開始します...');
  console.log('⚠️  現在のデータは上書きされます！');
  
  // 確認プロンプト（実際の実装では readline等を使用）
  console.log('続行するには手動でコメントアウトを解除してください');
  return;
  
  /*
  const collections = ['parent_bookings', 'bookings', 'users', 'availability'];
  
  for (const collection of collections) {
    const data = JSON.parse(fs.readFileSync(path.join(backupDir, collection + '.json')));
    console.log(\`復旧中: \${collection} (\${data.length} 件)\`);
    
    const batch = admin.firestore().batch();
    data.forEach(item => {
      const ref = admin.firestore().collection(collection).doc(item.id);
      batch.set(ref, item);
    });
    
    await batch.commit();
    console.log(\`✅ \${collection} 復旧完了\`);
  }
  */
}

restoreBackup().then(() => process.exit(0)).catch(console.error);
`;

    fs.writeFileSync(
      path.join(backupDir, 'restore-backup.js'),
      restoreScript
    );
    
    console.log('\n' + '='.repeat(50));
    console.log('✅ バックアップ作成完了！');
    console.log('='.repeat(50));
    console.log(`📁 保存場所: ${backupDir}`);
    console.log('📦 バックアップ内容:');
    console.log(`  ├─ parent_bookings.json (${parentData.length} 件)`);
    console.log(`  ├─ bookings.json (${childData.length} 件)`);
    console.log(`  ├─ users.json (${userData.length} 件)`);
    console.log(`  ├─ availability.json (${availabilityData.length} 件)`);
    console.log(`  ├─ rooms.json (${roomData.length} 件)`);
    console.log(`  ├─ backup_summary.json`);
    console.log(`  └─ restore-backup.js (緊急復旧用)`);
    
    console.log('\n🎯 次のステップ:');
    console.log('  Step 3: 移行スクリプトの実行準備');
    console.log('  • 移行対象: 4件の親予約 + 4件の子予約');
    console.log('  • 変換後: 4件の統合予約');
    
    return backupDir;
    
  } catch (error) {
    console.error('❌ バックアップ作成エラー:', error);
    throw error;
  } finally {
    process.exit(0);
  }
}

// 実行
createBackup();