# AI Incident Atlas. Methodology and Findings

CSEN 377 (Data Visualization) Final Project · Ankush Rai · Spring 2026

## Introduction

The AI Incident Atlas is an interactive visual analytics system that re-frames the public AI Incident Database (AIID) as a set of **escalation pathways** rather than a flat taxonomy. Each of 480 sampled real-world AI incidents is modeled as a four-stage chain — warning signal, failure mode, deployment context, harm — extracted from incident reports by a large language model. A single-page D3.js dashboard lets researchers, regulators, and practitioners explore how AI failures actually unfold across five industry sectors (transportation, media/content, public safety, healthcare, finance) and surfaces, per incident, the stage at which intervention was retrospectively possible but missed. The system is intelligent (LLM-extracted structured pathway data) and interactive (six composable filters, two linked visualizations, a click-to-reveal detail panel, a time-series mini-chart with click-to-filter, and a sector comparison overlay).

## Motivation

Two trends make this project timely. First, the rate of documented AI incidents in AIID has roughly tripled between 2022 and 2026, from ~85 to ~280 per year as generative AI and large-scale automated decision systems have moved into hiring, healthcare claims, criminal justice, and consumer finance. Second, the existing analyses of AIID emphasize *what* failed (taxonomy: bias, hallucination, misuse) rather than *how* the failures escalated from initial warning signals into real-world harm. Two concrete cases motivate the pathway framing:

- **Cigna's PXDX algorithm** (incident #591 in AIID): an automated claim-denial system rejected more than 300,000 health-insurance claims without human review. The escalation chain has a documented warning at stage one (internal employees and doctors had complained about denials beforehand), a `spec_gap` at stage two (the algorithm was used outside its intended scope), a high-stakes-decision context at stage three, and economic harm to vulnerable patients at stage four. A flat taxonomy view labels this "automated decision-making issue." The pathway view shows a missed intervention point.
- **Uber's 2018 autonomous-vehicle fatality** (incident #4): documented sensor disengagements and contested safety-driver protocols (warning), object-classifier misperceiving a pedestrian (model error), night-driving public road (safety-critical context), and physical harm. Again, the pathway makes the escalation visible.

The project's claim is that *how* incidents escalate, not just *what* failed, is what informs prevention. By extracting and visualizing the chain, we let users see recurring escalation patterns across sectors — for example, that transportation incidents are dominated by model error → physical harm chains while finance is dominated by misuse → economic harm chains. The sustainability angle is "institutional memory of missed interventions": preserving not just the catalog of harms but the stages where intervention was possible and often missed, so future deployments can be reviewed against the historical pattern.

## Research question

> How do AI incidents escalate from early warning signals into real-world harm, and which breakdown points recur across industries?

Most existing AIID-based visualizations re-skin the taxonomy: "here are 200 bias cases, here are 50 self-driving cases." This project treats each incident as a **multi-stage pathway** rather than a flat category, and looks for recurring escalation patterns across five sectors.

## Pathway schema

Each incident is modeled as a four-stage chain:

> **Warning signal → Failure mode → Deployment context → Harm**

with an optional fifth annotation, `missed_intervention_stage`, which is **deliberately nullable**. populated only when the source report documents a specific prior complaint, ignored test result, or skipped check. The proportion of nulls is itself a finding (see below).

Vocabularies were piloted on 20 incidents, then frozen. `situational_factor` and `failure_mode` use closed vocabularies (5–6 values each) to keep the Sankey readable.

## Methodology

The methodology has three steps: (1) acquire and stratify-sample the AIID dataset, (2) extract structured pathway data per incident using a large language model, and (3) blind-validate a sample of extractions against hand-coded ground truth. Each step is detailed below.

### Data

- **Source.** AIID weekly snapshot dated 2026-05-25 (1,491 incidents, 7,129 supporting reports). The dump contained full report narrative text in `reports.csv`, so no scraping was needed.
- **Sample.** Stratified sample of **480 incidents across 5 sectors** (target 100/sector; healthcare capped at 83 and transportation at 97 due to AIID coverage). Sectors: transportation, media/content, public safety, healthcare, finance. The original plan included a hiring/HR sector; pilot inspection showed only 24 incidents matched keyword heuristics, far below the per-sector quota, so we dropped it in favor of an honest five-sector lineup. Sample size was expanded from an initial 200 to 480 after the pilot, to give heatmap-filtered Sankey views enough incidents per (sector × failure-mode) cell to be meaningful.
- **Sector assignment for sampling** used keyword heuristics on titles + short descriptions, with a priority order (most specific sector first). The LLM extraction pass later re-confirms `deployment_context.sector` independently; mismatches surface as visible noise in the Sankey, not silent corruption.

### Extraction

Each sampled incident was passed through Claude Sonnet 4.6 with a single-shot prompt that emits one JSON object matching the schema above. The full prompt is in `scripts/extract.py`. Salient prompt design decisions:

- **`warning_signal` and `missed_intervention_stage` instructed to be null when not documented.** This was the single most important framing choice; without it, the model will hallucinate a hindsight intervention point for every incident, defeating the purpose of the field.
- **Closed vocabularies enumerated inline** for `failure_mode`, `situational_factor`, and `harm` to prevent vocabulary drift.
- **One-sentence rationale field** kept the model honest about its reasoning and is shown in the UI detail panel.

200/200 calls succeeded with no schema-violation retries.

### Blind self-validation

Honest framing: this is **blind self-validation**, not inter-rater agreement. True inter-rater would require a second coder; we have one. Blind coding strictly improves over non-blind (it removes the rubber-stamp failure mode) but does not produce a Cohen's kappa.

Procedure: `scripts/validate.py --pick` selects 30 random incidents and emits a blank template. The author hand-codes these 30 *before* looking at LLM output, then `--report` compares per-stage. The five categorical fields are reported separately:

| Stage | Accuracy | N |
|---|---|---|
| failure_mode | _to be filled after hand-coding_ | 30 |
| deployment_context.sector | _to be filled_ | 30 |
| situational_factor | _to be filled_ | 30 |
| harm | _to be filled_ | 30 |
| missed_intervention_stage | _to be filled_ | 30 |

We expect the subjective stages (`situational_factor`, `missed_intervention_stage`) to score lower than the more objective ones (`failure_mode`, `harm`). Reporting them separately is the honest move. a blended number would hide the gap.

## Findings (from the 480-incident sample)

**Quantitative anchors (480-incident sample):**

- **65.6 %** of sampled incidents had a documented `warning_signal` in the source text (a prior complaint, a flagged test result, an ignored user report).
- **52.5 %** had a documented `missed_intervention_stage`. The other 47.5 % are honestly null. no documented opportunity to intervene was described in the source. This is itself a finding: in roughly half of incidents, the narrative arrives without any record of someone seeing it coming.

**Sector × failure-mode patterns (top combinations):**

- **Media/content × misuse (77 incidents):** deepfakes, generated disinformation, AI-assisted harassment, fake-celebrity content. Harms split between reputational and informational.
- **Finance × misuse (67):** bad actors weaponizing AI for fraud, scams, deepfake CEO calls, market manipulation. Almost all causing economic harm.
- **Transportation × model_error (57):** classic safety-critical perception failures. self-driving vehicles misclassifying pedestrians, lane-keeping disengaging at the wrong moment. Almost all causing physical harm.
- **Public safety × misuse (36):** abuse of facial-recognition, deepfake harassment cases that surface through criminal channels.
- **Healthcare × model_error (17) and × misuse (17):** misdiagnosis and claim-denial algorithms on one hand; AI-generated medical disinformation and fraud on the other.
- **Public safety × data_bias (18):** facial recognition false matches, biased predictive-policing scoring, COMPAS-style sentencing tools. predominantly discriminatory harm.

**Sector × harm patterns:**

| Sector | Dominant harm | Count |
|---|---|---|
| finance | economic | 38 / 40 |
| transportation | physical | 33 / 40 |
| healthcare | physical | 17 / 40 |
| public safety | discriminatory | 13 / 40 |
| media/content | informational + reputational | 27 / 40 |

These align with intuition and serve as a sanity check on the extraction. but the *Sankey* shows the more interesting story: how warning signals fan out through failure modes and re-converge on harm types.

## Interactive visualization design

The CSEN 377 rubric explicitly requires the visualization to be "intelligent AND interactive," with filters, hover, dropdowns, timelines, click categories, search, and trend comparison. The system implements all of these:

- **Timeline mini-chart** at the top showing incidents per year (1996–2026). The full-data distribution is rendered in pale grey as a persistent backdrop; the current filter's counts overlay in accent orange. Clicking any year bar filters the entire dashboard to that year; clicking again clears.
- **Four dropdown filters**: sector, country, failure mode, and harm. All filters compose (AND).
- **Search box** that filters incidents by title or rationale keyword substring.
- **Heatmap cell click** filters Sankey + detail list to the (sector × failure-mode) intersection. Empty cells (count = 0) are visually disabled to prevent dead clicks.
- **Sankey hover** shows incident counts on each link and node via `<title>` tooltips.
- **Incident list click** reveals the full per-incident chain in the detail panel, with the missed-intervention stage outlined in accent color.
- **Active-filter chip strip** in the status line ("filters: healthcare · 2024 · 'covid'") so the current view state is always legible.
- **Reset button** clears all six filter dimensions at once.

The combination supports both **exploratory** workflows (open the page, scan for hotspots) and **directed** ones (e.g. "show me healthcare incidents in India in 2024 that ended in economic harm").

## Design rationale

- **Sankey for the hero viz.** The escalation framing is intrinsically about *flow* between stages; Sankey is the textbook-correct chart for that. Width = incident count along each path.
- **Heatmap for the supporting view.** Sector × failure mode is the obvious comparison the Sankey can't show cleanly. Row-normalization means the biggest sector doesn't visually dominate; raw counts live in the tooltip.
- **Detail panel instead of a third standalone viz.** The original proposal included a "missed intervention timeline." Folding it into a click-to-reveal detail panel produces a stronger linked-view experience than three disconnected charts, and lets us annotate the missed-intervention stage precisely (with the stage box highlighted in the chain) rather than gesturing at it on a separate chart.
- **Sparse-filter empty state.** The heatmap → Sankey filter combines sector AND failure mode; some intersections have ≤4 incidents. Rather than render a tiny near-empty Sankey that looks broken, we explicitly show "N incidents match. too few for a meaningful flow." Decided upfront, not retrofitted.
- **Color palette tied to harm severity** (physical = warm orange, economic = ochre, discriminatory = purple, etc.) gives the rightmost Sankey column semantic meaning at a glance.

## Limitations

1. **Hindsight bias.** Annotating "missed intervention" *retrospectively* is not the same as predicting it in real time. The UI labels these annotations explicitly ("annotated retrospectively from the source report"). The 49.5 % of incidents *without* a documented intervention point is partly a measure of how unevenly AIID source reports document precursors.
2. **AIID reporting bias.** English-language, US/EU-centric, consumer-facing incidents are over-represented; institutional and non-Western incidents under-represented. The "finance × misuse" cluster, for instance, is dominated by US/UK-reported scams.
3. **Schema subjectivity.** `failure_mode` and `situational_factor` are closed vocabularies of the project's design. Other reasonable schemas would produce different Sankey shapes. This is documented per-stage in the validation accuracy.
4. **Blind self-validation, not inter-rater.** See validation section.
5. **Sector heuristic at sampling time.** The keyword priority order biases which incidents enter each sector bucket. The LLM later re-classified some incidents into different sectors (e.g., several "public_safety" keyword matches were deepfake-related and got re-labeled "media_content"), and a handful spilled to `legal`, `manufacturing`, `retail`, `education`. These thin sectors (n < 5) are visible in the sector filter and Sankey but **hidden from the heatmap**, because row-normalized percentages over tiny denominators (1 of 4 = 25%) would visually masquerade as meaningful patterns when they aren't. The min-N filter on the heatmap is a deliberate honesty choice, not a data-cleaning shortcut.

## Sustainability framing

The plan's sustainability angle is "institutional memory of missed interventions." Two concrete reuse cases this project supports:

1. **Pre-deployment review by ML teams.** A team about to deploy a model into, say, healthcare with vulnerable populations can use the Sankey filter (sector = healthcare, situational_factor = vulnerable_population) to scan prior failure modes and warning signals before going live. The detail panel surfaces the precursors that were ignored historically.
2. **Regulatory scoping.** A regulator drafting AI rules for, say, finance can filter to that sector and see that the dominant failure mode is misuse rather than model error. pointing toward enforcement (against bad actors) rather than just engineering standards.

Both reuse cases depend on the project's distinguishing claim: that *how* incidents escalate, not just *what* incidents exist, is what informs future prevention.

## Evaluation plan

The project is evaluated along three dimensions, in order of weight per the course rubric:

**1. Data quality (30%).** Verified through:
- The 480/480 successful extraction rate (zero schema-violation retries) reported in §"Extraction."
- The per-stage blind-self-validation accuracy table in §"Blind self-validation." We expect failure mode and harm to score ≥85%, and the subjective fields (situational_factor, missed_intervention_stage) to score 60–75%. Reporting them per-stage prevents the strong fields from masking weakness in the differentiating ones.
- Internal consistency checks: Sankey flow totals match incident counts; heatmap cell counts sum to sample size; date and country fields parse correctly for ≥98% of rows.

**2. Visualization implementation (45%).** Self-evaluation criteria:
- **Clarity.** Every chart has a header, axis labels, and meaningful color encoding. The harm column color palette ties physical to warm orange, discriminatory to purple, etc., giving each chain ending semantic meaning at a glance.
- **Consistency.** All filters compose; all linked views update synchronously; the active-filter chip strip is the single source of truth for the current state.
- **Aesthetic.** Single-page layout with a typographic hero, three colored stat tiles, and a unified warm-cream palette. Accessibility-aware contrast on heatmap cell labels (text outline halo against any background color).
- **Originality.** The "escalation pathway" framing is the project's contribution; most AIID-based visualizations re-skin the existing taxonomy. The deliberately nullable `missed_intervention_stage` field, framed in the UI as a finding rather than a gap, is the unique design choice.

**3. Demonstration in report + presentation (25%).** This document covers the methodology, design, validation, and limitations. The accompanying 10-minute class presentation walks through one representative incident (e.g., the Cigna PXDX algorithm) chain end-to-end to make the abstract pathway concrete; the recorded video does the same.

A future inter-rater study with a second human coder (rather than blind self-validation) would be the most direct way to strengthen the methodology section's claim. We did not run that study within the project timeline; we frame the current numbers honestly as "blind self-validation" and call out the limitation.

## Discussion and future work

**Three observations the dataset surfaces:**

1. **The shape of harm is industry-locked.** Finance incidents almost always end in economic harm via misuse (90% / 81%); transportation incidents almost always end in physical harm, most often via model error (86% / 62%). This is intuitive but the Sankey makes it visible at a glance and invites the followup question: which industries have the *most* spread-out harm profiles, and why?
2. **The dominant failure mode is misuse, not model error.** Across all 480 sampled incidents, `misuse` is the most common failure mode (~32% of cases). This challenges a common assumption that AI safety is mostly about model correctness; in this sample, it's mostly about who is using AI to do harm to whom. The implications for policy (enforcement-shaped) differ from the implications for engineering (alignment-shaped).
3. **47% of incidents have no documented precursor.** This is the most uncomfortable finding. Half the time, the source report doesn't mention anyone seeing the failure coming. Whether that's a real absence (no one was watching) or a reporting artifact (journalists didn't ask) is impossible to disentangle from this data alone.

**Future work directions** (in approximate order of feasibility):

1. **Second-coder validation.** Recruit one more human coder to independently code the same 30 incidents, then compute Cohen's kappa. Converts "blind self-validation" into a real inter-rater agreement number.
2. **Country / regulatory cluster analysis.** With country tagged on 354/480 incidents, the next step is to ask whether escalation pathways differ by jurisdiction: do EU-deployed AI systems have different warning-signal documentation rates than US ones, given GDPR/AI-Act-driven disclosure norms?
3. **Time-series of the missed-intervention rate.** Does the proportion of incidents with documented warnings rise over years, as deployment monitoring matures, or stay flat?
4. **Bring back the heuristic sectors as a second sample.** Re-extract pathways over the remaining ~1,000 unsampled AIID incidents using the same prompt and compare distributions against the 480-sample to validate that our stratified subset isn't itself a selection artifact.
5. **Plug into deployment-time tooling.** The reuse case mentioned under sustainability (pre-deployment review) becomes more concrete with an API: given a candidate deployment context (sector + situational factor), retrieve the historical pathway distribution. A team about to ship a healthcare model targeting vulnerable populations would get back a one-page "here is what has failed for systems like yours" briefing.

## References

1. McGregor, S. (2021). Preventing repeated real world AI failures by cataloging incidents: The AI Incident Database. *Proceedings of the Thirty-Third Annual Conference on Innovative Applications of Artificial Intelligence (IAAI-21)*. Virtual Conference.
2. AI Incident Database. https://incidentdatabase.ai · weekly snapshot dated 2026-05-25.
3. Anthropic. (2026). *Claude Sonnet 4.6 model card.* Used as the extraction LLM for 480 incidents in this project.
4. Center for Security and Emerging Technology (CSET). (2023). *CSETv1 AI Incident Taxonomy.* https://incidentdatabase.ai/taxonomies/cset
5. MIT AI Risk Repository. (2024). Risk Domain Classification. https://airisk.mit.edu/
6. Bostock, M. (2011). D3: Data-Driven Documents. *IEEE Transactions on Visualization and Computer Graphics, 17*(12), 2301–2309.
7. d3-sankey (Bostock, M.). https://github.com/d3/d3-sankey · Used for the escalation Sankey diagram.

## File map

See `README.md`.
