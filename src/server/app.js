const express = require('express');
const swaggerSpec = require('./swagger/swagger.json');
const mongoose = require('mongoose');
const path = require('path');
const cookieParser = require('cookie-parser');
const logger = require('morgan');
const fileUpload = require('express-fileupload');
const swaggerUi = require('swagger-ui-express');
const xss = require('xss-clean');
const hpp = require('hpp');
const mongoSanitize = require('express-mongo-sanitize');
const rateLimit = require('express-rate-limit');
const dotenv = require('dotenv');
const AppError = require('./utils/appError');
const cors = require('cors');
const compression = require('compression');
const helmet = require('helmet');
const globalErrorHandler = require('./controllers/errorController');
const http = require('http');

dotenv.config(); // Load environment variables

// Initialize Express app
const app = express();
app.set("port", process.env.SERVER_PORT || 3000);

// Middleware setup
app.use(compression()); // Compress all routes
app.use(helmet()); // Secure Express apps by setting various HTTP headers
app.use(logger('dev')); // Log HTTP requests
app.use(express.json({ limit: '10kb' })); // Parse JSON bodies with a size limit
app.use(express.urlencoded({ extended: true, limit: '10kb' })); // Parse URL-encoded bodies
app.use(cookieParser()); // Parse cookies
app.use(fileUpload()); // Handle file uploads

// CORS setup
app.use(cors({
    origin: '*', // Adjust as needed
    methods: ['GET', 'POST', 'DELETE', 'PUT'],
}));

// Security Middleware
app.use(mongoSanitize()); // Data sanitization against NoSQL query injection
app.use(xss()); // Data sanitization against XSS
app.use(hpp()); // Prevent HTTP parameter pollution

// Rate limiting to prevent abuse
const limiter = rateLimit({
    max: 100,
    windowMs: 60 * 60 * 1000, // 100 requests per hour
    message: 'Too many requests from this IP, please try again in an hour!'
});
app.use('/api/nts', limiter);

// Routers
const acRouter = require('./routes/ac');
const mmtRouter = require('./routes/mmt');
const pcapRouter = require('./routes/unused/pcap');
const reportRouter = require('./routes/report');
const logRouter = require('./routes/log');
const modelRouter = require('./routes/model');
const buildRouter = require('./routes/build');
const retrainRouter = require('./routes/retrain');
const predictionRouter = require('./routes/prediction');
const predictRouter = require('./routes/predict');
const xaiRouter = require('./routes/xai_old');
const attacksRouter = require('./routes/attacks');
const metricsRouter = require('./routes/metrics');

app.use('/api/nts/ac', acRouter);
app.use('/api/nts/mmt', mmtRouter);
app.use('/api/nts/pcaps', pcapRouter);
app.use('/api/nts/reports', reportRouter);
app.use('/api/nts/logs', logRouter);
app.use('/api/nts/models', modelRouter);
app.use('/api/nts/build', buildRouter);
app.use('/api/nts/retrain', retrainRouter);
app.use('/api/nts/predictions', predictionRouter);
app.use('/api/nts/predict', predictRouter);
app.use('/api/nts/xai', xaiRouter);
app.use('/api/nts/attacks', attacksRouter);
app.use('/api/nts/metrics', metricsRouter);

// Handle root route based on mode
if (process.env.MODE === 'API') {
    console.log(`[MODE] Running in API mode`);
    app.use('/api-docs', swaggerUi.serve, swaggerUi.setup(swaggerSpec));
    app.get('/', (req, res) => res.redirect('/api-docs'));
} else if (process.env.MODE === 'SERVER') {
    console.log(`[MODE] Running in SERVER mode`);
    app.use(express.static(path.join(__dirname, '../public')));
    app.get('/', (req, res) => {
        res.sendFile(path.join(__dirname, '../public', 'index.html'));
    });
}

// Handle undefined routes
app.all('*', (req, res, next) => {
    next(new AppError(`Can't find ${req.originalUrl} on this server!`, 404));
});

// Error handling middleware
app.use(globalErrorHandler);

// Start HTTP server
const server = http.createServer(app);
server.listen(app.get('port'), process.env.SERVER_HOST || 'localhost', () => {
    console.log(`[SERVER] HTTP Server started on http://${'localhost'}:${app.get('port')}`);
});

module.exports = app;
