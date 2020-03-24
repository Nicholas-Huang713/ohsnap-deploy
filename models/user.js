const mongoose = require('mongoose');
const Schema = mongoose.Schema;
const PostSchema = require('./post').schema;

const UserSchema = new Schema({
    imageName: {
        type: String, 
        default: "none",
        required: false
    },
    imageData: {
        type: String,
        required: false
    },
    firstname: String,
    lastname: String,
    email: String,
    password: String,
    favelist: [String],
    posts: [PostSchema],
    admin: {
        type: Boolean,
        default: "false"
    },
    date: {
        type: String,
        default: Date.now()
    }  
})

const User = mongoose.model('User', UserSchema);

module.exports = User;