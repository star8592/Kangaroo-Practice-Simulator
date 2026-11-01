"use client";

/** Uses the browser's native print dialog. Users may choose Save as PDF,
 * retaining the authored typography without a second generated asset.
 */
export default function CareerGuidePrintButton(){
  return <button type="button" onClick={()=>window.print()}>
    打印 / 另存为 PDF
  </button>;
}
