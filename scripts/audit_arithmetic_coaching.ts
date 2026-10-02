import {generateArithmeticSet} from '../src/lib/arithmetic-generator';
import {coachingSteps} from '../src/lib/arithmetic-coaching';
for (const grade of [1,2,3,4,5,6] as const){
  const items=generateArithmeticSet(grade,240,grade*99173);
  const groups=new Map<string,string[]>();
  for(const item of items){
    const h=coachingSteps(item)[0]?.text??'[NO HINT]';
    const arr=groups.get(item.strategy)??[];
    if(arr.length<12) arr.push(`${item.prompt}  ==>  ${h}`);
    groups.set(item.strategy,arr);
  }
  console.log(`\n===== GRADE ${grade} =====`);
  for(const [strategy,rows] of groups){console.log(`\n-- ${strategy} --`);console.log(rows.join('\n'));}
}
