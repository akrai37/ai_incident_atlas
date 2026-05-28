// Timeline: bar chart of incidents per year.
// - Click a bar to filter the dataset to that year (click again to clear).
// - Scroll/pinch to zoom the x axis; drag to pan; double-click to reset.
// - Optional `compareRows` overlays a second sector's counts in a teal tone.
//
// Backdrop = full dataset in pale grey. Main overlay = current filter in
// orange. Compare overlay = secondary cohort in teal (when provided).

export function renderTimeline(el, allRows, filteredRows, selectedYear, onYearClick, compareRows, compareLabel) {
  el.innerHTML = "";
  const w = el.clientWidth || 800;
  const h = 170;
  const margin = { top: 18, right: 16, bottom: 30, left: 36 };

  const countYears = (rows) => {
    const c = {};
    for (const r of rows || []) {
      const y = (r.date || "").slice(0, 4);
      if (!y || isNaN(+y)) continue;
      c[y] = (c[y] || 0) + 1;
    }
    return c;
  };
  const allCounts = countYears(allRows);
  const filtCounts = countYears(filteredRows);
  const cmpCounts = compareRows ? countYears(compareRows) : null;

  const allYears = Object.keys(allCounts).map(Number).sort((a, b) => a - b);
  if (allYears.length === 0) return;
  const yMin = allYears[0];
  const yMax = allYears[allYears.length - 1];
  const yearList = [];
  for (let y = yMin; y <= yMax; y++) yearList.push(y);

  const maxCount = Math.max(...Object.values(allCounts));

  const xBase = d3
    .scaleBand()
    .domain(yearList)
    .range([margin.left, w - margin.right])
    .padding(0.18);
  const y = d3
    .scaleLinear()
    .domain([0, maxCount])
    .nice()
    .range([h - margin.bottom, margin.top]);

  const svg = d3
    .select(el)
    .append("svg")
    .attr("viewBox", `0 0 ${w} ${h}`)
    .style("cursor", "grab");

  // clipPath so zoomed bars don't draw over the y-axis
  const clipId = `tl-clip-${Math.random().toString(36).slice(2, 8)}`;
  svg
    .append("defs")
    .append("clipPath")
    .attr("id", clipId)
    .append("rect")
    .attr("x", margin.left)
    .attr("y", 0)
    .attr("width", w - margin.left - margin.right)
    .attr("height", h);

  // y axis (static)
  svg
    .append("g")
    .attr("class", "tl-y-axis")
    .attr("transform", `translate(${margin.left}, 0)`)
    .call(d3.axisLeft(y).ticks(4).tickSize(-w + margin.left + margin.right))
    .call((g) => g.select(".domain").remove())
    .call((g) => g.selectAll(".tick line").attr("stroke", "#e9e2d3"))
    .call((g) => g.selectAll(".tick text").attr("fill", "var(--muted)").attr("font-size", 10));

  // Inner group that gets zoom-transformed (x only).
  const inner = svg.append("g").attr("clip-path", `url(#${clipId})`);

  // x axis (re-rendered on zoom)
  const xAxisG = svg
    .append("g")
    .attr("class", "tl-x-axis")
    .attr("transform", `translate(0, ${h - margin.bottom})`);

  // Backdrop bars (full unfiltered counts in pale grey)
  const backdrop = inner
    .append("g")
    .selectAll("rect.backdrop")
    .data(yearList)
    .join("rect")
    .attr("class", "backdrop")
    .attr("y", (d) => y(allCounts[d] || 0))
    .attr("height", (d) => y(0) - y(allCounts[d] || 0))
    .attr("fill", "#e9e2d3");

  // Active filter bars
  const active = inner
    .append("g")
    .selectAll("rect.bar")
    .data(yearList)
    .join("rect")
    .attr("class", "tl-bar")
    .attr("y", (d) => y(filtCounts[d] || 0))
    .attr("height", (d) => y(0) - y(filtCounts[d] || 0))
    .attr("fill", (d) => (selectedYear === d ? "var(--accent)" : "#c66a35"))
    .attr("opacity", (d) => (selectedYear == null || selectedYear === d ? 1 : 0.5))
    .style("cursor", "pointer")
    .on("click", (event, d) => {
      event.stopPropagation();
      onYearClick(selectedYear === d ? null : d);
    });
  active.append("title").text((d) =>
    `${d}: ${filtCounts[d] || 0} matching (of ${allCounts[d] || 0} total)`
  );

  // Compare overlay (drawn as half-width bars on the right side of each year)
  let cmp = null;
  if (cmpCounts) {
    cmp = inner
      .append("g")
      .selectAll("rect.cmp")
      .data(yearList)
      .join("rect")
      .attr("class", "tl-cmp")
      .attr("y", (d) => y(cmpCounts[d] || 0))
      .attr("height", (d) => y(0) - y(cmpCounts[d] || 0))
      .attr("fill", "#2f8073");
    cmp.append("title").text((d) =>
      `${d}: ${cmpCounts[d] || 0} ${compareLabel || "compare"}`
    );
  }

  // Legend
  const legend = svg.append("g").attr("transform", `translate(${margin.left + 4}, ${margin.top - 4})`);
  const legendItems = [
    { color: "#e9e2d3", label: "All incidents" },
    { color: "#c66a35", label: "Current filter" },
  ];
  if (cmpCounts) legendItems.push({ color: "#2f8073", label: compareLabel || "Compare" });
  let lx = 0;
  for (const it of legendItems) {
    const g = legend.append("g").attr("transform", `translate(${lx}, 0)`);
    g.append("rect").attr("width", 10).attr("height", 10).attr("y", -10).attr("fill", it.color);
    const text = g.append("text").attr("x", 14).attr("y", -1).attr("font-size", 10).attr("fill", "var(--muted)").text(it.label);
    lx += 28 + text.node().getComputedTextLength();
  }

  // Zoom: scroll/pinch to zoom x, drag to pan, double-click to reset
  const updatePositions = (transform) => {
    const t = transform || d3.zoomIdentity;
    // Build a transformed band scale by stretching the base range
    const r0 = margin.left;
    const r1 = w - margin.right;
    const range = r1 - r0;
    const newR0 = r0 + t.x;
    const newR1 = newR0 + range * t.k;
    const xZ = xBase.copy().range([newR0, newR1]);
    const bw = xZ.bandwidth();

    const setRect = (sel, offsetFn = () => 0, widthFn = () => bw) =>
      sel.attr("x", (d) => xZ(d) + offsetFn()).attr("width", widthFn());

    if (cmp) {
      // Split each year-band: main on left half, compare on right half
      setRect(backdrop, () => 0, () => bw);
      setRect(active, () => 0, () => bw / 2);
      setRect(cmp, () => bw / 2, () => bw / 2);
    } else {
      setRect(backdrop);
      setRect(active);
    }

    // X-axis ticks: at high zoom, only show every Nth year for legibility
    const tickStep = Math.max(1, Math.round(yearList.length / (12 * t.k)));
    const ticks = yearList.filter((_, i) => i % tickStep === 0);
    xAxisG
      .call(
        d3
          .axisBottom(xZ)
          .tickValues(ticks)
          .tickFormat((d) => `'${String(d).slice(2)}`)
          .tickSize(0)
      )
      .call((g) => g.select(".domain").remove())
      .call((g) => g.selectAll(".tick text").attr("fill", "var(--muted)").attr("font-size", 10));
  };

  updatePositions(d3.zoomIdentity);

  const zoom = d3
    .zoom()
    .scaleExtent([1, 8])
    .translateExtent([[margin.left, 0], [w - margin.right, h]])
    .extent([[margin.left, 0], [w - margin.right, h]])
    .on("zoom", (event) => updatePositions(event.transform));

  svg.call(zoom);
  svg.on("dblclick.zoom", () => svg.transition().duration(250).call(zoom.transform, d3.zoomIdentity));

  // Zoom hint
  svg
    .append("text")
    .attr("x", w - margin.right)
    .attr("y", margin.top - 4)
    .attr("text-anchor", "end")
    .attr("font-size", 10)
    .attr("fill", "var(--muted)")
    .text("scroll to zoom · drag to pan · dbl-click to reset");
}
