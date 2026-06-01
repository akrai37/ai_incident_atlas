// Loads pathway annotations and orchestrates linked visual analytics + filtering.
import { renderSankey } from "./sankey.js?v=15";
import { renderHeatmap } from "./heatmap.js?v=15";
import { renderDetail } from "./detail-panel.js?v=15";
import { renderTimeline } from "./timeline.js?v=15";


const FAILURE_MODES = ["data_bias", "model_error", "spec_gap", "oversight_failure", "misuse"];
const CONTEXTS = [
  "vulnerable_population",
  "high_stakes_decision",
  "public_facing",
  "safety_critical",
  "automated_at_scale",
  "low_oversight",
  "unspecified",
];
const HARMS = ["physical", "economic", "discriminatory", "psychological", "reputational", "informational"];
const INTERVENTION_STAGES = ["warning_signal", "failure_mode", "deployment_context", "not_documented"];
const MIN_SECTOR_N = 5;

// Use the five planned sampling groups for the primary cross-sector comparison.
// Claude's contextual sector is retained in each incident's detail panel.
function getProjectSector(record) {
  return record.sector_heuristic || record.deployment_context?.sector || "unknown";
}

function getInterventionStage(record) {
  return record.missed_intervention_stage || "not_documented";
}

function pretty(value) {
  return String(value || "").replace(/_/g, " ");
}


function percent(count, total) {
  return total ? Math.round((count / total) * 100) : 0;
}

function topCategory(rows, accessor) {
  const counts = new Map();
  for (const row of rows) {
    const value = accessor(row);
    if (!value) continue;
    counts.set(value, (counts.get(value) || 0) + 1);
  }
  let topValue = null;
  let topCount = 0;
  for (const [value, count] of counts.entries()) {
    if (count > topCount) {
      topValue = value;
      topCount = count;
    }
  }
  return { value: topValue, count: topCount };
}

function summaryMetric(label, value, count, total) {
  return `
    <div class="summary-metric">
      <span class="metric-label">${label}</span>
      <span class="metric-value"><strong>${percent(count, total)}%</strong>${pretty(value)} <small>(${count} of ${total})</small></span>
    </div>`;
}

function renderSelectionSummary(rows) {
  const titleEl = document.getElementById("summary-title");
  const noteEl = document.getElementById("summary-note");
  const metricsEl = document.getElementById("summary-metrics");
  const sectorName = state.filter.sector === "all" ? "All study sectors" : pretty(state.filter.sector);

  titleEl.textContent = `${sectorName} · ${rows.length} incident${rows.length === 1 ? "" : "s"}`;

  if (rows.length === 0) {
    noteEl.textContent = "No values can be calculated for this combination.";
    metricsEl.innerHTML = '<div class="summary-empty error"><strong>No incidents match these filters.</strong> Clear one or more filters or choose Reset to return to the full dataset.</div>';
    return;
  }

  noteEl.textContent = state.filter.sector === "all"
    ? "Select a sector to test the guided comparison above."
    : "Calculated from the current filtered selection.";

  const topHarm = topCategory(rows, (row) => row.harm);
  const topFailure = topCategory(rows, (row) => row.failure_mode);
  const documentedWarnings = rows.filter((row) => Boolean(row.warning_signal)).length;
  const documentedMissed = rows.filter((row) => Boolean(row.missed_intervention_stage)).length;

  metricsEl.innerHTML = [
    summaryMetric("Top resulting harm", topHarm.value, topHarm.count, rows.length),
    summaryMetric("Top failure mode", topFailure.value, topFailure.count, rows.length),
    summaryMetric("Documented warning", "with documented warning", documentedWarnings, rows.length),
    summaryMetric("Missed intervention", "with documented intervention point", documentedMissed, rows.length),
  ].join("");
}

const state = {
  all: [],
  filter: {
    sector: "all",
    country: "all",
    failure_mode: "all",
    situational_factor: "all",
    harm: "all",
    missed_intervention_stage: "all",
    year: null,
    search: "",
  },
  heatmapMode: "failure_mode",
  compareSector: "none",
  selectedIncidentId: null,
};

async function loadRows() {
  const pathwaysResponse = await fetch("data/extracted/pathways.json");
  if (!pathwaysResponse.ok) throw new Error("Could not load pathways.json.");
  const pathways = await pathwaysResponse.json();

  // URLs live in the sampled source records in the current project structure.
  // Loading is optional so the dashboard still renders if only pathways.json is deployed.
  let sourceById = new Map();
  try {
    const sampleResponse = await fetch("data/sample/sampled_incidents.json");
    if (sampleResponse.ok) {
      const sampled = await sampleResponse.json();
      sourceById = new Map(sampled.map((row) => [String(row.incident_id), row]));
    }
  } catch (error) {
    console.info("Source report metadata not available; detail links will be omitted.", error);
  }

  return pathways
    .filter((row) => !row._error && row.failure_mode && row.harm)
    .map((row) => {
      const source = sourceById.get(String(row.incident_id));
      return {
        ...row,
        primary_report_url: row.primary_report_url || source?.primary_report_url || null,
        primary_report_title: row.primary_report_title || source?.primary_report_title || null,
      };
    });
}

async function init() {
  try {
    state.all = await loadRows();
    setupControls();
    refresh();
  } catch (error) {
    document.getElementById("status").textContent =
      "Could not load pathways.json. Run the site from its project folder using a local server.";
    console.error(error);
  }
}

function setupControls() {
  const sectorSel = document.getElementById("sector-filter");
  const compareSel = document.getElementById("compare-filter");
  const countrySel = document.getElementById("country-filter");
  const failureSel = document.getElementById("failure-filter");
  const contextSel = document.getElementById("context-filter");
  const harmSel = document.getElementById("harm-filter");
  const interventionSel = document.getElementById("intervention-filter");
  const heatmapModeSel = document.getElementById("heatmap-mode");
  const search = document.getElementById("search");
  const reset = document.getElementById("reset");

  const sectorCounts = {};
  for (const row of state.all) {
    const sector = getProjectSector(row);
    sectorCounts[sector] = (sectorCounts[sector] || 0) + 1;
  }
  const sectors = Object.keys(sectorCounts)
    .filter((sector) => sectorCounts[sector] >= MIN_SECTOR_N)
    .sort();
  for (const sector of sectors) sectorSel.appendChild(opt(sector, pretty(sector)));

  const countries = Array.from(new Set(state.all.map((row) => row.country).filter(Boolean)))
    .sort((a, b) => {
      if (a === "unspecified") return 1;
      if (b === "unspecified") return -1;
      return a.localeCompare(b);
    });
  for (const country of countries) countrySel.appendChild(opt(country, country));

  for (const failure of FAILURE_MODES) failureSel.appendChild(opt(failure, pretty(failure)));
  for (const context of CONTEXTS) {
    const exists = state.all.some((row) => (row.deployment_context?.situational_factor || "unspecified") === context);
    if (exists) contextSel.appendChild(opt(context, pretty(context)));
  }
  for (const harm of HARMS) harmSel.appendChild(opt(harm, harm));
  for (const stage of INTERVENTION_STAGES) interventionSel.appendChild(opt(stage, pretty(stage)));

  function syncCompareControl() {
    const primary = sectorSel.value;
    const previous = state.compareSector;
    compareSel.innerHTML = "";
    if (primary === "all") {
      compareSel.appendChild(opt("none", "Select a sector first"));
      compareSel.value = "none";
      compareSel.disabled = true;
      compareSel.title = "Select a primary sector first";
      state.compareSector = "none";
      return;
    }

    compareSel.disabled = false;
    compareSel.title = "Compare the selected sector against another sector over time";
    compareSel.appendChild(opt("none", "(off)"));
    for (const sector of sectors) {
      if (sector !== primary) compareSel.appendChild(opt(sector, pretty(sector)));
    }
    const stillValid = previous !== "none" && previous !== primary && sectors.includes(previous);
    state.compareSector = stillValid ? previous : "none";
    compareSel.value = state.compareSector;
  }

  sectorSel.addEventListener("change", () => {
    state.filter.sector = sectorSel.value;
    syncCompareControl();
    refresh();
  });
  compareSel.addEventListener("change", () => {
    state.compareSector = compareSel.value;
    refresh();
  });
  countrySel.addEventListener("change", () => {
    state.filter.country = countrySel.value;
    refresh();
  });
  failureSel.addEventListener("change", () => {
    state.filter.failure_mode = failureSel.value;
    refresh();
  });
  contextSel.addEventListener("change", () => {
    state.filter.situational_factor = contextSel.value;
    refresh();
  });
  harmSel.addEventListener("change", () => {
    state.filter.harm = harmSel.value;
    refresh();
  });
  interventionSel.addEventListener("change", () => {
    state.filter.missed_intervention_stage = interventionSel.value;
    refresh();
  });
  heatmapModeSel.addEventListener("change", () => {
    state.heatmapMode = heatmapModeSel.value;
    updateHeatmapText();
    refresh();
  });
  search.addEventListener("input", () => {
    state.filter.search = search.value.trim().toLowerCase();
    refresh();
  });
  reset.addEventListener("click", () => {
    state.filter = {
      sector: "all",
      country: "all",
      failure_mode: "all",
      situational_factor: "all",
      harm: "all",
      missed_intervention_stage: "all",
      year: null,
      search: "",
    };
    state.heatmapMode = "failure_mode";
    state.compareSector = "none";
    state.selectedIncidentId = null;
    sectorSel.value = "all";
    countrySel.value = "all";
    failureSel.value = "all";
    contextSel.value = "all";
    harmSel.value = "all";
    interventionSel.value = "all";
    heatmapModeSel.value = "failure_mode";
    search.value = "";
    syncCompareControl();
    updateHeatmapText();
    refresh();
  });

  syncCompareControl();
  updateHeatmapText();
}

function opt(value, label) {
  const option = document.createElement("option");
  option.value = value;
  option.textContent = label;
  return option;
}

function updateHeatmapText() {
  const missedMode = state.heatmapMode === "missed_intervention_stage";
  document.getElementById("heatmap-title").textContent = missedMode
    ? "Sector × Missed Intervention Stage"
    : "Sector × Failure Mode";
  document.getElementById("heatmap-subtitle").textContent = missedMode
    ? "Within each sector, where was a documented opportunity for intervention missed? “Not documented” does not mean prevention was impossible."
    : "Within each sector, what share of incidents fell into each failure category?";
}

// excludeKeys identifies chart axes that should remain comparable rather than
// collapsing to a single selected row or column.
function applyFilter(rows, excludeKeys = []) {
  const f = state.filter;
  const skip = new Set(excludeKeys);
  return rows.filter((row) => {
    if (!skip.has("sector") && f.sector !== "all" && getProjectSector(row) !== f.sector) return false;
    if (!skip.has("country") && f.country !== "all" && row.country !== f.country) return false;
    if (!skip.has("failure_mode") && f.failure_mode !== "all" && row.failure_mode !== f.failure_mode) return false;
    const context = row.deployment_context?.situational_factor || "unspecified";
    if (!skip.has("situational_factor") && f.situational_factor !== "all" && context !== f.situational_factor) return false;
    if (!skip.has("harm") && f.harm !== "all" && row.harm !== f.harm) return false;
    if (!skip.has("missed_intervention_stage") && f.missed_intervention_stage !== "all" && getInterventionStage(row) !== f.missed_intervention_stage) return false;
    if (!skip.has("year") && f.year != null && Number((row.date || "").slice(0, 4)) !== f.year) return false;
    if (!skip.has("search") && f.search) {
      const haystack = [row.title, row.rationale, row.warning_signal].filter(Boolean).join(" ").toLowerCase();
      if (!haystack.includes(f.search)) return false;
    }
    return true;
  });
}

function refresh() {
  const filtered = applyFilter(state.all);
  if (state.selectedIncidentId != null && !filtered.some((row) => row.incident_id === state.selectedIncidentId)) {
    state.selectedIncidentId = null;
  }

  const activeBits = [];
  if (state.filter.sector !== "all") activeBits.push(pretty(state.filter.sector));
  if (state.filter.country !== "all") activeBits.push(state.filter.country);
  if (state.filter.failure_mode !== "all") activeBits.push(pretty(state.filter.failure_mode));
  if (state.filter.situational_factor !== "all") activeBits.push(pretty(state.filter.situational_factor));
  if (state.filter.harm !== "all") activeBits.push(state.filter.harm);
  if (state.filter.missed_intervention_stage !== "all") activeBits.push(pretty(state.filter.missed_intervention_stage));
  if (state.filter.year != null) activeBits.push(String(state.filter.year));
  if (state.filter.search) activeBits.push(`"${state.filter.search}"`);
  if (state.compareSector !== "none") activeBits.push(`vs ${pretty(state.compareSector)}`);
  document.getElementById("status").textContent =
    `${filtered.length} of ${state.all.length} incidents` +
    (activeBits.length ? ` · filters: ${activeBits.join(" · ")}` : "");

  renderSelectionSummary(filtered);

  let compareRows = null;
  let compareLabel = null;
  if (state.filter.sector !== "all" && state.compareSector !== "none") {
    const savedSector = state.filter.sector;
    state.filter.sector = state.compareSector;
    compareRows = applyFilter(state.all);
    state.filter.sector = savedSector;
    compareLabel = pretty(state.compareSector);
  }

  renderTimeline(
    document.getElementById("timeline"),
    state.all,
    filtered,
    state.filter.year,
    (year) => {
      state.filter.year = year;
      refresh();
    },
    compareRows,
    compareLabel
  );

  const sankeyEl = document.getElementById("sankey");
  const emptyEl = document.getElementById("sankey-empty");
  if (filtered.length < 5) {
    sankeyEl.innerHTML = "";
    emptyEl.hidden = false;
    emptyEl.textContent =
      `${filtered.length} incident${filtered.length === 1 ? "" : "s"} match this filter. ` +
      "Too few for a meaningful flow. See the incidents listed below.";
  } else {
    emptyEl.hidden = true;
    renderSankey(sankeyEl, filtered);
  }

  const heatmapColumnKey = state.heatmapMode === "missed_intervention_stage"
    ? "missed_intervention_stage"
    : "failure_mode";
  const heatmapCohort = applyFilter(state.all, ["sector", heatmapColumnKey]);
  renderHeatmap(
    document.getElementById("heatmap"),
    heatmapCohort,
    {
      sector: state.filter.sector === "all" ? null : state.filter.sector,
      columnValue: state.filter[heatmapColumnKey] === "all" ? null : state.filter[heatmapColumnKey],
    },
    state.heatmapMode,
    (sector, columnValue) => {
      state.filter.sector = sector;
      document.getElementById("sector-filter").value = sector;
      state.filter[heatmapColumnKey] = columnValue;
      if (heatmapColumnKey === "failure_mode") {
        document.getElementById("failure-filter").value = columnValue;
      } else {
        document.getElementById("intervention-filter").value = columnValue;
      }
      // Selecting a heatmap row also creates a valid primary sector for comparison.
      const changeEvent = new Event("change");
      document.getElementById("sector-filter").dispatchEvent(changeEvent);
    }
  );

  renderDetail(
    document.getElementById("incident-list"),
    document.getElementById("incident-detail"),
    filtered,
    state.selectedIncidentId,
    (id) => {
      state.selectedIncidentId = id;
      refresh();
    }
  );
}

init();
