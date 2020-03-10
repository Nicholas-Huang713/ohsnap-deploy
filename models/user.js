const mongoose = require('mongoose');

//Schema
const Schema = mongoose.Schema;

const UserSchema = new Schema({
    firstname: String,
    lastname: String,
    email: String,
    password: String,
    favelist: [],
    posts: [],
    date: {
        type: String,
        default: Date.now()
    }
})

//Model
const User = mongoose.model('User', UserSchema);

module.exports = User;