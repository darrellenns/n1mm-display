var socket = io();
socket.on('news', function (data) {
	console.log(data);
});

var width = 1200,
		height = 600;

var projection = d3.geo.mercator()
	.center([0,20])
		.scale((width + 1) / 2 / Math.PI)
		.translate([width / 2, height / 2])
		.precision(.1);

var path = d3.geo.path()
		.projection(projection);

//var graticule = d3.geo.graticule();

var svg = d3.select("body").append("svg")
		.attr("id","worldmap")
		.attr("width", width)
		.attr("height", height)
		.attr("viewBox","0 0 "+width+" "+height)
		.attr("preserveAspectRatio","xMinYMid")

/*
svg.append("path")
		.datum(graticule)
		.attr("class", "graticule")
		.attr("d", path);
	*/
d3.json("data/prov_4326_simple.topo.json",function(error,canada){
	svg.insert("path")
			.datum(topojson.mesh(canada, canada.objects.provinces))
			.attr("class", "boundary")
			.attr("d", path);
});

d3.json("data/us-10m.json",function(error,us){
	svg.insert("path")
			.datum(topojson.mesh(us, us.objects.states))
			.attr("class", "boundary")
			.attr("d", path);
});

d3.json("data/world-50m.json", function(error, world) {
	svg.insert("path")
			.datum(topojson.feature(world, world.objects.land))
			.attr("class", "land")
			.attr("d", path);

	svg.insert("path")
			.datum(topojson.mesh(world, world.objects.countries, function(a, b) { return a !== b; }))
			.attr("class", "boundary")
			.attr("d", path);
});


d3.select(self.frameElement).style("height", height + "px");

var aspect=$('#worldmap').width()/$('#worldmap').height();
$(window).on("resize",function(){
		var targetWidth=$('body').width();
		svg.attr("width",targetWidth);
		svg.attr("height",Math.round(targetWidth/aspect));
}).trigger("resize");

