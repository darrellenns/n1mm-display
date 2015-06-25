var width = 1600
var height = 1600

var projection = d3.geo.mercator()
	.center([0,-40])
		.scale((width + 1) / 2 / Math.PI)
		.translate([width / 2, height / 2])
		.precision(.1)

var path = d3.geo.path()
		.projection(projection)

var svg = d3.select("body").append("svg")
		.attr("id","worldmap")
		.attr("width", width)
		.attr("height", height)
		.attr("viewBox","0 0 "+width+" "+height)
		.attr("preserveAspectRatio","xMinYMid")

d3.select(self.frameElement).style("height", height + "px")
var aspect=$('#worldmap').width()/$('#worldmap').height()
$(window).on("resize",function(){
		var targetWidth=$('body').width()
		svg.attr("width",targetWidth)
		svg.attr("height",Math.round(targetWidth/aspect))
}).trigger("resize")


var draw_map=function(callback){
	d3.json("data/world-50m.json", function(error, world) {
		svg.insert("path")
				.datum(topojson.feature(world, world.objects.land))
				.attr("class", "land")
				.attr("d", path)

		svg.insert("path")
				.datum(topojson.mesh(world, world.objects.countries, function(a, b) { return a !== b }))
				.attr("class", "boundary")
				.attr("d", path)

		d3.json("data/prov_4326_simple.topo.json",function(error,canada){
			svg.insert("path")
					.datum(topojson.mesh(canada, canada.objects.provinces))
					.attr("class", "boundary")
					.attr("d", path)
			d3.json("data/us-10m.json",function(error,us){
				svg.insert("path")
						.datum(topojson.mesh(us, us.objects.states))
						.attr("class", "boundary")
						.attr("d", path)
				callback()
			})
		})

	})
}


var contact=[]

var processContact=function(data){
	if(data.coord) data.coord=[data.coord.longitude,data.coord.latitude]
	contact.push(data)
}

var update=function(newcontact){

	var points=svg.selectAll("circle.contact").data(contact,function(d){return d.id})
	svg.selectAll("circle.contact.new.complete")
		.attr("class","contact old")
		.transition()
			.duration(1000)
			.style("r","6px")
			.attr("fill", "orange")
			.style("fill-opacity", 1)
		.transition()
			.delay(recentDelay)
			.duration(3000)
			.style("r","3px")
			.attr("fill", "teal")
			.attr("class","contact old complete")

	var pulse=function(){
		d3.select(this)
		.filter("circle.contact.new.complete") //make sure there aren't any orphans
		.transition()
			.duration(250)
			.attr("r", "8px")
		.transition()
			.duration(100)
			.attr("r", "6px")
			.each("end",pulse)
	}

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
			.each("end",pulse)


	points.exit().remove()

	//cool lines beaming in
	
	var lines=svg.selectAll("line.contact").data(typeof newcontact !== 'undefined' ? [newcontact] : [],function(d){return d.id})
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
		.remove()

	lines.exit()


}

var refreshStations=function(data){
	var ops=svg.select("g.stationlist").select("g.stationlist_items").selectAll("g.station")
		.data(data,function(d){return d.NetBiosName+d.TS.toString()})

	var enter=ops.enter().append("g")
		.attr("class","station")
			.attr("fill","teal")
			.attr("font-size","20px")

	enter.append("text").classed("operator",true)
	enter.append("text").classed("freq",true)
	enter.append("text").classed("mode",true)
	enter.append("text").classed("call",true)
		.attr("fill","red")
		.transition()
			.duration(1000)
			.attr("fill","teal")

	ops
		.attr("transform",function(d,i){return "translate(0,"+i*30+")"})

	ops.selectAll("text.operator")
		.attr("fill","orange")
		.text(function(d){return d.Operator})

	ops.selectAll("text.freq")
		.attr("transform","translate(85,0)")
		.text(function(d){return d.Freq})

	ops.selectAll("text.mode")
		.attr("transform","translate(175,0)")
		.text(function(d){return d.Mode})

	ops.selectAll("text.call")
		.attr("transform","translate(240,0)")
		.text(function(d){return d.Call})


	ops.exit().remove()
}

var refreshBandCounts=function(data){

	var bandscale=d3.scale.linear()
		.domain([0,d3.max(data,function(d){return d.count})])
		.range([0,300])

	var bands=svg.select("g.bandcount").selectAll("g.band")
		.data(data,function(d){return d.Band})

	bands.exit().remove()

	var enter=bands.enter().append("g")
		.attr("class","band")

	bands
		.transition()
		.duration(1000)
		.attr("transform",function(d,i){return "translate(0,"+i*30+")"})

	//------------band name text
	enter.append("text").classed("bandname",true)
	enter.selectAll("text.bandname")
		.attr("text-anchor","end")
		.attr("fill","orange")
		.attr("font-size","20px")
		.attr("x",0)
		.attr("y",16)
		.text(function(d,i){return d.Band+"MHz"})

	//------------band bar
	enter.append("rect").classed("bar",true)
	enter.selectAll("rect.bar")
		.attr("x",10)
		.attr("y",0)
		.attr("height",20)
		.attr("width",0)
		.attr("fill","teal")
	bands.selectAll("rect.bar")
		.data(data,function(d){return d.Band})
		.transition()
			.duration(1000)
			.attr("width",function(d){return bandscale(d.count)})
	
	//------------text count
	enter.append("text").classed("count",true)
	enter.selectAll("text.count")
		.attr("text-anchor","start")
		.attr("height",20)
		.attr("fill","orange")
		.attr("font-size","20px")
		.attr("y",16)
		.attr("x",0)
	bands.selectAll("text.count")
		.data(data,function(d){return d.Band})
		.text(function(d){return d.count})
		.transition()
			.duration(1000)
			.attr("x",function(d){return bandscale(d.count)+10})
	
	//------------grand total
	var total=data.map(function(x){return x.count}).reduce(function(a,b){return a+b})
	var totalContacts=svg.selectAll("text.total_contacts")
		.data([total],function(d){return d})
	totalContacts.enter().append("text")
		.attr("class","total_contacts")
		.attr("x",width-10)
		.attr("y",120)
		.style("fill-opacity", 1e-6)
		.style("stroke-opacity", 1e-6)
		.text(function(d){return d})
		.transition()
			.duration(500)
			.style("fill-opacity",1)

	totalContacts.exit()
		.transition()
			.duration(500)
			.style("fill-opacity",0)
			.remove()
}

draw_map(function(){
	
	var socket = io()

	socket.on('connect',function(){
		contact=[]
	})

	//---------------------------band counts
	svg.append("g")
	.attr("class","bandcount")
	.attr("transform","translate(80,10)")

	//---------------------------current operator list
	var stationlist=svg.append("g")
		.attr("class","stationlist")
		.attr("transform","translate(10,"+projection([0,20])[1]+")")

	stationlist.append("text").classed("title stationlist",true)
		.text("Current Operators")

	stationlist.append("g")
		.attr("class","stationlist_items")
		.attr("transform","translate(0,40)")

	//---------------------------static text/titles
	svg.append("text")
		.classed("maintitle",true)
		.attr("x",width/2)
		.attr("y",100)
		.text(title)

	svg.append("text")
		.classed("total_title",true)
		.attr("x",width-10)
		.attr("y",40)
		.text("Total Contacts")

	//---------------------------socket.io handlers
	var oldcontacttimer=null
	socket.on('oldcontact', function (data) {
		processContact(data)
		var points=svg.selectAll("circle.contact").data(contact,function(d){return d.id})
		points.enter().append("circle")
			.attr("cx", function (d) { if(!d.coord) return null; return projection(d.coord)[0]; })
			.attr("cy", function (d) { if(!d.coord) return null; return projection(d.coord)[1]; })
			.attr("class","contact old complete")
			.style("fill-opacity", 1)
			.attr("r","3px")
			.attr("fill","teal")
		clearTimeout(oldcontacttimer)
		setTimeout(update,500) //wait for 500ms of no more data before refreshing the display
	})

	socket.on('newcontact', function (data) {
		processContact(data)
		update(data)
	})

	socket.on('bandcounts',refreshBandCounts)
	socket.on('stations',refreshStations)

})
