import React, { useState } from 'react';
import { useLocation, useNavigate, useSearchParams } from 'react-router-dom';
import BookingForm from '../components/BookingForm';
import { createBooking } from '../api';
import './Booking.css';

const Booking = () => {
  const location = useLocation();
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const bookingData = location.state;

  // 🗓️ 空室カレンダーからのURLパラメータを取得
  const calendarLocation = searchParams.get('location');
  const calendarCheckin = searchParams.get('checkin');
  
  console.log('🗓️ 空室カレンダーからのパラメータ:', { 
    location: calendarLocation, 
    checkin: calendarCheckin 
  });

  const [isSubmitting, setIsSubmitting] = useState(false);
  const [submitError, setSubmitError] = useState(null);

  // 🗓️ 空室カレンダーからのアクセスか通常の予約フローかをチェック
  const isFromCalendar = calendarLocation && calendarCheckin;
  
  // bookingDataがない かつ 空室カレンダーからでもない場合はホームページにリダイレクト
  React.useEffect(() => {
    if (!bookingData && !isFromCalendar) {
      navigate('/');
    }
  }, [bookingData, isFromCalendar, navigate]);

  // 宿泊日数を計算
  const calculateNights = (checkIn, checkOut) => {
    if (!checkIn || !checkOut) return 1;
    const start = new Date(checkIn);
    const end = new Date(checkOut);
    const nights = Math.floor((end - start) / (1000 * 60 * 60 * 24));
    return nights > 0 ? nights : 1; // 最小1泊
  };

  // 🔥 料金計算の完全修正
  const calculateCorrectPricing = () => {
    if (!bookingData?.combination) return { basePrice: 1700, totalPrice: 1700, nights: 1 };
    
    const combination = bookingData.combination;
    const bookingSearchParams = bookingData.searchParams;
    
    // 宿泊日数
    const nights = calculateNights(bookingSearchParams.checkIn, bookingSearchParams.checkOut);
    
    // 🔥 重要: combination.total_price は1泊分の料金として扱う
    const basePrice = combination.total_price; // 1泊分
    const totalPrice = basePrice * nights; // 正しい合計金額
    
    console.log('🔥 Booking.js 料金計算:', {
      'combination.total_price (1泊分)': basePrice,
      '宿泊日数': nights,
      '合計金額 (計算結果)': totalPrice,
      '計算式': `₹${basePrice} × ${nights}泊 = ₹${totalPrice}`
    });
    
    return {
      basePrice: basePrice,
      totalPrice: totalPrice,
      nights: nights
    };
  };

  // 予約送信処理
  const handleBookingSubmit = async (formData) => {
    setIsSubmitting(true);
    setSubmitError(null);

    try {
      console.log('予約データ送信開始:', formData);
      
      // 🔥 正しい料金計算
      const pricing = calculateCorrectPricing();
      
      console.log('🔥 送信前料金確認:', {
        '1泊分料金': pricing.basePrice,
        '宿泊日数': pricing.nights,
        '合計金額': pricing.totalPrice
      });
      
      // APIに送信
      const response = await createBooking(formData);
      
      console.log('予約送信成功:', response.data);
      
      // 🔥 成功ページに正確な料金データを渡す
      navigate('/booking-success', {
        state: {
          bookingResult: {
            ...response.data,
            total_amount: pricing.totalPrice // 🔥 正しい合計金額を明示的に設定
          },
          bookingData: {
            ...bookingData,
            // 🔥 料金計算の詳細を明示的に追加
            calculatedTotalPrice: pricing.totalPrice,
            basePrice: pricing.basePrice,
            nights: pricing.nights,
            originalCombinationPrice: bookingData.combination.total_price
          }
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

  // 🗓️ 空室カレンダーからのアクセス時のダミー関数
  const handleCalendarSubmit = async (formData) => {
    console.log('🗓️ 空室カレンダーからの予約は検索ページ経由で行います');
  };

  // 🗓️ 空室カレンダーからのアクセス時の処理
  if (!bookingData && isFromCalendar) {
    return (
      <div className="booking-container">
        <div className="calendar-booking-header">
          <h1>予約フォーム</h1>
          <p className="calendar-info">
            📅 {calendarCheckin} の予約を開始します
          </p>
        </div>
        <BookingForm 
          onSubmit={handleCalendarSubmit}
          isSubmitting={isSubmitting}
          initialLocation={calendarLocation}
          initialCheckin={calendarCheckin}
          fromCalendar={true}
        />
      </div>
    );
  }

  if (!bookingData) {
    return <div className="loading">予約情報を読み込み中...</div>;
  }

  const { combination, searchParams: bookingSearchParams } = bookingData;
  
  // 🔥 表示用の正しい料金計算
  const pricing = calculateCorrectPricing();

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
            <span className="summary-value">{new Date(bookingSearchParams.checkIn).toLocaleDateString('ja-JP')}</span>
          </div>
          <div className="summary-item">
            <span className="summary-label">チェックアウト:</span>
            <span className="summary-value">{new Date(bookingSearchParams.checkOut).toLocaleDateString('ja-JP')}</span>
          </div>
          <div className="summary-item">
            <span className="summary-label">宿泊日数:</span>
            <span className="summary-value">{pricing.nights}泊</span>
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
            <span className="summary-value price">₹{pricing.totalPrice.toLocaleString()}</span>
          </div>
          <div className="summary-item price-breakdown">
            <span className="summary-label">内訳:</span>
            <span className="summary-value">₹{pricing.basePrice.toLocaleString()} × {pricing.nights}泊</span>
          </div>
          
          {/* 🔧 デバッグ情報（開発中のみ表示） */}
          {process.env.NODE_ENV === 'development' && (
            <div className="debug-info" style={{ 
              background: '#f9f9f9', 
              border: '1px solid #ddd',
              padding: '8px', 
              margin: '10px 0', 
              fontSize: '11px',
              borderRadius: '4px'
            }}>
              <strong>🔧 Booking.js 料金デバッグ:</strong><br/>
              combination.total_price: ₹{combination.total_price}<br/>
              宿泊日数: {pricing.nights}泊<br/>
              1泊分料金: ₹{pricing.basePrice}<br/>
              合計金額: ₹{pricing.totalPrice}<br/>
              計算式: ₹{pricing.basePrice} × {pricing.nights} = ₹{pricing.totalPrice}
            </div>
          )}
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