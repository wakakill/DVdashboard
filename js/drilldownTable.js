// drilldownTable.js
// Searchable investigation table with sorting, pagination, details and export.
// The component keeps its own presentation state while receiving filtered
// transaction rows from main.js.

const DrilldownTable = {
  // Default table controls. The newest transactions appear first.
  page: 1,
  pageSize: 10,
  sortKey: 'date',
  sortDir: 'desc',
  rows: [],
  searchTerm: '',
  initialized: false,

  // Accept a new result set and redraw the table from its current controls.
  render(containerId, countId, rows, searchTerm = '') {
    this.containerId = containerId;
    this.rows = rows;
    if (this.searchTerm !== searchTerm) this.page = 1;
    this.searchTerm = searchTerm;
    this.draw();
  },

  // Apply free-text search across several useful transaction fields,
  // then sort the complete matching result before pagination.
  matchingRows() {
    const term = this.searchTerm.trim().toLowerCase();
    let source = term ? this.rows.filter(d => [d.trans_num, d.merchant, d.category, d.city, d.state, d.job]
      .some(value => String(value).toLowerCase().includes(term))) : this.rows.slice();
    const direction = this.sortDir === 'asc' ? 1 : -1;
    source.sort((a, b) => {
      const av = a[this.sortKey], bv = b[this.sortKey];
      if (av instanceof Date && bv instanceof Date) return direction * (av - bv);
      if (typeof av === 'number' && typeof bv === 'number') return direction * (av - bv);
      return direction * String(av).localeCompare(String(bv));
    });
    return source;
  },

  // Rebuild the table interface. Only one page of rows enters the DOM,
  // keeping browser rendering fast even when 100,000 records match.
  draw() {
    const source = this.matchingRows();
    const pageCount = Math.max(1, Math.ceil(source.length / this.pageSize));
    this.page = Math.min(Math.max(1, this.page), pageCount);
    const start = (this.page - 1) * this.pageSize;
    const display = source.slice(start, start + this.pageSize);
    const container = d3.select('#' + this.containerId);
    container.selectAll('*').remove();

    // Result count and rows-per-page selector.
    const meta = container.append('div').attr('class', 'table-meta-row');
    meta.append('p').attr('aria-live', 'polite')
      .text(`${d3.format(',')(source.length)} matching transactions${this.searchTerm ? ` for “${this.searchTerm}”` : ''}`);
    const sizeLabel = meta.append('label').text('Rows per page');
    const sizeSelect = sizeLabel.append('select').attr('aria-label', 'Rows per page');
    sizeSelect.selectAll('option').data([10, 25, 50]).enter().append('option').attr('value', d => d).text(d => d);
    sizeSelect.property('value', this.pageSize).on('change', event => {
      this.pageSize = +event.target.value;
      this.page = 1;
      this.draw();
    });

    // Scroll wrapper keeps all columns accessible on smaller screens.
    const scroll = container.append('div').attr('class', 'table-scroll');
    const table = scroll.append('table').attr('class', 'txn-table');
    const columns = [
      ['date', 'Date & time'], ['merchant', 'Merchant'], ['category', 'Category'], ['amt', 'Amount'],
      ['state', 'State'], ['distance_km', 'Distance'], ['is_fraud', 'Status']
    ];
    const head = table.append('thead').append('tr');
    // Every visible heading is a button that toggles ascending/descending sort.
    columns.forEach(([key, label]) => {
      const button = head.append('th').append('button').attr('type', 'button').attr('data-sort', key);
      button.append('span').text(label);
      button.append('span').text(this.sortKey === key ? (this.sortDir === 'asc' ? '↑' : '↓') : '↕');
      button.on('click', () => {
        if (this.sortKey === key) this.sortDir = this.sortDir === 'asc' ? 'desc' : 'asc';
        else { this.sortKey = key; this.sortDir = ['merchant','category','state'].includes(key) ? 'asc' : 'desc'; }
        this.page = 1;
        this.draw();
      });
    });
    head.append('th').attr('aria-label', 'Open details');

    const body = table.append('tbody');
    // Render a helpful empty state or the current page of transaction rows.
    if (!display.length) {
      body.append('tr').attr('class', 'empty-row').append('td').attr('colspan', 8)
        .text('No transactions match the current filters and search.');
    } else {
      const tr = body.selectAll('tr').data(display).enter().append('tr').classed('is-fraud', d => d.is_fraud === 1);
      tr.append('td').text(d => d3.timeFormat('%d %b %Y, %H:%M')(d.date));
      tr.append('td').attr('class', 'merchant-cell').append('span').attr('title', d => d.merchant).text(d => d.merchant);
      tr.append('td').text(d => this.pretty(d.category));
      tr.append('td').attr('class', 'amount-cell').text(d => '$' + d3.format(',.0f')(d.amt));
      tr.append('td').text(d => d.state);
      tr.append('td').text(d => d3.format('.1f')(d.distance_km) + ' km');
      tr.append('td').append('span').attr('class', d => `status-badge ${d.is_fraud ? 'fraud' : 'legitimate'}`)
        .text(d => d.is_fraud ? 'Fraud' : 'Legitimate');
      tr.append('td').append('button').attr('class', 'details-button').attr('type', 'button').text('Details')
        .on('click', (event, d) => this.openDetails(d));
    }

    // Previous and Next buttons are disabled automatically at either boundary.
    const pagination = container.append('div').attr('class', 'pagination-row');
    pagination.append('p').text(`Page ${this.page} of ${pageCount} · rows ${source.length ? start + 1 : 0}–${Math.min(start + this.pageSize, source.length)}`);
    const actions = pagination.append('div');
    actions.append('button').attr('type', 'button').property('disabled', this.page <= 1).text('← Previous').on('click', () => { this.page--; this.draw(); });
    actions.append('button').attr('type', 'button').property('disabled', this.page >= pageCount).text('Next →').on('click', () => { this.page++; this.draw(); });
  },

  // Fill and open the native HTML dialog for the selected transaction.
  openDetails(d) {
    const dialog = document.getElementById('transaction-dialog');
    document.getElementById('transaction-detail-content').innerHTML = `
      <h2>${this.escape(d.merchant)}</h2>
      <p class="detail-amount">$${d3.format(',.2f')(d.amt)}</p>
      <p><span class="status-badge ${d.is_fraud ? 'fraud' : 'legitimate'}">${d.is_fraud ? 'Fraud alert' : 'Legitimate transaction'}</span></p>
      <dl class="detail-grid">
        <div><dt>Transaction ID</dt><dd>${this.escape(d.trans_num)}</dd></div>
        <div><dt>Date and time</dt><dd>${d3.timeFormat('%d %b %Y, %H:%M:%S')(d.date)}</dd></div>
        <div><dt>Category</dt><dd>${this.escape(this.pretty(d.category))}</dd></div>
        <div><dt>Customer</dt><dd>${d.gender === 'F' ? 'Female' : 'Male'}, age ${d.age}</dd></div>
        <div><dt>Location</dt><dd>${this.escape(d.city)}, ${this.escape(d.state)}</dd></div>
        <div><dt>Job</dt><dd>${this.escape(d.job)}</dd></div>
        <div><dt>Merchant distance</dt><dd>${d3.format('.2f')(d.distance_km)} km</dd></div>
        <div><dt>City population</dt><dd>${d3.format(',')(d.city_pop)}</dd></div>
      </dl>
      <p class="detail-note">The status is taken from the supplied <strong>is_fraud</strong> label. The dashboard does not independently confirm criminal activity.</p>`;
    dialog.showModal();
  },

  // Export only the rows currently included by dashboard filters and search.
  exportCsv() {
    const source = this.matchingRows().map(d => ({
      trans_num: d.trans_num, trans_date_trans_time: d3.timeFormat('%Y-%m-%d %H:%M:%S')(d.date), hour: d.hour,
      day_of_week: d.day_of_week, month: d.month, merchant: d.merchant, category: d.category, amt: d.amt,
      gender: d.gender, age: d.age, job: d.job, city: d.city, state: d.state, city_pop: d.city_pop,
      distance_km: d.distance_km, is_fraud: d.is_fraud
    }));
    const blob = new Blob([d3.csvFormat(source)], { type: 'text/csv;charset=utf-8' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = `fraudwatch_filtered_${new Date().toISOString().slice(0,10)}.csv`;
    document.body.appendChild(link); link.click(); link.remove();
    setTimeout(() => URL.revokeObjectURL(url), 1000);
  },

  // Small formatting and HTML-safety helpers used by table cells and the dialog.
  pretty(value) { return String(value).split('_').map(word => word.charAt(0).toUpperCase() + word.slice(1)).join(' '); },
  escape(value) { const div = document.createElement('div'); div.textContent = String(value); return div.innerHTML; }
};
