// Heatmap: rows = fixed project sector; columns switch between failure mode and
// documented missed-intervention stage. Cells show row-normalized rates.

function getProjectSector(record) {
  return record.sector_heuristic || record.deployment_context?.sector || "unknown";
}

const FAILURE_MODES = ["data_bias", "model_error", "spec_gap", "oversight_failure", "misuse"];
const MISSED_INTERVENTION_STAGES = ["warning_signal", "failure_mode", "deployment_context", "not_documented"];

function getColumnValue(record, mode) {
  if (mode === "missed_intervention_stage") {
    return record.missed_intervention_stage || "not_documented";
  }
  return record.failure_mode;
}

function pretty(value) {
  return String(value || "").replace(/_/g, " ");
}

export function renderHeatmap(el, allRows, filter, mode, onCellClick) {
  el.innerHTML = "";
  const columns = mode === "missed_intervention_stage" ? MISSED_INTERVENTION_STAGES : FAILURE_MODES;

  const MIN_SECTOR_N = 5;
  const allSectors = Array.from(new Set(allRows.map((row) => getProjectSector(row)).filter(Boolean)));
  const counts = {};
  for (const sector of allSectors) counts[sector] = { _total: 0 };
  for (const row of allRows) {
    const sector = getProjectSector(row);
    const columnValue = getColumnValue(row, mode);
    if (!sector || !columnValue) continue;
    counts[sector][columnValue] = (counts[sector][columnValue] || 0) + 1;
    counts[sector]._total += 1;
  }
  const sectors = allSectors.filter((sector) => counts[sector]._total >= MIN_SECTOR_N).sort();

  const margin = { top: 20, right: 46, bottom: 112, left: 126 };
  const cellSize = 64;
  const width = margin.left + cellSize * columns.length + margin.right;
  const height = margin.top + cellSize * sectors.length + margin.bottom;

  const svg = d3.select(el).append("svg").attr("viewBox", `0 0 ${width} ${height}`);
  const color = d3.scaleSequential(d3.interpolateOranges).domain([-0.1, 0.6]);

  svg
    .append("g")
    .attr("transform", `translate(${margin.left - 8}, ${margin.top})`)
    .selectAll("text")
    .data(sectors)
    .join("text")
    .attr("y", (_, index) => index * cellSize + cellSize / 2)
    .attr("dy", "0.35em")
    .attr("text-anchor", "end")
    .attr("class", "axis-label")
    .style("fill", (sector) => (filter.sector === sector ? "var(--accent)" : null))
    .style("font-weight", (sector) => (filter.sector === sector ? 700 : null))
    .text((sector) => pretty(sector));

  svg
    .append("g")
    .attr("transform", `translate(${margin.left}, ${margin.top + sectors.length * cellSize + 14})`)
    .selectAll("text")
    .data(columns)
    .join("text")
    .attr("class", "axis-label")
    .attr("text-anchor", "end")
    .attr("transform", (_, index) => `translate(${index * cellSize + cellSize / 2}, 0) rotate(-40)`)
    .style("fill", (column) => (filter.columnValue === column ? "var(--accent)" : null))
    .style("font-weight", (column) => (filter.columnValue === column ? 700 : null))
    .text((column) => pretty(column));

  if (filter.sector && sectors.includes(filter.sector)) {
    const sectorIndex = sectors.indexOf(filter.sector);
    svg.append("rect")
      .attr("x", margin.left - 4)
      .attr("y", margin.top + sectorIndex * cellSize - 2)
      .attr("width", cellSize * columns.length + 4)
      .attr("height", cellSize + 2)
      .attr("fill", "none")
      .attr("stroke", "var(--accent)")
      .attr("stroke-width", 2)
      .attr("rx", 3)
      .style("pointer-events", "none");
  }

  if (filter.columnValue) {
    const columnIndex = columns.indexOf(filter.columnValue);
    if (columnIndex >= 0) {
      svg.append("rect")
        .attr("x", margin.left + columnIndex * cellSize - 2)
        .attr("y", margin.top - 4)
        .attr("width", cellSize + 2)
        .attr("height", cellSize * sectors.length + 4)
        .attr("fill", "none")
        .attr("stroke", "var(--accent)")
        .attr("stroke-width", 2)
        .attr("rx", 3)
        .style("pointer-events", "none");
    }
  }

  const grid = svg.append("g").attr("transform", `translate(${margin.left}, ${margin.top})`);
  for (const [sectorIndex, sector] of sectors.entries()) {
    for (const [columnIndex, column] of columns.entries()) {
      const count = counts[sector]?.[column] || 0;
      const total = counts[sector]._total || 1;
      const rate = count / total;
      const empty = count === 0;
      const selected = filter.sector === sector && filter.columnValue === column;
      const cell = grid.append("g");
      const rect = cell.append("rect")
        .attr("x", columnIndex * cellSize)
        .attr("y", sectorIndex * cellSize)
        .attr("width", cellSize - 2)
        .attr("height", cellSize - 2)
        .attr("class", `cell${selected ? " selected" : ""}${empty ? " empty" : ""}`)
        .attr("fill", empty ? "#f3eee2" : color(rate))
        .style("cursor", empty ? "not-allowed" : "pointer")
        .style("opacity", empty ? 0.4 : 1);
      if (!empty) rect.on("click", () => onCellClick(sector, column));
      rect.append("title").text(
        `${pretty(sector)} × ${pretty(column)}\n` +
        (empty ? "0 incidents" : `${count} incidents (${(rate * 100).toFixed(0)}% of sector)`)
      );
      if (!empty) {
        cell.append("text")
          .attr("class", "cell-label")
          .attr("x", columnIndex * cellSize + (cellSize - 2) / 2)
          .attr("y", sectorIndex * cellSize + (cellSize - 2) / 2)
          .attr("dy", "0.35em")
          .style("fill", rate > 0.35 ? "#fff" : "#1d1f24")
          .style("font-weight", 700)
          .style("paint-order", "stroke")
          .style("stroke", rate > 0.35 ? "rgba(0,0,0,0.35)" : "rgba(255,255,255,0.9)")
          .style("stroke-width", "2.2px")
          .text(`${(rate * 100).toFixed(0)}%`);
      }
    }
  }
}
