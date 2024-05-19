var express = require('express');
const mongoose = require('mongoose');
var path = require('path');
var cookieParser = require('cookie-parser');
const logger = require('morgan');
const fileUpload = require('express-fileupload');
const swaggerUi = require('swagger-ui-express');
const swaggerDocument = require('./swagger/swagger.json');
var bodyParser = require('body-parser');
const xss = require('xss-clean');
const hpp = require('hpp');
const mongoSanitize = require('express-mongo-sanitize');
const morgan = require('morgan');
const rateLimit = require('express-rate-limit');
const dotenv = require('dotenv')
const AppError = require('./utils/appError');
const cors = require('cors');
// read and pass the environment variables into reactjs application
const env = dotenv.config().parsed;

const acRouter = require('./routes/ac');
const mmtRouter = require('./routes/mmt');
const pcapRouter = require('./routes/pcap');
const reportRouter = require('./routes/report');
const logRouter = require('./routes/log');
const modelRouter = require('./routes/model');
const buildRouter = require('./routes/build');
const retrainRouter = require('./routes/retrain');
const predictionRouter = require('./routes/prediction');
const predictRouter = require('./routes/predict');
const xaiRouter = require('./routes/xai');
const attacksRouter = require('./routes/attacks');
const metricsRouter = require('./routes/metrics');
const userRouter = require('./routes/userRoutes');

const globalErrorHandler = require('./controllers/errorController');

const app = express();
var compression = require('compression');
var helmet = require('helmet');

app.use(compression()); //Compress all routes
app.use(helmet());
app.set("port", process.env.SERVER_PORT);
app.use(logger('dev'));
app.use(express.json());
app.use(express.urlencoded({
  extended: false,
}));
app.use(cookieParser());
app.use(fileUpload());
app.use(bodyParser.json({
  limit: '50mb'
}));
app.use(bodyParser.urlencoded({
  limit: '50mb',
  extended: true
}))
app.use(cookieParser());
// Set up CORS
//app.use(cors());
app.use(cors({
  origin: '*', // replace with your client origin
  methods: ['GET', 'POST', 'DELETE', 'PUT'],
}));
// Add headers
/*app.use((req, res, next) => {
  // Website you wish to allow to connect
  res.setHeader('Access-Control-Allow-Origin', '*');

  // Request methods you wish to allow
  res.setHeader('Access-Control-Allow-Methods', 'GET, POST, DELETE');

  // Request headers you wish to allow
  res.setHeader('Access-Control-Allow-Headers', 'X-Requested-With, content-type, authorization');

  // Set to true if you need the website to include cookies in the requests sent
  // to the API (e.g. in case you use sessions)
  res.setHeader('Access-Control-Allow-Credentials', true);

  // Log the request
  // logInfo(`${req.method} ${req.protocol}://${req.hostname}${req.path} ${res.statusCode}`);
  // Pass to next layer of middleware
  next();
});*/

app.use('/api/ac', acRouter);
app.use('/api/mmt', mmtRouter);
app.use('/api/pcaps', pcapRouter);
app.use('/api/reports', reportRouter);
app.use('/api/logs', logRouter);
app.use('/api/models', modelRouter);
app.use('/api/build', buildRouter);
app.use('/api/retrain', retrainRouter);
app.use('/api/predictions', predictionRouter);
app.use('/api/predict', predictRouter);
app.use('/api/xai', xaiRouter);
app.use('/api/attacks', attacksRouter);
app.use('/api/metrics', metricsRouter);
app.use('/api/users', userRouter);
app.all('*', (req, res, next) => {
  next(new AppError(`Can't find ${req.originalUrl} on this server!`, 404));
});

app.use(globalErrorHandler);

// const DB = process..env.DATABASE_LOCAL.replace(
//     '<PASSWORD>',
//     process..env.DATABASE_PASSWORD
// )
//
// mongoose.connect(process..env.DATABASE_LOCAL)
//   .then(async (connection) => {
//     console.log(`DB connection successful! ({connections}):`, connection.connections);
//   })
//   .catch(error => {
//     console.error('DB connection error:', error);
//   });

// Limit requests from same API
const limiter = rateLimit({
  max: 100,
  windowMs: 60 * 60 * 1000,
  message: 'Too many requests from this IP, please try again in an hour!'
});

app.use('/api', limiter);


// Data sanitization against NoSQL query injection
app.use(mongoSanitize());
// Data sanitization against XSS
app.use(xss());


app.use(
  hpp({
    whitelist: [
      'duration',
      'ratingsQuantity',
      'ratingsAverage',
      'maxGroupSize',
      'difficulty',
      'price'
    ]
  })
);

app.use(compression());

// Test middleware
app.use((req, res, next) => {
  req.requestTime = new Date().toISOString();
  // console.log(req.cookies);
  next();
});


// Body parser, reading data from body into req.body
app.use(express.json({ limit: '10kb' }));
app.use(express.urlencoded({ extended: true, limit: '10kb' }));
app.use(cookieParser());

if (process.env.MODE === 'SERVER') {
  app.use(express.static(path.join(__dirname, '../public')));
  app.get('/*', function (req, res) {
    res.sendFile(path.join(__dirname, '../public', 'index.html'));
  });
} else if (process.env.MODE === 'API') {
  // start Swagger API server 
  app.use('/', swaggerUi.serve, swaggerUi.setup(swaggerDocument));
  app.use(express.static(path.join(__dirname, 'swagger')));
  module.exports = app;
}

module.exports = app;

var server = app.listen(app.get('port'), process.env.SERVER_HOST, function () {
  console.log(`[SERVER] MAIP Server started on: http://${process.env.SERVER_HOST}:${process.env.SERVER_PORT}`);
});