const express = require('express');
const dotenv = require('dotenv');
const mongoose = require('mongoose');
const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const bodyParser = require('body-parser');
const cors = require('cors');

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
        const hashedPassword = await bcrypt.hash(password, 10);
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

// Login route
app.post('/login', async (req, res) => {
    const { email, password } = req.body;

    if (!email || !password) {
        return res.status(400).send('Email and password are required.');
    }

    try {
        const user = await User.findOne({ email });

        if (!user) {
            return res.status(400).send('Invalid email or password.');
        }

        const isPasswordValid = await bcrypt.compare(password, user.password);
        if (!isPasswordValid) {
            return res.status(400).send('Invalid password.');
        }

        // Generate JWT token
        const token = jwt.sign(
            { _id: user._id, email: user.email }, 
            process.env.JWT_SECRET,               
            { expiresIn: '1d' }                   
        );

        res.status(200).send({
            message: 'Login successful',
            user: { name: user.name, email: user.email },
            token, 
        });
    } catch (err) {
        console.error('Error during login:', err);
        res.status(500).send('Server error. Please try again.');
    }
});

app.listen(port, () => console.log(`Server is running on port ${port}`));
