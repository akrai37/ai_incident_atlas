// Loads pathways.json and orchestrates linked viz + filtering.
import { renderSankey } from "./sankey.js?v=7";
import { renderHeatmap } from "./heatmap.js?v=7";
import { renderDetail } from "./detail-panel.js?v=7";

const HARM_COLORS = {
  physical: "var(--harm-physical)",
  economic: "var(--harm-economic)",
  discriminatory: "var(--harm-discriminatory)",
  psychological: "var(--harm-psychological)",
  reputational: "var(--harm-reputational)",
  informational: "var(--harm-informational)",
};

const state = {
  all: [],
  filter: { sector: "all", failure_mode: null },
  selectedIncidentId: null,
};

async function init() {
  const resp = await fetch("data/extracted/pathways.json");
  if (!resp.ok) {
    document.getElementById("status").textContent =
      "Could not load pathways.json. run scripts/extract.py first.";
    return;
  }
  let raw = await resp.json();
  // Drop any rows with extraction errors
  state.all = raw.filter((r) => !r._error && r.failure_mode && r.harm);

  // Populate sector filter
  const sectors = Array.from(
    new Set(state.all.map((d) => d.deployment_context?.sector).filter(Boolean))
  ).sort();
  const sel = document.getElementById("sector-filter");
  for (const s of sectors) {
    const opt = document.createElement("option");
    opt.value = s;
    opt.textContent = s.replace(/_/g, " ");
    sel.appendChild(opt);
  }
  sel.addEventListener("change", () => {
    state.filter.sector = sel.value;
    state.filter.failure_mode = null;
    refresh();
  });
  document.getElementById("reset").addEventListener("click", () => {
    state.filter = { sector: "all", failure_mode: null };
    sel.value = "all";
    refresh();
  });

  refresh();
}

function applyFilter(rows) {
  return rows.filter((r) => {
    if (state.filter.sector !== "all" && r.deployment_context?.sector !== state.filter.sector)
      return false;
    if (state.filter.failure_mode && r.failure_mode !== state.filter.failure_mode)
      return false;
    return true;
  });
}

function refresh() {
  const filtered = applyFilter(state.all);
  document.getElementById("status").textContent =
    `${filtered.length} of ${state.all.length} incidents shown`;

  // Sankey: hide when too sparse
  const sankeyEl = document.getElementById("sankey");
  const emptyEl = document.getElementById("sankey-empty");
  if (filtered.length < 5) {
    sankeyEl.innerHTML = "";
    emptyEl.hidden = false;
    emptyEl.textContent =
      `${filtered.length} incident${filtered.length === 1 ? "" : "s"} match this filter. ` +
      `too few for a meaningful flow. See the incidents listed below.`;
  } else {
    emptyEl.hidden = true;
    renderSankey(sankeyEl, filtered, HARM_COLORS);
  }

  // Heatmap: always renders against full dataset; highlight current selection
  renderHeatmap(document.getElementById("heatmap"), state.all, state.filter, (sector, fm) => {
    state.filter.sector = sector;
    state.filter.failure_mode = fm;
    document.getElementById("sector-filter").value = sector;
    refresh();
  });

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
