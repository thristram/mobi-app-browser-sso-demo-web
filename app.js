const createError = require('http-errors');
const express = require('express');
const path = require('path');
const bodyParser    = require('body-parser');
const cookieSession = require('cookie-session');
const cookieParser = require('cookie-parser');
const logger = require('morgan');
const urllib        = require('url');
const crypto        = require('crypto');
const config        = require('./config.json');


var indexRouter = require('./routes/index');
var usersRouter = require('./routes/users');
const defaultroutes = require('./routes/default');
const passwordauth  = require('./routes/password');
const webuathnauth  = require('./routes/webauthn.js');


var app = express();

// view engine setup
app.set('views', path.join(__dirname, 'views'));
app.set('view engine', 'pug');

app.use(logger('dev'));
app.use(express.json());
app.use(express.urlencoded({ extended: false }));

app.use(bodyParser.json());
app.use(cookieSession({
  name: 'session',
  keys: [crypto.randomBytes(32).toString('hex')],

  // Cookie Options
  maxAge: 24 * 60 * 60 * 1000 // 24 hours
}))

app.use(cookieParser());
app.use(express.static(path.join(__dirname, 'public')));

app.use('/', indexRouter);
app.use('/users', usersRouter);
app.use('/signin', defaultroutes)
app.use('/password', passwordauth)
app.use('/webauthn', webuathnauth)

// catch 404 and forward to error handler
app.use(function(req, res, next) {
  next(createError(404));
});

// error handler
app.use(function(err, req, res, next) {
  // set locals, only providing error in development
  res.locals.message = err.message;
  res.locals.error = req.app.get('env') === 'development' ? err : {};

  // render the error page
  res.status(err.status || 500);
  res.render('error');
});

module.exports = app;
