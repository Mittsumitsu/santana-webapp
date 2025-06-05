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
      
      // 🎯 新IDフォーマットで予約データを取得
      if (userId) {
        try {
          console.log('📋 予約履歴取得開始:', userId);
          
          const response = await axios.get(`http://localhost:3000/api/bookings/user/${userId}`, {
            timeout: 10000,
            headers: {
              'Content-Type': 'application/json',
            }
          });
          
          console.log('✅ 予約データ取得成功:', response.data);
          
          if (response.data && Array.isArray(response.data)) {
            setBookings(response.data);
            console.log(`📊 ${response.data.length}件の予約を取得`);
          } else {
            console.log('📝 予約データが空です');
            setBookings([]);
          }
          
        } catch (apiError) {
          console.error('❌ 予約API呼び出しエラー:', apiError);
          
          // 🎯 現行データでフォールバック（開発中表示用）
          console.log('🔧 開発中 - サンプルデータを表示');
          const mockBookings = [
            {
              id: "B_5PMGVWYHSWPL",
              check_in_date: "2025-07-06",
              check_out_date: "2025-07-08", 
              status: "confirmed",
              number_of_guests: 2,
              room_amount: 2300,
              total_amount: 2300,
              room_name: "デラックスルーム",
              room_type: "deluxe",
              primary_contact: {
                name_kanji: "テスト 次郎",
                email: "jiro@test.com"
              },
              created_at: "2025-06-04T22:35:50.000Z"
            }
          ];
          setBookings(mockBookings);
          setError('新IDシステム移行中です。モックデータを表示しています。');
        }
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
    const start = new Date(checkIn);
    const end = new Date(checkOut);
    return Math.floor((end - start) / (1000 * 60 * 60 * 24));
  };

  const handleRebook = (booking) => {
    const searchParams = new URLSearchParams({
      checkIn: booking.check_in_date,
      checkOut: booking.check_out_date,
      totalGuests: booking.number_of_guests,
      // 🎯 部屋IDから店舗を推測
      location: booking.room_id?.split('-')[0] || 'delhi'
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
              <p>新IDフォーマット対応 - 現行データを表示</p>
              {bookings.length > 0 && (
                <div className="data-source">
                  {error ? '🔧 開発中データ' : '🔥 Firestoreから取得'}
                </div>
              )}
            </div>
            
            {bookings.length === 0 ? (
              <div className="empty-state">
                <div className="empty-icon">📋</div>
                <h3>予約履歴がありません</h3>
                <p>新しい予約を作成してテストしてみましょう。</p>
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
                        <p><strong>ゲスト数:</strong> {booking.number_of_guests}名</p>
                        <p><strong>部屋:</strong> {booking.room_name || booking.room_type}</p>
                        <p><strong>金額:</strong> ₹{booking.total_amount?.toLocaleString()}</p>
                        <p><strong>予約日時:</strong> {formatDate(booking.created_at)}</p>
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