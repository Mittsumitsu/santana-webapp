// frontend/src/components/RoomCombinations.js - 検索結果表示コンポーネント修正版
import React from 'react';
import './RoomCombinations.css';

const RoomCombinations = ({ combinations, onSelect, searchParams }) => {
  
  // 🔥 デバッグ情報出力
  console.log('🔥 RoomCombinations レンダリング:', {
    combinations: combinations,
    combinationsLength: combinations?.length || 0,
    searchParams: searchParams
  });

  // 🔥 入力データ検証
  if (!combinations || !Array.isArray(combinations)) {
    console.error('🔥 RoomCombinations: 無効なcombinationsデータ:', combinations);
    return (
      <div className="room-combinations-error">
        <p>部屋データの読み込みに問題があります。</p>
      </div>
    );
  }

  if (combinations.length === 0) {
    return (
      <div className="room-combinations-empty">
        <h3>😔 利用可能な部屋が見つかりませんでした</h3>
        <p>検索条件を変更してもう一度お試しください。</p>
      </div>
    );
  }

  // 🔥 宿泊日数計算
  const calculateNights = () => {
    if (!searchParams?.checkIn || !searchParams?.checkOut) return 1;
    
    const start = new Date(searchParams.checkIn);
    const end = new Date(searchParams.checkOut);
    const nights = Math.floor((end - start) / (1000 * 60 * 60 * 24));
    return nights > 0 ? nights : 1;
  };

  const nights = calculateNights();

  // 🔥 価格フォーマット関数
  const formatPrice = (price) => {
    return new Intl.NumberFormat('en-IN', {
      style: 'currency',
      currency: 'INR',
      minimumFractionDigits: 0
    }).format(price);
  };

  // 🔥 部屋タイプアイコン取得
  const getRoomTypeIcon = (roomType) => {
    const iconMap = {
      'dormitory': '🛏️',
      'single': '🏠',
      'deluxe': '✨', 
      'twin': '🏠',
      'male_dormitory': '👨',
      'female_dormitory': '👩'
    };
    
    // 部屋名に基づく判定
    if (roomType.includes('男性ドミトリー')) return '👨';
    if (roomType.includes('女性ドミトリー')) return '👩';
    if (roomType.includes('ドミトリー')) return '🛏️';
    if (roomType.includes('シングル')) return '🏠';
    if (roomType.includes('デラックス')) return '✨';
    if (roomType.includes('ツイン')) return '🏠';
    
    return '🏠';
  };

  // 🔥 おすすめバッジ判定
  const getRecommendationBadge = (combination, index) => {
    if (index === 0) return { text: '最もおすすめ', class: 'most-recommended' };
    if (combination.total_price <= 800) return { text: 'コスパ良好', class: 'cost-effective' };
    if (combination.description?.includes('デラックス')) return { text: 'プレミアム', class: 'premium' };
    return null;
  };

  // 🔥 各組み合わせカードをレンダリング
  const renderCombinationCard = (combination, index) => {
    console.log(`🔥 カード ${index + 1} レンダリング:`, combination);

    const recommendation = getRecommendationBadge(combination, index);
    const totalPrice = combination.total_price * nights;

    return (
      <div key={index} className={`combination-card ${index === 0 ? 'recommended' : ''}`}>
        {recommendation && (
          <div className={`recommendation-badge ${recommendation.class}`}>
            {recommendation.text}
          </div>
        )}

        <div className="card-header">
          <div className="room-type-info">
            <h3 className="room-type-title">
              {getRoomTypeIcon(combination.description)} 
              {combination.description}
            </h3>
            <p className="room-type-subtitle">{combination.rooms?.length || 1}室プラン</p>
          </div>
          
          <div className="pricing-info">
            <div className="price-main">
              {formatPrice(combination.total_price)}
            </div>
            <div className="price-details">
              1人あたり ₹{combination.total_price}/泊
            </div>
          </div>
        </div>

        <div className="card-body">
          {/* 🔥 部屋詳細情報 */}
          <div className="room-details">
            {combination.rooms && combination.rooms.length > 0 ? (
              combination.rooms.map((room, roomIndex) => (
                <div key={roomIndex} className="room-detail-item">
                  <span className="room-icon">{getRoomTypeIcon(room.name)}</span>
                  <div className="room-info">
                    <div className="room-name">{room.name}</div>
                    <div className="room-capacity">定員: {room.capacity}名</div>
                    {room.gender_restriction && room.gender_restriction !== 'none' && (
                      <div className="gender-restriction">
                        {room.gender_restriction === 'male' ? '男性専用' : '女性専用'}
                      </div>
                    )}
                  </div>
                  <div className="room-price">₹{room.current_price}</div>
                </div>
              ))
            ) : (
              <div className="room-detail-item">
                <span className="room-icon">{getRoomTypeIcon(combination.description)}</span>
                <div className="room-info">
                  <div className="room-name">{combination.description}</div>
                  <div className="room-capacity">1名用</div>
                </div>
                <div className="room-price">₹{combination.total_price}</div>
              </div>
            )}
          </div>

          {/* 🔥 宿泊日数が2泊以上の場合の料金詳細 */}
          {nights > 1 && (
            <div className="pricing-breakdown">
              <div className="pricing-row">
                <span>1泊料金:</span>
                <span>{formatPrice(combination.total_price)}</span>
              </div>
              <div className="pricing-row">
                <span>宿泊日数:</span>
                <span>{nights}泊</span>
              </div>
              <div className="pricing-row total">
                <span>合計料金:</span>
                <span className="total-price">{formatPrice(totalPrice)}</span>
              </div>
            </div>
          )}

          {/* 🔥 ゲスト詳細 */}
          {searchParams && (
            <div className="guest-info">
              <div className="guest-breakdown">
                <span>👥 ゲスト:</span>
                {parseInt(searchParams.maleGuests) > 0 && (
                  <span>男性 {searchParams.maleGuests}名</span>
                )}
                {parseInt(searchParams.femaleGuests) > 0 && (
                  <span>女性 {searchParams.femaleGuests}名</span>
                )}
                <span className="total-guests">合計 {searchParams.totalGuests}名</span>
              </div>
            </div>
          )}
        </div>

        <div className="card-footer">
          <button 
            className="select-button"
            onClick={() => {
              console.log('🔥 組み合わせ選択:', combination);
              onSelect(combination);
            }}
          >
            この部屋を予約する
          </button>
          
          <div className="card-features">
            <span className="feature-item">✅ 即時予約可能</span>
            <span className="feature-item">🔄 キャンセル無料</span>
            {combination.total_price <= 1000 && (
              <span className="feature-item">💰 格安料金</span>
            )}
          </div>
        </div>
      </div>
    );
  };

  return (
    <div className="room-combinations-container">
      <div className="combinations-grid">
        {combinations.map((combination, index) => renderCombinationCard(combination, index))}
      </div>
      
      {/* 🔥 検索結果サマリー */}
      <div className="search-summary-footer">
        <p className="summary-text">
          {combinations.length}つの宿泊プランが見つかりました
          {searchParams && (
            <>
              <span className="separator">•</span>
              {searchParams.checkIn} 〜 {searchParams.checkOut}
              <span className="separator">•</span>
              {searchParams.totalGuests}名
              <span className="separator">•</span>
              {nights}泊
            </>
          )}
        </p>
      </div>
    </div>
  );
};

export default RoomCombinations;