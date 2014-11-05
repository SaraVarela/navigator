var diversityPlot = (function() {
	var margin = {top: 20, right: 20, bottom: 80, left: 40},
			padding = {top: 0, right: 0, bottom: 0, left: 80},
			width = 960,
			height = 800 - margin.top - margin.bottom;
	
	// Fetch diversity data from PBDB
	function getDiversityData(url) {
		$.ajax(url)
			.fail(function(error) {
				console.log(error);
			})
			.done(function(data) {
				getTimescale(data.records.map(function(d) {
					d.total = d.dor + d.dex + d.dsg + d.drt;
					return d;
				}));
			});
		}
	
	// Get appropriate timescale
	function getTimescale(data) {
		// Figure out how much timescale we need
		var maxAge = data[0].eag,
				minAge = data[data.length - 1].eag;

		var eras = [
			{"nam": "Paleozoic", "lag": 252.17, "eag": 541},
			{"nam": "Mesozoic", "lag": 66, "eag": 252.17},
			{"nam": "Cenozoic", "lag": 0, "eag": 66}
		];
		
		var requestedMaxAge, requestedMinAge;
		for (var i = 0; i < eras.length; i++) {
			// Get early era
			if (maxAge >= eras[i].lag && maxAge <= eras[i].eag) {
				requestedMaxAge = eras[i].eag;
			}
			// Get late era
			if (minAge >= eras[i].lag && minAge <= eras[i].eag) {
				requestedMinAge = eras[i].lag;
			}
		}
		
		// Request timescale data
		$.ajax("http://paleobiodb.org/data1.1/intervals/list.json?scale=1&order=older&max_ma=" + requestedMaxAge + "&min_ma=" + requestedMinAge)
			.fail(function(error) {
				console.log(error);
			})
			.done(function(timeData) {
				// Filter for eras and periods
				var timescale = timeData.records.filter(function(d) {
					if (d.lvl === 2 || d.lvl === 3) {
						d.totalTime = d.eag - d.lag;
						return d;
					}
				});
				draw(data, timescale);
			});
	} // End getTimescale
	
	function draw(data, timescale) {
		// Remove any old ones...
		d3.select("#diversity").select("svg").remove();

		// Aaaand....DRAW DRAW DRAW!
		var x = d3.scale.linear()
			.range([0, width - margin.left - margin.right]);
	
		var y = d3.scale.linear()
			.range([height - margin.top - margin.bottom, 0]);
	
		var xAxis = d3.svg.axis()
			.scale(x)
			.orient("bottom")
			.ticks(5);
	
		var yAxis = d3.svg.axis()
			.scale(y)
			.orient("left")
			.ticks(5);
			
		var periodX = d3.scale.linear()
			.domain([0, d3.sum(timescale, function(d) { if (d.lvl === 2) { return d.totalTime; } })])
			.range([0, width - margin.left - margin.right]);
		
		var periodPos = d3.scale.linear()
			.domain([d3.max(timescale, function(d) { return d.eag }), d3.min(timescale, function(d) { return d.lag })])
			.range([0, width - margin.left - margin.right]);
		
		var svg = d3.select("#diversity").append("svg")
			.attr("width", width)
			.attr("height", height)
			.attr("id", "diversityGraph")
		.append("g")
			.attr("id", "diversityGraphGroup")
			.attr("transform", "translate(" + margin.left + "," + margin.top + ")");
		
		var scale = d3.select("#diversityGraph").select("g")
			.append("g")
			.attr("id", "timeScale")
			.attr("transform", "translate(" + padding.left + "," + (height  - margin.top - margin.bottom + 3) + ")");
		
		var periods = timescale.filter(function(d) {
			if (d.lvl === 3) {
				return d;
			}
		});
		
		scale.selectAll(".periods")
			.data(periods)
		.enter().append("rect")
			.attr("height", "40")
			.attr("width", function(d) { return periodX(d.totalTime); })
			.attr("x", function(d) { return periodPos(d.eag) })
			.attr("id", function(d) { return "r" + d.oid })
			.style("fill", function(d) { return d.col })
			.append("svg:title")
			.text(function(d) { return d.nam });
		
		scale.selectAll(".periodNames")
			.data(periods)
		.enter().append("text")
			.attr("x", function(d) { return (periodPos(d.eag) + periodPos(d.lag))/2 })
			.attr("y", "30")
			.attr("id", function(d) { return "l" + d.oid })
			.attr("class", "timeLabel abbreviation")
			.text(function(d) { return d.abr });
		
		scale.selectAll(".periodNames")
			.data(periods)
		.enter().append("text")
			.attr("x", function(d) { return (periodPos(d.eag) + periodPos(d.lag))/2 })
			.attr("y", "30")
			.attr("class", "timeLabel dFullName")
			.attr("id", function(d) { return "l" + d.oid })
			.text(function(d) { return d.nam });
		
		var eras = timescale.filter(function(d) {
			if (d.lvl === 2) {
				return d;
			}
		});
		
		scale.selectAll(".eras")
			.data(eras)
		.enter().append("rect")
			.attr("height", "40")
			.attr("width", function(d) { return periodX(d.totalTime); })
			.attr("x", function(d) { return periodPos(d.eag) })
			.attr("y", "40")
			.attr("id", function(d) { return "r" + d.oid })
			.style("fill", function(d) { return d.col })
			.append("svg:title")
			.text(function(d) { return d.nam });
		
		scale.selectAll(".eraNames")
			.data(eras)
		.enter().append("text")
			.attr("x", function(d) { return (periodPos(d.eag) + periodPos(d.lag))/2 })
			.attr("y", "70")
			.attr("class", "timeLabel dFullName")
			.attr("id", function(d) { return "l" + d.oid })
			.text(function(d) { return d.nam; });
		
		x.domain([d3.max(eras, function(d) { return d.eag; }), d3.min(eras, function(d) { return d.eag; }) - padding.left])
		y.domain([0, d3.max(data, function(d) { return d.total; })]);
		
		// Append the x axis ticks and numbers
		svg.append("g")
			.attr("class", "x axis")
			.attr("transform", "translate(" + padding.left + "," + (height - margin.top - margin.bottom + 85) + ")")
			.call(xAxis);
		
		// Append the y axis
		svg.append("g")
			.attr("class", "y axis")
		.attr("transform", "translate(" + padding.left + ",0)")
			.call(yAxis)
		.append("text")
      .attr("transform", "rotate(-90)")
      .attr("y", 30)
      .attr("x", -130)
      .attr("dy", "-5em")
      .style("text-anchor", "end")
      .text("Total occurrences");
		
		// Draw zee line
		var line = d3.svg.line()
			.interpolate("linear") 
			.x(function(d) { return periodPos(d.eag) })
			.y(function(d) { return y(d.total); });
		
		svg.append("path")
			.datum(data)
			.attr("class", "line diversityLine")
			.attr("d", line)
			.attr("transform", "translate(" + padding.left + ",0)")
		//	.attr("stroke-dasharray", "10, 7");
		
		positionLabels();
		resize();
	}
	
	function positionLabels() {
		var labels = d3.selectAll(".dFullName"),
				 abbreviations = d3.selectAll(".abbreviation");

		for (var i = 0; i < labels[0].length; i++) {
			var id = d3.select(labels[0][i]).data()[0].oid,
					rectWidth = parseFloat(d3.select("rect#r" + id).attr("width")),
					rectX = parseFloat(d3.select("rect#r" + id).attr("x"))
		
			var labelWidth;
			try {
				labelWidth = d3.select(".dFullName#l" + id).node().getComputedTextLength();
			} catch(err) {
				labelWidth = 25;
			}
		
			if (rectWidth - 8 < labelWidth) {
				d3.select(".dFullName#l" + id).style("display", "none");
			} else {
				d3.select(".abbreviation#l" + id).style("display", "none");
				d3.select(".dFullName#l" + id).attr("x", rectX + ((rectWidth - labelWidth)/ 2));
			}
		}

		abbreviations.style("display","block");
		for (var i = 0; i < abbreviations[0].length; i++) {
			var id = d3.select(abbreviations[0][i]).data()[0].oid,
					rectWidth = parseFloat(d3.select("rect#r" + id).attr("width")),
					rectX = parseFloat(d3.select("rect#r" + id).attr("x"))

			var abbreviationWidth;
			try {
				abbreviationWidth = d3.select(".abbreviation#l" + id).node().getComputedTextLength();
			} catch(err) {
				abbreviationWidth = 20;
			}
		
			if (d3.select(".dFullName#l" + id).style("display") === "block" || rectWidth - 8 < abbreviationWidth) {
				console.log(id);
				d3.select(".abbreviation#l" + id).style("display", "none");
			} else {
				d3.select(".abbreviation#l" + id).attr("x", rectX + ((rectWidth - abbreviationWidth)/ 2));
			}
		}
	}
	
	function resize() {
	  var containerHeight = $(".diversityContainer").height() ,
	  			containerWidth = $(".diversityContainer").width() ;
	  	
	  	if (containerHeight > containerWidth) {
		  	var scale = containerWidth / width;
		  	
		  	if ((scale * height) > containerHeight) {
			  scale = containerHeight / height;
		  	}
	  	} else {
		  	// width > height
	  		var scale = containerHeight / height;
	  		if ((scale * width) > containerWidth) {
		  		scale = containerWidth / width;
	  		}
	  	}
	  	
		d3.select("#diversityGraphGroup")
			.attr("transform", "scale(" + scale + ")translate(" + margin.left + "," + margin.right + ")");
	
		d3.select("#diversityGraph")
			.attr("height", containerHeight - 300)
			.attr("width",containerWidth + margin.left + margin.right);
		
		positionLabels();
	}
	
	d3.select(window).on("resize", resize);
	
	return {
		"plot": getDiversityData,
		"resize": resize
	}
	
})();

//diversityPlot.plot("http://testpaleodb.geology.wisc.edu/data1.2/occs/diversity.json?base_name=Trilobita&count=genera&reso=stage");