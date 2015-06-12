var express = require('express');
var app = express();
var server = require('http').Server(app);
var io = require('socket.io')(server);

server.listen(3000);

app.set('view engine', 'jade');
app.use(express.static(__dirname + '/public'));
app.use('/js',  express.static(__dirname + '/bower_components'));

app.get('/', function (req, res) {
  res.render('index');
});

io.on('connection', function (socket) {
	socket.emit('news', { hello: 'world' });
});

var testtimer= function () {
	io.emit('news', { hello: 'second' });
	setTimeout(testtimer,1000);
}
testtimer();
