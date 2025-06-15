import React, { useState, useEffect } from 'react';
import { useSearchParams, useNavigate } from 'react-router-dom';
import './AvailabilityCalendar.css';

const AvailabilityCalendar = () => {
  const [searchParams, setSearchParams] = useSearchParams();
  const navigate = useNavigate();
  
  // 状態管理
  const [selectedLocation, setSelectedLocation] = useState(searchParams.get('location') || 'delhi');
  const [calendarData, setCalendarData] = useState(null);
  const [monthlyData, setMonthlyData] = useState({});
  const [legend, setLegend] = useState({});
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [showLegend, setShowLegend] = useState(true);
  const [cache, setCache] = useState({}); // APIレスポンスキャッシュ

  // 店舗情報
  const locations = [
    { id: 'delhi', name: 'デリー', nameEn: 'Delhi' },
    { id: 'varanasi', name: 'バラナシ', nameEn: 'Varanasi' },
    { id: 'puri', name: 'プリー', nameEn: 'Puri' }
  ];

  // API呼び出し（キャッシュ機能付き）
  const fetchAvailabilityData = async (locationId, forceRefresh = false) => {
    try {
      // キャッシュキー作成
      const cacheKey = locationId;
      const now = Date.now();
      const cacheExpiry = 5 * 60 * 1000; // 5分間キャッシュ
      
      // キャッシュチェック（強制更新でない場合）
      if (!forceRefresh && cache[cacheKey]) {
        const cached = cache[cacheKey];
        if (now - cached.timestamp < cacheExpiry) {
          console.log(`📚 キャッシュから取得: ${locationId}`);
          setCalendarData(cached.data.calendar);
          setMonthlyData(cached.data.monthly_data);
          setLegend(cached.data.legend);
          setLoading(false);
          return;
        }
      }
      
      setLoading(true);
      setError(null);
      
      console.log(`🗓️ 空室カレンダー取得開始: ${locationId}`);
      
      const response = await fetch(`http://localhost:3000/api/availability/calendar/${locationId}`);
      
      if (!response.ok) {
        throw new Error(`HTTP ${response.status}: ${response.statusText}`);
      }
      
      const data = await response.json();
      
      console.log(`✅ 空室カレンダー取得成功:`, data);
      
      // キャッシュに保存
      setCache(prev => ({
        ...prev,
        [cacheKey]: {
          data: data,
          timestamp: now
        }
      }));
      
      setCalendarData(data.calendar);
      setMonthlyData(data.monthly_data);
      setLegend(data.legend);
      
      // 注意文の処理
      if (data.notice) {
        console.log('📋 サーバーからの注意文:', data.notice);
      }
      
    } catch (err) {
      console.error('❌ 空室カレンダー取得エラー:', err);
      setError(`空室情報の取得に失敗しました: ${err.message}`);
    } finally {
      setLoading(false);
    }
  };

  // 初期データ読み込み
  useEffect(() => {
    fetchAvailabilityData(selectedLocation);
  }, [selectedLocation]);

  // URL同期
  useEffect(() => {
    setSearchParams({ location: selectedLocation });
  }, [selectedLocation, setSearchParams]);

  // 店舗変更ハンドラ
  const handleLocationChange = (locationId) => {
    console.log(`🏨 店舗変更: ${selectedLocation} → ${locationId}`);
    setSelectedLocation(locationId);
  };

  // 日付クリックハンドラ
  const handleDateClick = (date, dayData) => {
    if (!dayData.clickable) {
      console.log(`🚫 ${date}: クリック不可 (${dayData.display_text})`);
      return;
    }

    console.log(`📅 日付クリック: ${date} (${dayData.display_text})`);
    
    // 検索ページに初期値を設定して新しいタブで遷移（チェックイン日と店舗のみ）
    const searchUrl = `/?calendar=true&location=${selectedLocation}&checkin=${date}`;
    window.open(searchUrl, '_blank');
  };

  // 日付フォーマット（表示用）
  const formatDateForDisplay = (dateString) => {
    const date = new Date(dateString);
    return {
      day: date.getDate(),
      dayOfWeek: date.toLocaleDateString('ja-JP', { weekday: 'short' }),
      isToday: date.toDateString() === new Date().toDateString(),
      isPast: date < new Date().setHours(0, 0, 0, 0)
    };
  };

  // 月名フォーマット
  const formatMonthName = (monthData) => {
    return monthData.month_name;
  };

  // ローディング表示
  if (loading) {
    return (
      <div className="availability-calendar">
        <div className="calendar-header">
          <h1>空室状況カレンダー</h1>
        </div>
        <div className="loading-container">
          <div className="loading-spinner"></div>
          <p>空室情報を取得中...</p>
        </div>
      </div>
    );
  }

  // エラー表示
  if (error) {
    return (
      <div className="availability-calendar">
        <div className="calendar-header">
          <h1>空室状況カレンダー</h1>
        </div>
        <div className="error-container">
          <div className="error-message">
            <span className="error-icon">⚠️</span>
            <p>{error}</p>
            <button 
              onClick={() => fetchAvailabilityData(selectedLocation)}
              className="retry-button"
            >
              再試行
            </button>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="availability-calendar">
      {/* ヘッダー */}
      <div className="calendar-header">
        <h1>空室状況カレンダー</h1>
        <p className="calendar-subtitle">今後3ヶ月間の空室状況をご確認いただけます</p>
      </div>

      {/* 店舗選択タブ */}
      <div className="location-tabs">
        {locations.map(location => (
          <button
            key={location.id}
            className={`location-tab ${selectedLocation === location.id ? 'active' : ''}`}
            onClick={() => handleLocationChange(location.id)}
          >
            <span className="location-name">{location.name}</span>
            <span className="location-name-en">{location.nameEn}</span>
          </button>
        ))}
      </div>

      {/* 凡例 */}
      {showLegend && legend && (
        <div className="legend-container">
          <div className="legend-header">
            <h3>表示説明</h3>
            <button 
              className="legend-toggle"
              onClick={() => setShowLegend(false)}
            >
              非表示
            </button>
          </div>
          <div className="legend-items">
            {Object.entries(legend).map(([key, item]) => (
              <div key={key} className="legend-item">
                <span className="legend-icon">{item.icon}</span>
                <span className="legend-text">{item.text}</span>
                {item.clickable && <span className="legend-clickable">（クリック可能）</span>}
              </div>
            ))}
          </div>
        </div>
      )}

      {/* 凡例非表示時の表示ボタン */}
      {!showLegend && (
        <div className="legend-show-button">
          <button onClick={() => setShowLegend(true)}>
            表示説明を表示
          </button>
        </div>
      )}

      {/* 注意文エリア */}
      <div className="notice-container">
        <div className="notice-content">
          <div className="notice-main">
            ⚠️ <strong>空室状況は目安です。実際の予約可否は検索結果でご確認ください</strong>
          </div>
          <div className="notice-details">
            <span className="notice-item">🔄 情報更新：予約時 + 定期更新</span>
            <span className="notice-item">📅 最新の空室状況は部屋検索でリアルタイムに表示されます</span>
          </div>
        </div>
      </div>

      {/* カレンダー */}
      <div className="calendar-container">
        {Object.values(monthlyData).map(monthData => (
          <div key={monthData.month_key} className="month-calendar">
            <div className="month-header">
              <h2>{formatMonthName(monthData)}</h2>
            </div>
            
            {/* 曜日ヘッダー */}
            <div className="weekday-header">
              {['日', '月', '火', '水', '木', '金', '土'].map(day => (
                <div key={day} className="weekday-cell">{day}</div>
              ))}
            </div>
            
            <div className="calendar-grid">
              {/* 月の最初の日まで空白で埋める */}
              {(() => {
                const firstDay = new Date(monthData.days[0].date);
                const startDay = firstDay.getDay(); // 0=日曜日
                const emptyDays = [];
                for (let i = 0; i < startDay; i++) {
                  emptyDays.push(<div key={`empty-${i}`} className="day-cell empty"></div>);
                }
                return emptyDays;
              })()}
              
              {/* 日付セル */}
              {monthData.days.map(dayData => {
                const dateInfo = formatDateForDisplay(dayData.date);
                
                return (
                  <div
                    key={dayData.date}
                    className={`day-cell ${dayData.status} ${dayData.clickable ? 'clickable' : 'non-clickable'} ${dateInfo.isToday ? 'today' : ''} ${dateInfo.isPast ? 'past' : ''}`}
                    onClick={() => handleDateClick(dayData.date, dayData)}
                    title={`${dayData.date} - ${dayData.display_text}`}
                  >
                    <div className="day-number">{dateInfo.day}</div>
                    <div className="day-status">
                      <span className="status-icon">{dayData.icon}</span>
                    </div>
                    <div className="day-info">
                      <span className="day-weekday">{dateInfo.dayOfWeek}</span>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        ))}
      </div>

      {/* フッター情報 */}
      <div className="calendar-footer">
        <div className="footer-info">
          <p>📅 クリックして予約ページに進めます（⭕️🔺のみ）</p>
          <p>🏨 現在表示中: {locations.find(l => l.id === selectedLocation)?.name}店</p>
        </div>
        
        {/* リフレッシュボタン */}
        <div className="footer-actions">
          <button 
            onClick={() => fetchAvailabilityData(selectedLocation, true)}
            className="refresh-button"
          >
            🔄 最新情報に更新
          </button>
        </div>
      </div>
    </div>
  );
};

export default AvailabilityCalendar;