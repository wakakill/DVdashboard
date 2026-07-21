// heatmap.js
// Advanced visualization #1: Heat Map of fraud rate by hour x day-of-week.
// Justification (for report): reveals *when* fraud clusters across two
// dimensions simultaneously (time-of-day AND day-of-week) -- a pattern a
// single bar chart (only 1 dimension) cannot show at all.

const Heatmap = {
  margin: { top: 10, right: 10, bottom: 30, left: 70 },

  render(containerId, rows, onCellClick) {
    // Build all 168 day/hour combinations, including cells with no records.
    const { days, cells } = DataUtils.heatmapData(rows);
    const container = d3.select('#' + containerId);
    container.selectAll('*').remove();

    const width = container.node().clientWidth || 560;
    const height = 260;
    const m = this.margin;
    const innerW = width - m.left - m.right;
    const innerH = height - m.top - m.bottom;

    const svg = container.append('svg').attr('width', width).attr('height', height);
    const g = svg.append('g').attr('transform', `translate(${m.left},${m.top})`);

    // Two categorical band scales form the 24-column by 7-row matrix.
    const x = d3.scaleBand().domain(d3.range(24)).range([0, innerW]).padding(0.05);
    const y = d3.scaleBand().domain(days).range([0, innerH]).padding(0.05);
    const maxRate = d3.max(cells, d => d.fraudRate) || 0.01;
    const color = d3.scaleSequential(d3.interpolateOrRd).domain([0, maxRate]);

    const tooltip = this._tooltip();

    // Darker orange/red cells represent higher observed fraud rates.
    g.selectAll('rect')
      .data(cells)
      .enter()
      .append('rect')
      .attr('x', d => x(d.hour))
      .attr('y', d => y(d.day))
      .attr('width', x.bandwidth())
      .attr('height', y.bandwidth())
      .attr('fill', d => d.count ? color(d.fraudRate) : '#f1f3f6')
      .attr('stroke', '#ffffff')
      .style('cursor', 'pointer')
      .on('mousemove', (event, d) => {
        tooltip.style('opacity', 1)
          .style('left', (event.pageX + 12) + 'px')
          .style('top', (event.pageY - 20) + 'px')
          .html(`<strong>${d.day}, ${d.hour}:00</strong><br>${d.count} txns<br>Fraud rate: ${d3.format('.2%')(d.fraudRate)}`);
      })
      .on('mouseleave', () => tooltip.style('opacity', 0))
      .on('click', (event, d) => onCellClick && onCellClick(d));

    // Only label every third hour to avoid crowding the horizontal axis.
    g.append('g')
      .attr('transform', `translate(0,${innerH})`)
      .call(d3.axisBottom(x).tickValues(d3.range(0, 24, 3)).tickFormat(h => h + ':00'))
      .selectAll('text').style('font-size', '10px');

    g.append('g')
      .call(d3.axisLeft(y).tickFormat(d => d.slice(0, 3)));
  },

  // Create one persistent tooltip and reuse it during later filter redraws.
  _tooltip() {
    let t = d3.select('body').select('.tooltip.heatmap-tt');
    if (t.empty()) {
      t = d3.select('body').append('div').attr('class', 'tooltip heatmap-tt').style('opacity', 0);
    }
    return t;
  }
};
