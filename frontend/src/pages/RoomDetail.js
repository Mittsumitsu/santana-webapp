import React, { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { fetchRoomDetails, fetchLocations, fetchRoomTypes } from '../api';
import './RoomDetail.css';

const RoomDetail = () => {
  const { roomId } = useParams();
  const navigate = useNavigate();
  
  const [room, setRoom] = useState(null);
  const [location, setLocation] = useState(null);
  const [roomType, setRoomType] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  
  useEffect(() => {
    const loadRoomDetails = async () => {
      setLoading(true);
      setError(null);
      
      try {
        // 部屋の詳細情報を取得
        const roomResponse = await fetchRoomDetails(roomId);
        const roomData = roomResponse.data;
        setRoom(roomData);
        
        // ロケーション情報とルームタイプ情報を取得
        const [locationsResponse, roomTypesResponse] = await Promise.all([
          fetchLocations(),
          fetchRoomTypes()
        ]);
        
        // ロケーション情報を設定
        const locationData = locationsResponse.data.find(
          loc => loc.id === roomData.location_id
        );
        setLocation(locationData);
        
        // ルームタイプ情報を設定
        const roomTypeData = roomTypesResponse.data.find(
          type => type.id === roomData.room_type_id
        );
        setRoomType(roomTypeData);
      } catch (err) {
        console.error('部屋情報の取得エラー:', err);
        setError('部屋情報の取得中にエラーが発生しました。');
      } finally {
        setLoading(false);
      }
    };
    
    if (roomId) {
      loadRoomDetails();
    }
  }, [roomId]);
  
  // 性別制限の表示
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
  
  // ロケーション名の表示
  const formatLocationName = (locationId) => {
    switch (locationId) {
      case 'delhi':
        return 'デリー';
      case 'varanasi':
        return 'バラナシ';
      case 'puri':
        return 'プリ';
      default:
        return locationId;
    }
  };
  
  // 予約ページへ遷移
  const handleBookNow = () => {
    navigate(`/booking/${roomId}`);
  };
  
  // 戻るボタン
  const handleGoBack = () => {
    navigate(-1);
  };
  
  if (loading) {
    return (
      <div className="loading">
        <div className="loading-spinner"></div>
        <p>部屋情報を読み込み中...</p>
      </div>
    );
  }
  
  if (error || !room) {
    return (
      <div className="error-container">
        <div className="error-message">
          <p>{error || '部屋情報が見つかりませんでした。'}</p>
        </div>
        <button className="back-btn" onClick={handleGoBack}>
          前のページに戻る
        </button>
      </div>
    );
  }
  
  return (
    <div className="room-detail-container">
      <button className="back-btn" onClick={handleGoBack}>
        ← 検索結果に戻る
      </button>
      
      <div className="room-detail-card">
        <div className="room-detail-header">
          <h1 className="room-detail-title">{room.name}</h1>
          <p className="room-detail-location">{formatLocationName(room.location_id)}</p>
        </div>
        
        <div className="room-detail-gallery">
          {room.imageUrl ? (
            <img src={room.imageUrl} alt={room.name} className="room-detail-image" />
          ) : (
            <div className="room-detail-image-placeholder">
              <span>{formatLocationName(room.location_id)} - {room.name}</span>
            </div>
          )}
        </div>
        
        <div className="room-detail-info">
          <div className="room-detail-price-container">
            <div className="room-detail-price">
              <span className="price-value">₹{room.current_price.toLocaleString()}</span>
              <span className="price-night">/泊</span>
            </div>
            <button className="book-now-btn" onClick={handleBookNow}>
              この部屋を予約する
            </button>
          </div>
          
          <div className="room-detail-description">
            <h2>部屋の説明</h2>
            <p>{room.description}</p>
          </div>
          
          <div className="room-detail-specs">
            <div className="spec-item">
              <h3>タイプ</h3>
              <p>{roomType ? roomType.name : room.room_type_id}</p>
            </div>
            <div className="spec-item">
              <h3>定員</h3>
              <p>{room.capacity}人</p>
            </div>
            <div className="spec-item">
              <h3>性別制限</h3>
              <p>{formatGender(room.gender_restriction)}</p>
            </div>
            <div className="spec-item">
              <h3>階層</h3>
              <p>{room.floor}階</p>
            </div>
          </div>
          
          {roomType && roomType.standard_amenities && roomType.standard_amenities.length > 0 && (
            <div className="room-detail-amenities">
              <h2>標準アメニティ</h2>
              <ul className="amenities-list">
                {roomType.standard_amenities.map((amenity, index) => (
                  <li key={index} className="amenity-item">{amenity}</li>
                ))}
              </ul>
            </div>
          )}
          
          {room.additional_amenities && room.additional_amenities.length > 0 && 
           !(room.additional_amenities.length === 1 && room.additional_amenities[0] === 'none') && (
            <div className="room-detail-amenities">
              <h2>追加アメニティ</h2>
              <ul className="amenities-list">
                {room.additional_amenities.map((amenity, index) => (
                  amenity !== 'none' && <li key={index} className="amenity-item">{amenity}</li>
                ))}
              </ul>
            </div>
          )}
        </div>
        
        {location && (
          <div className="location-info">
            <h2>施設情報</h2>
            <p>{location.name}</p>
            <p>{location.address}</p>
            
            <div className="location-details">
              <div className="location-detail-item">
                <h3>チェックイン</h3>
                <p>{location.check_in_time}</p>
              </div>
              <div className="location-detail-item">
                <h3>チェックアウト</h3>
                <p>{location.check_out_time}</p>
              </div>
            </div>
            
            {location.amenities && location.amenities.length > 0 && (
              <div className="location-amenities">
                <h3>施設アメニティ</h3>
                <ul className="amenities-list">
                  {location.amenities.map((amenity, index) => (
                    <li key={index} className="amenity-item">{amenity}</li>
                  ))}
                </ul>
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  );
};

export default RoomDetail;