// backend/src/controllers/userProfileController.js
// ユーザープロフィール管理API

const admin = require('firebase-admin');
const db = admin.firestore();

// プロフィール一覧取得
exports.getUserProfiles = async (req, res) => {
  try {
    const userId = req.params.userId;
    
    console.log('🔥 ユーザープロフィール取得:', userId);

    if (!userId.startsWith('U_')) {
      return res.status(400).json({ 
        error: '新IDシステムのユーザーIDが必要です',
        expected_format: 'U_XXXXXXXX',
        received: userId
      });
    }

    const profilesRef = db.collection('user_profiles')
      .where('user_id', '==', userId)
      .orderBy('created_at', 'desc');
      
    const snapshot = await profilesRef.get();
    
    if (snapshot.empty) {
      return res.status(200).json([]);
    }

    const profiles = [];
    snapshot.forEach(doc => {
      profiles.push({
        id: doc.id,
        ...doc.data()
      });
    });

    console.log('✅ プロフィール取得成功:', profiles.length);
    res.status(200).json(profiles);

  } catch (error) {
    console.error('❌ プロフィール取得エラー:', error);
    res.status(500).json({ 
      error: 'サーバーエラーが発生しました', 
      message: error.message 
    });
  }
};

// プロフィール作成
exports.createUserProfile = async (req, res) => {
  try {
    const userId = req.params.userId;
    const { contactInfo, name, isDefault } = req.body;

    console.log('🔥 ユーザープロフィール作成:', { userId, name, isDefault });

    if (!userId.startsWith('U_')) {
      return res.status(400).json({ 
        error: '新IDシステムのユーザーIDが必要です',
        expected_format: 'U_XXXXXXXX',
        received: userId
      });
    }

    // 必須フィールドの検証
    if (!contactInfo || !name) {
      return res.status(400).json({ 
        error: '連絡先情報とプロフィール名は必須です' 
      });
    }

    // デフォルトプロフィールに設定する場合、他のデフォルトを解除
    if (isDefault) {
      const existingDefaultRef = db.collection('user_profiles')
        .where('user_id', '==', userId)
        .where('isDefault', '==', true);
        
      const existingDefault = await existingDefaultRef.get();
      
      // バッチ処理で既存のデフォルトを解除
      const batch = db.batch();
      existingDefault.forEach(doc => {
        batch.update(doc.ref, { isDefault: false });
      });
      await batch.commit();
    }

    // 新しいプロフィールID生成
    const profileId = `P_${Date.now()}_${Math.random().toString(36).substr(2, 6).toUpperCase()}`;

    const profileData = {
      user_id: userId,
      name: name,
      contactInfo: {
        lastName: contactInfo.lastName || '',
        firstName: contactInfo.firstName || '',
        lastNameRomaji: contactInfo.lastNameRomaji || '',
        firstNameRomaji: contactInfo.firstNameRomaji || '',
        email: contactInfo.email || '',
        phone: contactInfo.phone || '',
        address: contactInfo.address || '',
        gender: contactInfo.gender || 'male'
      },
      isDefault: isDefault || false,
      created_at: admin.firestore.FieldValue.serverTimestamp(),
      updated_at: admin.firestore.FieldValue.serverTimestamp()
    };

    await db.collection('user_profiles').doc(profileId).set(profileData);

    console.log('✅ プロフィール作成成功:', profileId);

    res.status(201).json({
      message: 'プロフィールが作成されました',
      profile_id: profileId,
      ...profileData,
      id: profileId
    });

  } catch (error) {
    console.error('❌ プロフィール作成エラー:', error);
    res.status(500).json({ 
      error: 'サーバーエラーが発生しました', 
      message: error.message 
    });
  }
};

// プロフィール更新
exports.updateUserProfile = async (req, res) => {
  try {
    const userId = req.params.userId;
    const profileId = req.params.profileId;
    const updateData = req.body;

    console.log('🔥 ユーザープロフィール更新:', { userId, profileId });

    if (!userId.startsWith('U_')) {
      return res.status(400).json({ 
        error: '新IDシステムのユーザーIDが必要です' 
      });
    }

    const profileRef = db.collection('user_profiles').doc(profileId);
    const profileDoc = await profileRef.get();

    if (!profileDoc.exists) {
      return res.status(404).json({ error: 'プロフィールが見つかりません' });
    }

    const profileData = profileDoc.data();
    
    // 所有者確認
    if (profileData.user_id !== userId) {
      return res.status(403).json({ error: 'このプロフィールを更新する権限がありません' });
    }

    // デフォルト設定の処理
    if (updateData.isDefault === true && !profileData.isDefault) {
      // 他のデフォルトプロフィールを解除
      const existingDefaultRef = db.collection('user_profiles')
        .where('user_id', '==', userId)
        .where('isDefault', '==', true);
        
      const existingDefault = await existingDefaultRef.get();
      const batch = db.batch();
      existingDefault.forEach(doc => {
        if (doc.id !== profileId) {
          batch.update(doc.ref, { isDefault: false });
        }
      });
      await batch.commit();
    }

    // 更新データの準備
    const filteredData = {
      ...updateData,
      updated_at: admin.firestore.FieldValue.serverTimestamp()
    };

    await profileRef.update(filteredData);

    console.log('✅ プロフィール更新成功:', profileId);

    res.status(200).json({
      message: 'プロフィールが更新されました',
      profile_id: profileId
    });

  } catch (error) {
    console.error('❌ プロフィール更新エラー:', error);
    res.status(500).json({ 
      error: 'サーバーエラーが発生しました', 
      message: error.message 
    });
  }
};

// プロフィール削除
exports.deleteUserProfile = async (req, res) => {
  try {
    const userId = req.params.userId;
    const profileId = req.params.profileId;

    console.log('🔥 ユーザープロフィール削除:', { userId, profileId });

    if (!userId.startsWith('U_')) {
      return res.status(400).json({ 
        error: '新IDシステムのユーザーIDが必要です' 
      });
    }

    const profileRef = db.collection('user_profiles').doc(profileId);
    const profileDoc = await profileRef.get();

    if (!profileDoc.exists) {
      return res.status(404).json({ error: 'プロフィールが見つかりません' });
    }

    const profileData = profileDoc.data();
    
    // 所有者確認
    if (profileData.user_id !== userId) {
      return res.status(403).json({ error: 'このプロフィールを削除する権限がありません' });
    }

    await profileRef.delete();

    console.log('✅ プロフィール削除成功:', profileId);

    res.status(200).json({
      message: 'プロフィールが削除されました',
      profile_id: profileId
    });

  } catch (error) {
    console.error('❌ プロフィール削除エラー:', error);
    res.status(500).json({ 
      error: 'サーバーエラーが発生しました', 
      message: error.message 
    });
  }
};

// デフォルトプロフィール設定
exports.setDefaultProfile = async (req, res) => {
  try {
    const userId = req.params.userId;
    const profileId = req.params.profileId;

    console.log('🔥 デフォルトプロフィール設定:', { userId, profileId });

    if (!userId.startsWith('U_')) {
      return res.status(400).json({ 
        error: '新IDシステムのユーザーIDが必要です' 
      });
    }

    // 全てのプロフィールのデフォルトを解除
    const allProfilesRef = db.collection('user_profiles')
      .where('user_id', '==', userId);
      
    const allProfiles = await allProfilesRef.get();
    const batch = db.batch();
    
    allProfiles.forEach(doc => {
      if (doc.id === profileId) {
        batch.update(doc.ref, { isDefault: true });
      } else {
        batch.update(doc.ref, { isDefault: false });
      }
    });

    await batch.commit();

    console.log('✅ デフォルトプロフィール設定成功:', profileId);

    res.status(200).json({
      message: 'デフォルトプロフィールが設定されました',
      profile_id: profileId
    });

  } catch (error) {
    console.error('❌ デフォルトプロフィール設定エラー:', error);
    res.status(500).json({ 
      error: 'サーバーエラーが発生しました', 
      message: error.message 
    });
  }
};