const express = require('express')
const router = express.Router()
const authController = require('../controllers/authController')
const loginLimiter = require('../middleware/loginLimiter')

router.route('/')
    .post(loginLimiter, authController.handleLogin)

router.route('/google')
    .get(authController.authThroughGoogle)

module.exports = router
