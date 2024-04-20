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

function getJSONObjectForReviewRequirement(req) {
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

/**************** REVIEWS *************************** */

router.get('/reviews/:id', function(req, res) {
    const reviewId = req.params.id;
  
    Review.findById(reviewId, function(err, review) {
      if (err) {
        return res.status(500).send({ message: "Error retrieving review." });
      }
      if (!review) {
        return res.status(404).send({ message: "Review not found." });
      }
      res.status(200).json(review);
    });
});  


router.post('/reviews', authJwtController.isAuthenticated, (req, res) => {
    const newReview = new Review({
        username: req.body.username,
        movieId: req.body.movieId,
        review: req.body.review,
        rating: req.body.rating
      });
    
      newReview.save(function(err, savedReview) {
        if (err) {
          return res.status(500).send({ message: "Failed to save review." });
        }
        res.status(201).send({message: "Review created!"});
      });
    
  });


router.put((req, res)=> {
    const reviewId = req.params.id;
    const updateData = {
      title: req.body.title,
      content: req.body.content,
      rating: req.body.rating
     
    };
  
    Review.findByIdAndUpdate(reviewId, updateData, { new: true }, function(err, review) {
      if (err) {
        return res.status(500).send({ message: "Error updating review." });
      }
      if (!review) {
        return res.status(404).send({ message: "Review not found." });
      }
      res.status(200).json(review);
    });
});
/********** MOVIES *************/
router.route('/movies')
    .get(authJwtController.isAuthenticated,(req, res) => {
        Movie.find(function(err, movies){
            if (err) {
                res.status(500).send(err);
            } 
            res.json(movies);
        })
        
    })

    .post(authJwtController.isAuthenticated, (req, res) => {
      // Required fields
      const requiredFields = ['title', 'releaseDate', 'genre', 'actors'];
      let missingFields = [];

      // Check for missing fields
      requiredFields.forEach(field => {
          if (!req.body[field]) {
              missingFields.push(field);
          }
      });

      // If there are missing fields, return an error message
      if (missingFields.length > 0) {
          return res.status(400).json({
              success: "False",
              message: "Missing required information: " + missingFields.join(', ')
          });
      }

      // Check if a movie with the same title and release date already exists
      Movie.findOne({ title: req.body.title, releaseDate: req.body.releaseDate }, (err, existingMovie) => {
          if (err) {
              return res.status(500).json({
                  success: "False",
                  message: "Error checking existing movie",
                  error: err
              });
          }
          if (existingMovie) {
              return res.status(400).json({
                  success: "False",
                  message: "A movie with the same title and release date already exists"
              });
          }

          // If no existing movie is found, proceed to create the new movie
          let newMovie = new Movie();
          newMovie.title = req.body.title;
          newMovie.releaseDate = req.body.releaseDate;
          newMovie.genre = req.body.genre;
          newMovie.actors = req.body.actors;

          newMovie.save(function(err) {
              if (err) {
                  return res.status(500).send(err);
              }
              res.json({message: "Movie Created"});
          });
      });
    })


    .put(authJwtController.isAuthenticated, (req, res) => {
        Movie.findOneAndUpdate(
            { title: req.body.title },
            req.body,
            { new: true, upsert: true },
            function(err, movie) {
                if (err) {
                    return res.status(500).send(err);
                }
                res.json({ message: "Movie Updated", movie: movie });
            }
        );
    })
    .delete(authJwtController.isAuthenticated, (req, res) => {
        Movie.findOneAndDelete({ title: req.body.title }, function(err, movie) {
            if (err) {
                return res.status(500).send(err);
            }
            if (!movie) {
                return res.status(404).json({
                    success: false,
                    message: "Movie not found"
                });
            }
            res.json({ message: "Movie Deleted", movie: movie });
        });
    })
    .all((req, res) => {
        // Any other HTTP Method
        // Returns a message stating that the HTTP method is unsupported.
        res.status(405).send({ message: 'HTTP method not supported.' });
    });


    router.get('/movies/:id', (req, res) => {
      const { id } = req.params;
      const includeReviews = req.query.reviews === 'true';
  
      let aggregationStages = [
          {
              $match: { _id: mongoose.Types.ObjectId(id) } // Ensuring the ID is treated as an ObjectId
          }
      ];
  
      if (includeReviews) {
          aggregationStages.push({
              $lookup: {
                  from: "reviews", // Assuming 'reviews' is the name of the collection
                  localField: "_id", // Field from the movies collection to match
                  foreignField: "movieId", // Field from the reviews collection that corresponds to movie ID
                  as: "movieReviews" // Array field to store the joined documents (reviews)
              }
          });
      }
  
      // Execute the aggregation
      Movie.aggregate(aggregationStages).exec((err, result) => {
          if (err) {
              res.status(500).json({ success: "False", message: "Error retrieving movie with reviews", error: err });
          } else {
              if (result.length === 0) {
                  res.status(404).json({ success: "False", message: "No movie found with the given ID" });
              } else {
                  res.json(result);
              }
          }
      });
  });


app.use('/', router);
app.listen(process.env.PORT || 8080);
module.exports = app; // for testing only











/*
router.get('/reviews:id', function(req,res){
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
});*//*
 THIS POST WORKS (no jwt auth)
router.post('/reviews', function(req, res) {
    const newReview = new Review({
      title: req.body.title,
      content: req.body.content,
      rating: req.body.rating
    });
  
    newReview.save(function(err, savedReview) {
      if (err) {
        return res.status(500).send({ message: "Failed to save review." });
      }
      res.status(201).send(savedReview);
    });
  });
*/