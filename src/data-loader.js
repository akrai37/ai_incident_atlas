// Loads pathways.json and orchestrates linked viz + filtering.
import { renderSankey } from "./sankey.js?v=10";
import { renderHeatmap } from "./heatmap.js?v=10";
import { renderDetail } from "./detail-panel.js?v=10";
import { renderTimeline } from "./timeline.js?v=10";

const HARM_COLORS = {
  physical: "var(--harm-physical)",
  economic: "var(--harm-economic)",
  discriminatory: "var(--harm-discriminatory)",
  psychological: "var(--harm-psychological)",
  reputational: "var(--harm-reputational)",
  informational: "var(--harm-informational)",
};

const FAILURE_MODES = ["data_bias", "model_error", "spec_gap", "oversight_failure", "misuse"];
const HARMS = ["physical", "economic", "discriminatory", "psychological", "reputational", "informational"];
// Same threshold the heatmap uses to hide thin rows. Keep these in sync.
const MIN_SECTOR_N = 5;

const state = {
  all: [],
  filter: {
    sector: "all",
    country: "all",
    failure_mode: "all",
    harm: "all",
    year: null,
    search: "",
  },
  selectedIncidentId: null,
};

async function init() {
  const resp = await fetch("data/extracted/pathways.json");
  if (!resp.ok) {
    document.getElementById("status").textContent =
      "Could not load pathways.json. run scripts/extract.py first.";
    return;
  }
  const raw = await resp.json();
  state.all = raw.filter((r) => !r._error && r.failure_mode && r.harm);

  setupControls();
  refresh();
}

function setupControls() {
  const sectorSel = document.getElementById("sector-filter");
  const countrySel = document.getElementById("country-filter");
  const failureSel = document.getElementById("failure-filter");
  const harmSel = document.getElementById("harm-filter");
  const search = document.getElementById("search");
  const reset = document.getElementById("reset");

  // Only list sectors that the heatmap also renders (n >= MIN_SECTOR_N).
  // Otherwise a user can pick e.g. "manufacturing" (n=1) and find the heatmap
  // silently has no row for it. Sankey + incident list still see all sectors.
  const sectorCounts = {};
  for (const r of state.all) {
    const s = r.deployment_context?.sector;
    if (s) sectorCounts[s] = (sectorCounts[s] || 0) + 1;
  }
  const sectors = Object.keys(sectorCounts)
    .filter((s) => sectorCounts[s] >= MIN_SECTOR_N)
    .sort();
  for (const s of sectors) {
    sectorSel.appendChild(opt(s, s.replace(/_/g, " ")));
  }

  const countries = Array.from(
    new Set(state.all.map((d) => d.country).filter(Boolean))
  ).sort((a, b) => {
    // Put "unspecified" last
    if (a === "unspecified") return 1;
    if (b === "unspecified") return -1;
    return a.localeCompare(b);
  });
  for (const c of countries) countrySel.appendChild(opt(c, c));

  for (const f of FAILURE_MODES) failureSel.appendChild(opt(f, f.replace(/_/g, " ")));
  for (const h of HARMS) harmSel.appendChild(opt(h, h));

  sectorSel.addEventListener("change", () => {
    state.filter.sector = sectorSel.value;
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
  harmSel.addEventListener("change", () => {
    state.filter.harm = harmSel.value;
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
      harm: "all",
      year: null,
      search: "",
    };
    sectorSel.value = "all";
    countrySel.value = "all";
    failureSel.value = "all";
    harmSel.value = "all";
    search.value = "";
    refresh();
  });
}

function opt(value, label) {
  const o = document.createElement("option");
  o.value = value;
  o.textContent = label;
  return o;
}

// excludeKeys = filter dimensions to skip. Used by the heatmap so it does NOT
// collapse to a single row when the user filters by sector or failure_mode
// (those are the heatmap's own two axes).
function applyFilter(rows, excludeKeys = []) {
  const f = state.filter;
  const skip = new Set(excludeKeys);
  return rows.filter((r) => {
    if (!skip.has("sector") && f.sector !== "all" && r.deployment_context?.sector !== f.sector) return false;
    if (!skip.has("country") && f.country !== "all" && r.country !== f.country) return false;
    if (!skip.has("failure_mode") && f.failure_mode !== "all" && r.failure_mode !== f.failure_mode) return false;
    if (!skip.has("harm") && f.harm !== "all" && r.harm !== f.harm) return false;
    if (!skip.has("year") && f.year != null) {
      const y = (r.date || "").slice(0, 4);
      if (Number(y) !== f.year) return false;
    }
    if (!skip.has("search") && f.search) {
      const hay = (r.title + " " + (r.rationale || "")).toLowerCase();
      if (!hay.includes(f.search)) return false;
    }
    return true;
  });
}

function refresh() {
  const filtered = applyFilter(state.all);
  const activeBits = [];
  if (state.filter.sector !== "all") activeBits.push(state.filter.sector.replace(/_/g, " "));
  if (state.filter.country !== "all") activeBits.push(state.filter.country);
  if (state.filter.failure_mode !== "all") activeBits.push(state.filter.failure_mode.replace(/_/g, " "));
  if (state.filter.harm !== "all") activeBits.push(state.filter.harm);
  if (state.filter.year != null) activeBits.push(String(state.filter.year));
  if (state.filter.search) activeBits.push(`"${state.filter.search}"`);
  const statusEl = document.getElementById("status");
  statusEl.textContent =
    `${filtered.length} of ${state.all.length} incidents` +
    (activeBits.length ? ` · filters: ${activeBits.join(" · ")}` : "");

  // Timeline
  renderTimeline(
    document.getElementById("timeline"),
    state.all,
    filtered,
    state.filter.year,
    (year) => {
      state.filter.year = year;
      refresh();
    }
  );

  // Sankey
  const sankeyEl = document.getElementById("sankey");
  const emptyEl = document.getElementById("sankey-empty");
  if (filtered.length < 5) {
    sankeyEl.innerHTML = "";
    emptyEl.hidden = false;
    emptyEl.textContent =
      `${filtered.length} incident${filtered.length === 1 ? "" : "s"} match this filter. ` +
      `Too few for a meaningful flow. See the incidents listed below.`;
  } else {
    emptyEl.hidden = true;
    renderSankey(sankeyEl, filtered, HARM_COLORS);
  }

  // Heatmap respects every filter EXCEPT its own two axes (sector + failure_mode).
  // If those weren't excluded, filtering by sector=healthcare would collapse the
  // heatmap to a single row, which is useless.
  const heatmapCohort = applyFilter(state.all, ["sector", "failure_mode"]);
  renderHeatmap(
    document.getElementById("heatmap"),
    heatmapCohort,
    {
      sector: state.filter.sector === "all" ? null : state.filter.sector,
      failure_mode: state.filter.failure_mode === "all" ? null : state.filter.failure_mode,
    },
    (sector, fm) => {
      state.filter.sector = sector;
      state.filter.failure_mode = fm;
      document.getElementById("sector-filter").value = sector;
      document.getElementById("failure-filter").value = fm;
      refresh();
    }
  );

  // Incident list + detail
  renderDetail(
    document.getElementById("incident-list"),
    document.getElementById("incident-detail"),
    filtered,
    state.selectedIncidentId,
    (id) => {
      state.selectedIncidentId = id;
      refresh();
    },
    HARM_COLORS
  );
}

init();
