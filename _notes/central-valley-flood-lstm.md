---
title: "When does a deep-learning streamflow forecast beat the gauge? Google's flood LSTM on 28 California basins"
date: 2026-08-19
tags: [hydrology, machine-learning, flood-forecasting, evaluation, atmospheric-rivers]
summary: "Google's open flood-forecasting LSTM trained on 28 California basins and scored against the baselines an operator has in hand: gauge persistence matched by lead, storm-stratified skill, a held-out basin, probabilistic calibration, and version-controlled NWM retrospectives. The model wins in a bounded region, and the boundary is measured on each axis. Revised 2026-08-19 after an adversarial review caught a multi-lead scoring bug; the anatomy is in the closing section."
math: false
---

*Code, configs, and the full methods record: [github.com/holdenlesliebole/central-valley-flood-lstm](https://github.com/holdenlesliebole/central-valley-flood-lstm).*

The right baseline for a river forecast is not the basin's mean flow. It is the gauge
reading the operator already has. Scored against that baseline on two atmospheric-river
flood years, a weather-driven LSTM pulls ahead at two-day lead on the cohort median,
wins on every basin from day four, and loses on most basins at one-day lead. This
writeup measures where the model's value starts and stops against the gauge, at flood
peaks, on a basin held out of training, in its uncertainty estimates, and against
NOAA's process model. What emerges is a bounded region of forecast value, with the
boundary measured on each axis.

## The short version

The model is a good two-to-seven-day volume forecaster for gauged basins under
conditions resembling its training data. It is not a flood-peak predictor. At one-day
lead it beats plain gauge persistence on 9 of 22 basins and damped persistence on 4 of
22; from day 4 it beats both on all 22. Its raw predictive intervals capture 66–72% of
observations while claiming 90%, and a simple cross-fitted calibration restores 88–91%
at essentially no cost in sharpness. On the largest storm days its advantage over the
gauge persists but is thinner, arriving between day 2 and day 4 depending on the
accounting. One basin, held entirely out of training, failed outright for reasons the
experiment cannot isolate. And the model's margin over NOAA's process model depends on
which version of that model and which test years are used. Each of those statements is
a measurement, and the sections below give the numbers.

## The task, the model, and the score

The task is short-range river forecasting. Given the weather over a basin up through
today, plus a weather forecast for the coming week, predict the daily average
streamflow at the basin outlet for each of the next several days. Each day ahead is
called a lead. Lead 0 is an estimate of today's flow made with today's weather; lead 3
is a three-day-ahead forecast. The operational version of this problem in California is
reservoir inflow, meaning how much water arrives ahead of an incoming storm, and the
two-to-seven-day leads studied here are the decision window for [forecast-informed
reservoir operations](https://cw3e.ucsd.edu/firo/) (FIRO). The basins in this study are
a broader and less tidy population than that use case, described below.

The model is an LSTM, a recurrent neural network that reads one day of input at a time
and carries a learned internal state from day to day. In this setting that state is a
stand-in for how much water the basin is holding as snowpack and soil moisture. Each
day the model ingests basin-averaged precipitation and temperature from three weather
products (ECMWF HRES forecasts, NASA's IMERG satellite precipitation, NOAA's CPC gauge
analysis), plus a fixed set of catchment attributes covering area and climate
statistics such as mean precipitation, aridity, snow fraction, and moisture and
evaporative indices. Observed streamflow is never an input; the model runs on weather
alone. Output is streamflow in mm/day (water depth per day spread over the basin area,
which puts small and large basins on one scale) at leads 0 through 7. One head produces
a single number per day and trains on mean squared error; a second produces a
probability distribution and trains on its likelihood. The architecture and training
code are Google Research's open flood-forecasting framework, the same model family as
their Flood Hub product, though the 28-basin configuration trained here is not that
production system.

Training data are 28 minimally regulated California basins from Caravan, a community
dataset of gauged catchments. Undammed basins are the point rather than a limitation.
What a reservoir operator needs is unimpaired inflow, and near-natural gauges measure
the same kind of quantity, though only some of these basins drain toward managed
reservoirs. The cohort's geography is wider than the Sierra. By the snow-fraction rule
used throughout this project (a basin is rain-classified below 0.3), the 28 basins
split 20 rain and 8 snow. The rain basins are dominated by North Coast river systems
like the Eel, Smith, Trinity, Mad, and Redwood, plus six Central Coast streams. The
snow basins are Sierra and Tahoe headwaters, including the Merced pair, Bear Creek,
Pitman Creek, the upper Trinity, and three Tahoe-area gauges. The streamflow records,
which end in 2014 as published, were extended through October 2024 from USGS gauge
data.

<figure>
  <img src="{{ '/assets/notes/cv_study_map.png' | relative_url }}" alt="Map of California showing the 28 training basins as markers colored by snow fraction, with the five focus basins ringed and six excluded basins marked with crosses." />
  <figcaption>The 28 training basins. Marker color: fraction of precipitation falling as snow (Caravan attribute). Rings: the five focus basins. Crosses: the six basins with no observations in WY2017 or WY2023, excluded from cohort medians. Triangle: Oroville Dam.</figcaption>
</figure>

One property of the inputs matters for reading everything below. The forecast products
have finite archives (HRES begins in mid-2012, GraphCast in 2016), and where they do
not exist the pipeline fills their slots with ERA5-Land reanalysis shifted to the
target date. That is realized weather standing in for a forecast of it. Training on
1985–2016 therefore ran almost entirely with perfect future weather in the forecast
channels, while the flood test years run on real forecasts. The model learns under
easier conditions than it is tested on, and any comparison across eras, like the
drought window below or the 1997 flood, mixes hydrology with forecast realism.

Forecasts are scored by NSE, the Nash–Sutcliffe efficiency, hydrology's standard skill
score. A score of 1 is a perfect match to observations, 0 means no more accurate than
always predicting the basin's mean flow, and negative values are worse than that
constant.

## The test

The test years are water years 2017 and 2023 (a water year runs October through
September and is named for the year it ends in). Both were flood years built from
atmospheric rivers, the narrow plumes of Pacific vapor that deliver most of
California's large storms. The WY2017 sequence damaged both spillways at Oroville Dam
and forced the evacuation of nearly 190,000 people downstream; WY2023 brought the
December–January storm train that ended a three-year drought. Training uses every
remaining day in the record outside these windows and the 2009–2011 validation years,
and checkpoints are selected on validation skill, never taken from the last epoch. Of
the 28 trained basins, 22 have observations in the flood windows. Medians below are
over that fixed cohort, except in Finding 5, where the comparison covers five focus
basins (four snow-classified, one rain).

Two qualifications attach to this design. First, WY2017 and WY2023 are challenge years
rather than untouched tests. They were chosen for their extremity, and their results
have steered model capacity, the probabilistic analysis, and the narrative across this
project's development. Second, the train/test split is contiguous on forecast issue
dates with a seven-day horizon, so 28 calendar dates, all in the first week of October
at the window seams, are labels in both a training and a test sample. That touches
1.9% of scored rows, concentrated in reliably low-flow early October, so the numerical
effect on any median is almost certainly negligible. But held out should mean held
out, and a multi-day horizon needs a purged split. The overlap is quantified in the
project's split-leakage table rather than waved off.

The choice of test period is itself the first result. Tested on 2012–2014, the onset
of California's drought, this architecture scores a median NSE of 0.862; tested on the
two flood years, it scores 0.754 (0.836 and 0.679 at a smaller capacity). Those two
numbers come from separately trained models with different training years, different
checkpoints, and, per the note on inputs above, different forecast realism, so the gap
is descriptive rather than an isolated window effect. Neither number is wrong. A
streamflow skill claim that omits the hydrologic character of its test years is a
claim about the years.

## Finding 1: The baseline that matters is a gauge, not a mean

NSE's built-in baseline, the basin's mean flow, is weak. Two stronger ones were scored
on the identical test set and metric definitions, matched by forecast lead.
Persistence carries the gauge reading from k days ago forward unchanged. Damped
persistence relaxes that last reading toward the seasonal cycle at the basin's fitted
day-to-day autocorrelation. The train-period mean scores −0.08 and the raw seasonal
cycle +0.20, so neither is competitive at short leads.

| Lead (days) | LSTM | Persistence | Damped pers. | LSTM, focus 5 | Persistence, focus 5 | Damped, focus 5 |
|---|---|---|---|---|---|---|
| 1 | 0.667 | 0.712 | **0.738** | 0.810 | 0.944 | **0.945** |
| 2 | **0.688** | 0.484 | 0.566 | 0.810 | **0.864** | 0.869 |
| 3 | **0.665** | 0.301 | 0.447 | 0.809 | 0.803 | **0.814** |
| 5 | **0.670** | 0.037 | 0.340 | **0.802** | 0.702 | 0.725 |
| 7 | **0.597** | −0.122 | 0.295 | **0.792** | 0.610 | 0.649 |

At one day ahead the gauge is the better forecast on most basins. The LSTM beats plain
persistence on 9 of 22 and damped persistence on 4 of 22. Persistence decays with lead
while the LSTM's skill stays nearly flat, so the curves cross, with the cohort median
crossing at day 2, 17 of 22 basins by day 2, 21 by day 3, and all 22 from day 4. The
high-storage focus basins cross later, at day 3 against plain persistence and day 4
against damped. The rain-classified focus basin, Mill Creek, is the exception in the
other direction. The LSTM wins there at every lead (0.618 against 0.594 damped at
day 1), because persistence has no skill for flashy rain response.

<figure>
  <img src="{{ '/assets/notes/cv_persistence_crossover.png' | relative_url }}" alt="Two panels of median NSE versus forecast lead in days, comparing the LSTM against plain and damped gauge persistence for the 22-basin cohort and the five focus basins." />
  <figcaption>Median NSE vs forecast lead (days), WY2017+WY2023 test set: LSTM, lag-k gauge persistence, and damped persistence. Left: 22-basin cohort. Right: the five focus basins (four snow-classified, one rain). Dotted lines mark the lead where the LSTM median first exceeds each baseline.</figcaption>
</figure>

Splitting the same comparison by storm size asks the question an operator would ask.
Does the day-2 advantage hold when it matters? On total error it does, at about a
third of the overall margin. MAE skill against plain persistence at lead 2 is +0.06 in
the two top storm bins against +0.17 pooled, growing to +0.29 to +0.36 by lead 7.
Counting days instead of totals, the advantage arrives later. Above the 95th storm
percentile the LSTM wins a bare majority of days from lead 2 (0.52, rising to 0.70 by
lead 7), while in the 80th-to-95th band it wins fewer than half until lead 4. The
early total-error advantage comes from avoiding a few very large persistence misses
rather than from being routinely better. The rising skill at long leads is also
persistence collapsing rather than the LSTM improving. In the top bin the LSTM's error
is nearly flat with lead, 10.9 to 10.8 mm/day against a bin average of 17.1, while
plain persistence degrades from 10.1 to 15.1. Both are poor on extreme days; the
learned model is less poor. One baseline does not fit all conditions, either. Damped
persistence, the stronger baseline on average, is the weaker one in storms, because
relaxing toward climatology is exactly wrong on a storm day. The stratified table
therefore scores against whichever baseline is stronger in each bin.

<figure>
  <img src="{{ '/assets/notes/cv_storm_stratified_persistence.png' | relative_url }}" alt="Two panels of MAE skill score versus forecast lead, LSTM against plain and damped gauge persistence, with one line per storm-size bin; all bins cross zero between leads one and two." />
  <figcaption>MAE skill of the LSTM relative to plain (left) and damped (right) gauge persistence, 1 &minus; MAE<sub>LSTM</sub>/MAE<sub>baseline</sub>, by forecast lead and storm-size bin (percentile of each basin&rsquo;s wet-day precipitation climatology at the target date). WY2017+WY2023, 22-basin cohort. Above zero, the LSTM has the lower error.</figcaption>
</figure>

The information asymmetry runs in both directions. The LSTM never sees observed
discharge, so persistence is built from a gauge reading the model is denied, and a
real flood operator has that gauge. In the other direction, the LSTM sees forecast
weather through the target day, so at day 1 it loses to a naive gauge reading while
holding information about tomorrow's storm that persistence lacks. That loss is
concentrated on quiet days, where MAE skill is −0.46 against −0.08 to −0.15 in the
storm bins. The gauge is nearly unbeatable on a calm day and merely better in a storm.
Both halves point at the same next architecture, which is to take both inputs and
assimilate the gauge.

The seasonal-cycle baseline carries its own lesson. It scored −0.25 on the 2012–2014
drought window and +0.198 on the flood years. A baseline's value is a property of the
test period, not of the baseline.

## Finding 2: The model gets *when*, not *how big*

On the flood years the deterministic model scores NSE 0.754 and puts peaks within
about a day of the observed timing, while missing their size. High-flow volume bias,
the bias over the top 2% of the flow-duration curve (FHV), is −19%; roughly 45% of
peaks are missed; and peak magnitude error is near 48%. Two cautions attach to the
timing number. A daily-mean series cannot resolve sub-daily peak timing at all, and
the weather inputs are aggregated on UTC days while USGS gauges aggregate on local
days, a mismatch that can contribute up to a day by itself. "About a day" is the
resolution limit, not precision. Peak counts come from a few events per basin over two
water years, so the peak rows are coarse. For flood operations, where the decision is
how much water to release before a storm arrives, the magnitude is the operative
quantity.

<figure>
  <img src="{{ '/assets/notes/cv_flood_hydrographs.png' | relative_url }}" alt="Five stacked panels of daily observed and simulated streamflow in millimeters per day for the focus basins across water year 2017, with observed peak values annotated." />
  <figcaption>Daily observed and simulated (lead-0) streamflow, mm/day, five focus basins, WY2017. Annotations give the observed peak in mm/day.</figcaption>
</figure>

The failure is not specific to machine learning. On a separately held-out extreme
(January 1997, with the entire 1990s excluded from training) the LSTM and the NOAA
process model both underestimated the flood peak by tens of percent, and on the
rain-driven basin the process model came far closer. A caveat cuts against the LSTM
there. 1997 predates the forecast-product archives, so the model ran with reanalysis
standing in for its forecast inputs. That is realized future weather, which flatters
the model rather than handicapping it. Peak underestimation at this level is close to
the state of the art for both model families.

A capacity experiment sharpens the point. Raising the LSTM's hidden size from 16 to
128 improved average skill (NSE 0.679 to 0.754) and degraded the peaks, moving FHV
from −12% to −19% and missed peaks from 0.33 to 0.45. Added capacity bought accuracy
on the bulk of the flow distribution and paid for it in the tail, consistent with
regression toward the mean on out-of-distribution extremes. One training run per
capacity, so this is a consistent gradient rather than a seed-controlled result.

The location of the misses is measurable. Binned by each basin's own wet-day
precipitation climatology, the 15,907 test basin-days show same-day bias within ±2% of
zero for storms up to the 80th percentile, and then it breaks. Above the 95th
percentile the model under-predicts flow by 52% and runs low on 84% of days. At
three-day lead, scored against conditions on the storm's actual arrival day, the same
structure is starker, with −30% bias in the 80th-to-95th-percentile bin and −61% above
the 95th, under-predicting on 88% of days. The error is not spread across the flow
distribution. It is concentrated in the top fifth of storms. At those extremes it is a
magnitude problem rather than a horizon problem. The model's error in the top storm
bin is nearly identical at one-day and seven-day lead, so a better weather forecast
would not fix it; this is regression toward the mean, visible at every horizon at
once.

<figure>
  <img src="{{ '/assets/notes/cv_storm_stratified_skill.png' | relative_url }}" alt="Two bar panels by storm-size bin: relative bias near zero through the 80th percentile then strongly negative, and under-prediction frequency rising past 0.84 in the top bin." />
  <figcaption>Skill by storm-size bin (percentile of each basin&rsquo;s wet-day precipitation climatology; ERA5-Land forcing), WY2017+WY2023, leads 0 and 3, with lead-3 rows scored at the target date (issue + 3). Left: relative bias, mean(sim&minus;obs)/mean(obs). Right: fraction of basin-days with sim &lt; obs; dashed line at 0.5.</figcaption>
</figure>

An event-level diagnostic points the same way, and is offered as direction rather than
slope. Across 281 observed flow peaks in the test windows, the median miss deepens
with event size, from −13% for peaks below a quarter of the basin's training-record
maximum, through −26% and −33% in the middle bins, to −72% in the top bin. Three
caveats keep this exploratory. The top bin holds only three events; events cluster by
basin and storm sequence, so they are not independent; and the observed peak enters
both axes, which can push the slope negative by construction. The storm-percentile
bins above share none of those problems and carry the load-bearing version of the
claim.

<figure>
  <img src="{{ '/assets/notes/cv_peak_error_curve.png' | relative_url }}" alt="Scatter of relative peak error versus observed peak magnitude normalized by each basin&rsquo;s training-record maximum, with binned medians declining from about minus 0.13 to minus 0.72 and a Theil-Sen fit line." />
  <figcaption>Relative peak error, (sim&minus;obs)/obs, vs observed peak magnitude normalized by the basin&rsquo;s training-record maximum flow. 281 events, 22 basins, WY2017+WY2023. Points colored by regime; black markers: binned medians; dashed: Theil&ndash;Sen fit. Exploratory: the top bin holds three events, and the axes share the observed peak.</figcaption>
</figure>

## Finding 3: A held-out basin failed, and the experiment cannot say why

Most basins have no gauge, so ungauged prediction is the version of this problem water
agencies face. Holding each focus basin entirely out of training, Bear Creek
(snow-classified) drops to NSE 0.646 with high-flow bias −29%, Pitman Creek
(snow-classified) to 0.375 with −62%, and Mill Creek, the rain-classified basin, to
−0.740 with the bias flipped to +80%. The snow basins degrade. Mill Creek inverts,
scoring worse than the observed mean while over-predicting the flows it used to
under-predict.

<figure>
  <img src="{{ '/assets/notes/cv_lobo_millck_inversion.png' | relative_url }}" alt="Daily streamflow at Mill Creek from October 2022 through June 2023 for observations, the model trained with Mill Creek included, and the model with Mill Creek held out." />
  <figcaption>Daily streamflow (mm/day) at Mill Ck, 2022-10 to 2023-06: observations, the 28-basin model (Mill Ck in training), and the leave-one-basin-out model (Mill Ck excluded). NSE values in the legend are computed over WY2017+WY2023.</figcaption>
</figure>

What this experiment does not establish is why. An earlier version of this writeup
called it regime transfer, a model trained on snowmelt applied to rain, and the
training population contradicts that story. The 27 basins remaining after Mill Creek
is held out are 19 rain-classified and 8 snow-classified, and Mill Creek's own snow
fraction of zero is shared by eighteen other basins in the set. One held-out basin
cannot separate the candidate explanations, which include basin attributes, catchment
scale, precipitation-to-flow timing, differences in the record extension, spatial
extrapolation, and single-seed training variance. Published regionalization successes
rest on hundreds of hydrologically diverse basins, and naming a mechanism here would
take leave-cluster-out tests across several basin groups rather than one basin.

The operational lesson survives the demolished explanation. A regional model can fail
completely on a basin it has never seen, and nothing in its outputs announces that it
is doing so. Skill on the training cohort said nothing about Mill Creek.

(Two further basins, the nested Merced pair, scored 0.857 and 0.790 in the same
experiment. Each has its nested partner in the training set, which leaks the
hydrograph, so they are excluded from the ungauged claim.)

## Finding 4: Sharper, and overconfident

The distributional head emits a full probability distribution for each day's flow in
place of a single number. The continuous ranked probability score (CRPS) makes the
comparison to the deterministic head fair. For a single-number forecast CRPS reduces
exactly to absolute error, so both heads are scored by one proper rule and the
distribution wins only if its spread carries information.

| Lead (days) | Distributional | Deterministic | Improvement |
|---|---|---|---|
| 0 (same-day) | 0.916 | 1.231 | **26%** |
| 3 | 1.081 | 1.452 | **26%** |
| 7 | 1.185 | 1.550 | **24%** |

(CRPS in mm/day.)

The spread does carry information, a 22–26% CRPS reduction at every lead. The
distributional head also edges the deterministic one on point metrics (NSE 0.784
against 0.754, fewer missed peaks, smaller peak error, some loss in KGE).

The intervals, however, are not calibrated. An interval that claims 90% coverage
captures 66–72% of observations, nearly uniformly across leads 0 through 7. The
sharper forecast is also overconfident, which for an operator is the dangerous
direction.

<figure>
  <img src="{{ '/assets/notes/cv_crps_calibration.png' | relative_url }}" alt="Two panels: median CRPS versus lead for both model heads, and empirical coverage of the nominal 90 percent interval versus lead, which stays between 0.66 and 0.72." />
  <figcaption>Left: median CRPS (mm/day) vs lead for the distributional and deterministic heads. Right: empirical coverage of the nominal 90% predictive interval vs lead; the shaded band is the pre-specified 85&ndash;95% acceptance range.</figcaption>
</figure>

The rank histogram, computed on the 15,907 same-day basin-days, locates the failure.
In aggregate it is U-shaped and nearly symmetric, with 22% of observations above the
ensemble's 90th percentile rank and 20% below the 10th, the signature of plain
under-dispersion. Conditioned on flow, the two tails separate. At high flows the
observation escapes above the interval (23% above, 3% below), and at low flows it
escapes below (23% below, 9% above). The predictive distribution is displaced toward
the middle of the flow distribution at both ends, which is regression toward the mean
in distributional form. A separate heavy-tail pathology, in which rare extreme samples
inflate the ensemble standard deviation to about three times the RMSE, accounts for
the spread/skill ratio and the NaN training losses, and does not account for the
coverage failure.

<figure>
  <img src="{{ '/assets/notes/cv_pit_histogram.png' | relative_url }}" alt="Rank histogram of observations within the predictive ensemble, U-shaped with elevated density in both extreme bins." />
  <figcaption>Rank histogram (PIT) of observations within the 7500-member predictive ensemble, all basins, lead 0. Dashed line: the uniform density of a calibrated ensemble.</figcaption>
</figure>

A correction has been tested, with a design that doubles as a transfer experiment. The
method, cross-fitted affine calibration, is a median shift and a spread scale fit per
band of predicted flow, learned on one flood water year and applied to the other, so
every reported number is out-of-sample. Coverage recovers from 0.66–0.72 raw to
0.88–0.91 at every lead, inside the target band, and the cost in sharpness is
essentially nil. The flow-conditional map leaves CRPS unchanged at same-day (0.901
raw, 0.900 corrected) and gains about 1% at seven days (1.209 to 1.196), while a
single global correction costs 0.00–0.04 mm/day of CRPS at every lead. On the
highest-flow third of days, where the failure lived, raw coverage is 0.70 with 26% of
observations escaping above the interval. The flow-conditional map reaches 0.85 there
with 12% above and the best CRPS of the three variants (2.78, against 2.89 global and
2.85 raw), though the global map achieves higher coverage (0.89). A correction fit on
one atmospheric-river winter held in a different one, which is the transfer an
operational deployment would need.

<figure>
  <img src="{{ '/assets/notes/cv_recalibration.png' | relative_url }}" alt="Two panels: interval coverage by lead rising from 0.66 to 0.72 raw to between 0.88 and 0.91 after calibration, and fair CRPS by lead with the calibrated variants nearly overlapping the raw curve." />
  <figcaption>Coverage (left) and fair CRPS (right) by lead on the flood test years, all scored at the target date: raw ensemble vs global and flow-conditional affine calibration, each window scored with parameters fit on the other window. Shaded band: 85&ndash;95% acceptance range.</figcaption>
</figure>

An earlier version of this section claimed more, with raw intervals collapsing to 0.46
coverage at day 7 and a recalibration that improved CRPS by 11% at long leads. Both
numbers were artifacts of a scoring bug, in which multi-lead forecasts were paired
with observations from the issue date rather than the target date. An adversarial
review of this project found it, and the numbers were corrected on 2026-08-19; the
section "What it took to trust these numbers" has the anatomy. The surviving story is
less dramatic and more useful. The raw intervals under-cover by a roughly constant
margin at all leads, and an affine correction fixes coverage without paying for it in
sharpness.

## Finding 5: The benchmark win depends on the benchmark

The comparison model is the NOAA National Water Model (NWM), the continental-scale
process simulation behind federal streamflow guidance. A protocol note belongs ahead
of any number. The comparison uses NWM retrospectives, which are reruns over past
decades driven by observed weather with no gauge assimilation, against the LSTM's
same-day hindcast. This is a simulation-to-simulation comparison, not operational
forecast skill. The operational NWM assimilates gauges and would be a different
opponent.

On the 2012–2014 window the LSTM beat the v2.1 retrospective on every focus basin,
median NSE 0.83 against 0.53, which is the comparison that motivated this project.
Rerun on the flood years, against v2.1 and the current v3.0:

| Window | LSTM | NWM v2.1 | NWM v3.0 |
|---|---|---|---|
| WY2017, median NSE | 0.772 | 0.628 | **0.848** |
| WY2017, high-flow bias | −20% | −2% | **−5%** |
| WY2023 (Oct–Jan), median NSE | **0.443** | — | 0.162 |

On WY2017 the modern NWM beats the LSTM on median skill, winning three of five basins,
with far smaller high-flow bias and peak error; a large share of the original margin
was the NWM version rather than the physics. On the partial WY2023 window (the v3.0
retrospective ends 2023-02-01, covering the December–January storm sequence and
missing the March storms) the LSTM wins on median skill, and both systems
underestimate high flows by 53–55%.

<figure>
  <img src="{{ '/assets/notes/cv_lstm_vs_nwm_flood.png' | relative_url }}" alt="Grouped bar chart of NSE per focus basin comparing the LSTM with NWM retrospective versions across the two flood windows." />
  <figcaption>Per-basin NSE, LSTM vs NWM retrospectives. Left: WY2017 (v2.1 hatched, v3.0 solid). Right: 2022-10 to 2023-01 (v3.0). Bars clipped at &minus;0.55.</figcaption>
</figure>

Two structural results are stable in every window tested. The LSTM wins Bear Creek
decisively in both flood years (0.92 and 0.77, against at best 0.07), a
high-elevation, high-storage snow basin where the NWM's snow physics reliably fails.
The process model wins rain-driven flood peaks (Mill Creek scores 0.90 against 0.74 in
WY2023, with the same signature in 1997), where explicit routing preserves what
regression toward the mean smooths away.

"ML beats the process model" is therefore a claim indexed by model version, test
years, and hydrologic regime. The result that survives the indexing is
complementarity. Each model dominates where the other's structure fails.

## A note on the winter ahead

(Written in August 2026. This section will age; the findings above should not.)

NOAA's Climate Prediction Center reports El Niño conditions in place, with its August
outlook giving a very strong event 90–95% odds through early winter. Strong El Niño
winters tend to shift storm character in a known direction, toward a
southward-displaced subtropical jet and warmer atmospheric rivers with high snow
levels, which means more rain falling on basins that usually take snow. Read against
the findings above, that is the unfriendly direction on three axes at once. The tail
is where the model under-predicts, by 52% above the 95th storm percentile same-day and
61% at three-day lead. Warm storms push snow basins toward behavior the training data
associates with other basins, and Finding 3 shows that failure outside the training
envelope arrives silently. And the raw predictive intervals miss above the interval
seven times more often than below exactly at high flows, which Finding 4 shows is
correctable, but only after correction. The usable core is the two-to-seven-day
window, the leads where this model class out-forecasts the gauge (thinly on the
largest storm days), which is also the FIRO decision horizon, and where forecast
improvements from atmospheric-river reconnaissance flights pass straight through a
weather-driven model.

## What this adds up to

| Use case | Verdict |
|---|---|
| 2–7 day volume forecast, gauged basin, conditions resembling training | **Yes.** Beats both persistence baselines on the cohort median from day 2 and on all 22 basins from day 4, across two challenge flood years. Within the top storm bins the margin thins to about a third of the pooled value but holds |
| 1-day forecast | **Mostly no.** Beats plain persistence on 9 of 22 basins and damped on 4 of 22; the gauge is better, and free. Flashy rain basins are the exception |
| Flood peak magnitude | **Not yet.** And the process model largely shares the failure |
| Ungauged basin | **Not demonstrated.** One held-out basin inverted (NSE −0.74), and the cause is not established, which is itself the caution |
| Calibrated uncertainty | **Raw, no** (66–72% at a claimed 90%). **After cross-fitted calibration, yes** (88–91% at every lead, CRPS-neutral), tested across winters |
| Replacing the process model | **No.** The v3.0 retrospective wins WY2017 on 3 of 5 basins; the models are complementary by regime |

The strongest claim this work supports is narrower than "ML beats the process model,"
and more useful. ML delivers measurable forecast value in gauged basins at
two-to-seven-day leads under conditions resembling its training data, and the boundary
of that value has been measured against the baselines an operator has in hand.

## What it took to trust these numbers

Every number above comes from one scoring protocol. Simulations are read from each
run's inference output; observations come from the source gauge records, never from a
model run's own copy; metrics use the framework's implementations; checkpoints are
chosen on validation skill; and medians are over a stated 22-basin cohort.
Deterministic inference reproduced bit-for-bit across repeated runs. The
distributional model's sample-median metrics carry a bootstrap uncertainty below 0.001
NSE, so reported differences are not ensemble-sampling noise. Each configuration is a
single training run, and seed-to-seed variance is the uncontrolled axis, which is why
none of the small margins above should be read to a third decimal.

The protocol has this shape because closure tests kept catching problems. One
test-period choice flattered skill by 0.11 NSE. An evaluation code path silently
dropped over a quarter of the scoreable basins from its medians. An upstream bug
writes corrupted observations into the distributional model's output files, caught
because two reported metrics could not both be true of the same simulation. The record
extension was validated by closure against the overlapping original record, which
caught a per-basin catchment-area discrepancy and five gauges whose records disagree
outright; those were excluded rather than rescaled.

The protocol did not catch everything. An adversarial review of this project in August
2026 found that two multi-lead analyses paired forecasts with observations from the
forecast's issue date rather than its target date, so a seven-day forecast was scored
against flow seven days too early. The recalibration and lead-3 storm numbers in
Findings 2 and 4 are the corrected values. The earlier published versions overstated
how badly the raw intervals degraded with lead, manufactured a CRPS benefit for
recalibration, and understated the storm-tail bias. In hindsight there was a visible
tell. The old analysis showed better CRPS at one-day lead than at same-day, and a
one-day forecast cannot beat a same-day estimate built from the same information. A
closure test now asserts, for every lead, that the stored observations equal the
source gauge record on the target date (they match to one float32 bit), and the
split's 28 boundary-date overlaps are tabulated rather than assumed harmless. The same
review retired this writeup's earlier geographic framing of Sierra snowmelt in favor
of the 20-rain and 8-snow census above, along with a synthetic-storm scenario
experiment whose causal framing did not survive scrutiny. That experiment lives on in
the project log as an exploratory diagnostic.

Known limitations, failure modes, and the traps encountered along the way are
documented in the repository's
[METHODS.md](https://github.com/holdenlesliebole/central-valley-flood-lstm/blob/main/docs/METHODS.md).
