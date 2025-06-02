# 🏨 サンタナゲストハウス予約システム - Discord通知統合版

[![Node.js](https://img.shields.io/badge/Node.js-16+-green.svg)](https://nodejs.org/)
[![React](https://img.shields.io/badge/React-19+-blue.svg)](https://reactjs.org/)
[![Firebase](https://img.shields.io/badge/Firebase-11+-orange.svg)](https://firebase.google.com/)
[![Discord](https://img.shields.io/badge/Discord-Integration-7289da.svg)](https://discord.com/)
[![Status](https://img.shields.io/badge/Status-Production%20Ready-brightgreen.svg)]()

## 🎯 プロジェクト概要

サンタナゲストハウス（デリー・バラナシ・プリー）の統合予約システム。
高度な組み合わせエンジンと**Discord通知システム**により、運営効率を大幅に向上させます。

## ✨ 完成機能（2025年6月2日時点）

### 🔍 **Phase 1完了: 高度な検索・予約システム**
- **1-3室組み合わせ最適化**: 最大18パターン自動生成
- **男女混合対応**: 性別制限を考慮した適切な部屋配分
- **重複完全除去**: 実質的に同じ組み合わせの排除
- **ユーザーダッシュボード**: 実際のFirestoreデータ読み込み対応
- **管理者ダッシュボード**: カレンダー・データ表示完全対応
- **Firebase完全統合**: バックエンド/フロントエンド完全連携

### 🔔 **Phase 2実装完了: Discord通知システム**

#### **✅ 実装済み通知機能**
- 🆕 **新規予約申請通知**: リアルタイム詳細情報付き通知
- ✅ **予約ステータス変更通知**: 承認/拒否/キャンセル時の自動通知
- 🚨 **システムエラー通知**: 重要アラートの即座配信
- 📊 **日次レポート**: 売上・稼働率の自動分析（午前9時）
- 📋 **週次レポート**: 人気部屋・店舗別実績（毎週月曜10時）
- ⚠️ **メンテナンスアラート**: 運営上の重要な通知

#### **🎨 リッチな通知デザイン**
- **埋め込みメッセージ**: カラフルで見やすい情報表示
- **店舗別情報**: 🏙️デリー 🕉️バラナシ 🏖️プリー 自動識別
- **次のアクション提案**: 運営スタッフへの具体的な指示
- **リアルタイム情報**: 予約ID・金額・人数等の即座表示

#### **⚙️ 自動化システム**
- **node-cronスケジューラー**: インド時間対応の定期実行
- **エラーハンドリング**: 通知失敗時の自動フォールバック
- **手動テスト機能**: 運営者による任意のタイミングでの通知テスト

### 💰 動的料金システム
- **複雑な料金体系**: 部屋タイプ・人数別の正確な計算
- **推奨度評価**: 効率性とコスパを総合評価
- **価格順ソート**: 最適な選択肢を優先表示

### 📱 完璧なUI/UX
- **レスポンシブデザイン**: モバイル・デスクトップ完全対応
- **予約機能**: 完全動作・Firebase連携完了
- **直感的操作**: ワンクリックで詳細表示・予約
- **🆕 管理画面**: カレンダー表示・データ分析機能

## 🏗️ 技術スタック

**バックエンド**: Node.js + Express + Firebase Admin SDK + Discord.js  
**フロントエンド**: React 19.1.0 + CSS3  
**データベース**: Cloud Firestore  
**通知システム**: Discord Webhooks + node-cron  
**API**: RESTful API設計

## 🚀 クイックスタート

### 前提条件
- Node.js v16以上
- Firebase プロジェクト
- Discord サーバー + Webhook URL

### インストール・起動

```bash
# リポジトリクローン
git clone https://github.com/Mittsumitsu/santana-webapp.git
cd santana-webapp

# バックエンド起動
cd backend
npm install
cp .env.example .env  # 環境変数を設定
npm start  # ポート3000

# フロントエンド起動（別ターミナル）
cd frontend
npm install  
npm start  # ポート3001
```

### 環境変数設定

```bash
# backend/.env
FIREBASE_PROJECT_ID=your-project-id
DISCORD_WEBHOOK_BOOKING=https://discord.com/api/webhooks/...
DISCORD_WEBHOOK_ADMIN=https://discord.com/api/webhooks/...
DISCORD_WEBHOOK_ERROR=https://discord.com/api/webhooks/...
DISCORD_WEBHOOK_REPORTS=https://discord.com/api/webhooks/...
```

## 📡 APIエンドポイント

### 予約システム
```http
GET  /api/rooms/available          # 空室検索
POST /api/bookings                 # 予約作成（Discord通知付き）
PUT  /api/bookings/:id             # 予約更新（Discord通知付き）
GET  /api/bookings/user/:userId    # ユーザー予約履歴
```

### Discord通知テスト
```http
POST /api/discord/test/booking     # 手動予約通知テスト
POST /api/discord/test/daily-report # 手動日次レポート
```

## 🎯 アクセスURL

| 機能 | URL | 説明 |
|------|-----|------|
| **ホーム** | http://localhost:3001/ | 空室検索・予約 |
| **ユーザーページ** | http://localhost:3001/dashboard | 予約履歴・プロフィール |
| **管理者ページ** | http://localhost:3001/admin | カレンダー・データ分析 |
| **API** | http://localhost:3000/api | バックエンドAPI |

## 🔧 解決済み技術課題

### Phase 1（予約システム）
1. ✅ **ツイン×2室表示**: 男女混合で同部屋タイプ組み合わせ
2. ✅ **予約ボタン機能**: ESLintエラー解消・動作実装
3. ✅ **重複除去**: 完璧な重複排除システム
4. ✅ **0人部屋除外**: 使用されない部屋の完全除外
5. ✅ **性別制限対応**: ドミトリー男女制限の完璧な処理
6. ✅ **空室状況管理**: 予約済み部屋の自動除外
7. ✅ **Firestore連携**: 完全なバックエンド統合

### Phase 2（Discord通知システム）
8. ✅ **Discord Webhook統合**: 6種類の通知タイプ実装
9. ✅ **リアルタイム通知**: 予約作成・更新時の即座通知
10. ✅ **定期レポート**: cron jobによる自動レポート配信
11. ✅ **エラー監視**: システムエラーの自動検知・通知
12. ✅ **手動テスト機能**: 運営者による通知テスト機能
13. ✅ **インド時間対応**: Asia/Kolkata タイムゾーン設定

## 📊 Discord通知システム仕様

### 通知タイプ一覧

| 通知タイプ | トリガー | 送信先 | 頻度 |
|-----------|---------|--------|------|
| 🆕 新規予約申請 | 予約作成時 | #予約通知 | リアルタイム |
| ✅ 予約承認/拒否 | ステータス更新時 | #管理者通知 | リアルタイム |
| 🚨 システムエラー | エラー発生時 | #エラー通知 | リアルタイム |
| 📊 日次レポート | 毎日午前9時 | #レポート | 自動 |
| 📋 週次レポート | 毎週月曜10時 | #レポート | 自動 |
| ⚠️ メンテナンス | 手動実行 | #管理者通知 | 必要時 |

### 通知内容詳細

#### 新規予約申請通知
- ゲスト情報（氏名・メール）
- 宿泊情報（日程・宿泊数・店舗）
- 人数・料金情報
- 予約ID・次のアクション

#### 日次レポート
- 新規予約・チェックイン・チェックアウト件数
- 今日の売上・月累計売上
- 稼働率・空室数

## 📈 **Phase 3実装予定: 決済・承認システム**

### 💳 **Stripe決済システム（次期優先）**
- **オンライン決済**: クレジットカード・デビットカード対応
- **事前決済**: 送迎サービス等の必須決済
- **現地決済**: 通常宿泊での選択制
- **自動決済リンク**: 承認後の即座生成・送信

### 👥 **手動承認システム**
- **承認管理画面**: ワンクリック承認/拒否
- **24時間承認期限**: 自動期限管理
- **承認基準ガイド**: 一貫した判断基準
- **承認通知**: Discord連携の自動通知

### 🔐 **権限管理システム**
```javascript
権限レベル設計:
├── 👑 管理者: 全機能アクセス
├── 👨‍💼 主要スタッフ×2: 予約管理 + レポート閲覧
├── 👨‍🔧 デリースタッフ: デリー店限定管理
├── 👨‍🔧 バラナシスタッフ: バラナシ店限定管理
└── 👨‍🔧 プリースタッフ: プリー店限定管理
```

## 📁 プロジェクト構成

```
santana-webapp/
├── 📁 backend/               # Node.js/Express API
│   ├── src/
│   │   ├── controllers/      # ビジネスロジック
│   │   │   ├── bookingController.js    # 予約管理（Discord通知統合）
│   │   │   └── roomController.js       # 部屋管理
│   │   ├── services/         # サービス層
│   │   │   ├── discordNotification.js  # Discord通知サービス
│   │   │   └── reportGenerator.js      # レポート生成
│   │   ├── routes/           # API ルート
│   │   │   ├── bookings.js             # 予約API
│   │   │   ├── rooms.js                # 部屋API
│   │   │   └── discord.js              # 通知テストAPI
│   │   └── utils/
│   │       └── scheduler.js            # 定期実行
│   ├── test/
│   │   └── discordTest.js    # Discord通知テスト
│   ├── index.js              # エントリーポイント
│   └── package.json
├── 📁 frontend/              # React Webアプリ
│   ├── src/
│   │   ├── components/       # UIコンポーネント
│   │   │   ├── SearchForm.js           # 検索フォーム
│   │   │   └── RoomCombinations.js     # 組み合わせ表示
│   │   ├── pages/            # ページコンポーネント
│   │   │   ├── Home.js                 # ホーム
│   │   │   ├── UserDashboard.js        # ユーザーページ
│   │   │   └── AdminDashboard.js       # 管理者ページ
│   │   └── api/              # API接続
│   │       └── index.js                # API設定
│   ├── public/               # 静的ファイル
│   └── package.json
├── 📁 docs/                  # ドキュメント
└── README.md                 # このファイル
```

## 🎯 実装フェーズ進捗

### **✅ Phase 1完了: 予約システム基盤**
- ✅ Firebase Authentication設定
- ✅ 空室検索・組み合わせエンジン
- ✅ 予約機能・Firestore連携
- ✅ 基本的なUI/UX
- ✅ ユーザー・管理者ダッシュボード

### **✅ Phase 2完了: Discord通知システム**
- ✅ Discord Webhook統合
- ✅ リアルタイム予約通知
- ✅ 自動レポート配信
- ✅ エラー監視システム
- ✅ 手動テスト機能

### **🔄 Phase 3実装中: 決済・承認システム**
- ⏳ Stripe決済統合
- ⏳ 手動承認フロー
- ⏳ 権限管理システム
- ⏳ 決済完了通知

### **🔮 Phase 4予定: 認証・セキュリティ強化**
- 🔮 多階層権限システム
- 🔮 詳細な監査ログ
- 🔮 異常検知・自動対応
- 🔮 セキュリティダッシュボード

## 🏆 現在の達成状況

### **✅ 実運用可能レベル**
- 予約システム: **100%完成**
- Discord通知: **100%完成**
- 管理機能: **90%完成**
- ユーザーページ: **90%完成**

### **🎯 運営効率向上**
- **リアルタイム通知**: 予約申請から承認まで即座対応
- **自動レポート**: 売上・稼働率の毎日自動分析
- **エラー監視**: システム障害の即座検知・対応
- **一元管理**: 3店舗の統合ダッシュボード

## 💡 Discord通知システムの価値

### **運営側のメリット**
- 📱 **24/7監視**: スマートフォンで常時システム状況把握
- ⚡ **迅速対応**: 新規予約の見逃し防止・タイムリーな承認
- 📊 **データ分析**: 自動レポートによる売上・稼働率把握
- 🚨 **安心運営**: システム障害の即座通知・早期解決

### **ゲスト側のメリット**
- ✅ **迅速な予約確定**: リアルタイム通知による素早い承認
- 📧 **タイムリーな連絡**: 適切なタイミングでの確認メール
- 🛡️ **安定したサービス**: エラー監視による高い稼働率

## 📞 **現在の開発状況**

**🎉 Phase 1-2完全完了**: 予約システム + Discord通知が実運用レベルで稼働  
**🔥 Phase 3開始準備**: Stripe決済システムの設計・実装準備  
**🎯 次のマイルストーン**: 手動承認フロー + 決済完了通知の統合

## 🤝 コントリビューション

### **開発フロー**
1. Issue作成・機能提案
2. Feature ブランチ作成
3. 開発・Discord通知テスト
4. Pull Request
5. レビュー・マージ

### **コミット規約**
```
feat: 新機能追加
fix: バグ修正
docs: ドキュメント更新
style: コードフォーマット
refactor: リファクタリング
discord: Discord通知機能関連
```

## 📝 ライセンス

Private - サンタナゲストハウスグループ専用

## 📞 お問い合わせ

- **プロジェクト**: [GitHub Issues](https://github.com/Mittsumitsu/santana-webapp/issues)
- **サンタナグループ**: [公式サイト](https://santana-hotels.com)
- **Discord通知テスト**: POST `/api/discord/test/booking`

---

**最終更新**: 2025年6月2日  
**現在のフェーズ**: Phase 2完了 - Discord通知システム稼働中  
**次のマイルストーン**: Stripe決済システム + 手動承認フロー実装