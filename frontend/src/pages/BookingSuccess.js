import React from 'react';
import { Link, useLocation, useNavigate } from 'react-router-dom';
import '../styles/BookingSuccess.css';

const BookingSuccess = () => {
  const location = useLocation();
  const navigate = useNavigate();
  
  // Booking.jsから渡された予約データを取得
  const bookingResult = location.state?.bookingResult;
  const originalBookingData = location.state?.bookingData;

  // データがない場合はホームページにリダイレクト
  React.useEffect(() => {
    if (!bookingResult && !originalBookingData) {
      navigate('/');
    }
  }, [bookingResult, originalBookingData, navigate]);

  if (!bookingResult && !originalBookingData) {
    return <div className="loading">予約情報を読み込み中...</div>;
  }

  // 表示用データの準備
  const displayData = {
    bookingId: bookingResult?.parent_booking_id || 'BK' + Date.now(),
    checkIn: originalBookingData?.searchParams?.checkIn || '2025-05-20',
    checkOut: originalBookingData?.searchParams?.checkOut || '2025-05-25',
    totalGuests: originalBookingData?.combination?.guest_breakdown?.total || 2,
    roomDescription: originalBookingData?.combination?.description || 'ツインルーム',
    location: getLocationName(originalBookingData?.searchParams?.location) || 'サンタナバラナシ',
    totalPrice: originalBookingData?.combination?.total_price || 8500,
    nights: calculateNights(originalBookingData?.searchParams?.checkIn, originalBookingData?.searchParams?.checkOut)
  };

  function getLocationName(locationId) {
    const locations = {
      'delhi': 'サンタナデリー',
      'varanasi': 'サンタナバラナシ',
      'puri': 'サンタナプリー'
    };
    return locations[locationId] || 'サンタナゲストハウス';
  }

  function calculateNights(checkIn, checkOut) {
    if (!checkIn || !checkOut) return 1;
    const start = new Date(checkIn);
    const end = new Date(checkOut);
    return Math.floor((end - start) / (1000 * 60 * 60 * 24));
  }

  function formatDate(dateString) {
    if (!dateString) return '';
    const date = new Date(dateString);
    return date.toLocaleDateString('ja-JP', {
      year: 'numeric',
      month: 'long',
      day: 'numeric'
    });
  }

  return (
    <div className="booking-success-container">
      <div className="booking-success-card">
        <div className="success-icon">
          <svg xmlns="http://www.w3.org/2000/svg" width="64" height="64" viewBox="0 0 24 24" fill="none" stroke="#4caf50" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
            <path d="M22 11.08V12a10 10 0 1 1-5.93-9.14"></path>
            <polyline points="22 4 12 14.01 9 11.01"></polyline>
          </svg>
        </div>
        
        <h1>🎉 予約が完了しました！</h1>
        <p className="confirmation-text">
          ご予約ありがとうございます。予約確認メールをお送りしました。<br/>
          予約IDは大切に保管してください。
        </p>
        
        <div className="booking-details">
          <h2>📋 予約情報</h2>
          
          <div className="detail-row">
            <span className="detail-label">予約ID:</span>
            <span className="detail-value booking-id">{displayData.bookingId}</span>
          </div>
          
          <div className="detail-row">
            <span className="detail-label">チェックイン:</span>
            <span className="detail-value">{formatDate(displayData.checkIn)}</span>
          </div>
          
          <div className="detail-row">
            <span className="detail-label">チェックアウト:</span>
            <span className="detail-value">{formatDate(displayData.checkOut)}</span>
          </div>

          <div className="detail-row">
            <span className="detail-label">宿泊日数:</span>
            <span className="detail-value">{displayData.nights}泊</span>
          </div>
          
          <div className="detail-row">
            <span className="detail-label">宿泊者数:</span>
            <span className="detail-value">{displayData.totalGuests}名</span>
          </div>
          
          <div className="detail-row">
            <span className="detail-label">部屋タイプ:</span>
            <span className="detail-value">{displayData.roomDescription}</span>
          </div>
          
          <div className="detail-row">
            <span className="detail-label">宿泊施設:</span>
            <span className="detail-value">{displayData.location}</span>
          </div>
          
          <div className="detail-row total-price">
            <span className="detail-label">合計金額:</span>
            <span className="detail-value price">₹{displayData.totalPrice.toLocaleString()}</span>
          </div>
        </div>
        
        <div className="payment-info">
          <h3>💳 お支払い情報</h3>
          <p>予約を確定するには、お支払いが必要です。予約確認メールに記載された手順に従ってお支払いください。</p>
          
          <div className="payment-methods">
            <div className="payment-method">
              <h4>🏦 銀行振込</h4>
              <p>予約確認メールに記載された口座情報にお振込みください。</p>
            </div>
            
            <div className="payment-method">
              <h4>💰 現地払い</h4>
              <p>チェックイン時にフロントでのお支払いも可能です。</p>
            </div>
          </div>
        </div>
        
        <div className="next-steps">
          <h3>📝 次のステップ</h3>
          <ul>
            <li>✉️ 予約確認メールをご確認ください</li>
            <li>💳 お支払い方法を選択し、手続きを完了してください</li>
            <li>❓ ご質問がある場合は、お気軽にお問い合わせください</li>
            <li>📱 チェックイン日の前日に最終確認のご連絡をいたします</li>
          </ul>
        </div>
        
        <div className="contact-info">
          <h3>📞 お問い合わせ</h3>
          <p>ご不明な点がございましたら、以下の方法でお気軽にお問い合わせください：</p>
          <ul>
            <li>📧 メール: info@santana-guesthouse.com</li>
            <li>📱 WhatsApp: +91-XXX-XXX-XXXX</li>
            <li>🌐 ウェブサイト: www.santana-guesthouse.com</li>
          </ul>
        </div>
        
        <div className="success-actions">
          <Link to="/" className="home-btn">🏠 トップページに戻る</Link>
          <button className="print-btn" onClick={() => window.print()}>
            🖨️ この内容を印刷する
          </button>
        </div>
      </div>
    </div>
  );
};

export default BookingSuccess;