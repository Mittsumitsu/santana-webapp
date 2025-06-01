const express = require('express');
const router = express.Router();
const roomController = require('../controllers/roomController');

// 全ての部屋を取得
router.get('/', roomController.getAllRooms);

// 利用可能な部屋を検索（特定のパターンを先に）
router.get('/available', roomController.getAvailableRooms);

// 特定の部屋を取得（より汎用的なパターンは後に）
router.get('/:id', roomController.getRoomById);

// 部屋を作成（POST）
router.post('/', roomController.createRoom);

// 部屋を更新（PUT）
router.put('/:id', roomController.updateRoom);

// 部屋を削除（DELETE）
router.delete('/:id', roomController.deleteRoom);

module.exports = router;
