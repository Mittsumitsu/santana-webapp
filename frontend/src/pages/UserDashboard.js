import React, { useState, useEffect } from 'react';
import { useAuth } from '../contexts/AuthContext';
import axios from 'axios';
import './UserDashboard.css';

const UserDashboard = () => {
  const [activeTab, setActiveTab] = useState('bookings');
  const [bookings, setBookings] = useState([]);
  const [profile, setProfile] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  // 🎯 新IDフォーマット対応認証情報取得
  const { currentUser, logout, getUserId, getUserData } = useAuth();

  useEffect(() => {
    if (currentUser) {
      fetchUserData();
    }
  }, [currentUser]);

  const fetchUserData = async () => {
    try {
      setLoading(true);
      setError(null);
      
      // 🎯 新IDフォーマットユーザーIDを取得
      const userId = getUserId();
      const userData = getUserData();
      
      console.log('🎯 ダッシュボード - ユーザー情報:', {
        userId,
        firebaseUid: currentUser?.uid,
        email: userData?.email || currentUser?.email
      });
      
      // プロフィール情報を設定
      setProfile({
        id: userId,
        displayName: userData?.displayName || currentUser?.displayName || 'ユーザー',
        email: userData?.email || currentUser?.email || '',
        userType: userData?.userType || 'guest',
        language: userData?.language || 'ja',
        emailPreferences: userData?.emailPreferences || {
          bookingConfirmation: true,
          marketing: false
        }
      });
      
      // 🔥 予約データ取得の改善
      if (userId) {
        await fetchUserBookings(userId);
      } else {
        console.log('⚠️ ユーザーIDが取得できませんでした');
        setError('ユーザーIDを取得できませんでした。再ログインしてください。');
      }
      
    } catch (err) {
      console.error('❌ データ取得エラー:', err);
      setError('データの読み込みに失敗しました: ' + err.message);
    } finally {
      setLoading(false);
    }
  };

  // 🔥 予約データ取得の専用関数
  const fetchUserBookings = async (userId) => {
    try {
      console.log('📋 予約履歴取得開始:', userId);
      
      // 🎯 新IDシステム対応: 統合予約APIを使用
      const response = await axios.get(`http://localhost:3000/api/bookings/user/${userId}`, {
        timeout: 10000,
        headers: {
          'Content-Type': 'application/json',
        }
      });
      
      console.log('✅ 予約データ取得成功:', response.data);
      
      if (response.data && Array.isArray(response.data)) {
        // 🔥 予約データの整形と検証（料金計算修正版）
        const validBookings = response.data.filter(booking => booking && booking.id);
        
        // 各予約データの構造を確認・修正
        const formattedBookings = validBookings.map(booking => {
          // 🔥 料金の正確な計算
          let correctedAmount = booking.total_amount || 0;
          
          // 宿泊日数を計算
          const checkIn = new Date(booking.check_in_date);
          const checkOut = new Date(booking.check_out_date);
          const nights = Math.floor((checkOut - checkIn) / (1000 * 60 * 60 * 24));
          
          // 🔥 料金が明らかに間違っている場合の修正
          if (booking.rooms && booking.rooms.length > 0) {
            // 部屋情報から正しい料金を再計算
            const totalRoomAmount = booking.rooms.reduce((sum, room) => {
              return sum + (room.room_amount || 1700); // デフォルト1泊1700ルピー
            }, 0);
            
            // 泊数を考慮した正しい金額
            const calculatedAmount = totalRoomAmount * nights;
            
            // 🔥 保存されている金額と計算結果が大きく異なる場合は修正
            if (Math.abs(correctedAmount - calculatedAmount) > 500) {
              console.log(`💰 料金修正: ${booking.id} - 保存値:₹${correctedAmount} → 計算値:₹${calculatedAmount}`);
              correctedAmount = calculatedAmount;
            }
          }
          
          return {
            id: booking.id || `booking_${Date.now()}`,
            check_in_date: booking.check_in_date,
            check_out_date: booking.check_out_date,
            status: booking.status || 'confirmed',
            total_guests: booking.total_guests || 1,
            total_amount: correctedAmount, // 🔥 修正された料金
            primary_contact: booking.primary_contact || {
              name_kanji: 'ゲスト',
              email: currentUser?.email || ''
            },
            // 🔥 統合予約の部屋情報を処理
            rooms: booking.rooms || [],
            room_name: booking.rooms && booking.rooms.length > 0 ? 
              booking.rooms.map(room => room.room_name || 'お部屋').join(', ') : 
              'デラックスルーム',
            room_type: booking.rooms && booking.rooms.length > 0 ? 
              booking.rooms[0].room_type || 'deluxe' : 
              'deluxe',
            created_at: booking.created_at || booking.updated_at || new Date().toISOString(),
            is_unified_booking: true,
            // 🔥 料金計算の詳細情報
            nights: nights,
            price_corrected: Math.abs(booking.total_amount - correctedAmount) > 500
          };
        });
        
        setBookings(formattedBookings);
        console.log(`📊 ${formattedBookings.length}件の予約を表示準備完了`);
        
        // エラーメッセージをクリア
        if (error && error.includes('モックデータ')) {
          setError(null);
        }
        
      } else {
        console.log('📝 予約データが空です');
        setBookings([]);
      }
      
    } catch (apiError) {
      console.error('❌ 予約API呼び出しエラー:', apiError);
      
      // 🔥 エラーの詳細分析
      if (apiError.response) {
        if (apiError.response.status === 404) {
          // ユーザーの予約が存在しない（正常）
          console.log('📝 このユーザーの予約はまだありません');
          setBookings([]);
          setError(null);
        } else if (apiError.response.status === 400) {
          // 新IDシステムのユーザーIDが必要
          setError('新IDシステムのユーザーIDが必要です。再ログインしてください。');
        } else {
          setError(`サーバーエラー: ${apiError.response.status}`);
        }
      } else if (apiError.code === 'ECONNABORTED') {
        setError('サーバーへの接続がタイムアウトしました。');
      } else {
        setError('予約データの取得に失敗しました。');
      }
      
      // 🔥 フォールバック: 最近作成された予約を表示
      try {
        await fetchRecentBookings();
      } catch (fallbackError) {
        console.error('❌ フォールバック予約取得も失敗:', fallbackError);
        setBookings([]);
      }
    }
  };

  // 🔥 最近の予約を取得するフォールバック関数
  const fetchRecentBookings = async () => {
    try {
      console.log('🔄 フォールバック: 最近の予約を取得中...');
      
      // 全予約を取得して、現在のユーザーの予約を探す
      const allBookingsResponse = await axios.get('http://localhost:3000/api/bookings', {
        timeout: 5000
      });
      
      if (allBookingsResponse.data && Array.isArray(allBookingsResponse.data)) {
        const userId = getUserId();
        const userEmail = currentUser?.email;
        
        // ユーザーIDまたはメールアドレスで予約を絞り込み
        const userBookings = allBookingsResponse.data.filter(booking => {
          return booking.user_id === userId || 
                 booking.primary_contact?.email === userEmail;
        });
        
        if (userBookings.length > 0) {
          console.log(`🔍 フォールバックで ${userBookings.length} 件の予約を発見`);
          
          const formattedBookings = userBookings.map(booking => ({
            id: booking.id,
            check_in_date: booking.check_in_date,
            check_out_date: booking.check_out_date,
            status: booking.status || 'confirmed',
            total_guests: booking.total_guests || 1,
            total_amount: booking.total_amount || 0,
            primary_contact: booking.primary_contact,
            rooms: booking.rooms || [],
            room_name: booking.rooms && booking.rooms.length > 0 ? 
              booking.rooms.map(room => room.room_name || 'お部屋').join(', ') : 
              'デラックスルーム',
            room_type: 'deluxe',
            created_at: booking.created_at || new Date().toISOString(),
            is_fallback_data: true
          }));
          
          setBookings(formattedBookings);
          setError(null);
        }
      }
    } catch (error) {
      console.error('❌ フォールバック取得失敗:', error);
    }
  };

  const getStatusBadge = (status) => {
    const statusMap = {
      confirmed: { text: '確定', class: 'status-confirmed' },
      pending: { text: '承認待ち', class: 'status-pending' },
      cancelled: { text: 'キャンセル', class: 'status-cancelled' },
      completed: { text: '完了', class: 'status-completed' }
    };
    
    const statusInfo = statusMap[status] || { text: status, class: 'status-default' };
    return <span className={`status-badge ${statusInfo.class}`}>{statusInfo.text}</span>;
  };

  const formatDate = (dateString) => {
    if (!dateString) return 'Invalid Date';
    
    // Firestore Timestampオブジェクトの場合（_seconds形式）
    if (dateString && typeof dateString === 'object' && dateString._seconds) {
      return new Date(dateString._seconds * 1000).toLocaleDateString('ja-JP', {
        year: 'numeric',
        month: 'long',
        day: 'numeric'
      });
    }
    
    // 通常の日付文字列の場合
    const date = new Date(dateString);
    if (isNaN(date.getTime())) {
      return 'Invalid Date';
    }
    
    return date.toLocaleDateString('ja-JP', {
      year: 'numeric',
      month: 'long',
      day: 'numeric'
    });
  };

  const calculateNights = (checkIn, checkOut) => {
    if (!checkIn || !checkOut) return 1;
    const start = new Date(checkIn);
    const end = new Date(checkOut);
    const nights = Math.floor((end - start) / (1000 * 60 * 60 * 24));
    return nights > 0 ? nights : 1;
  };

  const handleRebook = (booking) => {
    const searchParams = new URLSearchParams({
      checkIn: booking.check_in_date,
      checkOut: booking.check_out_date,
      totalGuests: booking.total_guests,
      // 🎯 部屋IDから店舗を推測
      location: booking.rooms && booking.rooms.length > 0 && booking.rooms[0].room_id ? 
        booking.rooms[0].room_id.split('-')[0] || 'delhi' : 
        'delhi'
    });
    
    window.location.href = `/?${searchParams.toString()}`;
  };

  const handleRefresh = () => {
    fetchUserData();
  };

  const handleLogout = async () => {
    try {
      await logout();
      window.location.href = '/';
    } catch (error) {
      console.error('❌ ログアウトエラー:', error);
    }
  };

  if (loading) {
    return (
      <div className="user-dashboard">
        <div className="loading">
          <div className="loading-spinner"></div>
          <p>ユーザーデータを読み込み中...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="user-dashboard">
      {/* ヘッダー */}
      <div className="dashboard-header">
        <div className="user-info">
          <div className="user-avatar">
            {profile?.displayName?.charAt(0) || 'U'}
          </div>
          <div className="user-details">
            <h1>{profile?.displayName}</h1>
            <p className="user-email">{profile?.email}</p>
            <span className="user-type-badge">Guest</span>
            {/* 🎯 新IDフォーマット表示 */}
            <div className="user-id">ID: {profile?.id}</div>
          </div>
        </div>
        <div className="header-actions">
          <button className="refresh-btn" onClick={handleRefresh} title="データを更新">
            🔄
          </button>
          <button className="logout-btn" onClick={handleLogout}>
            ログアウト
          </button>
        </div>
      </div>

      {/* エラー表示 */}
      {error && (
        <div className="error-banner">
          <div className="error-content">
            <span className="error-icon">⚠️</span>
            <span className="error-message">{error}</span>
            <button className="error-close" onClick={() => setError(null)}>×</button>
          </div>
        </div>
      )}

      {/* タブナビゲーション */}
      <div className="dashboard-tabs">
        <button 
          className={`tab-btn ${activeTab === 'bookings' ? 'active' : ''}`}
          onClick={() => setActiveTab('bookings')}
        >
          📅 予約履歴
        </button>
        <button 
          className={`tab-btn ${activeTab === 'profile' ? 'active' : ''}`}
          onClick={() => setActiveTab('profile')}
        >
          👤 プロフィール
        </button>
        <button 
          className={`tab-btn ${activeTab === 'favorites' ? 'active' : ''}`}
          onClick={() => setActiveTab('favorites')}
        >
          ⭐ お気に入り
        </button>
      </div>

      {/* タブコンテンツ */}
      <div className="dashboard-content">
        {/* 予約履歴タブ */}
        {activeTab === 'bookings' && (
          <div className="bookings-section">
            <div className="section-header">
              <h2>予約履歴</h2>
              <p>🔥 新IDシステム対応 - 統合予約データ表示</p>
              {bookings.length > 0 && (
                <div className="data-source">
                  {bookings.some(b => b.is_fallback_data) ? '🔄 フォールバックデータ' : 
                   bookings.some(b => b.is_unified_booking) ? '🔥 統合予約システム' : 
                   '📊 Firestoreから取得'}
                </div>
              )}
            </div>
            
            {bookings.length === 0 ? (
              <div className="empty-state">
                <div className="empty-icon">📋</div>
                <h3>予約履歴がありません</h3>
                <p>新しい予約を作成してみましょう。新IDシステムで管理されます。</p>
                <button 
                  className="primary-btn"
                  onClick={() => window.location.href = '/'}
                >
                  今すぐ予約する
                </button>
              </div>
            ) : (
              <div className="bookings-list">
                {bookings.map((booking) => (
                  <div key={booking.id} className="booking-card">
                    <div className="booking-header">
                      <div className="booking-dates">
                        <h3>
                          {formatDate(booking.check_in_date)} - {formatDate(booking.check_out_date)}
                        </h3>
                        <p>{calculateNights(booking.check_in_date, booking.check_out_date)}泊</p>
                      </div>
                      {getStatusBadge(booking.status)}
                    </div>
                    
                    <div className="booking-details">
                      <div className="booking-info">
                        <p><strong>予約ID:</strong> {booking.id}</p>
                        <p><strong>ゲスト数:</strong> {booking.total_guests}名</p>
                        <p><strong>部屋:</strong> {booking.room_name}</p>
                        <p><strong>金額:</strong> 
                          ₹{booking.total_amount?.toLocaleString()}
                          {booking.price_corrected && (
                            <span style={{ color: '#4CAF50', fontSize: '12px', marginLeft: '8px' }}>
                              (料金修正済み)
                            </span>
                          )}
                        </p>
                        <p><strong>予約日時:</strong> {formatDate(booking.created_at)}</p>
                        
                        {/* 🔥 料金詳細表示 */}
                        {booking.nights && (
                          <p><strong>宿泊詳細:</strong> {booking.nights}泊 
                            {booking.rooms && booking.rooms.length > 0 && 
                             ` (1泊 ₹${Math.round(booking.total_amount / booking.nights).toLocaleString()})`
                            }
                          </p>
                        )}
                        
                        {/* 🔥 統合予約の詳細情報 */}
                        {booking.rooms && booking.rooms.length > 0 && (
                          <div className="rooms-details">
                            <p><strong>予約部屋:</strong></p>
                            <ul>
                              {booking.rooms.map((room, index) => (
                                <li key={index}>
                                  {room.room_name || `部屋${index + 1}`} - {room.number_of_guests}名
                                </li>
                              ))}
                            </ul>
                          </div>
                        )}
                        
                        {/* デバッグ情報（開発環境のみ） */}
                        {process.env.NODE_ENV === 'development' && (
                          <details style={{ fontSize: '12px', marginTop: '10px' }}>
                            <summary>🔧 技術情報</summary>
                            <pre style={{ background: '#f5f5f5', padding: '5px', fontSize: '10px' }}>
                              {JSON.stringify({
                                id: booking.id,
                                is_unified: booking.is_unified_booking,
                                is_fallback: booking.is_fallback_data,
                                rooms_count: booking.rooms?.length || 0
                              }, null, 2)}
                            </pre>
                          </details>
                        )}
                      </div>
                    </div>
                    
                    <div className="booking-actions">
                      <button 
                        className="secondary-btn"
                        onClick={() => handleRebook(booking)}
                      >
                        同条件で再予約
                      </button>
                      <button className="outline-btn">
                        詳細を見る
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        )}

        {/* プロフィールタブ */}
        {activeTab === 'profile' && (
          <div className="profile-section">
            <div className="section-header">
              <h2>プロフィール設定</h2>
              <p>新IDフォーマット対応プロフィール</p>
            </div>
            
            <div className="profile-form">
              <div className="form-group">
                <label>ユーザーID</label>
                <input 
                  type="text" 
                  value={profile?.id || ''} 
                  className="form-control"
                  readOnly
                  style={{ fontFamily: 'monospace', background: '#f8f9fa' }}
                />
                <small>新IDフォーマット（実用性重視）</small>
              </div>
              
              <div className="form-group">
                <label>表示名</label>
                <input 
                  type="text" 
                  value={profile?.displayName || ''} 
                  className="form-control"
                  readOnly
                />
              </div>
              
              <div className="form-group">
                <label>メールアドレス</label>
                <input 
                  type="email" 
                  value={profile?.email || ''} 
                  className="form-control"
                  readOnly
                />
              </div>
              
              <div className="form-group">
                <label>言語設定</label>
                <select className="form-control" value={profile?.language || 'ja'} disabled>
                  <option value="ja">日本語</option>
                  <option value="en">English</option>
                </select>
              </div>
              
              <div className="form-group">
                <label>通知設定</label>
                <div className="checkbox-group">
                  <label className="checkbox-label">
                    <input 
                      type="checkbox" 
                      checked={profile?.emailPreferences?.bookingConfirmation}
                      readOnly
                    />
                    予約確認メールを受け取る
                  </label>
                  <label className="checkbox-label">
                    <input 
                      type="checkbox" 
                      checked={profile?.emailPreferences?.marketing}
                      readOnly
                    />
                    キャンペーン情報を受け取る
                  </label>
                </div>
              </div>
              
              <button className="primary-btn" disabled>
                設定を保存（開発中）
              </button>
            </div>
          </div>
        )}

        {/* お気に入りタブ */}
        {activeTab === 'favorites' && (
          <div className="favorites-section">
            <div className="section-header">
              <h2>お気に入り</h2>
              <p>よく利用する部屋や設定を保存できます</p>
            </div>
            
            <div className="empty-state">
              <div className="empty-icon">⭐</div>
              <h3>お気に入りはまだありません</h3>
              <p>気に入った部屋やプランをお気に入りに追加して、素早く予約できます。</p>
              <button 
                className="primary-btn"
                onClick={() => window.location.href = '/'}
              >
                部屋を探す
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};

export default UserDashboard;