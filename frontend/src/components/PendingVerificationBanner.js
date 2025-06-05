// 📧 認証待ち状態専用バナーコンポーネント
import React, { useState, useEffect } from 'react';
import { useAuth } from '../contexts/AuthContext';
import './PendingVerificationBanner.css';

const PendingVerificationBanner = () => {
  const { 
    pendingVerification,
    sendVerificationEmail, 
    checkEmailVerification, 
    getAccessLevel,
    logout
  } = useAuth();
  
  const [loading, setLoading] = useState(false);
  const [checking, setChecking] = useState(false);
  const [message, setMessage] = useState('');
  const [countdown, setCountdown] = useState(0);

  const accessLevel = getAccessLevel();
  const isPending = accessLevel === 'pending' && pendingVerification;

  // カウントダウンタイマー
  useEffect(() => {
    if (countdown > 0) {
      const timer = setTimeout(() => setCountdown(countdown - 1), 1000);
      return () => clearTimeout(timer);
    }
  }, [countdown]);

  // 認証メール再送信
  const handleResendEmail = async () => {
    try {
      setLoading(true);
      setMessage('');
      
      await sendVerificationEmail(); // result 変数を削除
      setMessage('📧 認証メールを再送信しました。メールボックスを確認してください。');
      setCountdown(60); // 60秒のクールダウン
      
    } catch (error) {
      setMessage(`❌ エラー: ${error.message}`);
    } finally {
      setLoading(false);
    }
  };

  // 認証状態確認
  const handleCheckVerification = async () => {
    try {
      setChecking(true);
      setMessage('');
      
      const isVerified = await checkEmailVerification();
      
      if (isVerified) {
        setMessage('✅ メール認証が完了しました！自動的にログインします...');
        // checkEmailVerification内で自動ログインされる
      } else {
        setMessage('📧 まだ認証が完了していません。メールボックスを確認してリンクをクリックしてください。');
      }
      
    } catch (error) {
      setMessage(`❌ 確認エラー: ${error.message}`);
    } finally {
      setChecking(false);
    }
  };

  // 別のアカウントでログイン
  const handleLoginDifferentAccount = async () => {
    try {
      await logout();
      setMessage('');
    } catch (error) {
      console.error('ログアウトエラー:', error);
    }
  };

  // 認証待ち状態でない場合は表示しない
  if (!isPending) {
    return null;
  }

  return (
    <div className="pending-verification-banner">
      <div className="banner-content">
        <div className="banner-icon">📧</div>
        
        <div className="banner-text">
          <h3>メール認証をお待ちしています</h3>
          <p>
            <strong>{pendingVerification.email}</strong> 宛に認証メールを送信しました。
            <br />
            メール内のリンクをクリックして認証を完了してください。
          </p>
        </div>
        
        <div className="banner-actions">
          <button 
            className="resend-btn"
            onClick={handleResendEmail}
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
              '認証メール再送信'
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
          
          <button 
            className="logout-btn"
            onClick={handleLoginDifferentAccount}
          >
            別のアカウント
          </button>
        </div>
      </div>
      
      {message && (
        <div className={`banner-message ${
          message.includes('✅') ? 'success' : 
          message.includes('❌') ? 'error' : 'info'
        }`}>
          {message}
        </div>
      )}
      
      <div className="verification-help">
        <details>
          <summary>📋 認証メールが届かない場合</summary>
          <div className="help-content">
            <ul>
              <li>📁 迷惑メールフォルダを確認してください</li>
              <li>⏰ 数分待ってから再送信してください</li>
              <li>📧 メールアドレスが正しいか確認してください</li>
              <li>🔄 ページを更新してから再試行してください</li>
            </ul>
          </div>
        </details>
      </div>
    </div>
  );
};

export default PendingVerificationBanner;