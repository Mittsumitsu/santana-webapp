import React, { useState, useRef, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../contexts/AuthContext';
import LoginForm from './auth/LoginForm';
import SignUpForm from './auth/SignUpForm';
import './Header.css';

const Header = () => {
  const [dropdownOpen, setDropdownOpen] = useState(false);
  const [authModalOpen, setAuthModalOpen] = useState(false);
  const [authMode, setAuthMode] = useState('login'); // 'login' or 'signup'
  const navigate = useNavigate();
  const dropdownRef = useRef(null);
  const timeoutRef = useRef(null);
  
  // 🎯 新IDフォーマット対応の認証情報取得
  const { currentUser, logout, getUserId, getUserData } = useAuth();

  const isLoggedIn = !!currentUser;
  const userId = getUserId(); // 新IDフォーマットのユーザーID
  const userData = getUserData(); // 新IDフォーマットのユーザーデータ

  console.log('🎯 Header認証情報:', {
    isLoggedIn,
    userId,
    firebaseUid: currentUser?.uid,
    displayName: userData?.displayName || currentUser?.displayName
  });

  // 🔧 改善されたドロップダウン制御
  const handleMouseEnter = () => {
    // タイムアウトをクリア（閉じる処理をキャンセル）
    if (timeoutRef.current) {
      clearTimeout(timeoutRef.current);
      timeoutRef.current = null;
    }
    setDropdownOpen(true);
  };

  const handleMouseLeave = () => {
    // 少し遅延させて閉じる（マウスが戻ってきた場合のため）
    timeoutRef.current = setTimeout(() => {
      setDropdownOpen(false);
    }, 200); // 200ms の猶予時間
  };

  // クリックでも開閉できるように
  const handleToggleDropdown = () => {
    setDropdownOpen(!dropdownOpen);
  };

  // 外部クリックで閉じる
  useEffect(() => {
    const handleClickOutside = (event) => {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target)) {
        setDropdownOpen(false);
      }
    };

    document.addEventListener('mousedown', handleClickOutside);
    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
      // クリーンアップ時にタイムアウトもクリア
      if (timeoutRef.current) {
        clearTimeout(timeoutRef.current);
      }
    };
  }, []);

  const handleMenuClick = (path) => {
    setDropdownOpen(false);
    navigate(path);
  };

  const handleLogout = async () => {
    setDropdownOpen(false);
    try {
      await logout();
      console.log('✅ ログアウト完了');
      navigate('/');
    } catch (error) {
      console.error('❌ ログアウトエラー:', error);
      alert('ログアウト中にエラーが発生しました');
    }
  };

  const openAuthModal = (mode) => {
    setAuthMode(mode);
    setAuthModalOpen(true);
  };

  const closeAuthModal = () => {
    setAuthModalOpen(false);
  };

  const switchAuthMode = () => {
    setAuthMode(authMode === 'login' ? 'signup' : 'login');
  };

  // 表示用のユーザー情報
  const displayUser = {
    displayName: userData?.displayName || currentUser?.displayName || 'ユーザー',
    email: userData?.email || currentUser?.email || '',
    userId: userId || 'Unknown',
    userType: userData?.userType || 'guest'
  };

  return (
    <>
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
              <div 
                className="user-menu-container"
                ref={dropdownRef}
                onMouseEnter={handleMouseEnter}
                onMouseLeave={handleMouseLeave}
              >
                <div 
                  className="user-menu-trigger"
                  onClick={handleToggleDropdown}
                >
                  {/* ユーザーアバター */}
                  <div className="user-avatar">
                    {displayUser.displayName?.charAt(0) || 'U'}
                  </div>
                  
                  {/* ユーザー名 */}
                  <span className="user-name">{displayUser.displayName}</span>
                  
                  {/* ドロップダウン矢印 */}
                  <span className={`dropdown-arrow ${dropdownOpen ? 'open' : ''}`}>▼</span>

                  {/* ドロップダウンメニュー */}
                  {dropdownOpen && (
                    <div className="dropdown-menu">
                      <div className="dropdown-header">
                        <div className="dropdown-user-info">
                          <div className="dropdown-avatar">
                            {displayUser.displayName?.charAt(0) || 'U'}
                          </div>
                          <div className="dropdown-details">
                            <div className="dropdown-name">{displayUser.displayName}</div>
                            <div className="dropdown-email">{displayUser.email}</div>
                            {/* 🎯 新IDフォーマット表示（目立たないように） */}
                            <div className="dropdown-id">ID: {displayUser.userId}</div>
                            <div className="dropdown-type">
                              {displayUser.userType === 'guest' ? 'Guest' : 'Admin'}
                            </div>
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
                <button 
                  className="login-btn"
                  onClick={() => openAuthModal('login')}
                >
                  ログイン
                </button>
                <button 
                  className="signup-btn"
                  onClick={() => openAuthModal('signup')}
                >
                  新規登録
                </button>
              </div>
            )}
          </div>
        </div>
      </header>

      {/* 🎯 認証モーダル */}
      {authModalOpen && (
        <div className="auth-modal-overlay" onClick={closeAuthModal}>
          <div className="auth-modal" onClick={(e) => e.stopPropagation()}>
            <button className="auth-modal-close" onClick={closeAuthModal}>
              ×
            </button>
            {authMode === 'login' ? (
              <LoginForm 
                onSwitchToSignUp={switchAuthMode}
                onClose={closeAuthModal}
              />
            ) : (
              <SignUpForm 
                onSwitchToLogin={switchAuthMode}
                onClose={closeAuthModal}
              />
            )}
          </div>
        </div>
      )}
    </>
  );
};

export default Header;