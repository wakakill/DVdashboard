// timeline.js
// Task 6 project-delivery visualisation. Selecting a phase highlights its bar
// and updates the adjacent panel with its objective, period and evidence.

const ProjectTimeline = {
  // Open the final presentation phase when the timeline first appears.
  selected: 5,

  // Project information is stored separately from drawing instructions so
  // dates or descriptions can be updated without rewriting the chart logic.
  phases: [
    { title: 'Project initiation', start: new Date(2026,2,1), end: new Date(2026,2,14), progress: 100, objective: 'Define the finance domain, fraud-review problem, stakeholders and dashboard success criteria.', deliverable: 'Approved problem definition and project plan', evidence: 'Scope, audience needs and visualisation requirements mapped to Tasks 1–7.' },
    { title: 'Data collection', start: new Date(2026,2,15), end: new Date(2026,3,3), progress: 100, objective: 'Acquire and profile the supplied transaction dataset before analytical design begins.', deliverable: '100,000-row fraud transaction sample', evidence: '21 variables covering time, merchant, customer, geography, amount, distance and fraud label.' },
    { title: 'Data cleaning', start: new Date(2026,3,4), end: new Date(2026,3,24), progress: 100, objective: 'Validate types, dates, numerical fields, category labels and missing-value status.', deliverable: 'Analysis-ready D3 data model', evidence: '100,000 valid records with a confirmed 2019–2020 period.' },
    { title: 'Dashboard development', start: new Date(2026,3,25), end: new Date(2026,5,14), progress: 100, objective: 'Build coordinated KPIs, filters, dynamic charts, drill-down, responsive layout and audience modes.', deliverable: 'Accessible modular D3 dashboard', evidence: 'Heat map, trend, category comparison, scatter matrix, search, table drill-down and audience views.' },
    { title: 'Testing and validation', start: new Date(2026,5,15), end: new Date(2026,6,10), progress: 100, objective: 'Verify figures, interaction behaviour, accessibility, responsiveness and browser rendering.', deliverable: 'Validated dashboard build', evidence: 'KPI reconciliation, filter tests, visual review, keyboard focus and responsive-layout checks.' },
    { title: 'Deployment / presentation', start: new Date(2026,6,11), end: new Date(2026,6,20), progress: 100, objective: 'Package the project, communicate actionable insights and prepare the class demonstration.', deliverable: 'Hosted dashboard and source package', evidence: 'Presentation-ready web application with dataset, documentation and reproducible source files.' }
  ],

  // Draw the six-phase Gantt-style timeline inside a responsive SVG.
  render(containerId, detailId) {
    this.containerId = containerId;
    this.detailId = detailId;
    const container = d3.select('#' + containerId);
    container.selectAll('*').remove();
    const width = Math.max(760, container.node().clientWidth || 960);
    const height = 450;
    const margin = { top: 50, right: 28, bottom: 35, left: 190 };
    const innerW = width - margin.left - margin.right;
    const innerH = height - margin.top - margin.bottom;
    // Time controls horizontal position; the band scale assigns one row per phase.
    const x = d3.scaleTime().domain([new Date(2026,1,24), new Date(2026,6,24)]).range([0, innerW]);
    const y = d3.scaleBand().domain(this.phases.map(d => d.title)).range([0, innerH]).padding(.34);
    const svg = container.append('svg').attr('viewBox', `0 0 ${width} ${height}`).attr('role', 'group').attr('aria-label', 'Interactive project timeline');
    const root = svg.append('g').attr('transform', `translate(${margin.left},${margin.top})`);
    // Monthly grid lines help viewers estimate the duration of each phase.
    const months = d3.timeMonth.range(new Date(2026,2,1), new Date(2026,7,1));
    root.selectAll('.month-grid').data(months).enter().append('line').attr('x1', x).attr('x2', x).attr('y1', 0).attr('y2', innerH).attr('stroke', '#e3e7ed').attr('stroke-dasharray', '3 4');
    root.append('g').call(d3.axisTop(x).tickValues(months).tickFormat(d3.timeFormat('%b'))).call(g => g.select('.domain').remove());
    root.append('g').call(d3.axisLeft(y).tickSize(0)).call(g => g.select('.domain').remove());

    // Groups are keyboard-focusable buttons as well as clickable SVG elements.
    const groups = root.selectAll('.timeline-bar').data(this.phases).enter().append('g').attr('class', 'timeline-bar')
      .attr('tabindex', 0).attr('role', 'button').attr('aria-label', (d,i) => `Phase ${i+1}: ${d.title}, ${d.progress}% complete`)
      .on('click keydown', (event,d) => {
        if (event.type === 'keydown' && !['Enter',' '].includes(event.key)) return;
        event.preventDefault();
        this.selected = this.phases.indexOf(d);
        this.render(containerId, detailId);
      });
    // Each phase contains a grey track, purple progress fill and selection outline.
    groups.append('rect').attr('x', d => x(d.start)).attr('y', d => y(d.title)).attr('width', d => Math.max(5, x(d.end)-x(d.start))).attr('height', y.bandwidth()).attr('rx', 8).attr('fill', '#e7e9f0');
    groups.append('rect').attr('x', d => x(d.start)).attr('y', d => y(d.title)).attr('width', d => Math.max(5, (x(d.end)-x(d.start))*d.progress/100)).attr('height', y.bandwidth()).attr('rx', 8).attr('fill', (d,i) => i === this.selected ? '#3129c8' : '#5b52eb');
    groups.append('rect').attr('x', d => x(d.start)-2).attr('y', d => y(d.title)-2).attr('width', d => Math.max(9, x(d.end)-x(d.start)+4)).attr('height', y.bandwidth()+4).attr('rx', 10).attr('fill', 'none').attr('stroke', (d,i) => i === this.selected ? '#141820' : 'transparent').attr('stroke-width', 1.5);
    groups.append('text').attr('x', d => x(d.start)+8).attr('y', d => y(d.title)+y.bandwidth()/2).attr('dy', '.35em').attr('fill', '#fff').attr('font-size', 10).attr('font-weight', 850).text(d => `${d.progress}%`);
    // Red dashed marker identifies the final presentation deadline.
    const due = new Date(2026,6,20);
    root.append('line').attr('x1', x(due)).attr('x2', x(due)).attr('y1', -17).attr('y2', innerH).attr('stroke', '#c92a3b').attr('stroke-width', 1.5).attr('stroke-dasharray', '5 4');
    root.append('text').attr('x', x(due)-4).attr('y', -24).attr('text-anchor', 'end').attr('fill', '#c92a3b').attr('font-size', 10.5).attr('font-weight', 850).text('Final presentation · 20 Jul');
    this.renderDetail();
  },

  // Rebuild the detail card whenever the selected phase changes.
  renderDetail() {
    const d = this.phases[this.selected] || this.phases[0];
    const fmt = d3.timeFormat('%d %b %Y');
    document.getElementById(this.detailId).innerHTML = `
      <p class="phase-index">Phase ${this.selected + 1} of ${this.phases.length}</p>
      <h3>${d.title}</h3><p>${d.objective}</p>
      <dl>
        <div><dt>Period</dt><dd>${fmt(d.start)} – ${fmt(d.end)}</dd></div>
        <div><dt>Progress</dt><dd>${d.progress}% complete</dd></div>
        <div><dt>Deliverable</dt><dd>${d.deliverable}</dd></div>
        <div><dt>Evidence</dt><dd>${d.evidence}</dd></div>
      </dl>`;
  }
};
