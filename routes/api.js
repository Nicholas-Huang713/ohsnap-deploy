const express = require('express');
const router = express.Router();
const User = require('../models/user');
const Post = require('../models/post');
const Comment = require('../models/comment');
const jwt = require('jsonwebtoken');
const {registerValidation, loginValidation} = require('../validation');
const bcrypt = require('bcryptjs');
const multer = require('multer');
const aws = require( 'aws-sdk' );
const multerS3 = require( 'multer-s3' );
const path = require( 'path' );
const url = require('url');

//AWS SDK
const s3 = new aws.S3({
    accessKeyId: 'AKIAYDBVS4R3GC2XJLEH',
    secretAccessKey: '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',
    Bucket: 'ohsnapbucket'
});

//STORAGE
const imgUpload = multer({
    storage: multerS3({
        s3: s3,
        bucket: 'ohsnapbucket',
        acl: 'public-read',
        key: function (req, file, cb) {
        cb(null, path.basename( file.originalname, path.extname( file.originalname ) ) + '-' + Date.now() + path.extname( file.originalname ) )
        }
    }),
    // limits:{ fileSize: 5000000 }, 
    fileFilter: function( req, file, cb ){
     checkFileType( file, cb );
    }
}).single('image');

//CHECK FOR IMAGE FILE
function checkFileType( file, cb ){
    const filetypes = /jpeg|jpg|png|gif/;
    const extname = filetypes.test( path.extname( file.originalname ).toLowerCase());
    const mimetype = filetypes.test( file.mimetype );
    if( mimetype && extname ){
        return cb( null, true );
    } else {
        cb( 'Error: Images Only!' );
    }
}

//UPLOADE IMAGE TO S3
router.post('/img-upload', (req, res) => {
    imgUpload(req, res, (error) => {
        if(error){
            console.log( 'errors', error);
            res.json({error: error});
        } else {
            if( req.file === undefined ){
                console.log( 'Error: No File Selected!' );
                res.json( 'Error: No File Selected' );
            } else {
                const imageName = req.file.key;
                const imageLocation = req.file.location;
                const data = {
                    imageName, imageLocation
                }
                res.json(data);
            }
        }
    });
});

//UPLOAD REGISTRATION PROFILE IMAGE TO S3
router.post('/img-upload/:id', (req, res) => {
    imgUpload(req, res, (error) => {
        if(error){
            console.log( 'errors', error);
            res.json({error: error});
        } else {
            if( req.file === undefined ){
                console.log( 'Error: No File Selected!' );
                res.json( 'Error: No File Selected' );
            } else {
                const imageName = req.file.key;
                const imageLocation = req.file.location;
                User.updateOne({_id: req.params.id}, {$set: {imageName, imageData: imageLocation}})
                .then((res) => {
                    console.log("Success")
                })
                .catch((err) => {
                    res.status(400).send(err);
                })
            }
        }
    });
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

//REGISTER
router.post('/register', async (req, res) => {
    const {error} = registerValidation(req.body);
    if(error) return res.status(400).json(error.details[0].message);
    const emailExist = await User.findOne({email: req.body.email});
    if(emailExist) return res.status(400).json('Email already exists');
    const salt = await bcrypt.genSalt(10);
    const hashedPassword = await bcrypt.hash(req.body.password, salt);
    const user = new User({
        firstname: req.body.firstname,
        lastname: req.body.lastname,
        email: req.body.email, 
        password: hashedPassword
    });
    try{
        await user.save();
        const token = jwt.sign({_id: user._id}, process.env.TOKEN_SECRET);
        const data = {
            token,
            id: user._id
        }
        res.header('auth-token', token).send(data);
    } catch(err){
        res.status(400).send(err);
    }   
});

//CREATE NEW POST
router.post('/newpost', verifyToken, (req, res) => {
    const decodedId = jwt.verify(req.token,  process.env.TOKEN_SECRET);
    imgUpload(req, res, (error) => {
        if(error){
            console.log( 'errors', error);
            res.json({error: error});
        } else {
            if( req.file === undefined ){
                console.log( 'Error: No File Selected!' );
                res.json( 'Error: No File Selected' );
            } else {
                const imageName = req.file.key;
                const imageLocation = req.file.location;
                const newPost = new Post({
                    creatorId: decodedId, 
                    creatorName: req.body.creatorName,
                    profileImg: req.body.profileImg,
                    imageName,
                    imageData: imageLocation,
                    description: req.body.description
                });
                
                User.updateOne({_id: decodedId}, {$push: {posts: newPost}})
                .then(() => {
                    newPost.save();
                    User.findOne({_id: decodedId})
                    .then((data) => {
                        const posts = data.posts;
                        res.json(posts);
                    })
                    .catch((err) => {
                        res.json(err);
                    })
                })
                .catch(err => res.json(err));
            }
        }
    });
});

//CREATE NEW POST
router.put('/createpost', verifyToken, (req, res, next) => {
    console.log(req.body);
    const decodedId = jwt.verify(req.token,  process.env.TOKEN_SECRET);
    const newPost = new Post({
        creatorId: decodedId, 
        creatorName: req.body.creatorName,
        profileImg: req.body.profileImg,
        imageName: req.body.imageName,
        imageData: req.body.imageLocation,
        description: req.body.description
    });
    newPost.save();
    User.updateOne({_id: decodedId}, {$push: {posts: newPost}})
    .then(() => {
        res.status(200).json({
            success: true,
            document: result
        });
        console.log("Successfully created post");
    })
    .catch(err => res.json(err));
});

//UPDATE USER PROFILE PHOTO
router.put('/updateprofileimg', verifyToken, async (req, res, next) => {
    const decodedId = await jwt.verify(req.token,  process.env.TOKEN_SECRET);
    imgUpload(req, res, (error) => {
        if(error){
            console.log( 'errors', error);
            res.json({error: error});
        } else {
            if( req.file === undefined ){
                console.log( 'Error: No File Selected!' );
                res.json( 'Error: No File Selected' );
            } else {
                const imageName = req.file.key;
                const imageLocation = req.file.location;
                
                User.updateOne({_id: decodedId},{$set:{imageData: imageLocation, imageName}})
                .then(() => {
                    Post.updateMany({creatorId: decodedId}, {$set:{profileImg: imageLocation}})
                    .then(() => {
                        Comment.updateMany({creatorId: decodedId}, {$set:{creatorImg: imageLocation}})
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
            }
        }
    });
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