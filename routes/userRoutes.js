const express = require('express')
const router = express.Router()
const usersController = require('../controllers/usersController')

router.route('/')
    .get(usersController.getAllUsers)
    .patch(usersController.updateUser)
    .delete(usersController.deleteUser)

router.route('/:email')
    .get(usersController.getUserByEmail)

router.route('/follow')
    .post(usersController.handleFollow)

module.exports = router