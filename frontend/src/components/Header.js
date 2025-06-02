import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import './Header.css';

const Header = () => {
  const [dropdownOpen, setDropdownOpen] = useState(false);
  const navigate = useNavigate();

  // 認証ユーザーのモックデータ（実際はAuthContextから取得）
  const currentUser = {
    displayName: "テスト太郎",
    email: "oo00mixan00oo@icloud.com",
    userType: "guest"
  };

  const isLoggedIn = !!currentUser;

  const handleDropdownToggle = () => {
    setDropdownOpen(!dropdownOpen);
  };

  const handleMenuClick = (path) => {
    setDropdownOpen(false);
    navigate(path);
  };

  const handleLogout = () => {
    setDropdownOpen(false);
    // ログアウト処理（実際はAuthContextのlogout関数を使用）
    alert('ログアウトしました');
    window.location.href = '/';
  };

  return (
    <header className="header">
      <div className="header-content">
        <div className="logo" onClick={() => navigate('/')}>
          <h1>サンタナゲストハウス</h1>
        </div>
        
        <nav className="nav-menu">
          <ul className="nav-links">
            <li><a href="/">ホーム</a></li>
            <li><a href="/about">施設案内</a></li>
            <li><a href="/contact">お問い合わせ</a></li>
          </ul>
        </nav>

        <div className="auth-section">
          {isLoggedIn ? (
            <div className="user-menu-container">
              <div 
                className="user-menu-trigger"
                onMouseEnter={() => setDropdownOpen(true)}
                onMouseLeave={() => setDropdownOpen(false)}
              >
                {/* ユーザーアバター */}
                <div className="user-avatar">
                  {currentUser.displayName?.charAt(0) || 'U'}
                </div>
                
                {/* ユーザー名 */}
                <span className="user-name">{currentUser.displayName}</span>
                
                {/* ドロップダウン矢印 */}
                <span className="dropdown-arrow">▼</span>

                {/* ドロップダウンメニュー */}
                {dropdownOpen && (
                  <div className="dropdown-menu">
                    <div className="dropdown-header">
                      <div className="dropdown-user-info">
                        <div className="dropdown-avatar">
                          {currentUser.displayName?.charAt(0) || 'U'}
                        </div>
                        <div className="dropdown-details">
                          <div className="dropdown-name">{currentUser.displayName}</div>
                          <div className="dropdown-email">{currentUser.email}</div>
                          <div className="dropdown-type">お客様</div>
                        </div>
                      </div>
                    </div>
                    
                    <div className="dropdown-divider"></div>
                    
                    <div className="dropdown-items">
                      <button 
                        className="dropdown-item"
                        onClick={() => handleMenuClick('/dashboard')}
                      >
                        <span className="dropdown-icon">👤</span>
                        ユーザー情報
                      </button>
                      
                      <button 
                        className="dropdown-item"
                        onClick={() => handleMenuClick('/dashboard')}
                      >
                        <span className="dropdown-icon">📅</span>
                        予約確認
                      </button>
                      
                      <button 
                        className="dropdown-item"
                        onClick={() => handleMenuClick('/dashboard')}
                      >
                        <span className="dropdown-icon">📋</span>
                        予約履歴
                      </button>
                      
                      <button 
                        className="dropdown-item"
                        onClick={() => handleMenuClick('/dashboard')}
                      >
                        <span className="dropdown-icon">⭐</span>
                        お気に入り
                      </button>
                      
                      <button 
                        className="dropdown-item"
                        onClick={() => handleMenuClick('/')}
                      >
                        <span className="dropdown-icon">🏠</span>
                        新規予約
                      </button>
                    </div>
                    
                    <div className="dropdown-divider"></div>
                    
                    <div className="dropdown-footer">
                      <button 
                        className="dropdown-item logout-item"
                        onClick={handleLogout}
                      >
                        <span className="dropdown-icon">🚪</span>
                        ログアウト
                      </button>
                    </div>
                  </div>
                )}
              </div>
            </div>
          ) : (
            <div className="auth-buttons">
              <button className="login-btn">ログイン</button>
              <button className="signup-btn">新規登録</button>
            </div>
          )}
        </div>
      </div>
    </header>
  );
};

export default Header;