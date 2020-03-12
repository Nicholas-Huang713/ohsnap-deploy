const mongoose = require('mongoose');
const Schema = mongoose.Schema;

const UserSchema = new Schema({
    firstname: String,
    lastname: String,
    email: String,
    password: String,
    favelist: [String],
    posts: [{}],
    date: {
        type: String,
        default: Date.now()
    }
})

//Model
const User = mongoose.model('User', UserSchema);

module.exports = User;