const express = require('express')
const router = express.Router()
const postController = require('../controllers/postsController')

router.route('/')
    .get(postController.getAllPosts)
    .delete(postController.handleDeletePost)
    .patch(postController.handleUpdatePost)

router.route('/create')
    .post(postController.handleNewPost)

router.route('/feed/:email/:page')
    .get(postController.handleGetFeed)
router.route('/repost')
    .post(postController.handleRepost)

router.route('/comment')
    .post(postController.handleComment)
    .delete(postController.handleDeleteComment)

router.route('/comment/vote')
    .post(postController.handleCommentVote)

router.route('/vote')
    .post(postController.handlePostVote)

router.route('/:page')
    .get(postController.handlePostPage)

module.exports = router