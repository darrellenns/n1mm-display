var rest=require('restler');
var prettyjson=require('prettyjson');
var util=require('util');
var assert=require('assert');
var settings=require('./settings')
var sqlite3=require('sqlite3').verbose();

var sessionid=null;
var qrzlookup=function(callsign,callback){
	if (sessionid==null){
		console.log("Logging in to QRZ");
		rest.get('https://xmldata.qrz.com/xml/1.33/?username='+encodeURIComponent(settings.qrz_user)+'&password='+encodeURIComponent(settings.qrz_pass),{'parser':rest.parsers.xml}) 
		.on('complete',function(result){
			try{
				sessionid=result.QRZDatabase.Session[0].Key[0];
				assert(sessionid);
			}catch(e){
				console.log("Error logging in to QRZ");
				console.log(e);
				console.log(prettyjson.render(result));
				callback(e,null);
				return;
			}
			qrzlookup(callsign,callback);
			return;
		});
	}else{
		rest.get('http://xmldata.qrz.com/xml/1.33/?s='+encodeURIComponent(sessionid)+'&callsign='+encodeURIComponent(callsign),{parser:rest.parsers.xml})
		.on('complete',function(result){
			try{
				sessionid=result.QRZDatabase.Session[0].Key[0];
				assert(sessionid);
			}catch(e){
				console.log(e);
				console.log("QRZ session expired or temporary session error. Attempting to re-login and re-submit request");
				sessionid=null;
				qrzlookup(callsign,callback);
				return;
			}
			try{
				var data=result.QRZDatabase.Callsign[0];
			}catch(e){
				callback(e,result);
				return;
			}
			for(var field in data){
				data[field]=data[field][0];
			}
			callback(null,data);
		});
	}
};

/*
qrzlocation=function(callsign,callback){
	//TODO: fetch from cache if possible
	qrzlookup(callsign,function(err,result){
		if(err){
			callback(err,null);
			return;
		}
		//TODO: save result in cache cache result
	}
};*/
