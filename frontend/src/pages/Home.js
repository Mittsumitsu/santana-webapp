// src/pages/Home.js - Booking.jsページに遷移する版
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

  // 検索フォームからの入力を待つ
  const handleSearch = async (searchParams) => {
    setLoading(true);
    setError(null);
    setSearchPerformed(true);
    setCurrentSearchParams(searchParams);
    
    try {
      console.log('検索開始:', searchParams);
      
      const response = await fetchAvailableRooms(
        searchParams.checkIn,
        searchParams.checkOut,
        searchParams.checkInTime,
        searchParams.maleGuests,
        searchParams.femaleGuests,
        searchParams.totalGuests,
        searchParams.location
      );
      
      console.log('API応答:', response);
      
      if (response.data) {
        if (response.data.combinations) {
          setCombinations(response.data.combinations);
          console.log('組み合わせデータ設定完了:', response.data.combinations.length, 'パターン');
        } else {
          setCombinations([]);
          setError('利用可能な部屋の組み合わせが見つかりませんでした');
        }
      } else {
        setCombinations([]);
        setError('予期しないレスポンス形式でした');
        console.error('予期しないレスポンス形式:', response.data);
      }
    } catch (err) {
      console.error('Error fetching rooms:', err);
      setError('部屋の検索中にエラーが発生しました。しばらく経ってからもう一度お試しください。');
      setCombinations([]);
    } finally {
      setLoading(false);
    }
  };

  // 予約処理のハンドラ（Booking.jsページに遷移）
  const handleBooking = (combination) => {
    console.log('予約処理開始:', combination);
    
    // 予約データを整理（Booking.jsページが期待する形式に合わせる）
    const bookingData = {
      combination: combination,
      searchParams: currentSearchParams,
      created_at: new Date().toISOString()
    };
    
    console.log('📝 Booking.jsページに遷移:', bookingData);
    
    // Booking.jsページに遷移（react-router-domのstateでデータを渡す）
    navigate('/booking', {
      state: bookingData
    });
  };

  return (
    <div className="home-container">
      <div className="home-header">
        <h1 className="home-title">サンタナゲストハウス</h1>
        <h2 className="home-subtitle">安心の日本人宿</h2>
      </div>

      <SearchForm onSearch={handleSearch} />
      
      {searchPerformed && (
        <div className="search-results">
          <RoomCombinations 
            combinations={combinations}
            loading={loading}
            error={error}
            onBooking={handleBooking}
            searchParams={currentSearchParams}
          />
        </div>
      )}
    </div>
  );
};

export default Home;