// frontend/src/api/index.js - API関数修正版
import axios from 'axios';

// APIのベースURLを設定
const API = axios.create({
  baseURL: 'http://localhost:3000/api',
  timeout: 30000, // 30秒のタイムアウト
  headers: {
    'Content-Type': 'application/json'
  }
});

// リクエスト interceptor - 詳細ログ
API.interceptors.request.use(
  config => {
    console.log('🚀 API Request Details:', {
      method: config.method?.toUpperCase(),
      url: config.url,
      baseURL: config.baseURL,
      fullURL: `${config.baseURL}${config.url}`,
      params: config.params,
      data: config.data,
      headers: config.headers
    });
    return config;
  },
  error => {
    console.error('❌ Request Configuration Error:', error);
    return Promise.reject(error);
  }
);

// レスポンス interceptor - 詳細ログとエラーハンドリング
API.interceptors.response.use(
  response => {
    console.log('✅ API Response Details:', {
      status: response.status,
      statusText: response.statusText,
      url: response.config.url,
      dataType: typeof response.data,
      dataKeys: response.data ? Object.keys(response.data) : [],
      fullData: response.data
    });
    return response;
  },
  error => {
    console.error('❌ API Response Error Details:', {
      message: error.message,
      code: error.code,
      status: error.response?.status,
      statusText: error.response?.statusText,
      url: error.config?.url,
      responseData: error.response?.data,
      stack: error.stack
    });
    
    // より詳細なエラーメッセージ作成
    let errorMessage = 'APIエラーが発生しました';
    
    if (error.code === 'ECONNABORTED') {
      errorMessage = 'リクエストがタイムアウトしました。サーバーの応答に時間がかかっています。';
    } else if (error.code === 'ERR_NETWORK') {
      errorMessage = 'ネットワーク接続に問題があります。インターネット接続を確認してください。';
    } else if (error.code === 'ECONNREFUSED') {
      errorMessage = 'サーバーに接続できません。サーバーが起動しているか確認してください。';
    } else if (error.response) {
      // サーバーからのエラーレスポンス
      const status = error.response.status;
      const serverMessage = error.response.data?.message || error.response.data?.error;
      
      switch (status) {
        case 400:
          errorMessage = `入力エラー: ${serverMessage || '無効なリクエストです'}`;
          break;
        case 404:
          errorMessage = `データが見つかりません: ${serverMessage || 'リソースが存在しません'}`;
          break;
        case 500:
          errorMessage = `サーバーエラー: ${serverMessage || '内部サーバーエラーが発生しました'}`;
          break;
        default:
          errorMessage = `サーバーエラー (${status}): ${serverMessage || 'エラーが発生しました'}`;
      }
    }
    
    // カスタムエラーオブジェクトを作成
    const customError = new Error(errorMessage);
    customError.originalError = error;
    customError.status = error.response?.status;
    customError.code = error.code;
    
    return Promise.reject(customError);
  }
);

// 🔥 空室検索API - 完全修正版
export const fetchAvailableRooms = async (checkIn, checkOut, checkInTime, maleGuests, femaleGuests, totalGuests, location) => {
  try {
    console.log('🔍 空室検索API呼び出し開始');
    console.log('🔍 検索パラメータ詳細:', {
      checkIn, checkOut, checkInTime, 
      maleGuests, femaleGuests, totalGuests, location
    });

    // パラメータの検証
    if (!checkIn || !checkOut) {
      throw new Error('チェックイン日とチェックアウト日は必須です');
    }
    
    if (!totalGuests || parseInt(totalGuests) < 1) {
      throw new Error('宿泊人数は1名以上を指定してください');
    }
    
    if (!location) {
      throw new Error('宿泊場所を選択してください');
    }

    // API呼び出し
    const response = await API.get('/rooms/available', {
      params: { 
        checkIn, 
        checkOut, 
        checkInTime: checkInTime || '14:00',
        maleGuests: maleGuests || '0',
        femaleGuests: femaleGuests || '0',
        totalGuests,
        location 
      }
    });

    console.log('✅ 空室検索API成功');
    console.log('✅ レスポンスデータ構造:', {
      hasData: !!response.data,
      success: response.data?.success,
      combinationsCount: response.data?.combinations?.length || 0,
      totalCombinations: response.data?.total_combinations,
      availabilityInfo: response.data?.availability_info
    });

    // レスポンスデータの検証
    if (!response.data) {
      throw new Error('サーバーからのレスポンスが空です');
    }
    
    if (!response.data.success) {
      const errorMsg = response.data.error || response.data.message || '空室検索に失敗しました';
      throw new Error(errorMsg);
    }
    
    if (!response.data.combinations || !Array.isArray(response.data.combinations)) {
      console.warn('⚠️ 組み合わせデータが配列ではありません:', response.data.combinations);
      // 空の配列として処理を続行
      response.data.combinations = [];
    }

    console.log('✅ 空室検索完了:', response.data.combinations.length, 'パターン見つかりました');
    
    // 組み合わせの詳細ログ
    response.data.combinations.forEach((combo, index) => {
      console.log(`✅ 組み合わせ ${index + 1}:`, {
        description: combo.description,
        total_price: combo.total_price,
        rooms_count: combo.rooms?.length || 0,
        combo
      });
    });

    return response;

  } catch (error) {
    console.error('❌ 空室検索API エラー:', error.message);
    console.error('❌ エラー詳細:', error);
    
    // エラーを再スロー（Homeコンポーネントでキャッチされる）
    throw error;
  }
};

// 🔥 予約作成API - 強化版
export const createBooking = async (bookingData) => {
  try {
    console.log('📝 予約作成API呼び出し開始');
    console.log('📝 予約データ:', bookingData);

    // 必須フィールドの検証
    const requiredFields = ['rooms', 'searchParams', 'guestInfo'];
    for (const field of requiredFields) {
      if (!bookingData[field]) {
        throw new Error(`予約データの ${field} が不足しています`);
      }
    }

    const response = await API.post('/bookings', bookingData);

    console.log('✅ 予約作成API成功');
    console.log('✅ 予約レスポンス:', response.data);

    return response;

  } catch (error) {
    console.error('❌ 予約作成API エラー:', error.message);
    console.error('❌ エラー詳細:', error);
    throw error;
  }
};

// 🔥 部屋詳細取得API
export const fetchRoomDetails = async (roomId) => {
  try {
    console.log('🏠 部屋詳細取得開始:', roomId);

    if (!roomId) {
      throw new Error('部屋IDが指定されていません');
    }

    const response = await API.get(`/rooms/${roomId}`);

    console.log('✅ 部屋詳細取得成功:', response.data);
    return response;

  } catch (error) {
    console.error('❌ 部屋詳細取得エラー:', error.message);
    throw error;
  }
};

// 🔥 予約履歴取得API
export const fetchUserBookings = async (userId) => {
  try {
    console.log('📋 予約履歴取得開始:', userId);

    if (!userId) {
      throw new Error('ユーザーIDが指定されていません');
    }

    const response = await API.get(`/bookings/user/${userId}`);

    console.log('✅ 予約履歴取得成功:', response.data);
    return response;

  } catch (error) {
    console.error('❌ 予約履歴取得エラー:', error.message);
    throw error;
  }
};

// 🔥 予約詳細取得API
export const fetchBookingDetails = async (bookingId) => {
  try {
    console.log('📄 予約詳細取得開始:', bookingId);

    if (!bookingId) {
      throw new Error('予約IDが指定されていません');
    }

    const response = await API.get(`/bookings/${bookingId}`);

    console.log('✅ 予約詳細取得成功:', response.data);
    return response;

  } catch (error) {
    console.error('❌ 予約詳細取得エラー:', error.message);
    throw error;
  }
};

// 🔥 予約キャンセルAPI
export const cancelBooking = async (bookingId, reason) => {
  try {
    console.log('❌ 予約キャンセル開始:', bookingId, reason);

    if (!bookingId) {
      throw new Error('予約IDが指定されていません');
    }

    const response = await API.patch(`/bookings/${bookingId}/cancel`, {
      reason: reason || '顧客都合によるキャンセル'
    });

    console.log('✅ 予約キャンセル成功:', response.data);
    return response;

  } catch (error) {
    console.error('❌ 予約キャンセルエラー:', error.message);
    throw error;
  }
};

// 🔥 ユーザープロフィール関連API
export const fetchUserProfiles = async (userId) => {
  try {
    console.log('👤 ユーザープロフィール取得開始:', userId);

    const response = await API.get(`/users/${userId}/profiles`);

    console.log('✅ ユーザープロフィール取得成功:', response.data);
    return response;

  } catch (error) {
    console.error('❌ ユーザープロフィール取得エラー:', error.message);
    throw error;
  }
};

export const createUserProfile = async (userId, profileData) => {
  try {
    console.log('👤 ユーザープロフィール作成開始:', userId, profileData);

    const response = await API.post(`/users/${userId}/profiles`, profileData);

    console.log('✅ ユーザープロフィール作成成功:', response.data);
    return response;

  } catch (error) {
    console.error('❌ ユーザープロフィール作成エラー:', error.message);
    throw error;
  }
};

// 🔥 接続テスト用API
export const testConnection = async () => {
  try {
    console.log('🔌 API接続テスト開始');
    
    const response = await API.get('/health');
    
    console.log('✅ API接続テスト成功:', response.data);
    return response;
    
  } catch (error) {
    console.error('❌ API接続テストエラー:', error.message);
    throw error;
  }
};

// デフォルトエクスポート
export default API;