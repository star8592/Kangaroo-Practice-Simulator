/** Submission wording must not assume zero points: AMC-type papers may give blank credits. */
export function examSubmissionCopy(total:number,answered:number){
 const count=Math.max(0,Math.floor(total))
 const done=Math.max(0,Math.min(count,Math.floor(answered)))
 if(done===0)return {
   title:'确认交白卷',
   content:'本卷共 '+count+' 题，你还没有填写任何答案。交白卷会按本赛事的评分规则计分，交卷后不能修改。确定提交吗？'
 }
 if(done<count)return {
   title:'确认提前交卷',
   content:'已作答 '+done+'/'+count+' 题，仍有 '+(count-done)+' 题留空。空题将按赛事规则计分，交卷后不能修改。确定交卷吗？'
 }
 return {title:'确认交卷',content:'全部 '+count+' 题均已作答。交卷后不能修改，确定提交吗？'}
}
export function isBlankPaper(correct:number,wrong:number,blank:number){
 return correct===0&&wrong===0&&blank>0
}
