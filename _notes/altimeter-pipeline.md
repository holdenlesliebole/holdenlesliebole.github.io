---
title: "Processing Echologger AA400 altimeter and EA400 echosounder data for nearshore bed-level analysis"
date: 2026-03-15
tags: [methods, instrumentation, altimetry, sediment-transport]
summary: "An end-to-end pipeline for autonomous acoustic bed-level instruments (Echologger AA400 and EA400) deployed on the inner shelf, including a reverse-engineered binary file reader for EA400 echosounder data."
math: true
---

*Methods note. The pipeline this describes lives at <a href="https://github.com/holdenlesliebole/Altimeter_Pipeline">github.com/holdenlesliebole/Altimeter_Pipeline</a>. It complements the <a href="{{ '/notes/puv-pipeline/' | relative_url }}">PUV pipeline</a>; most altimeter and echosounder deployments in our group are co-located with PUVs, which yields paired wave-forcing and bed-level records.*

## What these instruments measure

Repeat topographic and bathymetric surveys give bed elevation at survey resolution, with weeks-to-months between revisits, and miss the event itself. Acoustic altimeters and echosounders deployed on the bed resolve burst-averaged bed level at minutes-to-hours cadence for as long as the batteries hold and the sensor stays out of the sand.

Two instruments from Echologger (EofE Ultrasonics) cover the use cases in our deployments:

- **AA400 altimeter.** 450 kHz, autonomous, 3&times; AA alkaline batteries, sampling at 2 Hz (configurable). Reports the distance from the sensor head to the bed (one number per ping, range a few metres) and on-board temperature, battery voltage, and amplitude as a fraction of full scale. Output format: Nortek RangeLogger `.log` files (ASCII CSV).
- **EA400 echosounder.** Same 450 kHz acoustic carrier, but in addition to the altitude pick it returns the full backscatter profile through the water column above the bed (depth-bin spacing 7.5 mm). Burst structure is configurable; typical for our deployments is 2 Hz within a 150 s burst, hourly burst cadence. Two output formats are in production: `.log` text files (older deployments at SouthSIOPier) and `.BIN` binary files (newer deployments at all sites).

## Acoustic ranging and bed-level conversion

The instrument pings, listens for the bed echo, and records the round-trip time \\(\tau\\). With assumed sound speed \\(c\\), the distance from transducer to bed is

$$
d = \frac{c\,\tau}{2}.
$$

Sound speed depends on temperature, salinity, and pressure; for inner-shelf deployments the temperature dependence dominates and is corrected from the on-board temperature record.

To recover bed-level *change* (the morphodynamic quantity), the pipeline differences altitude against a baseline:

$$
\Delta z_{\rm bed}(t) \;=\; -\bigl[\, d(t) - d(t_0) \,\bigr],
$$

with the convention **accretion positive, erosion negative**. The minus sign reflects that a smaller distance from sensor to bed corresponds to a bed that has built upward. By default, baseline is the first non-NaN altitude reading; a per-deployment override is available for cases where the deployment did not start from a quiescent state.

The echosounder produces the same altitude record plus a column of backscatter at fixed depth bins. Peak return tells you the bed; structure above it scales with sediment in suspension. Quantitative inversion to suspended-sediment concentration requires calibration against in-situ pumped or trapped samples; the pipeline outputs the relative backscatter signal and stops there.

## Pipeline architecture

Three universal levels, deployment-table driven from `metadata/deployments.csv`.

### L0: raw on the lab server

AA400 RangeLogger `.log` files and EA400 `.log` (older deployments) or `.BIN` (newer) files in `/Volumes/group/Altimeter_data/{Site}/`.

### L1: read and concatenate

- `read_rangelogger_log.m` parses AA400 `.log` files into a MATLAB timetable with `Altitude_mm`, `Temperature_C`, `Battery_mV`, `Amplitude_pctFS`.
- `read_echosounder_log.m` reads EA400 text-format files: `#TimeLocal` headers, `##DataStart` / `##DataEnd` blocks delimiting the per-ping backscatter columns.
- `read_echosounder_bin.m` reads EA400 binary files. The format was reverse-engineered from instrument files because no public documentation exists from the manufacturer. Layout: 128-byte file header (config + sound speed), then repeating records of two sub-records per ping. The `DATA` sub-record is a 64-byte header (`"DATA"` marker, version, ping number, sample count, Unix timestamp) followed by `N` `uint16` backscatter values; the `STAT` sub-record (64 bytes) carries the authoritative metadata for that ping (temperature in C, altitude in m, pitch and roll in degrees). Record sizes vary by configuration: 672 bytes for 272 depth bins (SouthSIOPier, SolanaBeach), 928 bytes for 400 depth bins (Torrey Pines).

Multiple files per deployment are concatenated and time-sorted. Echosounder files are timezone-shifted from instrument-local to UTC by a per-deployment offset declared in the deployment table.

### L2: quality control

- `qc_altitude.m`: two-pass moving-mean despike (default thresholds 200 mm and 100 mm with a 15-minute moving-mean window), neighbour-jump filter (default 10 mm), optional Hampel robust-outlier filter. Each removed sample receives a quality-flag bit (1 = invalid range, 2 = moving-mean despike, 3 = neighbour jump, 4 = Hampel) for downstream auditing.
- `qc_echosounder.m`: applies the altitude QC, then masks samples and their backscatter rows where pitch or roll exceeds \\(2^\circ\\).

### L3: bed-level conversion

`altitude_to_bedlevel.m` applies the sign-flip and baseline subtraction above, producing `BedLevel_mm`. A quicklook PNG is auto-generated alongside each L3 output for sanity-checking.

## Example outputs

A Torrey Pines AA400 deployment at three depths through the wet 2024&ndash;2025 winter:

<figure>
  <img src="{{ '/assets/notes/altimeter_torrey_pines_timeseries.jpg' | relative_url }}" alt="Bed-level timeseries from co-deployed AA400 altimeters at MOP586, Torrey Pines, at 5 m, 7 m, and 10 m depth, July 2024 through June 2025." />
  <figcaption>Bed-level change at MOP586, Torrey Pines, from co-deployed AA400 altimeters at 5 m, 7 m, and 10 m depth. Time axis: July 2024 to June 2025. Vertical axis: bed-level change in mm relative to the baseline ping (accretion positive).</figcaption>
</figure>

Storm-scale zoom on the same dataset:

<figure>
  <img src="{{ '/assets/notes/altimeter_storm_dec2023.jpg' | relative_url }}" alt="Bed-level change at Torrey Pines during the December 2023 storm event, plotted alongside wave forcing from a co-located PUV." />
  <figcaption>Bed-level change at Torrey Pines during a December 2023 storm event, with wave forcing from a co-located PUV on the upper panels. Top: \(H_s\) at the PUV. Middle: cross-shore wave energy flux \(F\). Bottom: bed-level change at three depths.</figcaption>
</figure>

## Running the pipeline on your own deployment

Required: the instrument(s), the raw files (AA400 `.log` and / or EA400 `.log` / `.BIN`), MATLAB, and a deployment table.

1. Clone the repo and `cd CODES`.
2. Edit `metadata/deployments.csv` with one row per deployment: site, MOP transect (or your local equivalent), depth, file paths (pipe-separated, relative to the server root), instrument timezone offset. Set `Active = 1` for the rows to process.
3. From MATLAB, `run_altimeter_pipeline`. Per active deployment the pipeline writes `processed/<Site>/<DeploymentID>_L1.mat` (raw timetable + echosounder struct), `_L2.mat` (with QC flags), `_L3.mat` (with `BedLevel_mm`), and `_ql.png` (quicklook).
4. (Optional) `build_deployment_table` scans the server and seeds a fresh CSV when new files appear; manual pairing of altimeter files with their corresponding echosounder files is still required because file timestamps and instrument labels do not always agree across the two file types.

Default QC parameters (15-minute moving-mean window, 200 mm and 100 mm despike thresholds, 10 mm jump threshold, \\(2^\circ\\) tilt threshold) suit a low-energy inner-shelf deployment. Loosen the thresholds for energetic sites; tighten for very fine-resolution work where small bed-level steps matter.

## Pairing with PUVs

Most deployments in our group co-locate the altimeter and a Nortek Vector PUV at the same cross-shore station, on the same battery service interval. After running both pipelines:

- PUV: wave height, period, direction, energy flux, near-bed velocity moments, bed stress.
- Altimeter: bed-level change at burst cadence.
- Echosounder: bed-level change plus backscatter as a sediment-suspension proxy in the water column above the bed.

Time-aligned forcing-and-response analysis is the L5 layer in the PUV-pipeline architecture; it is not yet implemented as a shared module but is straightforward in deployment-specific analysis code.

## Limitations

- Timezone offsets are declared per deployment as a single number. Records spanning a daylight-saving transition pick up a one-hour seam at the boundary; a future revision should handle TZ as a function of date.
- Some early deployments (Torrey Pines January&ndash;August 2024, Solana Beach January 2024) lack depth metadata in the filenames and require cross-referencing against `EchologgerCheckout*.xlsx` on the lab server.
- SouthSIOPier deployments after May 2025 currently have `EchosounderFiles` blank in the CSV; echosounder files exist on the server but require manual date-range matching to the corresponding altimeter records.
- Output format is `.mat` only. NetCDF export is a small wrapper away (`write_altimeter_netcdf.m` is a stub) but is not part of the standard run.
- EA400 backscatter is recorded but not inverted to mass-concentration units; quantitative suspension inversion is calibration-dependent and out of scope.

## Repository

<a href="https://github.com/holdenlesliebole/Altimeter_Pipeline">github.com/holdenlesliebole/Altimeter_Pipeline</a>

The EA400 BIN reader is the part most likely to be useful to outside groups; if you have similar Echologger instruments, the parser should save the reverse-engineering work it cost me. Get in touch if anything is unclear.
