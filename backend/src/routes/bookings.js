// src/routes/bookings.js
const express = require('express');
const router = express.Router();
const bookingController = require('../controllers/bookingController');

// 全ての予約を取得 (管理者用)
router.get('/', bookingController.getAllBookings);

// 特定のパスパターンを先に配置（順序重要）
router.get('/user/:userId', bookingController.getUserBookings);
router.post('/validate', bookingController.validateBooking);

// 汎用的なIDパスは後に配置
router.get('/:id', bookingController.getBookingById);
router.post('/', bookingController.createBooking);
router.put('/:id', bookingController.updateBooking);
router.delete('/:id', bookingController.cancelBooking);

module.exports = router;
