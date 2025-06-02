import React, { useState, useEffect } from 'react';
import axios from 'axios';
import './UserDashboard.css';

const UserDashboard = () => {
  const [activeTab, setActiveTab] = useState('bookings');
  const [bookings, setBookings] = useState([]);
  const [profile, setProfile] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  // 認証ユーザーのモックデータ（実際はAuthContextから取得）
  const currentUser = {
    uid: "temp_user_1748783111433", // Firestoreの実際のuser_idに変更
    email: "oo00mixan00oo@icloud.com",
    displayName: "テスト太郎"
  };

  const logout = () => {
    // ログアウト処理（とりあえずホームに戻る）
    window.location.href = '/';
  };

  useEffect(() => {
    fetchUserData();
  }, []);

  const fetchUserData = async () => {
    try {
      setLoading(true);
      setError(null);
      
      console.log('ユーザーデータ取得開始:', currentUser.uid);
      
      // プロフィール情報を設定
      setProfile({
        id: currentUser.uid,
        displayName: "テスト太郎",
        email: currentUser.email,
        userType: "guest",
        language: "ja",
        emailPreferences: {
          bookingConfirmation: true,
          marketing: false
        }
      });
      
      // 実際のAPIから予約データを取得
      try {
        console.log('API呼び出し開始: /api/bookings/user/' + currentUser.uid);
        
        const response = await axios.get(`http://localhost:3000/api/bookings/user/${currentUser.uid}`, {
          timeout: 10000, // 10秒タイムアウト
          headers: {
            'Content-Type': 'application/json',
          }
        });
        
        console.log('API応答受信:', response.data);
        
        // レスポンスデータの詳細ログ
        if (response.data && Array.isArray(response.data)) {
          console.log('予約データの詳細:', JSON.stringify(response.data, null, 2));
          response.data.forEach((booking, index) => {
            console.log(`予約${index + 1}:`, {
              id: booking.id,
              check_in_date: booking.check_in_date,
              check_out_date: booking.check_out_date,
              created_at: booking.created_at,
              child_bookings: booking.child_bookings
            });
          });
        }
        
        if (response.data && Array.isArray(response.data)) {
          setBookings(response.data);
          console.log(`${response.data.length}件の予約を取得しました`);
        } else {
          console.log('予約データが空またはフォーマットが無効です');
          setBookings([]);
        }
        
      } catch (apiError) {
        console.error('API呼び出しエラー:', apiError);
        
        // APIエラーの場合はモックデータでフォールバック
        console.log('モックデータを使用します');
        const mockBookings = [
          {
            id: "parent_rsva7f8d9e2",
            check_in_date: "2025-06-10",
            check_out_date: "2025-06-15",
            status: "confirmed",
            total_guests: 2,
            total_amount: 3500,
            child_bookings: [
              {
                room_id: "delhi-201",
                number_of_guests: 2
              }
            ],
            created_at: "2025-06-01T10:30:00.000Z"
          },
          {
            id: "parent_booking_july",
            check_in_date: "2025-07-01",
            check_out_date: "2025-07-03", 
            status: "pending",
            total_guests: 3,
            total_amount: 2100,
            child_bookings: [
              {
                room_id: "delhi-302",
                number_of_guests: 3
              }
            ],
            created_at: "2025-06-20T15:45:00.000Z"
          },
          {
            id: "parent_booking_august",
            check_in_date: "2025-08-15",
            check_out_date: "2025-08-18",
            status: "completed",
            total_guests: 1,
            total_amount: 4200,
            child_bookings: [
              {
                room_id: "varanasi-305",
                number_of_guests: 1
              }
            ],
            created_at: "2025-07-10T09:15:00.000Z"
          }
        ];
        setBookings(mockBookings);
        
        // APIエラーの詳細情報を表示
        if (apiError.code === 'ECONNREFUSED') {
          setError('バックエンドサーバーに接続できません。サーバーが起動しているか確認してください。');
        } else if (apiError.response) {
          setError(`API エラー: ${apiError.response.status} - ${apiError.response.data?.error || 'Unknown error'}`);
        } else {
          setError('ネットワークエラーが発生しました。モックデータを表示しています。');
        }
      }
      
    } catch (err) {
      console.error('データ取得エラー:', err);
      setError('データの読み込みに失敗しました: ' + err.message);
    } finally {
      setLoading(false);
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
    
    // 旧形式のFirestore Timestampオブジェクトの場合（seconds形式）
    if (dateString && typeof dateString === 'object' && dateString.seconds) {
      return new Date(dateString.seconds * 1000).toLocaleDateString('ja-JP', {
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
    const start = new Date(checkIn);
    const end = new Date(checkOut);
    return Math.floor((end - start) / (1000 * 60 * 60 * 24));
  };

  const handleRebook = (booking) => {
    // 同じ条件で再予約画面に遷移
    const searchParams = new URLSearchParams({
      checkIn: booking.check_in_date,
      checkOut: booking.check_out_date,
      totalGuests: booking.total_guests,
      location: booking.child_bookings[0]?.room_id?.split('-')[0] || 'delhi'
    });
    
    window.location.href = `/?${searchParams.toString()}`;
  };

  const handleRefresh = () => {
    fetchUserData();
  };

  if (loading) {
    return (
      <div className="user-dashboard">
        <div className="loading">
          <div className="loading-spinner"></div>
          <p>予約データを読み込み中...</p>
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
            {profile?.displayName?.charAt(0) || 'T'}
          </div>
          <div className="user-details">
            <h1>{profile?.displayName}</h1>
            <p className="user-email">{profile?.email}</p>
            <span className="user-type-badge">Guest</span>
          </div>
        </div>
        <div className="header-actions">
          <button className="refresh-btn" onClick={handleRefresh} title="データを更新">
            🔄
          </button>
          <button className="logout-btn" onClick={logout}>
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
              <p>過去と今後の予約を確認できます</p>
              {bookings.length > 0 && (
                <div className="data-source">
                  {error ? '📝 モックデータ表示中' : '🔥 Firestoreから取得'}
                </div>
              )}
            </div>
            
            {bookings.length === 0 ? (
              <div className="empty-state">
                <div className="empty-icon">📋</div>
                <h3>予約履歴がありません</h3>
                <p>初めてのご利用ですね！サンタナゲストハウスへようこそ。</p>
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
                        <p><strong>ゲスト数:</strong> {booking.total_guests}名</p>
                        <p><strong>予約ID:</strong> {booking.id}</p>
                        <p><strong>合計金額:</strong> ₹{booking.total_amount?.toLocaleString()}</p>
                        {booking.created_at && (
                          <p><strong>予約日時:</strong> {
                            booking.created_at && typeof booking.created_at === 'object' && booking.created_at._seconds 
                              ? new Date(booking.created_at._seconds * 1000).toLocaleDateString('ja-JP')
                              : booking.created_at && typeof booking.created_at === 'object' && booking.created_at.seconds 
                              ? new Date(booking.created_at.seconds * 1000).toLocaleDateString('ja-JP')
                              : booking.created_at ? new Date(booking.created_at).toLocaleDateString('ja-JP') : 'Invalid Date'
                          }</p>
                        )}
                      </div>
                      
                      {booking.child_bookings && booking.child_bookings.length > 0 && (
                        <div className="room-details">
                          <h4>宿泊部屋:</h4>
                          {Array.isArray(booking.child_bookings) && typeof booking.child_bookings[0] === 'string' ? (
                            // child_bookingsがID配列の場合
                            booking.child_bookings.map((childBookingId, index) => (
                              <div key={index} className="room-item">
                                <span className="room-name">
                                  予約ID: {childBookingId}
                                </span>
                              </div>
                            ))
                          ) : (
                            // child_bookingsがオブジェクト配列の場合
                            booking.child_bookings.map((childBooking, index) => (
                              <div key={index} className="room-item">
                                <span className="room-name">
                                  {childBooking.room_id || '部屋情報なし'} 
                                  ({childBooking.number_of_guests || '人数不明'}名)
                                </span>
                              </div>
                            ))
                          )}
                        </div>
                      )}
                    </div>
                    
                    <div className="booking-actions">
                      <button 
                        className="secondary-btn"
                        onClick={() => handleRebook(booking)}
                      >
                        同条件で再予約
                      </button>
                      {booking.status === 'confirmed' && (
                        <button className="outline-btn">
                          詳細を見る
                        </button>
                      )}
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
              <p>アカウント情報と設定を管理できます</p>
            </div>
            
            <div className="profile-form">
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
                <select className="form-control" defaultValue="ja">
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
              
              <button className="primary-btn">設定を保存</button>
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