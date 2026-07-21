// categoryBar.js
// Vertical bar chart comparing total spending across merchant categories.
// A selected bar becomes a cross-filter that updates the full Analyst view.
const CategoryBar = {
  margin: { top: 10, right: 20, bottom: 70, left: 60 },

  render(containerId, rows, selectedCategory, onBarClick) {
    // Aggregate raw transactions to one summary object per category.
    const data = DataUtils.categorySummary(rows);
    const container = d3.select('#' + containerId);
    container.selectAll('*').remove();

    const width = container.node().clientWidth || 560;
    const height = 260;
    const m = this.margin;
    const innerW = width - m.left - m.right;
    const innerH = height - m.top - m.bottom;

    const svg = container.append('svg').attr('width', width).attr('height', height);
    const g = svg.append('g').attr('transform', `translate(${m.left},${m.top})`);

    // Band scales position categories; the linear scale converts spending to height.
    const x = d3.scaleBand().domain(data.map(d => d.category)).range([0, innerW]).padding(0.25);
    const y = d3.scaleLinear().domain([0, d3.max(data, d => d.totalSpend) || 1]).nice().range([innerH, 0]);

    const tooltip = this._tooltip();

    // Each bar supports a detailed tooltip and click-to-filter interaction.
    g.selectAll('rect')
      .data(data)
      .enter()
      .append('rect')
      .attr('x', d => x(d.category))
      .attr('y', d => y(d.totalSpend))
      .attr('width', x.bandwidth())
      .attr('height', d => innerH - y(d.totalSpend))
      .attr('class', d => d.category === selectedCategory ? 'bar-hover' : 'bar-legit')
      .style('cursor', 'pointer')
      .on('mousemove', (event, d) => {
        tooltip.style('opacity', 1)
          .style('left', (event.pageX + 12) + 'px')
          .style('top', (event.pageY - 20) + 'px')
          .html(`<strong>${d.category}</strong><br>${d.count} txns, $${d3.format(',.0f')(d.totalSpend)}<br>Fraud rate: ${d3.format('.2%')(d.fraudRate)}`);
      })
      .on('mouseleave', () => tooltip.style('opacity', 0))
      .on('click', (event, d) => onBarClick && onBarClick(d.category));

    // Rotate and prettify long dataset labels so they remain readable.
    g.append('g')
      .attr('transform', `translate(0,${innerH})`)
      .call(d3.axisBottom(x))
      .selectAll('text')
      .text(d => d.split('_').map(w => w.charAt(0).toUpperCase() + w.slice(1)).join(' '))
      .attr('transform', 'rotate(-40)')
      .style('text-anchor', 'end')
      .style('font-size', '10px');

    g.append('g').call(d3.axisLeft(y).ticks(5).tickFormat(d3.format('~s')));
  },

  // Reuse one tooltip instead of creating a new HTML element on every redraw.
  _tooltip() {
    let t = d3.select('body').select('.tooltip.category-tt');
    if (t.empty()) {
      t = d3.select('body').append('div').attr('class', 'tooltip category-tt').style('opacity', 0);
    }
    return t;
  }
};
