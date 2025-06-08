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
  
  // 🎯 Phase 3.2 新機能 - ソート・フィルタ
  const [sortBy, setSortBy] = useState('checkin_oldest'); // デフォルトをチェックイン近い順に
  const [filterStatus, setFilterStatus] = useState('all'); // 'all', 'confirmed', 'pending', 'cancelled', 'completed'
  const [searchQuery, setSearchQuery] = useState('');

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
            },
            {
              id: "B_VYP6Z5USK3FZ",
              check_in_date: "2025-06-30",
              check_out_date: "2025-07-03", 
              status: "confirmed",
              number_of_guests: 2,
              room_amount: 5100,
              total_amount: 15300,
              room_name: "お部屋",
              room_type: "deluxe",
              primary_contact: {
                name_kanji: "テスト太郎",
                email: "test@example.com"
              },
              created_at: "2025-06-05T22:35:50.000Z"
            },
            {
              id: "B_ABC123XYZ789",
              check_in_date: "2025-05-15",
              check_out_date: "2025-05-17", 
              status: "completed",
              number_of_guests: 1,
              room_amount: 1400,
              total_amount: 2800,
              room_name: "シングルルーム",
              room_type: "single",
              primary_contact: {
                name_kanji: "テスト花子",
                email: "hanako@test.com"
              },
              created_at: "2025-05-10T15:20:30.000Z"
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

  // 🎯 Phase 3.2 改善機能: 予約データの高度なソート・フィルタリング
  const getFilteredAndSortedBookings = () => {
    let filtered = [...bookings];

    // ステータスフィルタ
    if (filterStatus !== 'all') {
      filtered = filtered.filter(booking => booking.status === filterStatus);
    }

    // 検索フィルタ（部屋名・予約IDで検索）
    if (searchQuery.trim()) {
      const query = searchQuery.toLowerCase();
      filtered = filtered.filter(booking => 
        booking.room_name?.toLowerCase().includes(query) ||
        booking.id?.toLowerCase().includes(query) ||
        booking.room_type?.toLowerCase().includes(query)
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
        // デフォルトはチェックイン近い順
        filtered.sort((a, b) => new Date(a.check_in_date) - new Date(b.check_in_date));
    }

    return filtered;
  };

  // 🎯 Phase 3.2 改善: より詳細なステータスバッジ
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

  // 🎯 Phase 3.2 改善: より美しい日付表示
  const formatDate = (dateString, includeWeekday = false) => {
    if (!dateString) return 'Invalid Date';
    
    // Firestore Timestampオブジェクトの場合（_seconds形式）
    if (dateString && typeof dateString === 'object' && dateString._seconds) {
      const date = new Date(dateString._seconds * 1000);
      return formatDateObject(date, includeWeekday);
    }
    
    // 通常の日付文字列の場合
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

  // 🎯 Phase 3.2 改善: 部屋タイプ表示（実際のデータ構造対応）
  const getRoomDisplayName = (booking) => {
    // rooms配列から部屋タイプを取得
    if (booking.rooms && booking.rooms.length > 0) {
      const roomTypes = booking.rooms.map(room => {
        if (room.room_id) {
          // 実際のroom_idに基づくマッピング
          const roomId = room.room_id;
          
          // 各部屋のroom_type_idから部屋タイプを特定
          // 実際のrooms.jsonデータに基づく
          const roomTypeMap = {
            // Delhi
            'delhi-101': 'single',
            'delhi-201': 'dormitory', 
            'delhi-202': 'twin',
            'delhi-203': 'single',
            'delhi-301': 'twin',
            'delhi-302': 'dormitory',
            'delhi-303': 'twin', 
            'delhi-401': 'deluxe',
            
            // Varanasi
            'varanasi-101': 'twin',
            'varanasi-102': 'twin',
            'varanasi-201': 'single',
            'varanasi-202': 'dormitory',
            'varanasi-203': 'dormitory',
            'varanasi-301': 'deluxe',
            'varanasi-304': 'twin',
            'varanasi-305': 'deluxe',
            
            // Puri
            'puri-101': 'single',
            'puri-203': 'deluxe',
            'puri-204': 'dormitory',
            'puri-205': 'dormitory',
            'puri-206': 'deluxe',
            'puri-208': 'deluxe_VIP',
            'puri-209': 'single',
            'puri-302': 'deluxe',
            'puri-303': 'deluxe',
            'puri-304': 'deluxe',
            'puri-305': 'deluxe',
            'puri-306': 'single',
            'puri-307': 'single'
          };
          
          const roomTypeId = roomTypeMap[roomId];
          
          if (roomTypeId) {
            const typeMap = {
              'single': 'シングルルーム',
              'twin': 'ツインルーム', 
              'deluxe': 'デラックスルーム',
              'dormitory': 'ドミトリー',
              'deluxe_VIP': 'VIPルーム'
            };
            return typeMap[roomTypeId] || roomTypeId;
          }
        }
        return '不明';
      });
      
      // 重複を除去して表示
      const uniqueTypes = [...new Set(roomTypes)];
      
      if (uniqueTypes.length === 1) {
        return booking.rooms.length === 1 ? uniqueTypes[0] : `${uniqueTypes[0]} (${booking.rooms.length}室)`;
      } else if (uniqueTypes.length > 1) {
        return `${uniqueTypes.join('・')} (${booking.rooms.length}室)`;
      }
    }
    
    // フォールバック: 従来のroom_typeフィールドを使用
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

  // 🎯 Phase 3.2 改善: 宿泊日数の計算（料金は保存データをそのまま使用）
  const calculateStayDetails = (checkIn, checkOut) => {
    const start = new Date(checkIn);
    const end = new Date(checkOut);
    const nights = Math.floor((end - start) / (1000 * 60 * 60 * 24));
    
    return {
      nights
    };
  };

  // 🎯 Phase 3.2 改善: 予約期間の状態判定
  const getBookingPeriodStatus = (checkIn, checkOut) => {
    const now = new Date();
    const startDate = new Date(checkIn);
    const endDate = new Date(checkOut);
    
    // 今日の日付（時間は00:00:00に設定）
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

        const handleRebook = (booking) => {
    const searchParams = new URLSearchParams({
      checkIn: booking.check_in_date,
      checkOut: booking.check_out_date,
      totalGuests: booking.total_guests || booking.number_of_guests || 1,
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

  // 🎯 Phase 3.2: フィルタ・ソート済みの予約データを取得
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
        {/* 🎯 Phase 3.2 改善: 予約履歴タブ */}
        {activeTab === 'bookings' && (
          <div className="bookings-section">
            <div className="section-header">
              <h2>📅 予約履歴</h2>
              <p>新IDフォーマット対応 - Phase 3.2改善版</p>
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

            {/* 🎯 Phase 3.2 新機能: 検索・フィルタ・ソート */}
            {bookings.length > 0 && (
              <div className="bookings-controls">
                <div className="search-controls">
                  <div className="search-input">
                    <input
                      type="text"
                      placeholder="🔍 予約ID・部屋名で検索..."
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
                    ? '新しい予約を作成してテストしてみましょう。'
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
                {bookings.length > 0 && (
                  <button 
                    className="secondary-btn"
                    onClick={() => {
                      setSearchQuery('');
                      setFilterStatus('all');
                      setSortBy('newest');
                    }}
                  >
                    フィルタをリセット
                  </button>
                )}
              </div>
            ) : (
              <div className="bookings-list">
                {filteredBookings.map((booking) => {
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
                      {/* 🎯 Phase 3.2 改善: 美しいカードヘッダー */}
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
                              <span className="period-badge {periodStatus.class}">
                                {periodStatus.label}
                              </span>
                            </div>
                          </div>
                        </div>
                        {getStatusBadge(booking.status)}
                      </div>
                      
                      {/* 🎯 Phase 3.2 改善: 詳細な情報表示 */}
                      <div className="booking-details enhanced-details">
                        <div className="booking-main-info">
                          <div className="room-info">
                            <h4>🏨 {getRoomDisplayName(booking)}</h4>
                            <p>👥 ゲスト数: <strong>{booking.total_guests || booking.number_of_guests || 0}名</strong></p>
                          </div>
                          
                          {/* 🎯 Phase 3.2 改善: 保存データをそのまま表示する料金表示 */}
                          <div className="pricing-info">
                            <div className="total-amount">
                              💰 総額: <strong>₹{booking.total_amount?.toLocaleString()}</strong>
                            </div>
                            <div className="nights-info">
                              🌙 {stayDetails.nights}泊の宿泊
                            </div>
                            {booking.room_amount && booking.room_amount !== booking.total_amount && (
                              <div className="room-amount-info">
                                🏠 部屋料金: ₹{booking.room_amount?.toLocaleString()}
                              </div>
                            )}
                          </div>
                        </div>
                        
                        <div className="booking-meta-info">
                          <div className="booking-id-info">
                            <p><strong>📋 予約ID:</strong> <code>{booking.id}</code></p>
                            <p><strong>📅 予約日時:</strong> {formatDate(booking.created_at)}</p>
                          </div>
                        </div>
                      </div>
                      
                      {/* 🎯 Phase 3.2 改善: アクションボタン */}
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
                })}
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