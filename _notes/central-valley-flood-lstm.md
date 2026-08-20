---
title: "When does a deep-learning streamflow forecast beat the gauge?"
date: 2026-08-19
tags: [hydrology, machine-learning, flood-forecasting, evaluation, atmospheric-rivers]
summary: "Testing Google's open flood-forecasting LSTM on 28 California basins, with an emphasis on when it improves on gauge persistence and where that improvement breaks down."
math: false
---

## Overview

River forecasts are often scored against a basin's mean flow. That is a useful metric,
but it sets a low bar. An operator already has the latest gauge reading and can carry it
forward as a forecast. I wanted to know when a weather-driven LSTM could improve on that
simple baseline, especially during the large storms for which a few days of warning
matter most.

I trained Google's open flood-forecasting model on 28 minimally regulated California
basins. The basins span the North and Central Coasts, the Sierra, and the Tahoe region;
20 are rain-classified and 8 snow-classified. The model uses precipitation,
temperature, and fixed basin attributes, but not observed streamflow. I extended the
published gauge records through 2024 and held out water years 2017 and 2023, both major
atmospheric-river flood years.

The clearest result is a crossover with gauge persistence. At one-day lead, the LSTM
beats plain persistence on only 9 of 22 test basins and damped persistence on 4 of 22.
At two days it is better on the cohort median, and from day four it beats both baselines
on all 22 basins. The useful window is therefore not "short-range forecasting" in
general. It is more specifically a two-to-seven-day volume forecast for gauged basins
under conditions similar to those in training.

<figure>
  <img src="{{ '/assets/notes/cv_persistence_crossover.png' | relative_url }}" alt="Median NSE versus forecast lead for the LSTM, plain gauge persistence, and damped persistence across the full cohort and five focus basins." />
  <figcaption>Gauge persistence is difficult to beat at one day but deteriorates quickly with lead. The LSTM remains nearly flat and becomes the better forecast after the curves cross.</figcaption>
</figure>

The model is much less convincing at flood peaks. It places peaks within about a day,
the resolution of the daily data, but underestimates their magnitude. Above the 95th
percentile of storm size, same-day flow is biased low by 52%. A larger LSTM improved
average NSE while making the peak bias worse. One basin held entirely out of training
also failed outright, and the experiment does not establish why.

The uncertainty estimates have a more practical fix. Raw 90% predictive intervals
cover only 66–72% of observations. An affine calibration fit on one flood winter and
applied to the other raises coverage to 88–91% with almost no loss of sharpness. The
comparison with NOAA's National Water Model is mixed: the LSTM beats the older v2.1
retrospective on the original test window, while v3.0 wins on WY2017 and the LSTM wins
on the available part of WY2023. The two models fail on different basins and events.

The full note includes:

- the data, model, split, and weather-input caveats;
- lead-matched persistence and storm-stratified scores;
- flood-peak bias and the model-capacity experiment;
- leave-one-basin-out performance;
- probabilistic calibration across flood winters;
- comparisons with two National Water Model retrospectives; and
- the valid-date scoring error found during adversarial review, its consequences, and
  the closure test added afterward.

## Downloads

- **Full PDF note.** <a href="/assets/notes/central-valley-flood-lstm.pdf">Download PDF</a>
- **Code and methods.** [github.com/holdenlesliebole/central-valley-flood-lstm](https://github.com/holdenlesliebole/central-valley-flood-lstm)
