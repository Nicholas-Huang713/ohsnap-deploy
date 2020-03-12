const mongoose = require('mongoose');
const Schema = mongoose.Schema;

const PostSchema = new Schema({
    img: {
        data: Buffer, 
        contentType: String
    },
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

module.exports = User;