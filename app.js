var express = require('express');
var app = express();
var server = require('http').Server(app);
var io = require('socket.io')(server);

var logger = require('morgan');
app.use(logger('dev'));

server.listen(3000);
server.on('listening',function(){
	//let the user know the server is listening
	var addr = server.address();
	var bind = typeof addr === 'string'
    ? 'pipe ' + addr
    : 'port ' + addr.port;
	console.log("Listening on "+bind);
});

app.set('view engine', 'jade');
app.use(express.static(__dirname + '/public'));
app.use('/js',  express.static(__dirname + '/bower_components'));

app.get('/', function (req, res) {
  res.render('index');
});

io.on('connection', function (socket) {
	//initial data sent on client connect
	socket.emit('news', { hello: 'world' });
});

/*
//just an example of sending data to the client asynchronously
var testtimer= function () {
	io.emit('news', { hello: 'second' });
	setTimeout(testtimer,1000);
}
testtimer();
*/

// catch 404 and forward to error handler
app.use(function(req, res, next) {
  var err = new Error('Not Found');
  err.status = 404;
  next(err);
});

// error handlers

// development error handler
// will print stacktrace
if (app.get('env') === 'development') {
  app.use(function(err, req, res, next) {
    res.status(err.status || 500);
    res.render('error', {
      message: err.message,
      error: err
    });
  });
}

// production error handler
// no stacktraces leaked to user
app.use(function(err, req, res, next) {
  res.status(err.status || 500);
  res.render('error', {
    message: err.message,
    error: {}
  });
});
