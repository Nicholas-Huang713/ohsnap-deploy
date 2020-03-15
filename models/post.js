const mongoose = require('mongoose');
const Schema = mongoose.Schema;

const PostSchema = new Schema({
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
    comments: [{
        user_id: String,
        comment: String
    }],
    date: {
        type: String,
        default: Date.now()
    }
})   

const Post = mongoose.model('Post', PostSchema);

module.exports = Post;