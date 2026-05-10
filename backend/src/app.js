const express = require('express');
const cors = require('cors');
const cookieParser = require('cookie-parser');
const helmet = require('helmet');
const path = require('path');
require('dotenv').config();

const errorHandler = require('./middlewares/error.middleware');
const routes = require('./routes/index');

const app = express();

app.use(helmet({
    crossOriginResourcePolicy: false,
}));
app.use(cors({
    origin: process.env.CORS_ORIGIN || 'http://localhost:5173',
    credentials: true
}));
app.use(express.json());
app.use(express.urlencoded({ extended: true }));
app.use(cookieParser());

// Expose uploads directory statically for document preview
app.use('/uploads', express.static(path.join(process.cwd(), 'uploads')));

app.use('/api', routes);

app.use(errorHandler);

module.exports = app;