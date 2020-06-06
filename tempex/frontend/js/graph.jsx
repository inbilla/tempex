Vue.component('graph', {
    data: function() {
        return {
            update_counter: 0,
            interval: null,
            update_period: 1000*5, //*60*5,
            query_result: {},
            svg: null,
            xScale: null,
            yScale: null,
        };
    },
    template: `
    <div class="container-fluid">
        <div class="container">
            <div class="row" ref="d3_target">
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
            d3.json("/api/query?interval=30m&begin=now-3d")
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
            var margin = {top: 10, right: 30, bottom: 90, left: 60},
                width = 1000 - margin.left - margin.right,
                height = 300 - margin.top - margin.bottom;

            // append the svg object to the body of the page
            this.svg = d3.select(this.$refs.d3_target)
                .append("svg")
                //.attr("viewBox", "0 0 960 540")
                //.attr("preserveAspectRatio", "xMidYMid meet")
                .attr("width", width + margin.left + margin.right)
                .attr("height", height + margin.top + margin.bottom)
                .append("g")
                .attr("transform",
                    "translate(" + margin.left + "," + margin.top + ")");

            // Add X axis --> it is a date format
            var data = d3.entries(this.query_result);
            this.xScale = d3.scaleTime()
                .domain([0,0]) // d3.extent(data, function(d) { return new Date(d.key * 1000); }))
                .range([ 0, width ]);
            this.svg.append("g")
                .attr("transform", "translate(0," + height + ")")
                .style("font-size", "14px")
                .attr("class","x axis")
                .call(d3.axisBottom(this.xScale));

            // Add Y axis
            this.yScale = d3.scaleLinear()
                .domain([0, 0]) // d3.max(data, function(d) { return +d.value; })])
                .range([ height, 0 ]);
            this.svg.append("g")
                .attr("class","y axis")
                .call(d3.axisLeft(this.yScale));

            // Add Z axis
            this.zScale = d3.scaleOrdinal(d3.schemeCategory10);
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
            series.data = data.filter((d)=>{return series.y_access(d) !== null;});
            series.y_extent = d3.extent(series.data, series.y_access);
            series.x_extent = d3.extent(series.data, series.x_access);
            return series;
        },
        // Draw chart
        draw() {
            var data = d3.entries(this.query_result);

            var series = [];
            series.push(this.prepare_series(data, "Indoors", "avg_temperature"));
            series.push(this.prepare_series(data, "Outside", "avg_temperature"));

            this.draw_axes(series);
            this.draw_lines(series);
        },
        draw_axes(series) {
            var x_extents = [];
            var y_extents = [];
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
            var yAxis = d3.axisLeft(this.yScale);

            // Draw axis
            var svg = this.svg;
            svg.selectAll(".x.axis")
                .transition()
                .duration(1500)
                .ease(d3.easeLinear, 2)
                .call(xAxis)
                .selectAll("text")	
                .style("text-anchor", "end")
                .attr("dx", "-.8em")
                .attr("dy", ".15em")
                .attr("transform", "rotate(-65)");
            svg.selectAll(".y.axis")
                .transition()
                .duration(1500)
                .call(yAxis)
        },
        draw_lines(series) {
            var smoothLine = d3.line()
                //.curve(d3.curveCardinal)
                .x((d)=>{ return this.xScale(x_access(d)); })
                .y((d)=>{ return this.yScale(y_access(d)); });
            var lineArea = d3.area()
                //.curve(d3.curveCardinal)    
                .x((d)=>{ return this.xScale(x_access(d)); })
                .y0(this.yScale(0))
                .y1((d)=>{ return this.yScale(y_access(d)); })
                .defined(function (d) { return y_access(d) !== null; });

            // Draw lines:
            // draw the lines
            var svg = this.svg;
            // Make all the 'Groups' for each series
            var seriesG = svg.selectAll(".seriesLine").data(series);
            var seriesGEnter = seriesG.enter()
                //Enter
                .append("g")
                .attr("class", "seriesLine")
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
                .duration(1500)
                .ease(d3.easeLinear, 2)
                .attr("d", (series) => {
                    return d3.line()
                        //.curve(d3.curveCardinal)
                        .x((d)=>{ return this.xScale(series.x_access(d)); })
                        .y((d)=>{ return this.yScale(series.y_access(d)); })
                        (series.data);
                })
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
                .data((d) => {return [d];});
            seriesArea.exit().remove();

            // Enter
            var seriesArea = seriesArea.enter()
                .append('path')
                .attr('d', (series) => {
                    return d3.area()
                        .x((d)=>{ return this.xScale(series.x_access(d)); })
                        .y0(this.yScale(0))
                        .y1((d)=>{ return this.yScale(series.y_access(d)); })
                        (series.data);
                })
                .style('fill', (d) => {return this.zScale(d.name);})
                .style('fill-opacity', 0.25)
                .style('stroke', 'none')
                .merge(seriesArea)
                .attr('class', 'area')
                .transition(1500)
                .attr('d',  (series) => {
                    return d3.area()
                        .x((d)=>{ return this.xScale(series.x_access(d)); })
                        .y0(this.yScale(0))
                        .y1((d)=>{ return this.yScale(series.y_access(d)); })
                        (series.data);
                });

            // Draw point series
            // Update
            var seriesPointsG = svg
                .selectAll('.pointSeries')
                .data((d) => {return [d];});

            // Exit
            seriesPointsG.exit().remove();

            // Enter
            var seriesPointsG = seriesPointsG.enter()
                .append('g')
                .attr('class', 'pointSeries')
                .merge(seriesPointsG)
                

            // Draw points
            // Update
            var seriesPoints = seriesGEnter
                .selectAll('.point')
                .data((d) => {return [d];});

            // Exit
            $point.exit().remove();

            // Enter
            var $point = $point
            .enter()
            .append('circle')
            .attr('class', 'point')
            .attr('cx', function(d) {
            return scale.x(d.timestamp);
            })
            .attr('cy', function(d) {
            return scale.y(d.value);
            })
            .attr('r', 4)
            .style('fill', '#fff')
            .style('stroke-width', 2)
            .merge($point)
            .transition(t)
            .attr('cx', function(d) {
            return scale.x(d.timestamp);
            })
            .attr('cy', function(d) {
            return scale.y(d.value);
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
                .duration(1500)
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


        }
    },
})
