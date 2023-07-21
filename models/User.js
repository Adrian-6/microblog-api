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
    profilePictureURL: { type: String, default: "https://cdn-icons-png.flaticon.com/512/166/166347.png?w=826&t=st=1679619593~exp=1679620193~hmac=f34a680fa3d7d06914e0740ef84f42370e0aa2e2b33c467a4a4d0392ec31250a" },
    serviceProvider: { type: String }
})

module.exports = mongoose.model('User', userSchema)