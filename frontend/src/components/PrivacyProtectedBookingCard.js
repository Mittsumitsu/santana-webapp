// frontend/src/components/PrivacyProtectedBookingCard.js
// 🔒 プライバシー保護版予約カード

import React from 'react';
import './PrivacyProtectedBookingCard.css';

const PrivacyProtectedBookingCard = ({ booking }) => {
  // 🔒 プライバシー保護: 顧客向け表示データのみ
  const getCustomerDisplayInfo = (booking) => {
    return {
      // ✅ 表示OK: 日付・期間
      checkInDate: booking.check_in_date,
      checkOutDate: booking.check_out_date,
      nights: calculateNights(booking.check_in_date, booking.check_out_date),
      
      // ✅ 表示OK: 部屋タイプ（番号なし）
      roomTypes: extractRoomTypes(booking.rooms),
      roomCount: booking.rooms?.length || 1,
      
      // ✅ 表示OK: 基本情報
      totalGuests: booking.total_guests,
      totalAmount: booking.total_amount,
      status: booking.status,
      
      // ✅ 表示OK: 店舗情報
      location: getLocationName(booking.rooms),
      
      // ❌ 非表示: 部屋番号・内部ID・フロア情報は完全除去
    };
  };
  
  const calculateNights = (checkIn, checkOut) => {
    const start = new Date(checkIn);
    const end = new Date(checkOut);
    return Math.floor((end - start) / (1000 * 60 * 60 * 24));
  };
  
  // 🔒 部屋タイプのみ表示（部屋番号除去）
  const extractRoomTypes = (rooms) => {
    if (!rooms || !Array.isArray(rooms)) return ['部屋タイプ不明'];
    
    const typeMap = {
      'single': 'シングルルーム',
      'twin': 'ツインルーム',
      'deluxe': 'デラックスルーム',
      'dormitory': 'ドミトリー',
      'deluxe_VIP': 'VIPルーム'
    };
    
    return rooms.map(room => {
      // room_snapshotから部屋タイプを取得（より正確）
      const roomType = room.room_snapshot?.room_type_id || room.room_type_id || 'unknown';
      return typeMap[roomType] || roomType;
    });
  };
  
  // 🔒 店舗名のみ表示
  const getLocationName = (rooms) => {
    if (!rooms || !Array.isArray(rooms) || rooms.length === 0) return '店舗不明';
    
    const locationMap = {
      'delhi': 'デリー店',
      'varanasi': 'バラナシ店', 
      'puri': 'プリー店'
    };
    
    // 最初の部屋の店舗情報を使用
    const locationId = rooms[0].room_snapshot?.location_id || 'unknown';
    return locationMap[locationId] || locationId;
  };
  
  const formatDate = (dateString) => {
    const date = new Date(dateString);
    return date.toLocaleDateString('ja-JP', {
      year: 'numeric',
      month: 'long', 
      day: 'numeric',
      weekday: 'short'
    });
  };
  
  const getStatusDisplay = (status) => {
    const statusMap = {
      confirmed: { text: '予約確定', icon: '✅', class: 'status-confirmed' },
      pending: { text: '承認待ち', icon: '⏳', class: 'status-pending' },
      completed: { text: '完了', icon: '🎉', class: 'status-completed' },
      cancelled: { text: 'キャンセル', icon: '❌', class: 'status-cancelled' }
    };
    
    return statusMap[status] || { text: status, icon: '❓', class: 'status-unknown' };
  };
  
  const displayInfo = getCustomerDisplayInfo(booking);
  const statusInfo = getStatusDisplay(displayInfo.status);
  
  return (
    <div className="privacy-protected-booking-card">
      {/* 🔒 プライバシー保護ヘッダー */}
      <div className="booking-header">
        <div className="booking-id">
          <span className="booking-label">予約番号</span>
          <span className="booking-number">{booking.id}</span>
        </div>
        <div className={`booking-status ${statusInfo.class}`}>
          <span className="status-icon">{statusInfo.icon}</span>
          <span className="status-text">{statusInfo.text}</span>
        </div>
      </div>
      
      {/* 📅 日程情報 */}
      <div className="booking-dates">
        <div className="date-section">
          <div className="date-label">チェックイン</div>
          <div className="date-value">{formatDate(displayInfo.checkInDate)}</div>
        </div>
        <div className="stay-duration">
          <div className="nights-count">{displayInfo.nights}泊</div>
        </div>
        <div className="date-section">
          <div className="date-label">チェックアウト</div>
          <div className="date-value">{formatDate(displayInfo.checkOutDate)}</div>
        </div>
      </div>
      
      {/* 🏨 宿泊情報（プライバシー保護版） */}
      <div className="booking-accommodation">
        <div className="location-info">
          <span className="location-icon">📍</span>
          <span className="location-name">{displayInfo.location}</span>
        </div>
        
        <div className="room-types">
          <span className="room-icon">🏠</span>
          <div className="room-list">
            {displayInfo.roomTypes.map((roomType, index) => (
              <span key={index} className="room-type-tag">
                {roomType}
              </span>
            ))}
          </div>
          {displayInfo.roomCount > 1 && (
            <span className="room-count">（{displayInfo.roomCount}室）</span>
          )}
        </div>
        
        <div className="guest-info">
          <span className="guest-icon">👥</span>
          <span className="guest-count">{displayInfo.totalGuests}名様</span>
        </div>
      </div>
      
      {/* 💰 料金情報 */}
      <div className="booking-price">
        <div className="price-breakdown">
          <span className="price-label">ご宿泊料金</span>
          <span className="price-amount">₹{displayInfo.totalAmount.toLocaleString()}</span>
        </div>
        <div className="price-per-night">
          <span className="per-night-label">
            （1泊あたり ₹{Math.round(displayInfo.totalAmount / displayInfo.nights).toLocaleString()}）
          </span>
        </div>
      </div>
      
      {/* 🔒 プライバシー保護フッター */}
      <div className="booking-footer">
        <div className="privacy-notice">
          <span className="privacy-icon">🔒</span>
          <span className="privacy-text">
            チェックイン時に具体的な部屋をご案内いたします
          </span>
        </div>
        
        <div className="booking-actions">
          <button className="action-button view-details">
            詳細を見る
          </button>
          <button className="action-button contact-support">
            お問い合わせ
          </button>
        </div>
      </div>
    </div>
  );
};

export default PrivacyProtectedBookingCard;