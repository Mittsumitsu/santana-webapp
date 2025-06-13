// backend/src/utils/availabilityChecker.js

const admin = require('firebase-admin');
const db = admin.firestore();

/**
 * 🎯 予約ステータス定義
 */
const BOOKING_STATUS = {
  AVAILABLE: 'available',           // 空室
  REGULAR_BOOKING: 'booked',       // 通常予約
  TOUR_BOOKING: 'tour_booking',    // ツアー予約（スタッフ管理）
  FESTIVAL_BOOKING: 'festival_booking', // 祭期間の特別予約（スタッフ管理）
  MAINTENANCE: 'maintenance',      // メンテナンス中
  BLOCKED: 'blocked'              // ブロック済み
};

/**
 * 🔍 詳細な空室チェック機能
 * @param {string} roomId - 部屋ID
 * @param {string} checkInDate - チェックイン日 (YYYY-MM-DD)
 * @param {string} checkOutDate - チェックアウト日 (YYYY-MM-DD)
 * @returns {Object} 空室状況詳細
 */
async function checkRoomAvailabilityDetailed(roomId, checkInDate, checkOutDate) {
  try {
    console.log(`🔍 詳細空室チェック開始: ${roomId} (${checkInDate} ～ ${checkOutDate})`);
    
    // 日付範囲を生成
    const dateRange = generateDateRange(checkInDate, checkOutDate);
    console.log(`📅 チェック対象日数: ${dateRange.length}日`);
    
    // 各日の空室状況をチェック
    const availabilityResults = [];
    const unavailableDates = [];
    
    for (const date of dateRange) {
      const dayStatus = await checkSingleDateAvailability(roomId, date);
      availabilityResults.push({
        date: date,
        status: dayStatus.status,
        booking_type: dayStatus.booking_type,
        booking_id: dayStatus.booking_id
      });
      
      // 利用不可な日をマーク
      if (dayStatus.status !== BOOKING_STATUS.AVAILABLE) {
        unavailableDates.push({
          date: date,
          reason: dayStatus.status,
          booking_type: dayStatus.booking_type
        });
      }
    }
    
    const isFullyAvailable = unavailableDates.length === 0;
    
    console.log(`✅ ${roomId} 空室チェック完了: ${isFullyAvailable ? '利用可能' : '一部/全部予約済み'}`);
    
    return {
      room_id: roomId,
      is_available: isFullyAvailable,
      check_in_date: checkInDate,
      check_out_date: checkOutDate,
      total_nights: dateRange.length,
      unavailable_dates: unavailableDates,
      availability_details: availabilityResults,
      summary: {
        available_nights: dateRange.length - unavailableDates.length,
        unavailable_nights: unavailableDates.length,
        availability_rate: ((dateRange.length - unavailableDates.length) / dateRange.length * 100).toFixed(1)
      }
    };
    
  } catch (error) {
    console.error(`❌ ${roomId}の空室チェックエラー:`, error.message);
    return {
      room_id: roomId,
      is_available: false,
      error: error.message,
      check_in_date: checkInDate,
      check_out_date: checkOutDate
    };
  }
}

/**
 * 📅 単一日の空室状況チェック
 */
async function checkSingleDateAvailability(roomId, date) {
  try {
    const availabilityDoc = await db
      .collection('availability')
      .where('room_id', '==', roomId)
      .where('date', '==', date)
      .limit(1)
      .get();
    
    if (availabilityDoc.empty) {
      // 空室データが存在しない場合は利用可能として扱う
      return {
        status: BOOKING_STATUS.AVAILABLE,
        booking_type: null,
        booking_id: null
      };
    }
    
    const data = availabilityDoc.docs[0].data();
    return {
      status: data.status || BOOKING_STATUS.AVAILABLE,
      booking_type: data.booking_type || null,
      booking_id: data.booking_id || null,
      special_notes: data.special_notes || null
    };
    
  } catch (error) {
    console.error(`❌ ${date}の空室状況取得エラー:`, error.message);
    return {
      status: 'error',
      error: error.message
    };
  }
}

/**
 * 📊 複数部屋の一括空室チェック
 */
async function checkMultipleRoomsAvailability(roomIds, checkInDate, checkOutDate) {
  console.log(`🏠 複数部屋空室チェック開始: ${roomIds.length}室`);
  
  const results = await Promise.all(
    roomIds.map(async (roomId) => {
      return await checkRoomAvailabilityDetailed(roomId, checkInDate, checkOutDate);
    })
  );
  
  const availableRooms = results.filter(result => result.is_available);
  const unavailableRooms = results.filter(result => !result.is_available);
  
  console.log(`📊 チェック完了: 利用可能 ${availableRooms.length}室 / 予約済み ${unavailableRooms.length}室`);
  
  return {
    total_checked: roomIds.length,
    available_count: availableRooms.length,
    unavailable_count: unavailableRooms.length,
    available_rooms: availableRooms,
    unavailable_rooms: unavailableRooms,
    availability_rate: (availableRooms.length / roomIds.length * 100).toFixed(1)
  };
}

/**
 * 🗓️ 日付範囲生成（チェックアウト日は含まない）
 */
function generateDateRange(startDate, endDate) {
  const dates = [];
  const currentDate = new Date(startDate);
  const end = new Date(endDate);
  
  while (currentDate < end) {
    dates.push(currentDate.toISOString().split('T')[0]);
    currentDate.setDate(currentDate.getDate() + 1);
  }
  
  return dates;
}

/**
 * 🔄 空室状況の更新（予約作成時に使用）
 */
async function updateRoomAvailability(roomId, dates, status, bookingData = {}) {
  try {
    console.log(`🔄 空室状況更新: ${roomId} - ${status}`);
    
    const batch = db.batch();
    
    for (const date of dates) {
      const availabilityRef = db.collection('availability').doc(`${roomId}_${date}`);
      
      const updateData = {
        room_id: roomId,
        date: date,
        status: status,
        updated_at: admin.firestore.FieldValue.serverTimestamp()
      };
      
      // 予約情報がある場合は追加
      if (bookingData.booking_id) {
        updateData.booking_id = bookingData.booking_id;
      }
      if (bookingData.booking_type) {
        updateData.booking_type = bookingData.booking_type;
      }
      if (bookingData.special_notes) {
        updateData.special_notes = bookingData.special_notes;
      }
      
      batch.set(availabilityRef, updateData, { merge: true });
    }
    
    await batch.commit();
    console.log(`✅ ${dates.length}日分の空室状況を更新完了`);
    
    return { success: true, updated_dates: dates.length };
    
  } catch (error) {
    console.error('❌ 空室状況更新エラー:', error.message);
    return { success: false, error: error.message };
  }
}

/**
 * 📋 予約表示用の空室状況取得
 */
async function getBookingCalendar(roomId, startDate, endDate) {
  try {
    const dateRange = generateDateRange(startDate, endDate);
    
    const calendarData = await Promise.all(
      dateRange.map(async (date) => {
        const dayStatus = await checkSingleDateAvailability(roomId, date);
        
        return {
          date: date,
          status: dayStatus.status,
          booking_type: dayStatus.booking_type,
          display_info: getDisplayInfo(dayStatus.status, dayStatus.booking_type),
          booking_id: dayStatus.booking_id,
          is_available: dayStatus.status === BOOKING_STATUS.AVAILABLE
        };
      })
    );
    
    return {
      room_id: roomId,
      calendar_period: {
        start_date: startDate,
        end_date: endDate,
        total_days: dateRange.length
      },
      calendar_data: calendarData,
      summary: generateCalendarSummary(calendarData)
    };
    
  } catch (error) {
    console.error('❌ 予約表カレンダー取得エラー:', error.message);
    return { error: error.message };
  }
}

/**
 * 🎨 表示情報の生成
 */
function getDisplayInfo(status, bookingType) {
  const displayMap = {
    [BOOKING_STATUS.AVAILABLE]: {
      label: '空室',
      color: '#4CAF50',
      icon: '✅',
      description: '予約可能'
    },
    [BOOKING_STATUS.REGULAR_BOOKING]: {
      label: '通常予約',
      color: '#FF5722',
      icon: '🏠',
      description: '一般のお客様予約'
    },
    [BOOKING_STATUS.TOUR_BOOKING]: {
      label: 'ツアー予約',
      color: '#9C27B0',
      icon: '🚌',
      description: 'スタッフ管理のツアー予約'
    },
    [BOOKING_STATUS.FESTIVAL_BOOKING]: {
      label: '祭期間特別予約',
      color: '#FF9800',
      icon: '🎭',
      description: 'スタッフ管理の特別予約'
    },
    [BOOKING_STATUS.MAINTENANCE]: {
      label: 'メンテナンス',
      color: '#607D8B',
      icon: '🔧',
      description: '清掃・修理中'
    },
    [BOOKING_STATUS.BLOCKED]: {
      label: 'ブロック',
      color: '#795548',
      icon: '🚫',
      description: '利用停止中'
    }
  };
  
  return displayMap[status] || {
    label: '不明',
    color: '#9E9E9E',
    icon: '❓',
    description: 'ステータス不明'
  };
}

/**
 * 📊 カレンダーサマリー生成
 */
function generateCalendarSummary(calendarData) {
  const summary = {};
  
  calendarData.forEach(day => {
    const status = day.status;
    summary[status] = (summary[status] || 0) + 1;
  });
  
  return {
    total_days: calendarData.length,
    status_breakdown: summary,
    availability_rate: ((summary[BOOKING_STATUS.AVAILABLE] || 0) / calendarData.length * 100).toFixed(1)
  };
}

module.exports = {
  BOOKING_STATUS,
  checkRoomAvailabilityDetailed,
  checkSingleDateAvailability,
  checkMultipleRoomsAvailability,
  updateRoomAvailability,
  getBookingCalendar,
  generateDateRange,
  getDisplayInfo
};