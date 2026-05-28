// Timeline: bar chart of incidents per year. Click a bar to filter the dataset
// to that year; click again (or "All years") to clear. Shows the full unfiltered
// distribution as a faint backdrop so the active filter is visible in context.

export function renderTimeline(el, allRows, filteredRows, selectedYear, onYearClick) {
  el.innerHTML = "";
  const w = el.clientWidth || 800;
  const h = 160;
  const margin = { top: 18, right: 16, bottom: 30, left: 36 };

  const years = (rows) => {
    const c = {};
    for (const r of rows) {
      const y = (r.date || "").slice(0, 4);
      if (!y || isNaN(+y)) continue;
      c[y] = (c[y] || 0) + 1;
    }
    return c;
  };
  const allCounts = years(allRows);
  const filtCounts = years(filteredRows);

  const allYears = Object.keys(allCounts).map(Number).sort((a, b) => a - b);
  if (allYears.length === 0) return;
  const yMin = allYears[0];
  const yMax = allYears[allYears.length - 1];
  const yearList = [];
  for (let y = yMin; y <= yMax; y++) yearList.push(y);

  const maxCount = Math.max(...Object.values(allCounts));

  const x = d3
    .scaleBand()
    .domain(yearList)
    .range([margin.left, w - margin.right])
    .padding(0.18);
  const y = d3
    .scaleLinear()
    .domain([0, maxCount])
    .nice()
    .range([h - margin.bottom, margin.top]);

  const svg = d3.select(el).append("svg").attr("viewBox", `0 0 ${w} ${h}`);

  // y axis
  svg
    .append("g")
    .attr("transform", `translate(${margin.left}, 0)`)
    .call(d3.axisLeft(y).ticks(4).tickSize(-w + margin.left + margin.right))
    .call((g) => g.select(".domain").remove())
    .call((g) => g.selectAll(".tick line").attr("stroke", "#e9e2d3"))
    .call((g) => g.selectAll(".tick text").attr("fill", "var(--muted)").attr("font-size", 10));

  // x axis
  svg
    .append("g")
    .attr("transform", `translate(0, ${h - margin.bottom})`)
    .call(d3.axisBottom(x).tickFormat((d) => `'${String(d).slice(2)}`).tickSize(0))
    .call((g) => g.select(".domain").remove())
    .call((g) => g.selectAll(".tick text").attr("fill", "var(--muted)").attr("font-size", 10));

  // Backdrop bars (full unfiltered counts in pale grey)
  svg
    .append("g")
    .selectAll("rect.backdrop")
    .data(yearList)
    .join("rect")
    .attr("class", "backdrop")
    .attr("x", (d) => x(d))
    .attr("y", (d) => y(allCounts[d] || 0))
    .attr("width", x.bandwidth())
    .attr("height", (d) => y(0) - y(allCounts[d] || 0))
    .attr("fill", "#e9e2d3");

  // Active bars (current filter counts in accent color)
  svg
    .append("g")
    .selectAll("rect.bar")
    .data(yearList)
    .join("rect")
    .attr("class", "tl-bar")
    .attr("x", (d) => x(d))
    .attr("y", (d) => y(filtCounts[d] || 0))
    .attr("width", x.bandwidth())
    .attr("height", (d) => y(0) - y(filtCounts[d] || 0))
    .attr("fill", (d) => (selectedYear === d ? "var(--accent)" : "#c66a35"))
    .attr("opacity", (d) => (selectedYear == null || selectedYear === d ? 1 : 0.5))
    .style("cursor", "pointer")
    .on("click", (_, d) => onYearClick(selectedYear === d ? null : d))
    .append("title")
    .text((d) =>
      `${d}: ${filtCounts[d] || 0} matching (of ${allCounts[d] || 0} total)`
    );
}
