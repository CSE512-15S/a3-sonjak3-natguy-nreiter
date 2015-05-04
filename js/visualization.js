$(document).ready(initialSetup);

// We should wrap this with an onload, and move all the
// scripting up into the head
d3.select(window).on("resize", throttle);

var zoom = d3.behavior.zoom()
    .scaleExtent([1, 9])
    .on("zoom", move);

var month_map = {
  'Jan': 1,
  'Feb': 2,
  'Mar': 3,
  'Apr': 4,
  'May': 5,
  'Jun': 6,
  'Jul': 7,
  'Aug': 8,
  'Sep': 9,
  'Oct': 10,
  'Nov': 11,
  'Dec': 12
};

var launchData = {};// [year][month][day]=> [array of entries]
loadLaunchData();

var launch_sites = [];// Stores launch sites
loadLaunchSites();

var currentLaunches = []; // Stores current launches to display

// Stores tags currently in use (for filtering)
var currentTags = [];

var width = 0;
var height = 0;

var topo,projection,path,svg,g;

var tooltip, time_slider;
var playSpeed = 50;
const playBarWidth = 4;

function initialSetup() {
  width = document.getElementById('container').scrollWidth;
  height = width / 2;

  addPicker('#start_date', startDateHandler);
  addPicker('#end_date');

  time_slider = d3.slider()
    .axis(true)
    .min(slidervalues[0])
    .max(slidervalues[1])
    .value(slidervalues)
    .on("slide", updateSliderValues)

  d3.select('#slider')
    .style("width", width + "px")
    .style("margin", "0px auto")
    .call(time_slider);

  tooltip = d3.select("#container").append("div").attr("class", "tooltip hidden");


  updateSliderValues(null, slidervalues);

  // Play-related variables
  currentPlayPoint = currentStartPoint = slidervalues[0];
  currentPlayLimit = slidervalues[1];
  isPlaying = false;
  playTickRepeatTimeout;

  setup(width, height);

  d3.json("data/world-topo-min.json", function(error, world) {
    var countries = topojson.feature(world, world.objects.countries).features;
    topo = countries;
    drawMap(topo);
    drawLaunchSites();
    drawLaunchEvents();
  });

  setupPlayControls();
  drawPlayBar();
  setupHashmarkArea();

  $('#filter_tag_list input').change(changeTag);
}

function changeTag(evt) {
  var tag = $(evt.target).val();

  currentTags = [];

  if(tag != 'none') {
    currentTags.push(tag);
  }

  redraw();
}

function setupPlayControls() {
  $("#slow").on("click", function() {
    playSpeed = 100;
  });
  $("#medium").on("click", function() { 
    playSpeed = 50;
  });
  $("#fast").on("click", function() {
    playSpeed = 10;
  });
  $('#playButton').on("click", function() {
    if (!isPlaying) {
      play(playSpeed);
      this.innerHTML = "Pause";
      this.style.background = "rgba(255,255,255,0.5)";
      this.style.boxShadow = "inset 0 0 10px #000";
    } else {
      pause();
      resetPlayButton();
    }
  });
}

function addPicker(selector, change_handler) {
  $(selector).DatePicker({
    format: 'm/d/Y',
    date: $(selector).text().trim(),
    current: $(selector).text().trim(),
    starts: 1,
    onChange: function(formatted, dates) {
      if($(selector).text().trim() != formatted) {
        $(selector).DatePickerHide();
        updateSliderFromPickers();
      }

      $(selector).text(formatted);

      if(change_handler) {
        change_handler();
      }
    },
    onRender: function(date) {
      return {
        disabled: (date < new Date(1957, 8, 13) || date >= new Date(2015, 2, 16))
      }
    }
  });
}

function updateSliderFromPickers() {
  var min_date = $('#start_date').DatePickerGetDate();
  var max_date = $('#end_date').DatePickerGetDate();

  var min_val = convertDateToDecimal(min_date);
  var max_val = convertDateToDecimal(max_date);

  updateSliderValues(null, [min_val, max_val]);

  time_slider.value([min_val, max_val]);
}

// Uses list of current tags to generate colored hashmarks to indicate events
// (Iterates through all entries, which may take a while)
function drawHashmarks()
{
  clearHashmarks();

  // Only want to attempt to do this if there are actually tags set
  if (currentTags.length > 0)
  {
    for (var year in launchData)
    {
      for (var month in launchData[year])
      {
        for (var day in launchData[year][month])
        {
          entries = launchData[year][month][day];
          for (var entryNo = 0; entryNo < entries.length; entryNo++)
          {
            entry = entries[entryNo];
            // Draw hashmark if we have a tag match
            for (var tagNo = 0; tagNo < currentTags.length; tagNo++)
            {
              if (currentTags[tagNo] === entry['Tag'])
              {
                // Get whether the launch succeeded or not
                success = entry['Success'];
                drawHashmarkAtDate(year, month, day, currentTags[tagNo], success);
              }
            }
          }
        }
      }
    }
  }
}

function setupHashmarkArea() {
  var pixelWidth = parseInt(d3.select("#slider").style("width"));

  var svg = d3.select("#slider").append("svg")
  .attr("id", "hashmark_canvas")
  .attr("height", "20px")
  .attr("width", pixelWidth + "px")
  .style("position", "absolute")
  .style("top", "-22px")
  .style("left", "0px");
}

function clearHashmarks() {
  $('#hashmark_canvas').empty();
}

function drawHashmarkAtDate(year, month, day, tag, success)
{
  // Get color for hashmark
  var color = getHashmarkColor(tag, success);

  // Find location to put hashmark
  var pixelWidth = parseInt(d3.select("#slider").style("width"));
  var range = initialvalues[1] - initialvalues[0];

  var decimalDate = convertDateToDecimal(new Date(year, month, day));
  var progress = (decimalDate - initialvalues[0]) / range;
  var xPos = progress * pixelWidth;  

  // Draw a line above the slider at this date
  var svg = d3.select("#hashmark_canvas");
      
  var hashmark = svg.append("line")
    .attr("x1", xPos)
    .attr("x2", xPos)
    .attr("y1", "0")
    .attr("y2", "20")
    .style("stroke", color)
    .style("stroke-width", 1);
}

function getHashmarkColor(tag, success)
{
  if (success === 'S')
  {
    return 'green';
  }
  else
  {
    return 'red';
  }
}

function setup(width,height){
  projection = d3.geo.mercator()
    .translate([(width/2), (height/1.4)])
    .scale( width / 2 / Math.PI);

  path = d3.geo.path().projection(projection);

  svg = d3.select("#container").append("svg")
      .attr("width", width)
      .attr("height", height)
      .attr("id", "map")
      //.call(zoom)
      .on("click", click)
      .append("g");

  // TODO: figure out filters
  var defs = svg.append("defs");

  var filter = defs.append("filter")
                   .attr("id", "glow");

  filter.append("feGaussianBlur")
        .attr("in", "SourceGraphic")
        .attr("stdDeviation", 10);

  // Set background color
  svg.append("rect")
     .attr("width", "100%")
     .attr("height", "100%")
     .attr("fill", "#0A080D");

  g = svg.append("g");
}

function drawMap(topo) {
  var country = g.selectAll(".country").data(topo);

  // Add countries
  country.enter().insert("path")
      .attr("class", "country")
      .attr("d", path)
      .attr("id", function(d,i) { return d.id; })
      .attr("title", function(d,i) { return d.properties.name; })
      .style("fill", "#606060");
}

function drawLaunchSites()
{
  // Add launch sites
  var site;
  for(var i=0;i<launch_sites.length;i++) {
    site = launch_sites[i];
    addLaunchSite(site.Longitude, site.Latitude, site.FullName);
  }
}

function drawLaunchEvents()
{
  // Could remove old launches here
  var info;
  for(var i=0;i<currentLaunches.length;i++) {
    info = currentLaunches[i].info;
    cls = (info.Success == 'S') ? 'launch_success' : 'launch_failure';
    addLaunchEvent(info.Longitude, info.Latitude, info["Launch Vehicle"], cls);
  }
}      

function redraw() {
  width = document.getElementById('container').scrollWidth;
  height = width / 2;
  d3.select('svg').remove();
  setup(width,height);
  drawMap(topo);
  drawLaunchSites();
  drawHashmarks();
}

function redrawLaunchesOnly()
{
  // Redraw launch events
  drawLaunchEvents();

	// Don't redraw launch sites because everything will be sad  
}

function move() {
  var t = d3.event.translate;
  var s = d3.event.scale; 
  zscale = s;
  var h = height/4;

  t[0] = Math.min(
    (width/height)  * (s - 1), 
    Math.max( width * (1 - s), t[0] )
  );

  t[1] = Math.min(
    h * (s - 1) + h * s, 
    Math.max(height  * (1 - s) - h * s, t[1])
  );

  zoom.translate(t);
  g.attr("transform", "translate(" + t + ")scale(" + s + ")");
}

var throttleTimer;
function throttle() {
  window.clearTimeout(throttleTimer);
    throttleTimer = window.setTimeout(function() {
      redraw();
    }, 200);
}

//geo translation on mouse click in map
function click() {
  var latlon = projection.invert(d3.mouse(this));
}

function addLaunchEvent(lat,lon,text,cls) {
  var x = projection([lat,lon])[0];
  var y = projection([lat,lon])[1];

  var circle = g.append("svg:circle")
        .attr("cx", x)
        .attr("cy", y)
        .attr("class","point " + cls)
        .attr("r", 15);

  circle.transition()
    .duration(1000)
    .attr("r", 100)
    .style("opacity", "0.0")
		.remove();
}

function addLaunchSite(lat,lon,text) {
  //offsets for tooltips
  var offsetL = 20;
  var offsetT = 10;

  var gpoint = g.append("g").attr("class", "gpoint");
  var x = projection([lat,lon])[0];
  var y = projection([lat,lon])[1];
  var ix = x;
  var iy = y;
  // these are special cased because the launch sites overlap
  // on the map.
  if (text.startsWith('Tanegashima')) {
    iy += 10;
  } else if (text.startsWith('Uchinoura')){
    iy -= 10;
    ix += 5;
  }
  var interactionArea = gpoint.append("svg:circle")
    .attr("cx", ix)
    .attr("cy", iy)
    .attr("r", 10)
    .style("fill", "rgba(0,0,0,0)"); // change opacity to 1 to see the interaction area
  gpoint.append("svg:circle")
        .attr("cx", x)
        .attr("cy", y)
        .attr("r", 3)
        .style("fill", "#04CCFF");

  gpoint
    .on("mousemove", function(d,i) {
      var mouse = d3.mouse(svg.node()).map( function(d) { return parseInt(d); } );

      tooltip.classed("hidden", false)
             .attr("style", "left:"+(mouse[0]+offsetL)+"px;top:"+(mouse[1]+offsetT)+"px")
             .html(text);
      })
      .on("mouseout",  function(d,i) {
        tooltip.classed("hidden", true);
      });
}

var months = ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"];
var initialvalues = [1957.7, 2015.2];
var slidervalues = initialvalues.slice();
// Play-related variables
var currentStartPoint = 0;
var currentPlayPoint = 0;
var currentPlayLimit = 0;
var isPlaying = false;
var playTickRepeatTimeout;

function resetPlayButton() {
  var playbutton = $('#playButton');
  playButton.innerHTML = "Play";
  playButton.style.background = "-webkit-linear-gradient(rgba(255,255,255,.7), rgba(100,100,100,.5))";
  playButton.style.background = "-o-linear-gradient(rgba(255,255,255,.7), rgba(100,100,100,.5))";
  playButton.style.background = "-moz-linear-gradient(rgba(255,255,255,.7), rgba(100,100,100,.5))";
  playButton.style.background = "linear-gradient(rgba(255,255,255,.7), rgba(100,100,100,.5))";
}

// values = [ mindate, maxdate ] in decimal form
function updateSliderValues(evt, values) {
  // Cut all playback and update values for next play request
  pause();
  clearCurrentDate();
  resetPlayButton();
  currentPlayPoint = currentStartPoint = values[0];
  currentPlayLimit = values[1];

  var mindate = convertDecimalDate(values[0]);
  var maxdate = convertDecimalDate(values[1]);

  $('#start_date').DatePickerSetDate(mindate, true);
  $('#end_date').DatePickerSetDate(maxdate, true);

  $('#start_date').text(formatDate(mindate));

  $('#end_date').text(formatDate(maxdate));

  updatePlayBar();
}

function formatDate(date) {
    return ('0' + (date.getMonth() + 1)).slice(-2) +
    "/" +
    ('0' + date.getDate()).slice(-2) +
    "/" +
    date.getFullYear()
}

function leapYear(year) {
  return ((year % 4 == 0) && (year % 100 != 0)) || (year % 400 == 0);
};

function convertDecimalDate(decimalDate) {
  var year = parseInt(decimalDate);
  var remainder = decimalDate - year;
  var daysPerYear = leapYear(year) ? 366 : 365;
  var milliseconds = remainder * daysPerYear * 24 * 60 * 60 * 1000;
  var yearDate = new Date(year, 0, 1);
  return new Date(yearDate.getTime() + milliseconds);
}

function convertDateToDecimal(date) {
  var year = date.getFullYear();

  var ms = date.getTime() - (new Date(year, 0, 1)).getTime();

  var num_days = (leapYear(year)) ? 366 : 365;

  var ms_in_year = num_days * 24 * 60 * 60 * 1000;

  return year + (ms * 1.0 / ms_in_year);
}

// This loads the launch data from 'massive_launchlog' into
// a data structure mapped by 'year'=>'month'=>'day'=>array of entries
// Stored in `launchData`
function loadLaunchData() {
  d3.csv("data/massive_launchlog.csv", function(err, entries) {
    entries.forEach(function(entry) {
      var date_parts = entry["Launch Date and Time (UTC)"].split(" ");
      var year = date_parts[0] * 1;
      var month = month_map[date_parts[1]];
      var day = date_parts[2];

      // Ensure data structure is set up
      if(launchData[year] == null) {
        launchData[year] = {};
      }

      if(launchData[year][month] == null) {
        launchData[year][month] = {};
      }

      if(launchData[year][month][day] == null) {
        launchData[year][month][day] = [];
      }

      launchData[year][month][day].push(entry);
    });
  });

}

// Loads launch site data from csv, storing entries in `launch_sites`
function loadLaunchSites() {
  d3.csv("data/launch_sites.csv", function(err, sites) {
    sites.forEach(function(i){
      launch_sites.push(i);
    });
  });
}

// Adds points for the launches of a given day to the display
// list, after clearing the previous display
function displayDate(year, month, day) {
  var entries = [];

  // Loads launches  from current day's launch data
  if(launchData[year] && launchData[year][month] && launchData[year][month][day]) {
    entries = launchData[year][month][day];
  }

  // Right now this clears the points completely
  // Later we may change it to not clear, and just allow
  // the animation to continue
  currentLaunches = [];

  for(var i=0; i <entries.length; i++) {
    
    // If there are filter tags, applies the filter
    if (currentTags.length > 0)
    {
      for (var tagNo = 0; tagNo < currentTags.length; tagNo++)
      {
        var tag = currentTags[tagNo];
        // Add if we have a tag match
        if (entries[i]['Tag'] === tag)
        {
          currentLaunches.push(
            { birthtime: (new Date()).getTime(),
              info: entries[i] } );
        }
      }
    }
    else
    {
      // Just add, since we're not checking tags
      currentLaunches.push(
        { birthtime: (new Date()).getTime(),
          info: entries[i] } );
    }
  }

  updatePlayBar();
  redrawLaunchesOnly();
}

// Starts playing a sequence of launches at a specified interval
function play()
{
  var curr_date = $(document.createElement('div'));
  curr_date.css(
    {
      position: 'absolute',
      left: '10px',
      bottom: '10px'
    }
  );

  curr_date.attr('id', 'current_play_date');

  $('#container').append(curr_date);
  isPlaying = true;
  playTick();
}

// Pauses playing of launch sequences
function pause() {
  isPlaying = false;
  clearTimeout(playTickRepeatTimeout);
}

function clearCurrentDate() {
  $('#current_play_date').remove();
}



// Plays the sequence of all launches starting at the left slider position
// and ending at the right slider position. This function will loop
// indefinitely, until the right slider position is reached
function playTick()
{
  // Stop playing if we're at the right slider position
  if (currentPlayPoint >= currentPlayLimit)
  {
    pause();
    clearCurrentDate();
    resetPlayButton();
    currentPlayPoint = currentStartPoint;
  }

  if (isPlaying)
  {
    // Increment date
    currentPlayPoint += 1.0 / 365.25;
    var currentDate = convertDecimalDate(currentPlayPoint);

    // Update displayed launches (getMonth() returns a value from 0 to 11, so we increment it)
    displayDate(currentDate.getFullYear(), currentDate.getMonth()+1, currentDate.getDate());
    $('#current_play_date').html(formatDate(currentDate));
		updatePlayBar();
    // This function will be called again in {playSpeed} ms
    playTickRepeatTimeout = setTimeout(playTick, playSpeed);
  }
}

function drawPlayBar() {
  var svg = d3.select("#slider").append("svg")
    .attr("id", "playBar")
    .attr("height", "50px")
    .attr("width", playBarWidth + "px")
    .style("position", "absolute")
    .style("top", "-18px")
    .style("left", "-" + playBarWidth/2 + "px");
        
  var rect = svg.append("rect")
    .attr("id", "playBarRect")
    .attr("height", "50px")
    .attr("width", playBarWidth + "px")
    .attr("fill", "black");
}

function updatePlayBar() {
  var pixelWidth = parseInt(d3.select("#slider").style("width"));
  var range = initialvalues[1] - initialvalues[0];
  var progress = (currentPlayPoint - initialvalues[0]) / range;
  var left = progress * pixelWidth - playBarWidth / 2;
  d3.select("#playBar").style("left", Math.floor(left) + "px"); 
}

function startDateHandler() {
  var start_date = $('#start_date').DatePickerGetDate();

  // Incrementing month because getMonth() returns a value from 0 to 11
  displayDate(start_date.getFullYear(), start_date.getMonth()+1, start_date.getDate());
}
