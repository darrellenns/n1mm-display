var async = require('async');
var express = require('express');
var app = express();
var server = require('http').Server(app);
var io = require('socket.io')(server);
var settings=require('./settings.js');
var geo=require('./geo.js');

var logger = require('morgan');
app.use(logger('dev'));


app.set('view engine', 'jade');
app.use(express.static(__dirname + '/public'));
app.use('/js',  express.static(__dirname + '/bower_components'));

app.get('/', function (req, res) {
  res.render('index',{
	  title:settings.title,
	  gpsHome:settings.gpsHome,
	  recentDelay:settings.recentDelay
  });
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


//---------------------------------database helpers
var sqlite3=require('sqlite3').verbose();
var db=new sqlite3.Database(settings.n1mm_db);
var contestNR=-2;

var dxlog=function(clause,callback,complete){
	db.each("SELECT strftime('%s',TS) as t,* from DXLOG WHERE ContestNR="+contestNR.toString()+" "+clause,function(err,row){
		if(err) throw(err);
		row['id']=row.t+row.Call+row.Band.toString()+row.Mode;
		callback(row);
	},complete);
}

var dxlog_addinfo=function(row,callback){
	geo.resolve(row,function(geodata){
		row['coord']=geodata;
		row.t=parseInt(row.t);
		callback(row);
	});
}

//---------------------------------polling functions
var seen=[];
var pollContacts=function(){
	var newcontacts=false;
	dxlog("AND TS>DATETIME('now','-15 minutes')",function(row){
		if(seen.indexOf(row.id)==-1){
			console.log("New Contact: "+row.id);
			newcontacts=true;
			dxlog_addinfo(row,function(row){
				seen.push(row.id);
				io.emit('newcontact',row);
			});
		}
	},function(err,count){
		if(newcontacts) refreshBandCounts();
		setTimeout(pollContacts,3000);
	});
}


var pollStations=function(){
	db.all("select * from dxlog inner join (select NetBiosName,MAX(TS) as TS from dxlog where ContestNR="+contestNR+" AND TS>DATETIME('now','-30 minutes') group by NetBiosName) t on t.NetBiosName=dxlog.NetBiosName and t.TS=dxlog.TS WHERE ContestNR="+contestNR+" order by NetBiosName asc;"
	,function(err,rows){
		io.emit('stations',rows);
		setTimeout(pollStations,3000);
	});
}

var refreshBandCounts=function(){
	db.all("select Band,count(*) as count from dxlog where ContestNR="+contestNR+" group by Band order by Band asc;"
	,function(err,rows){
		io.emit('bandcounts',rows);
	});
}

//---------------------------------event handlers
io.on('connection', function (socket) {
	console.log("New socket.io connection");
	dxlog("",function(row){
		dxlog_addinfo(row,function(row){
			socket.emit('oldcontact',row);
		});
	},function(err,count){
		refreshBandCounts();
	});
});

server.on('listening',function(){
	var addr = server.address();
	var bind = typeof addr === 'string'
	? 'pipe ' + addr
	: 'port ' + addr.port;
	console.log("Listening on "+bind);
});

//---------------------------------initialization
async.series([
	function(callback){
		db.all("select max(ContestNR) as id from ContestInstance",function(err,rows){
			if(err) throw(err);
			contestNR=rows[0].id;
			console.log("Contest ID: "+contestNR.toString());
			callback();
		});
	},
	geo.init,
	function(callback){
		server.listen(settings.listenPort);
		pollContacts();
		pollStations();
		callback();
	}
]);
