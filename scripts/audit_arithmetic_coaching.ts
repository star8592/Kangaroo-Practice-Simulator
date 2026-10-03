import {generateArithmeticSet} from '../src/lib/arithmetic-generator';
import {coachingSteps} from '../src/lib/arithmetic-coaching';
import type {ArithmeticGrade} from '../src/lib/arithmetic';

for (const grade of [1,2,3,4,5,6,7,8,9,10,11,12] as ArithmeticGrade[]){
  const items=generateArithmeticSet(grade,240,grade*99173);
  const groups=new Map<string,string[]>();
  for(const item of items){
    const h=coachingSteps(item)[0]?.text??'[NO HINT]';
    const key=grade<=6?item.strategy:item.skillId;
    const arr=groups.get(key)??[];
    if(arr.length<12) arr.push(`${item.prompt}  ==>  ${h}`);
    groups.set(key,arr);
  }
  console.log(`\n===== GRADE ${grade} =====`);
  for(const [group,rows] of groups){console.log(`\n-- ${group} --`);console.log(rows.join('\n'));}
}
