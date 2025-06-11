// Discord Webhook テスト実行 - セキュア版
// backend/test/discordTest.js

const axios = require('axios');
const dotenv = require('dotenv');

// 環境変数を読み込み
dotenv.config();

// 🔒 環境変数からWebhookURLを取得（セキュア）
const WEBHOOK_URL = process.env.DISCORD_WEBHOOK_URL;

// セキュリティチェック
if (!WEBHOOK_URL) {
  console.error('❌ DISCORD_WEBHOOK_URL environment variable not set!');
  console.error('🔧 .envファイルに以下を追加してください:');
  console.error('   DISCORD_WEBHOOK_URL=https://discord.com/api/webhooks/YOUR_WEBHOOK_ID/YOUR_WEBHOOK_TOKEN');
  process.exit(1);
}

// WebhookURLの形式チェック
if (!WEBHOOK_URL.startsWith('https://discord.com/api/webhooks/')) {
  console.error('❌ Invalid Discord Webhook URL format!');
  console.error('🔧 正しい形式: https://discord.com/api/webhooks/ID/TOKEN');
  process.exit(1);
}

console.log('🔒 Webhook URL loaded from environment variables');
console.log('🔗 URL format: ****/webhooks/****/****');

// 1. 基本的なテストメッセージ
async function testBasicMessage() {
  try {
    console.log('📤 基本メッセージテスト開始...');
    
    const response = await axios.post(WEBHOOK_URL, {
      content: '🎉 サンタナゲストハウス予約システム - Discord通知テスト成功！',
      username: 'サンタナBot',
    });
    
    console.log('✅ 基本メッセージ送信成功');
    return true;
  } catch (error) {
    console.error('❌ 基本メッセージ送信失敗:', error.response?.data || error.message);
    return false;
  }
}

// 2. 埋め込みメッセージテスト（新規予約通知のサンプル）
async function testEmbedMessage() {
  try {
    console.log('📤 埋め込みメッセージテスト開始...');
    
    const embed = {
      title: '🆕 新規予約申請テスト',
      color: 0x4CAF50, // 緑色
      fields: [
        {
          name: '👤 ゲスト情報',
          value: '**名前:** テスト 太郎\n**メール:** test@example.com',
          inline: false
        },
        {
          name: '📅 宿泊情報',
          value: '**チェックイン:** 2025-07-01\n**チェックアウト:** 2025-07-03\n**宿泊数:** 2泊',
          inline: true
        },
        {
          name: '👥 人数・料金',
          value: '**ゲスト数:** 2名\n**合計金額:** ₹3,400',
          inline: true
        },
        {
          name: '🏨 予約ID',
          value: '`test_booking_001`',
          inline: false
        }
      ],
      footer: {
        text: 'サンタナゲストハウス予約システム - テスト環境'
      },
      timestamp: new Date().toISOString()
    };

    const response = await axios.post(WEBHOOK_URL, {
      username: 'サンタナBot',
      embeds: [embed]
    });
    
    console.log('✅ 埋め込みメッセージ送信成功');
    return true;
  } catch (error) {
    console.error('❌ 埋め込みメッセージ送信失敗:', error.response?.data || error.message);
    return false;
  }
}

// 3. エラー通知テスト
async function testErrorNotification() {
  try {
    console.log('📤 エラー通知テスト開始...');
    
    const embed = {
      title: '🚨 システムエラー発生（テスト）',
      color: 0xF44336, // 赤色
      fields: [
        {
          name: '❌ エラー内容',
          value: '```\nTest Error: This is a test error message\n```',
          inline: false
        },
        {
          name: '📍 発生箇所',
          value: 'Discord通知テスト',
          inline: true
        },
        {
          name: '⏰ 発生時刻',
          value: new Date().toLocaleString('ja-JP'),
          inline: true
        }
      ],
      timestamp: new Date().toISOString()
    };

    const response = await axios.post(WEBHOOK_URL, {
      username: 'サンタナBot',
      embeds: [embed]
    });
    
    console.log('✅ エラー通知送信成功');
    return true;
  } catch (error) {
    console.error('❌ エラー通知送信失敗:', error.response?.data || error.message);
    return false;
  }
}

// 4. 日次レポートテスト
async function testDailyReport() {
  try {
    console.log('📤 日次レポートテスト開始...');
    
    const embed = {
      title: '📊 日次レポート（テスト）',
      color: 0x2196F3, // 青色
      fields: [
        {
          name: '📈 今日の実績',
          value: '**新規予約:** 5件\n**チェックイン:** 3件\n**チェックアウト:** 2件',
          inline: true
        },
        {
          name: '💰 売上情報',
          value: '**今日の売上:** ₹12,500\n**月累計:** ₹156,000',
          inline: true
        },
        {
          name: '🏨 稼働状況',
          value: '**稼働率:** 73%\n**空室数:** 8室',
          inline: false
        }
      ],
      footer: {
        text: `${new Date().toLocaleDateString('ja-JP')} の実績（テストデータ）`
      },
      timestamp: new Date().toISOString()
    };

    const response = await axios.post(WEBHOOK_URL, {
      username: 'サンタナBot',
      embeds: [embed]
    });
    
    console.log('✅ 日次レポート送信成功');
    return true;
  } catch (error) {
    console.error('❌ 日次レポート送信失敗:', error.response?.data || error.message);
    return false;
  }
}

// 5. 予約承認通知テスト
async function testBookingApproval() {
  try {
    console.log('📤 予約承認通知テスト開始...');
    
    const embed = {
      title: '✅ 予約承認通知（テスト）',
      color: 0x4CAF50, // 緑色
      fields: [
        {
          name: '📋 予約情報',
          value: '**ID:** `test_booking_001`\n**ゲスト:** テスト 太郎',
          inline: false
        },
        {
          name: '📊 変更内容',
          value: '**新ステータス:** 確定\n**変更者:** 管理者（テスト）',
          inline: false
        },
        {
          name: '💡 次のアクション',
          value: 'ゲストに確認メールを送信してください',
          inline: false
        }
      ],
      timestamp: new Date().toISOString()
    };

    const response = await axios.post(WEBHOOK_URL, {
      username: 'サンタナBot',
      embeds: [embed]
    });
    
    console.log('✅ 予約承認通知送信成功');
    return true;
  } catch (error) {
    console.error('❌ 予約承認通知送信失敗:', error.response?.data || error.message);
    return false;
  }
}

// 6. メンテナンスアラートテスト
async function testMaintenanceAlert() {
  try {
    console.log('📤 メンテナンスアラートテスト開始...');
    
    const embed = {
      title: '⚠️ メンテナンスアラート（テスト）',
      color: 0xFF9800, // オレンジ色
      fields: [
        {
          name: '🔧 対象',
          value: 'デリー店 - 301号室',
          inline: true
        },
        {
          name: '📝 内容',
          value: 'エアコンの点検が必要です。次回清掃時に確認をお願いします。',
          inline: false
        },
        {
          name: '🎯 優先度',
          value: '中',
          inline: true
        },
        {
          name: '📅 期限',
          value: '1週間以内',
          inline: true
        }
      ],
      timestamp: new Date().toISOString()
    };

    const response = await axios.post(WEBHOOK_URL, {
      username: 'サンタナBot',
      embeds: [embed]
    });
    
    console.log('✅ メンテナンスアラート送信成功');
    return true;
  } catch (error) {
    console.error('❌ メンテナンスアラート送信失敗:', error.response?.data || error.message);
    return false;
  }
}

// すべてのテストを実行
async function runAllTests() {
  console.log('🚀 Discord Webhook テスト開始');
  console.log('🔒 セキュア版（環境変数使用）');
  console.log('=====================================\n');
  
  const results = [];
  
  // 各テストを実行（間隔を空けて）
  results.push(await testBasicMessage());
  await new Promise(resolve => setTimeout(resolve, 2000)); // 2秒待機
  
  results.push(await testEmbedMessage());
  await new Promise(resolve => setTimeout(resolve, 2000));
  
  results.push(await testErrorNotification());
  await new Promise(resolve => setTimeout(resolve, 2000));
  
  results.push(await testDailyReport());
  await new Promise(resolve => setTimeout(resolve, 2000));
  
  results.push(await testBookingApproval());
  await new Promise(resolve => setTimeout(resolve, 2000));
  
  results.push(await testMaintenanceAlert());
  
  // 結果をまとめて表示
  console.log('\n=====================================');
  console.log('📊 テスト結果まとめ:');
  console.log(`✅ 成功: ${results.filter(r => r).length}件`);
  console.log(`❌ 失敗: ${results.filter(r => !r).length}件`);
  
  if (results.every(r => r)) {
    console.log('🎉 すべてのテストが成功しました！');
    console.log('👍 Discord通知システムは正常に動作しています。');
  } else {
    console.log('⚠️ 一部のテストが失敗しました。');
    console.log('🔍 エラーログを確認してください。');
  }
}

// テスト実行
if (require.main === module) {
  runAllTests().catch(console.error);
}

module.exports = {
  testBasicMessage,
  testEmbedMessage,
  testErrorNotification,
  testDailyReport,
  testBookingApproval,
  testMaintenanceAlert,
  runAllTests
};

// ==============================================
// セキュア使用方法:
// 
// 1. backend/.env ファイルに以下を追加:
//    DISCORD_WEBHOOK_URL=https://discord.com/api/webhooks/YOUR_WEBHOOK_ID/YOUR_WEBHOOK_TOKEN
// 
// 2. ファイルを backend/test/discordTest.js として保存
// 
// 3. ターミナルで以下を実行:
//    cd backend
//    node test/discordTest.js
// 
// 4. .gitignore に .env が含まれていることを確認
//    （WebhookURLが公開されないように）
// 
// 🔒 セキュリティ対策:
// - WebhookURLをハードコーディングしない
// - 環境変数(.env)で管理
// - .gitignoreで.envを除外
// - URL形式の検証
// ==============================================