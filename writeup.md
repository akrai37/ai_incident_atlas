# AI Incident Atlas. Methodology and Findings

DV-377 Final Project · Ankush Rai

## Research question

> How do AI incidents escalate from early warning signals into real-world harm, and which breakdown points recur across industries?

Most existing AIID-based visualizations re-skin the taxonomy: "here are 200 bias cases, here are 50 self-driving cases." This project treats each incident as a **multi-stage pathway** rather than a flat category, and looks for recurring escalation patterns across five sectors.

## Pathway schema

Each incident is modeled as a four-stage chain:

> **Warning signal → Failure mode → Deployment context → Harm**

with an optional fifth annotation, `missed_intervention_stage`, which is **deliberately nullable**. populated only when the source report documents a specific prior complaint, ignored test result, or skipped check. The proportion of nulls is itself a finding (see below).

Vocabularies were piloted on 20 incidents, then frozen. `situational_factor` and `failure_mode` use closed vocabularies (5–6 values each) to keep the Sankey readable.

## Data

- **Source.** AIID weekly snapshot dated 2026-05-25 (1,491 incidents, 7,129 supporting reports). The dump contained full report narrative text in `reports.csv`, so no scraping was needed.
- **Sample.** Stratified sample of **480 incidents across 5 sectors** (target 100/sector; healthcare capped at 83 and transportation at 97 due to AIID coverage). Sectors: transportation, media/content, public safety, healthcare, finance. The original plan included a hiring/HR sector; pilot inspection showed only 24 incidents matched keyword heuristics, far below the per-sector quota, so we dropped it in favor of an honest five-sector lineup. Sample size was expanded from an initial 200 to 480 after the pilot, to give heatmap-filtered Sankey views enough incidents per (sector × failure-mode) cell to be meaningful.
- **Sector assignment for sampling** used keyword heuristics on titles + short descriptions, with a priority order (most specific sector first). The LLM extraction pass later re-confirms `deployment_context.sector` independently; mismatches surface as visible noise in the Sankey, not silent corruption.

## Extraction

Each sampled incident was passed through Claude Sonnet 4.6 with a single-shot prompt that emits one JSON object matching the schema above. The full prompt is in `scripts/extract.py`. Salient prompt design decisions:

- **`warning_signal` and `missed_intervention_stage` instructed to be null when not documented.** This was the single most important framing choice; without it, the model will hallucinate a hindsight intervention point for every incident, defeating the purpose of the field.
- **Closed vocabularies enumerated inline** for `failure_mode`, `situational_factor`, and `harm` to prevent vocabulary drift.
- **One-sentence rationale field** kept the model honest about its reasoning and is shown in the UI detail panel.

200/200 calls succeeded with no schema-violation retries.

## Blind self-validation

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

## Findings (from the 200-incident sample)

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

## File map

See `README.md`.
