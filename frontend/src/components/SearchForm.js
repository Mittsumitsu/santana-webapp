// frontend/src/components/SearchForm.js - 完全リセット・ネイティブ版
import React, { useState, useEffect } from 'react';
import { useSearchParams } from 'react-router-dom';
import './SearchForm.css';

const SearchForm = ({ onSearch, loading }) => {
  const [searchParams] = useSearchParams();
  
  // 🗓️ URLパラメータから初期値を取得
  const initializeFromURL = () => {
    const urlCheckin = searchParams.get('checkin');
    const urlCheckout = searchParams.get('checkout');
    const urlLocation = searchParams.get('location');
    const urlMales = parseInt(searchParams.get('males')) || 0;
    const urlFemales = parseInt(searchParams.get('females')) || 0;
    const isFromCalendar = searchParams.get('calendar') === 'true';
    
    return {
      checkIn: urlCheckin || '',
      checkOut: urlCheckout || '',
      location: urlLocation || 'delhi',
      maleGuests: urlMales,
      femaleGuests: urlFemales,
      isFromCalendar
    };
  };
  
  const initialValues = initializeFromURL();
  
  // シンプルなstate管理
  const [checkIn, setCheckIn] = useState(initialValues.checkIn);
  const [checkOut, setCheckOut] = useState(initialValues.checkOut);
  const [maleGuests, setMaleGuests] = useState(initialValues.maleGuests);
  const [femaleGuests, setFemaleGuests] = useState(initialValues.femaleGuests);
  const [location, setLocation] = useState(initialValues.location);
  // デフォルト値も24:00に変更
  const [checkInTime, setCheckInTime] = useState('14:00');
  
  // 🗓️ カレンダーからのアクセス通知
  const [isFromCalendar, setIsFromCalendar] = useState(initialValues.isFromCalendar);

  // チェックイン時間の選択肢
  const timeOptions = [
    { time: "10:00", description: "午前10時" },
    { time: "11:00", description: "午前11時" },
    { time: "12:00", description: "正午" },
    { time: "13:00", description: "午後1時" },
    { time: "14:00", description: "午後2時" },
    { time: "15:00", description: "午後3時" },
    { time: "16:00", description: "午後4時" },
    { time: "17:00", description: "午後5時" },
    { time: "18:00", description: "午後6時" },
    { time: "19:00", description: "午後7時" },
    { time: "20:00", description: "午後8時" },
    { time: "21:00", description: "午後9時" },
    { time: "22:00", description: "午後10時" },
    { time: "23:00", description: "午後11時" },
    { time: "24:00", description: "24時" },
    { time: "01:00", description: "翌1時" },
    { time: "02:00", description: "翌2時" },
    { time: "03:00", description: "翌3時" },
    { time: "04:00", description: "翌4時" },
    { time: "05:00", description: "翌5時" },
    { time: "06:00", description: "翌6時" },
    { time: "07:00", description: "翌7時" },
    { time: "08:00", description: "翌8時" },
    { time: "09:00", description: "翌9時" },
  ];

  // 合計人数計算
  const totalGuests = maleGuests + femaleGuests;

  // 今日の日付（最小日付）
  const today = new Date().toISOString().split('T')[0];

  // チェックアウト日の最小日付（チェックイン日の翌日）
  const getMinCheckOutDate = () => {
    if (!checkIn) return today;
    const checkInDate = new Date(checkIn);
    checkInDate.setDate(checkInDate.getDate() + 1);
    return checkInDate.toISOString().split('T')[0];
  };

  // 宿泊日数計算
  const calculateNights = () => {
    if (!checkIn || !checkOut) return 0;
    const start = new Date(checkIn);
    const end = new Date(checkOut);
    const nights = Math.ceil((end - start) / (1000 * 60 * 60 * 24));
    return nights > 0 ? nights : 0;
  };

  const nights = calculateNights();

  // 検索実行
  const handleSubmit = (e) => {
    e.preventDefault();
    
    // バリデーション
    if (!checkIn || !checkOut) {
      alert('チェックイン日とチェックアウト日を選択してください。');
      return;
    }

    if (new Date(checkOut) <= new Date(checkIn)) {
      alert('チェックアウト日はチェックイン日より後の日付を選択してください。');
      return;
    }

    if (totalGuests === 0) {
      alert('宿泊人数を1人以上選択してください。');
      return;
    }

    // 検索パラメータ
    const searchParams = {
      checkIn,
      checkOut,
      checkInTime,
      maleGuests,
      femaleGuests,
      totalGuests,
      location
    };

    console.log('🔍 検索パラメータ送信:', searchParams);
    onSearch(searchParams);
  };
  
  // 🗓️ カレンダーからの場合は自動検索を無効化（手動で人数入力後に検索）
  // useEffect(() => {
  //   if (isFromCalendar && checkIn && checkOut && (maleGuests > 0 || femaleGuests > 0)) {
  //     console.log('🗓️ カレンダーからの自動検索実行');
  //     handleSubmit({ preventDefault: () => {} });
  //     setIsFromCalendar(false); // 一度だけ実行
  //   }
  // }, [isFromCalendar, checkIn, checkOut, maleGuests, femaleGuests]);

  return (
    <form onSubmit={handleSubmit} className="search-form-clean">
      {/* 🗓️ カレンダーからのアクセス表示 */}
      {initialValues.isFromCalendar && (
        <div className="calendar-notice">
          <span className="calendar-icon">📅</span>
          <span>空室カレンダーから予約日が設定されました</span>
        </div>
      )}
      
      <div className="search-container-clean">
        
        {/* 日程セクション */}
        <div className="form-section-clean">
          <h3 className="section-title">宿泊日程</h3>
          
          <div className="date-inputs">
            <div className="date-group">
              <label htmlFor="checkIn">チェックイン日</label>
              <input
                type="date"
                id="checkIn"
                value={checkIn}
                onChange={(e) => setCheckIn(e.target.value)}
                min={today}
                className="date-input"
                required
              />
            </div>
            
            <div className="date-group">
              <label htmlFor="checkOut">チェックアウト日</label>
              <input
                type="date"
                id="checkOut"
                value={checkOut}
                onChange={(e) => setCheckOut(e.target.value)}
                min={getMinCheckOutDate()}
                className="date-input"
                required
              />
            </div>
          </div>

          {/* 日程サマリー */}
          {checkIn && checkOut && nights > 0 && (
            <div className="date-summary-clean">
              <span>📅 {new Date(checkIn).toLocaleDateString('ja-JP')}</span>
              <span>〜</span>
              <span>📅 {new Date(checkOut).toLocaleDateString('ja-JP')}</span>
              <span className="nights">（{nights}泊）</span>
            </div>
          )}
        </div>

        {/* 人数・店舗・時間セクション */}
        <div className="form-section-clean">
          <h3 className="section-title">宿泊詳細</h3>
          
          <div className="details-grid">
            <div className="input-group">
              <label htmlFor="maleGuests">男性人数</label>
              <select
                id="maleGuests"
                value={maleGuests}
                onChange={e => setMaleGuests(parseInt(e.target.value))}
                className="select-input"
              >
                {[0, 1, 2, 3, 4, 5, 6].map(num => (
                  <option key={num} value={num}>{num}人</option>
                ))}
              </select>
            </div>
            
            <div className="input-group">
              <label htmlFor="femaleGuests">女性人数</label>
              <select
                id="femaleGuests"
                value={femaleGuests}
                onChange={e => setFemaleGuests(parseInt(e.target.value))}
                className="select-input"
              >
                {[0, 1, 2, 3, 4, 5, 6].map(num => (
                  <option key={num} value={num}>{num}人</option>
                ))}
              </select>
            </div>
            
            <div className="input-group">
              <label htmlFor="location">店舗 *</label>
              <select
                id="location"
                value={location}
                onChange={e => setLocation(e.target.value)}
                className="select-input"
                required
              >
                <option value="delhi">🏙️ デリー</option>
                <option value="varanasi">🕉️ バラナシ</option>
                <option value="puri">🏖️ プリー</option>
              </select>
            </div>
            
            <div className="input-group">
              <label htmlFor="checkInTime">チェックイン時間</label>
              <select
                id="checkInTime"
                value={checkInTime}
                onChange={e => setCheckInTime(e.target.value)}
                className="select-input"
              >
                {timeOptions.map(({ time, description }) => (
                  <option key={time} value={time}>
                    {description}
                  </option>
                ))}
              </select>
            </div>
          </div>

          {/* 人数サマリー */}
          <div className="guest-summary-clean">
            <span className="guest-total">
              合計: <strong>{totalGuests}人</strong>
            </span>
            {totalGuests > 0 && (
              <span className="guest-breakdown">
                {maleGuests > 0 && `男性${maleGuests}人`}
                {maleGuests > 0 && femaleGuests > 0 && ', '}
                {femaleGuests > 0 && `女性${femaleGuests}人`}
              </span>
            )}
            {totalGuests === 0 && (
              <span className="guest-warning">
                ⚠️ 宿泊人数を1人以上選択してください
              </span>
            )}
          </div>

          {/* 🔥 チェックイン時間に応じた注意文表示 */}
          {checkInTime && (
            <div className="checkin-notice">
              {(checkInTime === '10:00' || checkInTime === '11:00') && (
                <div className="notice-warning">
                  ⚠️ 午前10時前にご到着の場合、前日泊扱いとなり1泊分多く料金がかかります
                </div>
              )}
              
              {['01:00', '02:00', '03:00', '04:00', '05:00', '06:00', '07:00', '08:00', '09:00'].includes(checkInTime) && checkIn && (
                <div className="notice-info">
                  💡 実際の到着時間は{new Date(new Date(checkIn).getTime() + 24 * 60 * 60 * 1000).toLocaleDateString('ja-JP')}{
                    checkInTime === '01:00' ? '午前1時' :
                    checkInTime === '02:00' ? '午前2時' :
                    checkInTime === '03:00' ? '午前3時' :
                    checkInTime === '04:00' ? '午前4時' :
                    checkInTime === '05:00' ? '午前5時' :
                    checkInTime === '06:00' ? '午前6時' :
                    checkInTime === '07:00' ? '午前7時' :
                    checkInTime === '08:00' ? '午前8時' :
                    checkInTime === '09:00' ? '午前9時' : ''
                  }です
                </div>
              )}
            </div>
          )}
        </div>

        {/* 検索ボタン */}
        <div className="search-button-section">
          <button 
            type="submit" 
            className={`search-button-clean ${loading ? 'loading' : ''}`}
            disabled={loading || totalGuests === 0}
          >
            {loading ? (
              <>
                <span className="spinner-clean"></span>
                検索中...
              </>
            ) : (
              '空室を検索'
            )}
          </button>
        </div>
      </div>
    </form>
  );
};

export default SearchForm;