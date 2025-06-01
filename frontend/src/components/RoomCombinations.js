import React from 'react';
import './RoomCombinations.css';

const RoomCombinations = ({ combinations, loading, error, onBooking }) => {
  if (loading) {
    return (
      <div className="room-combinations">
        <div className="loading">検索中...</div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="room-combinations">
        <div className="error">{error}</div>
      </div>
    );
  }

  if (!combinations || combinations.length === 0) {
    return (
      <div className="room-combinations">
        <div className="no-results">
          条件に一致する部屋の組み合わせが見つかりませんでした。
          <br />検索条件を変更してみてください。
        </div>
      </div>
    );
  }

  // 総人数をチェック（最初の組み合わせから取得）
  const totalGuests = combinations[0]?.guest_breakdown?.total || 0;
  const isLargeGroup = totalGuests > 8; // 8人を超えたら制限

  // 複数室プランがあるかチェック
  const hasMultiRoomPlans = combinations.some(combo => combo.type === 'multi');

  // 予約ボタンのハンドラ
  const handleBooking = (combination) => {
    if (isLargeGroup) return;
    
    if (onBooking) {
      onBooking(combination);
    } else {
      // デフォルトの予約処理
      console.log('予約データ:', combination);
      
      const confirmMessage = `以下の内容で予約を進めますか？\n\n${combination.description}\n料金: ₹${combination.total_price.toLocaleString()}\n\n部屋詳細:\n${combination.guest_allocation.map((alloc, index) => {
        const room = combination.rooms[index];
        return `• ${room.name}: 男性${alloc.male_guests}人 女性${alloc.female_guests}人 (₹${alloc.room_price.toLocaleString()})`;
      }).join('\n')}`;
      
      // eslint-disable-next-line no-restricted-globals
      if (window.confirm(confirmMessage)) {
        // eslint-disable-next-line no-restricted-globals
        window.alert('予約システムは開発中です。\n現在はテスト表示のみとなります。');
        
        // 予約データの詳細をコンソールに出力
        const bookingDetails = {
          combination_id: combination.id,
          rooms: combination.rooms.map(room => ({
            room_id: room.id,
            room_name: room.name,
            room_type: room.room_type_id
          })),
          guest_allocation: combination.guest_allocation,
          total_price: combination.total_price,
          guest_breakdown: combination.guest_breakdown
        };
        
        console.log('予約詳細:', JSON.stringify(bookingDetails, null, 2));
      }
    }
  };

  // 詳細表示のハンドラ
  const handleDetails = (combination) => {
    const details = `予約詳細:\n${combination.description}\n\n部屋構成:\n${combination.rooms.map((room, index) => {
      const allocation = combination.guest_allocation[index];
      return `• ${room.name} (${room.room_number || room.id})\n  - 男性: ${allocation.male_guests}人\n  - 女性: ${allocation.female_guests}人\n  - 料金: ₹${allocation.room_price.toLocaleString()}`;
    }).join('\n')}\n\n合計料金: ₹${combination.total_price.toLocaleString()}\n推奨度: ${combination.recommendation_score}点`;
    
    // eslint-disable-next-line no-restricted-globals
    window.alert(details);
  };

  return (
    <div className="room-combinations">
      <h3 className="combinations-title">
        おすすめの宿泊プラン ({combinations.length}パターン)
      </h3>

      {/* 複数室プランの注意書き */}
      {hasMultiRoomPlans && !isLargeGroup && (
        <div className="multi-room-notice">
          <div className="notice-icon">💡</div>
          <div className="notice-content">
            <p>
              <strong>複数室プランについて</strong><br/>
              表示されている組み合わせでご希望の部屋割りがない場合は、お手数ですが個別に予約をお願いいたします。
              <br/>
              <small>※ 個別予約の場合でも、確実にご案内できるわけではございませんので予めご了承ください。</small>
            </p>
          </div>
        </div>
      )}
      
      {/* 大人数グループへの制限案内 */}
      {isLargeGroup && (
        <div className="large-group-restriction">
          <div className="restriction-icon">⚠️</div>
          <div className="restriction-content">
            <h4>大人数グループについて</h4>
            <p>
              {totalGuests}名様でのご利用をご希望いただきありがとうございます。<br/>
              小規模ゲストハウスのため、<strong>8名様まで</strong>のご利用とさせていただいております。
            </p>
            <div className="suggestion-box">
              <strong>おすすめ:</strong> グループを分けてのご予約をお願いいたします
              <ul>
                <li>🏠 複数日程での分散宿泊</li>
                <li>📅 日程をずらしてのご利用</li>
                <li>🔄 4名ずつのグループ分けでの個別予約</li>
              </ul>
            </div>
          </div>
        </div>
      )}
      
      <div className="combinations-grid">
        {combinations.map((combination, index) => (
          <div key={combination.id} className={`combination-card ${isLargeGroup ? 'restricted' : ''}`}>
            {/* 推奨バッジ */}
            {index === 0 && !isLargeGroup && (
              <div className="recommendation-badge">
                最もおすすめ
              </div>
            )}
            
            {/* 制限バッジ */}
            {isLargeGroup && (
              <div className="restriction-badge">
                ご利用制限あり
              </div>
            )}
            
            {/* ヘッダー */}
            <div className="combination-header">
              <h4 className="combination-title">{combination.description}</h4>
              <div className="combination-type">
                {combination.type === 'single' ? '1室プラン' : '複数室プラン'}
              </div>
            </div>

            {/* 価格情報 */}
            <div className={`combination-price ${isLargeGroup ? 'restricted' : ''}`}>
              <div className="total-price">₹{combination.total_price.toLocaleString()}</div>
              <div className="price-per-person">
                1人あたり ₹{Math.round(combination.total_price / combination.guest_breakdown.total).toLocaleString()}/泊
              </div>
              {isLargeGroup && (
                <div className="restriction-overlay">
                  <span>4名様まで</span>
                </div>
              )}
            </div>

            {/* 部屋詳細 */}
            <div className="rooms-detail">
              {combination.guest_allocation.map((allocation, allocationIndex) => {
                // rooms配列から対応する部屋を見つける
                const room = combination.rooms[allocationIndex];
                
                return (
                  <div key={`${allocation.room_id}_${allocationIndex}`} className="room-item">
                    <div className="room-info">
                      <span className="room-name">{room.name}</span>
                    </div>
                    <div className="room-guests">
                      {allocation.male_guests > 0 && (
                        <span className="male-guests">男性{allocation.male_guests}人</span>
                      )}
                      {allocation.female_guests > 0 && (
                        <span className="female-guests">女性{allocation.female_guests}人</span>
                      )}
                    </div>
                    <div className="room-price">
                      ₹{allocation.room_price ? allocation.room_price.toLocaleString() : room.current_price.toLocaleString()}/泊
                    </div>
                  </div>
                );
              })}
            </div>

            {/* 特徴 - 定員情報削除 */}
            <div className="combination-features">
              {combination.rooms.some(room => room.gender_restriction !== 'none') && (
                <div className="gender-restriction">
                  <span>性別専用部屋を含む</span>
                </div>
              )}
              {combination.recommendation_score >= 120 && !isLargeGroup && (
                <div className="high-score">
                  <span>コスパ良好</span>
                </div>
              )}
            </div>

            {/* アクションボタン */}
            <div className="combination-actions">
              <button 
                className="detail-btn" 
                disabled={isLargeGroup}
                onClick={() => handleDetails(combination)}
              >
                詳細を見る
              </button>
              <button 
                className="book-btn" 
                disabled={isLargeGroup}
                onClick={() => handleBooking(combination)}
              >
                {isLargeGroup ? '予約不可' : '予約する'}
              </button>
            </div>
          </div>
        ))}
      </div>
      
      {/* 制限についての追加説明 */}
      {isLargeGroup && (
        <div className="restriction-footer">
          <h4>📋 ご利用制限について</h4>
          <div className="restriction-explanation">
            <p>
              サンタナゲストハウスは<strong>小規模な家庭的ゲストハウス</strong>です。
              他のお客様にも快適にお過ごしいただくため、大人数でのご利用を制限しております。
            </p>
            <div className="alternative-suggestions">
              <div className="suggestion-item">
                <span className="suggestion-icon">📅</span>
                <div>
                  <strong>日程分散利用</strong><br/>
                  前半・後半でグループを分けてのご宿泊
                </div>
              </div>
              <div className="suggestion-item">
                <span className="suggestion-icon">🔄</span>
                <div>
                  <strong>グループ分け予約</strong><br/>
                  4名様ずつでの個別ご予約
                </div>
              </div>
              <div className="suggestion-item">
                <span className="suggestion-icon">🏠</span>
                <div>
                  <strong>複数店舗利用</strong><br/>
                  デリー・バラナシ・プリでの分散宿泊
                </div>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default RoomCombinations;