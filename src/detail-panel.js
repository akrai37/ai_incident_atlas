// Incident list + per-incident chain detail with missed-intervention annotation.

export function renderDetail(listEl, detailEl, rows, selectedId, onSelect, harmColors) {
  listEl.innerHTML = "";
  for (const r of rows.slice(0, 100)) {
    const div = document.createElement("div");
    div.className = "incident-row" + (r.incident_id === selectedId ? " active" : "");
    div.innerHTML =
      `<div class="sector">${r.deployment_context?.sector?.replace(/_/g, " ") || ""}</div>` +
      `<div>${escapeHtml(r.title)}</div>`;
    div.addEventListener("click", () => onSelect(r.incident_id));
    listEl.appendChild(div);
  }

  if (rows.length > 100) {
    const more = document.createElement("div");
    more.className = "incident-row";
    more.style.color = "var(--muted)";
    more.textContent = `…and ${rows.length - 100} more (filter further to narrow)`;
    listEl.appendChild(more);
  }

  // Detail panel
  detailEl.innerHTML = "";
  const incident = rows.find((r) => r.incident_id === selectedId);
  if (!incident) {
    detailEl.innerHTML = `<p style="color:var(--muted)">Click an incident above to see its escalation chain.</p>`;
    return;
  }

  const missed = incident.missed_intervention_stage;
  const stages = [
    {
      key: "warning_signal",
      label: "Warning",
      value: incident.warning_signal || "no documented warning",
    },
    { key: "failure_mode", label: "Failure mode", value: incident.failure_mode },
    {
      key: "deployment_context",
      label: "Context",
      value:
        (incident.deployment_context?.sector || "?") +
        " / " +
        (incident.deployment_context?.situational_factor || "?"),
    },
    { key: "harm", label: "Harm", value: incident.harm },
  ];

  const chainHtml = stages
    .map((s, i) => {
      const isMissed = s.key === missed;
      const cls = "chain-stage" + (isMissed ? " missed" : "");
      const stage =
        `<div class="${cls}">` +
        `<span class="label">${s.label}${isMissed ? " · intervention point" : ""}</span>` +
        `${escapeHtml(String(s.value).replace(/_/g, " "))}</div>`;
      const arrow = i < stages.length - 1 ? '<span class="chain-arrow">→</span>' : "";
      return stage + arrow;
    })
    .join("");

  detailEl.innerHTML = `
    <h3 style="margin:0 0 8px;font-size:15px;">${escapeHtml(incident.title)}</h3>
    <div class="chain">${chainHtml}</div>
    <p class="rationale">${escapeHtml(incident.rationale || "")}</p>
    ${
      missed
        ? `<p style="font-size:12px;color:var(--accent);"><strong>Missed intervention point:</strong> ${missed.replace(/_/g, " ")}. annotated retrospectively from the source report.</p>`
        : `<p style="font-size:12px;color:var(--muted);">No prior warning or skipped intervention documented in the source.</p>`
    }
  `;
}

function escapeHtml(s) {
  return String(s ?? "")
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;");
}
