// frontend/src/pages/Home.js - 重複ヘッダー削除版
import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import SearchForm from '../components/SearchForm';
import RoomCombinations from '../components/RoomCombinations';
import { fetchAvailableRooms } from '../api';
import './Home.css';

const Home = () => {
  const navigate = useNavigate();
  const [combinations, setCombinations] = useState([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);
  const [searchPerformed, setSearchPerformed] = useState(false);
  const [currentSearchParams, setCurrentSearchParams] = useState(null);

  // 🔥 修正版：検索フォームからの入力処理
  const handleSearch = async (searchParams) => {
    console.log('🔍 検索開始:', searchParams);
    
    setLoading(true);
    setError(null);
    setSearchPerformed(true);
    setCurrentSearchParams(searchParams);
    
    try {
      const response = await fetchAvailableRooms(
        searchParams.checkIn,
        searchParams.checkOut,
        searchParams.checkInTime,
        searchParams.maleGuests,
        searchParams.femaleGuests,
        searchParams.totalGuests,
        searchParams.location
      );
      
      console.log('🔥 API完全レスポンス:', response);
      console.log('🔥 API response.data:', response.data);
      
      // 🔥 修正：レスポンスデータの正確な処理
      if (response.data && response.data.success) {
        const combinationsData = response.data.combinations || [];
        
        console.log('🔥 受信した組み合わせデータ:', combinationsData);
        console.log('🔥 組み合わせ数:', combinationsData.length);
        
        // 🔥 デバッグ：各組み合わせの内容確認
        combinationsData.forEach((combo, index) => {
          console.log(`🔥 組み合わせ ${index + 1}:`, {
            description: combo.description,
            total_price: combo.total_price,
            rooms: combo.rooms?.length || 0,
            details: combo
          });
        });
        
        setCombinations(combinationsData);
        
        if (combinationsData.length === 0) {
          setError('指定された条件では利用可能な部屋が見つかりませんでした。');
        }
      } else {
        console.error('🔥 予期しないレスポンス形式:', response.data);
        setCombinations([]);
        setError('サーバーから予期しないレスポンスを受信しました。');
      }
    } catch (err) {
      console.error('🔥 検索エラー:', err);
      setCombinations([]);
      
      if (err.message.includes('timeout')) {
        setError('検索がタイムアウトしました。しばらく経ってからもう一度お試しください。');
      } else if (err.response?.data?.message) {
        setError(`検索エラー: ${err.response.data.message}`);
      } else {
        setError('部屋の検索中にエラーが発生しました。しばらく経ってからもう一度お試しください。');
      }
    } finally {
      setLoading(false);
    }
  };

  // 🔥 修正版：予約処理（正確なデータ渡し）
  const handleBooking = (combination) => {
    console.log('🔥 予約処理開始 - 選択された組み合わせ:', combination);
    console.log('🔥 現在の検索パラメータ:', currentSearchParams);
    
    if (!combination || !currentSearchParams) {
      setError('予約に必要な情報が不足しています。もう一度検索してください。');
      return;
    }
    
    // 🔥 予約ページに渡すデータの整理
    const bookingData = {
      combination: combination,
      searchParams: currentSearchParams,
      pricing: {
        basePrice: combination.total_price,
        totalGuests: currentSearchParams.totalGuests,
        location: currentSearchParams.location
      }
    };
    
    console.log('🔥 Booking.jsページに渡すデータ:', bookingData);
    
    navigate('/booking', { 
      state: bookingData
    });
  };

  return (
    <div className="home-container">
      {/* 🔥 検索フォーム部分 */}
      <div className="search-section">
        <div className="hero-section">
          <h1>サンタゲストハウス</h1>
          <p>快適な宿泊体験をお約束します</p>
        </div>
        
        <div className="search-form-container">
          <SearchForm onSearch={handleSearch} loading={loading} />
        </div>
      </div>

      {/* 🔥 検索結果表示部分 */}
      <div className="results-section">
        {loading && (
          <div className="loading-container">
            <div className="loading-spinner"></div>
            <p>空室を検索中...</p>
          </div>
        )}

        {error && (
          <div className="error-container">
            <div className="error-message">
              <h3>⚠️ エラーが発生しました</h3>
              <p>{error}</p>
              <button 
                onClick={() => {
                  setError(null);
                  setSearchPerformed(false);
                }}
                className="retry-button"
              >
                もう一度検索する
              </button>
            </div>
          </div>
        )}

        {/* 🔥 修正：検索結果の表示ロジック（ヘッダー重複削除） */}
        {searchPerformed && !loading && !error && (
          <div className="search-results-container">
            {combinations.length > 0 ? (
              // 🔥 重複ヘッダーを削除！RoomCombinationsに任せる
              <RoomCombinations 
                combinations={combinations}
                onBooking={handleBooking}
                searchParams={currentSearchParams}
                loading={loading}
                error={error}
              />
            ) : (
              <div className="no-results-container">
                <h3>😔 該当する部屋が見つかりませんでした</h3>
                <p>検索条件を変更してもう一度お試しください。</p>
                <div className="search-suggestions">
                  <h4>検索のヒント：</h4>
                  <ul>
                    <li>日程を変更してみてください</li>
                    <li>人数を調整してみてください</li>
                    <li>別の店舗を選択してみてください</li>
                  </ul>
                </div>
              </div>
            )}
          </div>
        )}

        {/* 🔥 初期状態（検索前）の表示 */}
        {!searchPerformed && !loading && (
          <div className="welcome-message">
            <h2>宿泊プランを検索</h2>
            <p>上記のフォームから、ご希望の条件を入力して検索してください。</p>
            <div className="features-grid">
              <div className="feature-card">
                <h3>🏠 多様な部屋タイプ</h3>
                <p>ドミトリーから個室まで、様々なニーズに対応</p>
              </div>
              <div className="feature-card">
                <h3>💰 リーズナブルな価格</h3>
                <p>学生・バックパッカーに優しい料金設定</p>
              </div>
              <div className="feature-card">
                <h3>📍 アクセス良好</h3>
                <p>デリー・プリの便利な立地</p>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};

export default Home;