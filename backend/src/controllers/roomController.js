// 🚀 完璧版 roomController.js - Firestore完全対応版
// サンタナゲストハウス予約システム - Phase 2 データ正規化完了

const admin = require('firebase-admin');
const db = admin.firestore();

console.log('🎯 Firestore完全対応版 roomController.js が読み込まれました！');

// ==========================================
// 🔥 Firestore部屋データ取得関数
// ==========================================

/**
 * Firestoreから全部屋データを取得
 */
const getAllRoomsFromFirestore = async () => {
  try {
    console.log('🔥 Firestoreから全部屋データを取得中...');
    
    const snapshot = await db.collection('rooms').get();
    const rooms = [];
    
    snapshot.forEach(doc => {
      const roomData = doc.data();
      rooms.push({
        id: roomData.id,
        location_id: roomData.location_id,
        room_number: roomData.room_number,
        room_type_id: roomData.room_type_id,
        name: roomData.name,
        capacity: roomData.capacity,
        current_price: roomData.current_price,
        description: roomData.description,
        is_active: roomData.is_active,
        gender_restriction: roomData.gender_restriction,
        floor: roomData.floor,
        additional_amenities: roomData.additional_amenities || ['none']
      });
    });
    
    console.log(`✅ Firestore部屋データ取得完了: ${rooms.length}件`);
    return rooms;
    
  } catch (error) {
    console.error('❌ Firestore部屋データ取得エラー:', error);
    throw new Error('部屋データの取得に失敗しました');
  }
};

/**
 * 特定の部屋IDで部屋データを取得
 */
const getRoomByIdFromFirestore = async (roomId) => {
  try {
    console.log(`🔥 Firestore: 部屋 ${roomId} のデータを取得中...`);
    
    const doc = await db.collection('rooms').doc(roomId).get();
    
    if (!doc.exists) {
      console.log(`❌ 部屋 ${roomId} が見つかりません`);
      return null;
    }
    
    const roomData = doc.data();
    const room = {
      id: roomData.id,
      location_id: roomData.location_id,
      room_number: roomData.room_number,
      room_type_id: roomData.room_type_id,
      name: roomData.name,
      capacity: roomData.capacity,
      current_price: roomData.current_price,
      description: roomData.description,
      is_active: roomData.is_active,
      gender_restriction: roomData.gender_restriction,
      floor: roomData.floor,
      additional_amenities: roomData.additional_amenities || ['none']
    };
    
    console.log(`✅ 部屋 ${roomId} のデータ取得完了`);
    return room;
    
  } catch (error) {
    console.error(`❌ 部屋 ${roomId} のデータ取得エラー:`, error);
    throw new Error(`部屋 ${roomId} のデータ取得に失敗しました`);
  }
};

// ==========================================
// 💰 料金計算システム
// ==========================================

/**
 * 部屋の料金を計算（人数ベース）
 */
const calculateRoomPrice = (room, guestCount) => {
  if (guestCount === 0) {
    return 0;
  }

  switch (room.room_type_id) {
    case 'dormitory':
      return guestCount * 700; // 人数 × 700ルピー
    case 'single':
      return 1400; // 固定料金
    case 'twin':
      return guestCount === 1 ? 1400 : 1700; // 1人なら1400、2人なら1700
    case 'deluxe':
      return guestCount === 1 ? 1700 : 2300; // 1人なら1700、2人なら2300
    case 'deluxe_VIP':
      return guestCount === 1 ? 2000 : 3000; // 1人なら2000、2人以上なら3000
    default:
      return room.current_price; // デフォルト価格
  }
};

// ==========================================
// 🔍 空室状況チェック機能
// ==========================================

/**
 * 日付範囲を配列として取得するユーティリティ関数
 */
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

/**
 * 指定期間中の部屋の空室状況をチェック
 */
const checkRoomAvailability = async (roomId, checkInDate, checkOutDate) => {
  try {
    console.log(`🔍 空室チェック: ${roomId}, ${checkInDate} - ${checkOutDate}`);
    
    // チェック対象の日付範囲を生成
    const dateRange = getDateRange(checkInDate, checkOutDate);
    console.log(`  対象日付: ${dateRange.join(', ')}`);
    
    // 該当期間中の予約状況をチェック
    for (const date of dateRange) {
      const availabilitySnapshot = await db
        .collection('availability')
        .where('room_id', '==', roomId)
        .where('date', '==', date)
        .where('status', '==', 'booked')
        .get();
    
      if (!availabilitySnapshot.empty) {
        console.log(`  ❌ ${roomId}は${date}に予約済み`);
        return false; // 一つでも予約があれば利用不可
      }
    }
    
    console.log(`  ✅ ${roomId}は指定期間中利用可能`);
    return true; // すべての日付で利用可能
  } catch (error) {
    console.error(`空室チェックエラー (${roomId}):`, error);
    return false; // エラー時は利用不可として扱う
  }
};

// ==========================================
// 🎯 推奨度スコア計算
// ==========================================

/**
 * 組み合わせの推奨度スコアを計算
 */
const calculateRecommendationScore = (rooms, totalGuests, type) => {
  let score = 100;

  if (Array.isArray(rooms)) {
    // 複数部屋の場合
    const totalCapacity = rooms.reduce((sum, room) => sum + room.capacity, 0);
    
    // 容量効率（無駄が少ないほど高スコア）
    const efficiencyRatio = totalGuests / totalCapacity;
    score += efficiencyRatio * 25;

    // 部屋数ペナルティ（単一部屋の方が高スコア）
    score -= (rooms.length - 1) * 8;

    // 価格効率の計算
    let totalPrice = 0;
    let remainingGuests = totalGuests;
    
    rooms.forEach(room => {
      const guestsForRoom = Math.min(room.capacity, remainingGuests);
      totalPrice += calculateRoomPrice(room, guestsForRoom);
      remainingGuests -= guestsForRoom;
    });

    const avgPricePerPerson = totalPrice / totalGuests;
    if (avgPricePerPerson < 1000) score += 15;
    else if (avgPricePerPerson > 2000) score -= 10;
    
  } else {
    // 単一部屋の場合
    const room = rooms;
    const efficiencyRatio = totalGuests / room.capacity;
    score += efficiencyRatio * 30;

    // 部屋タイプボーナス
    if (room.room_type_id === 'dormitory') score += 10;
    if (room.room_type_id === 'deluxe') score += 5;

    const pricePerPerson = calculateRoomPrice(room, totalGuests) / totalGuests;
    if (pricePerPerson < 1000) score += 15;
    else if (pricePerPerson > 2000) score -= 10;
  }

  return Math.round(score);
};

// ==========================================
// 👥 ゲスト配分システム
// ==========================================

/**
 * ゲストを複数の部屋に均等配分
 */
const calculateGuestAllocation = (rooms, totalGuests, gender) => {
  const allocation = [];
  let remainingGuests = totalGuests;

  // 基本配分（均等分散）
  const baseGuestsPerRoom = Math.floor(totalGuests / rooms.length);
  const extraGuests = totalGuests % rooms.length;

  rooms.forEach((room, index) => {
    // 基本人数 + 余りがある場合は1人追加
    let guestsForRoom = baseGuestsPerRoom;
    if (index < extraGuests) {
      guestsForRoom += 1;
    }

    // 部屋の容量を超えないように調整
    guestsForRoom = Math.min(guestsForRoom, room.capacity);
    guestsForRoom = Math.min(guestsForRoom, remainingGuests);

    allocation.push({
      room_id: room.id,
      male_guests: gender === 'male' ? guestsForRoom : 0,
      female_guests: gender === 'female' ? guestsForRoom : 0,
      total_guests: guestsForRoom,
      room_price: calculateRoomPrice(room, guestsForRoom),
      room_name: room.name,
      room_capacity: room.capacity
    });

    remainingGuests -= guestsForRoom;
  });

  return allocation;
};

// ==========================================
// 🏠 単一部屋組み合わせ生成
// ==========================================

/**
 * 単一部屋での宿泊可能な組み合わせを生成
 */
const generateSingleRoomCombinations = (rooms, totalGuests, gender) => {
  console.log(`\n🏠 単一部屋組み合わせ生成開始`);
  
  const combinations = [];

  rooms.forEach(room => {
    // 性別制限チェック
    if (room.gender_restriction !== 'none' && room.gender_restriction !== gender) {
      return; // 性別制限に引っかかる場合はスキップ
    }

    // 容量チェック
    if (room.capacity >= totalGuests) {
      const price = calculateRoomPrice(room, totalGuests);
      
      combinations.push({
        id: `single_${room.id}`,
        type: 'single',
        rooms: [room],
        total_price: price,
        per_person_price: Math.round(price / totalGuests),
        description: `${room.name}（1室）`,
        guest_allocation: [{
          room_id: room.id,
          male_guests: gender === 'male' ? totalGuests : 0,
          female_guests: gender === 'female' ? totalGuests : 0,
          total_guests: totalGuests,
          room_price: price,
          room_name: room.name,
          room_capacity: room.capacity
        }],
        recommendation_score: calculateRecommendationScore(room, totalGuests, 'single')
      });
    }
  });

  console.log(`単一部屋組み合わせ: ${combinations.length}パターン生成`);
  return combinations;
};

// ==========================================
// 🏠🏠 2室組み合わせ生成（男女混合グループ用）
// ==========================================

/**
 * 男女混合グループ用の2室組み合わせを生成
 */
const generateTwoRoomMixedGender = (rooms, maleCount, femaleCount) => {
  console.log(`\n🏠🏠 男女混合グループ2室組み合わせ生成: 男性${maleCount}人 女性${femaleCount}人`);
  
  const combinations = [];
  const totalGuests = maleCount + femaleCount;

  // 性別制限のない部屋のみを使用
  const genderNeutralRooms = rooms.filter(room => room.gender_restriction === 'none');
  
  // 男性専用・女性専用部屋も考慮
  const maleOnlyRooms = rooms.filter(room => room.gender_restriction === 'male');
  const femaleOnlyRooms = rooms.filter(room => room.gender_restriction === 'female');

  // 全ての有効な部屋の組み合わせを考慮
  const allValidRooms = [...genderNeutralRooms, ...maleOnlyRooms, ...femaleOnlyRooms];

  for (let i = 0; i < allValidRooms.length; i++) {
    for (let j = i + 1; j < allValidRooms.length; j++) {
      const room1 = allValidRooms[i];
      const room2 = allValidRooms[j];

      // 同じ部屋は使用不可
      if (room1.id === room2.id) continue;

      // 総容量チェック
      const totalCapacity = room1.capacity + room2.capacity;
      if (totalCapacity < totalGuests) continue;

      // 効率性チェック（50%以上の利用率）
      const efficiency = totalGuests / totalCapacity;
      if (efficiency < 0.5) continue;

      // ゲスト配分の計算
      let allocation = null;

      // パターン1: 男女で部屋を分ける
      if ((room1.gender_restriction === 'male' || room1.gender_restriction === 'none') &&
          (room2.gender_restriction === 'female' || room2.gender_restriction === 'none') &&
          room1.capacity >= maleCount && room2.capacity >= femaleCount) {
        
        allocation = [
          {
            room_id: room1.id,
            male_guests: maleCount,
            female_guests: 0,
            total_guests: maleCount,
            room_price: calculateRoomPrice(room1, maleCount),
            room_name: room1.name,
            room_capacity: room1.capacity
          },
          {
            room_id: room2.id,
            male_guests: 0,
            female_guests: femaleCount,
            total_guests: femaleCount,
            room_price: calculateRoomPrice(room2, femaleCount),
            room_name: room2.name,
            room_capacity: room2.capacity
          }
        ];
      }
      
      // パターン2: 逆の組み合わせ
      else if ((room2.gender_restriction === 'male' || room2.gender_restriction === 'none') &&
               (room1.gender_restriction === 'female' || room1.gender_restriction === 'none') &&
               room2.capacity >= maleCount && room1.capacity >= femaleCount) {
        
        allocation = [
          {
            room_id: room1.id,
            male_guests: 0,
            female_guests: femaleCount,
            total_guests: femaleCount,
            room_price: calculateRoomPrice(room1, femaleCount),
            room_name: room1.name,
            room_capacity: room1.capacity
          },
          {
            room_id: room2.id,
            male_guests: maleCount,
            female_guests: 0,
            total_guests: maleCount,
            room_price: calculateRoomPrice(room2, maleCount),
            room_name: room2.name,
            room_capacity: room2.capacity
          }
        ];
      }

      // パターン3: 両方とも性別制限なしの場合、混合配分
      else if (room1.gender_restriction === 'none' && room2.gender_restriction === 'none') {
        // 均等配分を試す
        const allocation1 = calculateGuestAllocation([room1, room2], totalGuests, 'mixed');
        
        // 混合配分での男女配分
        let remainingMale = maleCount;
        let remainingFemale = femaleCount;
        
        allocation = allocation1.map(alloc => {
          const maleInRoom = Math.min(remainingMale, Math.floor(alloc.total_guests * (maleCount / totalGuests)));
          const femaleInRoom = alloc.total_guests - maleInRoom;
          
          remainingMale -= maleInRoom;
          remainingFemale -= femaleInRoom;
          
          return {
            ...alloc,
            male_guests: maleInRoom,
            female_guests: femaleInRoom
          };
        });
      }

      if (allocation) {
        const totalPrice = allocation.reduce((sum, alloc) => sum + alloc.room_price, 0);
        
        combinations.push({
          id: `mixed_${room1.id}_${room2.id}`,
          type: 'multi',
          rooms: [room1, room2],
          total_price: totalPrice,
          per_person_price: Math.round(totalPrice / totalGuests),
          description: room1.name === room2.name ? 
            `${room1.name} × 2室（2室）` : 
            `${room1.name} + ${room2.name}（2室）`,
          guest_allocation: allocation,
          recommendation_score: calculateRecommendationScore([room1, room2], totalGuests, 'multi')
        });
      }
    }
  }

  console.log(`男女混合組み合わせ: ${combinations.length}パターン生成`);
  return combinations;
};

// ==========================================
// 🎯 総合組み合わせ生成システム
// ==========================================

/**
 * メイン組み合わせ生成関数
 */
const generateRoomCombinations = (rooms, maleCount, femaleCount, totalCount) => {
  console.log('\n🚀 組み合わせ生成エンジン開始');
  console.log(`条件: 男性${maleCount}人, 女性${femaleCount}人, 合計${totalCount}人`);

  let allCombinations = [];

  // 1. 単一部屋組み合わせ（同性グループのみ）
  if (maleCount === 0 || femaleCount === 0) {
    const gender = maleCount > 0 ? 'male' : 'female';
    console.log('\n🏠 単一部屋組み合わせ生成開始');
    allCombinations = allCombinations.concat(
      generateSingleRoomCombinations(rooms, totalCount, gender)
    );
  }

  // 2. 男女混合グループの組み合わせ
  if (maleCount > 0 && femaleCount > 0) {
    console.log('\n👫 男女混合グループ組み合わせ生成開始');
    allCombinations = allCombinations.concat(
      generateTwoRoomMixedGender(rooms, maleCount, femaleCount)
    );
  }

  // 3. 重複除去（同じ部屋構成の組み合わせを統合）
  const uniqueCombinations = [];
  const seen = new Set();

  allCombinations.forEach(combination => {
    // 部屋IDをソートして一意キーを作成
    const roomIds = combination.rooms.map(r => r.id).sort();
    const key = roomIds.join('_');
    
    if (!seen.has(key)) {
      seen.add(key);
      uniqueCombinations.push(combination);
    }
  });

  // 4. 最終検証：同じ部屋IDの重複使用をチェック
  const validCombinations = uniqueCombinations.filter(combination => {
    if (combination.type === 'multi' && combination.rooms.length >= 2) {
      const roomIds = combination.rooms.map(room => room.id);
      const uniqueRoomIds = [...new Set(roomIds)];
      return uniqueRoomIds.length === roomIds.length;
    }
    return true;
  });

  // 5. ソート（推奨度順→価格順）
  validCombinations.sort((a, b) => {
    if (a.recommendation_score !== b.recommendation_score) {
      return b.recommendation_score - a.recommendation_score;
    }
    return a.total_price - b.total_price;
  });

  console.log(`🎯 最終結果: ${validCombinations.length}パターン生成`);
  return validCombinations;
};

// ==========================================
// 📡 API エンドポイント関数
// ==========================================

/**
 * 🔥 UPDATED: 利用可能な部屋を検索（Firestore完全対応版）
 */
const getAvailableRooms = async (req, res) => {
  try {
    console.log('\n🔍 【Firestore完全対応】空室検索開始');
    console.log('検索条件:', req.query);
    
    const { 
      checkIn, 
      checkOut, 
      checkInTime = '14:00', 
      maleGuests = 0, 
      femaleGuests = 0, 
      totalGuests, 
      location 
    } = req.query;

    // パラメータ変換
    const maleCount = parseInt(maleGuests);
    const femaleCount = parseInt(femaleGuests);
    const totalCount = parseInt(totalGuests);

    console.log(`パラメータ: 男性${maleCount}人, 女性${femaleCount}人, 合計${totalCount}人, 場所:${location}`);

    // 必須パラメータチェック
    if (!checkIn || !checkOut || !location || totalCount <= 0) {
      return res.status(400).json({
        error: '必要なパラメータが不足しています',
        required: ['checkIn', 'checkOut', 'location', 'totalGuests'],
        received: { checkIn, checkOut, location, totalGuests: totalCount }
      });
    }

    // 日程妥当性チェック
    const checkInDate = new Date(checkIn);
    const checkOutDate = new Date(checkOut);
    if (checkInDate >= checkOutDate) {
      return res.status(400).json({
        error: '日程が正しくありません。チェックアウト日はチェックイン日より後の日付を選択してください。',
      });
    }

    // 翌日チェックイン判定
    const nextDayTimes = ['01:00', '02:00', '03:00', '04:00', '05:00', '06:00', '07:00', '08:00', '09:00'];
    const isNextDayCheckIn = nextDayTimes.includes(checkInTime);

    // 🔥 NEW: Firestoreから部屋データを取得
    const allRooms = await getAllRoomsFromFirestore();
    const roomsByLocation = allRooms.filter(room => 
      room.location_id === location && room.is_active === true
    );

    console.log(`店舗フィルタリング後: ${roomsByLocation.length}件`);

    if (roomsByLocation.length === 0) {
      return res.status(404).json({
        error: '選択された店舗に利用可能な部屋がありません',
        location: location,
        total_rooms_in_firestore: allRooms.length
      });
    }

    // 🔥 【新機能】空室状況チェック
    console.log('\n🔍 空室状況チェック開始...');
    const availableRooms = [];
    
    for (const room of roomsByLocation) {
      const isAvailable = await checkRoomAvailability(room.id, checkIn, checkOut);
      if (isAvailable) {
        availableRooms.push(room);
        console.log(`✅ ${room.name}(${room.id}) - 利用可能`);
      } else {
        console.log(`❌ ${room.name}(${room.id}) - 予約済み`);
      }
    }

    console.log(`\n空室チェック完了: ${availableRooms.length}/${roomsByLocation.length}室が利用可能`);

    if (availableRooms.length === 0) {
      return res.status(404).json({
        error: '指定された期間に利用可能な部屋がありません',
        message: '別の日程または店舗をお試しください。',
        availability_info: {
          total_rooms_checked: roomsByLocation.length,
          available_rooms_found: 0,
          unavailable_rooms: roomsByLocation.length,
        }
      });
    }

    // 組み合わせ生成（空室のみ）
    const roomCombinations = generateRoomCombinations(
      availableRooms,
      maleCount,
      femaleCount,
      totalCount
    );

    console.log('生成された組み合わせ:', roomCombinations.length, 'パターン');

    // レスポンス情報の追加
    const enhancedCombinations = roomCombinations.map(combination => ({
      ...combination,
      check_in_time: checkInTime,
      is_next_day_checkin: isNextDayCheckIn,
      guest_breakdown: {
        male: maleCount,
        female: femaleCount,
        total: totalCount,
      },
      data_source: 'firestore' // 🔥 NEW: データソースを明記
    }));

    console.log(`🎯 【Firestore完全対応】検索完了: ${enhancedCombinations.length}パターン生成`);

    // 最終結果のログ出力
    enhancedCombinations.forEach((combination, index) => {
      const roomInfo = combination.rooms.map(r => `${r.name}(${r.id})`).join(' + ');
      console.log(`  ${index + 1}. ${combination.description} - ${roomInfo} - ₹${combination.total_price}`);
    });

    res.json({
      success: true,
      combinations: enhancedCombinations,
      total_combinations: enhancedCombinations.length,
      availability_info: {
        total_rooms_checked: roomsByLocation.length,
        available_rooms_found: availableRooms.length,
        unavailable_rooms: roomsByLocation.length - availableRooms.length,
      },
      search_params: {
        checkIn,
        checkOut,
        checkInTime,
        isNextDayCheckIn,
        guest_breakdown: {
          male: maleCount,
          female: femaleCount,
          total: totalCount,
        },
        applied_filters: {
          location: location,
          availability_check: true, // 空室チェック実施済み
        },
      },
      data_source: 'firestore', // 🔥 NEW: データソースを明記
      migration_status: 'phase_2_complete' // 🔥 NEW: 移行状況
    });

  } catch (error) {
    console.error('🚨 【Firestore完全対応】検索エラー:', error);
    res.status(500).json({ 
      error: 'サーバーエラーが発生しました',
      message: error.message,
      data_source: 'firestore'
    });
  }
};

/**
 * 🔥 UPDATED: 部屋作成API（管理者用・Firestore完全対応版）
 */
const createRoom = async (req, res) => {
  try {
    console.log('🔥 Firestore: 部屋を作成中:', req.body);
    
    const roomData = {
      ...req.body,
      created_at: admin.firestore.FieldValue.serverTimestamp(),
      updated_at: admin.firestore.FieldValue.serverTimestamp(),
      is_active: true
    };

    // 新IDシステムでIDを生成（簡易版）
    const newRoomId = req.body.id || `R_${Date.now().toString(36).toUpperCase()}`;
    
    await db.collection('rooms').doc(newRoomId).set(roomData);
    
    res.json({ 
      message: '部屋が作成されました', 
      roomId: newRoomId,
      room: roomData,
      data_source: 'firestore',
      migration_status: 'phase_2_complete'
    });
  } catch (error) {
    console.error('部屋作成エラー:', error);
    res.status(500).json({ 
      error: 'サーバーエラーが発生しました',
      message: error.message,
      data_source: 'firestore'
    });
  }
};

/**
 * 🔥 UPDATED: 部屋更新API（管理者用・Firestore完全対応版）
 */
const updateRoom = async (req, res) => {
  try {
    const { roomId } = req.params;
    console.log('🔥 Firestore: 部屋を更新中:', roomId, req.body);
    
    const updateData = {
      ...req.body,
      updated_at: admin.firestore.FieldValue.serverTimestamp()
    };

    await db.collection('rooms').doc(roomId).update(updateData);
    
    res.json({ 
      message: '部屋が更新されました', 
      roomId: roomId,
      updates: updateData,
      data_source: 'firestore',
      migration_status: 'phase_2_complete'
    });
  } catch (error) {
    console.error('部屋更新エラー:', error);
    res.status(500).json({ 
      error: 'サーバーエラーが発生しました',
      message: error.message,
      data_source: 'firestore'
    });
  }
};

/**
 * 🔥 UPDATED: 部屋削除API（管理者用・Firestore完全対応版）
 */
const deleteRoom = async (req, res) => {
  try {
    const { roomId } = req.params;
    console.log('🔥 Firestore: 部屋を削除中:', roomId);
    
    // 論理削除（is_activeをfalseに設定）
    await db.collection('rooms').doc(roomId).update({
      is_active: false,
      deleted_at: admin.firestore.FieldValue.serverTimestamp(),
      updated_at: admin.firestore.FieldValue.serverTimestamp()
    });
    
    res.json({ 
      message: '部屋が削除されました（論理削除）', 
      roomId: roomId,
      data_source: 'firestore',
      migration_status: 'phase_2_complete'
    });
  } catch (error) {
    console.error('部屋削除エラー:', error);
    res.status(500).json({ 
      error: 'サーバーエラーが発生しました',
      message: error.message,
      data_source: 'firestore'
    });
  }
};

// ==========================================
// 📤 エクスポート
// ==========================================

module.exports = {
  getAllRooms,
  getRoomById,
  getAvailableRooms,
  createRoom,
  updateRoom,
  deleteRoom,
  
  // 🔥 NEW: Firestore専用関数もエクスポート
  getAllRoomsFromFirestore,
  getRoomByIdFromFirestore
};

// ==========================================
// 📋 Phase 2 データ正規化完了ログ
// ==========================================

console.log(`
🎉🎉🎉🎉🎉🎉🎉🎉🎉🎉🎉🎉🎉🎉🎉🎉🎉🎉🎉🎉
🏆 PHASE 2 データ正規化完了! 🏆
🎉🎉🎉🎉🎉🎉🎉🎉🎉🎉🎉🎉🎉🎉🎉🎉🎉🎉🎉🎉

✅ テストデータ依存を完全除去
✅ Firestore完全対応に移行完了
✅ 新IDシステム (R_XXXXXX) 統一完了
✅ 親子予約構造廃止維持
✅ データ整合性確保

🎯 変更点:
  - getTestRooms() → getAllRoomsFromFirestore()
  - 全API関数をFirestore対応に更新
  - データソース明記 (data_source: 'firestore')
  - 移行状況追跡 (migration_status: 'phase_2_complete')

🚀 次の段階: 予約システムの動作確認
   → delhi-202 エラーは解消されているはず!
`);).json({ 
      error: 'サーバーエラーが発生しました',
      message: error.message,
      data_source: 'firestore'
    });
  }
};

/**
 * 🔥 UPDATED: 全部屋取得API（Firestore完全対応版）
 */
const getAllRooms = async (req, res) => {
  try {
    console.log('🔥 Firestore: 全ての部屋を取得中...');
    const rooms = await getAllRoomsFromFirestore();
    
    res.json({ 
      rooms, 
      total: rooms.length,
      data_source: 'firestore',
      migration_status: 'phase_2_complete'
    });
  } catch (error) {
    console.error('全ての部屋取得エラー:', error);
    res.status(500).json({ 
      error: 'サーバーエラーが発生しました',
      message: error.message,
      data_source: 'firestore'
    });
  }
};

/**
 * 🔥 UPDATED: 部屋詳細取得API（Firestore完全対応版）
 */
const getRoomById = async (req, res) => {
  try {
    const { roomId } = req.params;
    console.log('🔥 Firestore: 部屋詳細を取得中:', roomId);

    const room = await getRoomByIdFromFirestore(roomId);

    if (!room) {
      return res.status(404).json({ 
        error: '部屋が見つかりません',
        roomId: roomId,
        data_source: 'firestore'
      });
    }

    res.json({
      ...room,
      data_source: 'firestore',
      migration_status: 'phase_2_complete'
    });
  } catch (error) {
    console.error('部屋詳細取得エラー:', error);
    res.status(500