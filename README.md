# AI Incident Atlas

An interactive visualization that models AI incidents from the [AI Incident Database (AIID)](https://incidentdatabase.ai) as **escalation pathways**. warning signal → failure mode → deployment context → harm. and surfaces where intervention was retrospectively possible but missed.

DV-377 (Data Visualization) final project.

## What's here

```
data/
  raw/                     # AIID snapshot (MongoDB dump, CSV exports)
  sample/                  # 200 stratified incidents across 5 sectors
  extracted/               # LLM-extracted pathways (200 records) + validation
scripts/
  sample.py                # Stratified sampler with keyword sector heuristics
  extract.py               # Claude-API pathway extraction
  validate.py              # Blind-coding + per-stage accuracy reporter
src/
  data-loader.js           # Cross-filter state + viz orchestration
  sankey.js                # Escalation Sankey (warning → failure → context → harm)
  heatmap.js               # Sector × failure-mode, row-normalized
  detail-panel.js          # Per-incident chain + missed-intervention annotation
index.html, styles.css     # Single-page web app
writeup.md                 # Methodology, findings, limitations
```

## Run locally

```bash
# 1. Get data + sample (already committed, re-run if needed)
python3 -m venv .venv && source .venv/bin/activate
pip install pandas anthropic python-dotenv
python3 scripts/sample.py

# 2. Extract pathways (requires ANTHROPIC_API_KEY in .env)
echo "ANTHROPIC_API_KEY=sk-ant-..." > .env
python3 scripts/extract.py --limit 20    # pilot
python3 scripts/extract.py --resume       # full 200

# 3. (Optional) Blind validation
python3 scripts/validate.py --pick        # generates template
# fill in data/extracted/handcoded.json without looking at pathways.json
python3 scripts/validate.py --report      # per-stage accuracy

# 4. Serve the viz
python3 -m http.server 8765
# open http://localhost:8765
```

## Pathway schema

Each incident → JSON:

```json
{
  "warning_signal": "documented prior complaint or null",
  "failure_mode": "data_bias | model_error | spec_gap | oversight_failure | misuse",
  "deployment_context": {
    "sector": "transportation | media_content | public_safety | healthcare | finance | ...",
    "situational_factor": "vulnerable_population | high_stakes_decision | public_facing | safety_critical | automated_at_scale | low_oversight"
  },
  "harm": "physical | economic | discriminatory | psychological | reputational | informational",
  "missed_intervention_stage": "warning_signal | failure_mode | deployment_context | null",
  "rationale": "one-sentence justification"
}
```

`missed_intervention_stage` is **deliberately nullable**. populated only when the source text documents a specific prior warning or skipped check. The proportion of nulls is itself a finding, not a gap.

## Honest limitations

- **Hindsight bias.** "Missed intervention" is a retrospective judgment, not a real-time prediction. The UI labels these annotations explicitly.
- **Blind self-validation ≠ inter-rater.** The same author wrote the schema and hand-codes the validation sample. We mitigate the rubber-stamp risk by hand-coding *before* looking at LLM output, but a true inter-rater study would require a second coder.
- **AIID reporting bias.** Skews toward English-language, US/EU, consumer-facing incidents.
- **Sector heuristic.** Initial sampling uses keyword matching on titles + short descriptions. The LLM extraction re-confirms sector independently per incident; mismatches between heuristic and LLM are visible in the sample.
