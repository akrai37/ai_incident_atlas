// Sankey: warning_signal → failure_mode → deployment_context.situational_factor → harm
// Uses d3-sankey (loaded globally).

const STAGE_LABEL = {
  warning: "Warning",
  failure: "Failure mode",
  context: "Context",
  harm: "Harm",
};

export function renderSankey(el, rows, harmColors) {
  el.innerHTML = "";
  const width = el.clientWidth || 720;
  const height = 460;

  // Build node + link sets
  const nodeMap = new Map();
  const addNode = (stage, name) => {
    const key = `${stage}::${name}`;
    if (!nodeMap.has(key))
      nodeMap.set(key, { name, stage, label: name.replace(/_/g, " ") });
    return nodeMap.get(key);
  };

  const linkCounts = new Map();
  const addLink = (src, tgt) => {
    const key = `${src}::${tgt}`;
    linkCounts.set(key, (linkCounts.get(key) || 0) + 1);
  };

  for (const r of rows) {
    const warn = r.warning_signal ? "documented warning" : "no documented warning";
    const fail = r.failure_mode;
    const ctx = r.deployment_context?.situational_factor || "unspecified";
    const harm = r.harm;
    const wK = `warning::${warn}`;
    const fK = `failure::${fail}`;
    const cK = `context::${ctx}`;
    const hK = `harm::${harm}`;
    addNode("warning", warn);
    addNode("failure", fail);
    addNode("context", ctx);
    addNode("harm", harm);
    addLink(wK, fK);
    addLink(fK, cK);
    addLink(cK, hK);
  }

  const nodes = Array.from(nodeMap.values());
  const nodeIndex = new Map(nodes.map((n, i) => [`${n.stage}::${n.name}`, i]));
  // Link keys are "stageA::nameA::stageB::nameB". split into src and tgt
  // (names never contain "::" so this is safe).
  const links = Array.from(linkCounts, ([key, value]) => {
    const parts = key.split("::");
    const src = parts.slice(0, 2).join("::");
    const tgt = parts.slice(2).join("::");
    return { source: nodeIndex.get(src), target: nodeIndex.get(tgt), value };
  });

  // Reserve generous horizontal padding so labels on both ends don't get clipped.
  // Warning labels go LEFT of col 1; Harm labels go RIGHT of col 4. "discriminatory (44)"
  // and similar long labels need ~120 px of room beyond the node.
  const sankey = d3
    .sankey()
    .nodeWidth(14)
    .nodePadding(18)
    .extent([[210, 20], [width - 150, height - 10]]);

  const graph = sankey({
    nodes: nodes.map((d) => ({ ...d })),
    links: links.map((d) => ({ ...d })),
  });

  const svg = d3.select(el).append("svg").attr("viewBox", `0 0 ${width} ${height}`);

  // Stage headers
  const stagePositions = {};
  for (const n of graph.nodes) {
    if (!(n.stage in stagePositions)) stagePositions[n.stage] = n.x0;
  }
  svg
    .append("g")
    .selectAll("text")
    .data(Object.entries(stagePositions))
    .join("text")
    .attr("x", ([, x]) => x)
    .attr("y", 8)
    .attr("font-size", 10)
    .attr("fill", "#6b6f78")
    .attr("text-transform", "uppercase")
    .text(([k]) => STAGE_LABEL[k]);

  // Links
  svg
    .append("g")
    .selectAll("path")
    .data(graph.links)
    .join("path")
    .attr("class", "link")
    .attr("d", d3.sankeyLinkHorizontal())
    .attr("stroke", (d) => {
      const tgtNode = d.target;
      if (tgtNode.stage === "harm") {
        return getComputedStyle(document.documentElement)
          .getPropertyValue(`--harm-${tgtNode.name}`)
          .trim() || "#888";
      }
      return "#9aa0aa";
    })
    .attr("stroke-width", (d) => Math.max(1, d.width))
    .append("title")
    .text((d) => `${d.source.label} → ${d.target.label}: ${d.value}`);

  // Nodes
  const nodeG = svg.append("g").selectAll("g").data(graph.nodes).join("g").attr("class", "node");
  nodeG
    .append("rect")
    .attr("x", (d) => d.x0)
    .attr("y", (d) => d.y0)
    .attr("width", (d) => d.x1 - d.x0)
    .attr("height", (d) => d.y1 - d.y0)
    .attr("fill", (d) =>
      d.stage === "harm"
        ? getComputedStyle(document.documentElement)
            .getPropertyValue(`--harm-${d.name}`)
            .trim() || "#888"
        : "#3b4252"
    )
    .append("title")
    .text((d) => `${d.label} (${d.value})`);

  // Label placement by stage:
  //   warning (col 1): to the LEFT of the node
  //   failure (col 2): to the RIGHT of the node
  //   context (col 3): to the LEFT of the node
  //   harm    (col 4): to the RIGHT of the node
  // This alternation guarantees labels don't collide with neighboring columns.
  const sideForStage = { warning: "left", failure: "right", context: "right", harm: "right" };

  // Split label into at most 2 lines if it's long; suffix the count "(N)" onto the
  // last line so the value stays close to the name.
  const wrap = (label, value) => {
    const full = `${label} (${value})`;
    if (full.length <= 16) return [full];
    const words = label.split(" ");
    if (words.length === 1) return [`${label}`, `(${value})`];
    // Two-line: roughly half the words on each line, count on second line.
    const mid = Math.ceil(words.length / 2);
    return [words.slice(0, mid).join(" "), `${words.slice(mid).join(" ")} (${value})`];
  };

  const labels = nodeG
    .append("text")
    .attr("x", (d) => (sideForStage[d.stage] === "right" ? d.x1 + 6 : d.x0 - 6))
    .attr("y", (d) => (d.y1 + d.y0) / 2)
    .attr("text-anchor", (d) => (sideForStage[d.stage] === "right" ? "start" : "end"))
    .style("paint-order", "stroke")
    .style("stroke", "var(--bg)")
    .style("stroke-width", "3px")
    .style("font-weight", 500);

  labels.each(function (d) {
    const lines = wrap(d.label, d.value);
    const sel = d3.select(this);
    const lineHeight = 16;
    const offset = -((lines.length - 1) * lineHeight) / 2;
    lines.forEach((line, i) => {
      sel
        .append("tspan")
        .attr("x", sideForStage[d.stage] === "right" ? d.x1 + 6 : d.x0 - 6)
        .attr("dy", i === 0 ? `${offset}px` : `${lineHeight}px`)
        .text(line);
    });
  });
}
