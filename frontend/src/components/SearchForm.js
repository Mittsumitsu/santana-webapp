import React, { useState } from 'react';
import DatePicker from 'react-datepicker';
import { registerLocale } from 'react-datepicker';
import ja from 'date-fns/locale/ja';
import 'react-datepicker/dist/react-datepicker.css';
import './SearchForm.css';

// 日本語ロケールを登録
registerLocale('ja', ja);

const SearchForm = ({ onSearch }) => {
  // 日付範囲の状態
  const [dateRange, setDateRange] = useState([null, null]);
  const [startDate, endDate] = dateRange;
  
  const [maleGuests, setMaleGuests] = useState(2); // デフォルト2人（コンソールログと一致）
  const [femaleGuests, setFemaleGuests] = useState(1); // デフォルト1人
  const [location, setLocation] = useState('delhi'); // 必ずデリーをデフォルトに
  const [checkInTime, setCheckInTime] = useState('14:00'); // デフォルト午後2時

  // チェックイン時間の選択肢
  const flexibleTimes = [
    { time: "10:00", description: "午前10時", isNextDay: false },
    { time: "11:00", description: "午前11時", isNextDay: false },
    { time: "12:00", description: "正午", isNextDay: false },
    { time: "13:00", description: "午後1時", isNextDay: false },
    { time: "14:00", description: "午後2時", isNextDay: false },
    { time: "15:00", description: "午後3時", isNextDay: false },
    { time: "16:00", description: "午後4時", isNextDay: false },
    { time: "17:00", description: "午後5時", isNextDay: false },
    { time: "18:00", description: "午後6時", isNextDay: false },
    { time: "19:00", description: "午後7時", isNextDay: false },
    { time: "20:00", description: "午後8時", isNextDay: false },
    { time: "21:00", description: "午後9時", isNextDay: false },
    { time: "22:00", description: "午後10時", isNextDay: false },
    { time: "23:00", description: "午後11時", isNextDay: false },
    { time: "00:00", description: "深夜0時", isNextDay: false },
    { time: "01:00", description: "翌1時", isNextDay: true },
    { time: "02:00", description: "翌2時", isNextDay: true },
    { time: "03:00", description: "翌3時", isNextDay: true },
    { time: "04:00", description: "翌4時", isNextDay: true },
    { time: "05:00", description: "翌5時", isNextDay: true },
    { time: "06:00", description: "翌6時", isNextDay: true },
    { time: "07:00", description: "翌7時", isNextDay: true },
    { time: "08:00", description: "翌8時", isNextDay: true },
    { time: "09:00", description: "翌9時", isNextDay: true },
  ];

  // 合計人数計算
  const totalGuests = maleGuests + femaleGuests;

  // 検索実行
  const handleSubmit = (e) => {
    e.preventDefault();
    
    // 必須フィールドの検証
    if (!startDate || !endDate) {
      alert('宿泊期間を選択してください。');
      return;
    }

    if (totalGuests === 0) {
      alert('宿泊人数を1人以上選択してください。');
      return;
    }

    // locationが'any'の場合はdelhiに変更
    const validLocation = location === 'any' ? 'delhi' : location;

    // 日付フォーマット (YYYY-MM-DD)
    const formatDate = (date) => {
      const year = date.getFullYear();
      const month = String(date.getMonth() + 1).padStart(2, '0');
      const day = String(date.getDate()).padStart(2, '0');
      return `${year}-${month}-${day}`;
    };

    const searchParams = {
      checkIn: formatDate(startDate),
      checkOut: formatDate(endDate),
      checkInTime,
      maleGuests,
      femaleGuests,
      totalGuests,
      location: validLocation // 確実に有効な値を送信
    };

    console.log('🔍 検索パラメータ送信:', searchParams);
    onSearch(searchParams);
  };

  return (
    <form onSubmit={handleSubmit} className="search-form">
      <div className="search-container">
        <h2>空室を検索</h2>
        
        {/* 宿泊日程 */}
        <div className="form-section">
          <div className="form-group full-width">
            <label htmlFor="dateRange">宿泊日程</label>
            <DatePicker
              selectsRange={true}
              startDate={startDate}
              endDate={endDate}
              onChange={(update) => setDateRange(update)}
              isClearable={true}
              placeholderText="チェックイン日 - チェックアウト日"
              className="form-control date-picker"
              locale="ja"
              dateFormat="yyyy/MM/dd"
              minDate={new Date()}
              required
            />
          </div>

          {/* 日程表示 */}
          {startDate && endDate && (
            <div className="date-summary">
              <div className="date-info">
                <div className="date-item">
                  <span className="label">チェックイン:</span>
                  <span className="value">{startDate.toLocaleDateString('ja-JP')}</span>
                </div>
                <div className="date-item">
                  <span className="label">チェックアウト:</span>
                  <span className="value">{endDate.toLocaleDateString('ja-JP')}</span>
                </div>
                <div className="date-item nights">
                  <span className="label">宿泊数:</span>
                  <span className="value">
                    {Math.ceil((endDate - startDate) / (1000 * 60 * 60 * 24))}泊
                  </span>
                </div>
              </div>
            </div>
          )}
        </div>

        {/* 人数と店舗選択 */}
        <div className="form-section">
          <div className="form-row">
            <div className="form-group compact">
              <label htmlFor="maleGuests">男性人数</label>
              <select
                id="maleGuests"
                value={maleGuests}
                onChange={e => setMaleGuests(parseInt(e.target.value))}
                className="form-control"
              >
                {[0, 1, 2, 3, 4].map(num => (
                  <option key={num} value={num}>{num}人</option>
                ))}
              </select>
            </div>
            <div className="form-group compact">
              <label htmlFor="femaleGuests">女性人数</label>
              <select
                id="femaleGuests"
                value={femaleGuests}
                onChange={e => setFemaleGuests(parseInt(e.target.value))}
                className="form-control"
              >
                {[0, 1, 2, 3, 4].map(num => (
                  <option key={num} value={num}>{num}人</option>
                ))}
              </select>
            </div>
            <div className="form-group compact">
              <label htmlFor="location">店舗 *</label>
              <select
                id="location"
                value={location}
                onChange={e => setLocation(e.target.value)}
                className="form-control"
                required
              >
                <option value="delhi">🏙️ デリー</option>
                <option value="varanasi">🕉️ バラナシ</option>
                <option value="puri">🏖️ プリー</option>
              </select>
            </div>
          </div>

          {/* 人数サマリー表示 */}
          {totalGuests > 0 && (
            <div className="guest-summary">
              <small className="form-help">
                合計: {totalGuests}人 
                {maleGuests > 0 && ` (男性${maleGuests}人`}
                {femaleGuests > 0 && ` ${maleGuests > 0 ? ', ' : '('}女性${femaleGuests}人)`}
                {maleGuests > 0 && femaleGuests === 0 && ')'}
              </small>
            </div>
          )}
        </div>

        {/* チェックイン時間 */}
        <div className="form-section">
          <div className="form-group">
            <label htmlFor="checkInTime">チェックイン時間</label>
            <select
              id="checkInTime"
              value={checkInTime}
              onChange={e => setCheckInTime(e.target.value)}
              className="form-control"
            >
              {flexibleTimes.map(({ time, description, isNextDay }) => (
                <option key={time} value={time}>
                  {description} {isNextDay && '(翌日)'}
                </option>
              ))}
            </select>
          </div>
        </div>

        {/* 検索ボタン */}
        <div className="form-actions">
          <button type="submit" className="search-btn">
            検索
          </button>
        </div>
      </div>
    </form>
  );
};

export default SearchForm;