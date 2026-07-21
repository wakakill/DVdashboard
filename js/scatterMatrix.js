// scatterMatrix.js
// Advanced visualization #2: Scatter Plot Matrix across amt / age / distance_km.
// Justification (for report): a single scatter plot can only show 2
// variables; fraud often only becomes visible as an outlier cluster when
// viewed across combinations of variables (e.g. high amount + large
// distance-from-home + certain age band). The matrix reveals which pairs
// separate fraud from legitimate transactions best.

const ScatterMatrix = {

  render(containerId, rows) {
    // Every variable appears as both a row and a column in the 3×3 matrix.
    const vars = [
      { key: 'amt', label: 'Amount ($)' },
      { key: 'age', label: 'Age' },
      { key: 'distance_km', label: 'Distance (km)' }
    ];
    // A stratified display sample prevents 100,000 SVG points from freezing the browser.
    const data = DataUtils.scatterSample(rows, 600);

    const container = d3.select('#' + containerId);
    container.selectAll('*').remove();

    const size = 130;
    const pad = 24;
    const n = vars.length;
    const totalSize = n * size + (n + 1) * pad + 40;

    const svg = container.append('svg')
      .attr('width', '100%')
      .attr('viewBox', `0 0 ${totalSize} ${totalSize}`);

    const tooltip = this._tooltip();

    // Each variable needs its own numerical scale because units differ.
    const scales = vars.map(v => d3.scaleLinear()
      .domain(d3.extent(data, d => d[v.key])).nice()
      .range([0, size]));

    // Nested loops create the nine matrix cells.
    for (let row = 0; row < n; row++) {
      for (let col = 0; col < n; col++) {
        const gx = 40 + col * (size + pad);
        const gy = 20 + row * (size + pad);
        const g = svg.append('g').attr('transform', `translate(${gx},${gy})`);

        // Diagonal cells name variables; off-diagonal cells show relationships.
        if (row === col) {
          g.append('rect').attr('width', size).attr('height', size)
            .attr('fill', '#f8f9fb').attr('stroke', '#d7dce3');
          g.append('text')
            .attr('x', size / 2).attr('y', size / 2)
            .attr('text-anchor', 'middle').attr('fill', '#566174')
            .style('font-size', '11px')
            .text(vars[row].label);
          continue;
        }

        const xScale = scales[col], yScale = scales[row];
        g.append('rect').attr('width', size).attr('height', size)
          .attr('fill', '#ffffff').attr('stroke', '#d7dce3');

        // Fraud points use red and higher opacity; legitimate points stay subtle.
        g.selectAll('circle')
          .data(data)
          .enter()
          .append('circle')
          .attr('cx', d => xScale(d[vars[col].key]))
          .attr('cy', d => size - yScale(d[vars[row].key]))
          .attr('r', 2.2)
          .attr('fill', d => d.is_fraud ? '#c92a3b' : '#5b52eb')
          .attr('opacity', d => d.is_fraud ? 0.62 : 0.14)
          .on('mousemove', (event, d) => {
            tooltip.style('opacity', 1)
              .style('left', (event.pageX + 12) + 'px')
              .style('top', (event.pageY - 20) + 'px')
              .html(`${d.category}<br>$${d.amt.toFixed(2)} | age ${d.age} | ${d.distance_km.toFixed(0)}km${d.is_fraud ? '<br><strong style="color:#e2554f">FRAUD</strong>' : ''}`);
          })
          .on('mouseleave', () => tooltip.style('opacity', 0));

        if (row === n - 1) {
          g.append('text').attr('x', size / 2).attr('y', size + 16)
            .attr('text-anchor', 'middle').style('font-size', '9px').attr('fill', '#566174')
            .text(vars[col].label);
        }
      }
    }
  },

  // Reuse a single tooltip across all six plotted matrix cells.
  _tooltip() {
    let t = d3.select('body').select('.tooltip.scatter-tt');
    if (t.empty()) {
      t = d3.select('body').append('div').attr('class', 'tooltip scatter-tt').style('opacity', 0);
    }
    return t;
  }
};
