var gpsHome=[-122.807727,49.2480338];
var clubCallsign="VE7SCC";

var recent_delay=5000; //sets how long a contact dot remains orange

var width = 1600;
var height = 1600;

var projection = d3.geo.mercator()
	.center([0,-40])
		.scale((width + 1) / 2 / Math.PI)
		.translate([width / 2, height / 2])
		.precision(.1);

var path = d3.geo.path()
		.projection(projection);

var svg = d3.select("body").append("svg")
		.attr("id","worldmap")
		.attr("width", width)
		.attr("height", height)
		.attr("viewBox","0 0 "+width+" "+height)
		.attr("preserveAspectRatio","xMinYMid");

d3.select(self.frameElement).style("height", height + "px");
var aspect=$('#worldmap').width()/$('#worldmap').height();
$(window).on("resize",function(){
		var targetWidth=$('body').width();
		svg.attr("width",targetWidth);
		svg.attr("height",Math.round(targetWidth/aspect));
}).trigger("resize");


var draw_map=function(callback){
	d3.json("data/world-50m.json", function(error, world) {
		svg.insert("path")
				.datum(topojson.feature(world, world.objects.land))
				.attr("class", "land")
				.attr("d", path);

		svg.insert("path")
				.datum(topojson.mesh(world, world.objects.countries, function(a, b) { return a !== b; }))
				.attr("class", "boundary")
				.attr("d", path);

		d3.json("data/prov_4326_simple.topo.json",function(error,canada){
			svg.insert("path")
					.datum(topojson.mesh(canada, canada.objects.provinces))
					.attr("class", "boundary")
					.attr("d", path);
			d3.json("data/us-10m.json",function(error,us){
				svg.insert("path")
						.datum(topojson.mesh(us, us.objects.states))
						.attr("class", "boundary")
						.attr("d", path);
				callback();
			});
		});

	});
};


var contact=[];
var band_count={};
var bands=[];

var n={};

var processContact=function(data){
	if(data.coord) data.coord=[data.coord.longitude,data.coord.latitude];
	contact.push(data);
	if(!(data.Band in band_count)){
		bands.push(data.Band);
		bands.sort(function(a,b){return a-b});

		band_count[data.Band]=0;
	}
	band_count[data.Band]++;

};

var update=function(newcontact){

	var points=svg.selectAll("circle.contact").data(contact,function(d){return d.id});
	svg.selectAll("circle.contact.new.complete")
		.attr("class","contact old")
		.transition()
			.duration(1000)
			.style("r","6px")
			.attr("fill", "orange")
			.style("fill-opacity", 1)
		.transition()
			.delay(recent_delay)
			.duration(3000)
			.style("r","3px")
			.attr("fill", "teal")
			.attr("class","contact old complete");

	var pulse=function(){
		d3.select(this)
		.transition()
			.duration(250)
			.attr("r", "8px")
		.transition()
			.duration(100)
			.attr("r", "6px")
			.each("end",pulse);
	};

	//add new points
	points.enter().append("circle")
			.attr("class","contact new")
			.attr("cx", function (d) { if (!d.coord) return null; return projection(d.coord)[0]; })
			.attr("cy", function (d) { if (!d.coord) return null; return projection(d.coord)[1]; })
			.style("fill-opacity", 1e-6)
			.attr("r","100px")
			.attr("fill","white")
		.transition()
			.attr("class","contact new complete")
			.delay(500)
			.duration(500)
			.attr("r", "6px")
			.attr("fill", "red")
			.style("fill-opacity", 1)
			.each("end",pulse);


	points.exit().remove();

	//cool lines beaming in
	
	var lines=svg.selectAll("line.contact").data(typeof newcontact !== 'undefined' ? [newcontact] : [],function(d){return d.id});
	lines.enter().append("line")
		.attr("class","contact")
		.attr("x1", projection(gpsHome)[0])
		.attr("y1", projection(gpsHome)[1])
		.attr("x2", projection(gpsHome)[0])
		.attr("y2", projection(gpsHome)[1])
		.attr("stroke","red")
	.transition()
		.duration(500)
		.ease("linear")
		.attr("x2", function (d) { if(!d.coord) return null; return projection(d.coord)[0]; })
		.attr("y2", function (d) { if(!d.coord) return null; return projection(d.coord)[1]; })
	.transition()
		.duration(500)
		.ease("linear")
		.attr("x1", function (d) { if(!d.coord) return null; return projection(d.coord)[0]; })
		.attr("y1", function (d) { if(!d.coord) return null; return projection(d.coord)[1]; })
		.remove();

	lines.exit();

	var bandbardata=[];
	for(var i=0;i<bands.length;i++){
		bandbardata.push({
			"count":band_count[bands[i]],
			"band":bands[i]
		});
	};

	var bandscale=d3.scale.linear()
		.domain([0,d3.max(bandbardata,function(d){return d.count})])
		.range([0,300]);


	//-----band name text for band counts

	var bandbar_band=svg.selectAll("text.bandcount_band")
		.data(bandbardata,function(d){return d.band})
		;

	bandbar_band.enter().append("text").attr("class","bandcount_band")
		.attr("alignment-baseline","middle")
		.attr("text-anchor","end")
		.attr("fill","orange")
		.attr("font-size","15px")
		.attr("font-weight","bold")
		.attr("y",function(d,i){return 10+20*i+4})
		.attr("x",60)
		;
	bandbar_band
		.transition()
			.duration(1000)
			.attr("y",function(d,i){return 10+20*i+4})
			.text(function(d){return d.band+"MHz"})
		;

	//-----bars for band counts

	var bandbar=svg.selectAll("rect.bandcount")
		.data(bandbardata,function(d){return d.band});

	bandbar.enter().append("rect").attr("class","bandcount")
		.attr("x",65)
		.attr("y",function(d,i){return 5+20*i})
		.attr("height",15)
		.attr("width",0)
		.attr("fill","teal")
		;

	bandbar
		.transition()
			.duration(1000)
			.attr("width",function(d,i){return bandscale(d.count)})
			.attr("y",function(d,i){return 5+20*i})
		;

	//-----count text for band counts

	var bandbar_count=svg.selectAll("text.bandcount_count")
		.data(bandbardata,function(d){return d.band})
		;

	bandbar_count.enter().append("text").attr("class","bandcount_count")
		.attr("alignment-baseline","middle")
		.attr("text-anchor","end")
		.attr("height",15)
		.attr("fill","orange")
		.attr("font-size","15px")
		.attr("font-weight","bold")
		.attr("y",function(d,i){return 10+20*i+4})
		.attr("x",65)
		;
	bandbar_count
		.transition()
			.duration(1000)
			.attr("y",function(d,i){return 10+20*i+4})
			.attr("x",function(d,i){var x=60+bandscale(d.count);return x<80?80:x;})
			.text(function(d){return d.count});


	var totalContacts=svg.selectAll("text.total_contacts")
		.data([contact.length],function(d){return d});
	totalContacts.enter().append("text")
		.attr("class","total_contacts")
		.attr("x",width-10)
		.attr("y",100)
		.attr("font-size","100px")
		.attr("alignment-baseline","middle")
		.attr("text-anchor","end")
		.attr("fill","red")
		.style("fill-opacity", 1e-6)
		.style("stroke-opacity", 1e-6)
		.text(function(d){return d})
		.transition()
			.duration(500)
			.style("fill-opacity",1)
		;
	totalContacts.exit()
		.transition()
			.duration(500)
			.style("fill-opacity",0)
			.remove()
		;
};

var refreshStations=function(data){
	var ops=svg.select("g.stationlist").select("g.stationlist_items").selectAll("g.station")
		.data(data,function(d){return d.NetworkedCompNr.toString()+d.TS.toString();});

	var enter=ops.enter().append("g")
		.attr("class","station")
			.attr("fill","teal")
			.attr("font-size","15px")
		;

	enter.append("text").classed("operator",true);
	enter.append("text").classed("freq",true);
	enter.append("text").classed("mode",true);
	enter.append("text").classed("call",true)
		.attr("fill","red")
		.transition()
			.duration(1000)
			.attr("fill","teal");

	ops
		.attr("transform",function(d,i){return "translate(0,"+i*20+")"})
	;

	ops.selectAll("text.operator")
		.attr("fill","orange")
		.text(function(d){return d.Operator});

	ops.selectAll("text.freq")
		.attr("transform","translate(70,0)")
		.text(function(d){return d.Freq});

	ops.selectAll("text.mode")
		.attr("transform","translate(140,0)")
		.text(function(d){return d.Mode});

	ops.selectAll("text.call")
		.attr("transform","translate(185,0)")
		.text(function(d){return d.Call});


	ops.exit().remove();
}

draw_map(function(){
	
	var socket = io();

	socket.on('connect',function(){
		contact=[];
		band_count={};
		bands=[];
	});

	var timer=null;

	socket.on('oldcontact', function (data) {
		processContact(data);
		var points=svg.selectAll("circle.contact").data(contact,function(d){return d.id});
		points.enter().append("circle")
			.attr("cx", function (d) { if(!d.coord) return null; return projection(d.coord)[0]; })
			.attr("cy", function (d) { if(!d.coord) return null; return projection(d.coord)[1]; })
			.attr("class","contact old complete")
			.style("fill-opacity", 1)
			.attr("r","3px")
			.attr("fill","teal");
		clearTimeout(timer);
		setTimeout(update,500); //wait for 500ms of no more data before refreshing the display
	});

	socket.on('newcontact', function (data) {
		processContact(data);
		update(data);
	});

	var stationlist=svg.append("g")
		.attr("class","stationlist")
		.attr("transform","translate(10,"+projection([0,20])[1]+")")
		;
	stationlist.append("text")
		.attr("fill","orange")
		.attr("font-weight","bold")
		.text("Current Operators")
		;

	stationlist.append("g")
		.attr("class","stationlist_items")
		.attr("transform","translate(0,20)")
		;
	socket.on('stations',function(data){
		refreshStations(data);
	});

	svg.append("text")
		.attr("x",width/2)
		.attr("y",100)
		.attr("font-size","100px")
		.attr("alignment-baseline","middle")
		.attr("text-anchor","middle")
		.attr("fill","teal")
		.attr("stroke","orange")
		.style("fill-opacity", 1)
		.text(clubCallsign);

	svg.append("text")
		.attr("x",width-10)
		.attr("y",40)
		.attr("font-size","25px")
		.attr("alignment-baseline","baseline")
		.attr("text-anchor","end")
		.attr("fill","teal")
		.style("fill-opacity", 1)
		.text("Total Contacts");

});
