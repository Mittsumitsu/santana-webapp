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

// 🎯 新IDシステム対応: ユーザーIDで予約を取得（改善版）
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

    console.log('🔍 予約検索開始 - ユーザーID:', userId);

    // 🎯 統合予約コレクションから検索（改善版）
    const bookingsSnapshot = await db
      .collection('bookings')
      .where('user_id', '==', userId)
      .get();

    console.log('📊 クエリ結果:', bookingsSnapshot.size, '件');

    const bookings = [];
    
    bookingsSnapshot.forEach(doc => {
      const bookingData = doc.data();
      console.log('📋 予約データ確認:', {
        docId: doc.id,
        bookingId: bookingData.id,
        userId: bookingData.user_id,
        hasRooms: !!bookingData.rooms,
        roomsCount: bookingData.rooms?.length || 0
      });
      
      // 🔥 予約データの整形・補完（料金修正付き）
      const formattedBooking = {
        id: bookingData.id || doc.id,
        user_id: bookingData.user_id,
        check_in_date: bookingData.check_in_date,
        check_out_date: bookingData.check_out_date,
        status: bookingData.status || 'confirmed',
        total_guests: bookingData.total_guests || 1,
        total_amount: calculateCorrectAmount(bookingData), // 🔥 料金修正関数
        primary_contact: bookingData.primary_contact || {
          name_kanji: 'ゲスト',
          name_romaji: 'GUEST',
          email: 'guest@example.com'
        },
        
        // 🔥 統合予約の部屋情報を処理
        rooms: bookingData.rooms || [],
        
        // フロントエンド表示用の追加情報
        created_at: bookingData.created_at || bookingData.updated_at || admin.firestore.FieldValue.serverTimestamp(),
        updated_at: bookingData.updated_at || admin.firestore.FieldValue.serverTimestamp(),
        is_new_system: true,
        display_format: 'unified_booking',
        migration_version: bookingData.migration_version || '2.0_UNIFIED_BOOKING'
      };
      
      bookings.push(formattedBooking);
    });

    // 🔥 結果のソート（チェックイン日順 - 新しい予約が上に）
    bookings.sort((a, b) => {
      const dateA = new Date(a.check_in_date);
      const dateB = new Date(b.check_in_date);
      return dateB - dateA; // 新しいチェックイン日が上に
    });

    console.log(`✅ 新IDシステム予約返却: ${bookings.length} 件`);
    
    // 詳細ログ
    bookings.forEach((booking, index) => {
      console.log(`  ${index + 1}. ${booking.id} - ₹${booking.total_amount} - ${booking.status}`);
      console.log(`     チェックイン: ${booking.check_in_date} - 部屋数: ${booking.rooms?.length || 0}`);
    });

    // 🔥 予約が見つからない場合も成功レスポンス
    if (bookings.length === 0) {
      console.log('📝 このユーザーの予約は見つかりませんでした');
      return res.status(200).json([]);
    }

    res.status(200).json(bookings);
    
  } catch (error) {
    console.error('❌ ユーザー予約の取得中にエラーが発生しました:', error);
    
    // 🔥 詳細なエラー情報を提供
    let errorMessage = 'サーバーエラーが発生しました';
    let statusCode = 500;
    
    if (error.code === 'permission-denied') {
      errorMessage = 'データベースへのアクセス権限がありません';
      statusCode = 403;
    } else if (error.code === 'unavailable') {
      errorMessage = 'データベースに一時的に接続できません';
      statusCode = 503;
    }
    
    res.status(statusCode).json({ 
      error: errorMessage,
      message: error.message,
      userId: req.params.userId,
      timestamp: new Date().toISOString()
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

// 🎯 新IDシステム対応: 新しい予約を作成（部屋タイプ保存対応）
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

    // 🎯 部屋情報を取得して部屋タイプを保存
    const enrichedRooms = [];
    
    for (const room of rooms) {
      try {
        // 部屋詳細を取得
        const roomDoc = await db.collection('rooms').doc(room.room_id).get();
        
        if (!roomDoc.exists) {
          return res.status(400).json({ 
            error: `部屋 ${room.room_id} が見つかりません` 
          });
        }
        
        const roomData = roomDoc.data();
        
        // 部屋情報を予約データに含める
        const enrichedRoom = {
          room_id: room.room_id,
          room_type_id: roomData.room_type_id, // 🎯 予約時点の部屋タイプを保存
          room_name: roomData.name,
          check_in_time: room.check_in_time || '14:00',
          number_of_guests: room.guests.length,
          primary_guest: {
            name_romaji: room.guests[0].name_romaji,
            gender: room.guests[0].gender
          },
          additional_guests: room.guests.slice(1),
          room_amount: room.room_amount || room.price,
          // 予約時点の部屋情報スナップショット
          room_snapshot: {
            room_type_id: roomData.room_type_id,
            room_type_name: getRoomTypeName(roomData.room_type_id),
            capacity: roomData.capacity,
            current_price: roomData.current_price,
            location_id: roomData.location_id,
            room_number: roomData.room_number
          }
        };
        
        enrichedRooms.push(enrichedRoom);
        
        console.log(`📋 部屋情報取得: ${room.room_id} (${roomData.room_type_id})`);
        
      } catch (roomError) {
        console.error(`❌ 部屋情報取得エラー (${room.room_id}):`, roomError);
        return res.status(500).json({ 
          error: `部屋情報の取得に失敗しました: ${room.room_id}` 
        });
      }
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
      total_amount: rooms.reduce((total, room) => total + (room.room_amount || room.price), 0),
      
      // 🎯 部屋タイプ情報を含む統合予約の部屋情報
      rooms: enrichedRooms,
      
      // メタデータ
      created_at: admin.firestore.FieldValue.serverTimestamp(),
      updated_at: admin.firestore.FieldValue.serverTimestamp(),
      created_by: user_id,
      system_version: '2.0_NEW_ID_SYSTEM',
      booking_type: 'unified_booking'
    };

    // Firestoreに保存
    await db.collection('bookings').doc(newBookingId).set(unifiedBookingData);

    // 🎯 Phase 3.3対応: 予約作成後にavailabilityを更新（ドミトリー対応版）
    console.log('🔥 Phase 3.3 availability更新開始（ドミトリー対応）...');
    const dateRange = getDateRange(check_in_date, check_out_date);
    
    for (const room of enrichedRooms) {
      // 部屋タイプを確認
      const roomType = room.room_snapshot.room_type_id;
      const isDormitory = roomType === 'dormitory';
      const guestCount = room.number_of_guests;
      
      console.log(`🔥 部屋処理: ${room.room_id} (${roomType}, ${guestCount}名)`);
      
      for (const date of dateRange) {
        const docId = `${room.room_id}_${date}`;
        console.log(`🔥 availability更新: ${docId}`);
        
        const docRef = db.collection('availability').doc(docId);
        const docSnap = await docRef.get();
        
        if (isDormitory) {
          // 🏠 ドミトリーの場合: 部分的予約管理
          if (docSnap.exists) {
            const existingData = docSnap.data();
            const currentOccupancy = existingData.dormitory_info?.current_occupancy || 0;
            const newOccupancy = currentOccupancy + guestCount;
            const capacity = room.room_snapshot.capacity;
            
            console.log(`🏠 ドミトリー更新: ${currentOccupancy} + ${guestCount} = ${newOccupancy}/${capacity}`);
            
            // ドミトリー情報を更新
            await docRef.update({
              'dormitory_info.current_occupancy': newOccupancy,
              'dormitory_info.remaining_capacity': capacity - newOccupancy,
              'dormitory_info.bookings': admin.firestore.FieldValue.arrayUnion({
                booking_id: newBookingId,
                guest_count: guestCount,
                primary_guest: room.primary_guest.name_romaji,
                gender: room.primary_guest.gender,
                created_at: new Date().toISOString()
              }),
              // ステータス判定
              status: newOccupancy >= capacity ? 'booked' : 'partial',
              'status_info.code': newOccupancy >= capacity ? 'booked' : 'partial',
              'status_info.name': newOccupancy >= capacity ? '満室' : '部分予約',
              'status_info.bookable': newOccupancy < capacity,
              'status_info.customer_visible': true,
              'status_info.staff_visible': true,
              'status_info.color': newOccupancy >= capacity ? '#dc3545' : '#ffc107',
              'status_info.icon': newOccupancy >= capacity ? '❌' : '🔺',
              updated_at: admin.firestore.FieldValue.serverTimestamp(),
            });
          } else {
            // 新規ドミトリー予約
            const capacity = room.room_snapshot.capacity;
            const isFullyBooked = guestCount >= capacity;
            
            console.log(`🏠 ドミトリー新規: ${guestCount}/${capacity}`);
            
            await docRef.set({
              room_id: room.room_id,
              date: date,
              status: isFullyBooked ? 'booked' : 'partial',
              
              // ドミトリー専用情報
              dormitory_info: {
                current_occupancy: guestCount,
                remaining_capacity: capacity - guestCount,
                total_capacity: capacity,
                bookings: [{
                  booking_id: newBookingId,
                  guest_count: guestCount,
                  primary_guest: room.primary_guest.name_romaji,
                  gender: room.primary_guest.gender,
                  created_at: new Date().toISOString()
                }]
              },
              
              // Phase 3.3拡張フィールド
              status_info: {
                code: isFullyBooked ? 'booked' : 'partial',
                name: isFullyBooked ? '満室' : '部分予約',
                customer_visible: true,
                staff_visible: true,
                bookable: !isFullyBooked,
                color: isFullyBooked ? '#dc3545' : '#ffc107',
                icon: isFullyBooked ? '❌' : '🔺'
              },
              
              customer_visible: true,
              staff_notes: `ドミトリー予約 ${guestCount}名`,
              booking_type: 'dormitory',
              
              created_at: admin.firestore.FieldValue.serverTimestamp(),
              updated_at: admin.firestore.FieldValue.serverTimestamp(),
              migration_version: '1.0'
            });
          }
          console.log(`✅ ドミトリー availability更新: ${docId}`);
          
        } else {
          // 🚪 個室の場合: 従来の完全予約管理
          const availabilityData = {
            room_id: room.room_id,
            date: date,
            status: 'booked',
            booking_id: newBookingId,
            
            // 🆕 Phase 3.3拡張フィールド
            status_info: {
              code: 'booked',
              name: '通常予約',
              customer_visible: false,  // お客様には非表示
              staff_visible: true,      // スタッフに表示
              bookable: false,          // 予約不可
              color: '#dc3545',
              icon: '🔴'
            },
            
            customer_visible: false,    // お客様向け表示フラグ
            staff_notes: `予約ID: ${newBookingId}`,
            booking_type: 'normal',     // 予約種別
            
            // メタデータ
            created_at: admin.firestore.FieldValue.serverTimestamp(),
            updated_at: admin.firestore.FieldValue.serverTimestamp(),
            migration_version: '1.0'
          };
          
          if (docSnap.exists) {
            // 既存があればupdate（既存の拡張フィールドを保持しつつ更新）
            await docRef.update({
              status: 'booked',
              booking_id: newBookingId,
              'status_info.code': 'booked',
              'status_info.name': '通常予約',
              'status_info.customer_visible': false,
              'status_info.staff_visible': true,
              'status_info.bookable': false,
              'status_info.color': '#dc3545',
              'status_info.icon': '🔴',
              customer_visible: false,
              staff_notes: `予約ID: ${newBookingId}`,
              booking_type: 'normal',
              updated_at: admin.firestore.FieldValue.serverTimestamp(),
            });
            console.log(`✅ 個室 availability更新(update): ${docId}`);
          } else {
            // なければ新規作成（完全な拡張構造で作成）
            await docRef.set(availabilityData);
            console.log(`✅ 個室 availability新規作成(set): ${docId}`);
          }
        }
      }
    }
    
    console.log('✅ Phase 3.3 availability更新完了');

    console.log('✅ 新IDシステム予約作成成功:', newBookingId);
    console.log('🏨 保存された部屋タイプ:', enrichedRooms.map(r => `${r.room_id}:${r.room_type_id}`));
    
    res.status(201).json({
      message: '予約が作成されました',
      booking_id: newBookingId,
      total_amount: unifiedBookingData.total_amount,
      total_guests: unifiedBookingData.total_guests,
      rooms_info: enrichedRooms.map(r => ({
        room_id: r.room_id,
        room_type: r.room_snapshot.room_type_name
      })),
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

    const bookingData = bookingDoc.data();
    
    // 🎯 Phase 3.3対応: キャンセル時にavailabilityを空室に戻す（ドミトリー対応）
    console.log('🔥 キャンセル時availability更新開始（ドミトリー対応）...');
    const dateRange = getDateRange(bookingData.check_in_date, bookingData.check_out_date);
    
    for (const room of bookingData.rooms) {
      const roomType = room.room_snapshot?.room_type_id;
      const isDormitory = roomType === 'dormitory';
      const guestCount = room.number_of_guests;
      
      console.log(`🔥 キャンセル処理: ${room.room_id} (${roomType}, ${guestCount}名)`);
      
      for (const date of dateRange) {
        const docId = `${room.room_id}_${date}`;
        console.log(`🔥 availability復元: ${docId}`);
        
        const docRef = db.collection('availability').doc(docId);
        const docSnap = await docRef.get();
        
        if (docSnap.exists) {
          const availabilityDoc = docSnap.data();
          
          if (isDormitory) {
            // 🏠 ドミトリーの場合: 部分的キャンセル処理
            const dormitoryInfo = availabilityDoc.dormitory_info;
            if (dormitoryInfo) {
              // 該当予約を削除
              const updatedBookings = dormitoryInfo.bookings.filter(
                booking => booking.booking_id !== bookingId
              );
              
              // 新しい占有数を計算
              const newOccupancy = updatedBookings.reduce((sum, booking) => sum + booking.guest_count, 0);
              const capacity = dormitoryInfo.total_capacity;
              
              console.log(`🏠 ドミトリーキャンセル: ${dormitoryInfo.current_occupancy} - ${guestCount} = ${newOccupancy}/${capacity}`);
              
              if (newOccupancy === 0) {
                // 完全に空室になる場合
                await docRef.update({
                  status: 'available',
                  'dormitory_info.current_occupancy': 0,
                  'dormitory_info.remaining_capacity': capacity,
                  'dormitory_info.bookings': [],
                  'status_info.code': 'available',
                  'status_info.name': '空室',
                  'status_info.customer_visible': true,
                  'status_info.staff_visible': true,
                  'status_info.bookable': true,
                  'status_info.color': '#28a745',
                  'status_info.icon': '⭕️',
                  customer_visible: true,
                  staff_notes: `ドミトリー完全空室 (キャンセル: ${bookingId})`,
                  updated_at: admin.firestore.FieldValue.serverTimestamp(),
                });
              } else {
                // 部分的にキャンセル
                await docRef.update({
                  status: 'partial',
                  'dormitory_info.current_occupancy': newOccupancy,
                  'dormitory_info.remaining_capacity': capacity - newOccupancy,
                  'dormitory_info.bookings': updatedBookings,
                  'status_info.code': 'partial',
                  'status_info.name': '部分予約',
                  'status_info.customer_visible': true,
                  'status_info.staff_visible': true,
                  'status_info.bookable': true,
                  'status_info.color': '#ffc107',
                  'status_info.icon': '🔺',
                  customer_visible: true,
                  staff_notes: `ドミトリー部分キャンセル ${newOccupancy}/${capacity} (キャンセル: ${bookingId})`,
                  updated_at: admin.firestore.FieldValue.serverTimestamp(),
                });
              }
              console.log(`✅ ドミトリー availability復元: ${docId}`);
            }
          } else {
            // 🚪 個室の場合: 従来の完全キャンセル処理
            if (availabilityDoc.booking_id === bookingId) {
              await docRef.update({
                status: 'available',
                booking_id: null,
                'status_info.code': 'available',
                'status_info.name': '空室',
                'status_info.customer_visible': true,
                'status_info.staff_visible': true,
                'status_info.bookable': true,
                'status_info.color': '#28a745',
                'status_info.icon': '⭕️',
                customer_visible: true,
                staff_notes: `キャンセル済み (元予約: ${bookingId})`,
                booking_type: 'none',
                updated_at: admin.firestore.FieldValue.serverTimestamp(),
              });
              console.log(`✅ 個室 availability復元: ${docId}`);
            } else {
              console.log(`⚠️ booking_id不一致: ${docId} (expected: ${bookingId}, actual: ${availabilityDoc.booking_id})`);
            }
          }
        }
      }
    }
    
    console.log('✅ キャンセル時availability更新完了');

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

// 🔥 料金修正関数
function calculateCorrectAmount(bookingData) {
  if (!bookingData.check_in_date || !bookingData.check_out_date) {
    return bookingData.total_amount || 0;
  }
  
  // 宿泊日数計算
  const checkIn = new Date(bookingData.check_in_date);
  const checkOut = new Date(bookingData.check_out_date);
  const nights = Math.floor((checkOut - checkIn) / (1000 * 60 * 60 * 24));
  
  if (nights <= 0) return bookingData.total_amount || 0;
  
  // 部屋情報から正しい料金を計算
  if (bookingData.rooms && bookingData.rooms.length > 0) {
    const totalRoomAmount = bookingData.rooms.reduce((sum, room) => {
      return sum + (room.room_amount || 1700); // デフォルト1泊1700ルピー
    }, 0);
    
    const calculatedAmount = totalRoomAmount * nights;
    const originalAmount = bookingData.total_amount || 0;
    
    // 大きな差がある場合は計算値を使用
    if (Math.abs(originalAmount - calculatedAmount) > 500) {
      console.log(`💰 サーバー側料金修正: ${bookingData.id} - 保存値:₹${originalAmount} → 計算値:₹${calculatedAmount}`);
      return calculatedAmount;
    }
  }
  
  return bookingData.total_amount || 0;
}

// 🎯 部屋タイプIDから日本語名を取得
function getRoomTypeName(roomTypeId) {
  const typeMap = {
    'single': 'シングルルーム',
    'twin': 'ツインルーム', 
    'deluxe': 'デラックスルーム',
    'dormitory': 'ドミトリー',
    'deluxe_VIP': 'VIPルーム'
  };
  return typeMap[roomTypeId] || roomTypeId;
}

// 🎯 新IDシステム用のID生成関数
function generateNewBookingId() {
  const chars = '23456789ABCDEFGHJKLMNPQRSTUVWXYZ';
  let result = 'B_';
  for (let i = 0; i < 12; i++) {
    result += chars.charAt(Math.floor(Math.random() * chars.length));
  }
  return result;
}

// 🔍 日付範囲を配列として取得するユーティリティ関数（roomController.jsから複製）
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