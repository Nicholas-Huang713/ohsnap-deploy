const express = require('express');
const router = express.Router();
const User = require('../models/user');
const Post = require('../models/post');
const Comment = require('../models/comment');
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
    fileFilter: fileFilter
});

//CREATE NEW POST
router.put('/uploadimage', verifyToken, upload.single('imageData'), (req, res, next) => {
    console.log(req.body);
    if (!req.file) return res.send('Please upload a file');
    console.log("File recieved");
    const decodedId = jwt.verify(req.token,  process.env.TOKEN_SECRET);
    const newImage = new Post({
        creatorId: decodedId, 
        creatorName: req.body.creatorName,
        profileImg: req.body.profileImg,
        imageName: req.body.imageName,
        imageData: req.file.path,
        description: req.body.description
    });
    newImage.save();
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

//UPDATE USER PROFILE PHOTO
router.put('/updateprofileimg', verifyToken, upload.single('imageData'), async (req, res, next) => {
    console.log(req.body);
    if (!req.file) return res.send('Please choose a file');
    const decodedId = await jwt.verify(req.token,  process.env.TOKEN_SECRET);
    User.updateOne({_id: decodedId},{$set:{imageData : req.file.path, imageName: req.body.imageName}})
    .then(() => {
        Post.updateMany({creatorId: decodedId}, {$set:{profileImg: req.file.path}})
        .then(() => {
            Comment.updateMany({creatorId: decodedId}, {$set:{creatorImg: req.file.path}})
                .then(() => {
                    User.findOne({_id: decodedId})
                        .then((data) => {
                            res.json(data);
                        })
                        .catch((error) => console.log('Error: ' + error));
                })
                .catch((error) => {console.log('Error: ' + error)});
        })
        .catch((error) => {console.log('Error: ' + error)});
    })
    .catch((error) => {console.log('Error: ' + error)});
});

//UPDATE USER PROFILE INFO
router.put('/updateprofile', verifyToken, async (req, res, next) => {
    const decodedId = jwt.verify(req.token,  process.env.TOKEN_SECRET);
    User.updateOne({_id: decodedId},{$set:{firstname : req.body.firstName, lastname: req.body.lastName, email: req.body.email}})
        .then(() => {
            Post.updateMany({creatorId: decodedId}, {$set:{creatorName: req.body.firstName}})
            .then(() => {
                Comment.updateMany({creatorId: decodedId}, {$set:{creatorName: req.body.firstName}})
                    .then(() => {
                        User.findOne({_id: decodedId})
                            .then((data) => {
                                res.json(data);
                            })
                            .catch((error) => console.log('Error: ' + error));
                    })
                    .catch((error) => {console.log('Error: ' + error)});
            })
            .catch((error) => {console.log('Error: ' + error)});
        })
    .catch((error) => {console.log('Error: ' + error)});
    
});

//REGISTER
router.post('/register', upload.single('imageData'), async (req, res, next) => {
    const {error} = registerValidation(req.body);
    if(error) return res.status(400).json(error.details[0].message);
    const emailExist = await User.findOne({email: req.body.email});
    if(emailExist) return res.status(400).json('Email already exists');
    if (!req.file) return res.send('Please upload a file');
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

//GET LOGGED IN USER
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

//GET A SINGLE USER
router.get('/getuser/:id', verifyToken, (req, res) => {
    User.findOne({_id: req.params.id})
    .then((data) => {res.json(data)})
    .catch((error) => {console.log('Error: ' + error)});
});


//GET ALL POSTS 
router.get('/getposts', (req, res) => {
    Post.find({})
    .then((data) => {res.json(data)})
    .catch((error) => {console.log('Error: ' + error)});
})

//GET ONE USER'S POSTS
router.get('/getuserposts/:id', verifyToken, (req, res) => {
    Post.find({creatorId: req.params.id})
    .then((data) => {res.json(data)})
    .catch((error) => {console.log('Error: ' + error)});
})

//LIKE POST
router.put('/like', verifyToken, (req, res) => {
    const decodedId = jwt.verify(req.token,  process.env.TOKEN_SECRET);
    User.updateOne({_id: decodedId}, {$push: {favelist: req.body.id}})
    .then(() => {
        Post.updateOne({_id: req.body.id}, {$push: {likes: decodedId}})
        .then((data) => {res.json(data)})
        .catch((error) => {console.log('Error: ' + error)});
    })
    .catch(err => res.json(err));
});

//UNLIKE POST
router.put('/unlike', verifyToken, (req, res) => {
    const decodedId = jwt.verify(req.token,  process.env.TOKEN_SECRET);
    User.updateOne({_id: decodedId}, {$pull: {favelist: req.body.id}})
    .then(() => {
        Post.updateOne({_id: req.body.id}, {$pull: {likes: decodedId}})
        .then((data) => {res.json(data)})
        .catch((error) => {console.log('Error: ' + error)});
    })
    .catch(err => res.json(err));
});

//GET ALL COMMENTS
router.get('/getcomments', (req, res) => {
    Comment.find({})
    .then((data) => {res.json(data)})
    .catch((error) => {console.log('Error: ' + error)});
})

//GET ALL COMMENTS FROM POST
router.get('/getpostcomments/:id', verifyToken, (req, res) => {
    Comment.find({postId: req.params.id})
    .then((data) => {res.json(data)})
    .catch((error) => {console.log('Error: ' + error)});
})

//POST A COMMENT
router.put('/postcomment', verifyToken, (req, res) => {
    const decodedId = jwt.verify(req.token,  process.env.TOKEN_SECRET);
    const comment = new Comment({
        postId: req.body.postId,
        creatorId: decodedId,
        creatorName: req.body.creatorName,
        creatorImg: req.body.creatorImg, 
        content: req.body.content
    });
    comment.save();
    Post.updateOne({_id: req.body.postId}, {$push: {comments: comment}})
    .then(() => {(data) => {res.json(data)}})
    .catch((error) => {console.log('Error: ' + error)});
})

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