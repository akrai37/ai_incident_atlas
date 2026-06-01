# AI Incident Atlas: Cascading Harm & Failure Pathways

**Intelligent Interactive Visual Analytics for Real-World AI Failures**

AI Incident Atlas transforms incident reports from the [AI Incident Database (AIID)](https://incidentdatabase.ai/) into explorable escalation pathways:

> **documented warning → failure mode → deployment context → resulting harm**

The dashboard helps users investigate how reported AI incidents develop into harm and where earlier intervention was documented as missed across five study sectors: **transportation, media/content, public safety, healthcare, and finance**.


---

## Research Questions

1. **How do documented AI incidents progress from warning signals through failure conditions and deployment contexts into real-world harm?**
2. **Which failure modes and documented missed-intervention stages recur across the five study sectors?**

---

## Why This Is an Intelligent Visualization Project

The source reports in AIID are narrative text, not ready-made pathway categories. This project uses **LLM-assisted text extraction** to convert each selected incident report into a structured pathway containing:

- a documented warning signal, when present;
- a failure mode;
- a deployment-context factor;
- a primary harm type;
- a documented missed-intervention stage, when supported by the report;
- a short rationale.

The interactive visualizations are built from this extracted pathway dataset. The website does **not** call an AI model during normal use; it loads the already-created processed data from `data/extracted/pathways.json`.

---

## Dataset and Processing Pipeline

### Source data

The project uses public incident and report data from the **AI Incident Database (AIID)**.

### Analytical sample

The dashboard analyzes **480 incident reports** sampled across five planned study sectors:

- Transportation
- Media/content
- Public safety
- Healthcare
- Finance

The primary cross-sector comparisons in the dashboard use the fixed study-sector label (`sector_heuristic`) created during sampling. The extraction output also includes an interpreted contextual sector for individual incident explanations.

### Workflow

```text
AI Incident Database reports
        ↓
Sector-focused sampling of 480 incidents
        ↓
LLM-assisted extraction of pathway fields
        ↓
Processed pathway dataset: data/extracted/pathways.json
        ↓
Interactive D3.js dashboard
```

---

## Pathway Schema

Each processed incident is represented using the following structure:

```json
{
  "incident_id": 323,
  "title": "Tesla on Autopilot Crashed into Parked Police Car in California",
  "sector_heuristic": "transportation",
  "warning_signal": "Two prior similar incidents were publicly reported.",
  "failure_mode": "model_error",
  "deployment_context": {
    "sector": "transportation",
    "situational_factor": "safety_critical"
  },
  "harm": "physical",
  "missed_intervention_stage": "warning_signal",
  "rationale": "A known recurring failure pattern was documented before a similar collision.",
  "country": "USA",
  "date": "2018-05-29"
}
```

### Controlled categories

**Failure mode**

```text
data_bias | model_error | spec_gap | oversight_failure | misuse
```

**Situational factor**

```text
vulnerable_population | high_stakes_decision | public_facing |
safety_critical | automated_at_scale | low_oversight
```

**Harm**

```text
physical | economic | discriminatory | psychological |
reputational | informational
```

**Missed intervention stage**

```text
warning_signal | failure_mode | deployment_context | null
```

`missed_intervention_stage` is intentionally nullable. A `null` value means that a clearly documented earlier intervention point was not identified in the source report; it does **not** mean that prevention was impossible.

---

## Interactive Dashboard

The website provides linked exploration across the processed incident pathways.

### Primary visualizations

1. **Incidents Over Time**  
   A timeline of incident counts by year with click-to-filter, zoom, pan, and optional sector comparison.

2. **Escalation Sankey**  
   Shows how selected incidents flow through:

   ```text
   documented/no documented warning → failure mode → situational context → harm
   ```

3. **Cross-Sector Heatmap**  
   A row-normalized sector comparison that can switch between:

   - **Sector × Failure Mode**
   - **Sector × Missed Intervention Stage**

### Interactive controls

Users can filter by:

- sector;
- country;
- failure mode;
- contextual factor;
- harm type;
- missed intervention stage;
- search keyword;
- year selected from the timeline.

Additional features include:

- **Current Selection Summary** with dynamically computed key percentages;
- a sector-to-sector timeline comparison;
- clickable heatmap cells that apply linked filters;
- incident-level detail chains and rationales;
- source-report links for traceability;
- a clear no-results message for over-specific filter combinations.

### Guided example

Selecting **transportation** shows that physical harm and model error dominate the selected cohort; selecting **finance** reveals a contrasting pattern centered on economic harm and misuse. The summary provides exact percentages, while the heatmap can be switched to missed-intervention stage for cross-sector comparison.

---

## Validation of the Extraction

A **30-incident human-created subset** was compared against the LLM-assisted pathway extraction using:

```bash
python3 scripts/validate.py --report
```

| Extracted field | Agreement |
|---|---:|
| Failure mode | 90.0% |
| Sector | 83.3% |
| Situational factor | 76.7% |
| Harm | 80.0% |
| Missed intervention stage | 83.3% |

These results support using the extracted fields for exploratory visual analysis. The remaining disagreements reflect the interpretive nature of incident narratives, especially when an incident may reasonably fit more than one contextual or harm category.

---

## Project Structure

```text
ai_incident_atlas/
├── index.html                         # Single-page dashboard layout
├── styles.css                         # Site styling
├── README.md                          # Project overview and instructions
├── writeup.md                         # Paper draft/content
├── src/
│   ├── data-loader.js                 # State, filters, linked rendering, summary
│   ├── timeline.js                    # Incidents-over-time visualization
│   ├── sankey.js                      # Escalation pathway Sankey
│   ├── heatmap.js                     # Toggleable cross-sector heatmap
│   └── detail-panel.js                # Incident detail chain and source link
├── data/
│   ├── sample/
│   │   └── sampled_incidents.json     # Sampled incident text and source URLs
│   └── extracted/
│       ├── pathways.json              # 480 structured pathway records
│       ├── handcoded_template.json    # Blank validation template
│       └── handcoded.json             # Reviewed 30-incident validation subset
└── scripts/
    ├── sample.py                      # Sampling pipeline
    ├── extract.py                     # LLM-assisted pathway extraction
    ├── enrich_country.py              # Country tagging/enrichment
    └── validate.py                    # Validation comparison report
```

### Raw data note

The processed data required to run the dashboard is included. The complete raw AIID snapshot may be excluded from the submitted repository because of file size. To rerun sampling from the original snapshot, place the required AIID raw CSV files in the folder expected by `scripts/sample.py`.

---

## Run the Dashboard Locally

No build step is needed to view the completed dashboard.

From the project folder:

```bash
python3 -m http.server 8765
```

Then open:

```text
http://localhost:8765
```

Do not open `index.html` directly by double-clicking it, because the browser may block loading local JSON data files.

---

## Optional: Rerun Validation

Once `data/extracted/handcoded.json` is present:

```bash
python3 scripts/validate.py --report
```

---

## Optional: Rebuild Processed Data

The completed dashboard already includes processed data. Regenerating pathway extractions is optional and requires the project dependencies and an Anthropic API key.

```bash
python3 -m venv .venv
source .venv/bin/activate
pip install pandas anthropic python-dotenv
```

Place the raw AIID files where expected by `scripts/sample.py`, and create a local `.env` file only if rerunning extraction:

```text
ANTHROPIC_API_KEY=your_key_here
```

Never commit `.env` or API keys to GitHub.

---

## Deployment

Because the dashboard is a static web application, it can be deployed with GitHub Pages:

1. Push the final project files to the repository.
2. Open **Settings → Pages** in GitHub.
3. Select **Deploy from a branch**.
4. Choose `main` and `/ (root)`.
5. Save and verify that the deployed website loads the data and interactions correctly.
6. Add the final public URL near the top of this README.

---

## Sustainability Contribution

This project treats sustainability as **responsible, long-term AI deployment**. A sustainable AI ecosystem should learn from earlier failures instead of repeating similar harms. By visualizing recurring escalation pathways and documented missed-intervention stages, AI Incident Atlas helps preserve institutional memory of where safeguards, oversight, or response mechanisms may matter most.

---

## Limitations

- **Reporting bias:** AIID reflects publicly documented incidents and may overrepresent highly reported sectors, regions, or languages.
- **Sampling scope:** The dashboard analyzes a sector-focused sample of 480 incidents, not every incident in AIID.
- **Interpretive annotations:** Failure, harm, context, and missed-intervention labels are analytical interpretations of narrative reports.
- **Retrospective framing:** A documented missed intervention is identified after an incident; it is not a real-time prediction of preventability.
- **Validation scope:** Agreement was assessed on a 30-incident reviewed subset rather than the full dataset.

---

## Technologies

- HTML, CSS, JavaScript
- D3.js
- d3-sankey
- Python data-processing scripts
- LLM-assisted text extraction for structured pathway annotation

---

## Data Source

- AI Incident Database (AIID): [https://incidentdatabase.ai/](https://incidentdatabase.ai/)
