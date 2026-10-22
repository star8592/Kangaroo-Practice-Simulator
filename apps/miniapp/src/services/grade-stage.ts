// Keep backend grade values 1–12 unchanged; make the school stages readable for families.
export const schoolStage = (grade:number): '小学'|'初中'|'高中' => {
  if (!Number.isInteger(grade) || grade < 1 || grade > 12) throw new RangeError('grade must be 1–12')
  return grade <= 6 ? '小学' : grade <= 9 ? '初中' : '高中'
}

const gradeNames = ['一年级','二年级','三年级','四年级','五年级','六年级','初一','初二','初三','高一','高二','高三'] as const

export const gradeChoices = gradeNames.map((label,index)=>({
  grade:index+1,
  label:`${schoolStage(index+1)} · ${label}`
}))
