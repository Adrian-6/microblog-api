const Post = require('../models/Post')
const User = require('../models/User')

const getAllPosts = async (req, res) => {
    // Get all posts from MongoDB
    const posts = await Post.find().exec()

    // If no posts 
    if (!posts?.length) {
        return res.status(400).json({ message: 'No posts found' })
    }

    res.json(posts)
}

const handleNewPost = async (req, res) => {
    const { body, title, email } = req.body;
    const foundUser = await User.findOne({ email: email }).exec();

    if (!body || !title || !foundUser) {

        return res.sendStatus(400)
    }
    const userId = foundUser.id

    const post = await Post.create({ userId, title, body, 'author': email})
    if (post) {
        foundUser.userPostsId.push(post.id)
        await foundUser.save()
        return res.status(201).json({ message: 'New post created', postId: post.id })
    } else {
        return res.status(400).json({ message: 'Invalid post data received' })
    }
}

const handleUpdatePost = async (req, res) => {
    const { id, email, title, body } = req.body
    // Confirm data
    if (!id || !email || !title || !body) {
        return res.status(400).json({ message: 'All fields are required' })
    }

    const post = await Post.findById(id).exec()

    if (!post) {
        return res.status(400).json({ message: 'Post not found' })
    }

    // Check if post belongs to the user that made the req.
    const isAuthor = await Post.findOne({ _id: id, author: email }).exec()

    if (!isAuthor) {
        return res.status(401).json({ message: 'Unauthorized' })
    }

    post.title = title
    post.body = body
    post.edited = true
    await post.save()

    res.json(`'${post.title}' updated`)
}


const handleDeletePost = async (req, res) => {

    const { id, email } = req.body
    // Confirm data
    if (!id) {
        return res.status(400).json({ message: 'Post ID Required' })
    }

    // Does the post exist to delete?
    const post = await Post.findById(id).exec()

    if (!post) {
        return res.status(400).json({ message: 'Post not found' })
    }
    if (post.author !== email) {
        return res.status(401).json({ message: 'Unauthorized' })
    }
    const user = await User.findOne({ email })
    const postsArray = user.userPostsId.filter(postId => postId !== id)
    user.userPostsId = postsArray
    await user.save();
    await post.deleteOne()

    res.json({ message: 'Post deleted' })
}

const handleGetFeed = async (req, res) => {
    const { email, page } = req.params
    // Confirm data 
    if (!email || !page && page !== 0) {
        return res.status(400).json({ message: 'Email and page are required' })
    }

    const user = await User.findOne({ email }).exec()

    if (!user) {
        return res.status(400).json({ message: 'Unauthorized' })
    }

    const followsList = user.follows
    let feedPosts = [];

    //adds followed users posts IDs to the feedPosts array
    let getPostsIds = User.find({
        'email': { $in: followsList }
    }).exec()
        .then(res => {
            res.push(user)
            res.map(entry => {
                feedPosts.push(entry.userPostsId)
            })
        })

    await getPostsIds
    const feedPostsIds = feedPosts.flat()

    const feed = Post.find({
        '_id': { $in: feedPostsIds }
    }, function (err, docs) {
        if (err) {
            return res.status(400).json({ message: 'no posts' })
        } else {
            if ((docs.length - (page * 10)) < 0) return res.status(200).json([])
            docs = docs.slice((-10 * page - 10), docs.length - (page * 10))
            return res.status(200).json(docs)
        }
    })
}

const handlePostPage = async (req, res) => {
    let { page } = req.params

    if (!page) {
        page = 1
    }

    const feed = Post.find(function (err, docs) {
        if (err) {
            return res.status(400).json({ message: 'no posts' })
        } else {
            const postsPerPage = 10;
            const pages = Math.ceil(docs.length / postsPerPage)
            page -= 1
            if ((docs.length - (page * postsPerPage)) < 0) return res.status(200).json([])
            docs = docs.slice(((postsPerPage * -1) * page - postsPerPage), docs.length - (page * postsPerPage)) //-10 * page * -(number of posts per page)
            return res.status(200).json({ posts: docs, pages: pages })
        }
    })
}

const handleRepost = async (req, res) => {
    const { email, postId } = req.body
    if (!email) {
        return res.status(400)
    }

    //check if requesting user is posts' author
    const isAuthor = await Post.findOne({ author: email, _id: postId }).exec()
    if (isAuthor) {
        return res.status(400)
    }
    const foundUser = await User.findOne({ email }).exec();
    const foundPost = await Post.findOne({ _id: postId }).exec()
    const isShared = foundUser.userPostsId.find(id => id === postId);

    try {
        if (!isShared && foundPost) {
            foundUser.userPostsId.push(postId)
            foundPost.shares++
            foundPost.sharedBy.push(email)
            await foundPost.save()
            await foundUser.save()
        } else {
            const index = foundUser.userPostsId.indexOf(postId)
            const shareIndex = foundPost.sharedBy.indexOf(email)
            foundUser.userPostsId.splice(index, 1)
            foundPost.shares--
            foundPost.sharedBy.splice(shareIndex, 1)
            await foundPost.save()
            await foundUser.save()
        }
    } catch (err) {
        return res.status(400).json({ message: err })
    }

    return res.status(200).json({ message: 'reposted' })

}

const handleComment = async (req, res) => {

    const { postId, email, text } = req.body
    // Confirm data
    if (!postId || !email || !text) {
        return res.status(400).json({ message: 'error' })
    }
    const user = await User.findOne({ email: email }).exec();
    const post = await Post.findById(postId).exec()

    if (!post || !user) {
        return res.status(400).json({ message: 'asset not found' })
    }

    const comment = {
        author: email,
        body: text
    }

    try {
        post.comments.push(comment)
        await post.save()
    } catch (err) {
        return res.status(400).json({ message: err })
    }
    res.json(`comment added`)
}

const handleCommentVote = async (req, res) => {
    const { commentId, email, postId } = req.body
    if (!email || !commentId || !postId) {
        return res.status(400)
    }
    //refactor to use mongoose pull instead

    const foundPost = await Post.findOne({ _id: postId }).exec();
    if (!foundPost) return res.status(400)
    const comment = foundPost.comments.find(item => item.id === commentId);
    const index = foundPost.comments.indexOf(comment)
    const found = foundPost.comments[index].upvotedBy.find(item => item === email);

    try {
        if (!found) {
            foundPost.comments[index].upvotedBy.push(email)
            foundPost.comments[index].upvotes++
            await foundPost.save()
        } else {
            const userIndex = foundPost.comments[index].upvotedBy.indexOf(email)
            foundPost.comments[index].upvotedBy.splice(userIndex, 1);
            foundPost.comments[index].upvotes--
            await foundPost.save();
        }
    } catch (err) {
        return res.status(400).json({ message: err })
    }
    res.status(200).json({ message: `voted on comment` })
}

const handleDeleteComment = async (req, res) => {

    const { email, commentId, postId } = req.body
    if (!email || !commentId || !postId) {
        return res.status(400)
    }
    const foundPost = await Post.findOne({ _id: postId }).exec();
    if (!foundPost) return res.status(400)

    const foundComment = foundPost.comments.find(comment => comment.id === commentId)

    if (foundComment?.author !== email) {
        return res.status(401)
    }

    try {
        const updatedComments = await foundPost.comments.pull({ _id: commentId })
        foundPost.comments = updatedComments
        await foundPost.save()
        return res.json({ message: 'comment deleted' })
    } catch (err) {
        return res.status(400).json({ message: err })
    }
}

const handlePostVote = async (req, res) => {
    const { email, postId } = req.body
    if (!email || !postId) {
        return res.status(400)
    }
    const foundPost = await Post.findOne({ _id: postId }).exec();

    const found = foundPost.upvotedBy.find(item => item === email);

    try {
        if (!found && foundPost) {
            foundPost.upvotedBy.push(email)
            foundPost.upvotes++
            await foundPost.save();
        } else {
            const index = foundPost.upvotedBy.indexOf(email)
            foundPost.upvotedBy.splice(index, 1);
            foundPost.upvotes--
            await foundPost.save();
        }
    } catch (err) {
        return res.status(400).json({ message: err })
    }
    return res.json({ message: 'voted' })
}




module.exports = {
    getAllPosts,
    handleNewPost,
    handleUpdatePost,
    handleDeletePost,
    handleGetFeed,
    handleRepost,
    handleComment,
    handleCommentVote,
    handlePostVote,
    handleDeleteComment,
    handlePostPage
}
