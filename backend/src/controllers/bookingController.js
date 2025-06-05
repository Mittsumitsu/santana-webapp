const admin = require('firebase-admin');
const db = admin.firestore();

// 🔥 新IDシステム対応版 BookingController

// 全ての予約を取得 (管理者用)
exports.getAllBookings = async (req, res) => {
  try {
    console.log('🔥 新IDシステム - getAllBookings が呼び出されました');
    
    // 🎯 新IDシステムでは統合予約のみ取得
    const bookingsSnapshot = await db.collection('bookings').get();
    const bookings = [];

    bookingsSnapshot.forEach(doc => {
      const bookingData = doc.data();
      
      // 新IDシステムのデータのみを対象にする
      if (bookingData.id && bookingData.id.startsWith('B_')) {
        bookings.push({
          id: doc.id,
          ...bookingData,
        });
      }
    });

    console.log(`✅ 新IDシステム予約: ${bookings.length} 件が見つかりました`);
    res.status(200).json(bookings);
  } catch (error) {
    console.error('❌ 予約の取得中にエラーが発生しました:', error);
    res.status(500).json({ error: 'サーバーエラーが発生しました' });
  }
};

// 🎯 新IDシステム対応: ユーザーIDで予約を取得
exports.getUserBookings = async (req, res) => {
  try {
    const userId = req.params.userId;
    console.log('🔥 新IDシステム - ユーザー予約取得:', userId);

    // 新IDシステムのユーザーIDかチェック
    if (!userId.startsWith('U_')) {
      console.log('⚠️ 古いIDフォーマット検出:', userId);
      return res.status(400).json({ 
        error: '新IDシステムのユーザーIDが必要です',
        expected_format: 'U_XXXXXXXX',
        received: userId
      });
    }

    // 🎯 統合予約コレクションから検索
    const bookingsSnapshot = await db
      .collection('bookings')
      .where('user_id', '==', userId)
      .orderBy('created_at', 'desc')
      .get();

    console.log('🔍 取得した予約数:', bookingsSnapshot.size);

    const bookings = [];
    bookingsSnapshot.forEach(doc => {
      const bookingData = doc.data();
      
      // 新IDシステムの予約のみを対象
      if (bookingData.id && bookingData.id.startsWith('B_')) {
        console.log(`📅 予約発見: ${bookingData.id} - ${bookingData.check_in_date} to ${bookingData.check_out_date}`);
        
        bookings.push({
          id: doc.id,
          ...bookingData,
          // フロントエンド表示用の追加情報
          is_new_system: true,
          display_format: 'unified_booking'
        });
      }
    });

    console.log(`✅ 新IDシステム予約返却: ${bookings.length} 件`);
    
    // 詳細ログ
    bookings.forEach((booking, index) => {
      console.log(`  ${index + 1}. ${booking.id} - ₹${booking.total_amount} - ${booking.status}`);
    });

    res.status(200).json(bookings);
  } catch (error) {
    console.error('❌ ユーザー予約の取得中にエラーが発生しました:', error);
    res.status(500).json({ 
      error: 'サーバーエラーが発生しました', 
      message: error.message,
      userId: req.params.userId
    });
  }
};

// 特定の予約IDで予約を取得 (新IDシステム対応)
exports.getBookingById = async (req, res) => {
  try {
    const bookingId = req.params.id;
    console.log('🔥 新IDシステム - 予約詳細取得:', bookingId);

    // 新IDシステムの予約IDかチェック
    if (!bookingId.startsWith('B_')) {
      console.log('⚠️ 古い予約ID検出:', bookingId);
      return res.status(400).json({ 
        error: '新IDシステムの予約IDが必要です',
        expected_format: 'B_XXXXXXXXXXXX',
        received: bookingId
      });
    }

    // 🎯 統合予約から取得
    const bookingDoc = await db.collection('bookings').doc(bookingId).get();

    if (!bookingDoc.exists) {
      console.log('❌ 予約が見つかりません:', bookingId);
      return res.status(404).json({ error: '予約が見つかりません' });
    }

    const bookingData = bookingDoc.data();
    
    // 統合予約なので子予約の概念はないが、roomsフィールドに部屋情報がある
    console.log(`✅ 統合予約取得成功: ${bookingId}`);
    console.log(`   ユーザー: ${bookingData.user_id}`);
    console.log(`   部屋数: ${bookingData.rooms?.length || 0}`);
    
    res.status(200).json({
      id: bookingDoc.id,
      ...bookingData,
      is_unified_booking: true,
      room_count: bookingData.rooms?.length || 0
    });
  } catch (error) {
    console.error('❌ 予約の取得中にエラーが発生しました:', error);
    res.status(500).json({ 
      error: 'サーバーエラーが発生しました', 
      message: error.message 
    });
  }
};

// 🎯 新IDシステム対応: 新しい予約を作成
exports.createBooking = async (req, res) => {
  try {
    const { user_id, check_in_date, check_out_date, primary_contact, rooms } = req.body;

    console.log('🔥 新IDシステム - 予約作成リクエスト:', { 
      user_id, 
      check_in_date, 
      check_out_date,
      rooms_count: rooms?.length 
    });

    // 新IDシステムのユーザーIDかチェック
    if (!user_id.startsWith('U_')) {
      return res.status(400).json({ 
        error: '新IDシステムのユーザーIDが必要です',
        expected_format: 'U_XXXXXXXX',
        received: user_id
      });
    }

    if (!user_id || !check_in_date || !check_out_date || !primary_contact || !rooms || !Array.isArray(rooms)) {
      return res.status(400).json({ error: '必要な情報が不足しています' });
    }

    // 🎯 新IDシステムで統合予約を作成
    const newBookingId = generateNewBookingId();
    
    const unifiedBookingData = {
      id: newBookingId,
      user_id,
      check_in_date,
      check_out_date,
      status: 'confirmed',
      total_guests: rooms.reduce((total, room) => total + room.guests.length, 0),
      primary_contact,
      total_amount: rooms.reduce((total, room) => total + room.price, 0),
      
      // 統合予約の部屋情報
      rooms: rooms.map(room => ({
        room_id: room.room_id,
        check_in_time: room.check_in_time || '14:00',
        number_of_guests: room.guests.length,
        primary_guest: room.guests[0],
        additional_guests: room.guests.slice(1),
        room_amount: room.price
      })),
      
      // メタデータ
      created_at: admin.firestore.FieldValue.serverTimestamp(),
      updated_at: admin.firestore.FieldValue.serverTimestamp(),
      created_by: user_id,
      system_version: '2.0_NEW_ID_SYSTEM',
      booking_type: 'unified_booking'
    };

    // Firestoreに保存
    await db.collection('bookings').doc(newBookingId).set(unifiedBookingData);

    console.log('✅ 新IDシステム予約作成成功:', newBookingId);
    
    res.status(201).json({
      message: '予約が作成されました',
      booking_id: newBookingId,
      total_amount: unifiedBookingData.total_amount,
      total_guests: unifiedBookingData.total_guests,
      system_version: '2.0_NEW_ID_SYSTEM'
    });
    
  } catch (error) {
    console.error('❌ 予約の作成中にエラーが発生しました:', error);
    res.status(500).json({ error: error.message || 'サーバーエラーが発生しました' });
  }
};

// 予約を更新 (新IDシステム対応)
exports.updateBooking = async (req, res) => {
  try {
    const bookingId = req.params.id;
    const updateData = req.body;

    console.log('🔥 新IDシステム - 予約更新リクエスト:', { bookingId, updateData });

    if (!bookingId.startsWith('B_')) {
      return res.status(400).json({ 
        error: '新IDシステムの予約IDが必要です',
        expected_format: 'B_XXXXXXXXXXXX',
        received: bookingId
      });
    }

    const bookingRef = db.collection('bookings').doc(bookingId);
    const bookingDoc = await bookingRef.get();

    if (!bookingDoc.exists) {
      return res.status(404).json({ error: '予約が見つかりません' });
    }

    // 更新可能なフィールドのみを抽出
    const allowedFields = ['status', 'primary_contact', 'total_guests', 'total_amount'];

    const filteredData = Object.keys(updateData)
      .filter(key => allowedFields.includes(key))
      .reduce((obj, key) => {
        obj[key] = updateData[key];
        return obj;
      }, {});

    // 更新日時を追加
    filteredData.updated_at = admin.firestore.FieldValue.serverTimestamp();

    await bookingRef.update(filteredData);

    console.log('✅ 新IDシステム予約更新成功:', bookingId);

    res.status(200).json({
      message: '予約が更新されました',
      booking_id: bookingId,
      updated_fields: Object.keys(filteredData),
    });
  } catch (error) {
    console.error('❌ 予約の更新中にエラーが発生しました:', error);
    res.status(500).json({ error: 'サーバーエラーが発生しました', message: error.message });
  }
};

// 予約をキャンセル (新IDシステム対応)
exports.cancelBooking = async (req, res) => {
  try {
    const bookingId = req.params.id;
    console.log('🔥 新IDシステム - 予約キャンセルリクエスト:', bookingId);

    if (!bookingId.startsWith('B_')) {
      return res.status(400).json({ 
        error: '新IDシステムの予約IDが必要です',
        expected_format: 'B_XXXXXXXXXXXX',
        received: bookingId
      });
    }

    const bookingRef = db.collection('bookings').doc(bookingId);
    const bookingDoc = await bookingRef.get();

    if (!bookingDoc.exists) {
      return res.status(404).json({ error: '予約が見つかりません' });
    }

    // ステータスをキャンセルに更新
    await bookingRef.update({
      status: 'cancelled',
      updated_at: admin.firestore.FieldValue.serverTimestamp(),
      cancelled_at: admin.firestore.FieldValue.serverTimestamp()
    });

    console.log('✅ 新IDシステム予約キャンセル成功:', bookingId);

    res.status(200).json({ 
      message: '予約がキャンセルされました',
      booking_id: bookingId
    });
  } catch (error) {
    console.error('❌ 予約のキャンセル中にエラーが発生しました:', error);
    res.status(500).json({ error: 'サーバーエラーが発生しました', message: error.message });
  }
};

// 予約の確認 (バリデーション) - 新IDシステム対応
exports.validateBooking = async (req, res) => {
  try {
    const { rooms, user_id } = req.body;

    console.log('🔥 新IDシステム - 予約バリデーションリクエスト:', { 
      user_id, 
      rooms_count: rooms?.length 
    });

    if (user_id && !user_id.startsWith('U_')) {
      return res.status(400).json({ 
        error: '新IDシステムのユーザーIDが必要です',
        expected_format: 'U_XXXXXXXX',
        received: user_id
      });
    }

    if (!rooms || !Array.isArray(rooms)) {
      return res.status(400).json({ error: '予約データが不正です' });
    }

    const validationResults = [];

    for (const room of rooms) {
      // 新IDシステムの部屋IDかチェック
      if (room.room_id && !room.room_id.startsWith('R_')) {
        validationResults.push({
          room_id: room.room_id,
          valid: false,
          error: '新IDシステムの部屋IDが必要です (R_XXXXXX)',
        });
        continue;
      }

      // 部屋情報を取得
      const roomDoc = await db.collection('rooms').doc(room.room_id).get();

      if (!roomDoc.exists) {
        validationResults.push({
          room_id: room.room_id,
          valid: false,
          error: '部屋が存在しません',
        });
        continue;
      }

      const roomData = roomDoc.data();

      // 各種チェック (性別制限、定員など)
      if (roomData.gender_restriction !== 'none') {
        const genderMismatch = room.guests.some(
          guest => guest.gender !== roomData.gender_restriction
        );

        if (genderMismatch) {
          validationResults.push({
            room_id: room.room_id,
            valid: false,
            error: `部屋は ${roomData.gender_restriction === 'male' ? '男性' : '女性'} 専用です`,
          });
          continue;
        }
      }

      if (room.guests.length > roomData.capacity) {
        validationResults.push({
          room_id: room.room_id,
          valid: false,
          error: `部屋の定員（${roomData.capacity}名）を超えています`,
        });
        continue;
      }

      validationResults.push({
        room_id: room.room_id,
        valid: true,
      });
    }

    const isValid = validationResults.every(result => result.valid);

    console.log('✅ 新IDシステムバリデーション完了:', { 
      isValid, 
      results_count: validationResults.length 
    });

    res.status(200).json({
      valid: isValid,
      validation_results: validationResults,
      system_version: '2.0_NEW_ID_SYSTEM'
    });
  } catch (error) {
    console.error('❌ 予約バリデーション中にエラーが発生しました:', error);
    res.status(500).json({ error: 'サーバーエラーが発生しました', message: error.message });
  }
};

// 🎯 新IDシステム用のID生成関数
function generateNewBookingId() {
  const chars = '23456789ABCDEFGHJKLMNPQRSTUVWXYZ';
  let result = 'B_';
  for (let i = 0; i < 12; i++) {
    result += chars.charAt(Math.floor(Math.random() * chars.length));
  }
  return result;
}