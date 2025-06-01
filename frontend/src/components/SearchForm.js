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
  
  const [maleGuests, setMaleGuests] = useState(0);
  const [femaleGuests, setFemaleGuests] = useState(1); // デフォルト1人
  const [location, setLocation] = useState('delhi'); // デフォルトをデリーに変更
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
    { time: "09:00", description: "翌9時", isNextDay: true }
  ];

  // 利用可能なチェックイン時間を計算
  const getAvailableCheckInTimes = () => {
    if (!startDate) return flexibleTimes;
    
    // 明日以降しか選択できないので、全時間利用可能
    return flexibleTimes;
  };

  const handleSubmit = (e) => {
    e.preventDefault();
    
    // 日付が両方選択されているか確認
    if (!startDate || !endDate) {
      alert('チェックイン日とチェックアウト日を選択してください');
      return;
    }
    
    // 人数が1人以上かチェック
    const totalGuests = maleGuests + femaleGuests;
    if (totalGuests === 0) {
      alert('宿泊人数を1人以上入力してください');
      return;
    }
    
    // チェックイン時間が選択されているか確認
    if (!checkInTime) {
      alert('チェックイン時間を選択してください');
      return;
    }
    
    // 店舗が選択されているか確認
    if (!location) {
      alert('ご利用になる店舗を選択してください');
      return;
    }
    
    // 日付をISO文字列に変換
    const checkInStr = startDate.toISOString().split('T')[0];
    const checkOutStr = endDate.toISOString().split('T')[0];
    
    // 検索パラメータをオブジェクトにまとめる
    const searchParams = {
      checkIn: checkInStr,
      checkOut: checkOutStr,
      checkInTime: checkInTime,
      maleGuests: maleGuests,
      femaleGuests: femaleGuests,
      totalGuests: totalGuests,
      location: location
    };
    
    console.log('検索パラメータ:', searchParams);
    
    // 親コンポーネントの検索ハンドラを呼び出す
    onSearch(searchParams);
  };

  // 宿泊日数の計算
  const calculateNights = () => {
    if (startDate && endDate) {
      return Math.floor((endDate - startDate) / (1000 * 60 * 60 * 24));
    }
    return 0;
  };

  // 選択されたチェックイン時間の情報を取得
  const getSelectedTimeInfo = () => {
    const selectedTimeData = flexibleTimes.find(t => t.time === checkInTime);
    return selectedTimeData || null;
  };

  const availableTimes = getAvailableCheckInTimes();
  const selectedTimeInfo = getSelectedTimeInfo();
  const totalGuests = maleGuests + femaleGuests;

  return (
    <div className="search-form">
      <h3>空室を検索</h3>
      <form onSubmit={handleSubmit}>
        <div className="form-layout">
          {/* 日程選択部分（幅広く） */}
          <div className="date-section">
            <label htmlFor="date-range">宿泊日程</label>
            <DatePicker
              id="date-range"
              selectsRange={true}
              startDate={startDate}
              endDate={endDate}
              onChange={(update) => setDateRange(update)}
              minDate={new Date(Date.now() + 24 * 60 * 60 * 1000)} // 明日以降のみ選択可能
              maxDate={new Date(Date.now() + 90 * 24 * 60 * 60 * 1000)} // 3ヶ月後まで
              monthsShown={2}
              className="form-control date-picker"
              placeholderText="日程を選択（クリックして開始日と終了日を選択）"
              locale="ja"
              dateFormat="yyyy/MM/dd"
              isClearable={true}
            />
            {startDate && endDate && (
              <div className="selected-dates">
                <div className="date-info">
                  <span>チェックイン: {startDate.toLocaleDateString('ja-JP')}</span>
                  <span className="nights">{calculateNights()}泊</span>
                  <span>チェックアウト: {endDate.toLocaleDateString('ja-JP')}</span>
                </div>
              </div>
            )}
          </div>
          
          {/* 他の選択肢部分（縮小） */}
          <div className="options-section">
            <div className="form-row">
              {/* 男女別人数入力 */}
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
                <label htmlFor="location">店舗</label>
                <select
                  id="location"
                  value={location}
                  onChange={e => setLocation(e.target.value)}
                  className="form-control"
                  required
                >
                  <option value="delhi">デリー</option>
                  <option value="varanasi">バラナシ</option>
                  <option value="puri">プリー</option>
                </select>
              </div>
            </div>

            {/* 人数サマリー表示 */}
            {totalGuests > 0 && (
              <div className="guest-summary">
                <small className="form-help">
                  合計: {totalGuests}人 
                  {maleGuests > 0 && ` (男性${maleGuests}人`}
                  {femaleGuests > 0 && ` ${maleGuests > 0 ? '女性' : '(女性'}${femaleGuests}人)`}
                </small>
              </div>
            )}

            {/* チェックイン時間選択 */}
            <div className="form-group">
              <label htmlFor="checkInTime">チェックイン時間</label>
              <select
                id="checkInTime"
                value={checkInTime}
                onChange={e => setCheckInTime(e.target.value)}
                className="form-control"
                disabled={!startDate}
              >
                {availableTimes.map(timeOption => (
                  <option key={timeOption.time} value={timeOption.time}>
                    {timeOption.description}
                  </option>
                ))}
              </select>
              {!startDate && (
                <small className="form-help">※ チェックイン日を選択してください</small>
              )}
              {selectedTimeInfo && selectedTimeInfo.isNextDay && startDate && (
                <div className="next-day-notice">
                  <small className="form-help next-day-info">
                    ⚠️ {startDate.toLocaleDateString('ja-JP')}のチェックイン扱いとなります
                    <br />（実際の到着は{new Date(startDate.getTime() + 24 * 60 * 60 * 1000).toLocaleDateString('ja-JP')} 午前{parseInt(selectedTimeInfo.time.split(':')[0])}時）
                  </small>
                </div>
              )}
              {selectedTimeInfo && ['10:00', '11:00'].includes(selectedTimeInfo.time) && (
                <div className="checkin-start-notice">
                  <small className="form-help checkin-start-info">
                    ℹ️ 当日チェックイン開始時間は午前10時以降となります。
                    <br />それより前に到着された場合は前日泊扱いとなります。
                    <br />（荷物預かりも含みます）
                  </small>
                </div>
              )}
            </div>
            
            <button type="submit" className="search-btn" disabled={totalGuests === 0}>
              検索
            </button>
          </div>
        </div>
      </form>
    </div>
  );
};

export default SearchForm;