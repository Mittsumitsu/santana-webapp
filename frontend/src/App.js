// 📧 認証待ち状態対応版 src/App.js - 完全版
import React from 'react';
import { BrowserRouter as Router, Routes, Route } from 'react-router-dom';
import { AuthProvider, useAuth } from './contexts/AuthContext';
import Header from './components/Header';
import PendingVerificationBanner from './components/PendingVerificationBanner';
import EmailVerificationBanner from './components/EmailVerificationBanner';
import Home from './pages/Home';
import Booking from './pages/Booking';
import BookingSuccess from './pages/BookingSuccess';
import UserDashboard from './pages/UserDashboard';
import AdminDashboard from './pages/AdminDashboard';
import AvailabilityCalendar from './pages/AvailabilityCalendar';
import './App.css';

// 📧 認証状態に応じたバナー表示コンポーネント
const AuthBanners = () => {
  const { getAccessLevel, loading } = useAuth();
  
  // ローディング中は表示しない
  if (loading) return null;
  
  const accessLevel = getAccessLevel();
  
  // 認証待ち状態: オレンジの認証待ちバナー
  if (accessLevel === 'pending') {
    return <PendingVerificationBanner />;
  }
  
  // 未認証状態: 青い認証バナー
  if (accessLevel === 'unverified') {
    return <EmailVerificationBanner />;
  }
  
  // 認証済みまたはゲスト: バナー非表示
  return null;
};

// 🎯 メインAppコンポーネント
function App() {
  return (
    <AuthProvider>
      <Router>
        <div className="app">
          {/* ヘッダー */}
          <Header />

          {/* 📧 認証状態に応じたバナー表示 */}
          <AuthBanners />

          {/* メインコンテンツ */}
          <main className="app-main">
            <Routes>
              {/* ホームページ */}
              <Route path="/" element={<Home />} />
              
              {/* 予約関連ページ */}
              <Route path="/booking" element={<Booking />} />
              <Route path="/booking/:roomId" element={<Booking />} />
              <Route path="/booking-success" element={<BookingSuccess />} />
              
              {/* 空室カレンダー */}
              <Route path="/availability" element={<AvailabilityCalendar />} />
              
              {/* ユーザーダッシュボード */}
              <Route path="/dashboard" element={<UserDashboard />} />
              <Route path="/profile" element={<UserDashboard />} />
              
              {/* 管理者ダッシュボード */}
              <Route path="/admin" element={<AdminDashboard />} />
              <Route path="/admin/bookings" element={<AdminDashboard />} />
              <Route path="/admin/users" element={<AdminDashboard />} />
              
              {/* その他のページ（将来の拡張用） */}
              <Route path="/rooms/:roomId" element={<Home />} />
              <Route path="/about" element={<AboutPage />} />
              <Route path="/contact" element={<ContactPage />} />
              <Route path="/help" element={<HelpPage />} />
              
              {/* 404ページ */}
              <Route path="*" element={<NotFoundPage />} />
            </Routes>
          </main>

          {/* フッター */}
          <footer className="app-footer">
            <div className="footer-content">
              <div className="footer-section">
                <h4>サンタナゲストハウス</h4>
                <p>インド3都市で展開する日本人向けゲストハウス</p>
              </div>
              
              <div className="footer-section">
                <h4>店舗案内</h4>
                <ul>
                  <li>🏙️ デリー店</li>
                  <li>🕉️ バラナシ店</li>
                  <li>🏖️ プリー店</li>
                </ul>
              </div>
              
              <div className="footer-section">
                <h4>サポート</h4>
                <ul>
                  <li><a href="/help">ヘルプ</a></li>
                  <li><a href="/contact">お問い合わせ</a></li>
                  <li><a href="/about">施設案内</a></li>
                </ul>
              </div>
            </div>
            
            <div className="footer-bottom">
              <p>&copy; 2025 サンタナゲストハウス. All rights reserved.</p>
              <p className="footer-version">
                🔥 New ID System v2.0 | 📧 Email Verification Ready
              </p>
            </div>
          </footer>
        </div>
      </Router>
    </AuthProvider>
  );
}

// 📄 将来の拡張用ページコンポーネント（基本版）

const AboutPage = () => (
  <div className="page-container">
    <div className="page-content">
      <h1>施設案内</h1>
      <p>サンタナゲストハウスについての詳細情報です。</p>
      <div className="coming-soon">
        <h2>🚧 準備中</h2>
        <p>このページは現在準備中です。しばらくお待ちください。</p>
        <button onClick={() => window.history.back()}>戻る</button>
      </div>
    </div>
  </div>
);

const ContactPage = () => (
  <div className="page-container">
    <div className="page-content">
      <h1>お問い合わせ</h1>
      <p>ご質問やお問い合わせはこちらからどうぞ。</p>
      <div className="coming-soon">
        <h2>🚧 準備中</h2>
        <p>このページは現在準備中です。しばらくお待ちください。</p>
        <button onClick={() => window.history.back()}>戻る</button>
      </div>
    </div>
  </div>
);

const HelpPage = () => (
  <div className="page-container">
    <div className="page-content">
      <h1>ヘルプ</h1>
      <div className="help-sections">
        <section>
          <h2>📧 メール認証について</h2>
          <p>予約機能をご利用いただくには、メールアドレスの認証が必要です。</p>
          <ol>
            <li>新規登録後、認証メールが自動送信されます</li>
            <li>メールボックスを確認してください</li>
            <li>メール内の認証リンクをクリックしてください</li>
            <li>「認証完了を確認」ボタンで認証状態を更新してください</li>
          </ol>
        </section>
        
        <section>
          <h2>🆔 新IDシステムについて</h2>
          <p>当システムでは読み間違いを防ぐ新しいIDフォーマットを採用しています。</p>
          <ul>
            <li>ユーザーID: U_XXXXXXXX 形式</li>
            <li>予約ID: B_XXXXXXXXXXXX 形式</li>
            <li>電話でのサポート時にも聞き間違いを防げます</li>
          </ul>
        </section>
        
        <section>
          <h2>🏠 予約について</h2>
          <p>3都市の部屋を効率的に検索・予約できます。</p>
          <ul>
            <li>男女別人数指定での検索</li>
            <li>最適な部屋組み合わせの自動提案</li>
            <li>リアルタイムの空室情報</li>
          </ul>
        </section>
      </div>
      
      <div className="back-action">
        <button onClick={() => window.history.back()}>戻る</button>
      </div>
    </div>
  </div>
);

const NotFoundPage = () => (
  <div className="page-container">
    <div className="page-content not-found">
      <div className="not-found-icon">🔍</div>
      <h1>404 - ページが見つかりません</h1>
      <p>お探しのページは存在しないか、移動した可能性があります。</p>
      <div className="not-found-actions">
        <button onClick={() => window.location.href = '/'}>
          🏠 ホームに戻る
        </button>
        <button onClick={() => window.history.back()}>
          ← 前のページに戻る
        </button>
      </div>
    </div>
  </div>
);

export default App;