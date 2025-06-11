// frontend/src/pages/AdminDashboard.js
// 🛠️ 管理者専用ダッシュボード（完全な部屋情報表示）

import React, { useState, useEffect } from 'react';
import { useAuth } from '../contexts/AuthContext';
import axios from 'axios';
import './AdminDashboard.css';

const AdminDashboard = () => {
  const { user } = useAuth();
  const [activeTab, setActiveTab] = useState('bookings');
  const [bookings, setBookings] = useState([]);
  const [allocations, setAllocations] = useState([]);
  const [rooms, setRooms] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  
  // フィルタ・検索状態
  const [searchQuery, setSearchQuery] = useState('');
  const [filterStatus, setFilterStatus] = useState('all');
  const [filterLocation, setFilterLocation] = useState('all');
  const [dateFilter, setDateFilter] = useState('all');

  useEffect(() => {
    fetchAdminData();
  }, []);

  const fetchAdminData = async () => {
    setLoading(true);
    setError('');
    
    try {
      // 管理者専用データ取得
      const [bookingsRes, allocationsRes, roomsRes] = await Promise.all([
        axios.get('/api/admin/bookings', {
          headers: { 'Authorization': `Bearer ${user?.accessToken}` }
        }),
        axios.get('/api/admin/room-allocations', {
          headers: { 'Authorization': `Bearer ${user?.accessToken}` }
        }),
        axios.get('/api/admin/rooms', {
          headers: { 'Authorization': `Bearer ${user?.accessToken}` }
        })
      ]);
      
      setBookings(bookingsRes.data);
      setAllocations(allocationsRes.data);
      setRooms(roomsRes.data);
      
    } catch (err) {
      console.error('❌ 管理者データ取得エラー:', err);
      setError('管理者データの読み込みに失敗しました: ' + err.message);
    } finally {
      setLoading(false);
    }
  };

  // 🛠️ 管理者専用: 完全な予約情報表示
  const AdminBookingCard = ({ booking }) => {
    const allocation = allocations.find(a => a.booking_id === booking.id);
    
    return (
      <div className="admin-booking-card">
        <div className="admin-card-header">
          <div className="booking-info">
            <h3 className="booking-id">{booking.id}</h3>
            <span className={`status-badge ${booking.status}`}>
              {booking.status}
            </span>
          </div>
          <div className="customer-info">
            <span className="customer-name">
              {booking.primary_contact?.name_kanji || 'N/A'}
            </span>
            <span className="customer-email">
              {booking.primary_contact?.email || 'N/A'}
            </span>
          </div>
        </div>

        <div className="admin-booking-details">
          <div className="date-section">
            <div className="date-item">
              <label>チェックイン:</label>
              <span>{formatDate(booking.check_in_date)}</span>
            </div>
            <div className="date-item">
              <label>チェックアウト:</label>
              <span>{formatDate(booking.check_out_date)}</span>
            </div>
            <div className="date-item">
              <label>宿泊数:</label>
              <span>{calculateNights(booking.check_in_date, booking.check_out_date)}泊</span>
            </div>
          </div>

          {/* 🛠️ 管理者専用: 完全な部屋情報表示 */}
          <div className="room-allocation-section">
            <h4>🏠 部屋割り当て情報</h4>
            {booking.rooms?.map((room, index) => {
              const roomAllocation = allocations.find(a => 
                a.booking_id === booking.id && a.assigned_room_id === room.room_id
              );
              
              return (
                <div key={index} className="room-allocation-item">
                  <div className="room-basic-info">
                    <span className="room-id">{room.room_id}</span>
                    <span className="room-type">{room.room_type_id}</span>
                    <span className="guest-count">{room.number_of_guests}名</span>
                  </div>
                  
                  {/* 🔑 管理者のみ表示: 実際の部屋番号・フロア */}
                  {roomAllocation && (
                    <div className="room-physical-info">
                      <div className="room-number">
                        <strong>部屋番号:</strong> {roomAllocation.room_details?.room_number || 'TBD'}
                      </div>
                      <div className="room-floor">
                        <strong>フロア:</strong> {roomAllocation.room_details?.floor || 'N/A'}階
                      </div>
                      <div className="room-building">
                        <strong>建物:</strong> {roomAllocation.room_details?.building || 'main'}
                      </div>
                      <div className="room-condition">
                        <strong>状態:</strong> 
                        <span className={`condition-badge ${roomAllocation.room_details?.room_condition}`}>
                          {getRoomConditionLabel(roomAllocation.room_details?.room_condition)}
                        </span>
                      </div>
                    </div>
                  )}
                  
                  {!roomAllocation && (
                    <div className="allocation-pending">
                      <span className="pending-badge">部屋未割り当て</span>
                      <button className="assign-room-btn" onClick={() => handleRoomAssignment(booking.id, room.room_id)}>
                        部屋を割り当て
                      </button>
                    </div>
                  )}
                </div>
              );
            })}
          </div>

          <div className="pricing-section">
            <div className="price-item">
              <label>合計金額:</label>
              <span className="total-amount">₹{booking.total_amount?.toLocaleString()}</span>
            </div>
            <div className="price-item">
              <label>1泊あたり:</label>
              <span>₹{Math.round(booking.total_amount / calculateNights(booking.check_in_date, booking.check_out_date)).toLocaleString()}</span>
            </div>
          </div>
        </div>

        <div className="admin-actions">
          <button className="action-btn edit" onClick={() => handleEditBooking(booking.id)}>
            編集
          </button>
          <button className="action-btn view-customer" onClick={() => handleViewCustomer(booking.user_id)}>
            顧客情報
          </button>
          <button className="action-btn room-assign" onClick={() => handleManageRooms(booking.id)}>
            部屋管理
          </button>
          <button className="action-btn cancel" onClick={() => handleCancelBooking(booking.id)}>
            キャンセル
          </button>
        </div>
      </div>
    );
  };

  // 🛠️ 部屋管理セクション
  const RoomManagementSection = () => {
    const getRoomStatusColor = (room) => {
      const allocation = allocations.find(a => a.assigned_room_id === room.id);
      if (!allocation) return 'available';
      
      const today = new Date();
      const checkIn = new Date(allocation.assignment_date);
      
      if (checkIn > today) return 'reserved';
      return 'occupied';
    };

    return (
      <div className="room-management-section">
        <div className="section-header">
          <h2>🏠 部屋管理</h2>
          <div className="room-filters">
            <select value={filterLocation} onChange={(e) => setFilterLocation(e.target.value)}>
              <option value="all">全店舗</option>
              <option value="delhi">デリー店</option>
              <option value="varanasi">バラナシ店</option>
              <option value="puri">プリー店</option>
            </select>
          </div>
        </div>

        <div className="rooms-grid">
          {rooms
            .filter(room => filterLocation === 'all' || room.location_id === filterLocation)
            .map(room => (
              <div key={room.id} className={`room-card ${getRoomStatusColor(room)}`}>
                <div className="room-header">
                  <div className="room-number-info">
                    <span className="room-number">部屋 {room.room_number}</span>
                    <span className="floor-info">{room.floor}階</span>
                  </div>
                  <span className={`room-status ${getRoomStatusColor(room)}`}>
                    {getRoomStatusLabel(getRoomStatusColor(room))}
                  </span>
                </div>

                <div className="room-details">
                  <div className="room-type">{room.name}</div>
                  <div className="room-capacity">定員: {room.capacity}名</div>
                  <div className="room-price">₹{room.current_price}/泊</div>
                </div>

                <div className="room-allocation-info">
                  {(() => {
                    const allocation = allocations.find(a => a.assigned_room_id === room.id);
                    if (allocation) {
                      const booking = bookings.find(b => b.id === allocation.booking_id);
                      return (
                        <div className="current-allocation">
                          <div className="allocation-dates">
                            {allocation.assignment_date} 〜
                          </div>
                          <div className="guest-info">
                            {booking?.primary_contact?.name_kanji || 'ゲスト情報なし'}
                          </div>
                          <div className="booking-ref">
                            予約: {allocation.booking_id}
                          </div>
                        </div>
                      );
                    } else {
                      return <div className="no-allocation">利用可能</div>;
                    }
                  })()}
                </div>

                <div className="room-actions">
                  <button className="room-action-btn" onClick={() => handleRoomMaintenance(room.id)}>
                    メンテナンス
                  </button>
                  <button className="room-action-btn" onClick={() => handleRoomEdit(room.id)}>
                    編集
                  </button>
                </div>
              </div>
            ))}
        </div>
      </div>
    );
  };

  // ユーティリティ関数
  const formatDate = (dateString) => {
    return new Date(dateString).toLocaleDateString('ja-JP', {
      year: 'numeric',
      month: 'long',
      day: 'numeric',
      weekday: 'short'
    });
  };

  const calculateNights = (checkIn, checkOut) => {
    const start = new Date(checkIn);
    const end = new Date(checkOut);
    return Math.floor((end - start) / (1000 * 60 * 60 * 24));
  };

  const getRoomConditionLabel = (condition) => {
    const labels = {
      'ready': '利用可能',
      'cleaning': '清掃中',
      'maintenance': 'メンテナンス',
      'unknown': '状態不明'
    };
    return labels[condition] || condition;
  };

  const getRoomStatusLabel = (status) => {
    const labels = {
      'available': '空室',
      'reserved': '予約済み',
      'occupied': '使用中'
    };
    return labels[status] || status;
  };

  // イベントハンドラー
  const handleRoomAssignment = (bookingId, roomId) => {
    console.log('部屋割り当て:', bookingId, roomId);
    // TODO: 部屋割り当て機能実装
  };

  const handleEditBooking = (bookingId) => {
    console.log('予約編集:', bookingId);
    // TODO: 予約編集機能実装
  };

  const handleViewCustomer = (userId) => {
    console.log('顧客情報表示:', userId);
    // TODO: 顧客情報表示機能実装
  };

  const handleManageRooms = (bookingId) => {
    console.log('部屋管理:', bookingId);
    // TODO: 部屋管理機能実装
  };

  const handleCancelBooking = (bookingId) => {
    console.log('予約キャンセル:', bookingId);
    // TODO: 予約キャンセル機能実装
  };

  const handleRoomMaintenance = (roomId) => {
    console.log('部屋メンテナンス:', roomId);
    // TODO: 部屋メンテナンス機能実装
  };

  const handleRoomEdit = (roomId) => {
    console.log('部屋編集:', roomId);
    // TODO: 部屋編集機能実装
  };

  if (loading) {
    return (
      <div className="admin-dashboard">
        <div className="loading">
          <div className="loading-spinner"></div>
          <p>管理者データを読み込み中...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="admin-dashboard">
      {/* 管理者ヘッダー */}
      <div className="admin-header">
        <div className="header-content">
          <div className="admin-info">
            <h1>🛠️ 管理者ダッシュボード</h1>
            <p>スタッフ: {user?.displayName || user?.email}</p>
          </div>
          <div className="admin-stats">
            <div className="stat-item">
              <span className="stat-number">{bookings.length}</span>
              <span className="stat-label">予約数</span>
            </div>
            <div className="stat-item">
              <span className="stat-number">{allocations.length}</span>
              <span className="stat-label">割り当て</span>
            </div>
            <div className="stat-item">
              <span className="stat-number">{rooms.length}</span>
              <span className="stat-label">部屋数</span>
            </div>
          </div>
        </div>
      </div>

      {/* タブナビゲーション */}
      <div className="admin-tabs">
        <button 
          className={`tab-btn ${activeTab === 'bookings' ? 'active' : ''}`}
          onClick={() => setActiveTab('bookings')}
        >
          📅 予約管理
        </button>
        <button 
          className={`tab-btn ${activeTab === 'rooms' ? 'active' : ''}`}
          onClick={() => setActiveTab('rooms')}
        >
          🏠 部屋管理
        </button>
        <button 
          className={`tab-btn ${activeTab === 'allocations' ? 'active' : ''}`}
          onClick={() => setActiveTab('allocations')}
        >
          🔑 割り当て管理
        </button>
        <button 
          className={`tab-btn ${activeTab === 'analytics' ? 'active' : ''}`}
          onClick={() => setActiveTab('analytics')}
        >
          📊 分析
        </button>
      </div>

      {/* コンテンツエリア */}
      <div className="admin-content">
        {error && (
          <div className="error-banner">
            <span className="error-icon">⚠️</span>
            <span>{error}</span>
            <button onClick={fetchAdminData}>再試行</button>
          </div>
        )}

        {activeTab === 'bookings' && (
          <div className="bookings-management">
            <div className="section-header">
              <h2>📅 予約管理</h2>
              <div className="search-filters">
                <input
                  type="text"
                  placeholder="予約ID・顧客名で検索..."
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                />
                <select value={filterStatus} onChange={(e) => setFilterStatus(e.target.value)}>
                  <option value="all">全ステータス</option>
                  <option value="confirmed">確定</option>
                  <option value="pending">承認待ち</option>
                  <option value="completed">完了</option>
                  <option value="cancelled">キャンセル</option>
                </select>
              </div>
            </div>
            
            <div className="bookings-list">
              {bookings
                .filter(booking => {
                  if (filterStatus !== 'all' && booking.status !== filterStatus) return false;
                  if (searchQuery && !booking.id.toLowerCase().includes(searchQuery.toLowerCase()) && 
                      !booking.primary_contact?.name_kanji?.includes(searchQuery)) return false;
                  return true;
                })
                .map(booking => (
                  <AdminBookingCard key={booking.id} booking={booking} />
                ))}
            </div>
          </div>
        )}

        {activeTab === 'rooms' && <RoomManagementSection />}

        {activeTab === 'allocations' && (
          <div className="allocations-management">
            <h2>🔑 部屋割り当て管理</h2>
            <p>部屋割り当て機能は開発中です。</p>
          </div>
        )}

        {activeTab === 'analytics' && (
          <div className="analytics-section">
            <h2>📊 分析・レポート</h2>
            <p>分析機能は開発中です。</p>
          </div>
        )}
      </div>
    </div>
  );
};

export default AdminDashboard;