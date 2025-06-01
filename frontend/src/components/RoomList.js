import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import './RoomList.css';

const RoomList = ({ rooms, loading, error }) => {
  const navigate = useNavigate();
  // グループ化された部屋タイプの状態
  const [groupedRooms, setGroupedRooms] = useState({});
  
  // rooms が変更されたときに部屋をタイプごとにグループ化
  useEffect(() => {
    if (!rooms || !Array.isArray(rooms)) return;
    
    const grouped = {};
    const roomsArray = Array.isArray(rooms) ? rooms : Object.values(rooms);
    
    roomsArray.forEach(room => {
      // グループ化キーの作成（部屋タイプ+性別制限+ロケーション）
      const roomKey = `${room.room_type_id}_${room.gender_restriction}_${room.location_id}`;
      
      if (!grouped[roomKey]) {
        grouped[roomKey] = {
          type: room.room_type_id,
          name: room.name,
          gender_restriction: room.gender_restriction,
          location_id: room.location_id,
          description: room.description,
          current_price: room.current_price,
          capacity: room.capacity,
          additional_amenities: room.additional_amenities,
          // 代表的な部屋情報として最初の部屋を使う
          representative: room,
          // 代表部屋のIDを保存（予約・詳細ページへの遷移に使用）
          id: room.id
        };
      }
    });
    
    setGroupedRooms(grouped);
  }, [rooms]);
  
  // ローディング中の表示
  if (loading) {
    return (
      <div className="loading">
        <div className="loading-spinner"></div>
        <p>部屋を検索中...</p>
      </div>
    );
  }

  // エラーがある場合の表示
  if (error) {
    return (
      <div className="error-message">
        <p>エラーが発生しました: {error}</p>
      </div>
    );
  }

  // 部屋がない場合の表示
  if ((!rooms || rooms.length === 0) && Object.keys(groupedRooms).length === 0) {
    return (
      <div className="no-rooms">
        <p>条件に一致する部屋が見つかりませんでした。検索条件を変更してみてください。</p>
      </div>
    );
  }

  // 部屋の性別表示を日本語に変換する関数
  const formatGender = (gender) => {
    switch (gender) {
      case 'male':
        return '男性専用';
      case 'female':
        return '女性専用';
      case 'none':
      default:
        return '制限なし';
    }
  };

  // 店舗名を日本語に変換する関数
  const formatLocation = (location) => {
    switch (location) {
      case 'delhi':
        return 'デリー';
      case 'varanasi':
        return 'バラナシ';
      case 'puri':
        return 'プリ';
      default:
        return location;
    }
  };
  
  // 部屋タイプを日本語に変換する関数
  const formatRoomType = (type) => {
    switch (type) {
      case 'single':
        return 'シングルルーム';
      case 'twin':
        return 'ツインルーム';
      case 'dormitory':
        return 'ドミトリー';
      case 'deluxe':
        return 'デラックスルーム';
      case 'deluxe_VIP':
        return 'VIPルーム';
      default:
        return type;
    }
  };
  
  // アメニティを表示する関数
  const renderAmenities = (room) => {
    // 部屋タイプのスタンダードアメニティとカスタムアメニティを結合
    const amenities = [];
    
    // 追加アメニティがnoneでない場合のみ表示
    if (room.additional_amenities && room.additional_amenities.length > 0 && 
        !(room.additional_amenities.length === 1 && room.additional_amenities[0] === 'none')) {
      room.additional_amenities.forEach(amenity => {
        if (amenity !== 'none') amenities.push(amenity);
      });
    }
    
    if (amenities.length === 0) return null;
    
    return (
      <div className="room-amenities">
        <h4>アメニティ</h4>
        <ul>
          {amenities.map((amenity, index) => (
            <li key={index}>{amenity}</li>
          ))}
        </ul>
      </div>
    );
  };

  // 詳細ページへの遷移
  const handleViewDetails = (roomId) => {
    navigate(`/rooms/${roomId}`);
  };
  
  // 予約ページへの遷移
  const handleBookNow = (roomId) => {
    navigate(`/booking/${roomId}`);
  };
  
  // グループ化表示モード（ユーザーには表示モード切り替えボタンを表示しない）
  return (
    <div className="room-list-container">
      <div className="room-list">
        {Object.values(groupedRooms).map((group, index) => {
          return (
            <div key={index} className="room-card">
              {group.representative.imageUrl ? (
                <img src={group.representative.imageUrl} alt={group.name} className="room-image" />
              ) : (
                <div className="room-image-placeholder">
                  <span>{formatLocation(group.location_id)} - {formatRoomType(group.type)}</span>
                </div>
              )}
              
              <div className="room-info">
                <div className="room-header">
                  <h3 className="room-name">{group.name}</h3>
                  <div className="room-availability">
                    <span className="availability-badge">利用可能</span>
                  </div>
                </div>
                
                <p className="room-location">{formatLocation(group.location_id)}</p>
                
                <div className="room-details">
                  <div className="room-capacity">
                    <span>定員: {group.capacity}人</span>
                  </div>
                  <div className="room-gender">
                    <span>{formatGender(group.gender_restriction)}</span>
                  </div>
                  <div className="room-price">
                    <span>₹{group.current_price.toLocaleString()}/泊</span>
                  </div>
                </div>
                
                <p className="room-description">{group.description}</p>
                
                {renderAmenities(group)}
                
                <div className="room-actions">
                  <button 
                    className="details-btn" 
                    onClick={() => handleViewDetails(group.id)}
                  >
                    詳細を見る
                  </button>
                  <button 
                    className="book-btn" 
                    onClick={() => handleBookNow(group.id)}
                  >
                    予約する
                  </button>
                </div>
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
};

export default RoomList;