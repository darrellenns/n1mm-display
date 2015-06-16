var gpsHome=[-122.807727,49.2480338];
var clubCallsign="VE7SCC";

var width = 1600,
		height = 1600;

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

var processContact=function(data){
	data.coord=[data.coord.longitude,data.coord.latitude];
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
			.style("r","8px")
			.attr("fill", "orange")
			.style("fill-opacity", 1)
		.transition()
			.delay(5000)
			.duration(3000)
			.style("r","3px")
			.attr("fill", "teal")
			.attr("class","contact old complete");

	//add new points
	points.enter().append("circle")
			.attr("class","contact new")
			.attr("cx", function (d) { return projection(d.coord)[0]; })
			.attr("cy", function (d) { return projection(d.coord)[1]; })
			.style("fill-opacity", 1e-6)
			.attr("r","100px")
			.attr("fill","white")
		.transition()
			.attr("class","contact new complete")
			.delay(500)
			.duration(1000)
			.attr("r", "10px")
			.attr("fill", "red")
			.style("fill-opacity", 1);

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
		.attr("x2", function (d) { return projection(d.coord)[0]; })
		.attr("y2", function (d) { return projection(d.coord)[1]; })
	.transition()
		.duration(500)
		.ease("linear")
		.attr("x1", function (d) { return projection(d.coord)[0]; })
		.attr("y1", function (d) { return projection(d.coord)[1]; })
		.remove();

	lines.exit();

	var bandbardata=[];
	for(var i=0;i<bands.length;i++){
		bandbardata.push({
			"count":band_count[bands[i]],
			"band":bands[i]
		});
	};
	var bandbar=svg.selectAll("rect.bandcount")
		.data(bandbardata,function(d){return d.band});

	var bandscale=d3.scale.linear()
		.domain([0,d3.max(bandbardata,function(d){return d.count})])
		.range([0,300]);

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
			.attr("x",function(d,i){return 60+bandscale(d.count)})
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


draw_map(function(){
	
	var socket = io();

	socket.on('connect',function(){
		contact=[];
		band_count={};
		bands=[];
		update();
	});

	socket.on('oldcontact', function (data) {
		processContact(data);
		var points=svg.selectAll("circle.contact").data(contact,function(d){return d.id});
		points.enter().append("circle")
			.attr("cx", function (d) { return projection(d.coord)[0]; })
			.attr("cy", function (d) { return projection(d.coord)[1]; })
			.attr("class","contact old complete")
			.style("fill-opacity", 1)
			.attr("r","3px")
			.attr("fill","teal");
	});

	socket.on('loadcomplete',function(){
		update();
	});

	socket.on('newcontact', function (data) {
		processContact(data);
		update(data);
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

