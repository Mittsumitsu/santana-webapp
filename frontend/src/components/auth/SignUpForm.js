// src/components/auth/SignUpForm.js
import React, { useState } from 'react';
import { useAuth } from '../../contexts/AuthContext';
import './SignUpForm.css';

const SignUpForm = ({ onSwitchToLogin, onClose }) => {
  const [formData, setFormData] = useState({
    displayName: '',
    email: '',
    password: '',
    confirmPassword: ''
  });
  const [loading, setLoading] = useState(false);
  const { signup, loginWithGoogle, error, clearError } = useAuth();

  const handleChange = (e) => {
    const { name, value } = e.target;
    setFormData(prev => ({
      ...prev,
      [name]: value
    }));
    
    if (error) clearError();
  };

  const validateForm = () => {
    if (!formData.displayName.trim()) {
      return 'お名前を入力してください';
    }
    if (!formData.email) {
      return 'メールアドレスを入力してください';
    }
    if (formData.password.length < 6) {
      return 'パスワードは6文字以上で入力してください';
    }
    if (formData.password !== formData.confirmPassword) {
      return 'パスワードが一致しません';
    }
    return null;
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    
    const validationError = validateForm();
    if (validationError) {
      alert(validationError);
      return;
    }

    try {
      setLoading(true);
      clearError();
      
      await signup(formData.email, formData.password, formData.displayName);
      
      // 登録成功
      if (onClose) onClose();
      
    } catch (error) {
      console.error('新規登録エラー:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleGoogleSignUp = async () => {
    try {
      setLoading(true);
      clearError();
      await loginWithGoogle();
      
      // 登録成功
      if (onClose) onClose();
      
    } catch (error) {
      console.error('Google新規登録エラー:', error);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="signup-form">
      <div className="form-header">
        <h2>新規登録</h2>
        <p>アカウントを作成してください</p>
      </div>

      {error && (
        <div className="error-message">
          <span className="error-icon">⚠️</span>
          {error}
        </div>
      )}

      <form onSubmit={handleSubmit} className="auth-form">
        <div className="form-group">
          <label htmlFor="displayName">お名前</label>
          <input
            type="text"
            id="displayName"
            name="displayName"
            value={formData.displayName}
            onChange={handleChange}
            placeholder="田中 太郎"
            required
            disabled={loading}
            className="form-input"
          />
        </div>

        <div className="form-group">
          <label htmlFor="email">メールアドレス</label>
          <input
            type="email"
            id="email"
            name="email"
            value={formData.email}
            onChange={handleChange}
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
            name="password"
            value={formData.password}
            onChange={handleChange}
            placeholder="6文字以上で入力"
            required
            disabled={loading}
            className="form-input"
          />
        </div>

        <div className="form-group">
          <label htmlFor="confirmPassword">パスワード確認</label>
          <input
            type="password"
            id="confirmPassword"
            name="confirmPassword"
            value={formData.confirmPassword}
            onChange={handleChange}
            placeholder="パスワードを再入力"
            required
            disabled={loading}
            className="form-input"
          />
        </div>

        <button 
          type="submit" 
          disabled={loading}
          className="submit-btn"
        >
          {loading ? (
            <span className="loading">
              <span className="loading-spinner"></span>
              登録中...
            </span>
          ) : (
            'アカウント作成'
          )}
        </button>
      </form>

      <div className="divider">
        <span>または</span>
      </div>

      <button 
        type="button"
        onClick={handleGoogleSignUp}
        disabled={loading}
        className="google-btn"
      >
        <svg className="google-logo" width="18" height="18" viewBox="0 0 24 24">
          <path fill="#4285F4" d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"/>
          <path fill="#34A853" d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"/>
          <path fill="#FBBC05" d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z"/>
          <path fill="#EA4335" d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z"/>
        </svg>
        Googleで新規登録
      </button>

      <div className="form-footer">
        <p>
          既にアカウントをお持ちの方は{' '}
          <button 
            type="button" 
            onClick={onSwitchToLogin}
            className="link-btn"
            disabled={loading}
          >
            ログイン
          </button>
        </p>
      </div>
    </div>
  );
};

export default SignUpForm;