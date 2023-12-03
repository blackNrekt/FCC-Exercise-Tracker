const express = require('express')
const app = express()
const cors = require('cors')
require('dotenv').config()

let bodyParser = require('body-parser')
let mongoose = require('mongoose')

mongoose.connect(process.env['MONGO_URI']);

//Create user schema
const userSchema = new mongoose.Schema({
  username: { type: String, required: true }
});

const exerciseSchema = new mongoose.Schema({
  userId: { type: String, required: true },
  description: { type: String, required: true },
  duration: { type: Number, required: true },
  date: { type: Date, default: new Date() },
});

let userModel = new mongoose.model('user', userSchema);
let exerciseModel = new mongoose.model('exercise', exerciseSchema);


app.use(cors())
app.use(express.static('public'))
app.get('/', (req, res) => {
  res.sendFile(__dirname + '/views/index.html')
});
app.use('/', bodyParser.urlencoded({ extended: false }));

app.post('/api/users', async (req, res) => {
  let username = req.body.username;
  let newUser = new userModel({ username: username });
  let data = await newUser.save();
  res.json(data);
});

app.get('/api/users', async (req, res) => {
  try {
    let users = await userModel.find({});
    console.log(users);
    res.json(users);
  } catch (err) {
    res.json({ error: err.message });
  }
})

app.post('/api/users/:_id/exercises', async (req, res) => {
  let exerciseObj = {
    userId: req.params._id,
    description: req.body.description,
    duration: req.body.duration,
  };

  if (req.body.date != '') {
    exerciseObj.date = req.body.date;
  }

  let newExercise = new exerciseModel(exerciseObj);
  try {
    let userFound = await userModel.findById(req.params._id);
    await newExercise.save();
    res.json({
      _id: userFound._id,
      username: userFound.username,
      description: newExercise.description,
      duration: newExercise.duration,
      date: newExercise.date.toDateString(),
    });
  } catch (err) {
    res.json({ error: err.message });
  }
});

app.get('/api/users/:_id/logs', async (req, res) => {
  let userId = req.params._id;
  let userFound = await userModel.findById(userId);
  if (!userFound) {
    return res.json({ error: 'User not found' });
  }

  let limitParam = req.query.limit;
  let fromParam = req.query.from;
  let toParam = req.query.to;

    
  let queryObj = { userId: userId };
  let exercises;

  if (fromParam || toParam) {
    queryObj.date = {};
    if (fromParam) {
      queryObj.date.$gte = new Date(fromParam);
      queryObj.date.$lte = new Date(toParam);
    }
  }

  if (limitParam) {
    exercises = await exerciseModel.find(queryObj).limit(parseInt(limitParam)).lean();
  } else {
    exercises = await exerciseModel.find(queryObj).lean();
  }  
  
  exercises.forEach((exercise) => {
    if (exercise.date instanceof Date) {
      exercise.date = exercise.date.toDateString();
    } else {
      exercise.date = 'Invalid Date';
    }
  });

  let responseObj = {
    log: exercises,
    count: exercises.length,
  }



  res.json(responseObj)
});


const listener = app.listen(process.env.PORT || 3000, () => {
  console.log('Your app is listening on port ' + listener.address().port)
})
