// 📧 予約アクセス制御コンポーネント
import React from 'react';
import { useAuth } from '../contexts/AuthContext';
import EmailVerificationBanner from './EmailVerificationBanner';
import './BookingAccessControl.css';

/**
 * 予約機能のアクセス制御ラッパーコンポーネント
 * メール認証済みユーザーのみ予約可能
 */
const BookingAccessControl = ({ children, feature = "予約機能" }) => {
  const { currentUser, getAccessLevel, canMakeBooking } = useAuth();
  
  const accessLevel = getAccessLevel();
  
  // ログインしていない場合
  if (accessLevel === 'guest') {
    return (
      <div className="access-control-container">
        <div className="access-denied">
          <div className="access-denied-icon">🔒</div>
          <h2>ログインが必要です</h2>
          <p>{feature}をご利用いただくには、アカウントにログインしてください。</p>
          <div className="access-denied-actions">
            <button 
              className="login-btn"
              onClick={() => window.location.href = '/'}
            >
              ログイン・新規登録
            </button>
          </div>
        </div>
      </div>
    );
  }
  
  // メール認証未完了の場合
  if (accessLevel === 'unverified') {
    return (
      <div className="access-control-container">
        <EmailVerificationBanner />
        
        <div className="access-limited">
          <div className="access-limited-icon">📧</div>
          <h2>メール認証が必要です</h2>
          <p>
            {feature}をご利用いただくには、メールアドレスの認証が必要です。
            <br />
            上記のバナーから認証メールを送信してください。
          </p>
          
          <div className="verification-steps">
            <h3>認証手順</h3>
            <ol>
              <li>
                <strong>認証メール送信</strong>
                <br />
                上の「認証メール送信」ボタンをクリック
              </li>
              <li>
                <strong>メール確認</strong>
                <br />
                {currentUser?.email} のメールボックスを確認
              </li>
              <li>
                <strong>リンククリック</strong>
                <br />
                メール内の認証リンクをクリック
              </li>
              <li>
                <strong>認証完了確認</strong>
                <br />
                「認証完了を確認」ボタンをクリック
              </li>
            </ol>
          </div>
          
          <div className="help-section">
            <h4>📋 よくある質問</h4>
            <details>
              <summary>メールが届かない場合</summary>
              <div className="help-content">
                <ul>
                  <li>迷惑メールフォルダを確認してください</li>
                  <li>数分待ってから再送信してください</li>
                  <li>メールアドレスが正しいか確認してください</li>
                </ul>
              </div>
            </details>
            
            <details>
              <summary>認証リンクをクリックしても反映されない</summary>
              <div className="help-content">
                <ul>
                  <li>ページを更新してください</li>
                  <li>「認証完了を確認」ボタンをクリックしてください</li>
                  <li>一度ログアウトして再ログインしてください</li>
                </ul>
              </div>
            </details>
          </div>
        </div>
      </div>
    );
  }
  
  // 認証済みの場合は通常通り表示
  return (
    <div className="access-control-container">
      {children}
    </div>
  );
};

/**
 * 予約ボタン用のアクセス制御コンポーネント
 */
export const BookingButton = ({ onClick, disabled, children, ...props }) => {
  const { canMakeBooking, getAccessLevel } = useAuth();
  
  const accessLevel = getAccessLevel();
  const isAccessible = canMakeBooking();
  
  const getButtonText = () => {
    if (accessLevel === 'guest') return 'ログインして予約';
    if (accessLevel === 'unverified') return 'メール認証が必要';
    return children || '予約する';
  };
  
  const getButtonClass = () => {
    let baseClass = 'booking-button';
    if (!isAccessible) baseClass += ' booking-button-disabled';
    return baseClass;
  };
  
  const handleClick = (e) => {
    if (!isAccessible) {
      e.preventDefault();
      
      if (accessLevel === 'guest') {
        // ログインモーダルを開く（実装に応じて調整）
        alert('ログインが必要です。ページ上部からログインしてください。');
      } else if (accessLevel === 'unverified') {
        // メール認証へのスクロール
        const banner = document.querySelector('.email-verification-banner');
        if (banner) {
          banner.scrollIntoView({ behavior: 'smooth' });
        } else {
          alert('メール認証が必要です。ページ上部から認証メールを送信してください。');
        }
      }
      return;
    }
    
    if (onClick) {
      onClick(e);
    }
  };
  
  return (
    <button
      {...props}
      className={getButtonClass()}
      onClick={handleClick}
      disabled={disabled}
      title={!isAccessible ? '予約にはメール認証が必要です' : ''}
    >
      {getButtonText()}
    </button>
  );
};

export default BookingAccessControl;