// frontend/src/pages/AdminDashboard.js - 修正版
// 🛠️ 管理者専用ダッシュボード（APIエンドポイント修正）

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

  // 🔧 修正: 正しいAPIベースURL
  const API_BASE_URL = 'http://localhost:3000/api';

  useEffect(() => {
    fetchAdminData();
  }, []);

  const fetchAdminData = async () => {
    setLoading(true);
    setError('');
    
    try {
      console.log('🛠️ 管理者データ取得開始...');
      console.log('🔗 API Base URL:', API_BASE_URL);
      
      // 🔧 修正: 正しいAPIエンドポイントを使用
      const [bookingsRes, allocationsRes, roomsRes] = await Promise.all([
        axios.get(`${API_BASE_URL}/admin/bookings`, {
          timeout: 10000,
          headers: { 
            'Content-Type': 'application/json'
            // 認証ヘッダーは後で実装
          }
        }),
        axios.get(`${API_BASE_URL}/admin/room-allocations`, {
          timeout: 10000,
          headers: { 
            'Content-Type': 'application/json'
          }
        }),
        axios.get(`${API_BASE_URL}/admin/rooms`, {
          timeout: 10000,
          headers: { 
            'Content-Type': 'application/json'
          }
        })
      ]);
      
      console.log('✅ 管理者データ取得成功:', {
        bookings: bookingsRes.data.length,
        allocations: allocationsRes.data.length,
        rooms: roomsRes.data.length
      });
      
      setBookings(bookingsRes.data);
      setAllocations(allocationsRes.data);
      setRooms(roomsRes.data);
      
    } catch (err) {
      console.error('❌ 管理者データ取得エラー:', err);
      console.error('🔍 エラー詳細:', {
        message: err.message,
        status: err.response?.status,
        statusText: err.response?.statusText,
        url: err.config?.url
      });
      
      setError(`管理者データの読み込みに失敗しました: ${err.message}`);
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
              {getStatusLabel(booking.status)}
            </span>
          </div>
          <div className="booking-actions">
            <button onClick={() => handleEditBooking(booking.id)}>編集</button>
            <button onClick={() => handleViewCustomer(booking.user_id)}>顧客情報</button>
          </div>
        </div>
        
        <div className="admin-card-content">
          <div className="customer-info">
            <h4>顧客情報</h4>
            <p>名前: {booking.primary_contact?.name_kanji || '未設定'}</p>
            <p>Email: {booking.primary_contact?.email || '未設定'}</p>
            <p>人数: {booking.total_guests}名</p>
          </div>
          
          <div className="stay-info">
            <h4>宿泊情報</h4>
            <p>チェックイン: {booking.check_in_date}</p>
            <p>チェックアウト: {booking.check_out_date}</p>
            <p>場所: {booking.location_id}</p>
          </div>
          
          {allocation && (
            <div className="room-allocation">
              <h4>部屋割り当て</h4>
              <p>部屋番号: {allocation.room_number}</p>
              <p>フロア: {allocation.floor}階</p>
              <p>ステータス: {allocation.status}</p>
            </div>
          )}
        </div>
      </div>
    );
  };

  // ヘルパー関数（コンポーネント外で定義）
  const getRoomStatusColor = (room) => {
    const allocation = allocations.find(a => a.assigned_room_id === room.id);
    if (!allocation) return 'available';
    
    const today = new Date();
    const checkIn = new Date(allocation.assignment_date);
    
    if (checkIn > today) return 'reserved';
    return 'occupied';
  };

  const getRoomStatusLabel = (status) => {
    const labels = {
      'available': '空室',
      'reserved': '予約済み',
      'occupied': '使用中'
    };
    return labels[status] || status;
  };

  const getStatusLabel = (status) => {
    const labels = {
      'confirmed': '確定',
      'pending': '承認待ち',
      'completed': '完了',
      'cancelled': 'キャンセル'
    };
    return labels[status] || status;
  };

  // 部屋管理セクション
  const RoomManagementSection = () => {

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
                    <span className="room-number">部屋 {room.room_number || room.id}</span>
                    <span className="floor-info">{room.floor || '1'}階</span>
                  </div>
                  <span className={`room-status ${getRoomStatusColor(room)}`}>
                    {getRoomStatusLabel(getRoomStatusColor(room))}
                  </span>
                </div>

                <div className="room-details">
                  <div className="room-type">{room.name || room.type_name}</div>
                  <div className="room-capacity">定員: {room.capacity}名</div>
                  <div className="room-price">₹{room.current_price || room.price}/泊</div>
                </div>

                <div className="room-actions">
                  <button onClick={() => handleRoomEdit(room.id)}>編集</button>
                  <button onClick={() => handleRoomMaintenance(room.id)}>メンテナンス</button>
                </div>
              </div>
            ))}
        </div>
      </div>
    );
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
              {bookings.length === 0 ? (
                <div className="empty-state">
                  <h3>📋 予約データがありません</h3>
                  <p>現在、表示する予約がありません。新しい予約が入ると、ここに表示されます。</p>
                </div>
              ) : (
                bookings
                  .filter(booking => {
                    if (filterStatus !== 'all' && booking.status !== filterStatus) return false;
                    if (searchQuery && !booking.id.toLowerCase().includes(searchQuery.toLowerCase()) && 
                        !booking.primary_contact?.name_kanji?.includes(searchQuery)) return false;
                    return true;
                  })
                  .map(booking => (
                    <AdminBookingCard key={booking.id} booking={booking} />
                  ))
              )}
            </div>
          </div>
        )}

        {activeTab === 'rooms' && <RoomManagementSection />}

        {activeTab === 'allocations' && (
          <div className="allocations-management">
            <h2>🔑 部屋割り当て管理</h2>
            {allocations.length === 0 ? (
              <div className="empty-state">
                <h3>🔑 割り当てデータがありません</h3>
                <p>現在、表示する部屋割り当てがありません。</p>
              </div>
            ) : (
              <div className="allocations-list">
                {allocations.map(allocation => (
                  <div key={allocation.id} className="allocation-card">
                    <h4>割り当てID: {allocation.id}</h4>
                    <p>予約ID: {allocation.booking_id}</p>
                    <p>部屋ID: {allocation.room_id}</p>
                    <p>ステータス: {allocation.status}</p>
                  </div>
                ))}
              </div>
            )}
          </div>
        )}

        {activeTab === 'analytics' && (
          <div className="analytics-section">
            <h2>📊 分析・レポート</h2>
            <div className="analytics-grid">
              <div className="analytics-card">
                <h3>📈 予約統計</h3>
                <p>総予約数: {bookings.length}</p>
                <p>完了済み: {bookings.filter(b => b.status === 'completed').length}</p>
                <p>進行中: {bookings.filter(b => b.status === 'confirmed').length}</p>
              </div>
              <div className="analytics-card">
                <h3>🏠 部屋統計</h3>
                <p>総部屋数: {rooms.length}</p>
                <p>利用可能: {rooms.filter(r => getRoomStatusColor(r) === 'available').length}</p>
                <p>使用中: {rooms.filter(r => getRoomStatusColor(r) === 'occupied').length}</p>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};

export default AdminDashboard;