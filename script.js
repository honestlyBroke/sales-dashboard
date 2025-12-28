// script.js

let sourceData = [];
let charts = {};
const currency = new Intl.NumberFormat('en-US', { style: 'currency', currency: 'USD', maximumFractionDigits: 0 });

// 1. DATA LOADING
async function loadAllCSVs() {
    const files = ['data/sales_2015.csv', 'data/sales_2016.csv', 'data/sales_2017.csv'];
    
    // Load all files safely
    const results = await Promise.all(files.map(async (path) => {
        try {
            const res = await fetch(path);
            if (!res.ok) throw new Error(`HTTP ${res.status}`);
            const text = await res.text();
            return Papa.parse(text, { 
                header: true, 
                dynamicTyping: true, 
                skipEmptyLines: true,
                transformHeader: h => h.trim().replace(/^[\uFEFF\uFFFE]/, '') // Remove BOM
            }).data;
        } catch (err) {
            console.warn(`Failed to load ${path}:`, err);
            return [];
        }
    }));

    let combinedData = results.flat();

    // Fallback if no data loaded
    if (combinedData.length === 0) {
        console.warn("No data loaded. Switching to Mock Data.");
        return generateMockData();
    }

    const processed = combinedData.map(row => {
        const orderDate = row['Order Date'] || row.OrderDate || row.Date;
        
        // --- YEAR PARSING FIX ---
        let year = row.Year; // Try explicit column first
        
        if (!year && orderDate) {
            const dateStr = String(orderDate).trim();
            
            // 1. Try standard JS Date parsing
            const d = new Date(dateStr);
            if (!isNaN(d.getFullYear())) {
                year = d.getFullYear();
            } 
            
            // 2. If that failed, manually parse "YYYY-MM-DD" (2016 format)
            if (!year && dateStr.includes('-')) {
                const parts = dateStr.split('-');
                if (parts[0].length === 4) year = parseInt(parts[0]); // 2016-11-08
            }
            
            // 3. Manually parse "DD/MM/YYYY" (2015/2017 format)
            if (!year && dateStr.includes('/')) {
                const parts = dateStr.split('/');
                if (parts[2] && parts[2].length === 4) year = parseInt(parts[2]); // 01/03/2015
            }
        }
        
        // Default to 2016 if it still fails, so data isn't lost
        if (!year) year = 2016; 
        // ------------------------

        return {
            y: Number(year),
            date: orderDate,
            id: row['Order ID'] || row['OrderID'] || ('ORD-' + Math.floor(Math.random()*10000)),
            r: row.Region || 'Unknown',
            s: row.Segment || 'Consumer',
            c: row.Category || 'Other',
            sc: row['Sub-Category'] || row.SubCategory || 'Other',
            v: Number(row.Sales) || 0,
            p: Number(row.Profit) || 0,
            q: Number(row.Quantity) || 1,
            discount: Number(row.Discount) || 0,
            cust: row['Customer Name'] || row.Customer || 'Unknown'
        };
    });

    console.log("Total Rows Loaded:", processed.length);
    return processed;
}

// 2. SETUP & EVENT LISTENERS
document.addEventListener('DOMContentLoaded', async () => {
    // Theme Toggle
    const themeBtn = document.getElementById('themeToggle');
    if (themeBtn) {
        themeBtn.addEventListener('click', () => {
            const body = document.body;
            const currentTheme = body.getAttribute('data-theme');
            if (currentTheme === 'purple') {
                body.removeAttribute('data-theme');
                updateChartColors('blue');
            } else {
                body.setAttribute('data-theme', 'purple');
                updateChartColors('purple');
            }
        });
    }

    // Initialize
    sourceData = await loadAllCSVs();
    initCharts();
    updateDashboard();

    // Filters
    ['yearFilter', 'regionFilter', 'segmentFilter'].forEach(id => {
        const el = document.getElementById(id);
        if(el) el.addEventListener('change', updateDashboard);
    });
    
    // Sliders
    const inputs = [
        { id: 'minSales', disp: 'minSalesVal', format: 'currency' },
        { id: 'maxSales', disp: 'maxSalesVal', format: 'currency' },
        { id: 'qtySlider', disp: 'qtyVal', format: 'number' },
        { id: 'discSlider', disp: 'discVal', format: 'percent' }
    ];

    inputs.forEach(item => {
        const el = document.getElementById(item.id);
        if (el) {
            el.addEventListener('input', (e) => {
                let val = e.target.value;
                if (item.format === 'currency') val = currency.format(val);
                if (item.format === 'percent') val = val + '%';
                document.getElementById(item.disp).innerText = val;
                updateDashboard();
            });
        }
    });
});

// 3. CHARTS INITIALIZATION
function initCharts() {
    Chart.defaults.font.family = "'Segoe UI', sans-serif";
    Chart.defaults.color = '#94a3b8';
    Chart.defaults.maintainAspectRatio = false;
    const commonOpts = { responsive: true, plugins: { legend: { display: false } } };

    const ctxTrend = document.getElementById('trendChart');
    if (ctxTrend) {
        charts.trend = new Chart(ctxTrend, {
            type: 'line', data: { labels: [], datasets: [] }, 
            options: { ...commonOpts, plugins: { legend: { display: true } } }
        });
    }
    
    const ctxCat = document.getElementById('categoryChart');
    if (ctxCat) {
        charts.category = new Chart(ctxCat, {
            type: 'bar', data: { labels: [], datasets: [] }, options: commonOpts
        });
    }

    const ctxSeg = document.getElementById('segmentChart');
    if (ctxSeg) {
        charts.segment = new Chart(ctxSeg, {
            type: 'doughnut', data: { labels: [], datasets: [] }, 
            options: { responsive: true, plugins: { legend: { position: 'right' } } }
        });
    }

    const ctxStack = document.getElementById('stackedChart');
    if (ctxStack) {
        charts.stacked = new Chart(ctxStack, {
            type: 'bar', data: { labels: [], datasets: [] }, 
            options: { ...commonOpts, scales: { x: { stacked: true }, y: { stacked: true } } }
        });
    }

    const ctxProf = document.getElementById('profitChart');
    if (ctxProf) {
        charts.profit = new Chart(ctxProf, {
            type: 'bar', data: { labels: [], datasets: [] }, 
            options: { ...commonOpts, indexAxis: 'y' }
        });
    }
}

function updateChartColors(theme) {
    updateDashboard();
}

// 4. MAIN LOGIC
function updateDashboard() {
    const yearEl = document.getElementById('yearFilter');
    const regionEl = document.getElementById('regionFilter');
    const segEl = document.getElementById('segmentFilter');
    
    const filters = {
        year: yearEl ? yearEl.value : 'all',
        region: regionEl ? regionEl.value : 'all',
        segment: segEl ? segEl.value : 'all',
        minSales: +document.getElementById('minSales').value,
        maxSales: +document.getElementById('maxSales').value,
        minQty: +document.getElementById('qtySlider').value,
        maxDisc: +document.getElementById('discSlider').value / 100 
    };

    const filtered = sourceData.filter(d => {
        const yearMatch = (filters.year === 'all' || d.y == filters.year);
        const regionMatch = (filters.region === 'all' || d.r === filters.region);
        const segMatch = (filters.segment === 'all' || d.s === filters.segment);
        const salesMatch = (d.v >= filters.minSales && d.v <= filters.maxSales);
        const qtyMatch = (d.q >= filters.minQty);
        const discMatch = ((d.discount||0) <= filters.maxDisc);

        return yearMatch && regionMatch && segMatch && salesMatch && qtyMatch && discMatch;
    });

    // Update KPIs
    const totalSales = filtered.reduce((a,b) => a+b.v, 0);
    const totalProfit = filtered.reduce((a,b) => a+b.p, 0);
    const totalQty = filtered.reduce((a,b) => a+b.q, 0);
    const avgDisc = filtered.length ? (filtered.reduce((a,b)=>a+(b.discount||0),0)/filtered.length)*100 : 0;

    document.getElementById('kpiSales').innerText = currency.format(totalSales);
    document.getElementById('kpiProfit').innerText = currency.format(totalProfit);
    document.getElementById('kpiCount').innerText = totalQty.toLocaleString();
    document.getElementById('kpiDiscount').innerText = avgDisc.toFixed(1) + '%';

    updateCharts(filtered);
    updateTopTable(filtered);
    updateRegionTable(filtered);
    updateRecentTable(filtered);
}

function updateCharts(data) {
    if (!charts.trend) return;

    const isPurple = document.body.getAttribute('data-theme') === 'purple';
    const baseColor = isPurple ? '#7c3aed' : '#0ea5e9';
    const colors = isPurple ? ['#7c3aed', '#a78bfa', '#c4b5fd'] : ['#0ea5e9', '#38bdf8', '#7dd3fc'];

    // Trend
    const trend = {}; 
    data.forEach(d => trend[d.y] = (trend[d.y]||0) + d.v);
    charts.trend.data.labels = Object.keys(trend).sort();
    charts.trend.data.datasets = [{
        label: 'Revenue', data: Object.values(trend),
        borderColor: baseColor, backgroundColor: isPurple ? 'rgba(124,58,237,0.1)' : 'rgba(14,165,233,0.1)',
        fill: true, tension: 0.4
    }];
    charts.trend.update();

    // Category
    const cat = {}; data.forEach(d => cat[d.c] = (cat[d.c]||0) + d.v);
    charts.category.data.labels = Object.keys(cat);
    charts.category.data.datasets = [{ data: Object.values(cat), backgroundColor: colors, borderRadius: 4 }];
    charts.category.update();

    // Segment
    const seg = {}; data.forEach(d => seg[d.s] = (seg[d.s]||0) + 1);
    charts.segment.data.labels = Object.keys(seg);
    charts.segment.data.datasets = [{ data: Object.values(seg), backgroundColor: ['#f59e0b', '#10b981', '#6366f1'], borderWidth: 0 }];
    charts.segment.update();

    // Stacked
    const regions = ['East','West','Central','South'];
    const segments = ['Consumer','Corporate','Home Office'];
    charts.stacked.data.labels = regions;
    charts.stacked.data.datasets = segments.map((s, i) => ({
        label: s, data: regions.map(r => data.filter(d => d.r===r && d.s===s).reduce((a,b)=>a+b.v,0)),
        backgroundColor: colors[i % colors.length]
    }));
    charts.stacked.update();

    // Profit
    const prof = {}; data.forEach(d => prof[d.sc] = (prof[d.sc]||0) + d.p);
    const sorted = Object.entries(prof).sort((a,b) => b[1] - a[1]).slice(0,5);
    charts.profit.data.labels = sorted.map(x=>x[0]);
    charts.profit.data.datasets = [{
        data: sorted.map(x=>x[1]), backgroundColor: sorted.map(x=> x[1]>0 ? '#10b981' : '#ef4444'), borderRadius: 4
    }];
    charts.profit.update();
}

function updateTopTable(data) {
    const grp = {};
    data.forEach(d => {
        if(!grp[d.cust]) grp[d.cust] = { s:0, p:0 };
        grp[d.cust].s += d.v; grp[d.cust].p += d.p;
    });
    const sorted = Object.entries(grp).sort((a,b) => b[1].s - a[1].s).slice(0,5);
    const tbody = document.querySelector('#topCustTable tbody');
    if(tbody) tbody.innerHTML = sorted.map(([n, v]) => `
        <tr><td>${n}</td><td class="text-right">${currency.format(v.s)}</td><td class="text-right">${currency.format(v.p)}</td></tr>
    `).join('');
}

function updateRegionTable(data) {
    const regions = ['East','West','Central','South'];
    const tbody = document.querySelector('#regionTable tbody');
    if(tbody) tbody.innerHTML = regions.map(r => {
        const dSub = data.filter(x => x.r === r);
        const s = dSub.reduce((a,b) => a+b.v, 0);
        const p = dSub.reduce((a,b) => a+b.p, 0);
        const m = s ? (p/s)*100 : 0;
        return `<tr><td>${r}</td><td class="text-right">${currency.format(s)}</td><td class="text-right" style="color:${m>=0?'inherit':'var(--accent-red)'}">${m.toFixed(1)}%</td></tr>`;
    }).join('');
}

function updateRecentTable(data) {
    const recent = data.slice(-5).reverse();
    const tbody = document.querySelector('#recentTable tbody');
    if(tbody) tbody.innerHTML = recent.map(d => `
        <tr><td>${d.date || d.y}</td><td>${d.id}</td><td class="text-right">${currency.format(d.v)}</td></tr>
    `).join('');
}

function generateMockData() {
    return []; 
}