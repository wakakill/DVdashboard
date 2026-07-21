// kidsDonut.js
// Child-friendly financial literacy view. It combines technical dataset
// categories into familiar groups, draws an interactive donut and creates
// simple explanations about needs, wants and regular saving.

const KidsDonut = {
  // Online and in-store variants share one friendly label and icon.
  // The type field supports the educational Needs vs Wants comparison.
  categoryMap: {
    shopping_pos: { name: 'Shopping', icon: '🛍️', type: 'want' },
    shopping_net: { name: 'Shopping', icon: '🛍️', type: 'want' },
    grocery_pos: { name: 'Groceries', icon: '🛒', type: 'need' },
    grocery_net: { name: 'Groceries', icon: '🛒', type: 'need' },
    gas_transport: { name: 'Transport', icon: '⛽', type: 'need' },
    home: { name: 'Home', icon: '🏠', type: 'need' },
    health_fitness: { name: 'Health', icon: '💪', type: 'need' },
    personal_care: { name: 'Personal Care', icon: '🧴', type: 'need' },
    food_dining: { name: 'Food & Dining', icon: '🍔', type: 'want' },
    entertainment: { name: 'Fun & Games', icon: '🎮', type: 'want' },
    kids_pets: { name: 'Pets', icon: '🐶', type: 'want' },
    travel: { name: 'Travel', icon: '✈️', type: 'want' },
    misc_pos: { name: 'Other', icon: '✨', type: 'want' },
    misc_net: { name: 'Other', icon: '✨', type: 'want' }
  },

  // Accessible categorical palette reused by slices and legend markers.
  colors: ['#665cf1', '#ef6b73', '#3fb98a', '#62a6e8', '#c56bd4', '#f4a261', '#5fd1c9', '#e8bd3f', '#8a7cf4', '#ed8f9a'],

  // Merge categories such as shopping_pos and shopping_net before drawing.
  combinedSummary(rows) {
    const grouped = d3.rollup(rows, values => d3.sum(values, d => d.amt), d => {
      return this.categoryMap[d.category]?.name || 'Other';
    });
    return Array.from(grouped, ([name, totalSpend]) => {
      const source = Object.values(this.categoryMap).find(item => item.name === name) || { icon: '✨', type: 'want' };
      return { name, totalSpend, icon: source.icon, type: source.type };
    }).sort((a, b) => b.totalSpend - a.totalSpend);
  },

  // Calculate educational summaries and construct the chart/card layout.
  render(containerId, rows) {
    const data = this.combinedSummary(rows);
    const total = d3.sum(data, d => d.totalSpend);
    const top = data[0] || { name: 'No spending', totalSpend: 0, icon: '💰' };
    const needs = d3.sum(data.filter(d => d.type === 'need'), d => d.totalSpend);
    const wants = Math.max(0, total - needs);
    const needsPct = total ? needs / total : 0;
    const wantsPct = total ? wants / total : 0;
    const container = d3.select('#' + containerId);
    container.selectAll('*').remove();

    // Two-column layout: visual exploration on the left, lessons on the right.
    const grid = container.append('div').attr('class', 'kids-dashboard-grid');
    const chartZone = grid.append('div').attr('class', 'kids-chart-zone');
    const insights = grid.append('div').attr('class', 'kids-insight-stack');
    const width = 540, height = 390, radius = 156;
    const svg = chartZone.append('svg').attr('viewBox', `0 0 ${width} ${height}`).attr('role', 'group').attr('aria-label', 'Interactive spending category donut chart');
    const g = svg.append('g').attr('transform', `translate(${width / 2},${height / 2})`);
    const color = d3.scaleOrdinal().domain(data.map(d => d.name)).range(this.colors);
    const pie = d3.pie().value(d => d.totalSpend).sort(null).padAngle(.008);
    const arc = d3.arc().innerRadius(radius * .56).outerRadius(radius).cornerRadius(3);
    const hoverArc = d3.arc().innerRadius(radius * .54).outerRadius(radius + 7).cornerRadius(3);
    const labelArc = d3.arc().innerRadius(radius * .78).outerRadius(radius * .78);

    // Centre text shows the total by default and the selected category on hover.
    const centerLabel = g.append('text').attr('class', 'donut-center-label').attr('y', -20).text('Total spent');
    const centerValue = g.append('text').attr('class', 'donut-center-value').attr('y', 10).text(this.compactMoney(total));
    const centerName = g.append('text').attr('class', 'donut-center-name').attr('y', 34).text('All categories');

    // Keyboard-focusable slices enlarge and reveal their percentage interactively.
    const slices = g.selectAll('path').data(pie(data)).enter().append('path')
      .attr('class', 'donut-slice').attr('d', arc).attr('fill', d => color(d.data.name)).attr('stroke', '#fff').attr('stroke-width', 2)
      .attr('tabindex', 0).attr('role', 'button').attr('aria-label', d => `${d.data.name}: ${this.money(d.data.totalSpend)}, ${d3.format('.1%')(total ? d.data.totalSpend / total : 0)}`)
      .on('mouseenter focus', function (event, d) {
        d3.select(this).attr('d', hoverArc);
        centerLabel.text(d.data.icon + ' Category');
        centerValue.text(d3.format('.1%')(total ? d.data.totalSpend / total : 0));
        centerName.text(d.data.name);
      })
      .on('mouseleave blur', function () {
        d3.select(this).attr('d', arc);
        centerLabel.text('Total spent'); centerValue.text(KidsDonut.compactMoney(total)); centerName.text('All categories');
      });

    g.selectAll('text.slice-icon').data(pie(data)).enter().append('text').attr('class', 'slice-icon')
      .attr('transform', d => `translate(${labelArc.centroid(d)})`).attr('text-anchor', 'middle').attr('dy', '.35em')
      .style('font-size', d => (d.endAngle - d.startAngle) > .35 ? '22px' : '15px').style('pointer-events', 'none')
      .text(d => d.data.icon);

    // The legend uses the same colour scale and friendlier category names.
    const legend = chartZone.append('div').attr('class', 'kids-legend');
    const items = legend.selectAll('.kids-legend-item').data(data).enter().append('div').attr('class', 'kids-legend-item');
    items.append('i').style('background', d => color(d.name));
    items.append('span').text(d => `${d.icon} ${d.name}`);

    // Cards turn the visualisation into a short financial-literacy activity.
    insights.html(`
      <article class="kids-insight-card primary">
        <p class="kids-card-label">Most popular category</p>
        <h3 class="kids-card-title"><span class="emoji">${top.icon}</span>${top.name}</h3>
        <p class="kids-big-stat">${d3.format('.1%')(total ? top.totalSpend / total : 0)}</p>
        <p class="kids-card-copy">${this.money(top.totalSpend)} of the money was spent here.</p>
      </article>
      <article class="kids-insight-card">
        <p class="kids-card-label">Learn about spending</p>
        <h3 class="kids-card-title"><span class="emoji">⚖️</span>Needs vs Wants</h3>
        <div class="habit-bars">
          <div class="habit-bar-row"><div class="habit-bar-label"><span>Needs</span><span>${d3.format('.0%')(needsPct)}</span></div><div class="habit-bar-track"><div class="habit-bar-fill needs" style="width:${needsPct * 100}%"></div></div></div>
          <div class="habit-bar-row"><div class="habit-bar-label"><span>Wants</span><span>${d3.format('.0%')(wantsPct)}</span></div><div class="habit-bar-track"><div class="habit-bar-fill wants" style="width:${wantsPct * 100}%"></div></div></div>
        </div>
        <p class="needs-wants-note"><strong>Needs</strong> help us live safely. <strong>Wants</strong> are enjoyable but can often wait.</p>
      </article>
      <article class="kids-insight-card saving">
        <p class="kids-card-label">Weekly savings challenge</p>
        <h3 class="kids-card-title"><span class="emoji">🐷</span>Small savings grow!</h3>
        <div class="saving-equation">$2 each week <span>×</span> 52 weeks <span>=</span> $104</div>
        <p class="kids-card-copy">Try saving a little regularly instead of waiting to save a lot.</p>
      </article>`);
  },

  // Currency helpers keep large figures readable while preserving exact card values.
  compactMoney(value) { return new Intl.NumberFormat('en-US', { style: 'currency', currency: 'USD', notation: 'compact', maximumFractionDigits: 2 }).format(value || 0); },
  money(value) { return new Intl.NumberFormat('en-US', { style: 'currency', currency: 'USD', maximumFractionDigits: 0 }).format(value || 0); }
};
