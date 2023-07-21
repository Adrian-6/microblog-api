const User = require('../models/User')
const Post = require("../models/Post")
const bcrypt = require('bcrypt')

const login = async (req, res) => {
    const user = await User.findOne({ email: req.body.email }).exec()
    if (!user) {
        return res.status(400).json("incorrect email or password")
    }
    const password = req.body.password
    bcrypt.compare(password, user.password, (err, result) => {
        if (err) {
            res.status(400).json({ message: "incorrect password" })
        }
        if (result) {
            res.status(200).json({ message: "login" })
        } else {
            res.status(400).json({ message: "Please try again" })
        }
    })
}

const getAllUsers = async (req, res) => {
    // Get all users from MongoDB
    const users = await User.find().select('-password').lean()

    // If no users 
    if (!users?.length) {
        return res.status(400).json({ message: 'No users found' })
    }

    res.json(users)
}

const register = async (req, res) => {
    const { username, password, email } = req.body;
    if (!username || !password || !email) {
        return res.status(400).json({ message: "All fields are required" })
    }
    //check for duplicates
    const duplicate = await User.findOne({ email }).lean().exec()
    if (duplicate) {
        return res.status(409).json({ message: "Account with this email already exists" })
    }
    //hash password
    const hashedPassword = await bcrypt.hash(password, 10)
    const userObject = { email, username, "password": hashedPassword }
    const user = await User.create(userObject)

    if (user) {
        res.status(201).json({ message: "Account created" })
    } else {
        res.status(400).json({ message: "Invalid user data received" })
    }
}

const updateUser = async (req, res) => {
    const { id, username, password, email, profilePictureURL } = req.body
    // Confirm data 
    if (!id || !username) {
        return res.status(400).json({ message: 'All fields except password are required' })
    }
    // Does the user exist to update?
    const user = await User.findOne({ _id: id, email: email }).exec()

    if (!user || user.email !== email) {
        return res.status(401).json({ message: 'Unauthorized' })
    }

    user.username = username
    user.profilePictureURL = profilePictureURL
    if (password) {
        // Hash password 
        user.password = await bcrypt.hash(password, 10) // salt rounds 
    }

    const updatedUser = await user.save()

    res.json({ message: `${updatedUser.username} updated` })
}

const deleteUser = async (req, res) => {
    const { id, email } = req.body

    // Confirm data
    if (!id) {
        return res.status(400).json({ message: 'User ID Required' })
    }

    // Does the user exist to delete?
    const user = await User.findById(id).exec()

    if (!user || user.email !== email) {
        return res.status(400).json({ message: 'Unauthorized' })
    }

    const result = await user.deleteOne()
    await Post.deleteMany({ author: email })
    const reply = `Username ${result.email} with ID ${result._id} deleted`

    res.json(reply)
}

const getUserByEmail = async (req, res) => {
    const email = req.params.email
    const user = await User.findOne({ email }).select('-password -refreshToken -__v').lean()

    // If no user
    if (!user) {
        return res.status(400).json({ message: 'User not found' })
    }

    res.status(200).json(user)
}

const handleFollow = async (req, res) => {
    const { currentUser, targetUserEmail } = req.body
    if (!currentUser || !targetUserEmail || currentUser === targetUserEmail) {
        return res.status(400).json({ message: 'Bad request' })
    }

    const user = await User.findOne({ email: currentUser }).exec()
    const targetUser = await User.findOne({ email: targetUserEmail }).exec()
    if (!user || !targetUser) {
        return res.status(400).json({ message: 'User not found' })
    }


    //const doesFollow = await User.findOne({ email, follows: targetUserEmail }).exec()
    const doesFollow = user.follows.find(email => email === targetUserEmail);

    if (doesFollow) {
        try {
            const newArray = targetUser.followedBy.filter(user => user !== currentUser)
            const newArray2 = user.follows.filter(user => user !== targetUserEmail)
            targetUser.followedBy = newArray;
            user.follows = newArray2
            await user.save();
            await targetUser.save();
        } catch (err) {
            return res.status(400).json({ message: err })
        }
    } else {
        try {
            user.follows.push(targetUserEmail)
            targetUser.followedBy.push(currentUser)
            await user.save()
            await targetUser.save()
        } catch (err) {
            return res.status(400).json({ message: err })
        }
    }
    return res.status(200).json({ message: `followed` })
}

module.exports = {
    login,
    register,
    getAllUsers,
    updateUser,
    deleteUser,
    getUserByEmail,
    handleFollow
}