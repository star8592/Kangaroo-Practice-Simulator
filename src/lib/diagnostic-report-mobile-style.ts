export const DIAGNOSTIC_REPORT_MOBILE_CSS = String.raw`
@media(max-width:600px){
  .diagnostic-report .report-page{overflow-x:auto}
  .dr-summary-item{grid-template-columns:24px minmax(0,1fr);gap:8px 10px}
  .dr-confidence{grid-column:2;justify-self:start}
  .dr-section-head{align-items:flex-start;flex-direction:column;gap:3px}
  .dr-table{min-width:680px}
  .dr-title{font-size:24px}
  .dr-cover-band{padding:18px;border-radius:14px;gap:18px}
  .dr-person{grid-template-columns:1fr 1fr}
}
`;
