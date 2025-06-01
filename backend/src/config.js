// backend/src/config.js - 修正版
const dotenv = require('dotenv');

// 環境変数を読み込み
dotenv.config();

let serviceAccount;

try {
  // サービスアカウントキーを読み込み
  serviceAccount = require('./serviceAccount.json');
  console.log('✅ サービスアカウントキー読み込み成功');
  console.log('🔑 クライアントID:', serviceAccount.client_id);
  console.log('📧 クライアントメール:', serviceAccount.client_email);
} catch (error) {
  console.error('❌ サービスアカウントキー読み込み失敗:', error.message);
  console.error('📁 ファイルパス確認: backend/src/serviceAccount.json');
  process.exit(1);
}

module.exports = {
  port: process.env.PORT || 3000,
  environment: process.env.NODE_ENV || 'development',
  firebase: {
    projectId: 'indiasantana-app', // 固定値
    serviceAccount: serviceAccount
  }
};