import React, { useState, useEffect } from 'react';
import { useAuth } from '../contexts/AuthContext';
import PrivacyProtectedBookingCard from '../components/PrivacyProtectedBookingCard';
import axios from 'axios';
import './UserDashboard.css';

const UserDashboard = () => {
  const [activeTab, setActiveTab] = useState('bookings');
  const [bookings, setBookings] = useState([]);
  const [profile, setProfile] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [copySuccess, setCopySuccess] = useState(''); // コピー成功状態管理
  
  // 🎯 Phase 3.2 新機能 - ソート・フィルタ
  const [sortBy, setSortBy] = useState('checkin_oldest');
  const [filterStatus, setFilterStatus] = useState('all');
  const [searchQuery, setSearchQuery] = useState('');
  
  // 🔒 Phase 3.2 プライバシー保護フラグ
  const [privacyProtectionEnabled, setPrivacyProtectionEnabled] = useState(true);

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
      
      const userId = getUserId();
      const userData = getUserData();
      
      console.log('🎯 ダッシュボード - ユーザー情報:', {
        userId,
        firebaseUid: currentUser?.uid,
        email: userData?.email || currentUser?.email
      });
      
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
          
          // 🎯 フォールバック用サンプルデータ
          const mockBookings = [
            {
              id: "B_YRDQ2K7UEQWC",
              check_in_date: "2025-06-13",
              check_out_date: "2025-06-16", 
              status: "confirmed",
              total_guests: 3,
              total_amount: 3100,
              rooms: [
                {
                  room_id: "R_2BWH77",
                  room_type_id: "twin",
                  room_name: "ツインルーム",
                  number_of_guests: 2,
                  room_amount: 1700,
                  room_snapshot: {
                    room_type_id: "twin",
                    room_type_name: "ツインルーム",
                    location_id: "delhi",
                    capacity: 2
                  }
                },
                {
                  room_id: "R_62SM8Y",
                  room_type_id: "single", 
                  room_name: "シングルルーム",
                  number_of_guests: 1,
                  room_amount: 1400,
                  room_snapshot: {
                    room_type_id: "single",
                    room_type_name: "シングルルーム",
                    location_id: "delhi",
                    capacity: 1
                  }
                }
              ],
              primary_contact: {
                name_kanji: "テスト 太郎",
                name_romaji: "TEST TARO",
                email: "oo00mixan00oo@icloud.com"
              },
              created_at: "2025-06-11T11:50:58Z"
            }
          ];
          setBookings(mockBookings);
          setError('新IDシステム移行中です。サンプルデータを表示しています。');
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

  // 🎯 Phase 3.2 改善機能: 予約データの高度なソート・フィルタリング
  const getFilteredAndSortedBookings = () => {
    let filtered = [...bookings];

    // ステータスフィルタ
    if (filterStatus !== 'all') {
      filtered = filtered.filter(booking => booking.status === filterStatus);
    }

    // 検索フィルタ
    if (searchQuery.trim()) {
      const query = searchQuery.toLowerCase();
      filtered = filtered.filter(booking => 
        booking.id?.toLowerCase().includes(query) ||
        booking.rooms?.some(room => 
          room.room_name?.toLowerCase().includes(query) ||
          room.room_type_id?.toLowerCase().includes(query)
        )
      );
    }

    // ソート処理
    switch (sortBy) {
      case 'newest':
        filtered.sort((a, b) => new Date(b.created_at) - new Date(a.created_at));
        break;
      case 'oldest':
        filtered.sort((a, b) => new Date(a.created_at) - new Date(b.created_at));
        break;
      case 'checkin_newest':
        filtered.sort((a, b) => new Date(b.check_in_date) - new Date(a.check_in_date));
        break;
      case 'checkin_oldest':
        filtered.sort((a, b) => new Date(a.check_in_date) - new Date(b.check_in_date));
        break;
      case 'amount_high':
        filtered.sort((a, b) => (b.total_amount || 0) - (a.total_amount || 0));
        break;
      case 'amount_low':
        filtered.sort((a, b) => (a.total_amount || 0) - (b.total_amount || 0));
        break;
      case 'status':
        const statusOrder = { confirmed: 1, pending: 2, completed: 3, cancelled: 4 };
        filtered.sort((a, b) => statusOrder[a.status] - statusOrder[b.status]);
        break;
      default:
        filtered.sort((a, b) => new Date(a.check_in_date) - new Date(b.check_in_date));
    }

    return filtered;
  };

  // 🎯 Phase 3.2 改善: ステータスバッジ
  const getStatusBadge = (status) => {
    const statusMap = {
      confirmed: { 
        text: '✅ 確定', 
        class: 'status-confirmed',
        icon: '✅',
        description: '予約が確定済みです'
      },
      pending: { 
        text: '⏳ 承認待ち', 
        class: 'status-pending',
        icon: '⏳',
        description: '管理者の承認をお待ちください'
      },
      cancelled: { 
        text: '❌ キャンセル', 
        class: 'status-cancelled',
        icon: '❌',
        description: 'キャンセルされた予約です'
      },
      completed: { 
        text: '🎉 完了', 
        class: 'status-completed',
        icon: '🎉',
        description: 'チェックアウト完了済みです'
      }
    };
    
    const statusInfo = statusMap[status] || { 
      text: status, 
      class: 'status-default',
      icon: '❓',
      description: '状態不明'
    };
    
    return (
      <span 
        className={`status-badge ${statusInfo.class}`}
        title={statusInfo.description}
      >
        {statusInfo.icon} {statusInfo.text}
      </span>
    );
  };

  // 🎯 Phase 3.2 改善: 日付表示
  const formatDate = (dateString, includeWeekday = false) => {
    if (!dateString) return 'Invalid Date';
    
    if (dateString && typeof dateString === 'object' && dateString._seconds) {
      const date = new Date(dateString._seconds * 1000);
      return formatDateObject(date, includeWeekday);
    }
    
    const date = new Date(dateString);
    if (isNaN(date.getTime())) {
      return 'Invalid Date';
    }
    
    return formatDateObject(date, includeWeekday);
  };

  const formatDateObject = (date, includeWeekday) => {
    const options = {
      year: 'numeric',
      month: 'long',
      day: 'numeric'
    };
    
    if (includeWeekday) {
      options.weekday = 'short';
    }
    
    return date.toLocaleDateString('ja-JP', options);
  };

  // 🔒 プライバシー保護: 部屋タイプ表示（部屋番号除去）
  const getRoomDisplayName = (booking) => {
    if (booking.rooms && Array.isArray(booking.rooms) && booking.rooms.length > 0) {
      const typeMap = {
        'single': 'シングルルーム',
        'twin': 'ツインルーム', 
        'deluxe': 'デラックスルーム',
        'dormitory': 'ドミトリー',
        'deluxe_VIP': 'VIPルーム'
      };
      
      const uniqueTypes = [...new Set(booking.rooms.map(room => {
        const roomType = room.room_snapshot?.room_type_id || room.room_type_id || 'unknown';
        return typeMap[roomType] || roomType;
      }))];
      
      if (uniqueTypes.length === 1) {
        return booking.rooms.length === 1 ? 
          uniqueTypes[0] : 
          `${uniqueTypes[0]} (${booking.rooms.length}室)`;
      } else {
        return `${uniqueTypes.join('・')} (${booking.rooms.length}室)`;
      }
    }
    
    // フォールバック
    if (booking.room_type) {
      const typeMap = {
        'single': 'シングルルーム',
        'twin': 'ツインルーム', 
        'deluxe': 'デラックスルーム',
        'dormitory': 'ドミトリー',
        'deluxe_VIP': 'VIPルーム'
      };
      return typeMap[booking.room_type] || booking.room_type;
    }
    
    return '部屋タイプ不明';
  };

  // 🔒 店舗情報表示（プライバシー保護版）
  const getLocationDisplay = (booking) => {
    const locationMap = {
      'delhi': 'デリー店',
      'varanasi': 'バラナシ店',
      'puri': 'プリー店'
    };
    
    if (booking.rooms && booking.rooms.length > 0) {
      const locationId = booking.rooms[0].room_snapshot?.location_id;
      return locationMap[locationId] || locationId || '店舗不明';
    }
    
    return '店舗不明';
  };

  // 宿泊日数計算
  const calculateStayDetails = (checkIn, checkOut) => {
    const start = new Date(checkIn);
    const end = new Date(checkOut);
    const nights = Math.floor((end - start) / (1000 * 60 * 60 * 24));
    
    return { nights };
  };

  // 予約期間の状態判定
  const getBookingPeriodStatus = (checkIn, checkOut) => {
    const now = new Date();
    const startDate = new Date(checkIn);
    const endDate = new Date(checkOut);
    
    const today = new Date(now.getFullYear(), now.getMonth(), now.getDate());
    const checkinDate = new Date(startDate.getFullYear(), startDate.getMonth(), startDate.getDate());
    const checkoutDate = new Date(endDate.getFullYear(), endDate.getMonth(), endDate.getDate());
    
    if (checkoutDate < today) {
      return { status: 'past', label: '過去の予約', class: 'period-past' };
    } else if (checkinDate <= today && checkoutDate >= today) {
      return { status: 'current', label: '滞在中', class: 'period-current' };
    } else {
      return { status: 'future', label: '今後の予約', class: 'period-future' };
    }
  };

  // 📋 ユーザーIDコピー機能
  const copyUserId = async () => {
    try {
      await navigator.clipboard.writeText(profile?.id);
      setCopySuccess('userId');
      setTimeout(() => setCopySuccess(''), 2000);
    } catch (err) {
      console.error('コピーに失敗しました:', err);
      // フォールバック: 古いブラウザ対応
      const textArea = document.createElement('textarea');
      textArea.value = profile?.id;
      document.body.appendChild(textArea);
      textArea.focus();
      textArea.select();
      try {
        document.execCommand('copy');
        setCopySuccess('userId');
        setTimeout(() => setCopySuccess(''), 2000);
      } catch (fallbackErr) {
        console.error('フォールバックコピーも失敗:', fallbackErr);
      }
      document.body.removeChild(textArea);
    }
  };

  // イベントハンドラー
  const handleRebook = (booking) => {
    const searchParams = new URLSearchParams({
      checkIn: booking.check_in_date,
      checkOut: booking.check_out_date,
      totalGuests: booking.total_guests || booking.number_of_guests || 1,
      location: getLocationDisplay(booking).includes('デリー') ? 'delhi' : 
               getLocationDisplay(booking).includes('バラナシ') ? 'varanasi' : 'puri'
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

  const filteredBookings = getFilteredAndSortedBookings();

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
            <div className="user-id-container">
              <p className="user-email">ID: {profile?.id}</p>
              <button 
                className={`copy-button ${copySuccess === 'userId' ? 'copied' : ''}`}
                onClick={copyUserId}
                title="ユーザーIDをコピー"
              >
                {copySuccess === 'userId' ? '✓' : '⧉'}
              </button>
            </div>
            <span className="user-type-badge">
              {currentUser?.emailVerified ? '✅ 認証済み' : '⚠️ 未認証'}
            </span>
          </div>
        </div>
        <div className="header-actions">
          <button className="refresh-btn" onClick={handleRefresh} title="データを更新">
            🔄 更新
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
          📅 予約履歴 ({bookings.length})
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
        {activeTab === 'bookings' && (
          <div className="bookings-section">
            <div className="section-header">
              <h2>📅 予約履歴</h2>
              <p>Phase 3.2 プライバシー保護対応版</p>
              {bookings.length > 0 && (
                <div className="bookings-stats">
                  <span className="stat-item">
                    📊 総予約数: <strong>{bookings.length}</strong>
                  </span>
                  <span className="stat-item">
                    🔍 表示中: <strong>{filteredBookings.length}</strong>
                  </span>
                </div>
              )}
            </div>

            {/* 検索・フィルタ・ソート */}
            {bookings.length > 0 && (
              <div className="bookings-controls">
                <div className="search-controls">
                  <div className="search-input">
                    <input
                      type="text"
                      placeholder="🔍 予約ID・部屋タイプで検索..."
                      value={searchQuery}
                      onChange={(e) => setSearchQuery(e.target.value)}
                      className="search-field"
                    />
                  </div>
                  
                  <div className="filter-controls">
                    <select
                      value={filterStatus}
                      onChange={(e) => setFilterStatus(e.target.value)}
                      className="filter-select"
                    >
                      <option value="all">📋 全てのステータス</option>
                      <option value="confirmed">✅ 確定済み</option>
                      <option value="pending">⏳ 承認待ち</option>
                      <option value="completed">🎉 完了</option>
                      <option value="cancelled">❌ キャンセル</option>
                    </select>
                    
                    <select
                      value={sortBy}
                      onChange={(e) => setSortBy(e.target.value)}
                      className="sort-select"
                    >
                      <option value="checkin_oldest">🏨 チェックイン: 近い順</option>
                      <option value="checkin_newest">🏨 チェックイン: 遠い順</option>
                      <option value="newest">📅 予約日: 新しい順</option>
                      <option value="oldest">📅 予約日: 古い順</option>
                      <option value="amount_high">💰 金額: 高い順</option>
                      <option value="amount_low">💰 金額: 安い順</option>
                      <option value="status">📊 ステータス順</option>
                    </select>
                  </div>
                </div>
              </div>
            )}
            
            {filteredBookings.length === 0 ? (
              <div className="empty-state">
                <div className="empty-icon">
                  {bookings.length === 0 ? '📋' : '🔍'}
                </div>
                <h3>
                  {bookings.length === 0 ? '予約履歴がありません' : '検索結果がありません'}
                </h3>
                <p>
                  {bookings.length === 0 
                    ? '新しい予約を作成してみましょう。'
                    : '検索条件を変更して再度お試しください。'
                  }
                </p>
                {bookings.length === 0 && (
                  <button 
                    className="primary-btn"
                    onClick={() => window.location.href = '/'}
                  >
                    今すぐ予約する
                  </button>
                )}
              </div>
            ) : (
              <div className="bookings-list">
                {filteredBookings.map((booking) => {
                  // 🔒 プライバシー保護機能ON/OFF
                  if (privacyProtectionEnabled) {
                    return (
                      <PrivacyProtectedBookingCard 
                        key={booking.id} 
                        booking={booking}
                      />
                    );
                  } else {
                    // 従来の詳細表示（開発・管理者向け）
                    const stayDetails = calculateStayDetails(
                      booking.check_in_date, 
                      booking.check_out_date
                    );
                    const periodStatus = getBookingPeriodStatus(
                      booking.check_in_date, 
                      booking.check_out_date
                    );
                    
                    return (
                      <div key={booking.id} className={`booking-card enhanced-card ${periodStatus.class}`}>
                        <div className="booking-header">
                          <div className="booking-dates">
                            <div className="date-range">
                              <h3>
                                📅 {formatDate(booking.check_in_date, true)} 
                                <span className="date-separator">〜</span>
                                {formatDate(booking.check_out_date, true)}
                              </h3>
                              <div className="stay-duration">
                                🌙 <strong>{stayDetails.nights}泊</strong>
                                <span className={`period-badge ${periodStatus.class}`}>
                                  {periodStatus.label}
                                </span>
                              </div>
                            </div>
                          </div>
                          {getStatusBadge(booking.status)}
                        </div>
                        
                        <div className="booking-details enhanced-details">
                          <div className="booking-main-info">
                            <div className="room-info">
                              <h4>🏨 {getRoomDisplayName(booking)}</h4>
                              <p>📍 {getLocationDisplay(booking)}</p>
                              <p>👥 ゲスト数: <strong>{booking.total_guests}名</strong></p>
                            </div>
                            
                            <div className="pricing-info">
                              <div className="total-amount">
                                💰 総額: <strong>₹{booking.total_amount?.toLocaleString()}</strong>
                              </div>
                              <div className="nights-info">
                                🌙 {stayDetails.nights}泊の宿泊
                              </div>
                            </div>
                          </div>
                          
                          <div className="booking-meta-info">
                            <div className="booking-id-info">
                              <p><strong>📋 予約ID:</strong> <code>{booking.id}</code></p>
                              <p><strong>📅 予約日時:</strong> {formatDate(booking.created_at)}</p>
                              {/* 🔧 開発者向け詳細情報 */}
                              {booking.rooms && (
                                <p><strong>🏠 部屋詳細:</strong> {booking.rooms.map(room => `${room.room_id}`).join(', ')}</p>
                              )}
                            </div>
                          </div>
                        </div>
                        
                        <div className="booking-actions enhanced-actions">
                          <button 
                            className="secondary-btn rebook-btn"
                            onClick={() => handleRebook(booking)}
                            title="同じ条件で新しい予約を作成"
                          >
                            🔄 同条件で再予約
                          </button>
                          <button 
                            className="outline-btn details-btn"
                            title="予約の詳細情報を表示"
                          >
                            📋 詳細を見る
                          </button>
                          {booking.status === 'confirmed' && periodStatus.status === 'future' && (
                            <button 
                              className="danger-btn cancel-btn"
                              title="予約をキャンセル"
                            >
                              ❌ キャンセル
                            </button>
                          )}
                        </div>
                      </div>
                    );
                  }
                })}
              </div>
            )}
          </div>
        )}

        {/* プロフィールタブ */}
        {activeTab === 'profile' && (
          <div className="profile-section">
            <div className="section-header">
              <h2>👤 プロフィール設定</h2>
              <p>Phase 3.2 新IDフォーマット対応</p>
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
              <h2>⭐ お気に入り</h2>
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

      {/* フッター */}
      <div className="dashboard-footer">
        <div className="footer-content">
          <p className="footer-text">
            サンタナゲストハウス予約システム | Phase 3.2 プライバシー保護機能搭載
          </p>
          <div className="footer-links">
            <a href="/privacy" className="footer-link">プライバシーポリシー</a>
            <a href="/support" className="footer-link">サポート</a>
            <a href="/contact" className="footer-link">お問い合わせ</a>
          </div>
        </div>
      </div>
    </div>
  );
};

export default UserDashboard;