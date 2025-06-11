// backend/scripts/create-admin-account.js
// 管理者アカウント作成スクリプト

const admin = require('firebase-admin');

class AdminAccountCreator {
  constructor() {
    this.db = null;
    this.auth = null;
  }

  async initialize() {
    try {
      // Firebase Admin SDK 初期化
      if (admin.apps.length === 0) {
        const serviceAccount = require('../serviceAccount.json');
        admin.initializeApp({
          credential: admin.credential.cert(serviceAccount)
        });
      }

      this.db = admin.firestore();
      this.auth = admin.auth();
      
      console.log('✅ Firebase Admin SDK 初期化完了');
      return true;
    } catch (error) {
      console.error('❌ 初期化失敗:', error.message);
      return false;
    }
  }

  // 新IDシステム対応ID生成
  generatePracticalId(length = 8) {
    const chars = '23456789ABCDEFGHJKLMNPQRSTUVWXYZ';
    let result = '';
    for (let i = 0; i < length; i++) {
      result += chars.charAt(Math.floor(Math.random() * chars.length));
    }
    return result;
  }

  generateUserId() {
    return `U_${this.generatePracticalId(8)}`;
  }

  // Firebase Authentication でユーザー作成
  async createFirebaseUser(email, password, displayName) {
    try {
      console.log('🔥 Firebase Auth ユーザー作成:', email);
      
      const userRecord = await this.auth.createUser({
        email: email,
        password: password,
        displayName: displayName,
        emailVerified: true // 管理者は認証済みとして作成
      });

      console.log('✅ Firebase Auth ユーザー作成完了:', userRecord.uid);
      return userRecord;
    } catch (error) {
      console.error('❌ Firebase Auth ユーザー作成失敗:', error.message);
      throw error;
    }
  }

  // Firestore にユーザードキュメント作成
  async createUserDocument(firebaseUid, email, displayName, userType = 'admin') {
    try {
      const customUserId = this.generateUserId();
      console.log('📝 Firestore ユーザードキュメント作成:', customUserId);

      const userData = {
        id: customUserId,
        firebase_uid: firebaseUid,
        email: email,
        displayName: displayName,
        userType: userType, // 'admin', 'staff', 'local_staff', 'temp_staff'
        language: 'ja',
        emailVerified: true,
        createdAt: new Date().toISOString(),
        lastLogin: new Date().toISOString(),
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString(),
        emailPreferences: {
          marketing: false,
          bookingConfirmation: true
        },
        isAdmin: true,
        permissions: this.getPermissionsByUserType(userType)
      };

      const userRef = this.db.collection('users').doc(customUserId);
      await userRef.set(userData);

      console.log('✅ Firestore ユーザードキュメント作成完了:', customUserId);
      return { customUserId, userData };
    } catch (error) {
      console.error('❌ Firestore ユーザードキュメント作成失敗:', error.message);
      throw error;
    }
  }

  // Firebase Custom Claims 設定（トークンに権限情報を含める）
  async setCustomClaims(firebaseUid, userType, customUserId) {
    try {
      console.log('🔑 Firebase Custom Claims 設定:', firebaseUid);

      const customClaims = {
        user_type: userType,
        custom_user_id: customUserId,
        role: userType,
        admin: userType === 'admin',
        staff: ['admin', 'staff'].includes(userType)
      };

      await this.auth.setCustomUserClaims(firebaseUid, customClaims);
      console.log('✅ Custom Claims 設定完了:', customClaims);
      return true;
    } catch (error) {
      console.error('❌ Custom Claims 設定失敗:', error.message);
      return false;
    }
  }

  // ユーザータイプ別権限設定
  getPermissionsByUserType(userType) {
    const permissionSets = {
      admin: [
        'bookings_manage',
        'rooms_manage', 
        'guests_view',
        'payments_manage',
        'check_in',
        'check_out',
        'reports_view',
        'users_manage',
        'system_admin'
      ],
      staff: [
        'bookings_manage',
        'rooms_manage',
        'guests_view', 
        'payments_manage',
        'check_in',
        'check_out'
      ],
      local_staff: [
        'check_in',
        'check_out',
        'bookings_view'
      ],
      temp_staff: [
        'check_in',
        'check_out',
        'bookings_view'
      ]
    };

    return permissionSets[userType] || ['own_bookings_manage'];
  }

  // 完全な管理者アカウント作成
  async createAdminAccount(email, password, displayName, userType = 'admin') {
    try {
      console.log('\n🚀 管理者アカウント作成開始');
      console.log('==================================');
      console.log(`📧 Email: ${email}`);
      console.log(`👤 Name: ${displayName}`);
      console.log(`🔑 Role: ${userType}`);
      console.log('');

      // 1. Firebase Authentication でユーザー作成
      const firebaseUser = await this.createFirebaseUser(email, password, displayName);

      // 2. Firestore にユーザードキュメント作成
      const { customUserId, userData } = await this.createUserDocument(
        firebaseUser.uid, 
        email, 
        displayName, 
        userType
      );

      // 3. Firebase Custom Claims 設定
      await this.setCustomClaims(firebaseUser.uid, userType, customUserId);

      console.log('\n🎉 管理者アカウント作成完了！');
      console.log('==================================');
      console.log(`🆔 User ID: ${customUserId}`);
      console.log(`🔥 Firebase UID: ${firebaseUser.uid}`);
      console.log(`📧 Email: ${email}`);
      console.log(`🔑 Role: ${userType}`);
      console.log(`✅ Email Verified: true`);
      console.log('');
      console.log('🎯 ログイン情報:');
      console.log(`   Email: ${email}`);
      console.log(`   Password: ${password}`);
      console.log('');
      console.log('🔗 管理者ダッシュボード: http://localhost:3001/admin');

      return {
        success: true,
        customUserId,
        firebaseUid: firebaseUser.uid,
        email,
        userType,
        userData
      };

    } catch (error) {
      console.error('\n❌ 管理者アカウント作成失敗:', error.message);
      return {
        success: false,
        error: error.message
      };
    }
  }

  // 複数の管理者アカウントを作成
  async createMultipleAdmins() {
    const admins = [
      {
        email: 'admin@santanaguesthouse.com',
        password: 'AdminPass123!',
        displayName: '管理者',
        userType: 'admin'
      },
      {
        email: 'staff@santanaguesthouse.com', 
        password: 'StaffPass123!',
        displayName: 'スタッフ',
        userType: 'staff'
      },
      {
        email: 'localstaff@santanaguesthouse.com',
        password: 'LocalPass123!',
        displayName: '現地スタッフ',
        userType: 'local_staff'
      }
    ];

    console.log('🎬 複数管理者アカウント作成開始');
    console.log('=====================================\n');

    const results = [];

    for (const admin of admins) {
      const result = await this.createAdminAccount(
        admin.email,
        admin.password, 
        admin.displayName,
        admin.userType
      );
      results.push(result);
      
      // 次のアカウント作成前に少し待機
      await new Promise(resolve => setTimeout(resolve, 1000));
    }

    console.log('\n🎊 全ての管理者アカウント作成完了！');
    console.log('=======================================');
    
    results.forEach((result, index) => {
      if (result.success) {
        console.log(`✅ ${admins[index].displayName}: ${result.customUserId}`);
      } else {
        console.log(`❌ ${admins[index].displayName}: ${result.error}`);
      }
    });

    return results;
  }
}

// メイン実行関数
async function createAdmins() {
  const creator = new AdminAccountCreator();
  
  // 初期化
  const initialized = await creator.initialize();
  if (!initialized) {
    console.log('💥 初期化に失敗しました');
    process.exit(1);
  }

  // 単一管理者作成の場合
  // await creator.createAdminAccount(
  //   'admin@example.com',
  //   'SecurePassword123!', 
  //   'システム管理者',
  //   'admin'
  // );

  // 複数管理者作成
  await creator.createMultipleAdmins();
}

// スクリプト実行時の処理
if (require.main === module) {
  createAdmins()
    .then(() => {
      console.log('\n🚀 管理者作成スクリプト完了！');
      process.exit(0);
    })
    .catch(error => {
      console.error('\n💥 スクリプト実行エラー:', error.message);
      process.exit(1);
    });
}

module.exports = { AdminAccountCreator };