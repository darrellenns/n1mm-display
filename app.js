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


//database queries
var sqlite3=require('sqlite3').verbose();
var db=new sqlite3.Database("E:\\N1MM Logger+\\Databases\\ham.s3db");
var dxlog=function(clause,callback){
	db.each("SELECT strftime('%s',TS) as t,* from DXLOG "+clause,function(err,row){
		if(err) throw(err);
		row['id']=row.t+row.Call;
		row.t=parseInt(row.t);
		row['coord']=[Math.random()*(360)-180,Math.random()*(180)-90];
		callback(row);
	});
}

var seen=[];
var polldb=function(){
	dxlog("",function(row){
		if(seen.indexOf(row.id)==-1){
			console.log("New Contact: "+row.id);
			seen.push(row.id);
			io.emit('newcontact',row);
		}
	});
	setTimeout(polldb,3000);
}
polldb();

io.on('connection', function (socket) {
	console.log("New socket.io connection");
	dxlog("",function(row){
		socket.emit('oldcontact',row);
	});
});
