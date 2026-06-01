// Incident list + per-incident chain detail with missed-intervention annotation.

function pretty(value) {
  return String(value || "").replace(/_/g, " ");
}

function projectSector(record) {
  return record.sector_heuristic || record.deployment_context?.sector || "";
}

function safeHttpUrl(url) {
  if (!url) return null;
  try {
    const parsed = new URL(url);
    return parsed.protocol === "https:" || parsed.protocol === "http:" ? parsed.href : null;
  } catch {
    return null;
  }
}

export function renderDetail(listEl, detailEl, rows, selectedId, onSelect) {
  listEl.innerHTML = "";
  for (const row of rows.slice(0, 100)) {
    const div = document.createElement("div");
    div.className = "incident-row" + (row.incident_id === selectedId ? " active" : "");
    div.innerHTML =
      `<div class="sector">${escapeHtml(pretty(projectSector(row)))}</div>` +
      `<div>${escapeHtml(row.title)}</div>`;
    div.addEventListener("click", () => onSelect(row.incident_id));
    listEl.appendChild(div);
  }

  if (rows.length > 100) {
    const more = document.createElement("div");
    more.className = "incident-row";
    more.style.color = "var(--muted)";
    more.textContent = `…and ${rows.length - 100} more (filter further to narrow)`;
    listEl.appendChild(more);
  }

  detailEl.innerHTML = "";
  const incident = rows.find((row) => row.incident_id === selectedId);
  if (!incident) {
    detailEl.innerHTML = `<p style="color:var(--muted)">Click an incident above to see its escalation chain.</p>`;
    return;
  }

  const missed = incident.missed_intervention_stage;
  const sourceUrl = safeHttpUrl(incident.primary_report_url);
  const extractedSector = incident.deployment_context?.sector || "?";
  const studySector = projectSector(incident) || "?";
  const stages = [
    { key: "warning_signal", label: "Warning", value: incident.warning_signal || "no documented warning" },
    { key: "failure_mode", label: "Failure mode", value: incident.failure_mode },
    { key: "deployment_context", label: "Context", value: `${extractedSector} / ${incident.deployment_context?.situational_factor || "?"}` },
    { key: "harm", label: "Harm", value: incident.harm },
  ];

  const chainHtml = stages.map((stage, index) => {
    const isMissed = stage.key === missed;
    const cls = "chain-stage" + (isMissed ? " missed" : "");
    const stageHtml =
      `<div class="${cls}">` +
      `<span class="label">${stage.label}${isMissed ? " · intervention point" : ""}</span>` +
      `${escapeHtml(pretty(stage.value))}</div>`;
    return stageHtml + (index < stages.length - 1 ? '<span class="chain-arrow">→</span>' : "");
  }).join("");

  detailEl.innerHTML = `
    <h3 style="margin:0 0 5px;font-size:15px;">${escapeHtml(incident.title)}</h3>
    <p class="detail-note" style="color:var(--muted);"><strong>Study sector:</strong> ${escapeHtml(pretty(studySector))}</p>
    ${sourceUrl ? `<a class="source-link" href="${escapeHtml(sourceUrl)}" target="_blank" rel="noopener noreferrer">Open source report ↗</a>` : ""}
    <div class="chain">${chainHtml}</div>
    <p class="rationale">${escapeHtml(incident.rationale || "")}</p>
    ${
      missed
        ? `<p class="detail-note" style="color:var(--accent);"><strong>Documented missed intervention stage:</strong> ${escapeHtml(pretty(missed))}. This label was extracted retrospectively from the report text.</p>`
        : `<p class="detail-note" style="color:var(--muted);">No clearly documented prior warning or skipped intervention was extracted from the source report. This does not mean prevention was impossible.</p>`
    }
  `;
}

function escapeHtml(value) {
  return String(value ?? "")
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;")
    .replaceAll("'", "&#39;");
}
