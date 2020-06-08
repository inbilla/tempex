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
            selected_time: null,
            series_data: null,
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
                .append("g")
                .attr("transform", "translate(" + margin.left + "," + margin.top + ")");

            // Add X axis --> it is a date format
            var data = d3.entries(this.query_result);
            this.xScale = d3.scaleTime()
                .domain([0,0]) // d3.extent(data, function(d) { return new Date(d.key * 1000); }))
                .range([ 0, width ]);
            this.svg.append("g")
                .attr("transform", "translate(0," + height + ")")
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
            
            this.mouse_g = mouseG;
            this.mouse_series_g = mouseG.append("g");

            // this is the vertical line
            mouseG.append("path")
                .attr("class", "mouse-line")
                .style("stroke", "currentColor")
                .style("stroke-width", "1px")
                .style("opacity", "0");
            
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
                    this.select_time(moment())
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
                    
                    this.select_time(xDate);
                });
        },
        prepare_diff_series(data, sensor_names, series_name){
            var a_value_accessor = function(d) {
                var sensor = d.value[sensor_names[0]];
                if (!sensor) {
                    return null;
                }
                return sensor[series_name];
            };
            var b_value_accessor = function(d) {
                var sensor = d.value[sensor_names[1]];
                if (!sensor) {
                    return null;
                }
                return sensor[series_name];
            };
            var value_accessor = function(d) {
                return a_value_accessor(d) - b_value_accessor(d);
            }

            return this.prepare_series(data, sensor_names[0] + " - " + sensor_names[1], value_accessor);
        },
        prepare_raw_series(data, sensor_name, series_name){
            var value_accessor = function(d) {
                var sensor = d.value[sensor_name];
                if (!sensor) {
                    return null;
                }
                return sensor[series_name];
            };

            return this.prepare_series(data, sensor_name, value_accessor);
        },
        prepare_series(data, series_name, value_accessor) {
            var series = {};
            series.name = series_name;
            series.x_access = function(d) {
                return new Date(parseInt(d.key));
            };
            series.y_access = value_accessor;
            series.data = data
                .filter((d)=>{return series.y_access(d) !== null;})
                .map((d) => ({
                    x: series.x_access(d),
                    y: series.y_access(d),
                }))
                .sort(function(a, b) { return a.x - b.x; });
            
            series.x_extent = d3.extent(series.data, (d) => d.x);
            series.y_extent = d3.extent(series.data, (d) => d.y);
            series.latest_time = series.data.slice(-1)[0].x;
            series.selected_time = series.latest_time;
            series.latest_value = series.data.slice(-1)[0].y;
            series.selected_value = series.latest_value;
            return series;
        },
        select_time(x_time) {
            this.selected_time = x_time;
            d3.select(this.$refs.current_x)
                .text(d3.timeFormat("%a %H:%M")(x_time));
            d3.select(this.$refs.rel_current_x)
                .text(moment(x_time).fromNow());

            if (!this.series_data) {
                return;
            }

            // move the vertical line
            this.mouse_g.select(".mouse-line")
                .attr("d", () => {
                    var d = "M" + this.xScale(x_time) + "," + this.yScale.range()[0];
                    d += " " + this.xScale(x_time) + "," + 0;
                    return d;
                });
            
            // position the circle and text
            var self = this;
            this.mouse_g.selectAll(".mouse-per-line")
                .each(function(d) {
                    var xDate = x_time,
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
                        d.selected_value = d.latest_value;
                        d.selected_time = d.latest_time;
                    } else {
                        d.selected_value = valueY;
                        d.selected_time = x_time;
                    }                    
                })
                .attr("transform", (d) => "translate(" + this.xScale(d.selected_time) + "," + this.yScale(d.selected_value) +")");
            
            d3.select(this.$refs.legend_values)
                .selectAll(".legend-values")
                .data(this.series_data)
                .transition(this.transition_time)
                .text((d) => d.selected_value.toFixed(2));
        },
        // Draw chart
        draw() {
            var data = d3.entries(this.query_result);

            var series = [];
            series.push(this.prepare_diff_series(data, ["Indoors", "Outside"], this.series));
            //series.push(this.prepare_raw_series(data, "Indoors", this.series));
            //series.push(this.prepare_raw_series(data, "Outside", this.series));
            this.series_data = series;

            this.draw_axes(series);
            this.draw_lines(series);
            this.draw_cursors(series);

            if (!this.selected_time) {
                this.select_time(moment())
            } else {
                this.select_time(this.selected_time)
            }
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
        },
        draw_cursors(series) {
            var mouseG = this.mouse_series_g;
            
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
            var legendEntrys = d3.select(this.$refs.legend_values)
                .selectAll(".legend-keys")
                .data(series)
            legendEntrys.exit().remove();
            var legendEntry = legendEntrys.enter()
                .append("h6")
                .attr("class", "legend-keys");
            legendEntry.append("div")
                .style("display", "inline-block")
                .style("padding", "8px")
                .style("vertical-align", "middle")
                .style("width", "10px")
                .style("height", "10px")
                .style("margin", "5px 5px 5px 5px")
                .style("background-color", (d) => this.zScale(d.name))
                
            legendEntry.append("span")
                .text((d) => d.name + ": ");

            legendEntry.append("span")
                .attr("class", "legend-values")
                .text((d) => d.selected_value.toFixed(2));
            
            //legendEntry.merge(legendEntrys)
            //    .selectAll(".legend-values")
            ///    .transition(this.transition_time)
            //    .text((d) => d.selected_value.toFixed(2));
        },
    },
})
