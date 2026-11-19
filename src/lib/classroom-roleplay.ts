/** Teacher-declared role labels are display metadata, never scoring targets.
 * Each label is bound to the verified sentence ordering and kept in tenant RLS.
 */
export function validateSpeakerLabels(value:unknown,count:number):(string|null)[]{
  if(value===undefined)return Array(count).fill(null);
  if(!Array.isArray(value)||value.length!==count)
    throw new Error("speaker_labels must match sentence_ids");
  return value.map(x=>{
    if(x===null||x==="")return null;
    if(typeof x!=="string"||x.length>24||!/^[A-Za-z][A-Za-z0-9_.-]{0,23}$/.test(x))
      throw new Error("invalid speaker label");
    return x;
  });
}
