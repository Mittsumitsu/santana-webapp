import React, { useState } from 'react';
import { useLocation, useNavigate } from 'react-router-dom';
import BookingForm from '../components/BookingForm';
import { createBooking } from '../api';
import './Booking.css';

const Booking = () => {
  const location = useLocation();
  const navigate = useNavigate();
  const bookingData = location.state;

  const [isSubmitting, setIsSubmitting] = useState(false);
  const [submitError, setSubmitError] = useState(null);

  // bookingDataがない場合はホームページにリダイレクト
  React.useEffect(() => {
    if (!bookingData) {
      navigate('/');
    }
  }, [bookingData, navigate]);

  // 宿泊日数を計算
  const calculateNights = (checkIn, checkOut) => {
    if (!checkIn || !checkOut) return 1;
    const start = new Date(checkIn);
    const end = new Date(checkOut);
    return Math.floor((end - start) / (1000 * 60 * 60 * 24));
  };

  // 正しい合計料金を計算（泊数分）
  const calculateTotalPrice = (combination, nights) => {
    return combination.total_price * nights;
  };

  // 予約送信処理
  const handleBookingSubmit = async (formData) => {
    setIsSubmitting(true);
    setSubmitError(null);

    try {
      console.log('予約データ送信開始:', formData);
      
      // APIに送信
      const response = await createBooking(formData);
      
      console.log('予約送信成功:', response.data);
      
      // 成功ページに遷移（予約結果とオリジナルデータを渡す）
      navigate('/booking-success', {
        state: {
          bookingResult: response.data,
          bookingData: bookingData
        }
      });
      
    } catch (error) {
      console.error('予約送信エラー:', error);
      
      // エラーメッセージの設定
      let errorMessage = '予約の送信に失敗しました。';
      
      if (error.response) {
        // サーバーエラーレスポンス
        if (error.response.status === 400) {
          errorMessage = '入力内容に問題があります。再度ご確認ください。';
        } else if (error.response.status === 409) {
          errorMessage = '選択された部屋が既に予約されています。別の日程をお選びください。';
        } else if (error.response.status >= 500) {
          errorMessage = 'サーバーに一時的な問題が発生しています。しばらく経ってからもう一度お試しください。';
        }
        
        // サーバーからのエラーメッセージがある場合
        if (error.response.data?.error) {
          errorMessage = error.response.data.error;
        }
      } else if (error.request) {
        // ネットワークエラー
        errorMessage = 'ネットワーク接続に問題があります。インターネット接続を確認してください。';
      }
      
      setSubmitError(errorMessage);
      
      // ページトップにスクロール
      window.scrollTo({ top: 0, behavior: 'smooth' });
      
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleGoBack = () => {
    navigate(-1);
  };

  if (!bookingData) {
    return <div className="loading">予約情報を読み込み中...</div>;
  }

  const { combination, searchParams } = bookingData;
  const nights = calculateNights(searchParams.checkIn, searchParams.checkOut);
  const totalPrice = calculateTotalPrice(combination, nights);

  return (
    <div className="booking-container">
      {/* エラーメッセージ表示 */}
      {submitError && (
        <div className="error-banner">
          <div className="error-content">
            <span className="error-icon">⚠️</span>
            <div className="error-message">
              <strong>予約送信エラー</strong>
              <p>{submitError}</p>
            </div>
            <button 
              className="error-close"
              onClick={() => setSubmitError(null)}
            >
              ×
            </button>
          </div>
        </div>
      )}

      {/* 予約概要 */}
      <div className="booking-summary">
        <h2>📋 予約内容の確認</h2>
        <div className="summary-content">
          <div className="summary-item">
            <span className="summary-label">宿泊プラン:</span>
            <span className="summary-value">{combination.description}</span>
          </div>
          <div className="summary-item">
            <span className="summary-label">チェックイン:</span>
            <span className="summary-value">{new Date(searchParams.checkIn).toLocaleDateString('ja-JP')}</span>
          </div>
          <div className="summary-item">
            <span className="summary-label">チェックアウト:</span>
            <span className="summary-value">{new Date(searchParams.checkOut).toLocaleDateString('ja-JP')}</span>
          </div>
          <div className="summary-item">
            <span className="summary-label">宿泊日数:</span>
            <span className="summary-value">{nights}泊</span>
          </div>
          <div className="summary-item">
            <span className="summary-label">宿泊者数:</span>
            <span className="summary-value">
              {combination.guest_breakdown.total}名
              {combination.guest_breakdown.male > 0 && ` (男性${combination.guest_breakdown.male}名`}
              {combination.guest_breakdown.female > 0 && ` ${combination.guest_breakdown.male > 0 ? '女性' : '(女性'}${combination.guest_breakdown.female}名)`}
            </span>
          </div>
          <div className="summary-item total-price">
            <span className="summary-label">合計料金:</span>
            <span className="summary-value price">₹{totalPrice.toLocaleString()}</span>
          </div>
          <div className="summary-item price-breakdown">
            <span className="summary-label">内訳:</span>
            <span className="summary-value">₹{combination.total_price.toLocaleString()} × {nights}泊</span>
          </div>
        </div>
        
        <button className="back-btn" onClick={handleGoBack}>
          ← 宿泊プランを変更する
        </button>
      </div>

      {/* 予約フォーム */}
      <BookingForm 
        bookingData={bookingData}
        onSubmit={handleBookingSubmit}
        loading={isSubmitting}
      />

      {/* 送信中のオーバーレイ */}
      {isSubmitting && (
        <div className="submission-overlay">
          <div className="submission-content">
            <div className="spinner"></div>
            <h3>予約を送信中...</h3>
            <p>しばらくお待ちください</p>
          </div>
        </div>
      )}
    </div>
  );
};

export default Booking;