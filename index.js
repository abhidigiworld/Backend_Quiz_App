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
    userType: { type: String, default: 'User' }
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
            return res.status(400).send('Invalid User.');
        }

        const isPasswordValid = await bcrypt.compare(password, user.password);
        if (!isPasswordValid) {
            return res.status(400).send('Invalid password.');
        }

        const token = jwt.sign(
            { _id: user._id, email: user.email, userType: user.userType , name :user.name}, 
            process.env.JWT_SECRET,
            { expiresIn: '1d' }
        );
        
        res.status(200).send({
            message: 'Login successful',
            user: { name: user.name, email: user.email, userType: user.userType }, 
            token, 
        });
    } catch (err) {
        console.error('Error during login:', err);
        res.status(500).send('Server error. Please try again.');
    }
});


//api to get the data 
app.get('/api/users', async (req, res) => {
    try {
        const users = await User.find();
        res.json(users);
    } catch (err) {
        res.status(500).json({ message: err.message });
    }
});


// Delete User path
app.delete('/api/users/:id', async (req, res) => {
    const { id } = req.params;

    try {
        const deletedUser = await User.findByIdAndDelete(id);

        if (!deletedUser) {
            return res.status(404).json({ message: 'User not found.' });
        }

        res.json({ message: 'User deleted successfully.' });
    } catch (err) {
        console.error('Error deleting user:', err);
        res.status(500).json({ message: 'Server error. Please try again.' });
    }
});


// Update User Route
app.put('/api/users/:id', async (req, res) => {
    const { id } = req.params;
    const { name, email, userType } = req.body;
    if (!name || !email || !userType) {
        return res.status(400).json({ message: 'All fields are required.' });
    }
    
    try {
        const updatedUser = await User.findByIdAndUpdate(
            id,
            { name, email, userType },
            { new: true } 
        );

        if (!updatedUser) {
            return res.status(404).json({ message: 'User not found.' });
        }

        res.json(updatedUser);
    } catch (err) {
        console.error('Error updating user:', err);
        res.status(500).json({ message: 'Server error. Please try again.' });
    }
});


// Define the MCQ Test schema
const mcqTestSchema = new mongoose.Schema({
    testName: { type: String, unique: true, required: true },
    questions: [
        {
            question: { type: String, required: true },
            options: { type: [String], required: true },
            correctAnswer: { type: String, required: true }
        }
    ],
    expiryTime: { type: Date, required: true }
});

const McqTest = mongoose.model('McqTest', mcqTestSchema);

// Route to create a new test
app.post('/api/tests', async (req, res) => {
    const { testName, questions, expiryTime } = req.body;

    try {
        const newTest = new McqTest({ testName, questions, expiryTime });
        await newTest.save();
        res.status(201).json({ message: 'Test created successfully!' });
    } catch (error) {
        console.error('Error creating test:', error);
        res.status(500).json({ message: 'Failed to create test' });
    }
});


// Get all tests route
app.get('/api/tests', async (req, res) => {
    try {
        const tests = await McqTest.find();
        res.json(tests);
    } catch (error) {
        console.error('Error fetching tests:', error);
        res.status(500).json({ message: 'Failed to fetch tests' });
    }
});

app.get('/api/student-tests', async (req, res) => {
    try {
        const tests = await McqTest.find(); 
        res.json(tests);
    } catch (err) {
        res.status(500).json({ message: 'Server error. Please try again.' });
    }
});


// GET endpoint to fetch a specific test by testId
app.get('/api/test/:testId', async (req, res) => {
    try {
        const test = await McqTest.findById(req.params.testId);
        if (!test) {
            return res.status(404).json({ message: 'Test not found' });
        }
        res.json(test);
    } catch (error) {
        console.error('Error fetching test:', error);
        res.status(500).json({ message: 'Server error' });
    }
});

// Route to delete a test
app.delete('/api/tests/:id', async (req, res) => {
    try {
        const testId = req.params.id;
        await McqTest.findByIdAndDelete(testId);
        res.status(200).send({ message: 'Test deleted successfully' });
    } catch (error) {
        res.status(500).send({ error: 'Error deleting test' });
    }
});

// StudentScore Schema
const studentScoreSchema = new mongoose.Schema({
    testId: { type: mongoose.Schema.Types.ObjectId, ref: 'McqTest', required: true },
    testName: { type: String, required: true },
    email: { type: String, required: true },
    score: { type: Number, required: true },
    answers: { type: [String], required: true }
});

const StudentScore = mongoose.model('StudentScore', studentScoreSchema);

app.post('/api/submittest/:testId', async (req, res) => {
    const { testId } = req.params;
    const { answers, email } = req.body;

    try {
        // Verify JWT token
        const authHeader = req.headers.authorization;
        if (!authHeader || !authHeader.startsWith('Bearer ')) {
            return res.status(401).json({ message: 'Unauthorized: No token provided' });
        }

        const token = authHeader.split(' ')[1];
        const decodedToken = jwt.verify(token, process.env.JWT_SECRET);
        if (decodedToken.email !== email) {
            return res.status(403).json({ message: 'Forbidden: Invalid user' });
        }

        // Find the test
        const test = await McqTest.findById(testId);
        if (!test) {
            return res.status(404).json({ message: 'Test not found' });
        }

        // Calculate the score and prepare answer strings
        let score = 0;
        const answerStrings = answers.map((answerIndex, index) => {
            const correctAnswer = test.questions[index].correctAnswer;
            const selectedAnswer = test.questions[index].options[answerIndex];
            
            if (correctAnswer === selectedAnswer) {
                score++;
            }
            return selectedAnswer; 
        });

        // Save the score and answers in StudentScore schema
        const studentScore = new StudentScore({
            testId,
            testName: test.testName,
            email,
            score,
            answers: answerStrings
        });

        await studentScore.save();

        // Respond with the score 
        res.status(200).json({ score });

    } catch (error) {
        console.error('Error submitting test:', error);
        res.status(500).json({ message: 'Server error' });
    }
});


// API to get all tests attempted by the user
app.get('/api/student-testss', async (req, res) => {
    console.log("working");
    
    try {
        // Verify JWT token
        const authHeader = req.headers.authorization;
        if (!authHeader || !authHeader.startsWith('Bearer ')) {
            return res.status(401).json({ message: 'Unauthorized: No token provided' });
        }

        const token = authHeader.split(' ')[1];
        const decodedToken = jwt.verify(token, process.env.JWT_SECRET);
        const email = decodedToken.email;

        // Find all tests attempted by the user and select specific fields
        const attemptedTests = await StudentScore.find({ email }).select('testId testName score');

        res.status(200).json(attemptedTests);
    } catch (error) {
        console.error('Error fetching tests:', error);
        res.status(500).json({ message: 'Server error' });
    }
});



app.listen(port, () => console.log(`Server is running on port ${port}`));
