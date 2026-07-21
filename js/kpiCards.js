// kpiCards.js
// Creates the four headline indicators from the currently filtered rows.
// D3's enter/update/exit pattern lets the same component update both the
// Analyst and Simplified KPI containers without duplicating HTML.
const KpiCards = {

  render(containerId, rows) {
    // Calculate values once, then convert them into presentation-ready cards.
    const k = DataUtils.kpis(rows);
    const cards = [
      { label: 'Transactions', value: d3.format(',')(k.total), icon: '↗', note: 'Records in the current view' },
      { label: 'Fraud Alerts', value: d3.format(',')(k.fraudCount), icon: '!', note: 'Labelled cases in view', alert: true },
      { label: 'Fraud Rate', value: d3.format('.2%')(k.fraudRate), icon: '%', note: 'Observed sample prevalence' },
      { label: 'Total Spend', value: '$' + d3.format(',.0f')(k.totalSpend), icon: '$', note: '$' + d3.format(',.2f')(k.avgAmt) + ' average transaction' }
    ];

    // Bind the four card definitions to any existing card elements.
    const sel = d3.select('#' + containerId)
      .selectAll('.kpi-card')
      .data(cards);

    // Create the internal card structure only for new elements.
    const enter = sel.enter().append('div').attr('class', 'kpi-card');
    enter.append('div').attr('class', 'kpi-icon');
    const copy = enter.append('div').attr('class', 'kpi-copy');
    copy.append('div').attr('class', 'label');
    copy.append('div').attr('class', 'value');
    copy.append('div').attr('class', 'note');

    // Update both newly created and previously existing cards.
    const merged = enter.merge(sel);
    merged.classed('alert', d => !!d.alert);
    merged.select('.kpi-icon').text(d => d.icon);
    merged.select('.label').text(d => d.label);
    merged.select('.value').text(d => d.value);
    merged.select('.note').text(d => d.note);

    sel.exit().remove();
  }
};
