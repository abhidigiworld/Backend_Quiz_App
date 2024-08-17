const express = require('express');
const dotenv = require('dotenv');
const jwt = require('jsonwebtoken');

const app = express();
dotenv.config();

const port = process.env.PORT || 3002;

app.get("/", (req, res) => {
    const token = req.header('x-auth-token');
    if (!token) return res.status(401).send('Access denied. No token provided.');
    try {
        const decoded = jwt.verify(token, process.env.JWT_SECRET);
        res.send(decoded);
    }
    catch (ex) {
        res.status(400).send('Invalid token.');
    }
});

app.listen(
    port,
    () => console.log(`Server is running on port ${port}`)
);
