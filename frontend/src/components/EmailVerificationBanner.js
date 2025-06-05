// 📧 メール認証バナーコンポーネント
import React, { useState, useEffect } from 'react';
import { useAuth } from '../contexts/AuthContext';
import './EmailVerificationBanner.css';

const EmailVerificationBanner = () => {
  const { 
    currentUser, 
    sendVerificationEmail, 
    checkEmailVerification, 
    refreshAuthState,
    getAccessLevel,
    emailVerificationSent 
  } = useAuth();
  
  const [loading, setLoading] = useState(false);
  const [message, setMessage] = useState('');
  const [checking, setChecking] = useState(false);
  const [countdown, setCountdown] = useState(0);

  const accessLevel = getAccessLevel();
  const isUnverified = accessLevel === 'unverified';

  // カウントダウンタイマー
  useEffect(() => {
    if (countdown > 0) {
      const timer = setTimeout(() => setCountdown(countdown - 1), 1000);
      return () => clearTimeout(timer);
    }
  }, [countdown]);

  // 認証メール送信
  const handleSendVerification = async () => {
    try {
      setLoading(true);
      setMessage('');
      
      const result = await sendVerificationEmail();
      setMessage(result.message);
      setCountdown(60); // 60秒のクールダウン
      
    } catch (error) {
      setMessage(`エラー: ${error.message}`);
    } finally {
      setLoading(false);
    }
  };

  // 認証状態確認
  const handleCheckVerification = async () => {
    try {
      setChecking(true);
      
      const isVerified = await checkEmailVerification();
      
      if (isVerified) {
        setMessage('✅ メール認証が完了しました！');
        await refreshAuthState();
      } else {
        setMessage('まだ認証が完了していません。メールボックスを確認してください。');
      }
      
    } catch (error) {
      setMessage(`確認エラー: ${error.message}`);
    } finally {
      setChecking(false);
    }
  };

  // 認証済みまたはログインしていない場合は表示しない
  if (!isUnverified) {
    return null;
  }

  return (
    <div className="email-verification-banner">
      <div className="banner-content">
        <div className="banner-icon">📧</div>
        
        <div className="banner-text">
          <h3>メールアドレスの認証が必要です</h3>
          <p>
            予約機能をご利用いただくには、メールアドレスの認証が必要です。
            {currentUser?.email} 宛に認証メールを送信してください。
          </p>
        </div>
        
        <div className="banner-actions">
          <button 
            className="verify-btn"
            onClick={handleSendVerification}
            disabled={loading || countdown > 0}
          >
            {loading ? (
              <span className="loading">
                <span className="loading-spinner"></span>
                送信中...
              </span>
            ) : countdown > 0 ? (
              `再送信 (${countdown}s)`
            ) : (
              '認証メール送信'
            )}
          </button>
          
          <button 
            className="check-btn"
            onClick={handleCheckVerification}
            disabled={checking}
          >
            {checking ? (
              <span className="loading">
                <span className="loading-spinner"></span>
                確認中...
              </span>
            ) : (
              '認証完了を確認'
            )}
          </button>
        </div>
      </div>
      
      {message && (
        <div className={`banner-message ${message.includes('✅') ? 'success' : message.includes('エラー') ? 'error' : 'info'}`}>
          {message}
        </div>
      )}
      
      {emailVerificationSent && !message && (
        <div className="banner-message info">
          📧 認証メールを送信しました。メールボックスを確認してください。
        </div>
      )}
    </div>
  );
};

export default EmailVerificationBanner;