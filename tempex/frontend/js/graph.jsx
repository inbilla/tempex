Vue.component('graph', {
    props: ['series'],
    data: function() {
        return {
            update_counter: 0,
            interval: null,
            update_period: 1000*5, //*60*5,
            query_result: {},
            svg: null,
            xScale: null,
            yScale: null,
            transition_time: 1500,
        };
    },
    template: `
    <div class="container-fluid">
        <div class="row">
            <div class="col-10" ref="d3_target">
            </div>
            <div class="col-2 my-auto">
                <div class="card">
                    <div class="card-header">
                        <h5 ref="d3_legend_header">Temperature</h5>
                    </div>
                    <div class="card-body" ref="d3_legend">
                        <h6 class="float-right" ref="rel_current_x">now</h6>
                        <h5 ref="current_x">Monday 19:30</h5>
                        <div ref="legend_values">
                        </div>
                    </div>
                </div>
            </div>
        </div>
    </div>
    `,
    mounted: function() {
        this.create_chart();
        this.update_data();
    },
    destroyed: function() {
        if (this.interval) {
            clearTimeout(this.interval);  
        }
    },
    watch: {
        query_result: function (val) {
            this.draw();
        },
    },
    methods: {
        update_data() {
            this.update_counter += 1;
            d3.json("/api/query?interval=30m&begin=now-3d&values="+this.series)
            .then((data) => {
                this.query_result = data;

                this.interval = setTimeout(()=>{
                    this.update_data();
                }, this.update_period);
            })
            .catch((error) => {
                // Do some error handling.
                console.log("Error fetching data");

                this.interval = setTimeout(()=>{
                    this.update_data();
                }, this.update_period);
            });
        },
        create_chart() {
            // set the dimensions and margins of the graph
            var margin = {top: 10, right: 8, bottom: 55, left: 40}, //{top: 10, right: 30, bottom: 90, left: 60},
                width = 1000 - margin.left - margin.right,
                height = 250 - margin.top - margin.bottom;

            // Do a title
            d3.select(this.$refs.d3_legend_header)
                .text(this.series)

            // append the svg object to the body of the page
            this.svg = d3.select(this.$refs.d3_target)
                .append("svg")
                .attr("viewBox", "0 0 1000 250")
                .attr("perserveAspectRatio", "xMinYMid")
                //.attr("preserveAspectRatio", "xMidYMid meet")
                //.attr("width", width + margin.left + margin.right)
                //.attr("height", height + margin.top + margin.bottom)
                .append("g")
                .attr("transform", "translate(" + margin.left + "," + margin.top + ")");

            // Add X axis --> it is a date format
            var data = d3.entries(this.query_result);
            this.xScale = d3.scaleTime()
                .domain([0,0]) // d3.extent(data, function(d) { return new Date(d.key * 1000); }))
                .range([ 0, width ]);
            this.svg.append("g")
                .attr("transform", "translate(0," + height + ")")
                //.style("font-size", "14px")
                .attr("class","x axis")
                .call(d3.axisBottom(this.xScale));

            // Add Y axis
            this.yScale = d3.scaleLinear()
                .domain([0, 0]) // d3.max(data, function(d) { return +d.value; })])
                .range([ height, 0 ]);
            this.svg.append("g")
                .attr("class","y axis")
                .call(d3.axisLeft(this.yScale));
            this.svg.append("text")
                .attr("transform", "rotate(-90)")
                .attr("y", 0 - margin.left)
                .attr("x", 0 - (height / 2))
                .attr("dy", "1em")
                .style("fill", "currentColor")
                .style("text-anchor", "middle")
                //.style("font-size", "10px")
                .text(this.series);  

            // Add Z axis
            this.zScale = d3.scaleOrdinal(d3.schemeCategory10);

            // Add the series group
            this.series_g = this.svg.append("g");

            // Add mouse over helper
            this.create_mouse_helper();
        },
        create_mouse_helper(){
            var svg = this.svg;
            // append a g for all the mouse over nonsense
            var mouseG = svg.append("g")
                .attr("class", "mouse-over-effects");
            
            this.mouse_g = mouseG.append("g");

            // this is the vertical line
            mouseG.append("path")
                .attr("class", "mouse-line")
                .style("stroke", "currentColor")
                .style("stroke-width", "1px")
                .style("opacity", "0");
            
            // here's a g for each circle and text on the line
            // var mousePerLine = mouseG.selectAll('.mouse-per-line')
            //     .data(cities)
            //     .enter()
            //     .append("g")
            //     .attr("class", "mouse-per-line");

            // // the circle
            // mousePerLine.append("circle")
            //     .attr("r", 7)
            //     .style("stroke", function(d) {
            //     return color(d.name);
            //     })
            //     .style("fill", "none")
            //     .style("stroke-width", "1px")
            //     .style("opacity", "0");

            // // the text
            // mousePerLine.append("text")
            //     .attr("transform", "translate(10,3)");

            // rect to capture mouse movements
            var mouseCap = mouseG.append('svg:rect')
                .attr('width', this.xScale.range()[1])
                .attr('height', this.yScale.range()[0])
                .attr('fill', 'none')
                .attr('pointer-events', 'all');
            mouseCap
                .on('mouseout', () => { // on mouse out hide line, circles and text
                    mouseG.select(".mouse-line")
                        .style("opacity", "0");
                    mouseG.selectAll(".mouse-per-line circle")
                        .style("opacity", "0");
                    mouseG.selectAll(".mouse-per-line text")
                        .style("opacity", "0");
                    })
                .on('mouseover', () => { // on mouse in show line, circles and text
                    mouseG.select(".mouse-line")
                        .style("opacity", "0.7");
                    mouseG.selectAll(".mouse-per-line circle")
                        .style("opacity", "1");
                    mouseG.selectAll(".mouse-per-line text")
                        .style("opacity", "1");
                    })
                .on('mousemove', () => { // mouse moving over canvas
                    var mouse = d3.mouse(mouseCap.node());
                    var xDate = this.xScale.invert(mouse[0]);

                    d3.select(this.$refs.current_x)
                        .text(d3.timeFormat("%a %H:%M")(xDate));
                    d3.select(this.$refs.rel_current_x)
                        .text(moment(xDate).fromNow());
                    
                    // move the vertical line
                    mouseG.select(".mouse-line")
                        .attr("d", () => {
                            var d = "M" + mouse[0] + "," + this.yScale.range()[0];
                            d += " " + mouse[0] + "," + 0;
                            return d;
                        });
                    
                    // position the circle and text
                    var self = this;
                    mouseG.selectAll(".mouse-per-line")
                        .each(function(d) {
                            var xDate = self.xScale.invert(mouse[0]),
                                bisect = d3.bisector((d) => { return +d.x; }).right;
                                index = bisect(d.data, xDate);
                            startDatum = d.data[index - 1],
                            endDatum = d.data[index];
                            if (!startDatum) {
                                startDatum = endDatum;
                            }
                            if (!endDatum){
                                endDatum = startDatum;
                            }
                            interpolate = d3.interpolateNumber(startDatum.y, endDatum.y),
                            range = endDatum.x - startDatum.x,
                            valueY = interpolate((xDate - startDatum.x) / range);

                            if (!valueY)
                            {
                                return;
                            }
                            // since we are use curve fitting we can't relay on finding the points like I had done in my last answer
                            // this conducts a search using some SVG path functions
                            // to find the correct position on the line
                            // from http://bl.ocks.org/duopixel/3824661
                            // var beginning = 0,
                            //     end = lines[i].getTotalLength(),
                            //     target = null;

                            // while (true){
                            //     target = Math.floor((beginning + end) / 2);
                            //     pos = lines[i].getPointAtLength(target);
                            //     if ((target === end || target === beginning) && pos.x !== mouse[0]) {
                            //         break;
                            //     }
                            //     if (pos.x > mouse[0])      end = target;
                            //     else if (pos.x < mouse[0]) beginning = target;
                            //     else break; //position found
                            // }

                            // // update the text with y value
                            d3.select(this).select('text')
                                .text(valueY.toFixed(2));
                            d3.select(this)
                                .attr("transform", "translate(" + mouse[0] + "," + self.yScale(valueY) +")");
                        });
                });
        },
        prepare_series(data, sensor_name, series_name) {
            var series = {};
            series.name = sensor_name + " " + series_name;
            series.sensor = sensor_name;
            series.metric = series_name;
            series.x_access = function(d) {
                return new Date(parseInt(d.key));
            };
            series.y_access = function(d) {
                var sensor = d.value[sensor_name];
                if (!sensor) {
                    return null;
                }
                return sensor[series_name];
            };
            series.data = data
                .filter((d)=>{return series.y_access(d) !== null;})
                .map((d) => ({
                    x: series.x_access(d),
                    y: series.y_access(d),
                }))
                .sort(function(a, b) { return a.x - b.x; });
            
            series.x_extent = d3.extent(series.data, (d) => d.x);
            series.y_extent = d3.extent(series.data, (d) => d.y);
            return series;
        },
        // Draw chart
        draw() {
            var data = d3.entries(this.query_result);

            var series = [];
            series.push(this.prepare_series(data, "Indoors", this.series));
            series.push(this.prepare_series(data, "Outside", this.series));

            this.draw_axes(series);
            this.draw_lines(series);
            this.draw_cursors(series);
        },
        draw_axes(series) {
            var x_extents = [];
            var y_extents = [0];
            series.forEach((s)=>{
                x_extents = x_extents.concat(s.x_extent);
                y_extents = y_extents.concat(s.y_extent);
            });

            // Update extents of the scales
            this.xScale.domain(d3.extent(x_extents));
            this.yScale.domain(d3.extent(y_extents));
            this.zScale.domain(series.map((d)=>{return d.name}));

            // Update the axis definitions
            var xAxis = d3.axisBottom(this.xScale)
                .tickFormat(d3.timeFormat("%a %H:%M")) // %Y-%m-%d
                .ticks(d3.timeHour.every(3));
            var yAxis = d3.axisLeft(this.yScale)
                .ticks(10);

            // Draw axis
            var svg = this.svg;
            svg.selectAll(".x.axis")
                .transition()
                .duration(this.transition_time)
                .ease(d3.easeLinear, 2)
                .call(xAxis)
                .selectAll("text")	
                .style("text-anchor", "end")
                .attr("dx", "-.8em")
                .attr("dy", ".15em")
                .attr("transform", "rotate(-65)");
            svg.selectAll(".y.axis")
                .transition()
                .duration(this.transition_time)
                .call(yAxis)
        },
        draw_lines(series) {
            var line = d3.line()
                //.curve(d3.curveCardinal)
                .x((d)=>{ return this.xScale(d.x); })
                .y((d)=>{ return this.yScale(d.y); });
            var lineArea = d3.area()
                //.curve(d3.curveCardinal)    
                .x((d)=>{ return this.xScale(d.x); })
                .y0(this.yScale(0))
                .y1((d)=>{ return this.yScale(d.y); });
                
            // Draw lines:
            // draw the lines
            var svg = this.series_g;
            // Make all the 'Groups' for each series
            var seriesG = svg.selectAll(".seriesLine").data(series);
            var seriesGEnter = seriesG.enter()
                //Enter
                .append("g")
                .attr("class", "seriesLine")
                .style('fill', (d) => {return this.zScale(d.name);})
                .style("stroke", (d) => {return this.zScale(d.name);})
                .merge(seriesG);

            // Make a path for each series
            var seriesPath = seriesGEnter
                .selectAll("path")
                .data((d) => {return [d];});
            var seriesPathEnter = seriesPath.enter()
                //Enter
                .append("path")
                .attr("class", "line")
                .attr("fill", "none")
                .style("stroke", (d) => {return this.zScale(d.name);})
                .merge(seriesPath)
                //Update
                .transition()
                .duration(this.transition_time)
                .ease(d3.easeLinear, 2)
                .attr("d", (d) => line(d.data))
                .attr("transform", null);

            // Draw area
            // Plotter
            //var area = d3.area()
            //    .x((d)=>{ return this.xScale(series.x_access(d)); })
            //    .y0(scale.y(0))
            //    .y1((d)=>{ return this.yScale(series.y_access(d)); });

            // Update
            var seriesArea = seriesGEnter
                .selectAll('.area')
                .data((d) => {return [d.data];});
            seriesArea.exit().remove();

            // Enter
            var seriesArea = seriesArea.enter()
                .append('path')
                .attr('d', (d) => lineArea(d))
                //.style('fill', (d) => {return this.zScale(d.name);})
                .style('fill-opacity', 0.25)
                .style('stroke', 'none')
                .merge(seriesArea)
                .attr('class', 'area')
                .transition(this.transition_time)
                .attr('d', (d) => lineArea(d));
            //return;
            // Draw point series
            // Update
            // var seriesPointsG = svg
            //     .selectAll('.pointSeries')
            //     .data((d) => {return [d];});

            // // Exit
            // seriesPointsG.exit().remove();

            // // Enter
            // var seriesPointsG = seriesPointsG.enter()
            //     .append('g')
            //     .attr('class', 'pointSeries')
            //     .merge(seriesPointsG)
                

            // Draw points
            // Update
            var seriesPoints = seriesGEnter
                .selectAll('.point')
                .data((d) => {return d.data;});

            // Exit
            seriesPoints.exit().remove();

            // Enter
            var seriesPoints = seriesPoints
                .enter()
                .append('circle')
                .attr('class', 'point')
                .attr('cx', (d) => {
                    return this.xScale(d.x);
                })
                .attr('cy', (d) => {
                    return this.yScale(d.y);
                })
                .attr('r', 0.5)
                .style('fill', 'none')
                .style('stroke-width', 2)
                .merge(seriesPoints)
                .transition(this.transition_time)
                .attr('cx', (d) => {
                    return this.xScale(d.x);
                })
                .attr('cy', (d) => {
                    return this.yScale(d.y);
                });

            return;     
            var minerText = d3.select("#legend").selectAll("div").data(dta)
            var minerEnter = minerText.enter()
            .append("div")
            .attr("class", "legenditem")
            .style("color", function(d) {
            return z(d.id);
            })
            .merge(minerText)
            .text(function(d) {
            return d.id + ":" + d.values[d.values.length - 1].speed;
            })


            return;
            var lines = svg.selectAll(".line")
                .data([data])
                .attr("class", "line")

            // transition from previous paths to new paths
            lines.transition()
                .duration(this.transition_time)
                .attr("d", smoothLine)
                .style("stroke", function(){
                    return '#'+Math.floor(Math.random()*16777215).toString(16);
                });

            // enter any new lines
            lines.enter()
                .append("path")
                .attr("class","line")
                .attr("fill", "none")
                .attr("d", smoothLine)
                .style("stroke", function(){
                    return '#'+Math.floor(Math.random()*16777215).toString(16);
                });

            // exit
            lines.exit()
                .remove();
        },
        draw_cursors(series) {
            var mouseG = this.mouse_g;
            
            // here's a g for each circle and text on the line
            var mousePerLine = mouseG.selectAll('.mouse-per-line')
                .data(series)
                .enter()
                .append("g")
                .attr("class", "mouse-per-line");

            // the circle
            mousePerLine.append("circle")
                .attr("r", 7)
                .style("stroke", (d) => {
                    return this.zScale(d.name);
                })
                .style("fill", "none")
                .style("stroke-width", "3px")
                .style("opacity", "0");

            // the text
            d3.select(this.$refs.legend_values)
                .selectAll(".legend-keys")
                .data(series)
                .enter()
                .append("h6")
                .attr("class", "legend-keys")
                .text((d) => d.sensor);
        },
    },
})
