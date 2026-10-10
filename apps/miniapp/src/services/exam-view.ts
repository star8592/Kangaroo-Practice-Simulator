/**
 * Pure view state for the native WeChat exam page.
 * Answer state, scoring and server session identity are unaffected by language changes.
 */
export type ExamLanguage = 'zh' | 'en'
export type ExamChoice = {key:string;label:string}
export type ExamQuestionView = {
  id:string
  stem?:string
  stemEn?:string
  choices?:ExamChoice[]
  choicesEn?:ExamChoice[]
  assetUrl?:string
  assetUrlZh?:string
  assetUrlEn?:string
}

const clean = (value:unknown) => typeof value === 'string' ? value.trim() : ''

export function examAnswerProgress(
  questions: ReadonlyArray<{id:string}>,
  answers: Readonly<Record<string,string>>,
) {
  const answered = questions.reduce((count, question) =>
    count + (clean(answers[question.id]) ? 1 : 0), 0)
  return {answered, blank:questions.length-answered, total:questions.length}
}

export function localizedExamQuestion(question:ExamQuestionView,lang:ExamLanguage){
  const english=lang==='en'
  const zhChoices=Array.isArray(question.choices)?question.choices:[]
  const enChoices=Array.isArray(question.choicesEn)?question.choicesEn:[]
  const byKey=new Map(enChoices.map(choice=>[choice.key,clean(choice.label)]))
  return {
    // Never invent an English translation. The supplied English material may
    // contain a source-language fallback when no translation exists.
    stem:english?(clean(question.stemEn)||clean(question.stem)):(clean(question.stem)||clean(question.stemEn)),
    choices:zhChoices.map(choice=>({
      key:choice.key,
      label:(english?byKey.get(choice.key):'')||choice.label,
    })),
    assetUrl:(english?question.assetUrlEn:question.assetUrlZh)||question.assetUrl||'',
  }
}

export function examQuestionNumber(index:number,count:number){
  return Number.isSafeInteger(index)&&index>=0&&index<count?index+1:null
}
