// backend/src/controllers/userController.js - 完全版
// 基本的なユーザー管理API（新IDシステム対応）

const admin = require('firebase-admin');
const db = admin.firestore();

// ユーザー情報取得
exports.getUser = async (req, res) => {
  try {
    const userId = req.params.userId;
    
    console.log('🔥 ユーザー情報取得:', userId);

    // 新IDシステムの検証
    if (!userId.startsWith('U_')) {
      return res.status(400).json({ 
        error: '新IDシステムのユーザーIDが必要です',
        expected_format: 'U_XXXXXXXX',
        received: userId,
        hint: 'ユーザーIDは U_ で始まる必要があります'
      });
    }

    const userRef = db.collection('users').doc(userId);
    const userDoc = await userRef.get();

    if (!userDoc.exists) {
      console.log('❌ ユーザーが見つかりません:', userId);
      return res.status(404).json({ 
        error: 'ユーザーが見つかりません',
        user_id: userId 
      });
    }

    const userData = userDoc.data();
    
    // 機密情報を除外
    const { password, private_key, ...safeUserData } = userData;
    
    console.log('✅ ユーザー情報取得成功:', userId);

    res.status(200).json({
      id: userDoc.id,
      ...safeUserData,
      _metadata: {
        retrieved_at: new Date().toISOString(),
        id_system: 'new'
      }
    });

  } catch (error) {
    console.error('❌ ユーザー情報取得エラー:', error);
    res.status(500).json({ 
      error: 'サーバーエラーが発生しました', 
      message: error.message,
      user_id: req.params.userId
    });
  }
};

// ユーザー情報更新
exports.updateUser = async (req, res) => {
  try {
    const userId = req.params.userId;
    const updateData = req.body;

    console.log('🔥 ユーザー情報更新:', { userId, fields: Object.keys(updateData) });

    // 新IDシステムの検証
    if (!userId.startsWith('U_')) {
      return res.status(400).json({ 
        error: '新IDシステムのユーザーIDが必要です',
        expected_format: 'U_XXXXXXXX',
        received: userId
      });
    }

    const userRef = db.collection('users').doc(userId);
    const userDoc = await userRef.get();

    if (!userDoc.exists) {
      console.log('❌ ユーザーが見つかりません:', userId);
      return res.status(404).json({ 
        error: 'ユーザーが見つかりません',
        user_id: userId 
      });
    }

    // 更新可能なフィールドのホワイトリスト
    const allowedFields = [
      'display_name',
      'phone', 
      'address',
      'birth_date',
      'preferred_language',
      'emergency_contact',
      'notes',
      'profile_image',
      'notification_preferences',
      'privacy_settings',
      'timezone'
    ];

    // セキュリティ上更新禁止のフィールド
    const forbiddenFields = [
      'uid',
      'email',
      'created_at',
      'firebase_uid',
      'is_admin',
      'verification_status'
    ];

    // 禁止フィールドのチェック
    const invalidFields = Object.keys(updateData).filter(key => 
      forbiddenFields.includes(key)
    );

    if (invalidFields.length > 0) {
      return res.status(400).json({
        error: '更新できないフィールドが含まれています',
        invalid_fields: invalidFields,
        allowed_fields: allowedFields
      });
    }

    // 許可されたフィールドのみを抽出
    const filteredData = Object.keys(updateData)
      .filter(key => allowedFields.includes(key))
      .reduce((obj, key) => {
        obj[key] = updateData[key];
        return obj;
      }, {});

    // 更新データがない場合
    if (Object.keys(filteredData).length === 0) {
      return res.status(400).json({
        error: '更新可能なフィールドがありません',
        allowed_fields: allowedFields,
        received_fields: Object.keys(updateData)
      });
    }

    // バリデーション
    if (filteredData.phone && !/^[\d\-\+\(\)\s]+$/.test(filteredData.phone)) {
      return res.status(400).json({
        error: '電話番号の形式が正しくありません',
        received: filteredData.phone
      });
    }

    if (filteredData.preferred_language && !['ja', 'en', 'zh', 'ko'].includes(filteredData.preferred_language)) {
      return res.status(400).json({
        error: 'サポートされていない言語です',
        supported_languages: ['ja', 'en', 'zh', 'ko'],
        received: filteredData.preferred_language
      });
    }

    // 更新日時を追加
    filteredData.updated_at = admin.firestore.FieldValue.serverTimestamp();

    await userRef.update(filteredData);

    console.log('✅ ユーザー情報更新成功:', userId, 'フィールド:', Object.keys(filteredData));

    res.status(200).json({
      message: 'ユーザー情報が更新されました',
      user_id: userId,
      updated_fields: Object.keys(filteredData).filter(key => key !== 'updated_at'),
      update_count: Object.keys(filteredData).length - 1, // updated_atを除く
      timestamp: new Date().toISOString()
    });

  } catch (error) {
    console.error('❌ ユーザー情報更新エラー:', error);
    res.status(500).json({ 
      error: 'サーバーエラーが発生しました', 
      message: error.message,
      user_id: req.params.userId
    });
  }
};

// ユーザー削除（論理削除）
exports.deleteUser = async (req, res) => {
  try {
    const userId = req.params.userId;
    const { reason } = req.body; // 削除理由（任意）

    console.log('🔥 ユーザー削除:', userId, '理由:', reason);

    // 新IDシステムの検証
    if (!userId.startsWith('U_')) {
      return res.status(400).json({ 
        error: '新IDシステムのユーザーIDが必要です',
        expected_format: 'U_XXXXXXXX',
        received: userId
      });
    }

    const userRef = db.collection('users').doc(userId);
    const userDoc = await userRef.get();

    if (!userDoc.exists) {
      console.log('❌ ユーザーが見つかりません:', userId);
      return res.status(404).json({ 
        error: 'ユーザーが見つかりません',
        user_id: userId 
      });
    }

    const userData = userDoc.data();

    // 既に削除済みかチェック
    if (userData.is_deleted) {
      return res.status(400).json({
        error: 'このユーザーは既に削除されています',
        user_id: userId,
        deleted_at: userData.deleted_at
      });
    }

    // 論理削除（実際には削除せず、削除フラグを立てる）
    const deleteData = {
      is_deleted: true,
      deleted_at: admin.firestore.FieldValue.serverTimestamp(),
      updated_at: admin.firestore.FieldValue.serverTimestamp(),
      deletion_reason: reason || 'No reason provided',
      original_email: userData.email, // バックアップ
      original_display_name: userData.display_name // バックアップ
    };

    // メール等の個人情報を匿名化
    const anonymizeData = {
      ...deleteData,
      email: `deleted_${userId}@deleted.local`,
      display_name: '[削除済みユーザー]',
      phone: null,
      address: null,
      notes: '[削除済み]'
    };

    await userRef.update(anonymizeData);

    // 関連データの処理（プロフィール等も論理削除）
    try {
      const profilesRef = db.collection('user_profiles').where('user_id', '==', userId);
      const profilesSnapshot = await profilesRef.get();
      
      const batch = db.batch();
      profilesSnapshot.forEach(doc => {
        batch.update(doc.ref, {
          is_deleted: true,
          deleted_at: admin.firestore.FieldValue.serverTimestamp()
        });
      });
      
      if (!profilesSnapshot.empty) {
        await batch.commit();
        console.log(`✅ プロフィール ${profilesSnapshot.size} 件も削除しました`);
      }
    } catch (profileError) {
      console.error('⚠️ プロフィール削除でエラー:', profileError);
      // プロフィール削除は失敗してもユーザー削除は成功とする
    }

    console.log('✅ ユーザー削除成功:', userId);

    res.status(200).json({
      message: 'ユーザーが削除されました',
      user_id: userId,
      deletion_type: 'logical', // 論理削除
      timestamp: new Date().toISOString(),
      note: 'データは匿名化されましたが、完全には削除されていません'
    });

  } catch (error) {
    console.error('❌ ユーザー削除エラー:', error);
    res.status(500).json({ 
      error: 'サーバーエラーが発生しました', 
      message: error.message,
      user_id: req.params.userId
    });
  }
};

// ユーザー一覧取得（管理者用）
exports.getAllUsers = async (req, res) => {
  try {
    console.log('🔥 ユーザー一覧取得');

    const { 
      limit = 50, 
      offset = 0, 
      include_deleted = false,
      search = ''
    } = req.query;

    let query = db.collection('users');

    // 削除済みユーザーを除外（デフォルト）
    if (!include_deleted || include_deleted === 'false') {
      query = query.where('is_deleted', '==', false);
    }

    // 検索フィルタ
    if (search) {
      // Firestoreの制限により、部分一致検索は制限的
      // display_nameの前方一致検索のみ
      query = query
        .where('display_name', '>=', search)
        .where('display_name', '<', search + '\uf8ff');
    }

    // ページネーション
    query = query
      .orderBy('created_at', 'desc')
      .limit(parseInt(limit))
      .offset(parseInt(offset));

    const snapshot = await query.get();

    if (snapshot.empty) {
      return res.status(200).json({
        users: [],
        total: 0,
        pagination: {
          limit: parseInt(limit),
          offset: parseInt(offset),
          has_more: false
        }
      });
    }

    const users = [];
    snapshot.forEach(doc => {
      const userData = doc.data();
      // 機密情報を除外
      const { password, private_key, ...safeUserData } = userData;
      
      users.push({
        id: doc.id,
        ...safeUserData
      });
    });

    console.log('✅ ユーザー一覧取得成功:', users.length, '件');

    res.status(200).json({
      users,
      total: users.length,
      pagination: {
        limit: parseInt(limit),
        offset: parseInt(offset),
        has_more: users.length === parseInt(limit) // 簡易実装
      },
      filters: {
        include_deleted: include_deleted === 'true',
        search: search || null
      }
    });

  } catch (error) {
    console.error('❌ ユーザー一覧取得エラー:', error);
    res.status(500).json({ 
      error: 'サーバーエラーが発生しました', 
      message: error.message 
    });
  }
};

// ユーザー復元（削除取り消し）
exports.restoreUser = async (req, res) => {
  try {
    const userId = req.params.userId;

    console.log('🔥 ユーザー復元:', userId);

    if (!userId.startsWith('U_')) {
      return res.status(400).json({ 
        error: '新IDシステムのユーザーIDが必要です',
        expected_format: 'U_XXXXXXXX',
        received: userId
      });
    }

    const userRef = db.collection('users').doc(userId);
    const userDoc = await userRef.get();

    if (!userDoc.exists) {
      return res.status(404).json({ 
        error: 'ユーザーが見つかりません',
        user_id: userId 
      });
    }

    const userData = userDoc.data();

    if (!userData.is_deleted) {
      return res.status(400).json({
        error: 'このユーザーは削除されていません',
        user_id: userId
      });
    }

    // 復元処理
    const restoreData = {
      is_deleted: false,
      restored_at: admin.firestore.FieldValue.serverTimestamp(),
      updated_at: admin.firestore.FieldValue.serverTimestamp(),
      email: userData.original_email || userData.email,
      display_name: userData.original_display_name || userData.display_name
    };

    // 削除時の情報をクリア
    const clearData = {
      ...restoreData,
      deleted_at: admin.firestore.FieldValue.delete(),
      deletion_reason: admin.firestore.FieldValue.delete(),
      original_email: admin.firestore.FieldValue.delete(),
      original_display_name: admin.firestore.FieldValue.delete()
    };

    await userRef.update(clearData);

    console.log('✅ ユーザー復元成功:', userId);

    res.status(200).json({
      message: 'ユーザーが復元されました',
      user_id: userId,
      timestamp: new Date().toISOString()
    });

  } catch (error) {
    console.error('❌ ユーザー復元エラー:', error);
    res.status(500).json({ 
      error: 'サーバーエラーが発生しました', 
      message: error.message,
      user_id: req.params.userId
    });
  }
};