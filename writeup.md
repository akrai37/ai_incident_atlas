# AI Incident Atlas: Intelligent Visual Analytics for Cascading Harm and Missed Intervention Pathways

**Allurkar Sneha, Ankush Rai, Answeeta Pereira**  
**CSEN 377 — Data Visualization Final Project, Spring 2026**  
*Author affiliation and email lines can be inserted when placing this content into the IEEE conference template.*

## Abstract

Artificial intelligence incident repositories preserve reports of real-world harms, but incident browsing alone does not easily show how failures escalate or where earlier intervention may have reduced harm. This project presents **AI Incident Atlas**, an intelligent interactive visual analytics system that transforms 480 reports sampled from the AI Incident Database (AIID) into structured escalation pathways. Each incident is modeled as a progression from a documented warning signal, through a failure mode and deployment context, to a primary harm outcome, with an additional annotation for a documented missed-intervention stage when supported by the source report. The structured pathways are produced through large-language-model-assisted text extraction and explored through a linked D3.js dashboard containing an incident timeline, an escalation Sankey diagram, and a toggleable cross-sector heatmap. The dashboard supports comparisons among five study sectors: transportation, media/content, public safety, healthcare, and finance. In the processed sample, 65.6% of incidents contain a documented warning signal and 52.5% contain a documented missed-intervention stage. A reviewed 30-incident validation subset produced agreement ranging from 76.7% to 90.0% across extracted fields, including 83.3% agreement for missed-intervention stage. The project contributes a pathway-oriented view of AI incidents intended to support responsible and sustainable AI deployment by preserving lessons about how harm develops and where documented opportunities for response were missed.

**Index Terms—** AI incidents, visual analytics, responsible AI, large language models, text extraction, Sankey diagram, interactive visualization, sustainability.

---

## I. Introduction

AI systems are increasingly involved in decisions and interactions that affect safety, finances, healthcare, public discourse, and civil rights. When failures occur, the resulting harms are often documented as individual news reports, regulatory actions, investigations, or public complaints. The **AI Incident Database (AIID)** was created to catalog such real-world incidents and support learning from past failures [1], [2]. AIID also provides downloadable research snapshots intended for stable analytical work, including natural language processing and academic analysis [3].

However, a collection of individual reports does not automatically answer a central question for responsible AI practice: **how do incidents progress from early signals into real-world harm?** An incident may involve a prior warning, a model or governance breakdown, a particular deployment condition, and a resulting harm. Treating each incident only as a single taxonomy label can conceal the sequence connecting these elements.

This project introduces **AI Incident Atlas**, an intelligent interactive visual analytics system that represents AI incidents as escalation pathways:

> **documented warning → failure mode → deployment context → harm**

Each incident can also contain a documented `missed_intervention_stage`, identifying the stage at which the source report provides evidence of an earlier opportunity to interrupt or reduce harm. This stage is deliberately nullable: when a source report does not document a clear opportunity, the system records the intervention stage as not documented rather than inferring one through hindsight.

The system combines LLM-assisted text extraction with linked interactive visualizations. It analyzes 480 sampled AIID incidents across five planned sectors: transportation, media/content, public safety, healthcare, and finance. Users can examine temporal patterns, trace escalation pathways, compare sector distributions of both failure modes and missed-intervention stages, filter by contextual conditions and harm outcomes, and inspect individual incident rationales with links back to source reports.

The project addresses the course goal of **artificial/intelligent interactive visual analytics** in two ways. First, the intelligence layer converts unstructured incident narratives into structured analytical pathway records. Second, the interactive dashboard lets users investigate both aggregate patterns and individual supporting incidents.

---

## II. Motivation and Research Questions

### A. Motivation

Most reported AI incidents are difficult to compare directly because they are expressed as narratives. A self-driving crash, a deepfake investment scam, an automated healthcare decision, and a facial-recognition false match may have little surface similarity. Yet they can share structural features: prior warnings, insufficient oversight, high-stakes deployment contexts, or repeated harm patterns.

The motivation for AI Incident Atlas is that identifying **pathways of escalation** may be more actionable than counting incident categories alone. For example, the system can show that transportation incidents in the sample frequently culminate in physical harm through model error, while finance incidents frequently culminate in economic harm through deliberate misuse. These patterns suggest different responses: safety testing and deployment controls for transportation, versus fraud detection, identity verification, and enforcement mechanisms for finance.

This project also supports a sustainability framing. Responsible and sustainable AI deployment requires organizations to learn from previous failures rather than rediscovering similar risks after harm occurs. A system that preserves the sequence of warning, failure, context, harm, and missed response can act as institutional memory for future reviews.

### B. Research Questions

The final project is guided by two research questions:

**RQ1.** How do documented AI incidents progress from warning signals through failure modes and deployment contexts into real-world harm?

**RQ2.** Which failure modes and documented missed-intervention stages recur across the five study sectors?

These questions differ from simple taxonomy browsing because they focus on the relationship between stages and on where incident reports document earlier opportunities for response.

---

## III. Related Work and Data Source

### A. AI Incident Database

The AI Incident Database catalogs real-world incidents in which intelligent systems have caused or contributed to safety, fairness, or other harms. McGregor describes the AIID as a resource intended to prevent repeated real-world AI failures by collecting and studying incidents [1]. The AIID research snapshot system provides downloadable database versions to support shared and reproducible analysis [3].

### B. Related Incident Analysis Systems

Existing AI incident analysis work has demonstrated the value of classifying reports into structured risk or harm categories. For example, the MIT AI Incident Tracker processes AIID reports with an LLM and offers interactive exploration of classifications including harm severity and risk domains [4]. AI Incident Atlas is related in its use of structured extraction, but differs in analytical emphasis: it models each incident as a **sequential escalation pathway** and explicitly visualizes **documented missed-intervention stages**.

### C. Visualization Framework

The dashboard is implemented using D3.js, a web-based library for data-driven interactive visualization [5]. The primary pathway view uses a Sankey layout because the analytical question concerns flows through ordered stages. A cross-sector heatmap complements the Sankey by supporting normalized comparisons between industries.

---

## IV. Dataset and Preprocessing

### A. Sample Construction

The processed dashboard dataset contains **480 AIID incidents** selected into five planned study sectors:

| Study sector | Number of incidents |
|---|---:|
| Public safety | 100 |
| Finance | 100 |
| Media/content | 100 |
| Transportation | 97 |
| Healthcare | 83 |
| **Total** | **480** |

The sampling script uses keyword-based heuristics on incident titles and descriptions to create the five sector groups. These study-sector assignments are retained as `sector_heuristic` and are used for the dashboard’s primary cross-sector comparisons. This design decision ensures that the comparison groups remain consistent with the sampling methodology.

During text extraction, the model also assigns a contextual sector as part of the incident pathway. That extracted contextual field is useful for interpreting individual incidents, but it is not used to redefine the five primary heatmap rows, because doing so would create unstable or very small comparison groups.

### B. Processed Data Files

The implementation uses the following processed files:

- `data/sample/sampled_incidents.json` contains selected incident text and source-report URLs.
- `data/extracted/pathways.json` contains the 480 structured pathway records used by the dashboard.
- `data/extracted/handcoded_template.json` contains a blank 30-incident review template.
- `data/extracted/handcoded.json` contains the reviewed validation subset.

The dashboard loads the processed JSON directly. It does not call an LLM while the website is being viewed.

### C. Pathway Schema

Each sampled incident is modeled with the following fields:

| Field | Description |
|---|---|
| `warning_signal` | A documented prior signal, complaint, known issue, or earlier failure, if reported |
| `failure_mode` | The central breakdown or harmful use pattern |
| `deployment_context.sector` | Contextual industry/domain interpretation |
| `deployment_context.situational_factor` | Condition making the incident consequential |
| `harm` | Primary harm outcome |
| `missed_intervention_stage` | Stage where a documented earlier opportunity was missed, or null |
| `rationale` | Short explanation supporting the extracted pathway |

The controlled vocabularies are:

**Failure mode:** `data_bias`, `model_error`, `spec_gap`, `oversight_failure`, `misuse`.

**Situational factor:** `vulnerable_population`, `high_stakes_decision`, `public_facing`, `safety_critical`, `automated_at_scale`, `low_oversight`.

**Harm:** `physical`, `economic`, `discriminatory`, `psychological`, `reputational`, `informational`.

**Missed intervention stage:** `warning_signal`, `failure_mode`, `deployment_context`, or `null`.

A null missed-intervention value means only that the source report did not clearly document an earlier opportunity to interrupt the harm. It does not establish that prevention was impossible.

---

## V. Intelligent Pathway Extraction Method

### A. LLM-Assisted Text Extraction

The intelligent component of AI Incident Atlas is the conversion of unstructured incident narratives into structured pathway fields. Each sampled report is passed to a Claude-based extraction script (`scripts/extract.py`) that returns a JSON record conforming to the pathway schema.

The extraction prompt constrains the model in three important ways:

1. **Controlled vocabularies** are required for failure mode, situational factor, harm, and missed-intervention stage. This prevents the visualization from becoming unreadable due to arbitrary label variation.
2. **Nullable evidence fields** are required for warning signal and missed-intervention stage. The model is instructed not to invent warnings or intervention opportunities when the source report does not document them.
3. **A rationale field** is produced for each incident so that users can inspect the reasoning associated with a pathway in the incident detail panel.

The resulting processed file contains 480 valid pathway records used by the website.

### B. Why Text Extraction Is Needed

The pathway variables are generally not available as ready-made columns in a raw incident-report narrative. For example, a source report may describe previous crashes, system behavior, operational circumstances, and injury outcomes in prose. Text extraction maps this narrative into comparable analytical variables so that an interactive visualization can expose aggregate patterns while still allowing case-level inspection.

### C. Interpretation Rather Than Ground Truth

The extracted labels are analytical interpretations of source reports. A single incident can reasonably be understood in more than one way: a deepfake health scam, for example, may be viewed primarily through its healthcare content or through the media/content channel used to spread it. Therefore, the system uses the extracted labels for exploratory comparison rather than claiming an objective causal determination for every incident.

---

## VI. Interactive Visualization Design and Implementation

The final web application is a single-page D3.js dashboard composed of three primary visualizations and supporting linked analysis components.

### A. Visualization 1: Incidents Over Time

The timeline shows incident counts by year. A pale backdrop represents the overall distribution, while the active filtered cohort is overlaid in accent color. Users can:

- click a year to filter all linked views;
- click the selected year again to clear the time filter;
- zoom and pan across the timeline;
- overlay a comparison sector after selecting a primary sector.

The timeline supports temporal exploration and helps users identify when incidents satisfying a specific pathway pattern were reported.

**[Insert Figure 1: Dashboard overview showing the timeline and control panel.]**

### B. Visualization 2: Escalation Sankey

The Sankey diagram is the main pathway visualization. It represents flow through four stages:

> **documented/no documented warning → failure mode → situational context → harm**

Link width indicates the number of selected incidents following a path. Node labels display counts; hover interaction provides additional inspection without overcrowding the visual layout. The Sankey updates when users change filters or click a heatmap cell.

This chart is appropriate because the central research question concerns how incidents move across ordered stages rather than only which categories appear.

**[Insert Figure 2: Sankey after selecting transportation, emphasizing model error and physical harm.]**

### C. Visualization 3: Toggleable Cross-Sector Heatmap

The heatmap compares the fixed five study sectors using row-normalized percentages. It can be switched between two modes:

1. **Sector × Failure Mode**, which reveals the distribution of failure patterns within each sector.
2. **Sector × Missed Intervention Stage**, which reveals where earlier action was documented as missed within each sector, including a `not documented` column.

Row normalization is important because the sector groups have different sample sizes. The percentages show the distribution within each sector rather than allowing the largest group to dominate visually.

Clicking a nonempty heatmap cell applies the corresponding sector and column filter to the other linked views.

**[Insert Figure 3: Heatmap switched to Missed Intervention Stage mode.]**

### D. Supporting Interactive Components

The system includes several components that strengthen the linked visual analytics workflow:

- **Current Selection Summary.** When a sector or filtered cohort is selected, this panel dynamically reports the leading harm outcome, leading failure mode, documented warning rate, and documented missed-intervention rate. This makes guided comparisons immediately verifiable.
- **Filters.** Users can filter by sector, country, failure mode, contextual factor, harm type, missed-intervention stage, year, or search term.
- **Compare Sector control.** Timeline comparison is enabled only after a primary sector is selected, preventing ambiguous comparisons between one sector and the full dataset.
- **Incident detail panel.** Selecting an individual incident reveals its escalation chain, rationale, highlighted intervention stage when present, and a source-report link for traceability.
- **No-results state.** When an over-specific filter combination returns zero incidents, the interface explicitly tells users to revise or reset filters rather than displaying an unexplained blank visualization.

### E. Design Rationale

The three visualization choices serve complementary purposes:

- The **timeline** supports temporal trends and filtering.
- The **Sankey** exposes escalation pathways.
- The **heatmap** supports normalized sector comparison, including the project’s key missed-intervention question.

The visual language uses a consistent warm, editorial-style palette with harm-specific color encoding at the Sankey endpoint. The dashboard emphasizes interpretability: aggregate patterns remain linked to source incidents, rationales, and report links.

---

## VII. Evaluation

### A. Data and Extraction Checks

The processed dataset contains 480 pathway records. Internal checks used during implementation verify that:

- all displayed records include valid failure-mode and harm labels;
- sector totals sum to 480;
- Sankey flows update consistently with the selected cohort;
- key summary percentages correspond to the filtered data;
- source links are available through the sampled-report data when associated URLs are present.

### B. Reviewed Validation Subset

To assess the reliability of the LLM-assisted extraction, a **30-incident reviewed validation subset** was compared against the extracted labels using `scripts/validate.py --report`. The review uses incident titles, descriptions, and report excerpts to check the categorical pathway assignments.

| Extracted field | Agreement | Correct matches out of 30 |
|---|---:|---:|
| Failure mode | 90.0% | 27 |
| Sector | 83.3% | 25 |
| Situational factor | 76.7% | 23 |
| Harm | 80.0% | 24 |
| Missed intervention stage | 83.3% | 25 |

Agreement is highest for failure mode, which suggests that broad failure patterns are comparatively consistent to extract from incident narratives. Agreement for situational factor is lower, reflecting that the same incident can be framed through multiple real-world conditions. Missed-intervention-stage agreement of 83.3% was obtained using a strict definition: a stage is labeled only when the source material clearly documents an earlier opportunity to prevent or reduce harm.

These results support use of the pathway annotations for exploratory visual analytics, while not eliminating the interpretive nature of narrative incident coding.

### C. Alignment with Course Evaluation Criteria

The system addresses the course evaluation dimensions as follows:

1. **Data collection, cleaning, and analysis.** The project acquires AIID report data, samples five study sectors, derives a structured pathway dataset, validates a reviewed subset, and computes sector-level patterns.
2. **Visualization prototyping and implementation.** The dashboard implements three linked visualizations, multiple filters, click-to-filter behavior, summary statistics, source-report inspection, and responsive interaction states.
3. **Demonstration in report and presentation.** The final paper documents the methodology, visual design, evaluation, sustainability relevance, and limitations, while the presentation can demonstrate sector comparisons and incident-level evidence.

---

## VIII. Findings

The following findings are based on the 480 processed incident pathways and should be understood as patterns in the sampled and extracted dataset.

### A. Overall Pathway Findings

Of the 480 incidents:

- **315 incidents (65.6%)** contain a documented warning signal.
- **252 incidents (52.5%)** contain a documented missed-intervention stage.
- **228 incidents (47.5%)** do not contain a clearly documented missed-intervention stage.

The most common extracted failure mode is **misuse**, appearing in 202 incidents (**42.1%**). The second most common is **model error**, appearing in 125 incidents (**26.0%**).

| Failure mode | Count | Share of sample |
|---|---:|---:|
| Misuse | 202 | 42.1% |
| Model error | 125 | 26.0% |
| Specification gap | 70 | 14.6% |
| Data bias | 54 | 11.3% |
| Oversight failure | 29 | 6.0% |

The most common harm outcomes are **physical harm** (142 incidents, 29.6%) and **economic harm** (131 incidents, 27.3%).

| Harm type | Count | Share of sample |
|---|---:|---:|
| Physical | 142 | 29.6% |
| Economic | 131 | 27.3% |
| Discriminatory | 67 | 14.0% |
| Informational | 62 | 12.9% |
| Reputational | 43 | 9.0% |
| Psychological | 35 | 7.3% |

### B. Sector Contrasts

The guided interaction in the interface demonstrates two notably different sector patterns:

| Sector | Dominant harm | Dominant failure mode |
|---|---|---|
| Transportation (`n = 97`) | Physical: 76 incidents (**78.4%**) | Model error: 61 incidents (**62.9%**) |
| Finance (`n = 100`) | Economic: 77 incidents (**77.0%**) | Misuse: 74 incidents (**74.0%**) |

This contrast illustrates why pathway analysis matters. Transportation cases in this sample are frequently associated with safety-critical model behavior and physical outcomes, whereas finance cases are frequently associated with intentional misuse and economic losses.

Other sectors show more distributed harm profiles:

| Sector | Most frequent harm | Count and share |
|---|---|---:|
| Healthcare (`n = 83`) | Physical | 36 (43.4%) |
| Public safety (`n = 100`) | Discriminatory | 27 (27.0%) |
| Media/content (`n = 100`) | Informational | 26 (26.0%) |

### C. Documented Missed-Intervention Patterns

Across the full sample, missed-intervention annotation values are distributed as follows:

| Documented missed-intervention stage | Count | Share |
|---|---:|---:|
| Warning signal | 158 | 32.9% |
| Failure mode | 48 | 10.0% |
| Deployment context | 46 | 9.6% |
| Not documented | 228 | 47.5% |

The warning-signal stage is the most frequent documented missed-intervention stage. However, nearly half of the incident reports do not explicitly document a prior intervention opportunity. This should not be interpreted as proof that prevention was impossible; rather, it indicates the limits of what can be recovered from public incident narratives.

The toggleable heatmap enables users to inspect this pattern by sector. For example, transportation contains a relatively high share of missed interventions associated with warning signals, while finance, public safety, and media/content contain larger `not documented` shares.

---

## IX. Sustainability Contribution

This project addresses sustainability as **responsible and durable AI deployment**. A sustainable AI ecosystem is not only one that reduces immediate harm; it is one that learns from reported failures and incorporates those lessons into future design, deployment, monitoring, and governance decisions.

AI Incident Atlas supports this goal by preserving and exposing:

- recurring paths from warnings to harms;
- sector-specific differences in failure and harm patterns;
- documented points at which earlier intervention was missed;
- incident-level source evidence behind aggregate visual patterns.

Two practical use cases illustrate this contribution:

1. **Pre-deployment review.** A team considering an AI system in a high-stakes domain can inspect incidents in a similar sector and context before deploying, identifying repeated harms and failure patterns that require stronger safeguards.
2. **Policy and oversight review.** Regulators or auditors can compare whether a domain’s incident patterns center on model failures, misuse, oversight, or unaddressed warnings, helping prioritize review mechanisms.

The system does not itself prevent future incidents, but it creates an accessible visual record of prior escalation pathways that can inform more responsible future decisions.

---

## X. Limitations and Future Work

### A. Limitations

1. **Reporting bias.** AIID contains publicly documented reports; incidents receiving less media attention or occurring in underrepresented regions may be missing or undercounted.
2. **Sector sampling scope.** The dashboard analyzes a selected 480-incident sample from five sectors, not the full AIID corpus.
3. **Keyword-based sampling.** The five study sectors are assigned using heuristic sampling rules. These rules improve consistency for comparison but can include incidents whose secondary context overlaps another sector.
4. **Interpretive extraction.** The pathway labels derive from narrative reports and involve judgment. Validation agreement is strong but not perfect, especially for contextual interpretations.
5. **Retrospective intervention annotation.** A documented missed-intervention point is identified after harm has been reported; the system does not predict preventability in real time.
6. **Source-report completeness.** Public reports vary in depth. A `not documented` intervention value may reflect missing reporting rather than a true absence of earlier signals.

### B. Future Work

Several extensions would strengthen the project:

1. Extend reviewed validation with additional independent human coders and report inter-rater agreement statistics.
2. Analyze pathway differences by country or regulatory region when report coverage is sufficient.
3. Examine whether the rate of documented warnings or intervention opportunities changes over time.
4. Expand pathway extraction to additional AIID incidents and test whether the five-sector sample reflects broader distributions.
5. Develop deployment-review queries that allow practitioners to retrieve historical pathways matching a planned sector and contextual risk.

---

## XI. Conclusion

AI Incident Atlas transforms a sample of real-world AI incident reports into structured escalation pathways and makes those pathways explorable through linked interactive visualizations. Rather than showing only what type of incident occurred, the system helps users examine how documented warnings, failure modes, deployment contexts, harms, and missed-intervention stages connect across sectors.

The project’s central finding is that the shape of AI harm differs strongly by domain: transportation incidents in the sample are dominated by model-error pathways ending in physical harm, while finance incidents are dominated by misuse pathways ending in economic harm. At the same time, the presence of documented warning and intervention opportunities across many reports suggests that learning from prior incidents is important for sustainable AI deployment.

By combining LLM-assisted text extraction, interactive visual analytics, source-level inspection, and reviewed validation, AI Incident Atlas provides a practical framework for studying repeated AI failures as pathways rather than isolated events.

---

## References

[1] S. McGregor, “Preventing repeated real world AI failures by cataloging incidents: The AI Incident Database,” *Proceedings of the AAAI Conference on Artificial Intelligence*, vol. 35, no. 17, pp. 15458–15463, 2021, doi: 10.1609/aaai.v35i17.17817.

[2] AI Incident Database, “Welcome to the AI Incident Database.” [Online]. Available: https://incidentdatabase.ai/. Accessed: May 31, 2026.

[3] AI Incident Database, “Database Backups and Snapshots.” [Online]. Available: https://incidentdatabase.ai/research/snapshots/. Accessed: May 31, 2026.

[4] MIT AI Risk Initiative, “AI Incident Tracker.” [Online]. Available: https://airisk.mit.edu/ai-incident-tracker. Accessed: May 31, 2026.

[5] M. Bostock, V. Ogievetsky, and J. Heer, “D³: Data-Driven Documents,” *IEEE Transactions on Visualization and Computer Graphics*, vol. 17, no. 12, pp. 2301–2309, Dec. 2011.

[6] M. Bostock, “d3-sankey.” [Online]. Available: https://github.com/d3/d3-sankey. Accessed: May 31, 2026.
