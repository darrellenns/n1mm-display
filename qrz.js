var rest=require('restler');
var prettyjson=require('prettyjson');
var util=require('util');
var assert=require('assert');
var settings=require('./settings')
var sqlite3=require('sqlite3').verbose();

var sessionid=null;
var qrzlookup=function(callsign,callback){
	if(!settings.qrz_user || !settings.qrz_pass){
		callback("No QRZ login credentials",null);
		return;
	}
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
			try{
				data.lat=parseFloat(data.lat);
				data.lon=parseFloat(data.lon);
			}catch(e){console.log(e);}
			callback(null,data);
		});
	}
};

var dbinsert=null;
var db=null;
var init=function(callback){
	db=new sqlite3.Database('./qrz_cache.sqlite')
		.on('open',function(){
			db.serialize(function(){
				db.run("CREATE TABLE IF NOT EXISTS geo(call TEXT PRIMARY KEY NOT NULL,lat REAL NULL,lon REAL NULL,geoloc TEXT NULL)");
				dbinsert=db.prepare("INSERT OR REPLACE INTO geo VALUES(?,?,?,?)");
				if(!settings.qrz_user || !settings.qrz_pass){
					console.log("No QRZ login credentials");
					callback("No QRZ login credentials");
				}else{
					qrzlookup("",function(err,result){callback();}); //Forces initial QRZ login
				}
			});
		}).on('error',function(error){
			throw(error);
		});
}

var qrzlocation=function(callsign,callback){
	if(!dbinsert){//don't try to use cache if db is not ready
		qrzlookup(callsign,callback);
		return;
	}
	db.get("SELECT * FROM geo WHERE UPPER(call)=UPPER(?)",[callsign],function(err,result){
		if(err) console.log(err);
		if(result){
			callback(null,result);
		}else{
			qrzlookup(callsign,function(err,result){
				if(err){
					dbinsert.run(callsign.toUpperCase(),null,null,null);
				}else{
					dbinsert.run(result.call,result.lat,result.lon,result.geoloc);
				}
				callback(err,result);
			});
		}
	});
};

exports.init=init;
exports.geo=qrzlocation;
exports.lookup=qrzlookup;
