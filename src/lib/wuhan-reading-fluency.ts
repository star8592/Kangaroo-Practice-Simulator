type Obj=Record<string,unknown>;
const obj=(v:unknown):Obj=>v!==null&&typeof v==="object"&&!Array.isArray(v)?v as Obj:{};
const integer=(v:unknown):v is number=>typeof v==="number"&&Number.isSafeInteger(v)&&v>=0;
const words=(v:unknown)=>typeof v==="string"&&v.length<=2400&&!/[^\x00-\x7f]/.test(v)?v.toLowerCase().replaceAll("rain water","rainwater").split(/[^a-z0-9]+/).filter(Boolean):[];
export type ReadingFluency={activity:number;pauses:number;longestMs:number;recordingWpm:number|null;activeWpm:number|null};
// Independently recompute the scorer's descriptive ratios before displaying.
// Older reports have no fluency evidence; do not synthesize a new score.
export function readingFluency(value:unknown):ReadingFluency|null{
 const item=obj(value),d=obj(obj(item.candidate).diagnosis),t=obj(d.timing),e=obj(d.fluency_evidence);
 if(item.kind!=="read"||d.status!==item.state||!["reference_text_matched","reference_text_differs","asr_disagreement"].includes(String(item.state))||d.official_score!==false||d.pronunciation_score!==null||e.schema_version!==1||e.basis!=="vad_with_optional_dual_asr_word_count")return null;
 const duration=t.duration_ms,speech=t.speech_ms,segments=t.speech_segments,gaps=t.internal_gap_count,longest=t.longest_internal_gap_ms;
 if(!integer(duration)||!integer(speech)||!integer(segments)||!integer(gaps)||!integer(longest)||duration<1||duration>90000||speech<1||speech>duration||segments<1||segments>600||gaps!==segments-1||longest>duration-speech||(gaps===0&&longest!==0))return null;
 const a=words(d.primary_text),b=words(d.secondary_text);
 if(!a.length||!b.length)return null;
 const agree=a.length===b.length&&a.every((v,i)=>v===b[i]);
 if(agree===(item.state==="asr_disagreement"))return null;
 const n=agree&&a.length>=5&&a.length<=500&&duration>=2000&&speech>=1000?a.length:null;
 const activity=Math.round(100*speech/duration),recordingWpm=n===null?null:Math.round(n*60000/duration),activeWpm=n===null?null:Math.round(n*60000/speech);
 if(e.speech_activity_percent!==activity||e.internal_pause_count!==gaps||e.longest_internal_pause_ms!==longest||e.agreed_recognized_words!==n||e.recording_words_per_minute!==recordingWpm||e.active_speech_words_per_minute!==activeWpm||Object.keys(e).length!==8)return null;
 return {activity,pauses:gaps,longestMs:longest,recordingWpm,activeWpm};
}
