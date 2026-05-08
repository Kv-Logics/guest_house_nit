const express = require('express');
const cors = require('cors');
const cookieParser = require('cookie-parser');
const helmet = require('helmet');
require('dotenv').config();

const errorHandler = require('./middlewares/error.middleware');
const routes = require('./routes/index');

const app = express();

app.use(helmet());
app.use(cors({
    origin: process.env.CORS_ORIGIN || 'http://localhost:5173',
    credentials: true
}));
app.use(express.json());
app.use(express.urlencoded({ extended: true }));
app.use(cookieParser());

app.use('/api', routes);

app.use(errorHandler);

module.exports = app;