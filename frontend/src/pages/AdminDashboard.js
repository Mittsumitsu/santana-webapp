import React, { useState, useEffect } from 'react';
import axios from 'axios';
import './AdminDashboard.css';

const AdminDashboard = () => {
  const [activeView, setActiveView] = useState('calendar');
  const [selectedLocation, setSelectedLocation] = useState('delhi');
  const [bookings, setBookings] = useState([]);
  const [rooms, setRooms] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [dateRange, setDateRange] = useState({
    start: new Date(),
    end: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000) // 30日後
  });

  // 管理者ユーザー（実際はAuthContextから取得）
  const currentUser = {
    userType: 'admin',
    displayName: '管理者'
  };

  useEffect(() => {
    fetchData();
  }, [selectedLocation]);

  const fetchData = async () => {
    try {
      setLoading(true);
      setError(null);

      // 全予約データを取得
      const bookingsResponse = await axios.get('http://localhost:3000/api/bookings', {
        timeout: 10000
      });

      // 部屋データを取得
      const roomsResponse = await axios.get('http://localhost:3000/api/rooms', {
        timeout: 10000
      });

      console.log('取得した予約データ:', bookingsResponse.data);
      console.log('取得した部屋データ:', roomsResponse.data);

      setBookings(Array.isArray(bookingsResponse.data) ? bookingsResponse.data : []);
      setRooms(Array.isArray(roomsResponse.data?.rooms) ? roomsResponse.data.rooms : []);

    } catch (err) {
      console.error('データ取得エラー:', err);
      setError('データの読み込みに失敗しました');
      
      // モックデータでフォールバック
      setBookings([
        {
          id: "VPvvZQ75mEiCVBLTGxLk",
          check_in_date: "2025-07-01",
          check_out_date: "2025-07-03",
          status: "confirmed",
          total_guests: 3,
          total_amount: 2100,
          primary_contact: {
            name_kanji: "テスト 太郎",
            name_romaji: "TEST TARO",
            email: "test@example.com"
          },
          child_bookings: ["QHgsKXd3IYDIIJTYUO6i"],
          created_at: { _seconds: 1748783113 }
        },
        {
          id: "booking_delhi_july2",
          check_in_date: "2025-07-02",
          check_out_date: "2025-07-05",
          status: "pending",
          total_guests: 2,
          total_amount: 3400,
          primary_contact: {
            name_kanji: "山田 花子",
            name_romaji: "YAMADA HANAKO",
            email: "yamada@example.com"
          },
          child_bookings: ["child_delhi_201"],
          created_at: { _seconds: 1748883113 }
        }
      ]);

      setRooms([
        { id: 'delhi-101', location_id: 'delhi', room_number: '101', room_type_id: 'single', name: 'シングルルーム', capacity: 1 },
        { id: 'delhi-201', location_id: 'delhi', room_number: '201', room_type_id: 'dormitory', name: '女性ドミトリー', capacity: 6, gender_restriction: 'female' },
        { id: 'delhi-202', location_id: 'delhi', room_number: '202', room_type_id: 'twin', name: 'ツインルーム', capacity: 2 },
        { id: 'delhi-302', location_id: 'delhi', room_number: '302', room_type_id: 'dormitory', name: '男性ドミトリー', capacity: 6, gender_restriction: 'male' },
        { id: 'delhi-401', location_id: 'delhi', room_number: '401', room_type_id: 'deluxe', name: 'デラックスルーム', capacity: 2 }
      ]);
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
    return statusMap[status] || { text: status, class: 'status-default' };
  };

  const formatDate = (dateString) => {
    if (!dateString) return '';
    
    if (typeof dateString === 'object' && dateString._seconds) {
      return new Date(dateString._seconds * 1000).toLocaleDateString('ja-JP');
    }
    
    return new Date(dateString).toLocaleDateString('ja-JP');
  };

  // カレンダー表示用の日付配列を生成
  const generateCalendarDates = () => {
    const dates = [];
    const start = new Date(dateRange.start);
    const end = new Date(dateRange.end);
    
    for (let d = new Date(start); d <= end; d.setDate(d.getDate() + 1)) {
      dates.push(new Date(d));
    }
    return dates;
  };

  // 指定された日付と部屋に予約があるかチェック
  const getBookingForDateAndRoom = (date, roomId) => {
    const dateString = date.toISOString().split('T')[0];
    
    return bookings.find(booking => {
      const checkIn = new Date(booking.check_in_date);
      const checkOut = new Date(booking.check_out_date);
      const currentDate = new Date(dateString);
      
      return currentDate >= checkIn && currentDate < checkOut && 
             (booking.child_bookings?.includes(roomId) || booking.room_id === roomId);
    });
  };

  // 指定された場所の部屋をフィルタリング
  const getLocationRooms = () => {
    return rooms.filter(room => room.location_id === selectedLocation);
  };

  const handleRefresh = () => {
    fetchData();
  };

  const handleBookingAction = (bookingId, action) => {
    console.log(`予約 ${bookingId} に対する操作: ${action}`);
    // 実際の処理を実装
    alert(`予約 ${bookingId} を${action}しました`);
  };

  if (loading) {
    return (
      <div className="admin-dashboard">
        <div className="loading">
          <div className="loading-spinner"></div>
          <p>管理データを読み込み中...</p>
        </div>
      </div>
    );
  }

  const calendarDates = generateCalendarDates();
  const locationRooms = getLocationRooms();

  return (
    <div className="admin-dashboard">
      {/* ヘッダー */}
      <div className="admin-header">
        <div className="admin-info">
          <h1>📊 管理者ダッシュボード</h1>
          <p>予約管理・運営状況の確認</p>
        </div>
        <div className="admin-actions">
          <button className="refresh-btn" onClick={handleRefresh}>
            🔄 更新
          </button>
          <div className="admin-user">
            <span>{currentUser.displayName}</span>
          </div>
        </div>
      </div>

      {/* エラー表示 */}
      {error && (
        <div className="error-banner">
          <span className="error-icon">⚠️</span>
          <span>{error}</span>
          <button onClick={() => setError(null)}>×</button>
        </div>
      )}

      {/* コントロールパネル */}
      <div className="control-panel">
        <div className="view-toggle">
          <button 
            className={`toggle-btn ${activeView === 'calendar' ? 'active' : ''}`}
            onClick={() => setActiveView('calendar')}
          >
            📅 カレンダー表示
          </button>
          <button 
            className={`toggle-btn ${activeView === 'list' ? 'active' : ''}`}
            onClick={() => setActiveView('list')}
          >
            📋 データ表示
          </button>
        </div>

        <div className="location-selector">
          <label>店舗:</label>
          <select 
            value={selectedLocation} 
            onChange={(e) => setSelectedLocation(e.target.value)}
          >
            <option value="delhi">🏙️ デリー</option>
            <option value="varanasi">🕉️ バラナシ</option>
            <option value="puri">🏖️ プリー</option>
          </select>
        </div>

        <div className="date-range">
          <label>期間:</label>
          <input 
            type="date" 
            value={dateRange.start.toISOString().split('T')[0]}
            onChange={(e) => setDateRange({...dateRange, start: new Date(e.target.value)})}
          />
          <span>〜</span>
          <input 
            type="date" 
            value={dateRange.end.toISOString().split('T')[0]}
            onChange={(e) => setDateRange({...dateRange, end: new Date(e.target.value)})}
          />
        </div>
      </div>

      {/* メインコンテンツ */}
      <div className="admin-content">
        {activeView === 'calendar' ? (
          /* カレンダー表示 */
          <div className="calendar-view">
            <div className="calendar-header">
              <h2>📅 {selectedLocation.toUpperCase()} カレンダー表示</h2>
              <div className="calendar-stats">
                <span>📊 予約数: {bookings.length}</span>
                <span>🏠 部屋数: {locationRooms.length}</span>
              </div>
            </div>

            <div className="calendar-grid">
              {/* ヘッダー行（日付） */}
              <div className="calendar-header-row">
                <div className="room-header">部屋</div>
                {calendarDates.map((date, index) => (
                  <div key={index} className="date-header">
                    <div className="date-day">{date.getDate()}</div>
                    <div className="date-weekday">
                      {date.toLocaleDateString('ja-JP', { weekday: 'short' })}
                    </div>
                  </div>
                ))}
              </div>

              {/* 部屋ごとの予約状況 */}
              {locationRooms.map(room => (
                <div key={room.id} className="calendar-room-row">
                  <div className="room-info">
                    <div className="room-name">{room.name}</div>
                    <div className="room-details">
                      {room.room_number} ({room.capacity}名)
                    </div>
                  </div>
                  {calendarDates.map((date, dateIndex) => {
                    const booking = getBookingForDateAndRoom(date, room.id);
                    return (
                      <div 
                        key={dateIndex} 
                        className={`calendar-cell ${booking ? 'booked' : 'available'}`}
                      >
                        {booking && (
                          <div className="booking-info">
                            <div className="guest-name">
                              {booking.primary_contact?.name_kanji || 'ゲスト'}
                            </div>
                            <div className="booking-status">
                              <span className={`status-dot ${getStatusBadge(booking.status).class}`}></span>
                            </div>
                          </div>
                        )}
                      </div>
                    );
                  })}
                </div>
              ))}
            </div>
          </div>
        ) : (
          /* データ表示 */
          <div className="list-view">
            <div className="list-header">
              <h2>📋 予約データ一覧</h2>
              <div className="list-stats">
                <span>総予約数: {bookings.length}</span>
              </div>
            </div>

            <div className="bookings-table">
              <table>
                <thead>
                  <tr>
                    <th>予約ID</th>
                    <th>ゲスト名</th>
                    <th>チェックイン</th>
                    <th>チェックアウト</th>
                    <th>人数</th>
                    <th>金額</th>
                    <th>ステータス</th>
                    <th>予約日時</th>
                    <th>操作</th>
                  </tr>
                </thead>
                <tbody>
                  {bookings.map(booking => {
                    const statusInfo = getStatusBadge(booking.status);
                    return (
                      <tr key={booking.id}>
                        <td className="booking-id">{booking.id}</td>
                        <td className="guest-name">
                          <div>{booking.primary_contact?.name_kanji || 'N/A'}</div>
                          <div className="guest-email">{booking.primary_contact?.email}</div>
                        </td>
                        <td>{formatDate(booking.check_in_date)}</td>
                        <td>{formatDate(booking.check_out_date)}</td>
                        <td className="guest-count">{booking.total_guests}名</td>
                        <td className="amount">₹{booking.total_amount?.toLocaleString()}</td>
                        <td>
                          <span className={`status-badge ${statusInfo.class}`}>
                            {statusInfo.text}
                          </span>
                        </td>
                        <td>{formatDate(booking.created_at)}</td>
                        <td className="actions">
                          {booking.status === 'pending' && (
                            <>
                              <button 
                                className="approve-btn"
                                onClick={() => handleBookingAction(booking.id, '承認')}
                              >
                                ✓
                              </button>
                              <button 
                                className="reject-btn"
                                onClick={() => handleBookingAction(booking.id, '拒否')}
                              >
                                ✗
                              </button>
                            </>
                          )}
                          <button 
                            className="detail-btn"
                            onClick={() => handleBookingAction(booking.id, '詳細表示')}
                          >
                            📋
                          </button>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};

export default AdminDashboard;