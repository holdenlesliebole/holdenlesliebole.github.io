---
title: "San Diego's long records, one year at a time"
date: 2026-10-30
tags: [visualization, climate, sea-level, ocean-temperature, rainfall]
summary: "Four animations of San Diego's longest daily records: air temperature since 1875, Scripps Pier water temperature since 1917, tide-gauge sea level since 1906, and rainfall since 1872. Each year is added as one curve, with a running leaderboard and the distribution of the last 30 years."
math: false
---

These animations characterize the annual variability and long-term changes in air temperature,
rainfall, sea level, and ocean temperature for over a century of data in San Diego. Each frame adds one year. The
left panel draws that year's seasonal cycle as one curve, colored from blue (early) to red
(recent), with the current year in black, and keeps a leaderboard of the top years so far.
The right panel shows the distribution of daily values over the trailing 30 years, against
the first 30 years of the record in navy.

The leaderboards rank whole years. A year's value is the mean of its twelve monthly means,
so a gap in one season cannot tilt it, and a year is ranked only if every month has at
least 15 days of data. 2026 is not over, so it gets its own line instead: its rank among
all years over the same stretch of the calendar.

## Air temperature, 1875–2026

<figure class="wide">
<video controls muted loop playsinline preload="none" poster="/assets/notes/sd-annual-cycle/san_diego_air.jpg">
<source src="/assets/notes/sd-annual-cycle/san_diego_air.mp4" type="video/mp4">
</video>
<figcaption>Daily mean air temperature, (Tmax + Tmin)/2, NOAA GHCN-Daily. Downtown San Diego to June 1939, Lindbergh Field after. Each month shifted to NOAA's homogenized monthly mean (GHCN-Monthly v4). 15-day running mean.</figcaption>
</figure>

There is no long air record in La Jolla, so this uses the downtown and airport stations
that the National Weather Service splices for San Diego's official record. Across the two
stations, the trailing 30-year mean rose from 59.8 °F (1875–1904) to 63.5 °F (1996–2026).
The warmest calendar years are 2014 (66.4 °F) and 2015 (66.3 °F). From January 1 through
October 26, 2026 is the warmest of 143 years, at 68.0 °F against 67.7 °F for 2015.

The record follows NOAA's homogenized version of it (GHCN-Monthly v4), which adjusts for
seven breaks from station and instrument changes. Each month's daily values are shifted so
the month averages to NOAA's adjusted value. That puts the whole record on the station's
level since November 2021, so readings before then sit 0.5 to 3.9 °F below the raw values.
The largest break is a warm period at Lindbergh from the mid-1970s to 1985, which my own comparisons
against Scripps Pier water temperature and seven nearby stations size at 2.2 to 2.5 °F,
against NOAA's 2.6 °F. NOAA leaves out 71 months it cannot place on either side of a break,
so 1930, 1932–35, 1969, 1976–77 and 1984–85 are drawn with gaps and not ranked. Without the
adjustments, Lindbergh warms 1.2 °F from 1940–69 to 1996–2025; with them, 2.7 °F.

## Scripps Pier water temperature, 1917–2026

<figure class="wide">
<video controls muted loop playsinline preload="none" poster="/assets/notes/sd-annual-cycle/scripps_pier.jpg">
<source src="/assets/notes/sd-annual-cycle/scripps_pier.mp4" type="video/mp4">
</video>
<figcaption>Surface (~0.5 m) and bottom (~5 m) water temperature, Scripps Pier, SIO Shore Stations Program (doi:10.6075/J06T0K0M), archive of 2026-09-30. One reading per day, quality flag 0 only.</figcaption>
</figure>

The Shore Stations Program has taken a temperature at the end of the pier nearly every day
since 1916. 2015 is the warmest full calendar year at both depths (19.59 °C at the surface), although 2026 from January through June
already ranks first of 110 years at the surface and first of 94 at the bottom and may turn out to be the warmest year on record. The archive is
released quarterly, so the record currently ends on June 30.

These are single daily readings, and the time of day they were taken changed over the
century. Published analyses of this record adjust for that; these figures do not.

## Sea level, 1906–2026

<figure class="wide">
<video controls muted loop playsinline preload="none" poster="/assets/notes/sd-annual-cycle/san_diego_sea_level.jpg">
<source src="/assets/notes/sd-annual-cycle/san_diego_sea_level.mp4" type="video/mp4">
</video>
<figcaption>Daily mean sea level at the San Diego Bay tide gauge (NOAA CO-OPS 9410170), cm above NOAA's 1983–2001 mean sea level. Verified hourly heights, days with all 24 hours only. 15-day running mean.</figcaption>
</figure>

A 24-hour mean removes most of the tide, and the 15-day smoothing removes most of what is
left. What remains is the seasonal cycle (high in late summer and fall, low in spring),
El Niño years, and the long rise. The trailing 30-year mean went from −15.7 cm (1906–1935)
to +4.2 cm (1996–2026), a rise of 20.0 cm. NOAA's published linear trend for this gauge,
2.24 ± 0.08 mm per year, predicts 20.2 cm over the 90.6 years between the two windows'
midpoints. Eight of the ten highest years are from 2014 on. The other two are the El Niño
years 1983 and 1997. 2026 from January through July is the highest of 112 years, at
+10.1 cm against +8.6 cm for the same months of 2015.

This is relative sea level, measured against the land the gauge stands on, so it includes
any vertical land motion there. Six months in which NOAA's hourly heights and its
published monthly means disagree by more than 2 cm are left out.

## Rainfall, 1872–2026

<figure class="wide">
<video controls muted loop playsinline preload="none" poster="/assets/notes/sd-annual-cycle/san_diego_rain.jpg">
<source src="/assets/notes/sd-annual-cycle/san_diego_rain.mp4" type="video/mp4">
</video>
<figcaption>Running rainfall total from October 1, one curve per water year (October 1 to September 30), NOAA GHCN-Daily, same stations and splice as the air record. Right: distribution of water-year totals over the trailing 30 water years.</figcaption>
</figure>

Rain needs a different design. Most days in San Diego have no rain at all, and a smoothed
daily curve of them is mostly zero. Here each water year starts at zero on October 1 and climbs as
storms arrive, and by April most years have flattened out. The leaderboard ranks water-year
totals. The wettest is 1883–84 at 26.06 in, then 1940–41 and 2004–05. The trailing
30-year mean is 9.12 in, against 9.94 in for the first 30 water years. Water year
2026–27 has 1.54 in through October 26, eighth of 155 for that date.

## Checks

The pipeline has thirteen synthetic tests. Each feeds a constructed series with a known
answer through the same routines that make the figures, and each was broken on purpose
once to confirm it fails. They cover the smoothing, the leap-day handling, the
monthly-mean rule, the partial-year ranking, the shift to NOAA's monthly means, the
water-year totals, and the 24-hour daily mean. The air record's calendar-year means match
NOAA's adjusted record to within 0.002 °F in all 141 years both can rank.

The top leaderboard values were recomputed by a separate route: 2015 sea level from
monthly means of the raw hourly heights, and the wettest water years from a second copy of
the rain record obtained through NOAA's ACIS service. That copy matches the GHCN record
used here on all 62,047 days they share.

What these figures do not show: trends with uncertainties, an attribution of any of these
changes, or any homogenization of the water temperature, sea level or rain records. The air
record's homogenization is NOAA's, applied as described above, not one I have checked break
by break.

*Updated October 30, 2026: the first version of this page corrected only the 1976–85
Lindbergh break. The air record now follows NOAA's full homogenization, which changed its
leaderboard values and moved 2026 from third to first.*
