var settings=require('./settings.js');
var arrl_section=require('./arrl_sections.json');
var qrz=require('./qrz.js');

var random_bounds=function(min,max){
	return(Math.random()*(max-min)+min);
};

var random_center=function(center,range){
	return((Math.random()*2-1)*range+center);
};

//Load prefix data into memory
var prefixData={}
exports.init=function(callback){
	var sqlite3=require('sqlite3').verbose();
	var db=new sqlite3.Database(settings.n1mm_admin_db);
	db.serialize(function(){
		db.each("select * from Prefixes left join CTYDAT on CTYDAT.MasterPrefix=Prefixes.MasterPrefix",function(err,row){
				if(err) throw(err);
				row.Longitude*=-1;
				prefixData[row.Prefix]=row;
		},function(){
			qrz.init(callback);
		});
	});
	db.close();
};

exports.resolve=function(row,callback){
	qrz.geo(row.Call,function(err,result){
		if(result.lat && result.lon && (result.geoloc=='user' || result.geoloc=='geocode' || result.geoloc=='grid' || result.geocode=='zip')){
			callback({
				'latitude':result.lat,
				'longitude':result.lon
			});
			return;
		}
		try{
			section=arrl_section[row.Sect.toUpperCase()];
			callback({
				'latitude':random_bounds(section['lat min'],section['lat max']),
				'longitude':random_bounds(section['long min'],section['long max'])
			});
			return;
		}catch(TypeError){
		}

		for(var i=row.Call.length;i>0;i--){
			data=prefixData[row.Call.slice(0,i)];
			if(data){
				callback({
					'latitude':random_center(data.Latitude,4),
					'longitude':random_center(data.Longitude,4)
				});
				return;
			}
		}
		callback(null);
		return;
	});
};
