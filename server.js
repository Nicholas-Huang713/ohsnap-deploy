const express = require('express');
const mongoose = require('mongoose');
const morgan = require('morgan');
const path = require('path');
const dotenv = require('dotenv');
const bodyParser = require('body-parser');

const app = express(); 
const PORT = process.env.PORT || 8009;

const routes = require('./routes/api');
dotenv.config();

mongoose.connect( 
    process.env.MONGODB_URI || process.env.DB_CONNECT,
    {
        useNewUrlParser: true, 
        useUnifiedTopology: true
    },
    () => console.log('connected to db!')
);

mongoose.connection.on('connected', () => {
    console.log("Mongoose is connected!")
})

app.use(express.json());
app.use(express.urlencoded({extended: false}));
// app.use('/uploads', express.static('uploads'));

app.use(bodyParser.urlencoded({ extended: false }))
app.use(bodyParser.json())

app.use(morgan('tiny'));
app.use('/api', routes);


if(process.env.NODE_ENV === 'production'){
    app.use(express.static('client/build'));
}

app.get('/*', function(req, res) {
    res.sendFile(path.join(__dirname, './client/build/index.html'), function(err) {
      if (err) {
        res.status(500).send(err)
      }
    })
});

app.listen(PORT, console.log(`Server is starting at ${PORT}`));