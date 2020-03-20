const mongoose = require('mongoose');
const Schema = mongoose.Schema;

const CommentSchema = new Schema({
    postId: String,
    creatorId: String,
    creatorName: String,
    creatorImg: String,
    content: String,
    date: {
        type: String,
        default: Date.now()
    }
})   

const Comment = mongoose.model('Comment', CommentSchema);

module.exports = Comment;