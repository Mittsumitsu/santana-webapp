// src/components/Header.js - ☕️削除済み
import React, { useState } from 'react';
import { useAuth } from '../contexts/AuthContext';
import LoginForm from './auth/LoginForm';
import SignUpForm from './auth/SignUpForm';
import './Header.css';

const Header = () => {
  const { currentUser, logout } = useAuth();
  const [showAuthModal, setShowAuthModal] = useState(false);
  const [authMode, setAuthMode] = useState('login'); // 'login' or 'signup'

  const handleLogout = async () => {
    try {
      await logout();
    } catch (error) {
      console.error('ログアウトエラー:', error);
    }
  };

  const openLoginModal = () => {
    setAuthMode('login');
    setShowAuthModal(true);
  };

  const openSignUpModal = () => {
    setAuthMode('signup');
    setShowAuthModal(true);
  };

  const closeModal = () => {
    setShowAuthModal(false);
  };

  const switchToSignUp = () => {
    setAuthMode('signup');
  };

  const switchToLogin = () => {
    setAuthMode('login');
  };

  return (
    <>
      <header className="app-header">
        <div className="header-content">
          <div className="header-left">
            <h1>サンタナゲストハウス</h1>
          </div>
          
          <nav className="header-nav">
            <ul>
              <li><a href="/">ホーム</a></li>
              <li><a href="/about">施設案内</a></li>
              <li><a href="/contact">お問い合わせ</a></li>
            </ul>
          </nav>

          <div className="header-auth">
            {currentUser ? (
              <div className="user-menu">
                <span className="user-greeting">
                  {currentUser.displayName || 'ゲスト'}さん
                </span>
                <button 
                  onClick={handleLogout}
                  className="logout-btn"
                >
                  ログアウト
                </button>
              </div>
            ) : (
              <div className="auth-buttons">
                <button 
                  onClick={openLoginModal}
                  className="login-btn"
                >
                  ログイン
                </button>
                <button 
                  onClick={openSignUpModal}
                  className="signup-btn"
                >
                  新規登録
                </button>
              </div>
            )}
          </div>
        </div>
      </header>

      {/* 認証モーダル */}
      {showAuthModal && (
        <div className="modal-overlay" onClick={closeModal}>
          <div className="modal-content" onClick={(e) => e.stopPropagation()}>
            <button 
              className="modal-close"
              onClick={closeModal}
            >
              ×
            </button>
            
            {authMode === 'login' ? (
              <LoginForm 
                onSwitchToSignUp={switchToSignUp}
                onClose={closeModal}
              />
            ) : (
              <SignUpForm 
                onSwitchToLogin={switchToLogin}
                onClose={closeModal}
              />
            )}
          </div>
        </div>
      )}
    </>
  );
};

export default Header;