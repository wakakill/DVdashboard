// main.js
// Central application controller for FraudWatch.
// It stores the current dashboard state, applies coordinated filters,
// switches audience views and asks each independent chart module to render.

// One shared state object prevents the charts and table from using
// different filter selections or different versions of the dataset.
const state = {
  mode: 'analyst',
  filters: { start: null, end: null, categories: [], states: [], search: '', fraudOnly: false },
  selectedCategory: null,
  rawData: [],
  filteredData: [],
  elderlyRangeMonths: '3'
};

// Apply every active Analyst filter to the original dataset.
// The selected end date is made inclusive by comparing against the next day.
function applyFilters() {
  const f = state.filters;
  state.filteredData = state.rawData.filter(d => {
    if (f.start && d.date < f.start) return false;
    if (f.end) {
      const endExclusive = d3.timeDay.offset(f.end, 1);
      if (d.date >= endExclusive) return false;
    }
    if (f.categories.length && !f.categories.includes(d.category)) return false;
    if (f.states.length && !f.states.includes(d.state)) return false;
    if (f.fraudOnly && d.is_fraud !== 1) return false;
    if (state.selectedCategory && d.category !== state.selectedCategory) return false;
    return true;
  });
  DrilldownTable.page = 1;
  renderAll();
}

// Render only the currently visible mode. This avoids unnecessary work and
// ensures hidden chart containers are not measured at zero width.
function renderAll() {
  const rows = state.filteredData;
  if (state.mode === 'analyst') {
    KpiCards.render('kpi-cards', rows);
    Heatmap.render('chart-heatmap', rows, onHeatmapCellClick);
    ScatterMatrix.render('chart-scatter', rows);
    CategoryBar.render('chart-category', rows, state.selectedCategory, onCategoryBarClick);
    TrendLine.render('chart-trend', rows);
    DrilldownTable.render('drilldown-table', null, rows, state.filters.search);
    d3.select('#active-crossfilter')
      .attr('hidden', state.selectedCategory ? null : true)
      .text(state.selectedCategory ? `Category: ${pretty(state.selectedCategory)} ×` : '')
      .on('click', () => { state.selectedCategory = null; applyFilters(); });
  } else if (state.mode === 'elderly') {
    const elderlyRows = getElderlyRows();
    KpiCards.render('kpi-cards-elderly', elderlyRows);
    TrendLine.render('chart-trend-elderly', elderlyRows, { height: 340, strokeWidth: 4, pointRadius: 5 });
  } else if (state.mode === 'kids') {
    KidsDonut.render('chart-donut-kids', rows);
  } else if (state.mode === 'timeline') {
    ProjectTimeline.render('chart-timeline', 'timeline-detail');
  }
}

// Clicking the same category twice removes the category cross-filter.
function onCategoryBarClick(category) {
  state.selectedCategory = state.selectedCategory === category ? null : category;
  applyFilters();
}

// A heat-map click temporarily sends the selected day/hour slice to the table.
// The other charts stay unchanged so users can compare the detail to context.
function onHeatmapCellClick(cell) {
  const slice = state.filteredData.filter(d => d.day_of_week === cell.day && d.hour === cell.hour);
  DrilldownTable.page = 1;
  DrilldownTable.render('drilldown-table', null, slice, state.filters.search);
  document.querySelector('.investigation-section').scrollIntoView({ behavior: 'smooth', block: 'start' });
}

// Calculate the independent date range used by the Simplified view.
function getElderlyRows() {
  const value = state.elderlyRangeMonths;
  if (value === 'all') return state.rawData;
  const latest = d3.max(state.rawData, d => d.date) || new Date();
  const start = d3.utcMonth.offset(latest, -(+value));
  return state.rawData.filter(d => d.date >= start);
}

// Update button accessibility states, show the chosen section and render it.
function setMode(mode) {
  state.mode = mode;
  state.selectedCategory = null;
  document.querySelectorAll('.mode-btn').forEach(button => {
    const active = button.dataset.mode === mode;
    button.classList.toggle('active', active);
    button.setAttribute('aria-selected', String(active));
  });
  document.body.className = 'mode-' + mode;
  ['analyst','elderly','kids','timeline'].forEach(name => {
    document.getElementById('view-' + name).hidden = name !== mode;
  });
  renderAll();
}

// Convert dataset labels such as "shopping_net" into "Shopping Net".
function pretty(value) {
  return String(value).split('_').map(word => word.charAt(0).toUpperCase() + word.slice(1)).join(' ');
}

// Application entry point: load data, populate filters and register controls.
async function init() {
  try {
    const rows = await DataUtils.load('data/fraud_sample_100k.csv');
    state.rawData = rows.filter(d => d.date && Number.isFinite(d.amt));
    state.filteredData = state.rawData;

    // Dropdown options are derived from the CSV instead of being hard-coded.
    const categories = Array.from(new Set(rows.map(d => d.category))).sort();
    const states = Array.from(new Set(rows.map(d => d.state))).sort();
    d3.select('#filter-category').selectAll('option').data(categories).enter().append('option').attr('value', d => d).text(pretty);
    d3.select('#filter-state').selectAll('option').data(states).enter().append('option').attr('value', d => d).text(d => d);

    // Every input updates state and then triggers the same filtering pipeline.
    d3.select('#filter-start').on('change', function () { state.filters.start = this.value ? new Date(this.value + 'T00:00:00') : null; applyFilters(); });
    d3.select('#filter-end').on('change', function () { state.filters.end = this.value ? new Date(this.value + 'T00:00:00') : null; applyFilters(); });
    d3.select('#filter-category').on('change', function () { state.filters.categories = Array.from(this.selectedOptions).map(o => o.value); applyFilters(); });
    d3.select('#filter-state').on('change', function () { state.filters.states = Array.from(this.selectedOptions).map(o => o.value); applyFilters(); });
    d3.select('#filter-fraud-only').on('change', function () { state.filters.fraudOnly = this.checked; applyFilters(); });
    d3.select('#filter-search').on('input', function () {
      state.filters.search = this.value;
      DrilldownTable.render('drilldown-table', null, state.filteredData, state.filters.search);
    });
    d3.select('#filter-reset').on('click', () => {
      state.filters = { start: null, end: null, categories: [], states: [], search: '', fraudOnly: false };
      state.selectedCategory = null;
      ['filter-start','filter-end','filter-search'].forEach(id => document.getElementById(id).value = '');
      document.getElementById('filter-category').selectedIndex = -1;
      document.getElementById('filter-state').selectedIndex = -1;
      document.getElementById('filter-fraud-only').checked = false;
      applyFilters();
    });
    d3.select('#filter-range-elderly').on('change', function () { state.elderlyRangeMonths = this.value; if (state.mode === 'elderly') renderAll(); });
    d3.select('#export-filtered').on('click', () => DrilldownTable.exportCsv());
    document.querySelectorAll('.mode-btn').forEach(button => button.addEventListener('click', () => setMode(button.dataset.mode)));
    document.querySelector('.dialog-close').addEventListener('click', () => document.getElementById('transaction-dialog').close());
    document.getElementById('transaction-dialog').addEventListener('click', event => {
      if (event.target === event.currentTarget) event.currentTarget.close();
    });
    // Debouncing prevents dozens of expensive redraws while the window resizes.
    window.addEventListener('resize', debounce(() => renderAll(), 160));
    applyFilters();
  } catch (error) {
    console.error(error);
    document.getElementById('main-content').innerHTML = `<section class="view"><div class="chart-card"><h2>Dashboard data could not be loaded</h2><p>Open this project through a local web server and confirm the CSV is in <strong>data/fraud_sample_100k.csv</strong>.</p></div></section>`;
  }
}

// Small utility that postpones repeated calls until user activity settles.
function debounce(fn, delay) { let timer; return () => { clearTimeout(timer); timer = setTimeout(fn, delay); }; }

// Start the dashboard after all chart modules have been loaded by index.html.
init();
