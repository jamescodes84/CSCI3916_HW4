/*
CSC3916 HW4
File: Server.js
Description: Web API scaffolding for Movie API
 */

var express = require('express');
var bodyParser = require('body-parser');
var passport = require('passport');
var authController = require('./auth');
var authJwtController = require('./auth_jwt');
var jwt = require('jsonwebtoken');
var cors = require('cors');
var User = require('./Users');
var Movie = require('./Movies');
var Review = require('./Reviews');

var app = express();
app.use(cors());
app.use(bodyParser.json());
app.use(bodyParser.urlencoded({ extended: false }));

app.use(passport.initialize());

var router = express.Router();

function getJSONObjectForMovieRequirement(req) {
    var json = {
        headers: "No headers",
        key: process.env.UNIQUE_KEY,
        body: "No body"
    };

    if (req.body != null) {
        json.body = req.body;
    }

    if (req.headers != null) {
        json.headers = req.headers;
    }

    return json;
}

router.post('/signup', function(req, res) {
    if (!req.body.username || !req.body.password) {
        res.json({success: false, msg: 'Please include both username and password to signup.'})
    } else {
        var user = new User();
        user.name = req.body.name;
        user.username = req.body.username;
        user.password = req.body.password;

        user.save(function(err){
            if (err) {
                if (err.code == 11000)
                    return res.json({ success: false, message: 'A user with that username already exists.'});
                else
                    return res.json(err);
            }

            res.json({success: true, msg: 'Successfully created new user.'})
        });
    }
});

router.post('/signin', function (req, res) {
    var userNew = new User();
    userNew.username = req.body.username;
    userNew.password = req.body.password;

    User.findOne({ username: userNew.username }).select('name username password').exec(function(err, user) {
        if (err) {
            res.send(err);
        }

        user.comparePassword(userNew.password, function(isMatch) {
            if (isMatch) {
                var userToken = { id: user.id, username: user.username };
                var token = jwt.sign(userToken, process.env.SECRET_KEY);
                res.json ({success: true, token: 'JWT ' + token});
            }
            else {
                res.status(401).send({success: false, msg: 'Authentication failed.'});
            }
        })
    })
});

router.post('/reviews', function (req, res){
    if (!req.body.username || !req.body.movieid || !req.body.review || !req.body.rating){
        return res.json({ success: false, message: 'Incomplete Review'});
    } else {
        var newReview = new Review();
        newReview.username = req.body.username;
        newReview.movieid = req.body.movieid;
        newReview.review = req.body.review;
        newReview.rating = req.body.rating;
    
        newReview.save(function(err){
            if (err) {
               return res.json(err);
            }

            res.json({success: true, msg: 'Review Created!'})
        });
    }
    
});

router.get('/reviews/id', function(req,res){
    if (!req.body.username || !req.body.movieid || !req.body.review || !req.body.rating) {
        return res.json({ success: false, message: 'Incomplete Review'});
    } 
    Reviews.findOne({ movieid: req.body.movieid }).select('movieid username review rating').exec(function(err, reviewOut) {
        if (err) {
            res.send(err);
        }

        res.json ({movieid: movieOut.movieid , username: movieOut.username, rating: movieOut.rating, review: movieOut.review});
       
    })

    if (req.query.reviews == True) {
        Order.aggregate([
            {
              $match: { _id: orderId } // replace orderId with the actual order id
            },
            {
              $lookup: {
                from: "items", // name of the foreign collection
                localField: "items", // field in the orders collection
                foreignField: "_id", // field in the items collection
                as: "itemDetails" // output array where the joined items will be placed
              }
            }
          ]).exec(function(err, result) {
            if (err) {
                res.send(err);
            } else {
              console.log(result);
            }
          });
    }
});


app.use('/', router);
app.listen(process.env.PORT || 8080);
module.exports = app; // for testing only


