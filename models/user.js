const mongoose = require('mongoose');
const Schema = mongoose.Schema;
const PostSchema = require('./post').schema;

const UserSchema = new Schema({
    imageName: {
        type: String, 
        default: "none",
        required: true
    },
    imageData: {
        type: String,
        required: true
    },
    firstname: String,
    lastname: String,
    email: String,
    password: String,
    favelist: [String],
    posts: [PostSchema],
    admin: Boolean,
    date: {
        type: String,
        default: Date.now()
    }  
})

const User = mongoose.model('User', UserSchema);

module.exports = User;