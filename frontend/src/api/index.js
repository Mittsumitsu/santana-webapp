import axios from 'axios';

// APIのベースURLを設定
const API = axios.create({
  baseURL: 'http://localhost:3000/api',
  timeout: 30000 // 30秒のタイムアウト
});

// リクエスト interceptor
API.interceptors.request.use(
  config => {
    console.log('🚀 API Request:', config.method?.toUpperCase(), config.url);
    if (config.data) {
      console.log('📤 Request Data:', config.data);
    }
    if (config.params) {
      console.log('📋 Request Params:', config.params);
    }
    return config;
  },
  error => {
    console.error('❌ Request Error:', error);
    return Promise.reject(error);
  }
);

// レスポンス interceptor
API.interceptors.response.use(
  response => {
    console.log('✅ API Response:', response.status, response.config.url);
    console.log('📥 Response Data:', response.data);
    return response;
  },
  error => {
    console.error('❌ Response Error:', error);
    
    // ネットワークエラーやタイムアウトのハンドリング
    if (error.code === 'ECONNABORTED') {
      console.error('⏰ Request timeout');
      return Promise.reject(new Error('リクエストがタイムアウトしました。サーバーの応答に時間がかかっています。'));
    }
    
    if (!error.response) {
      console.error('🌐 Network error');
      return Promise.reject(new Error('ネットワーク接続に問題があります。インターネット接続を確認してください。'));
    }

    // サーバーエラーのログ
    console.error('🔥 Server Error:', {
      status: error.response.status,
      statusText: error.response.statusText,
      data: error.response.data,
      url: error.config?.url
    });
    
    return Promise.reject(error);
  }
);

// 空室検索API - 男女別人数対応
export const fetchAvailableRooms = async (checkIn, checkOut, checkInTime, maleGuests, femaleGuests, totalGuests, location) => {
  try {
    console.log('🔍 空室検索開始:', {
      checkIn, checkOut, checkInTime, 
      maleGuests, femaleGuests, totalGuests, location
    });

    const response = await API.get(`/rooms/available`, {
      params: { 
        checkIn, 
        checkOut, 
        checkInTime,
        maleGuests,
        femaleGuests,
        totalGuests,
        location 
      }
    });

    console.log('✅ 空室検索成功:', response.data.total_combinations, 'パターン見つかりました');
    return response;

  } catch (error) {
    console.error('❌ 空室検索エラー:', error.message);
    throw error;
  }
};

// 部屋詳細API
export const fetchRoomDetails = async (roomId) => {
  try {
    console.log('🏠 部屋詳細取得:', roomId);
    
    const response = await API.get(`/rooms/${roomId}`);
    
    console.log('✅ 部屋詳細取得成功:', response.data.name);
    return response;

  } catch (error) {
    console.error('❌ 部屋詳細取得エラー:', error.message);
    throw error;
  }
};

// 予約作成API - 完全実装
export const createBooking = async (bookingData) => {
  try {
    console.log('📝 予約作成開始');
    console.log('💼 予約データ:', {
      user_id: bookingData.user_id,
      check_in_date: bookingData.check_in_date,
      check_out_date: bookingData.check_out_date,
      rooms_count: bookingData.rooms?.length,
      primary_contact: bookingData.primary_contact?.email
    });
    
    // データ検証
    if (!bookingData.check_in_date || !bookingData.check_out_date) {
      throw new Error('チェックイン・チェックアウト日が指定されていません');
    }
    
    if (!bookingData.rooms || bookingData.rooms.length === 0) {
      throw new Error('予約する部屋が選択されていません');
    }
    
    if (!bookingData.primary_contact?.email) {
      throw new Error('代表者のメールアドレスが入力されていません');
    }

    const response = await API.post('/bookings', bookingData);
    
    console.log('🎉 予約作成成功!');
    console.log('📋 予約ID:', response.data.parent_booking_id);
    console.log('💰 合計金額:', `₹${response.data.total_amount?.toLocaleString()}`);
    
    return response;
    
  } catch (error) {
    console.error('❌ 予約作成エラー:', error.message);
    
    // エラーの詳細をログ出力
    if (error.response) {
      console.error('🔥 サーバーエラー詳細:', {
        status: error.response.status,
        message: error.response.data?.error || error.response.statusText,
        details: error.response.data
      });
    } else if (error.request) {
      console.error('🌐 ネットワークエラー:', error.request);
    } else {
      console.error('⚠️ その他のエラー:', error.message);
    }
    
    throw error;
  }
};

// 予約取得API
export const fetchBooking = async (bookingId) => {
  try {
    console.log('📖 予約詳細取得:', bookingId);
    
    const response = await API.get(`/bookings/${bookingId}`);
    
    console.log('✅ 予約詳細取得成功');
    return response;

  } catch (error) {
    console.error('❌ 予約詳細取得エラー:', error.message);
    throw error;
  }
};

// ユーザー予約履歴API
export const fetchUserBookings = async (userId) => {
  try {
    console.log('📚 ユーザー予約履歴取得:', userId);
    
    const response = await API.get(`/bookings/user/${userId}`);
    
    console.log('✅ 予約履歴取得成功:', response.data.length, '件');
    return response;

  } catch (error) {
    console.error('❌ 予約履歴取得エラー:', error.message);
    throw error;
  }
};

// 予約更新API
export const updateBooking = async (bookingId, updateData) => {
  try {
    console.log('✏️ 予約更新:', bookingId);
    
    const response = await API.put(`/bookings/${bookingId}`, updateData);
    
    console.log('✅ 予約更新成功');
    return response;

  } catch (error) {
    console.error('❌ 予約更新エラー:', error.message);
    throw error;
  }
};

// 予約キャンセルAPI
export const cancelBooking = async (bookingId) => {
  try {
    console.log('🚫 予約キャンセル:', bookingId);
    
    const response = await API.delete(`/bookings/${bookingId}`);
    
    console.log('✅ 予約キャンセル成功');
    return response;

  } catch (error) {
    console.error('❌ 予約キャンセルエラー:', error.message);
    throw error;
  }
};

// 予約バリデーションAPI
export const validateBooking = async (bookingData) => {
  try {
    console.log('🔍 予約バリデーション開始');
    
    const response = await API.post('/bookings/validate', bookingData);
    
    console.log('✅ バリデーション完了:', response.data.valid ? '有効' : '無効');
    return response;

  } catch (error) {
    console.error('❌ バリデーションエラー:', error.message);
    throw error;
  }
};

// API接続テスト
export const testConnection = async () => {
  try {
    console.log('🔌 API接続テスト開始');
    
    const response = await API.get('/');
    
    console.log('✅ API接続成功:', response.data.message);
    return response;

  } catch (error) {
    console.error('❌ API接続失敗:', error.message);
    throw error;
  }
};

export default API;