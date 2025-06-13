import React from 'react';
import './RoomCombinations.css';

const RoomCombinations = ({ combinations, loading, error, onBooking, searchParams }) => {
  // ローディング中
  if (loading) {
    return (
      <div className="room-combinations">
        <div className="loading">検索中...</div>
      </div>
    );
  }

  // エラー時
  if (error) {
    return (
      <div className="room-combinations">
        <div className="error">{error}</div>
      </div>
    );
  }

  // 結果なし
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

  // 部屋名を正規化する関数（修正版）
  const normalizeRoomName = (name) => {
    if (!name) return '';
    // 「(2室)」「（2室）」のみ削除、「+ 部屋名」は残す
    return name.replace(/\s*[\(（][0-9]+室[\)）]\s*/g, '').trim();
  };

  // 予約ボタンのハンドラ
  const handleBooking = (combination) => {
    if (onBooking) {
      onBooking(combination);
    } else {
      console.log('予約データ:', combination);
      alert('予約システムは開発中です。');
    }
  };

  // 詳細表示のハンドラ
  const handleDetails = (combination) => {
    const details = `部屋詳細:\n${normalizeRoomName(combination.description)}\n\n合計料金: ₹${combination.total_price.toLocaleString()}`;
    alert(details);
  };

  // 🔥 デバッグ: combinationsデータの中身を確認
  console.log('🔥 RoomCombinations - 受信したcombinations:', combinations);
  combinations.forEach((combo, index) => {
    console.log(`🔥 組み合わせ ${index + 1}:`, {
      description: combo.description,
      rooms: combo.rooms,
      roomsLength: combo.rooms?.length,
      roomNames: combo.rooms?.map(r => r.name),
      completeData: combo
    });
  });

  return (
    <div className="room-combinations">
      {/* 検索結果ヘッダー - 1つだけ表示 */}
      <div className="results-header">
        <h2 className="results-title">空室検索結果</h2>
        <div className="results-count">
          {combinations.length}個の宿泊プランが見つかりました
        </div>
      </div>

      {/* 組み合わせリスト */}
      <div className="combinations-list">
        {combinations.map((combination, index) => {
          // 🔥 デバッグ: 各組み合わせの詳細ログ
          console.log(`🔥 カード ${index + 1} レンダリング開始:`, combination);
          console.log(`🔥 カード ${index + 1} - rooms:`, combination.rooms);
          
          return (
            <div key={`combination-${index}`} className="combination-card">
              {/* ヘッダー部分 */}
              <div className="combination-header">
                <div className="combination-title">
                  <h3>{normalizeRoomName(combination.description)}</h3>
                  <div className="combination-type">
                    {combination.rooms ? combination.rooms.length : 1}室プラン
                  </div>
                </div>

                {/* 価格情報 */}
                <div className="combination-price">
                  <div className="total-price">₹{combination.total_price.toLocaleString()}</div>
                  <div className="price-per-person">
                    1人あたり ₹{Math.round(combination.total_price / (searchParams?.totalGuests || 1)).toLocaleString()}/泊
                  </div>
                </div>
              </div>

              {/* 部屋詳細 - 強制的に全部屋表示版 */}
              <div className="rooms-detail">
                {(() => {
                  // 🔥 デバッグ: combination.roomsの詳細確認
                  console.log(`🔥 カード ${index + 1} - rooms詳細処理開始`);
                  console.log(`🔥 カード ${index + 1} - combination.rooms存在チェック:`, !!combination.rooms);
                  console.log(`🔥 カード ${index + 1} - combination.rooms配列チェック:`, Array.isArray(combination.rooms));
                  console.log(`🔥 カード ${index + 1} - combination.rooms長さ:`, combination.rooms?.length);
                  
                  if (combination.rooms && Array.isArray(combination.rooms) && combination.rooms.length > 0) {
                    console.log(`🔥 カード ${index + 1} - 部屋配列を処理中:`, combination.rooms);
                    return combination.rooms.map((room, roomIndex) => {
                      console.log(`🔥 カード ${index + 1} - 部屋 ${roomIndex + 1}:`, room);
                      return (
                        <div key={`room-${room.id || roomIndex}-${roomIndex}`} className="room-item">
                          <div className="room-info">
                            <span className="room-name">{normalizeRoomName(room.name || '不明')}</span>
                          </div>
                          
                          <div className="room-price">
                            ₹{(room.current_price || 0).toLocaleString()}/泊
                          </div>
                        </div>
                      );
                    });
                  } else {
                    console.log(`🔥 カード ${index + 1} - フォールバック表示`);
                    return (
                      <div className="room-item">
                        <div className="room-info">
                          <span className="room-name">{normalizeRoomName(combination.description)}</span>
                        </div>
                        
                        <div className="room-price">
                          ₹{combination.total_price.toLocaleString()}/泊
                        </div>
                      </div>
                    );
                  }
                })()}
              </div>

              {/* 特徴表示 - シンプル版 */}
              <div className="combination-features">
                {combination.total_price <= 1000 && (
                  <div className="cost-effective">
                    <span>コスパ良好</span>
                  </div>
                )}
              </div>

              {/* アクションボタン */}
              <div className="combination-actions">
                <button 
                  className="detail-btn" 
                  onClick={() => handleDetails(combination)}
                >
                  詳細を見る
                </button>
                <button 
                  className="book-btn" 
                  onClick={() => handleBooking(combination)}
                >
                  予約する
                </button>
              </div>
            </div>
          );
        })}
      </div>

      {/* フッター情報 */}
      <div className="results-footer">
        <div className="help-text">
          ご質問がございましたら、お気軽にお問い合わせください。
        </div>
      </div>
    </div>
  );
};

export default RoomCombinations;