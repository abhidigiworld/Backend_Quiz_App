const express = require('express');
const dotenv = require('dotenv');
const mongoose = require('mongoose');
const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const bodyParser =require('body-parser');
const cors=require('cors');

const app = express();

dotenv.config();

app.use(cors());
app.use(bodyParser.json());
app.use(bodyParser.urlencoded({ extended: true }));


const port = process.env.PORT || 3002;

mongoose.connect("mongodb+srv://abhidigiworld:Abhi9988@quizdata.wozup.mongodb.net/?retryWrites=true&w=majority&appName=QuizData")
  .then(() => console.log('MongoDb connect'))
  .catch(err => console.error('MongoDB connection error:', err));
  

const userSchema = new mongoose.Schema({
    name: { type: String, required: true },
    email: { type: String, required: true, unique: true },
    password: { type: String, required: true },
});

const User = mongoose.model('User', userSchema);

app.post('/signup', async (req, res) => {
    const { name, email, password, confirmPassword } = req.body;
    console.log(req.body);

    if (!password || !confirmPassword) {
        return res.status(400).send('Password and confirmation password are required.');
    }

    if (password !== confirmPassword) {
        return res.status(400).send('Passwords do not match.');
    }

    let user = await User.findOne({ email });
    if (user) {
        return res.status(400).send('User already registered.');
    }

    try {
        const hashedPassword = await bcrypt.hash(password, 10); // 10 is the salt rounds
        user = new User({
            name,
            email,
            password: hashedPassword,
        });

        await user.save();

        res.status(201).send('User successfully registered.');
    } catch (err) {
        console.error('Error processing signup:', err);
        res.status(500).send('Error processing signup.');
    }
});


app.listen(port, () => console.log(`Server is running on port ${port}`));
