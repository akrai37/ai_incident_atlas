# Agents handoff · AI Incident Atlas

This file is the single source of truth for the project state. If you are an
AI assistant (or a new collaborator) picking this up cold, read this first.

## Project in one paragraph

CSEN 377 (Data Visualization) final project at Santa Clara University, owned
by Ankush Rai (`@akrai37`). The project takes the AI Incident Database (AIID)
public dump and turns each incident into a structured four-stage escalation
chain — **warning signal → failure mode → deployment context → harm** — plus
an optional fifth annotation, `missed_intervention_stage`, that is populated
*only* when the source report documents a specific prior warning or skipped
check. The structured pathway data did not exist before the project; it is
extracted from incident text by Claude Sonnet 4.6 and visualized in an
interactive single-page web app (D3.js + d3-sankey, no backend).

The differentiator versus other AIID dashboards is the *pathway* framing
(how incidents escalate) rather than taxonomy (what category they are in).

## Owner context (do not re-litigate)

- **Owner:** Ankush Rai · `ankushrai37@gmail.com` · `@akrai37`
- **Course:** CSEN 377 · Dr. Sharon Hsiao · 2026 spring
- **Team:** there is at least one teammate (Answeeta) who flagged that the
  professor's rubric requires "intelligent AND interactive" visualizations
  with filters, hover, zoom, dropdowns, timelines, click categories, year
  filter, search, country filter, compare trends. The 2026-05-28 round of
  work above ("Add interactive controls + timeline + country/year filters")
  closes that gap.
- **Hard rule from owner's global CLAUDE.md:** NEVER add
  `Co-Authored-By: Claude` or any AI-authorship trailer to commits or PR
  bodies. The owner lost reputation on a public project (Argus) when
  GitHub promoted the `@claude` user into the Contributors sidebar from a
  stray trailer. Commits are plain authored by the owner only.

## Where things live

### On disk
```
ai_incident_atlas/
├── .env                              # ANTHROPIC_API_KEY (gitignored)
├── .gitignore                        # excludes .env, .venv, raw dump, .claude, *.pptx, handcoded.json
├── README.md                         # Public-facing README
├── writeup.md                        # Methodology, findings, limitations, eval plan, future work, refs
├── AGENTS.md                         # This file
├── index.html                        # Single-page app shell
├── styles.css                        # All styling, including hero, controls, timeline, heatmap, sankey
├── data/
│   ├── raw/                          # AIID snapshot (gitignored — 93MB tar.bz2)
│   ├── sample/sampled_incidents.json # 480 stratified incidents (committed)
│   └── extracted/
│       ├── pathways.json             # 480 extracted pathways (committed) — the project's actual data product
│       ├── handcoded_template.json   # 30-incident validation template (committed)
│       └── handcoded.json            # Owner's blind validation answers (gitignored, to be filled)
├── scripts/
│   ├── sample.py                     # Stratified sampler with sector keyword heuristics
│   ├── extract.py                    # Claude API pathway extraction (resumable)
│   ├── enrich_country.py             # Regex-based country tagging post-extraction
│   └── validate.py                   # --pick (template) and --report (per-stage accuracy)
└── src/                              # Browser-side D3 modules (ES module imports)
    ├── data-loader.js                # State machine + orchestrates filters across views
    ├── sankey.js                     # Escalation Sankey (warning → failure → context → harm)
    ├── heatmap.js                    # Sector × failure-mode, row-normalized
    ├── timeline.js                   # Incidents-per-year bar chart with click-to-filter
    └── detail-panel.js               # Per-incident chain with missed-intervention highlight
```

### On GitHub
- Repo: https://github.com/akrai37/ai_incident_atlas
- Branch: `main`
- GitHub Pages (live viz): https://akrai37.github.io/ai_incident_atlas/
  (must be enabled in repo Settings → Pages once; owner is doing this)

## Pathway schema (the spine of the project)

```jsonc
{
  "incident_id": 591,
  "title": "Cigna PXDX Algorithm Rejected Patient Claims En Masse",
  "sector_heuristic": "healthcare",       // from sample.py keyword match
  "warning_signal": "internal employees ...",   // string OR null when not documented
  "failure_mode": "spec_gap",             // one of: data_bias, model_error, spec_gap, oversight_failure, misuse
  "deployment_context": {
    "sector": "healthcare",               // LLM-confirmed sector (may differ from sector_heuristic)
    "situational_factor": "vulnerable_population"
      // one of: vulnerable_population, high_stakes_decision, public_facing,
      //         safety_critical, automated_at_scale, low_oversight
  },
  "harm": "economic",                     // one of: physical, economic, discriminatory,
                                          //         psychological, reputational, informational
  "missed_intervention_stage": "warning_signal",
      // null OR one of: warning_signal, failure_mode, deployment_context
      // — only non-null when source text documents a specific prior warning or skipped check
  "rationale": "Internal complaints existed before scaling ...",
  "country": "USA",                       // from enrich_country.py regex; "unspecified" if no match
  "date": "2023-07-24",                   // YYYY-MM-DD from AIID
  "_meta": { "model": "claude-sonnet-4-6", "elapsed_s": 3.7 }
}
```

`missed_intervention_stage` being **honestly nullable** is the single most
important schema choice. ~47% of incidents have a null value because their
source report does not describe a precursor. Do not "fix" this by filling
nulls. The null rate is itself a finding.

## Numbers as of 2026-05-28

- 480 incidents extracted (200 → 480 expansion mid-project)
- 5 stratified sectors at sample time: transportation, media_content, public_safety, healthcare, finance
- LLM occasionally re-classified incidents into legal / education / retail / manufacturing — heatmap only shows sectors with n ≥ 5
- 65.6% had documented warning_signal
- 52.5% had non-null missed_intervention_stage (47.5% null)
- 354/480 incidents tagged with country (126 "unspecified")
- Year range 1996–2026; sample is heavily 2023–2026 weighted (modern AI deployment era)

## Active interactivity surface (what the viz can do)

The CSEN 377 rubric requires the viz to be both **intelligent** (AI/text
analysis component) and **interactive**. The intelligent part = LLM-extracted
pathways. The interactive part now includes:

- 4 dropdown filters: sector, country, failure mode, harm (compose via AND)
- Search box (matches title or rationale, case-insensitive substring)
- Timeline bar chart: incidents per year, click-to-filter, full-data backdrop in pale grey + filtered counts in orange
- Heatmap cell click: filters to (sector × failure_mode)
- Empty cells (count=0) visually disabled (not-allowed cursor) to prevent dead clicks
- Sparse-Sankey threshold: if <5 incidents match, hide Sankey, show explanatory message, but the incident list and detail still populate
- Hover tooltips on every Sankey node/link and heatmap cell
- Detail panel: click any incident in the list to see its full chain with the missed-intervention stage outlined in accent color
- Reset button clears all filters at once
- Active-filter chip strip in the status text reflects current state

## Open items and human-only tasks

These cannot be done by an LLM agent. Track them in the user's todo list and
do not silently move forward on them.

1. **Blind hand-validation (~45 min owner time).** Template lives at
   `data/extracted/handcoded_template.json` (30 random incidents). Owner
   must fill the `your_codes` blocks WITHOUT looking at `pathways.json`,
   save as `data/extracted/handcoded.json` (gitignored), then run
   `python3 scripts/validate.py --report` to print per-stage accuracy.
   The output drops into the validation table in `writeup.md`. This is
   the methodological rigor; skipping it weakens the grade.

2. **ACM/IEEE double-column format conversion.** `writeup.md` currently
   has all required sections (intro, motivation, viz design, methodology,
   evaluation plan, discussion, future work, references) but is in
   markdown. The course rubric requires ACM/IEEE double-column. Owner
   to convert (probably Overleaf with the ACM `sigconf` template).

3. **10-minute class presentation slides + 6-10 minute recorded video.**
   Owner's task. The "Try this" example in the index.html intro (filter
   transportation, see physical+model_error; filter finance, see
   economic+misuse) is a good demonstration arc.

4. **GitHub Pages enable.** One-time toggle in repo Settings → Pages,
   branch=main, folder=root. Owner is doing this.

## How to run locally

```bash
cd /Users/akrai/Documents/college_assignments/DV-377/ai_incident_atlas
python3 -m venv .venv && source .venv/bin/activate
pip install pandas anthropic python-dotenv

# (optional) re-run pipeline
python3 scripts/sample.py       # writes data/sample/sampled_incidents.json
python3 scripts/extract.py --resume   # extracts pathways.json, skipping already-done
python3 scripts/enrich_country.py     # adds country + date fields

# serve
python3 -m http.server 8765
# open http://localhost:8765
```

`python3 scripts/extract.py` requires `ANTHROPIC_API_KEY` in `.env`. Each
incident takes ~3-4 seconds, sequential, ~$0.005 each. The script is
resumable (it skips IDs already present in `pathways.json`).

## Cache-busting convention

The HTML imports `data-loader.js?v=N` and `styles.css?v=N`. When you change
JS or CSS, bump N (currently at 8/10) and the corresponding imports inside
`data-loader.js` (which point to the other `src/*.js` modules with `?v=N`).
The owner's browser caches aggressively; this is what makes changes
actually visible without a hard refresh.

## Style guide / things to NOT do

- **No em-dashes (—) anywhere in code, comments, or user-facing text.**
  The owner explicitly said em-dashes "look AI-written." Use periods,
  commas, or colons. All existing em-dashes were stripped 2026-05-28.
- **No `Co-Authored-By: Claude` trailer in commits.** See "Owner context."
- **No AI references in commit messages, PR descriptions, or file
  headers** beyond stating that Claude was used as the *extraction tool*
  (which is a methodological fact, not an authorship claim).
- **Do not commit `.env` or the raw AIID dump.** Both are gitignored.
- **Do not "fill" nulls in `missed_intervention_stage`.** The null rate
  is a finding.
- **Do not silently widen sector coverage below n=5.** The heatmap's
  min-N filter is a deliberate honesty choice.

## When the owner asks a question, default to:

- Concrete examples over abstract explanations. The owner once said
  "you're confusing me" when given two abstract paragraphs; one real
  incident traced through the chain made it click.
- Short responses. The owner has limited patience for theory walls.
- If the owner says "make it look better," interpret as *visible*
  improvement (size, contrast, weight, spacing). Subtle CSS polish is
  invisible to them.
- If the owner says a number on screen looks wrong, verify it against
  `data/extracted/pathways.json` before defending it.
