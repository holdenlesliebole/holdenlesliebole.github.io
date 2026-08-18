---
title: "When can you trust an ML streamflow forecast? A California Sierra case study"
date: 2026-08-18
tags: [hydrology, machine-learning, flood-forecasting, evaluation]
summary: "Google's open flood-forecasting LSTM trained on 28 California basins and evaluated the way a flood-operations agency would: held-out flood years, gauge persistence as the null, peak metrics, ungauged transfer, probabilistic calibration, and a version-controlled NWM benchmark. The model wins in a bounded region, and the boundary has been measured."
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

## Setup

The model is the framework's `mean_embedding_forecast_lstm` at hidden size 128. Inputs
are daily basin-mean precipitation and temperature from each MultiMet weather product
(HRES, IMERG, CPC), passed through per-product embedding networks, plus static catchment
attributes from Caravan. Observed discharge is never an input. The output is daily
streamflow in mm/day at leads 0 through 7; the deterministic head trains on MSE and the
distributional head on the negative log-likelihood of a mixture of asymmetric
Laplacians. Streamflow targets were extended from 2014 to October 2024 with USGS NWIS
records so that two genuine flood water years could be held out.

The test set is water years 2017 and 2023: the Oroville-spillway atmospheric-river
season and the 2023 AR sequence. Training uses every remaining day in the record outside
the test windows and the 2009–2011 validation years. Checkpoints are selected on
validation skill, never taken from the last epoch. Of the 28 trained basins, 22 have
observations in the flood windows. Medians below are over that fixed cohort, except in
Finding 5, where the NWM comparison covers the five focus basins whose NWM reaches were
extracted.


<figure>
  <img src="{{ '/assets/notes/cv_study_map.png' | relative_url }}" alt="Map of California showing the 28 training basins as markers colored by snow fraction, with the five focus basins ringed and six excluded basins marked with crosses." />
  <figcaption>The 28 training basins. Marker color: fraction of precipitation falling as snow (Caravan attribute). Rings: the five focus basins. Crosses: the six basins with no observations in WY2017 or WY2023, excluded from cohort medians. Triangle: Oroville Dam.</figcaption>
</figure>

The choice of test period is itself the first result. An earlier version of this work
tested on 2012–2014 and reported median NSE 0.81. That window is California drought
onset. Retrained and retested at the same capacity on the same 22 basins, the model
scores 0.862 on the drought window and 0.754 on the flood years (0.836 and 0.679 at the
smaller capacity). The flood-year model trains on eleven more years of data, so the gap
is a lower bound on the window effect. The original number was not wrong; it was
measured on a benign period. A streamflow skill claim that omits the hydrologic
character of its test years is a claim about the years.

---

## Finding 1 — The baseline that matters is a gauge, not a mean

NSE scores a forecast against the mean of the observations, a weak null. Two stronger
nulls, scored on the identical test set and metric definitions and matched by forecast
lead: *persistence* (the gauge reading from k days ago) and *damped persistence* (the
last reading relaxed toward the day-of-year climatology at the training-fit lag-1
autocorrelation). The train-period mean scores −0.08 and raw climatology +0.20; neither
is competitive at short leads.

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
day 1). Flashy rain response is the one thing persistence cannot do.

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

The climatology null carries its own lesson. It scored −0.25 on the 2012–2014 drought
window and +0.198 on the flood years. A baseline's value is a property of the test
period, not of the baseline.

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
(January 1997, with the entire 1990s excluded from training) the LSTM and the NWM v2.1
retrospective both underestimated the flood peak by tens of percent, and on the
rain-driven basin the process model came far closer to the peak. Two caveats attach to
1997: it predates the forecast-era forcing products, so the LSTM ran on degraded inputs
there, and peak underestimation at this level is close to the state of the art for both
model families.

A capacity experiment sharpens the point. Raising hidden size from 16 to 128 improved
average skill (NSE 0.679 to 0.754) and degraded the peaks: FHV moved from −12% to −19%
and missed peaks from 0.33 to 0.45. Added capacity bought accuracy on the bulk of the
flow distribution and paid for it in the tail, consistent with regression toward the
mean on out-of-distribution extremes. One training run per capacity, so this is a
consistent gradient rather than a seed-controlled result.

---

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

The framework can emit a full predictive distribution, a countable mixture of asymmetric
Laplacians, in place of a point estimate. *CRPS* makes the comparison to the
deterministic head fair: for a point forecast CRPS reduces exactly to absolute error, so
both heads are scored by one proper rule and the ensemble wins only if its spread
carries information.

| Lead (days) | Distributional | Deterministic | Improvement |
|---|---|---|---|
| 0 (same-day) | 0.916 | 1.231 | **26%** |
| 3 | 1.081 | 1.452 | **26%** |
| 7 | 1.185 | 1.550 | **24%** |

(CRPS in mm/day.)

The spread does carry information: a 22–26% CRPS reduction at every lead. The
distributional head also edges the deterministic one on point metrics (NSE 0.784 against
0.754, fewer missed peaks, smaller peak error, some loss in KGE). An earlier draft
called the two heads tied; that reading traced to a scoring-pipeline bug rather than to
the models.


<figure>
  <img src="{{ '/assets/notes/cv_crps_calibration.png' | relative_url }}" alt="Two panels: median CRPS versus lead for both model heads, and empirical coverage of the nominal 90 percent interval versus lead, which stays between 0.66 and 0.74." />
  <figcaption>Left: median CRPS (mm/day) vs lead for the distributional and deterministic heads. Right: empirical coverage of the nominal 90% predictive interval vs lead; the shaded band is the pre-specified 85&ndash;95% acceptance range.</figcaption>
</figure>

Calibration is where it fails. A nominal 90% predictive interval covers 66–74% of
observations, so the sharper forecast is also overconfident, which for an operator is
the dangerous direction. The rank histogram locates the failure. In aggregate it is
U-shaped and nearly symmetric, with 22% of observations above the ensemble's 90th
percentile rank and 20% below the 10th, the signature of plain under-dispersion.
Conditioned on flow, the two tails separate: at high flows the observation escapes above
the interval (23% above, 3% below), and at low flows it escapes below (23% below, 9%
above). The predictive distribution is displaced toward the middle of the flow
distribution at both ends, regression toward the mean in distributional form. A separate
heavy-tail pathology (rare extreme samples that inflate the ensemble standard deviation
to about 3× the RMSE) accounts for the spread/skill ratio and the NaN training losses,
and does not account for the coverage failure.


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

The result this project once led with: on the 2012–2014 window the LSTM beat the NWM
v2.1 retrospective on every focus basin, median NSE 0.83 against 0.53. Rerun on the
flood years, against v2.1 and the current v3.0:

| Window | LSTM | NWM v2.1 | NWM v3.0 |
|---|---|---|---|
| WY2017, median NSE | 0.772 | 0.628 | **0.848** |
| WY2017, high-flow bias | −20% | −2% | **−5%** |
| WY2023 (Oct–Jan), median NSE | **0.443** | — | 0.162 |

A protocol note: the NWM retrospectives are analysis-forced, open-loop simulations,
compared here against the LSTM's same-day hindcast. This is a simulation-to-simulation
comparison, not operational forecast skill, and the operational NWM additionally
assimilates gauges.

On WY2017 the modern NWM beats the LSTM on median skill, winning three of five basins,
with far smaller high-flow bias and peak error; a large share of the original margin was
the NWM version rather than the physics. On the partial WY2023 window (the v3.0
retrospective ends 2023-02-01, covering the December–January AR sequence and missing the
March storms) the LSTM wins on median skill, and both systems underestimate high flows
by 53–55%.


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
files. The bug surfaced because two metrics that cannot both be true appeared together,
and the observations rather than the model turned out to be the thing to check. The
record extension was validated by closure against the overlapping original record, which
caught a per-basin catchment-area discrepancy and five gauges whose records genuinely
disagree; those were excluded rather than rescaled.

Known limitations, failure modes, and the traps encountered along the way are documented
in [`METHODS.md`](https://github.com/holdenlesliebole/central-valley-flood-lstm/blob/main/docs/METHODS.md).
