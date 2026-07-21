// trendLine.js
// Reusable monthly spending line chart. Optional settings allow the
// Simplified view to request a taller chart, thicker line and larger points.
const TrendLine = {
  margin: { top: 10, right: 20, bottom: 40, left: 60 },

  render(containerId, rows, opts = {}) {
    // Convert the filtered transactions into monthly totals.
    const data = DataUtils.monthlyTrend(rows);
    const container = d3.select('#' + containerId);
    container.selectAll('*').remove();

    const width = container.node().clientWidth || 560;
    const height = opts.height || 260;
    const m = this.margin;
    const innerW = width - m.left - m.right;
    const innerH = height - m.top - m.bottom;

    const svg = container.append('svg').attr('width', width).attr('height', height);
    const g = svg.append('g').attr('transform', `translate(${m.left},${m.top})`);

    // The dataset stores months as YYYY-MM strings; D3 requires Date objects.
    const parseMonth = d3.utcParse('%Y-%m');
    const points = data.map(d => ({ ...d, dateObj: parseMonth(d.month) }));

    const x = d3.scaleUtc().domain(d3.extent(points, d => d.dateObj)).range([0, innerW]);
    const y = d3.scaleLinear().domain([0, d3.max(points, d => d.totalSpend) || 1]).nice().range([innerH, 0]);

    // A monotone curve smooths the path without inventing extra turning points.
    const line = d3.line().x(d => x(d.dateObj)).y(d => y(d.totalSpend)).curve(d3.curveMonotoneX);

    g.append('path')
      .datum(points)
      .attr('fill', 'none')
      .attr('stroke', '#4338e8')
      .attr('stroke-width', opts.strokeWidth || 2.5)
      .attr('d', line);

    const tooltip = this._tooltip();

    // Points provide exact monthly values through hover tooltips.
    g.selectAll('circle')
      .data(points)
      .enter()
      .append('circle')
      .attr('cx', d => x(d.dateObj))
      .attr('cy', d => y(d.totalSpend))
      .attr('r', opts.pointRadius || 3.5)
      .attr('fill', '#5b52eb')
      .on('mousemove', (event, d) => {
        tooltip.style('opacity', 1)
          .style('left', (event.pageX + 12) + 'px')
          .style('top', (event.pageY - 20) + 'px')
          .html(`<strong>${d.month}</strong><br>$${d3.format(',.0f')(d.totalSpend)} (${d.count} txns)`);
      })
      .on('mouseleave', () => tooltip.style('opacity', 0));

    g.append('g')
      .attr('transform', `translate(0,${innerH})`)
      .call(d3.axisBottom(x).ticks(width > 500 ? 8 : 4));

    g.append('g').call(d3.axisLeft(y).ticks(5).tickFormat(d3.format('~s')));
  },

  // Return the existing trend tooltip, or create it on the first render.
  _tooltip() {
    let t = d3.select('body').select('.tooltip.trend-tt');
    if (t.empty()) {
      t = d3.select('body').append('div').attr('class', 'tooltip trend-tt').style('opacity', 0);
    }
    return t;
  }
};
