/* Add the real contact URLs here to turn on the contact buttons. */
const SITE_CONFIG = {
  whatsappUrl: "https://wa.me/918457953497",
  sharkExchangeUrl: "https://sharkexchange.in/referral?code=DBU957",
  telegramUrl: "https://t.me/gjinvestmentacademy1",
  youtubeUrl: "https://www.youtube.com/@alisirtrade?sub_confirmation=1"
};
const $ = (selector) => document.querySelector(selector);
const usd = (value) => value == null ? "N/A" : new Intl.NumberFormat(undefined, { style: "currency", currency: "USD", minimumFractionDigits: Number.isInteger(value) ? 0 : 2, maximumFractionDigits: 2 }).format(value).replace("US$", "US $");
const pct = (value) => value == null ? "N/A" : `${value.toFixed(2)}%`;
let allTrades = [], filtered = [], sortKey = "exit_time", sortDirection = -1, page = 1, pageSize = 10;
let csvDefaultCapitalUsd = null, selectedCapitalOption = "csv";

function link(url, label, extra = "") {
  if (extra === "contact") {
    const body = `<svg class="whatsapp-icon" viewBox="0 0 48 48" aria-hidden="true"><path d="M24 4a19 19 0 0 0-16.2 28.9L5 43l10.4-2.7A19 19 0 1 0 24 4Zm0 34.5a15.4 15.4 0 0 1-7.9-2.2l-.6-.4-6.2 1.6 1.7-6-.4-.6A15.5 15.5 0 1 1 24 38.5Zm8.5-11.6c-.5-.3-2.8-1.4-3.2-1.5-.4-.2-.8-.3-1.1.3-.3.5-1.2 1.5-1.5 1.8-.3.3-.6.4-1.1.1-.5-.3-2-.7-3.8-2.3-1.4-1.2-2.3-2.7-2.6-3.2-.3-.5 0-.8.2-1 .2-.2.5-.6.8-.9.2-.3.3-.5.5-.8.2-.3.1-.6 0-.9-.1-.3-1.1-2.6-1.5-3.5-.4-.9-.8-.8-1.1-.8h-1c-.3 0-.9.1-1.3.6-.4.5-1.7 1.7-1.7 4.1s1.8 4.7 2 5c.2.3 3.5 5.4 8.5 7.5 1.2.5 2.1.8 2.8 1 1.2.4 2.3.3 3.1.2 1-.1 2.8-1.2 3.2-2.3.4-1.1.4-2.1.3-2.3-.1-.2-.4-.3-.9-.6Z"/></svg>`;
    if (!url) return `<span class="link-button contact placeholder" title="Add your WhatsApp URL in SITE_CONFIG">${body}</span>`;
    return `<a class="link-button contact" href="${url}" target="_blank" rel="noopener noreferrer">${body}</a>`;
  }
  if (!url) return `<span class="link-button ${extra} placeholder" title="Add this URL in SITE_CONFIG in static/app.js">${label}<small>URL needed</small></span>`;
  if (extra === "secondary") return `<a class="link-button ${extra} shark-header-link" href="${url}" target="_blank" rel="noopener noreferrer" aria-label="Open account, get free ALGO" title="Open account, get free ALGO"><img src="./static/shark-exchange.svg?v=2" alt="SHARK EXCHANGE"><span class="shark-header-copy"><b>Open account</b><small>get free ALGO</small></span><span class="action-arrow" aria-hidden="true">›</span></a>`;
  return `<a class="link-button ${extra}" href="${url}" target="_blank" rel="noopener noreferrer">${label}</a>`;
}
function parseDate(value) { return new Date(value.length === 16 ? `${value}:00` : value); }
function fmtDate(value) { return parseDate(value).toLocaleString(undefined, { month: "short", day: "numeric", year: "2-digit", hour: "2-digit", minute: "2-digit" }); }
function metrics(trades) {
  const values = trades.map(t => Number(t.net_pnl));
  const wins = values.filter(v => v > 0), losses = values.filter(v => v < 0);
  let cumulative = 0, peak = 0, drawdown = 0;
  values.forEach(v => { cumulative += v; peak = Math.max(peak, cumulative); drawdown = Math.max(drawdown, peak - cumulative); });
  const profit = wins.reduce((a,b) => a+b, 0), loss = -losses.reduce((a,b) => a+b, 0);
  return { net: values.reduce((a,b) => a+b, 0), wins: wins.length, losses: losses.length, flat: values.length-wins.length-losses.length,
    count: values.length, winRate: values.length ? 100*wins.length/values.length : null, dd: drawdown,
    factor: loss ? profit/loss : null };
}
function renderMetrics(trades) {
  const m = metrics(trades);
  const capitalUsed = selectedCapitalOption === "csv" ? csvDefaultCapitalUsd : Number(selectedCapitalOption);
  const capitalScale = capitalUsed > 0 && csvDefaultCapitalUsd > 0 ? capitalUsed / csvDefaultCapitalUsd : 1;
  const summaryNet = m.net * capitalScale;
  const returnOnCapital = capitalUsed > 0 ? 100 * summaryNet / capitalUsed : null;
  $("#hero-pnl").textContent = usd(m.net); $("#hero-pnl").className = m.net >= 0 ? "positive" : "negative";
  $("#hero-win").textContent = pct(m.winRate); $("#hero-dd").textContent = usd(m.dd);
  $("#collapsed-pnl").textContent = usd(m.net); $("#collapsed-pnl").className = m.net >= 0 ? "positive" : "negative";
  $("#collapsed-win").textContent = pct(m.winRate);
  const capitalOptions = [["csv",usd(csvDefaultCapitalUsd)],["1000",usd(1000)],["1500",usd(1500)],["2000",usd(2000)],["5000",usd(5000)],["10000",usd(10000)]];
  const capitalSelect = `<select id="capital-used-select" class="capital-select" aria-label="Capital used for return calculation">${capitalOptions.map(([value,label]) => `<option value="${value}"${String(selectedCapitalOption) === value ? " selected" : ""}>${label}</option>`).join("")}</select>`;
  const cards = [["Net P&L (USD)",usd(summaryNet),"Estimated P&L scaled to selected capital"],["Total trades",m.count,"Completed trades"],
    ["Winning trades",m.wins,"Positive net P&L"],["Losing trades",m.losses,"Negative net P&L"],
    ["Win rate",pct(m.winRate),"Includes breakeven trades in denominator"],["Profit factor",m.factor == null ? "N/A" : m.factor.toFixed(2),m.factor == null ? "No gross losses in this period" : "Gross profit ÷ gross losses"],
    ["Capital Used (USD)",capitalSelect,""],
    ["Return on Capital",pct(returnOnCapital),`Scaled Net P&L ÷ ${usd(capitalUsed)}`]];
  $("#metrics").innerHTML = cards.map(([name,value,note]) => name === "Capital Used (USD)"
    ? `<article class="metric"><span>${name}</span>${value}${note ? `<small>${note}</small>` : ""}</article>`
    : `<article class="metric"><span>${name}</span><strong class="${name.includes("P&L") && m.net < 0 ? "negative" : ""}">${value}</strong><small>${note}</small></article>`).join("");
}
function renderChart(trades) {
  const el = $("#chart");
  if (!trades.length) { el.innerHTML = '<div class="empty">No completed trades in this date range.</div>'; $("#spark").innerHTML = ""; return; }
  let total = 0; const points = [{ trade: null, value: 0 }, ...trades.map(t => ({ trade:t, value:(total += Number(t.net_pnl)) }))];
  const width=900,height=230,left=58,right=12,top=15,bottom=27,vals=points.map(p=>p.value),min=Math.min(0,...vals),max=Math.max(0,...vals),span=max-min||1;
  const x=i=>left+i*(width-left-right)/(points.length-1||1), y=v=>top+(max-v)*(height-top-bottom)/span;
  const coords=points.map((p,i)=>`${x(i)},${y(p.value)}`).join(" ");
  const zero=y(0), ticks=[min,(min+max)/2,max];
  el.innerHTML=`<svg viewBox="0 0 ${width} ${height}" role="img" aria-label="Cumulative realized profit and loss"><defs><linearGradient id="equity-fill" x1="0" x2="0" y1="0" y2="1"><stop offset="0" stop-color="#13d6a0" stop-opacity=".22"/><stop offset="1" stop-color="#13d6a0" stop-opacity="0"/></linearGradient></defs><line x1="${left}" y1="${zero}" x2="${width-right}" y2="${zero}" stroke="#345262" stroke-dasharray="4 5"/>${ticks.map(v=>`<text x="${left-8}" y="${y(v)+4}" text-anchor="end">${Math.round(v).toLocaleString()}</text>`).join("")}<polygon points="${left},${zero} ${coords} ${x(points.length-1)},${zero}" fill="url(#equity-fill)"/><polyline points="${coords}" fill="none" stroke="#13d6a0" stroke-width="3" stroke-linejoin="round" stroke-linecap="round"/>${points.filter(p=>p.trade).map((p,i)=>`<circle cx="${x(i+1)}" cy="${y(p.value)}" r="4" fill="#13d6a0"><title>${fmtDate(p.trade.exit_time)} · ${usd(p.value)} cumulative</title></circle>`).join("")}<text x="${left}" y="${height-5}">${fmtDate(trades[0].exit_time).split(",")[0]}</text><text x="${width-right}" y="${height-5}" text-anchor="end">${fmtDate(trades.at(-1).exit_time).split(",")[0]}</text></svg>`;
  const sparkW=260,sparkH=62,sy=v=>sparkH-5-(v-min)/(span)* (sparkH-10),sx=i=>i*(sparkW/(points.length-1||1));
  const sparkCoords=points.map((p,i)=>`${sx(i)},${sy(p.value)}`).join(" ");
  $("#spark").innerHTML=`<svg viewBox="0 0 ${sparkW} ${sparkH}" preserveAspectRatio="none" role="img" aria-label="Cumulative P and L sparkline"><defs><linearGradient id="spark-fill" x1="0" x2="0" y1="0" y2="1"><stop offset="0" stop-color="#13d6a0" stop-opacity=".34"/><stop offset="1" stop-color="#13d6a0" stop-opacity="0"/></linearGradient></defs><polygon points="0,${sparkH} ${sparkCoords} ${sparkW},${sparkH}" fill="url(#spark-fill)"/><polyline points="${sparkCoords}" fill="none" stroke="#13d6a0" stroke-width="2.5" stroke-linejoin="round" stroke-linecap="round"/></svg>`;
}
function renderTable() {
  const query=$("#search").value.trim().toLowerCase();
  const matches=filtered.filter(t=>Object.values(t).some(v=>String(v ?? "").toLowerCase().includes(query)));
  matches.sort((a,b)=>{ const av=a[sortKey] ?? "", bv=b[sortKey] ?? ""; return (typeof av === "number" ? av-bv : String(av).localeCompare(String(bv),undefined,{numeric:true})) * sortDirection; });
  pageSize=Number($("#page-size").value); const pages=Math.max(1,Math.ceil(matches.length/pageSize)); page=Math.min(page,pages);
  $("#match-count").textContent=`${matches.length} matching trades`; $("#page-label").textContent=`${page} / ${pages}`;
  const firstRowIndex=(page-1)*pageSize;
  const rows=matches.slice(firstRowIndex,page*pageSize);
  $("#trade-rows").innerHTML=rows.length ? rows.map((t,index)=>`<tr><td>${matches.length-firstRowIndex-index}</td><td>${fmtDate(t.entry_time)}</td><td>${fmtDate(t.exit_time)}</td><td>${t.direction}</td><td>${usd(t.entry_price)}</td><td>${usd(t.exit_price)}</td><td>${Number(t.quantity).toLocaleString()}</td><td class="${t.net_pnl>=0?'positive':'negative'}">${usd(t.net_pnl)}</td></tr>`).join("") : '<tr><td colspan="8" class="empty">No matching trades in this date range.</td></tr>';
}
function applyRange(days, custom=false) {
  const exits=allTrades.map(t=>parseDate(t.exit_time)).filter(d=>!Number.isNaN(d.getTime()));
  const now=new Date(); let start,end;
  if (custom) { start=$("#from-date").value ? new Date(`${$("#from-date").value}T00:00:00`) : null; end=$("#to-date").value ? new Date(`${$("#to-date").value}T23:59:59`) : null;
    if (start && end && end < start) { $("#range-label").textContent="End date must be on or after the start date."; return; }
  } else { end=now; start=new Date(now); start.setDate(start.getDate()-days+1); }
  // Exit time is the canonical date for filtering; update summary, chart, and
  // table from this one selection so all three always show the same trades.
  filtered=allTrades.filter(t=>{const date=parseDate(t.exit_time);return (!start||date>=start)&&(!end||date<=end);}); page=1;
  $("#hero-pnl-label").textContent=custom?"Selected Period P&L":`Last ${days} Days P&L`;
  const from=start?.toLocaleDateString() ?? "all dates", to=end?.toLocaleDateString() ?? "all dates";
  const coverageDays=exits.length?(Math.max(...exits)-Math.min(...exits))/86400000:0;
  $("#range-label").textContent=`${from} – ${to}${!custom&&coverageDays<days-1?` · Available history covers ${Math.max(1,Math.ceil(coverageDays))} days`:""}`;
  renderMetrics(filtered); renderChart(filtered); renderTable();
}
async function init() {
  $("#contact-links").innerHTML=link(SITE_CONFIG.sharkExchangeUrl,"Open account","secondary");
  $("#metrics").addEventListener("change",event=>{if(event.target.id==="capital-used-select"){selectedCapitalOption=event.target.value;renderMetrics(filtered);}});
  const whatsappIcon=`<svg class="whatsapp-icon" viewBox="0 0 48 48" aria-hidden="true"><path d="M24 4a19 19 0 0 0-16.2 28.9L5 43l10.4-2.7A19 19 0 1 0 24 4Zm0 34.5a15.4 15.4 0 0 1-7.9-2.2l-.6-.4-6.2 1.6 1.7-6-.4-.6A15.5 15.5 0 1 1 24 38.5Zm8.5-11.6c-.5-.3-2.8-1.4-3.2-1.5-.4-.2-.8-.3-1.1.3-.3.5-1.2 1.5-1.5 1.8-.3.3-.6.4-1.1.1-.5-.3-2-.7-3.8-2.3-1.4-1.2-2.3-2.7-2.6-3.2-.3-.5 0-.8.2-1 .2-.2.5-.6.8-.9.2-.3.3-.5.5-.8.2-.2.1-.6 0-.9-.1-.3-1.1-2.6-1.5-3.5-.4-.9-.8-.8-1.1-.8h-1c-.3 0-.9.1-1.3.6-.4.5-1.7 1.7-1.7 4.1s1.8 4.7 2 5c.2.3 3.5 5.4 8.5 7.5 1.2.5 2.1.8 2.8 1 1.2.4 2.3.3 3.1.2 1-.1 2.8-1.2 3.2-2.3.4-1.1.4-2.1.3-2.3-.1-.2-.4-.3-.9-.6Z"/></svg>`;
  document.body.insertAdjacentHTML("beforeend",`<a class="floating-whatsapp" href="${SITE_CONFIG.whatsappUrl}" target="_blank" rel="noopener noreferrer" aria-label="Chat with us on WhatsApp" title="Chat with us on WhatsApp">${whatsappIcon}</a>`);
  $("#contact-actions").innerHTML=`<a class="contact-card shark-action" href="${SITE_CONFIG.sharkExchangeUrl}" target="_blank" rel="noopener noreferrer"><img class="shark-logo" src="./static/shark-exchange.svg?v=2" alt="SHARK EXCHANGE"><span class="shark-action-copy"><b>Open account</b><small>get free ALGO</small></span><span class="action-arrow">›</span></a>`;
  $("#social-links").innerHTML=`<a class="social-card" href="${SITE_CONFIG.youtubeUrl}" target="_blank" rel="noopener noreferrer"><span class="social-icon youtube-icon"><svg viewBox="0 0 48 48" aria-hidden="true"><rect x="3" y="3" width="42" height="42" rx="10"/><path d="M38 17.2a4.5 4.5 0 0 0-3.2-3.2C32 13.2 24 13.2 24 13.2s-8 0-10.8.8a4.5 4.5 0 0 0-3.2 3.2 46 46 0 0 0-.8 6.8 46 46 0 0 0 .8 6.8 4.5 4.5 0 0 0 3.2 3.2c2.8.8 10.8.8 10.8.8s8 0 10.8-.8a4.5 4.5 0 0 0 3.2-3.2 46 46 0 0 0 .8-6.8 46 46 0 0 0-.8-6.8ZM21 29.5v-11l9.5 5.5-9.5 5.5Z"/></svg></span><span class="social-copy"><b>YouTube</b><small>Strategy Videos</small></span><svg class="external-icon" viewBox="0 0 24 24" aria-hidden="true"><path d="M14 4h6v6M20 4l-9 9M18 13v6a1 1 0 0 1-1 1H5a1 1 0 0 1-1-1V7a1 1 0 0 1 1-1h6"/></svg></a><a class="social-card" href="${SITE_CONFIG.telegramUrl}" target="_blank" rel="noopener noreferrer"><span class="social-icon telegram-icon"><svg viewBox="0 0 48 48" aria-hidden="true"><rect x="3" y="3" width="42" height="42" rx="10"/><path d="m11 22 25-10c1.2-.5 2.3.3 1.9 1.8l-4.3 21c-.3 1.5-1.2 1.8-2.5 1l-7-5.2-3.4 3.3c-.5.5-.9.9-1.8.9l.5-7.1 13-11.7c.6-.5-.1-.8-.9-.3L15.5 26.2l-6.8-2.1c-1.5-.5-1.5-1.5 2.3-3.1Z"/></svg></span><span class="social-copy"><b>Telegram</b><small>Updates &amp; Alerts</small></span><svg class="external-icon" viewBox="0 0 24 24" aria-hidden="true"><path d="M14 4h6v6M20 4l-9 9M18 13v6a1 1 0 0 1-1 1H5a1 1 0 0 1-1-1V7a1 1 0 0 1 1-1h6"/></svg></a>`;
  try {
    const response=await fetch("./output/dashboard_data.json"); if(!response.ok) throw new Error(`HTTP ${response.status}`);
    const data=await response.json();
    if (!Array.isArray(data.completed_trades) || !data.validation || !data.coverage) throw new Error("Dashboard JSON is missing required fields.");
    allTrades=data.completed_trades;
    csvDefaultCapitalUsd=allTrades.length?Math.max(...allTrades.map(t=>Math.abs(Number(t.entry_price)*Number(t.quantity)))):null;
    $("#generated").textContent=`Updated ${new Date(data.generated_at).toLocaleString()}`;
    $("#filters button[data-range='7']").classList.add("active"); applyRange(7);
  } catch(error) { $("#error").hidden=false; $("#error").textContent=`Dashboard data could not be loaded. Generate output/dashboard_data.json with “python3 process_trades.py” and serve the project over HTTP. (${error.message})`; }
}
$("#filters").addEventListener("click",event=>{const button=event.target.closest("button[data-range]");if(!button)return;$("#filters .active")?.classList.remove("active");button.classList.add("active");if(button.dataset.range==="custom"){applyRange(null,true);}else applyRange(Number(button.dataset.range));});
$("#from-date").addEventListener("change",()=>{ $("#filters .active")?.classList.remove("active");$("#filters button[data-range='custom']").classList.add("active");applyRange(null,true);});
$("#to-date").addEventListener("change",()=>{ $("#filters .active")?.classList.remove("active");$("#filters button[data-range='custom']").classList.add("active");applyRange(null,true);});
$("#search").addEventListener("input",()=>{page=1;renderTable();}); $("#page-size").addEventListener("change",()=>{page=1;renderTable();});
$("#prev").addEventListener("click",()=>{page=Math.max(1,page-1);renderTable();});$("#next").addEventListener("click",()=>{page++;renderTable();});
document.querySelectorAll("th[data-sort]").forEach(th=>th.addEventListener("click",()=>{sortDirection=sortKey===th.dataset.sort?-sortDirection:1;sortKey=th.dataset.sort;renderTable();}));
$("#hero-toggle").addEventListener("click",()=>{
  const toggle=$("#hero-toggle"), details=$("#dashboard-details");
  details.hidden=!details.hidden;
  const expanded=!details.hidden;
  toggle.setAttribute("aria-expanded",String(expanded));
  toggle.setAttribute("aria-label",expanded?"Collapse strategy details":"Expand strategy details");
  // Derive styling from the actual visibility state so arrow, compact summary,
  // and detail panels cannot get out of sync after repeated toggles.
  $(".hero").classList.toggle("collapsed",details.hidden);
});
init();
