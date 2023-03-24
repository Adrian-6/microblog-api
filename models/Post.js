const mongoose = require('mongoose');

const postSchema = new mongoose.Schema({
    userId: {
        type: String,
        required: true
    },
    author: {
        type: String,
        required: true
    },
    title: {
        type: String,
        required: true
    },
    body: {
        type: String,
        required: true
    },
    createdAt: {
        type: Date,
        default: Date.now,
        required: true
    },
    edited: {
        type: Boolean,
        default: false,
    },
    comments: [{
        author: String,
        body: String,
        date: { type: Date, default: Date.now },
        upvotes: { type: Number, default: 0 },
        upvotedBy: [{ type: String }]
    }],
    upvotes: {
        type: Number,
        default: 0,
        required: true
    },
    shares: {
        type: Number,
        default: 0,
        required: true
    },
    upvotedBy: [{ type: String }],
    sharedBy: [{ type: String }]
})

module.exports = mongoose.model('Post', postSchema)
