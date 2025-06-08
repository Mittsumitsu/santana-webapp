# 🏨 サンタナゲストハウス予約システム

[![Node.js](https://img.shields.io/badge/Node.js-22+-green.svg)](https://nodejs.org/)
[![React](https://img.shields.io/badge/React-19+-blue.svg)](https://reactjs.org/)
[![Firebase](https://img.shields.io/badge/Firebase-11+-orange.svg)](https://firebase.google.com/)
[![Phase](https://img.shields.io/badge/Phase-3.2.0--Data--Normalization--Prep-orange.svg)]()
[![License](https://img.shields.io/badge/License-MIT-yellow.svg)](LICENSE)
[![Status](https://img.shields.io/badge/Status-データ正規化準備中-orange.svg)]()

> **🔄 Phase 3.2開発中！データ正規化 + プライバシー強化 + 予約情報表示改善**  
> お客様向け部屋番号完全非表示 + 新IDシステム統一 + 運営・顧客体験の完全分離による次世代予約システム

![サンタナゲストハウス予約システム](https://via.placeholder.com/800x400/FF6B35/white?text=Santana+Booking+System+v3.2+Data+Normalization)

## 🎯 プロジェクト概要

インド3都市（🏙️デリー・🕉️バラナシ・🏖️プリー）で展開するサンタナゲストハウスの統合予約システム。
**プライバシー重視のデータ正規化** + **完全新IDシステム統一** + **顧客・運営インターフェース分離**により、従来の宿泊管理を完全に革新します。

### 🌟 Phase 3.2開発方針

- **🔒 プライバシー保護**: お客様に部屋番号を一切表示しない設計
- **🆔 データ正規化**: 全システムを新IDフォーマットに統一
- **🏗️ アーキテクチャ刷新**: 運営・顧客向けインターフェース完全分離
- **🎨 予約表示改善**: 日付・部屋タイプのみの洗練された表示
- **🔧 開発環境整備**: 完璧なデータ構造での継続開発基盤

## 🔄 **Phase 3.2新機能：データ正規化 + プライバシー強化**

### 🔒 **完全プライバシー保護モデル**

```javascript
お客様が見る情報（完全設計）:
✅ 日付: 2025年6月15日 〜 2025年6月17日
✅ 部屋タイプ: デラックスルーム
✅ 店舗: デリー店  
✅ 料金: ₹2,300/泊
✅ 設備: 専用バス・トイレ、エアコン
✅ 宿泊者数: 2名

❌ 部屋番号: 303 (完全非表示)
❌ 内部ID: R_2BWH77 (完全非表示)  
❌ フロア情報: 3階 (完全非表示)
❌ 管理者情報: 一切非表示
```

### 🆔 **新IDシステム完全統一**

```javascript
Phase 3.2統一ID構造:
users: U_XXXXXXXX (8文字・読みやすさ重視)
bookings: B_XXXXXXXXXXXX (12文字・一意性確保)
rooms: R_XXXXXX (6文字・管理効率化)
room_types: RT_XXXXX (5文字・カテゴリ管理)
locations: L_XXXXX (5文字・店舗管理)

✅ 旧IDシステム完全除去
✅ アプリケーション・データベース完全統一
✅ 運営効率さらなる向上
✅ 将来拡張性確保
```

### 🏗️ **room_allocationテーブル新設計**

```javascript
// お客様予約層（顧客向け）
customer_booking: {
  booking_id: "B_ABC123DEF456",
  user_id: "U_B9Z3BRJN", 
  requested_room_type: "deluxe",
  location: "delhi",
  guests: 2,
  check_in_date: "2025-06-15",
  check_out_date: "2025-06-17",
  display_info: {
    room_type_name: "デラックスルーム",
    location_name: "デリー店",
    total_amount: 4600
  }
}

// 運営管理層（スタッフ専用）
room_allocation: {
  allocation_id: "A_XYZ789",
  booking_id: "B_ABC123DEF456",
  assigned_room_id: "R_2BWH77",
  room_number: "303",
  floor: 3,
  assigned_by: "STAFF_USER_ID",
  assigned_at: "2025-06-01T10:00:00Z"
}
```

### 📧 **改善されたメール・通知システム**

```javascript
予約確認メール（改善版）:
---
件名: ご予約確定のお知らせ - サンタナゲストハウス

デリー店 デラックスルーム
チェックイン: 2025年6月15日 14:00以降
チェックアウト: 2025年6月17日 11:00まで  
ご宿泊者数: 2名
料金: ₹4,600 (2泊分)

設備: 専用バス・トイレ、エアコン、冷蔵庫

お客様のご予約は確定しております。
チェックイン時にフロントまでお越しください。
---

❌ 部屋番号記載なし（完全プライバシー保護）
✅ 必要な情報のみ簡潔に表示
```

## 🏆 **Phase 3.1完成の継承機能**

### 📧 **完全メール認証システム（継承）**
- [x] 日本語メール + 段階的アクセス制御
- [x] 認証前予約完全ブロック 
- [x] 美しいUI制御・認証状態別バナー

### 🎨 **改善されたUI/UX（継承）**
- [x] 直感的ドロップダウンメニュー
- [x] 200ms猶予時間・滑らかなアニメーション
- [x] 完全レスポンシブ・モバイル最適化

### 🧠 **高度な組み合わせ最適化（継承）**
- [x] 1〜3室の複雑な組み合わせ計算
- [x] 効率性25%以上フィルタ・重複除去
- [x] 推奨度スコア・動的料金システム

## 🔧 **Phase 3.2で解決する課題**

### 🚨 **現在の問題点**
```javascript
❌ データ構造不整合:
   - Firestoreドキュメント ID: R_2BWH77
   - アプリケーション参照: delhi-302
   → 予約作成時エラー発生

❌ 部屋番号露出:
   - お客様に部屋番号（303等）が表示される
   - プライバシー・セキュリティ上の懸念

❌ 新旧IDシステム混在:
   - 一部旧形式ID残存
   - システム一貫性不足
```

### ✅ **Phase 3.2解決策**
```javascript
✅ 完全データ正規化:
   - 全IDを新システムに統一
   - アプリ・DB完全整合性確保

✅ プライバシー強化:
   - お客様向け表示から部屋番号完全除去
   - 部屋タイプ・日付のみ表示

✅ 運営・顧客分離:
   - room_allocationテーブルで管理分離
   - 適切な権限レベル実装
```

## ⚡ クイックスタート

### 1. 環境準備

```bash
# Node.js v22以上 確認
node --version

# リポジトリクローン
git clone https://github.com/Mittsumitsu/santana-webapp.git
cd santana-webapp
```

### 2. Firebase設定

```bash
# Firebase Console設定
# 1. Authentication 有効化 (Email/Password + Google)
# 2. Firestore Database 作成  
# 3. メール認証テンプレート日本語設定

# フロントエンド環境変数 (.env.local)
REACT_APP_FIREBASE_API_KEY=your_api_key
REACT_APP_FIREBASE_AUTH_DOMAIN=your_project.firebaseapp.com
REACT_APP_FIREBASE_PROJECT_ID=your_project_id
REACT_APP_FIREBASE_STORAGE_BUCKET=your_project.appspot.com
REACT_APP_FIREBASE_MESSAGING_SENDER_ID=123456789
REACT_APP_FIREBASE_APP_ID=1:123456789:web:abcdef

# バックエンド設定
# backend/src/serviceAccount.json にサービスアカウントキー配置
```

### 3. インストール・起動

```bash
# バックエンド起動
cd backend
npm install
npm start  # 🚀 http://localhost:3000

# フロントエンド起動（別ターミナル）
cd frontend
npm install  
npm start  # 🌐 http://localhost:3001
```

### 4. Phase 3.2開発確認

```bash
# 現在実装済み
✅ ユーザー認証・ダッシュボード
✅ 基本予約システム
✅ メール認証システム

# Phase 3.2実装予定
🔄 データ正規化スクリプト
🔄 プライバシー保護UI改修
🔄 room_allocationテーブル実装
🔄 管理者・顧客インターフェース分離
```

## 🏗️ 技術スタック

### フロントエンド
- **React 19.1.0** - 最新コンポーネントライブラリ
- **CSS3** - カスタムレスポンシブデザイン + アニメーション
- **Axios** - 効率的API通信
- **React Router DOM** - SPA完全対応

### バックエンド
- **Node.js 22.x** - 高性能サーバーランタイム
- **Express 5.1.0** - モダンWebフレームワーク
- **Firebase Admin SDK** - エンタープライズデータ管理

### データベース・認証
- **Cloud Firestore** - スケーラブルNoSQLデータベース
- **Firebase Authentication** - セキュアな認証システム
- **新IDシステム** - `U_XXXXXXXX` 形式完全統一

## 📈 システムアーキテクチャ（Phase 3.2設計）

```
🏗️ Phase 3.2設計版 サンタナ予約システム アーキテクチャ
┌─────────────────┬─────────────────┬─────────────────┐
│   顧客レイヤー     │   管理レイヤー     │   データレイヤー   │
├─────────────────┼─────────────────┼─────────────────┤
│ 🔒 プライバシー保護│ 🛠️ 運営管理機能    │ 🆔 新ID統一     │
│ ├─ 部屋タイプ表示  │ ├─ 部屋番号管理    │ ├─ users        │
│ ├─ 日付・料金表示  │ ├─ 割り当て管理    │ ├─ bookings     │
│ ├─ 設備情報表示   │ ├─ 清掃・メンテ    │ ├─ rooms        │
│ └─ 予約状況表示   │ └─ 統計・レポート   │ ├─ room_allocation│
├─────────────────┼─────────────────┼─ └─ room_types  │
│ 🎨 顧客UI        │ 🎛️ 管理ダッシュボード│                 │
│ ├─ 検索・予約     │ ├─ 部屋管理       │ 🔮 Phase 4予定   │
│ ├─ マイページ     │ ├─ 予約管理       │ ├─ 決済システム   │
│ └─ 履歴確認      │ └─ 顧客管理       │ ├─ 通知システム   │
└─────────────────┴─────────────────┤ └─ AI推奨システム │
                                    └─────────────────┘
```

## 🎯 **Phase 3.2開発計画**

### **Week 1: データ正規化**
```javascript
実装項目:
- 🆔 全IDシステム新形式統一
- 🗄️ データ移行スクリプト作成
- 🔍 整合性チェック・検証システム
- 🛡️ 安全なバックアップ・復旧機能
```

### **Week 2: プライバシー保護**
```javascript
実装項目:
- 🔒 room_allocationテーブル実装
- 🎨 顧客向けUI改修（部屋番号除去）
- 👨‍💼 管理者向けダッシュボード分離
- 📧 メール・通知テンプレート改修
```

### **Week 3: 最終テスト・統合**
```javascript
実装項目:
- 🧪 エンドツーエンドテスト
- 🔐 プライバシー漏洩チェック
- 📊 パフォーマンス最適化
- 📚 ドキュメント・README更新
```

## 📊 **Phase 3.2期待効果**

### 🎯 **プライバシー・セキュリティ向上**

| 指標 | Phase 3.1 | Phase 3.2目標 | 改善効果 |
|------|-----------|---------------|---------|
| **プライバシー保護** | 基本レベル | 完全保護 | **100%部屋番号非表示** |
| **データ一貫性** | 基本統一 | 完全統一 | **ID不整合ゼロ** |
| **運営効率** | 90%向上 | 95%向上 | **管理インターフェース分離** |
| **顧客満足度** | 標準 | 高水準 | **洗練された予約体験** |
| **将来拡張性** | 良好 | 優秀 | **完璧なアーキテクチャ基盤** |

### 🏆 **ビジネス価値**

```javascript
✅ 顧客プライバシー: 完全保護（部屋番号非表示）
✅ 運営セキュリティ: 強化（管理情報分離）  
✅ システム拡張性: 最大化（完璧なデータ構造）
✅ 開発効率: 向上（統一されたID・データ構造）
✅ ユーザー体験: 洗練（必要な情報のみ表示）
```

## 🛡️ **データ管理・開発体制**

### 📁 **Phase 3.2開発フロー**

```bash
# 推奨開発サイクル（Phase 3.2）
1. データ正規化スクリプト実行
2. 新機能開発・テスト
3. プライバシー保護チェック  
4. 統合テスト・品質確認
5. 段階的デプロイ
```

### 🔄 **継続的インテグレーション**

```bash
# 自動化テストスイート（Phase 3.2準備）
- データ整合性チェック
- プライバシー漏洩テスト
- ID形式検証
- APIレスポンス検証
- UI/UX回帰テスト
```

## 🎯 **Phase 4ロードマップ**

### 💳 **決済システム統合（Phase 4.1）**
```javascript
実装予定:
- Stripe完全統合
- 自動請求・領収書発行
- 分割払い・キャンセル処理
- 売上レポート自動生成
```

### 🔔 **通知・連携システム（Phase 4.2）**
```javascript
実装予定:
- Discord/Slack運営通知
- SMS・Push通知
- カレンダー連携
- 在庫管理システム統合
```

### 📱 **PWA・モバイル最適化（Phase 4.3）**
```javascript
実装予定:
- Progressive Web App化
- オフライン機能対応
- ネイティブアプリレベル体験
- モバイル決済統合
```

## 🤝 **Phase 3.2コントリビューション歓迎分野**

### 🌟 **開発協力歓迎項目**

1. **🆔 データ正規化**: ID移行・検証スクリプト
2. **🔒 プライバシー強化**: UI改修・権限分離
3. **🧪 テスト自動化**: 品質保証・回帰テスト
4. **📚 ドキュメント**: 技術文書・運用マニュアル
5. **🎨 UI/UX改善**: デザイン・ユーザビリティ向上

### 📋 **開発ガイドライン（Phase 3.2）**

```bash
# Phase 3.2貢献手順
1. データ正規化方針の理解
2. プライバシー保護要件の確認
3. 新ID形式での実装
4. 顧客・管理者分離の遵守
5. 包括的テスト実行

# 重要原則
- お客様向けに部屋番号を一切表示しない
- 新IDシステムのみ使用
- 管理・顧客インターフェース完全分離
- データ整合性の確保
```

## 📋 **ライセンス・サポート**

### 📄 **ライセンス**
このプロジェクトは[MIT License](LICENSE)の下で公開されています。

### 🙋‍♂️ **Phase 3.2開発サポート**

#### **技術サポート・ディスカッション**
- **🐛 バグ報告**: [GitHub Issues](https://github.com/Mittsumitsu/santana-webapp/issues)
- **💡 機能提案**: [GitHub Discussions](https://github.com/Mittsumitsu/santana-webapp/discussions)
- **🔄 Phase 3.2進捗**: プロジェクトボードで公開

#### **ビジネスお問い合わせ**
- **🌐 サンタナグループ**: [公式サイト](https://santana-hotels.com)
- **📍 デリー店**: 4690/2, Shora Kothi Paharganj, New Delhi
- **📍 バラナシ店**: D-33/53, Khalishpura, Dashashwamedh, Varanasi  
- **📍 プリー店**: Shrivihar, Chhak, Puri, Orissa

## ⭐ **プロジェクトサポート**

**Phase 3.2データ正規化開発を応援してください！ Star ⭐ をお願いします！**

あなたのサポートが**完璧なシステム基盤構築**の励みになります。

**Fork 🍴** してデータ正規化・プライバシー保護機能の開発参加も大歓迎です！

---

## 🔄 **Phase 3.2開発状況**

### **🎯 Phase 3.2現在のステータス**
- 🔄 **データ正規化設計**: 完了
- 🔄 **プライバシー保護モデル**: 設計完了
- 🔄 **room_allocationテーブル**: 設計完了
- 🔄 **実装開始**: データ移行スクリプトから着手予定

### **📊 完成度**
```javascript
Phase 3.2準備度: 95%
├─ 要件定義: 100% ✅
├─ アーキテクチャ設計: 100% ✅  
├─ データ構造設計: 100% ✅
├─ UI/UX設計: 100% ✅
├─ 実装計画: 100% ✅
├─ 開発環境: 100% ✅
└─ 実装開始: 準備完了 🚀

Phase 3.1機能: 継承・運用継続中 ✅
```

### **🚀 Phase 3.2開発開始**
**データ正規化・プライバシー強化・完璧なシステム基盤構築で、宿泊業界の新基準を確立**

---

**🏨 サンタナゲストハウス予約システム** - プライバシー重視・データ正規化による次世代宿泊予約プラットフォーム

*最終更新: 2025年6月8日 | Phase 3.2データ正規化準備版 | Privacy-First + Data Normalization Ready*  
*Version: 3.2.0-prep | Status: データ正規化準備完了・実装開始可能*