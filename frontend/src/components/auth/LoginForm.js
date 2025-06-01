// src/components/auth/LoginForm.js
import React, { useState } from 'react';
import { useAuth } from '../../contexts/AuthContext';
import './LoginForm.css';

const LoginForm = ({ onSwitchToSignUp, onClose }) => {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const { login, loginWithGoogle, error, clearError } = useAuth();

  const handleSubmit = async (e) => {
    e.preventDefault();
    
    if (!email || !password) {
      return;
    }

    try {
      setLoading(true);
      clearError();
      await login(email, password);
      
      // ログイン成功
      if (onClose) onClose();
      
    } catch (error) {
      console.error('ログインエラー:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleGoogleLogin = async () => {
    try {
      setLoading(true);
      clearError();
      await loginWithGoogle();
      
      // ログイン成功
      if (onClose) onClose();
      
    } catch (error) {
      console.error('Googleログインエラー:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleEmailChange = (e) => {
    setEmail(e.target.value);
    if (error) clearError();
  };

  const handlePasswordChange = (e) => {
    setPassword(e.target.value);
    if (error) clearError();
  };

  return (
    <div className="login-form">
      <div className="form-header">
        <h2>ログイン</h2>
        <p>アカウントにログインしてください</p>
      </div>

      {error && (
        <div className="error-message">
          <span className="error-icon">⚠️</span>
          {error}
        </div>
      )}

      <form onSubmit={handleSubmit} className="auth-form">
        <div className="form-group">
          <label htmlFor="email">メールアドレス</label>
          <input
            type="email"
            id="email"
            value={email}
            onChange={handleEmailChange}
            placeholder="example@email.com"
            required
            disabled={loading}
            className="form-input"
          />
        </div>

        <div className="form-group">
          <label htmlFor="password">パスワード</label>
          <input
            type="password"
            id="password"
            value={password}
            onChange={handlePasswordChange}
            placeholder="パスワードを入力"
            required
            disabled={loading}
            className="form-input"
          />
        </div>

        <button 
          type="submit" 
          disabled={loading || !email || !password}
          className="submit-btn"
        >
          {loading ? (
            <span className="loading">
              <span className="loading-spinner"></span>
              ログイン中...
            </span>
          ) : (
            'ログイン'
          )}
        </button>
      </form>

      <div className="divider">
        <span>または</span>
      </div>

      <button 
        type="button"
        onClick={handleGoogleLogin}
        disabled={loading}
        className="google-btn"
      >
        <svg className="google-logo" width="18" height="18" viewBox="0 0 24 24">
          <path fill="#4285F4" d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"/>
          <path fill="#34A853" d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"/>
          <path fill="#FBBC05" d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z"/>
          <path fill="#EA4335" d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z"/>
        </svg>
        Googleでログイン
      </button>

      <div className="form-footer">
        <p>
          アカウントをお持ちでない方は{' '}
          <button 
            type="button" 
            onClick={onSwitchToSignUp}
            className="link-btn"
            disabled={loading}
          >
            新規登録
          </button>
        </p>
      </div>
    </div>
  );
};

export default LoginForm;