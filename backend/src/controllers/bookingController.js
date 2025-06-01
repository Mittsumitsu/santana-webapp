const admin = require('firebase-admin');
const db = admin.firestore();

// 全ての予約を取得 (管理者用)
exports.getAllBookings = async (req, res) => {
  try {
    console.log('getAllBookings が呼び出されました');
    const bookingsSnapshot = await db.collection('parent_bookings').get();
    const bookings = [];

    bookingsSnapshot.forEach(doc => {
      bookings.push({
        id: doc.id,
        ...doc.data(),
      });
    });

    console.log(`${bookings.length} 件の予約が見つかりました`);
    res.status(200).json(bookings);
  } catch (error) {
    console.error('予約の取得中にエラーが発生しました:', error);
    res.status(500).json({ error: 'サーバーエラーが発生しました' });
  }
};

// ユーザーIDで予約を取得
exports.getUserBookings = async (req, res) => {
  try {
    const userId = req.params.userId;
    console.log('ユーザーID:', userId); // デバッグログ

    const bookingsSnapshot = await db
      .collection('parent_bookings')
      .where('user_id', '==', userId)
      .orderBy('created_at', 'desc')
      .get();

    console.log('取得した予約数:', bookingsSnapshot.size); // デバッグログ

    const bookings = [];
    bookingsSnapshot.forEach(doc => {
      bookings.push({
        id: doc.id,
        ...doc.data(),
      });
    });

    res.status(200).json(bookings);
  } catch (error) {
    console.error('ユーザー予約の取得中にエラーが発生しました:', error);
    res.status(500).json({ error: 'サーバーエラーが発生しました', message: error.message });
  }
};

// 特定の予約IDで予約を取得
exports.getBookingById = async (req, res) => {
  try {
    const bookingId = req.params.id;
    console.log('予約ID:', bookingId); // デバッグログ

    const bookingDoc = await db.collection('parent_bookings').doc(bookingId).get();

    if (!bookingDoc.exists) {
      console.log('予約が見つかりません:', bookingId);
      return res.status(404).json({ error: '予約が見つかりません' });
    }

    const bookingData = bookingDoc.data();

    // 子予約を取得
    const childBookingsSnapshot = await db
      .collection('bookings')
      .where('parent_booking_id', '==', bookingId)
      .get();

    console.log('取得した子予約数:', childBookingsSnapshot.size); // デバッグログ

    const childBookings = [];
    childBookingsSnapshot.forEach(doc => {
      childBookings.push({
        id: doc.id,
        ...doc.data(),
      });
    });

    res.status(200).json({
      id: bookingDoc.id,
      ...bookingData,
      child_bookings: childBookings,
    });
  } catch (error) {
    console.error('予約の取得中にエラーが発生しました:', error);
    res.status(500).json({ error: 'サーバーエラーが発生しました', message: error.message });
  }
};

// 新しい予約を作成 (親予約・子予約) - トランザクション修正版
exports.createBooking = async (req, res) => {
  try {
    const { user_id, check_in_date, check_out_date, primary_contact, rooms } = req.body;

    console.log('予約作成リクエスト:', { user_id, check_in_date, check_out_date });

    if (
      !user_id ||
      !check_in_date ||
      !check_out_date ||
      !primary_contact ||
      !rooms ||
      !Array.isArray(rooms)
    ) {
      return res.status(400).json({ error: '必要な情報が不足しています' });
    }

    // トランザクション開始
    const result = await db.runTransaction(async transaction => {
      // 🔥 【修正1】すべての読み取り操作を先に実行
      const roomDocs = [];
      for (const room of rooms) {
        const roomDoc = await transaction.get(db.collection('rooms').doc(room.room_id));
        if (!roomDoc.exists) {
          throw new Error(`部屋ID ${room.room_id} が見つかりません`);
        }
        roomDocs.push({ doc: roomDoc, roomData: room });
      }

      // 🔥 【修正2】性別制限のバリデーション（読み取り完了後）
      for (const { doc, roomData } of roomDocs) {
        const roomInfo = doc.data();
        
        if (roomInfo.gender_restriction !== 'none') {
          const genderMismatch = roomData.guests.some(
            guest => guest.gender !== roomInfo.gender_restriction
          );

          if (genderMismatch) {
            throw new Error(
              `部屋 ${roomInfo.name} は ${
                roomInfo.gender_restriction === 'male' ? '男性' : '女性'
              } 専用です`
            );
          }
        }
      }

      // 🔥 【修正3】ここから書き込み操作のみ
      // 親予約の作成
      const parentBookingRef = db.collection('parent_bookings').doc();
      const parentBookingId = parentBookingRef.id;

      const parentBookingData = {
        id: parentBookingId,
        user_id,
        check_in_date,
        check_out_date,
        status: 'confirmed',
        is_early_arrival: false,
        total_guests: rooms.reduce((total, room) => total + room.guests.length, 0),
        primary_contact,
        total_amount: rooms.reduce((total, room) => total + room.price, 0),
        child_bookings: [],
        created_at: admin.firestore.FieldValue.serverTimestamp(),
        updated_at: admin.firestore.FieldValue.serverTimestamp(),
        created_by: user_id,
      };

      transaction.set(parentBookingRef, parentBookingData);

      // 子予約の作成
      const childBookingIds = [];
      for (let i = 0; i < rooms.length; i++) {
        const room = rooms[i];
        const { doc } = roomDocs[i];
        const roomInfo = doc.data();

        // 子予約の作成
        const childBookingRef = db.collection('bookings').doc();
        const childBookingId = childBookingRef.id;
        childBookingIds.push(childBookingId);

        const childBookingData = {
          id: childBookingId,
          parent_booking_id: parentBookingId,
          user_id,
          room_id: room.room_id,
          check_in_date,
          check_in_time: room.check_in_time || '14:00',
          check_out_date,
          status: 'confirmed',
          number_of_guests: room.guests.length,
          primary_guest: room.guests[0],
          additional_guests: room.guests.slice(1),
          total_amount: room.price,
          created_at: admin.firestore.FieldValue.serverTimestamp(),
          updated_at: admin.firestore.FieldValue.serverTimestamp(),
        };

        transaction.set(childBookingRef, childBookingData);

        // バリデーション記録の作成
        const validationRef = db.collection('booking_validations').doc();
        transaction.set(validationRef, {
          id: validationRef.id,
          booking_id: childBookingId,
          validation_type: 'gender_restriction',
          status: 'passed',
          details: `${
            roomInfo.gender_restriction !== 'none'
              ? (roomInfo.gender_restriction === 'male' ? '男性' : '女性') +
                '専用ドミトリーの予約は'
              : ''
          }正常に検証されました`,
          created_at: admin.firestore.FieldValue.serverTimestamp(),
        });

        // 空室状況の更新
        const dateRange = getDateRange(check_in_date, check_out_date);
        for (const date of dateRange) {
          const availabilityRef = db.collection('availability').doc();
          transaction.set(availabilityRef, {
            id: availabilityRef.id,
            room_id: room.room_id,
            date,
            status: 'booked',
            booking_id: childBookingId,
            price_override: null,
            reason: null,
            updated_at: admin.firestore.FieldValue.serverTimestamp(),
          });
        }
      }

      // 親予約に子予約IDを追加
      transaction.update(parentBookingRef, {
        child_bookings: childBookingIds,
      });

      return {
        parent_booking_id: parentBookingId,
        child_booking_ids: childBookingIds,
      };
    });

    console.log('予約が作成されました:', result);
    res.status(201).json({
      message: '予約が作成されました',
      ...result,
    });
  } catch (error) {
    console.error('予約の作成中にエラーが発生しました:', error);
    res.status(500).json({ error: error.message || 'サーバーエラーが発生しました' });
  }
};

// 予約を更新
exports.updateBooking = async (req, res) => {
  try {
    const bookingId = req.params.id;
    const updateData = req.body;

    console.log('予約更新リクエスト:', { bookingId, updateData });

    // parentBooking のみ更新可能
    const bookingRef = db.collection('parent_bookings').doc(bookingId);
    const bookingDoc = await bookingRef.get();

    if (!bookingDoc.exists) {
      return res.status(404).json({ error: '予約が見つかりません' });
    }

    // 更新可能なフィールドのみを抽出
    const allowedFields = ['status', 'is_early_arrival', 'primary_contact'];

    const filteredData = Object.keys(updateData)
      .filter(key => allowedFields.includes(key))
      .reduce((obj, key) => {
        obj[key] = updateData[key];
        return obj;
      }, {});

    // 更新日時を追加
    filteredData.updated_at = admin.firestore.FieldValue.serverTimestamp();

    await bookingRef.update(filteredData);

    res.status(200).json({
      message: '予約が更新されました',
      updated_fields: Object.keys(filteredData),
    });
  } catch (error) {
    console.error('予約の更新中にエラーが発生しました:', error);
    res.status(500).json({ error: 'サーバーエラーが発生しました', message: error.message });
  }
};

// 予約をキャンセル（修正版）
exports.cancelBooking = async (req, res) => {
  try {
    const bookingId = req.params.id;
    console.log('予約キャンセルリクエスト:', bookingId);

    // トランザクション開始
    await db.runTransaction(async transaction => {
      // 🔥 【修正】すべての読み取り操作を先に実行
      const parentBookingRef = db.collection('parent_bookings').doc(bookingId);
      const parentBookingDoc = await transaction.get(parentBookingRef);

      if (!parentBookingDoc.exists) {
        throw new Error('予約が見つかりません');
      }

      const parentBookingData = parentBookingDoc.data();

      // 空室状況の読み取り（子予約ごと）
      const availabilitySnapshots = [];
      for (const childBookingId of parentBookingData.child_bookings || []) {
        const availabilitySnapshot = await db
          .collection('availability')
          .where('booking_id', '==', childBookingId)
          .where('status', '==', 'booked')
          .get();
        availabilitySnapshots.push({ childBookingId, snapshot: availabilitySnapshot });
      }

      // 🔥 ここから書き込み操作のみ
      // 親予約のステータスを更新
      transaction.update(parentBookingRef, {
        status: 'cancelled',
        updated_at: admin.firestore.FieldValue.serverTimestamp(),
      });

      // 子予約のステータスを更新
      for (const childBookingId of parentBookingData.child_bookings || []) {
        const childBookingRef = db.collection('bookings').doc(childBookingId);
        transaction.update(childBookingRef, {
          status: 'cancelled',
          updated_at: admin.firestore.FieldValue.serverTimestamp(),
        });
      }

      // 空室状況を更新（予約を解放）
      for (const { snapshot } of availabilitySnapshots) {
        snapshot.forEach(doc => {
          transaction.update(doc.ref, {
            status: 'available',
            updated_at: admin.firestore.FieldValue.serverTimestamp(),
          });
        });
      }
    });

    res.status(200).json({ message: '予約がキャンセルされました' });
  } catch (error) {
    console.error('予約のキャンセル中にエラーが発生しました:', error);
    res.status(500).json({ error: 'サーバーエラーが発生しました', message: error.message });
  }
};

// 予約の確認 (バリデーション)
exports.validateBooking = async (req, res) => {
  try {
    const { rooms } = req.body;

    console.log('予約バリデーションリクエスト:', rooms);

    if (!rooms || !Array.isArray(rooms)) {
      return res.status(400).json({ error: '予約データが不正です' });
    }

    const validationResults = [];

    for (const room of rooms) {
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

      // 性別制限のチェック
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

      // キャパシティのチェック
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

    res.status(200).json({
      valid: isValid,
      validation_results: validationResults,
    });
  } catch (error) {
    console.error('予約バリデーション中にエラーが発生しました:', error);
    res.status(500).json({ error: 'サーバーエラーが発生しました', message: error.message });
  }
};

// 日付範囲を配列として取得するユーティリティ関数
function getDateRange(startDate, endDate) {
  const start = new Date(startDate);
  const end = new Date(endDate);
  const dateArray = [];
  let currentDate = new Date(start);

  while (currentDate < end) {
    dateArray.push(currentDate.toISOString().split('T')[0]);
    currentDate.setDate(currentDate.getDate() + 1);
  }

  return dateArray;
}