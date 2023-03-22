const mongoose = require('mongoose')

const userSchema = new mongoose.Schema({
    dateCreated: { type: Date, default: Date.now },
    email: {
        type: String,
        required: true
    },
    username: {
        type: String,
    },
    password: {
        type: String,
    },
    follows: [{ type: String }],
    followedBy: [{ type: String }],
    userPostsId: { type: [String], required: true },
    refreshToken: [String],
    profilePictureURL: { type: String, default: "https://pbs.twimg.com/profile_images/1387160097416220673/l_YU1b8L_400x400.jpg" },
    serviceProvider: { type: String }
})

module.exports = mongoose.model('User', userSchema)