const mongoose = require('mongoose');
const Schema = mongoose.Schema;
const CommentSchema = require('./comment').schema;

const PostSchema = new Schema({
    creatorId: String,
    creatorName: String,
    profileImg: String,
    imageName: {
        type: String, 
        default: "none",
        required: true
    },
    imageData: {
        type: String,
        required: true
    },
    title: String,
    description: String,
    likes: [String],
    comments: [CommentSchema],
    date: {
        type: String,
        default: Date.now()
    }
})   

const Post = mongoose.model('Post', PostSchema);

module.exports = Post;