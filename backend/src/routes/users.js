// backend/src/routes/users.js - 完全版（推奨）

const express = require('express');
const router = express.Router();

// 既存のuserController
const userController = require('../controllers/userController');

// 🆕 新機能: userProfileController を追加
const userProfileController = require('../controllers/userProfileController');

// 🔍 管理者用ルート（全ユーザー一覧）
router.get('/', userController.getAllUsers);

// 👤 個別ユーザー管理ルート
router.get('/:userId', userController.getUser);       // 特定ユーザー取得
router.put('/:userId', userController.updateUser);    // ユーザー情報更新
router.delete('/:userId', userController.deleteUser); // ユーザー削除（論理削除）

// 🔄 管理者用復元機能（任意）
router.post('/:userId/restore', userController.restoreUser); // ユーザー復元

// 📋 プロフィール管理ルート
router.get('/:userId/profiles', userProfileController.getUserProfiles);
router.post('/:userId/profiles', userProfileController.createUserProfile);
router.put('/:userId/profiles/:profileId', userProfileController.updateUserProfile);
router.delete('/:userId/profiles/:profileId', userProfileController.deleteUserProfile);
router.post('/:userId/profiles/:profileId/default', userProfileController.setDefaultProfile);

module.exports = router;