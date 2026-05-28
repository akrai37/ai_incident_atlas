// Heatmap: rows = sector, cols = failure_mode, cell = row-normalized rate.
// Tooltip shows raw count + percentage.

const FAILURE_MODES = ["data_bias", "model_error", "spec_gap", "oversight_failure", "misuse"];

export function renderHeatmap(el, allRows, filter, onCellClick) {
  el.innerHTML = "";

  // Tally per sector, then drop sectors with fewer than 5 incidents. too few
  // to produce honest percentages (e.g. 1 of 4 = 25% misleadingly looks meaningful).
  const MIN_SECTOR_N = 5;
  const allSectors = Array.from(
    new Set(allRows.map((d) => d.deployment_context?.sector).filter(Boolean))
  );
  const counts = {};
  for (const s of allSectors) counts[s] = { _total: 0 };
  for (const r of allRows) {
    const s = r.deployment_context?.sector;
    if (!s) continue;
    counts[s][r.failure_mode] = (counts[s][r.failure_mode] || 0) + 1;
    counts[s]._total += 1;
  }
  const sectors = allSectors
    .filter((s) => counts[s]._total >= MIN_SECTOR_N)
    .sort();

  const margin = { top: 20, right: 60, bottom: 100, left: 140 };
  const cellSize = 64;
  const width = margin.left + cellSize * FAILURE_MODES.length + margin.right;
  const height = margin.top + cellSize * sectors.length + margin.bottom;

  const svg = d3
    .select(el)
    .append("svg")
    .attr("viewBox", `0 0 ${width} ${height}`);

  // Push low rates into a darker part of the scale so text stays readable.
  const color = d3.scaleSequential(d3.interpolateOranges).domain([-0.1, 0.6]);

  // Row labels (sectors)
  svg
    .append("g")
    .attr("transform", `translate(${margin.left - 8}, ${margin.top})`)
    .selectAll("text")
    .data(sectors)
    .join("text")
    .attr("y", (_, i) => i * cellSize + cellSize / 2)
    .attr("dy", "0.35em")
    .attr("text-anchor", "end")
    .attr("class", "axis-label")
    .text((d) => d.replace(/_/g, " "));

  // Column labels (failure modes). rotated 35° with right-side anchor so the
  // text grows up-and-right from the cell edge, not down-and-right into clipping.
  svg
    .append("g")
    .attr("transform", `translate(${margin.left}, ${margin.top + sectors.length * cellSize + 14})`)
    .selectAll("text")
    .data(FAILURE_MODES)
    .join("text")
    .attr("class", "axis-label")
    .attr("text-anchor", "end")
    .attr("transform", (_, i) => `translate(${i * cellSize + cellSize / 2}, 0) rotate(-40)`)
    .text((d) => d.replace(/_/g, " "));

  // Cells
  const g = svg.append("g").attr("transform", `translate(${margin.left}, ${margin.top})`);
  for (const [si, sector] of sectors.entries()) {
    for (const [fi, fm] of FAILURE_MODES.entries()) {
      const count = counts[sector]?.[fm] || 0;
      const total = counts[sector]._total || 1;
      const rate = count / total;
      const isSelected = filter.sector === sector && filter.failure_mode === fm;
      const cellG = g.append("g");
      const isEmpty = count === 0;
      const rect = cellG
        .append("rect")
        .attr("x", fi * cellSize)
        .attr("y", si * cellSize)
        .attr("width", cellSize - 2)
        .attr("height", cellSize - 2)
        .attr("class", `cell${isSelected ? " selected" : ""}${isEmpty ? " empty" : ""}`)
        .attr("fill", isEmpty ? "#f3eee2" : color(rate))
        .style("cursor", isEmpty ? "not-allowed" : "pointer")
        .style("opacity", isEmpty ? 0.4 : 1);
      if (!isEmpty) {
        rect.on("click", () => onCellClick(sector, fm));
      }
      rect.append("title").text(
        `${sector.replace(/_/g, " ")} × ${fm.replace(/_/g, " ")}\n` +
          (isEmpty
            ? "0 incidents. no data"
            : `${count} incidents (${(rate * 100).toFixed(0)}% of sector)`)
      );
      if (count > 0) {
        cellG
          .append("text")
          .attr("class", "cell-label")
          .attr("x", fi * cellSize + (cellSize - 2) / 2)
          .attr("y", si * cellSize + (cellSize - 2) / 2)
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
