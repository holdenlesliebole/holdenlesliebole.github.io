---
title: "When can you trust an ML streamflow forecast? A California Sierra case study"
date: 2026-08-18
tags: [hydrology, machine-learning, flood-forecasting, evaluation, atmospheric-rivers]
summary: "Google's open flood-forecasting LSTM trained on 28 California basins and evaluated the way a flood-operations agency would: held-out flood years, gauge persistence as the null, peak metrics, ungauged transfer, probabilistic calibration, and a version-controlled NWM benchmark, read against the super-El-Nino winter ahead. The model wins in a bounded region, and the boundary has been measured."
math: false
---

*Code, configs, and the full methods record: [github.com/holdenlesliebole/central-valley-flood-lstm](https://github.com/holdenlesliebole/central-valley-flood-lstm).*

## The short version

The model is a good 2-to-7-day volume forecaster for gauged basins in a hydrologic
regime it has seen. It is not a flood-peak predictor. At 1-day lead it loses to
yesterday's gauge reading everywhere except rain-driven basins. Held out of training, it
failed to transfer across a regime boundary. Its predictive intervals cover 66–74% of
observations at a nominal 90%. And its margin over the process model depends on the
process model's version and on the test years. Each of those statements is a
measurement; the sections below give the numbers.

---

## The task, the model, and the score

The task is short-range river forecasting. Given the weather over a mountain basin up
through today, plus a weather forecast for the coming week, predict the daily average
streamflow at the basin outlet for each of the next several days. Each day ahead is a
*lead*: lead 0 is an estimate of today's flow made with today's weather, lead 3 is a
three-day-ahead forecast. In California this problem matters most for the Sierra Nevada
headwater basins that fill the Central Valley's reservoirs, where operators decide how
much water to release ahead of incoming storms.

The model is an LSTM, a recurrent neural network that reads one day of input at a time
and carries a learned internal state from day to day — in this setting, a stand-in for
how much water the basin is holding as snowpack and soil moisture. Each day it ingests
basin-averaged precipitation and temperature from three weather products (ECMWF HRES
forecasts, NASA's IMERG satellite precipitation, NOAA's CPC gauge analysis), plus a
fixed vector of catchment attributes: area, elevation, climate statistics. Observed
streamflow is never an input; the model runs on weather alone. Output is streamflow in
mm/day (water depth per day spread over the basin area, which puts small and large
basins on one scale) at leads 0 through 7. One head produces a single number per day and
trains on mean squared error; a second produces a probability distribution and trains on
its likelihood. The architecture and training code are Google Research's open
flood-forecasting framework, the system behind their Flood Hub product.

Training data are 28 California basins from Caravan, a community dataset of gauged,
minimally regulated catchments. Undammed basins are the point, not a limitation: the
operational question in California is unimpaired inflow to the reservoirs, and the
near-natural Sierra gauges measure exactly that. The streamflow records, which end in
2014 as published, were extended through October 2024 from USGS gauge data.

Forecasts are scored by NSE, the Nash–Sutcliffe efficiency, hydrology's standard skill
score: 1 is a perfect match to observations, 0 means no more accurate than always
predicting the basin's mean flow, and negative values are worse than that constant.

---

## The test

The held-out test years are water years 2017 and 2023 (a *water year* runs October
through September and is named for its end). Both were flood years built from
atmospheric rivers — the narrow plumes of Pacific vapor that deliver most of
California's large storms. The WY2017 sequence damaged both spillways at Oroville Dam
and forced the evacuation of nearly 190,000 people downstream; WY2023 brought the
December–January storm train that ended a three-year drought. Training uses every
remaining day in the record outside these windows and the 2009–2011 validation years,
and checkpoints are selected on validation skill, never taken from the last epoch. Of
the 28 trained basins, 22 have observations in the flood windows. Medians below are over
that fixed cohort, except in Finding 5, where the comparison covers five focus basins.


<figure>
  <img src="{{ '/assets/notes/cv_study_map.png' | relative_url }}" alt="Map of California showing the 28 training basins as markers colored by snow fraction, with the five focus basins ringed and six excluded basins marked with crosses." />
  <figcaption>The 28 training basins. Marker color: fraction of precipitation falling as snow (Caravan attribute). Rings: the five focus basins. Crosses: the six basins with no observations in WY2017 or WY2023, excluded from cohort medians. Triangle: Oroville Dam.</figcaption>
</figure>

The choice of test period is itself the first result. Tested on 2012–2014, the onset of
California's drought, the model scores a median NSE of 0.862; tested on the two flood
years, the same architecture at the same capacity on the same 22 basins scores 0.754
(0.836 and 0.679 at a smaller capacity). The flood-year model trains on eleven more
years of data, so the gap is a lower bound on the window effect. Neither number is
wrong. A streamflow skill claim that omits the hydrologic character of its test years is
a claim about the years.

---

## Finding 1 — The baseline that matters is a gauge, not a mean

NSE's built-in null, the basin's mean flow, is weak. Two stronger nulls, scored on the
identical test set and metric definitions and matched by forecast lead: *persistence*
(the gauge reading from k days ago carried forward) and *damped persistence* (the last
reading relaxed toward the seasonal cycle at the basin's fitted day-to-day
autocorrelation). The train-period mean scores −0.08 and the raw seasonal cycle +0.20;
neither is competitive at short leads.

| Lead (days) | LSTM | Persistence | Damped pers. | LSTM, focus 5 | Persistence, focus 5 | Damped, focus 5 |
|---|---|---|---|---|---|---|
| 1 | 0.667 | 0.712 | **0.738** | 0.810 | 0.944 | **0.945** |
| 2 | **0.688** | 0.484 | 0.566 | 0.810 | **0.864** | 0.869 |
| 3 | **0.665** | 0.301 | 0.447 | 0.809 | 0.803 | **0.814** |
| 5 | **0.670** | 0.037 | 0.340 | **0.802** | 0.702 | 0.725 |
| 7 | **0.597** | −0.122 | 0.295 | **0.792** | 0.610 | 0.649 |

At one day ahead the gauge beats the model nearly everywhere. Persistence decays with
lead while the LSTM's skill stays nearly flat, so the curves cross: at day 2 across the
cohort against both nulls, and on the high-storage snowmelt focus basins at day 3
against plain persistence and day 4 against damped persistence. The exception is the
rain-driven basin, where the LSTM wins at every lead (0.618 against 0.594 damped at
day 1); persistence has no skill for flashy rain response.

The information asymmetry runs in both directions. The LSTM never sees observed
discharge, and persistence is built from a gauge reading the model is denied; a real
flood operator has that gauge. In the other direction, the LSTM sees forecast
meteorology through the target day, so at day 1 it loses to a naive gauge reading while
holding information about tomorrow's storm that persistence lacks. Both halves point at
the same next architecture: take both inputs, and assimilate the gauge.


<figure>
  <img src="{{ '/assets/notes/cv_persistence_crossover.png' | relative_url }}" alt="Two panels of median NSE versus forecast lead in days, comparing the LSTM against plain and damped gauge persistence for the 22-basin cohort and the five focus basins." />
  <figcaption>Median NSE vs forecast lead (days), WY2017+WY2023 test set: LSTM, lag-k gauge persistence, and damped persistence. Left: 22-basin cohort. Right: five snowmelt focus basins. Dotted lines mark the lead where the LSTM median first exceeds each null.</figcaption>
</figure>

The seasonal-cycle null carries its own lesson. It scored −0.25 on the 2012–2014
drought window and +0.198 on the flood years. A baseline's value is a property of the
test period, not of the baseline.

---

## Finding 2 — The model gets *when*, not *how big*

On the held-out flood years the deterministic model scores NSE 0.754 and times peaks to
about one day, while missing their size: high-flow volume bias (*FHV*, the bias over the
top 2% of the flow-duration curve) is −19%, roughly 45% of peaks are missed, and peak
magnitude error is near 48%. Peak counts come from a few events per basin over two water
years, so the peak rows are coarse. For flood operations, where the decision is how much
water to release before a storm arrives, the magnitude is the operative quantity.


<figure>
  <img src="{{ '/assets/notes/cv_flood_hydrographs.png' | relative_url }}" alt="Five stacked panels of daily observed and simulated streamflow in millimeters per day for the focus basins across water year 2017, with observed peak values annotated." />
  <figcaption>Daily observed and simulated (lead-0) streamflow, mm/day, five focus basins, WY2017. Annotations give the observed peak in mm/day.</figcaption>
</figure>

The failure is not specific to machine learning. On a separately held-out extreme
(January 1997, with the entire 1990s excluded from training) the LSTM and the NOAA
process model both underestimated the flood peak by tens of percent, and on the
rain-driven basin the process model came far closer. Two caveats attach to 1997: it
predates the forecast-era forcing products, so the LSTM ran on degraded inputs there,
and peak underestimation at this level is close to the state of the art for both model
families.

A capacity experiment sharpens the point. Raising the LSTM's hidden size from 16 to 128
improved average skill (NSE 0.679 to 0.754) and degraded the peaks: FHV moved from −12%
to −19% and missed peaks from 0.33 to 0.45. Added capacity bought accuracy on the bulk
of the flow distribution and paid for it in the tail, consistent with regression toward
the mean on out-of-distribution extremes. One training run per capacity, so this is a
consistent gradient rather than a seed-controlled result.

The location of the misses is measurable. Binning the 15,907 test basin-days by each
basin's own wet-day precipitation climatology: bias stays within ±2% of zero for storms
up to the 80th percentile, then breaks. Above the 95th percentile the model
under-predicts flow by 52% and runs low on 84% of days. The error is not spread across
the flow distribution; it is concentrated in the top fifth of storms.


<figure>
  <img src="{{ '/assets/notes/cv_storm_stratified_skill.png' | relative_url }}" alt="Two bar panels by storm-size bin: relative bias near zero through the 80th percentile then strongly negative, and under-prediction frequency rising to 0.84 in the top bin." />
  <figcaption>Skill by storm-size bin (percentile of each basin&rsquo;s wet-day precipitation climatology; ERA5-Land forcing), WY2017+WY2023, leads 0 and 3. Left: relative bias, mean(sim&minus;obs)/mean(obs). Right: fraction of basin-days with sim &lt; obs; dashed line at 0.5.</figcaption>
</figure>

The same structure appears event by event. Across 281 observed flow peaks in the test
windows, the median miss deepens with event size: −13% for peaks below a quarter of the
basin's training-record maximum flow, −26% and −33% in the middle bins, −72% for the
three events that approach the training maximum (Theil–Sen slope −0.66 per unit of
normalized magnitude). No test event exceeds the training maximum, so these curves
measure the approach to the edge of the training distribution. Beyond that edge there is
no data, which is the case for the scenario experiment in "The winter everyone is
watching."

---


<figure>
  <img src="{{ '/assets/notes/cv_peak_error_curve.png' | relative_url }}" alt="Scatter of relative peak error versus observed peak magnitude normalized by each basin&rsquo;s training-record maximum, with binned medians declining from about minus 0.13 to minus 0.72 and a Theil-Sen fit line." />
  <figcaption>Relative peak error, (sim&minus;obs)/obs, vs observed peak magnitude normalized by the basin&rsquo;s training-record maximum flow. 281 events, 22 basins, WY2017+WY2023. Points colored by regime; black markers: binned medians; dashed: Theil&ndash;Sen fit (slope &minus;0.66).</figcaption>
</figure>

## Finding 3 — It regionalizes within a regime and inverts across one

Most basins have no gauge, so ungauged prediction is the version of this problem water
agencies actually face. Holding each focus basin entirely out of training: Bear Ck
(snowmelt) drops to NSE 0.646 with high-flow bias −29%; Pitman Ck (snowmelt) to 0.375
with −62%; Mill Ck, the rain-driven basin, to −0.740 with the bias flipped to +80%.
The snowmelt basins degrade. Mill Ck inverts, scoring worse than the observed mean while
over-predicting the flows it used to under-predict.


<figure>
  <img src="{{ '/assets/notes/cv_lobo_millck_inversion.png' | relative_url }}" alt="Daily streamflow at Mill Creek from October 2022 through June 2023 for observations, the model trained with Mill Creek included, and the model with Mill Creek held out." />
  <figcaption>Daily streamflow (mm/day) at Mill Ck, 2022-10 to 2023-06: observations, the 28-basin model (Mill Ck in training), and the leave-one-basin-out model (Mill Ck excluded). NSE values in the legend are computed over WY2017+WY2023.</figcaption>
</figure>

The mechanism is regime extrapolation. Trained on 27 mostly-snowmelt catchments, the
model learned a snowmelt mapping and applied it to a rain-driven catchment it had never
seen. One basin carries this result (Mill Ck is the only rain-driven basin in the set),
so it is a demonstration rather than a statistic, and it reflects the 27-basin,
regime-homogeneous training set: published regionalization successes rest on hundreds of
hydrologically diverse basins, and the diversity is what does the work. The remedy is
training-set diversity rather than architecture. The operational lesson survives either
way: a regional model extrapolates its regime onto basins that do not share it, and
nothing in its outputs announces that it is doing so.

(Two further basins, the nested Merced pair, scored 0.857 and 0.790 in the same
experiment. Each has its nested partner in the training set, which leaks the hydrograph,
so they are excluded from the ungauged claim.)

---

## Finding 4 — Sharper, and overconfident

The distributional head emits a full probability distribution for each day's flow in
place of a single number. *CRPS* (continuous ranked probability score) makes the
comparison to the deterministic head fair: for a single-number forecast CRPS reduces
exactly to absolute error, so both heads are scored by one proper rule and the
distribution wins only if its spread carries information.

| Lead (days) | Distributional | Deterministic | Improvement |
|---|---|---|---|
| 0 (same-day) | 0.916 | 1.231 | **26%** |
| 3 | 1.081 | 1.452 | **26%** |
| 7 | 1.185 | 1.550 | **24%** |

(CRPS in mm/day.)

The spread does carry information: a 22–26% CRPS reduction at every lead. The
distributional head also edges the deterministic one on point metrics (NSE 0.784
against 0.754, fewer missed peaks, smaller peak error, some loss in KGE).


<figure>
  <img src="{{ '/assets/notes/cv_crps_calibration.png' | relative_url }}" alt="Two panels: median CRPS versus lead for both model heads, and empirical coverage of the nominal 90 percent interval versus lead, which stays between 0.66 and 0.74." />
  <figcaption>Left: median CRPS (mm/day) vs lead for the distributional and deterministic heads. Right: empirical coverage of the nominal 90% predictive interval vs lead; the shaded band is the pre-specified 85&ndash;95% acceptance range.</figcaption>
</figure>

The intervals, however, are not calibrated: a nominal 90% predictive interval covers
66–74% of observations, so the sharper forecast is also overconfident, which for an
operator is the dangerous direction. The rank histogram locates the failure. In
aggregate it is U-shaped and nearly symmetric, with 22% of observations above the
ensemble's 90th percentile rank and 20% below the 10th, the signature of plain
under-dispersion. Conditioned on flow, the two tails separate: at high flows the
observation escapes above the interval (23% above, 3% below), and at low flows it
escapes below (23% below, 9% above). The predictive distribution is displaced toward
the middle of the flow distribution at both ends, regression toward the mean in
distributional form. A separate heavy-tail pathology (rare extreme samples that inflate
the ensemble standard deviation to about 3× the RMSE) accounts for the spread/skill
ratio and the NaN training losses, and does not account for the coverage failure.


<figure>
  <img src="{{ '/assets/notes/cv_pit_histogram.png' | relative_url }}" alt="Rank histogram of observations within the predictive ensemble, U-shaped with elevated density in both extreme bins." />
  <figcaption>Rank histogram (PIT) of observations within the 7500-member predictive ensemble, all basins, lead 0. Dashed line: the uniform density of a calibrated ensemble.</figcaption>
</figure>

The diagnosis constrains the remedy. Uniform variance inflation widens intervals
everywhere and still misses high-flow observations that sit above a displaced center, so
the fix has to be flow-conditional: recalibration by flow band, or a bias-aware head.
Whatever fixes coverage must then be re-scored against the 22–26% CRPS gain it could
erode.

---

## Finding 5 — The benchmark win depends on the benchmark

The comparison model is the NOAA National Water Model (NWM), the continental-scale
process simulation behind federal streamflow guidance, evaluated through its
*retrospectives*: reruns over past decades driven by observed weather rather than
forecasts. On the 2012–2014 window the LSTM beat the v2.1 retrospective on every focus
basin, median NSE 0.83 against 0.53 — the comparison that motivated this project. Rerun
on the flood years, against v2.1 and the current v3.0:

| Window | LSTM | NWM v2.1 | NWM v3.0 |
|---|---|---|---|
| WY2017, median NSE | 0.772 | 0.628 | **0.848** |
| WY2017, high-flow bias | −20% | −2% | **−5%** |
| WY2023 (Oct–Jan), median NSE | **0.443** | — | 0.162 |

A protocol note: retrospectives are analysis-forced, open-loop simulations, compared
here against the LSTM's same-day hindcast. This is a simulation-to-simulation
comparison, not operational forecast skill, and the operational NWM additionally
assimilates gauges.

On WY2017 the modern NWM beats the LSTM on median skill, winning three of five basins,
with far smaller high-flow bias and peak error; a large share of the original margin was
the NWM version rather than the physics. On the partial WY2023 window (the v3.0
retrospective ends 2023-02-01, covering the December–January storm sequence and missing
the March storms) the LSTM wins on median skill, and both systems underestimate high
flows by 53–55%.


<figure>
  <img src="{{ '/assets/notes/cv_lstm_vs_nwm_flood.png' | relative_url }}" alt="Grouped bar chart of NSE per focus basin comparing the LSTM with NWM retrospective versions across the two flood windows." />
  <figcaption>Per-basin NSE, LSTM vs NWM retrospectives. Left: WY2017 (v2.1 hatched, v3.0 solid). Right: 2022-10 to 2023-01 (v3.0). Bars clipped at &minus;0.55.</figcaption>
</figure>

Two structural results are stable in every window tested. The LSTM wins Bear Creek
decisively in both flood years (0.92 and 0.77, against at best 0.07), a high-elevation,
high-storage snowmelt basin where the NWM's snow physics reliably fails. The process
model wins rain-driven flood peaks (Mill Creek: 0.90 against 0.74 in WY2023, with the
same signature in 1997), where explicit routing preserves what regression toward the
mean smooths away.

"ML beats the operational model" is therefore a claim indexed by model version, test
years, and hydrologic regime. The result that survives the indexing is complementarity:
each model dominates where the other's structure fails.

---

## The winter everyone is watching

As of August 2026, NOAA's [Climate Prediction Center](https://www.cpc.ncep.noaa.gov/products/analysis_monitoring/enso_advisory/ensodisc.shtml) reports El Niño conditions in place,
with better than 90% odds of a very strong event this winter and roughly 60% odds of a
peak at "super" magnitude. Press coverage has spent the summer asking whether 2026–27
could produce an ARkStorm: the hypothetical month-long train of atmospheric rivers that
the USGS built as a planning scenario in 2010, and that [Huang and Swain's 2022 update](https://doi.org/10.1126/sciadv.abq0995)
found roughly twice as likely in the current climate as in the preindustrial one. [Work
published this year](https://doi.org/10.15447/sfews.2025v23iss3art3) by CW3E, the atmospheric-rivers center at Scripps, reaches a
consistent conclusion by a different route: precipitation events of the January 1997
class, the same flood held out in Finding 2, are projected to become about twice as
likely by late century. Against that backdrop, the five findings translate into
statements about a specific winter.

Two constraints frame the translation. El Niño shifts the odds without determining the
outcome; the wettest year in this record, WY2023, arrived during La Niña. What a strong
El Niño does change with some reliability is storm character, favoring a southward-
shifted subtropical jet and warmer atmospheric rivers with high snow levels: more rain
falling on basins that usually take snow.

The peak problem gets worse, not better, and the rate is now measured. Bias is near
zero below the 80th storm percentile, −52% above the 95th; across 281 events the median
peak miss deepens from −13% to −72% as events approach the largest flow in the training
record, and the capacity experiment indicates that larger networks regress harder. An
ARkStorm-class sequence sits beyond the training maximum entirely, in the region where
the measured curve runs out of data while still steepening.

Warm storms move basins across the regime boundary from Finding 3. High snow levels
turn snowmelt catchments into temporary rain catchments, the direction in which the
Mill Creek inversion and the NWM's peak wins both point. In this scenario the
complementarity result reads as operational advice: run both model families, and weight
the process model's peak estimates.

The calibration failure lands exactly where such a winter would be lived. The
distributional head's intervals are overconfident specifically at high flows, where
observations escape above the interval seven times more often than below. Until
recalibration is done flow-conditionally, the intervals have no place in
atmospheric-river decision-making.

What survives is the 2-to-7-day window, and it is not a consolation prize. That window
is the decision horizon for [forecast-informed reservoir operations](https://cw3e.ucsd.edu/firo/) (FIRO), the
pre-storm release strategy CW3E has spent a decade validating on California reservoirs,
and it is where this model class beats persistence everywhere and beats the NWM on
storage-dominated basins. Skill at those leads also inherits directly from the forcing:
improvements that [AR Reconnaissance](https://cw3e.ucsd.edu/arrecon_overview/) flights buy in landfall forecasts pass straight
through a weather-driven model.

One concrete experiment follows from all of this and has not been run. The ARkStorm 2.0
scenario exists as simulated meteorology. Feeding that forcing through this trained
model would measure, directly and in advance, how far a data-driven forecaster degrades
on an event beyond its training distribution.

---

## What this adds up to

| Use case | Verdict |
|---|---|
| 2–7 day volume forecast, gauged basin, regime seen in training | **Yes** — beats persistence (plain and damped) from day 2–4 and holds skill where both collapse |
| 1-day forecast | **No** on snowmelt/high-storage basins — the gauge is better, and free; on rain-driven basins the LSTM already wins at day 1 |
| Flood peak magnitude | **Not yet** — and the process model largely shares the failure |
| Ungauged basin in an unseen regime | **No** — skill inverts |
| Calibrated uncertainty | **Not yet** — but most fixable, and the sharpness gain (22–26% CRPS) is real |
| Replacing the process model | **No** — the v3.0 retrospective wins WY2017 on 3 of 5 basins; the models are complementary by regime |

The strongest claim this work supports is narrower than "ML beats the operational
model," and more useful: ML delivers measurable forecast value in gauged, in-regime
basins at 2-to-7-day leads, and the boundary of that value has been measured on five
independent axes.

---

## Reproducibility

Every number above comes from a single scoring protocol: simulations read from each
run's inference output, observations taken from the source gauge records (never from a
model run's own copy), the framework's metric implementations, checkpoints chosen on
validation, and a stated 22-basin cohort. Deterministic inference reproduced bit-for-bit
across repeated runs. The distributional model's sample-median metrics carry a bootstrap
uncertainty below 0.001 NSE, so reported differences are not ensemble-sampling noise.
Each configuration is a single training run; seed-to-seed variance is the uncontrolled
axis.

The protocol has this shape because closure tests kept catching real problems: a
test-period choice that flattered skill by 0.11 NSE, an evaluation code path that
silently dropped over a quarter of the scoreable basins from its medians, and an
upstream bug that writes corrupted observations into the distributional model's output
files. That last one was caught by an internal-consistency check (two reported metrics
could not both be true of the same simulation) and traced to the stored observations
rather than the model. The record extension was validated by closure against the
overlapping original record, which caught a per-basin catchment-area discrepancy and
five gauges whose records genuinely disagree; those were excluded rather than rescaled.

Known limitations, failure modes, and the traps encountered along the way are documented
in [`METHODS.md`](https://github.com/holdenlesliebole/central-valley-flood-lstm/blob/main/docs/METHODS.md).
