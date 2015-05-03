a3-sonjak3-natguy-nreiter
===============

## Team Members

1. Sonja Khan sonjak3@uw.edu
2. Nat Guy natguy@uw.edu
3. Nick Reiter nreiter@uw.edu

## A Brief History of Rocket Launches

This is an application that visualizes the history of space rocket launches across the world, starting in 1957 when Sputnik became the first object in orbit. Over 5,000 rocket launches from over 30 different sites are depicted, including both successes and failures.

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


## Development Process
