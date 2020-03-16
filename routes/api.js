const express = require('express');
const router = express.Router();
const User = require('../models/user');
const Post = require('../models/post');
const jwt = require('jsonwebtoken');
const {registerValidation, loginValidation} = require('../validation');
const bcrypt = require('bcryptjs');
const multer = require('multer');

const storage = multer.diskStorage({
    destination: function(req, file, cb){
        cb(null,'./uploads');
    },
    filename: function(req, file, cb){
        cb(null, Date.now() + file.originalname);
    }
});

const fileFilter = (req, file, cb) => {
    if(file.mimetype === 'image/jpeg' || file.mimetype === "image/png" || file.mimetype === "image/jpg"){
        cb(null, true);
    } else {
        cb(null, false);
    }
};

const upload = multer({
    storage: storage,
    limits: {
        fileSize: 1024 * 1024 * 5
    },
    fileFilter: fileFilter
});

router.put('/uploadimage', verifyToken, upload.single('imageData'), (req, res, next) => {
    console.log(req.body);
    if (!req.file) return res.send('Please upload a file');
    console.log("File recieved");
    const newImage = new Post({
        imageName: req.body.imageName,
        imageData: req.file.path,
        title: req.body.title,
        description: req.body.description
    });
    const decodedId = jwt.verify(req.token,  process.env.TOKEN_SECRET);
    User.updateOne({_id: decodedId}, {$push: {posts: newImage}})
    .then(() => {
        res.status(200).json({
            success: true,
            document: result
        });
        console.log("Successfully uploaded image");
    })
    .catch(err => res.json(err));
});

//REGISTER
router.post('/register', upload.single('imageData'), async (req, res, next) => {
    const {error} = registerValidation(req.body);
    if(error) return res.status(400).json(error.details[0].message);
    const emailExist = await User.findOne({email: req.body.email});
    if(emailExist) return res.status(400).json('Email already exists');
    // if (!req.file) return res.send('Please upload a file');
    const salt = await bcrypt.genSalt(10);
    const hashedPassword = await bcrypt.hash(req.body.password, salt);
    const user = new User({
        firstname: req.body.firstname,
        lastname: req.body.lastname,
        email: req.body.email, 
        password: hashedPassword,
        imageName: req.body.imageName,
        imageData: req.file.path
    });
    try{
        await user.save();
        const token = jwt.sign({_id: user._id}, process.env.TOKEN_SECRET);
        res.header('auth-token', token).send(token);
    } catch(err){
        res.status(400).send(err);
    }   
});

//LOGIN
router.post('/login', async (req, res) => {
    const {error} = loginValidation(req.body);
    if(error) return res.status(400).send(error.details[0].message);
    const user = await User.findOne({email: req.body.email});
    if(!user) return res.status(400).send('Email does not exist');
    const validPass = await bcrypt.compare(req.body.password, user.password);
    if(!validPass) return res.status(400).send('Invalid password');
    const token = jwt.sign({_id: user._id}, process.env.TOKEN_SECRET);
    res.header('auth-token', token).send(token);
});

//GET ALL USERS
router.get('/', (req, res) => {
    User.find({})
    .then((data) => {res.json(data)})
    .catch((error) => {console.log('Error: ' + error)});
});

//GET A USER
router.get('/getuser', verifyToken, (req, res) => {
    jwt.verify(req.token,  process.env.TOKEN_SECRET, (err, decoded) => {
        if(err){
            res.sendStatus(403);
        } else {
            User.find({_id: decoded})
            .then((data) => {res.json(data)})
            .catch((error) => {console.log('Error: ' + error)});
        }
    })
});

//LIKE POST
router.put('/like', verifyToken, (req, res) => {
    const decodedId = jwt.verify(req.token,  process.env.TOKEN_SECRET);
    User.updateOne({_id: decodedId}, {$push: {favelist: req.body.id}})
    .then(() => {
        const likedUser = User.findOne({_id: req.body.user_id}, {$push: {likes: decodedId }});
        
        // .then((data) => {res.json(data);})
        // .catch((error) => {console.log('Error: ' + error)});
    })
    .catch(err => res.json(err));
});

//UNLIKE POST
router.put('/unlike', verifyToken, (req, res) => {
    const decodedId = jwt.verify(req.token,  process.env.TOKEN_SECRET);
    User.updateOne({_id: decodedId}, {$pull: {favelist: req.body.id}})
    .then(() => {
        User.updateOne({_id: req.body.user_id}, {$pull: {likes: decodedId}})
        .then((data) => {res.json(data)})
        .catch((error) => {console.log('Error: ' + error)});
    })
    .catch(err => res.json(err));
});

function verifyToken(req, res, next){
    const bearerHeader = req.headers['authorization'];
    if(typeof bearerHeader !== 'undefined'){
        const bearer = bearerHeader.split(' ');
        const bearerToken = bearer[1];
        req.token = bearerToken;
        next();
    } else {
        res.sendStatus(403);
    }
}

module.exports = router;