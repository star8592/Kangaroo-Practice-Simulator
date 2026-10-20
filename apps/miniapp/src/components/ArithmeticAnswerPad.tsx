import { Button, Text, View } from '@tarojs/components'
import type { MathAnswerKind } from '../services/math-answer-keypad'
import { mathAnswerKeys } from '../services/math-answer-keypad'

type Props={
 kind:MathAnswerKind;
 raw:string;
 busy?:boolean;
 onInsert:(value:string)=>void;
 onBackspace:()=>void;
 onSubmit:()=>void;
}
export default function ArithmeticAnswerPad({kind,raw,busy,onInsert,onBackspace,onSubmit}:Props){
 const keys=mathAnswerKeys(kind)
 return <View className='arithmetic-answer-pad' aria-label='数学答案键盘'>
  <View className='muted arithmetic-key-hint'><Text>按下面的键输入答案，支持负数、分数和高年级数学符号</Text></View>
  <View className='arithmetic-key-grid'>
   {keys.map((key,i)=><Button key={key.label+i} className='arithmetic-key' disabled={busy}
     onClick={()=>onInsert(key.insert)}>{key.label}</Button>)}
   <Button className='arithmetic-key arithmetic-key-back' disabled={busy||!raw}
     onClick={onBackspace}>⌫ 删除</Button>
   <Button className='arithmetic-key arithmetic-key-submit' disabled={busy||!raw.trim()}
     onClick={onSubmit}>提交答案</Button>
  </View>
 </View>
}
