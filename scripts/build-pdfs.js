// Builds one PDF per lesson and daily brief into /pdf, from the content inside index.html.
// Run after adding or changing any lesson:  node scripts/build-pdfs.js
// Reading part only. Quiz questions and answers are never included.
const fs=require("fs"), path=require("path"), vm=require("vm");
const {chromium}=require("playwright");
const root=path.join(__dirname,"..");
const html=fs.readFileSync(path.join(root,"index.html"),"utf8");
const cut=(from,to)=>{const a=html.indexOf(from), b=html.indexOf(to,a);if(a<0||b<0) throw new Error("Could not find "+from+" in index.html");return html.slice(a,b);};
const ctx={}; vm.createContext(ctx);
vm.runInContext(cut("const TRACKS=[","/* ---------- config")+"\n"+cut("const DAILY=[","/* ---------- derived")+"\n;this.TRACKS=TRACKS;this.LESSONS=LESSONS;this.DAILY=DAILY;",ctx);
const {TRACKS,LESSONS,DAILY}=ctx;
const esc=s=>String(s).replace(/[&<>"]/g,c=>({"&":"&amp;","<":"&lt;",">":"&gt;",'"':"&quot;"}[c]));
const MON=["January","February","March","April","May","June","July","August","September","October","November","December"];
const nice=d=>{const p=d.split("-");return Number(p[2])+" "+MON[Number(p[1])-1]+" "+p[0];};
const css=`
@page{size:A4;margin:18mm 16mm 20mm}
*{box-sizing:border-box}
body{font-family:Inter,"Helvetica Neue",Arial,sans-serif;font-size:10.5pt;line-height:1.5;color:#131A2A;margin:0}
.brand{font-weight:700;font-size:9pt;letter-spacing:.08em;text-transform:uppercase;color:#1F4FD8}
.eyebrow{font-size:8.5pt;letter-spacing:.07em;text-transform:uppercase;color:#566178;margin:10pt 0 2pt}
h1{font-size:21pt;line-height:1.15;margin:0 0 12pt;font-weight:700}
h3{font-size:12pt;margin:14pt 0 4pt;font-weight:700;break-after:avoid}
p{margin:0 0 7pt} ul{margin:0 0 7pt;padding-left:15pt} li{margin-bottom:3pt}
table{border-collapse:collapse;width:100%;font-size:9pt;margin:4pt 0 8pt}
th,td{text-align:left;padding:5pt 6pt;border:0.6pt solid #C9D0DD;vertical-align:top}
th{background:#EEF1F7;font-size:8pt;letter-spacing:.04em;text-transform:uppercase;color:#3B465C}
td.num,th.num{text-align:right;white-space:nowrap}
tr{break-inside:avoid}
.note{font-size:8.5pt;color:#566178}
.takeaways{background:#E6ECFC;border-radius:6pt;padding:10pt 12pt;margin-top:12pt;break-inside:avoid}
.takeaways h3{margin-top:0}
.head{display:flex;justify-content:space-between;align-items:baseline;border-bottom:1.2pt solid #1F4FD8;padding-bottom:5pt}
.head span{font-size:8.5pt;color:#566178}
`;
function page(l,label){
  return `<!doctype html><html><head><meta charset="utf-8"><style>${css}</style></head><body>
  <div class="head"><div class="brand">D Byk Product Academy</div><span>For internal training</span></div>
  <p class="eyebrow">${esc(label)} · ${l.mins} min read</p><h1>${esc(l.title)}</h1>
  ${l.body}
  <div class="takeaways"><h3>Remember these</h3><ul>${l.takeaways.map(x=>`<li>${esc(x)}</li>`).join("")}</ul></div>
  </body></html>`;
}
(async()=>{
  const out=path.join(root,"pdf"); fs.mkdirSync(out,{recursive:true});
  const items=LESSONS.map(l=>[l,(TRACKS.find(t=>t.id===l.track)||{name:""}).name])
    .concat(DAILY.map(l=>[l,"Daily quiz · "+nice(l.date)]));
  const browser=await chromium.launch(); const pg=await browser.newPage();
  for(const [l,label] of items){
    await pg.setContent(page(l,label),{waitUntil:"load"});
    await pg.pdf({path:path.join(out,l.id+".pdf"),format:"A4",printBackground:true,displayHeaderFooter:true,
      headerTemplate:"<span></span>",
      footerTemplate:`<div style="font-size:7.5pt;color:#566178;width:100%;padding:0 16mm;display:flex;justify-content:space-between;font-family:Arial,sans-serif"><span>${esc(l.title)}</span><span><span class="pageNumber"></span> / <span class="totalPages"></span></span></div>`});
  }
  await browser.close();
  const keep=new Set(items.map(([l])=>l.id+".pdf"));
  fs.readdirSync(out).forEach(f=>{if(f.endsWith(".pdf")&&!keep.has(f))fs.unlinkSync(path.join(out,f));});
  console.log("Built "+items.length+" PDFs");
})();
