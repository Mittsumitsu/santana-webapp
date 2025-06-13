// 🚀 完璧版 roomController.js - 空室状況チェック機能付き
// サンタナゲストハウス予約システム

const admin = require('firebase-admin');
const db = admin.firestore();

console.log('🎯 完璧版 roomController.js が読み込まれました！');

// ==========================================
// 💰 料金計算システム
// ==========================================

/**
 * 部屋の料金を計算（人数ベース）
 * @param {Object} room - 部屋オブジェクト
 * @param {number} guestCount - 宿泊人数
 * @returns {number} 料金（ルピー）
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
 * @param {string} startDate - 開始日 (YYYY-MM-DD)
 * @param {string} endDate - 終了日 (YYYY-MM-DD)
 * @returns {Array} 日付配列
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
 * @param {string} roomId - 部屋ID
 * @param {string} checkInDate - チェックイン日
 * @param {string} checkOutDate - チェックアウト日
 * @returns {boolean} 利用可能かどうか
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
        .where('status', '!=', 'available')
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
 * @param {Array|Object} rooms - 部屋（配列または単一オブジェクト）
 * @param {number} totalGuests - 総ゲスト数
 * @param {string} type - 組み合わせタイプ（'single' or 'multi'）
 * @returns {number} 推奨度スコア
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
 * @param {Array} rooms - 部屋配列
 * @param {number} totalGuests - 総ゲスト数
 * @param {string} gender - 性別（'male' or 'female'）
 * @returns {Array} 配分結果
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
      room_price: calculateRoomPrice(room, guestsForRoom)
    });

    remainingGuests -= guestsForRoom;
  });

  // 残りゲストがいる場合、容量のある部屋に追加配分
  if (remainingGuests > 0) {
    for (let i = 0; i < rooms.length && remainingGuests > 0; i++) {
      const room = rooms[i];
      const currentGuests = allocation[i].total_guests;
      const additionalCapacity = room.capacity - currentGuests;
      const additionalGuests = Math.min(additionalCapacity, remainingGuests);

      if (additionalGuests > 0) {
        allocation[i].total_guests += additionalGuests;
        if (gender === 'male') {
          allocation[i].male_guests += additionalGuests;
        } else {
          allocation[i].female_guests += additionalGuests;
        }
        allocation[i].room_price = calculateRoomPrice(room, allocation[i].total_guests);
        remainingGuests -= additionalGuests;
      }
    }
  }

  return allocation;
};

// ==========================================
// 🏠 単一部屋組み合わせ生成
// ==========================================

/**
 * 単一部屋で対応可能な組み合わせを生成
 * @param {Array} availableRooms - 利用可能な部屋一覧
 * @param {number} maleCount - 男性人数
 * @param {number} femaleCount - 女性人数
 * @param {number} totalCount - 総人数
 * @returns {Array} 単一部屋組み合わせ
 */
const generateSingleRoomCombinations = (availableRooms, maleCount, femaleCount, totalCount) => {
  console.log('\n🏠 単一部屋組み合わせ生成開始');
  
  const combinations = [];
  
  // 単一部屋で収容可能な部屋をフィルタリング
  const suitableRooms = availableRooms.filter(room => {
    // 容量チェック
    if (room.capacity < totalCount) return false;
    
    // 性別制限チェック
    if (room.gender_restriction === 'male' && femaleCount > 0) return false;
    if (room.gender_restriction === 'female' && maleCount > 0) return false;
    
    return true;
  });

  // 部屋タイプごとにグループ化（重複防止）
  const roomTypeGroups = {};
  suitableRooms.forEach(room => {
    const key = `${room.room_type_id}_${room.gender_restriction}`;
    if (!roomTypeGroups[key] || roomTypeGroups[key].current_price > room.current_price) {
      roomTypeGroups[key] = room;
    }
  });

  // 各部屋タイプの組み合わせを追加
  Object.values(roomTypeGroups).forEach(room => {
    const roomPrice = calculateRoomPrice(room, totalCount);
    
    combinations.push({
      id: `single_${room.id}`,
      type: 'single',
      rooms: [room],
      total_price: roomPrice,
      total_capacity: room.capacity,
      guest_allocation: [{
        room_id: room.id,
        male_guests: maleCount,
        female_guests: femaleCount,
        total_guests: totalCount,
        room_price: roomPrice
      }],
      description: `${room.name}（1室）`,
      recommendation_score: calculateRecommendationScore(room, totalCount, 'single')
    });
  });

  console.log(`単一部屋組み合わせ: ${combinations.length}パターン生成`);
  return combinations;
};

// ==========================================
// 🏠🏠 2室組み合わせ生成（同性グループ用）
// ==========================================

/**
 * 同性グループ用の2室組み合わせを生成
 * @param {Array} suitableRooms - 適用可能な部屋一覧
 * @param {number} guestCount - ゲスト数
 * @param {string} gender - 性別
 * @returns {Array} 2室組み合わせ
 */
const generateTwoRoomSameGender = (suitableRooms, guestCount, gender) => {
  console.log(`\n🏠🏠 同性グループ2室組み合わせ生成: ${gender} ${guestCount}人`);
  
  const combinations = [];
  
  // 部屋タイプ別にグループ化
  const roomsByType = {};
  suitableRooms.forEach(room => {
    const key = `${room.room_type_id}_${room.gender_restriction}`;
    if (!roomsByType[key]) {
      roomsByType[key] = [];
    }
    roomsByType[key].push(room);
  });

  const roomTypeKeys = Object.keys(roomsByType);

  // 2室の組み合わせを生成
  for (let i = 0; i < roomTypeKeys.length; i++) {
    for (let j = i; j < roomTypeKeys.length; j++) {
      const typeKey1 = roomTypeKeys[i];
      const typeKey2 = roomTypeKeys[j];

      // 同じ部屋タイプの場合は2室以上必要
      if (typeKey1 === typeKey2 && roomsByType[typeKey1].length < 2) {
        continue;
      }

      // ドミトリー同士の組み合わせは避ける
      const type1 = typeKey1.split('_')[0];
      const type2 = typeKey2.split('_')[0];
      if (type1 === 'dormitory' && type2 === 'dormitory') {
        continue;
      }

      const room1 = roomsByType[typeKey1][0];
      const room2 = typeKey1 === typeKey2 ? roomsByType[typeKey2][1] : roomsByType[typeKey2][0];

      // 容量チェック
      if (room1.capacity + room2.capacity >= guestCount) {
        const allocation = calculateGuestAllocation([room1, room2], guestCount, gender);
        
        // 0人使用の部屋を除外
        const usedAllocation = allocation.filter(alloc => alloc.total_guests > 0);
        
        // 実際に2室使用される場合のみ追加
        if (usedAllocation.length === 2) {
          const totalPrice = usedAllocation.reduce((sum, alloc) => sum + alloc.room_price, 0);
          
          combinations.push({
            id: `same_gender_2room_${room1.id}_${room2.id}`,
            type: 'multi',
            rooms: [room1, room2],
            total_price: totalPrice,
            total_capacity: room1.capacity + room2.capacity,
            guest_allocation: usedAllocation,
            description: typeKey1 === typeKey2 ? 
              `${room1.name} × 2室（2室）` : 
              `${room1.name} + ${room2.name}（2室）`,
            recommendation_score: calculateRecommendationScore([room1, room2], guestCount, 'multi')
          });
        }
      }
    }
  }

  console.log(`2室組み合わせ: ${combinations.length}パターン生成`);
  return combinations;
};

// ==========================================
// 🏠🏠🏠 3室組み合わせ生成（同性グループ用）
// ==========================================

/**
 * 同性グループ用の3室組み合わせを生成
 * @param {Array} suitableRooms - 適用可能な部屋一覧
 * @param {number} guestCount - ゲスト数
 * @param {string} gender - 性別
 * @returns {Array} 3室組み合わせ
 */
const generateThreeRoomSameGender = (suitableRooms, guestCount, gender) => {
  console.log(`\n🏠🏠🏠 同性グループ3室組み合わせ生成: ${gender} ${guestCount}人`);
  
  if (guestCount < 3) {
    console.log('3人未満のため3室組み合わせをスキップ');
    return [];
  }

  const combinations = [];
  
  // 部屋タイプ別にグループ化
  const roomsByType = {};
  suitableRooms.forEach(room => {
    const key = `${room.room_type_id}_${room.gender_restriction}`;
    if (!roomsByType[key]) {
      roomsByType[key] = [];
    }
    roomsByType[key].push(room);
  });

  const roomTypeKeys = Object.keys(roomsByType);

  // 3室の組み合わせを生成
  for (let i = 0; i < roomTypeKeys.length; i++) {
    for (let j = i; j < roomTypeKeys.length; j++) {
      for (let k = j; k < roomTypeKeys.length; k++) {
        const typeKey1 = roomTypeKeys[i];
        const typeKey2 = roomTypeKeys[j];
        const typeKey3 = roomTypeKeys[k];

        // 各部屋タイプの必要数をカウント
        const requiredCounts = {};
        [typeKey1, typeKey2, typeKey3].forEach(key => {
          requiredCounts[key] = (requiredCounts[key] || 0) + 1;
        });

        // 実際に利用可能な部屋数をチェック
        let hasEnoughRooms = true;
        for (const [key, required] of Object.entries(requiredCounts)) {
          if (roomsByType[key].length < required) {
            hasEnoughRooms = false;
            break;
          }
        }

        if (!hasEnoughRooms) continue;

        // ドミトリー重複チェック
        const dormitoryCount = [typeKey1, typeKey2, typeKey3].filter(key => 
          key.split('_')[0] === 'dormitory'
        ).length;
        
        if (dormitoryCount > 1) continue;

        // 実際の部屋を選択
        const room1 = roomsByType[typeKey1][0];
        const room2 = typeKey1 === typeKey2 ? 
          roomsByType[typeKey2][1] : 
          roomsByType[typeKey2][0];
        const room3 = typeKey1 === typeKey3 ? 
          (typeKey2 === typeKey3 ? 
            roomsByType[typeKey3][2] || roomsByType[typeKey3][1] : 
            roomsByType[typeKey3][1]) : 
          (typeKey2 === typeKey3 ? 
            roomsByType[typeKey3][1] : 
            roomsByType[typeKey3][0]);

        // 同じ部屋IDの重複をチェック
        const roomIds = [room1.id, room2.id, room3.id];
        const uniqueRoomIds = [...new Set(roomIds)];
        if (uniqueRoomIds.length < 3) continue;

        const totalCapacity = room1.capacity + room2.capacity + room3.capacity;

        // 容量チェック
        if (totalCapacity >= guestCount) {
          // 効率性チェック
          const efficiency = guestCount / totalCapacity;
          const minEfficiency = guestCount <= 4 ? 0.25 : 0.3;
          
          if (efficiency >= minEfficiency) {
            const allocation = calculateGuestAllocation([room1, room2, room3], guestCount, gender);
            
            // 0人使用の部屋を除外
            const usedAllocation = allocation.filter(alloc => alloc.total_guests > 0);
            
            // 実際に3室使用される場合のみ追加
            if (usedAllocation.length === 3) {
              const totalPrice = usedAllocation.reduce((sum, alloc) => sum + alloc.room_price, 0);
              
              // 説明文を生成
              const roomCounts = {};
              [room1, room2, room3].forEach(room => {
                roomCounts[room.name] = (roomCounts[room.name] || 0) + 1;
              });
              
              const descriptionParts = Object.entries(roomCounts).map(([name, count]) => 
                count > 1 ? `${name} × ${count}室` : name
              );
              
              combinations.push({
                id: `same_gender_3room_${room1.id}_${room2.id}_${room3.id}`,
                type: 'multi',
                rooms: [room1, room2, room3],
                total_price: totalPrice,
                total_capacity: totalCapacity,
                guest_allocation: usedAllocation,
                description: `${descriptionParts.join(' + ')}（3室）`,
                recommendation_score: calculateRecommendationScore([room1, room2, room3], guestCount, 'multi') - 5
              });
            }
          }
        }
      }
    }
  }

  console.log(`3室組み合わせ: ${combinations.length}パターン生成`);
  return combinations;
};

// ==========================================
// 👫 男女混合グループ用組み合わせ生成
// ==========================================

/**
 * 男女混合グループ用の組み合わせを生成
 * @param {Array} availableRooms - 利用可能な部屋一覧
 * @param {number} maleCount - 男性人数
 * @param {number} femaleCount - 女性人数
 * @returns {Array} 男女混合組み合わせ
 */
const generateMixedGenderCombinations = (availableRooms, maleCount, femaleCount) => {
  console.log('\n👫 男女混合グループ組み合わせ生成開始');
  
  const combinations = [];
  const totalCount = maleCount + femaleCount;

  // 男性用の部屋候補
  const maleRooms = availableRooms.filter(room => 
    room.gender_restriction === 'male' || room.gender_restriction === 'none'
  );

  // 女性用の部屋候補
  const femaleRooms = availableRooms.filter(room => 
    room.gender_restriction === 'female' || room.gender_restriction === 'none'
  );

  // 男女ドミトリー組み合わせを最優先で追加
  const maleRoomDorm = maleRooms.find(room => 
    room.room_type_id === 'dormitory' && 
    room.gender_restriction === 'male' && 
    room.capacity >= maleCount
  );
  
  const femaleRoomDorm = femaleRooms.find(room => 
    room.room_type_id === 'dormitory' && 
    room.gender_restriction === 'female' && 
    room.capacity >= femaleCount
  );

  if (maleRoomDorm && femaleRoomDorm) {
    const maleRoomPrice = calculateRoomPrice(maleRoomDorm, maleCount);
    const femaleRoomPrice = calculateRoomPrice(femaleRoomDorm, femaleCount);

    combinations.push({
      id: `mixed_dormitory_${maleRoomDorm.id}_${femaleRoomDorm.id}`,
      type: 'multi',
      rooms: [maleRoomDorm, femaleRoomDorm],
      total_price: maleRoomPrice + femaleRoomPrice,
      total_capacity: maleRoomDorm.capacity + femaleRoomDorm.capacity,
      guest_allocation: [
        {
          room_id: maleRoomDorm.id,
          male_guests: maleCount,
          female_guests: 0,
          total_guests: maleCount,
          room_price: maleRoomPrice
        },
        {
          room_id: femaleRoomDorm.id,
          male_guests: 0,
          female_guests: femaleCount,
          total_guests: femaleCount,
          room_price: femaleRoomPrice
        }
      ],
      description: `男性ドミトリー + 女性ドミトリー（2室）`,
      recommendation_score: calculateRecommendationScore([maleRoomDorm, femaleRoomDorm], totalCount, 'multi') + 30
    });
  }

  // その他の2室組み合わせ
  const maleRoomTypes = {};
  maleRooms.forEach(room => {
    const key = `${room.room_type_id}_${room.gender_restriction}`;
    if (!maleRoomTypes[key]) {
      maleRoomTypes[key] = [];
    }
    maleRoomTypes[key].push(room);
  });

  const femaleRoomTypes = {};
  femaleRooms.forEach(room => {
    const key = `${room.room_type_id}_${room.gender_restriction}`;
    if (!femaleRoomTypes[key]) {
      femaleRoomTypes[key] = [];
    }
    femaleRoomTypes[key].push(room);
  });

  // 男女組み合わせを生成
  Object.keys(maleRoomTypes).forEach(maleTypeKey => {
    Object.keys(femaleRoomTypes).forEach(femaleTypeKey => {
      const maleRoomsOfType = maleRoomTypes[maleTypeKey];
      const femaleRoomsOfType = femaleRoomTypes[femaleTypeKey];

      if (maleRoomsOfType.length === 0 || femaleRoomsOfType.length === 0) return;

      // 🔥 同じ部屋タイプの場合の特別処理（ツイン×2室など）
      if (maleTypeKey === femaleTypeKey) {
        // 同じ部屋タイプで制限なしの場合、2室以上あれば組み合わせ可能
        const [roomType, genderRestriction] = maleTypeKey.split('_');
        
        if (genderRestriction === 'none') {
          // 制限なし部屋から2室選択
          const allRoomsOfType = [...new Set([...maleRoomsOfType, ...femaleRoomsOfType])];
          
          if (allRoomsOfType.length >= 2) {
            const room1 = allRoomsOfType[0];
            const room2 = allRoomsOfType[1];
            
            // 両方の部屋が必要な容量を満たすかチェック
            if (room1.capacity >= maleCount && room2.capacity >= femaleCount) {
              const room1Price = calculateRoomPrice(room1, maleCount);
              const room2Price = calculateRoomPrice(room2, femaleCount);

              combinations.push({
                id: `mixed_same_type_${roomType}_${room1.id}_${room2.id}`,
                type: 'multi',
                rooms: [room1, room2],
                total_price: room1Price + room2Price,
                total_capacity: room1.capacity + room2.capacity,
                guest_allocation: [
                  {
                    room_id: room1.id,
                    male_guests: maleCount,
                    female_guests: 0,
                    total_guests: maleCount,
                    room_price: room1Price
                  },
                  {
                    room_id: room2.id,
                    male_guests: 0,
                    female_guests: femaleCount,
                    total_guests: femaleCount,
                    room_price: room2Price
                  }
                ],
                description: `${room1.name} × 2室（2室）`,
                recommendation_score: calculateRecommendationScore([room1, room2], totalCount, 'multi')
              });
            }
          }
        }
        return; // 同じタイプの処理完了
      }

      // 異なる部屋タイプの組み合わせ
      const maleRoom = maleRoomsOfType[0];
      const femaleRoom = femaleRoomsOfType[0];

      // 同じ部屋は使用しない
      if (maleRoom.id === femaleRoom.id) return;

      // ドミトリー組み合わせは既に追加済みなのでスキップ
      if (maleRoom.room_type_id === 'dormitory' && 
          femaleRoom.room_type_id === 'dormitory' &&
          maleRoom.gender_restriction === 'male' &&
          femaleRoom.gender_restriction === 'female') return;

      // 容量チェック
      if (maleRoom.capacity >= maleCount && femaleRoom.capacity >= femaleCount) {
        const maleRoomPrice = calculateRoomPrice(maleRoom, maleCount);
        const femaleRoomPrice = calculateRoomPrice(femaleRoom, femaleCount);

        combinations.push({
          id: `mixed_diff_type_${maleTypeKey}_${femaleTypeKey}_${maleRoom.id}_${femaleRoom.id}`,
          type: 'multi',
          rooms: [maleRoom, femaleRoom],
          total_price: maleRoomPrice + femaleRoomPrice,
          total_capacity: maleRoom.capacity + femaleRoom.capacity,
          guest_allocation: [
            {
              room_id: maleRoom.id,
              male_guests: maleCount,
              female_guests: 0,
              total_guests: maleCount,
              room_price: maleRoomPrice
            },
            {
              room_id: femaleRoom.id,
              male_guests: 0,
              female_guests: femaleCount,
              total_guests: femaleCount,
              room_price: femaleRoomPrice
            }
          ],
          description: `${maleRoom.name} + ${femaleRoom.name}（2室）`,
          recommendation_score: calculateRecommendationScore([maleRoom, femaleRoom], totalCount, 'multi')
        });
      }
    });
  });

  console.log(`男女混合組み合わせ: ${combinations.length}パターン生成`);
  return combinations;
};

// ==========================================
// 🎯 メイン組み合わせ生成エンジン
// ==========================================

/**
 * 部屋の組み合わせを生成（メイン関数）
 * @param {Array} availableRooms - 利用可能な部屋一覧
 * @param {number} maleCount - 男性人数
 * @param {number} femaleCount - 女性人数
 * @param {number} totalCount - 総人数
 * @returns {Array} 全組み合わせ
 */
const generateRoomCombinations = (availableRooms, maleCount, femaleCount, totalCount) => {
  console.log('\n🚀 組み合わせ生成エンジン開始');
  console.log(`条件: 男性${maleCount}人, 女性${femaleCount}人, 合計${totalCount}人`);

  let allCombinations = [];

  // 1. 単一部屋組み合わせ
  const singleRoomCombinations = generateSingleRoomCombinations(
    availableRooms, maleCount, femaleCount, totalCount
  );
  allCombinations.push(...singleRoomCombinations);

  // 2. 複数部屋組み合わせ（2人以上の場合）
  if (totalCount > 1) {
    if (maleCount > 0 && femaleCount === 0) {
      // 男性のみ
      const suitableRooms = availableRooms.filter(room => 
        room.gender_restriction === 'male' || room.gender_restriction === 'none'
      );
      
      const twoRoomCombinations = generateTwoRoomSameGender(suitableRooms, maleCount, 'male');
      allCombinations.push(...twoRoomCombinations);
      
      const threeRoomCombinations = generateThreeRoomSameGender(suitableRooms, maleCount, 'male');
      allCombinations.push(...threeRoomCombinations);
      
    } else if (femaleCount > 0 && maleCount === 0) {
      // 女性のみ
      const suitableRooms = availableRooms.filter(room => 
        room.gender_restriction === 'female' || room.gender_restriction === 'none'
      );
      
      const twoRoomCombinations = generateTwoRoomSameGender(suitableRooms, femaleCount, 'female');
      allCombinations.push(...twoRoomCombinations);
      
      const threeRoomCombinations = generateThreeRoomSameGender(suitableRooms, femaleCount, 'female');
      allCombinations.push(...threeRoomCombinations);
      
    } else if (maleCount > 0 && femaleCount > 0) {
      // 男女混合
      const mixedCombinations = generateMixedGenderCombinations(availableRooms, maleCount, femaleCount);
      allCombinations.push(...mixedCombinations);
    }
  }

  // 3. 重複除去とフィルタリング
  const uniqueCombinations = [];
  const seenKeys = new Set();

  allCombinations.forEach(combination => {
    // ユニークキーを生成
    const roomIds = combination.rooms.map(room => room.id).sort().join('_');
    const guestPattern = combination.guest_allocation
      .map(g => `${g.room_id}:${g.male_guests}m${g.female_guests}f`)
      .sort()
      .join('_');
    const uniqueKey = `${combination.type}_${roomIds}_${guestPattern}`;

    if (!seenKeys.has(uniqueKey)) {
      seenKeys.add(uniqueKey);
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
// 📊 テストデータ定義
// ==========================================

const getTestRooms = () => [
  // デリー店
  {
    id: 'delhi-101', location_id: 'delhi', room_number: '101', room_type_id: 'single',
    name: 'シングルルーム', capacity: 1, current_price: 1400, description: '1人用の個室',
    is_active: true, gender_restriction: 'none', floor: 1,
  },
  {
    id: 'delhi-201', location_id: 'delhi', room_number: '201', room_type_id: 'dormitory',
    name: '女性ドミトリー', capacity: 6, current_price: 700, description: '女性専用の相部屋タイプの部屋',
    is_active: true, gender_restriction: 'female', floor: 2,
  },
  {
    id: 'delhi-202', location_id: 'delhi', room_number: '202', room_type_id: 'twin',
    name: 'ツインルーム', capacity: 2, current_price: 1700, description: '1〜2人用の個室',
    is_active: true, gender_restriction: 'none', floor: 2,
  },
  {
    id: 'delhi-203', location_id: 'delhi', room_number: '203', room_type_id: 'single',
    name: 'シングルルーム', capacity: 1, current_price: 1400, description: '1人用の個室',
    is_active: true, gender_restriction: 'none', floor: 2,
  },
  {
    id: 'delhi-301', location_id: 'delhi', room_number: '301', room_type_id: 'twin',
    name: 'ツインルーム', capacity: 2, current_price: 1700, description: '1〜2人用の個室',
    is_active: true, gender_restriction: 'none', floor: 3,
  },
  {
    id: 'delhi-302', location_id: 'delhi', room_number: '302', room_type_id: 'dormitory',
    name: '男性ドミトリー', capacity: 6, current_price: 700, description: '男性専用の相部屋タイプの部屋',
    is_active: true, gender_restriction: 'male', floor: 3,
  },
  {
    id: 'delhi-401', location_id: 'delhi', room_number: '401', room_type_id: 'deluxe',
    name: 'デラックスルーム', capacity: 2, current_price: 2300, description: '1〜2人用のデラックス個室',
    is_active: true, gender_restriction: 'none', floor: 4,
  },
  
  // バラナシ店
  {
    id: 'varanasi-101', location_id: 'varanasi', room_number: '101', room_type_id: 'twin',
    name: 'ツインルーム', capacity: 2, current_price: 1700, description: '1〜2人用の個室',
    is_active: true, gender_restriction: 'none', floor: 1,
  },
  {
    id: 'varanasi-102', location_id: 'varanasi', room_number: '102', room_type_id: 'twin',
    name: 'ツインルーム', capacity: 2, current_price: 1700, description: '1〜2人用の個室',
    is_active: true, gender_restriction: 'none', floor: 1,
  },
  {
    id: 'varanasi-201', location_id: 'varanasi', room_number: '201', room_type_id: 'single',
    name: 'シングルルーム', capacity: 1, current_price: 1400, description: '1人用の個室',
    is_active: true, gender_restriction: 'none', floor: 2,
  },
  {
    id: 'varanasi-202', location_id: 'varanasi', room_number: '202', room_type_id: 'dormitory',
    name: '女性ドミトリー', capacity: 6, current_price: 700, description: '女性専用の相部屋タイプの部屋',
    is_active: true, gender_restriction: 'female', floor: 2,
  },
  {
    id: 'varanasi-203', location_id: 'varanasi', room_number: '203', room_type_id: 'dormitory',
    name: '男性ドミトリー', capacity: 6, current_price: 700, description: '男性専用の相部屋タイプの部屋',
    is_active: true, gender_restriction: 'male', floor: 2,
  },
  {
    id: 'varanasi-301', location_id: 'varanasi', room_number: '301', room_type_id: 'deluxe',
    name: 'Bデラックスルーム', capacity: 2, current_price: 2300, description: 'バスタブ付きのデラックス個室',
    is_active: true, gender_restriction: 'none', floor: 3,
  },
  {
    id: 'varanasi-304', location_id: 'varanasi', room_number: '304', room_type_id: 'twin',
    name: 'ツインルーム', capacity: 2, current_price: 1700, description: '1〜2人用の個室',
    is_active: true, gender_restriction: 'none', floor: 3,
  },
  {
    id: 'varanasi-305', location_id: 'varanasi', room_number: '305', room_type_id: 'deluxe',
    name: 'Aデラックスルーム', capacity: 2, current_price: 2300, description: 'バラナシで1番広い部屋',
    is_active: true, gender_restriction: 'none', floor: 3,
  },
  
  // プリー店
  {
    id: 'puri-101', location_id: 'puri', room_number: '101', room_type_id: 'single',
    name: 'シングルルーム', capacity: 1, current_price: 1400, description: '1人用の個室',
    is_active: true, gender_restriction: 'none', floor: 1,
  },
  {
    id: 'puri-209', location_id: 'puri', room_number: '209', room_type_id: 'single',
    name: 'シングルルーム', capacity: 1, current_price: 1400, description: '1人用の個室',
    is_active: true, gender_restriction: 'none', floor: 2,
  },
  {
    id: 'puri-306', location_id: 'puri', room_number: '306', room_type_id: 'single',
    name: 'シングルルーム', capacity: 1, current_price: 1400, description: '1人用の個室',
    is_active: true, gender_restriction: 'none', floor: 3,
  },
  {
    id: 'puri-204', location_id: 'puri', room_number: '204', room_type_id: 'dormitory',
    name: '女性ドミトリー', capacity: 4, current_price: 700, description: '女性専用の相部屋タイプの部屋',
    is_active: true, gender_restriction: 'female', floor: 2,
  },
  {
    id: 'puri-205', location_id: 'puri', room_number: '205', room_type_id: 'dormitory',
    name: '男性ドミトリー', capacity: 4, current_price: 700, description: '男性専用の相部屋タイプの部屋',
    is_active: true, gender_restriction: 'male', floor: 2,
  },
  {
    id: 'puri-203', location_id: 'puri', room_number: '203', room_type_id: 'deluxe',
    name: 'Aデラックスルーム', capacity: 2, current_price: 2300, description: '1〜2人用のデラックス個室',
    is_active: true, gender_restriction: 'none', floor: 2,
  },
  {
    id: 'puri-208', location_id: 'puri', room_number: '208', room_type_id: 'deluxe_VIP',
    name: 'Bデラックスルーム', capacity: 4, current_price: 3000, description: '1〜4名用の広々としたデラックス個室',
    is_active: true, gender_restriction: 'none', floor: 2,
  },
];

// ==========================================
// 🎯 API エンドポイント実装
// ==========================================

/**
 * 空室検索API（Firestore対応版）
 */
const getAvailableRooms = async (req, res) => {
  try {
    console.log('\n🔍 【Firestore対応】空室検索開始');
    console.log('検索条件:', req.query);

    const { checkIn, checkOut, checkInTime, maleGuests, femaleGuests, totalGuests, location } = req.query;

    // パラメータの変換と検証
    const maleCount = parseInt(maleGuests) || 0;
    const femaleCount = parseInt(femaleGuests) || 0;
    const totalCount = parseInt(totalGuests) || maleCount + femaleCount;

    console.log(`パラメータ: 男性${maleCount}人, 女性${femaleCount}人, 合計${totalCount}人, 場所:${location}`);

    // バリデーション
    if (totalCount === 0) {
      return res.status(400).json({ error: '宿泊人数を1人以上指定してください' });
    }

    // ロケーション検証を改善
    const validLocations = ['delhi', 'varanasi', 'puri'];
    let targetLocation = location;

    // 'any'や無効な値の場合はデフォルトでdelhiを使用
    if (!location || location === 'any' || location === '' || !validLocations.includes(location)) {
      console.log(`⚠️ 無効な店舗指定: ${location} → デフォルトでdelhiを使用`);
      targetLocation = 'delhi';
    }

    // 必須パラメータの検証
    if (!checkIn || !checkOut) {
      return res.status(400).json({
        error: 'チェックイン日とチェックアウト日を指定してください',
      });
    }

    console.log(`🎯 検索対象店舗: ${targetLocation}`);

    // 翌日チェックイン判定
    const nextDayTimes = ['01:00', '02:00', '03:00', '04:00', '05:00', '06:00', '07:00', '08:00', '09:00'];
    const isNextDayCheckIn = nextDayTimes.includes(checkInTime);

    // 🔥 Firestoreから部屋データを取得（新IDフォーマット対応）
    console.log('🗄️ Firestoreから部屋データを取得中...');
    
    let roomsByLocation = [];
    
    try {
      // Firestoreから取得
      const roomsSnapshot = await req.db.collection('rooms')
        .where('location_id', '==', targetLocation)
        .where('is_active', '==', true)
        .get();

      if (roomsSnapshot.empty) {
        console.log(`⚠️ Firestoreに${targetLocation}店の部屋がありません。テストデータを使用します。`);
        // フォールバック: テストデータを使用
        const allRooms = getTestRooms();
        roomsByLocation = allRooms.filter(room => room.location_id === targetLocation);
      } else {
        // Firestoreデータを配列に変換
        roomsSnapshot.forEach(doc => {
          const roomData = doc.data();
          roomsByLocation.push({
            id: doc.id, // FirestoreドキュメントID（R_XXXXXX形式）
            ...roomData
          });
        });
        console.log(`✅ Firestoreから${roomsByLocation.length}件の部屋を取得`);
        console.log('📋 取得した部屋:', roomsByLocation.map(r => `${r.id}(${r.name})`).join(', '));
      }
    } catch (firestoreError) {
      console.error('❌ Firestore取得エラー:', firestoreError.message);
      console.log('📋 フォールバック: テストデータを使用');
      // フォールバック: テストデータを使用
      const allRooms = getTestRooms();
      roomsByLocation = allRooms.filter(room => room.location_id === targetLocation);
    }

    console.log(`店舗フィルタリング後: ${roomsByLocation.length}件`);

    if (roomsByLocation.length === 0) {
      return res.status(404).json({
        error: '選択された店舗に利用可能な部屋がありません',
        location: targetLocation,
        message: `${targetLocation}店の部屋情報が見つかりません。他の店舗をお試しください。`
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
        },
        location: targetLocation
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
      location: targetLocation, // 実際に使用された店舗を返す
    }));

    console.log(`🎯 【Firestore対応】検索完了: ${enhancedCombinations.length}パターン生成`);

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
          location: targetLocation, // 実際に使用された店舗
          original_location_param: location, // 元のパラメータも記録
          availability_check: true, // 空室チェック実施済み
        },
      },
    });

  } catch (error) {
    console.error('🚨 【Firestore対応】検索エラー:', error);
    res.status(500).json({ 
      error: 'サーバーエラーが発生しました',
      message: error.message,
      timestamp: new Date().toISOString()
    });
  }
};

/**
 * 全部屋取得API
 */
const getAllRooms = async (req, res) => {
  try {
    console.log('全ての部屋を取得中...');
    const rooms = getTestRooms();
    res.json({ rooms, total: rooms.length });
  } catch (error) {
    console.error('全ての部屋取得エラー:', error);
    res.status(500).json({ error: 'サーバーエラーが発生しました' });
  }
};

/**
 * 部屋詳細取得API
 */
const getRoomById = async (req, res) => {
  try {
    const { roomId } = req.params;
    console.log('部屋詳細を取得中:', roomId);

    const rooms = getTestRooms();
    const room = rooms.find(r => r.id === roomId);

    if (!room) {
      return res.status(404).json({ error: '部屋が見つかりません' });
    }

    res.json(room);
  } catch (error) {
    console.error('部屋詳細取得エラー:', error);
    res.status(500).json({ error: 'サーバーエラーが発生しました' });
  }
};

/**
 * 部屋作成API（管理者用）
 */
const createRoom = async (req, res) => {
  try {
    console.log('部屋を作成中:', req.body);
    res.json({ message: '部屋が作成されました（テストモード）', room: req.body });
  } catch (error) {
    console.error('部屋作成エラー:', error);
    res.status(500).json({ error: 'サーバーエラーが発生しました' });
  }
};

/**
 * 部屋更新API（管理者用）
 */
const updateRoom = async (req, res) => {
  try {
    const { roomId } = req.params;
    console.log('部屋を更新中:', roomId, req.body);
    res.json({ message: '部屋が更新されました（テストモード）', roomId, updates: req.body });
  } catch (error) {
    console.error('部屋更新エラー:', error);
    res.status(500).json({ error: 'サーバーエラーが発生しました' });
  }
};

/**
 * 部屋削除API（管理者用）
 */
const deleteRoom = async (req, res) => {
  try {
    const { roomId } = req.params;
    console.log('部屋を削除中:', roomId);
    res.json({ message: '部屋が削除されました（テストモード）', roomId });
  } catch (error) {
    console.error('部屋削除エラー:', error);
    res.status(500).json({ error: 'サーバーエラーが発生しました' });
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
  checkRoomAvailability
};