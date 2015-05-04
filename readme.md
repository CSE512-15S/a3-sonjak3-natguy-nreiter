a3-sonjak3-natguy-nreiter
===============

## Team Members

1. Sonja Khan sonjak3@uw.edu
2. Nat Guy natguy@uw.edu
3. Nick Reiter nreiter@uw.edu

## A Brief History of Rocket Launches

This is an application that visualizes the history of space rocket launches across the world, starting in 1957 when Sputnik became the first artificial object in orbit. Over 5,000 rocket launches from over 30 different sites are depicted, including both successes and failures.

## Running Instructions

http://cse512-15s.github.io/a3-sonjak3-natguy-nreiter/

OR

clone the repo, run

```python -m SimpleHTTPServer 8000``` 

from the directory and navigate to localhost:8000

## Data Sources

The data for this assignment was taken from several separate sources and merged together:

* The "launchlog" list of satellite orbital launches and launch attempts [here](http://planet4589.org/space/log/launchlog.txt). This document provides details on over 5,000 launches over the period of 1957 to 2015.
* The "SATCAT" satellite catalog, found [here](https://celestrak.com/pub/satcat.txt). This data set is not as large as the first, because it only includes objects that actually went into space (and doesn't document failures). However, it provides further information about orbits and launch sites which we combined with the launchlog data.
* The [National Space Science Data Center master catalog](http://nssdc.gsfc.nasa.gov/nmc/), used to double-check launch data in the event of a mismatch between the "launchlog" and "SATCAT." (In most cases, SATCAT had the incorrect data.)
* Latitude/longitude data of worldwide launch sites taken from many different sites (primarily [Wikipedia](https://www.wikipedia.org/)).

## StoryBoard

Before starting either data cleaning or development, we sat down together to plan out the interaction. Out of our planning and discussions, we produced the following storyboard.

![Unlabeled overview](/images/overview_unlabeled.jpg "Unlabeled Overview")

![Labeled overview](/images/overview_labeled.jpg "Labeled Overview")

![Initial State and Selection of Start Date](/images/initial_and_start_date.jpg "Initial State and Selection of Start Date")

![Selection of End Date and Beginning of Animation](/images/end_date_and_animation.jpg "Selection of End Date and Beginning of Animation")

![Pause View and Tooltip Interaction](/images/pause_and_tooltip.jpg "Pause View and Tooltip Interaction")

This storyboard demonstrates a number of user flows and interactions:

1. Users begin with the initial map, displaying only launch sites
1. They can then interact by:
  * selecting a filter
    1. User chooses from one of the preset filters (or none)
    1. Application only displays the filtered data
    1. Application displays line markers of events above the slider timeline (unless no filter)
  * choosing a date range
    * User may select a start date and/or end date with the datepicker (a dropdown calendar)
    * User may adjust the start and end dates via the slider handles
  * changing the animation speed
    * user may select between slow, medium, and fast
  * or playing the animation
    1. The map begins to show rocket launches, appropriately filtered
    1. It moves over the selected time range at the specified rate
    1. A marker over the slider tracks progress through the range
    1. At any point the user may pause the animation, or adjust the speed
1. Return to the previous step

## Development Process
