#!/usr/bin/env python3
"""Build revised independent SEAMO foundational practice; preserve published v1 IDs."""
from pathlib import Path
import json

ROOT=Path(__file__).resolve().parents[1]
DEST=ROOT/'src/data/seamo-original-mocks'
# (Chinese question, English question, numeric answer, Chinese reasoning, English reasoning, concept)
G1=[
('小乐有7颗红珠子和5颗蓝珠子，送出3颗。还剩多少颗？','Lele has 7 red beads and 5 blue beads. She gives away 3. How many remain?',9,'7+5−3=9。','7+5−3=9.','arithmetic'),
('数列2，5，8，11，下一项是多少？','What is the next number in 2, 5, 8, 11, ...?',14,'每次加3，11+3=14。','Add 3 each time: 11+3=14.','patterns'),
('4个盘子，每个盘子放3块饼干，一共有多少块？','There are 4 plates with 3 cookies on each. How many cookies altogether?',12,'4×3=12。','4×3=12.','multiplication'),
('排队时小乐前面有6人，后面有4人，队伍共有多少人？','There are 6 children in front of Lele and 4 behind. How many children are in the line?',11,'6+1+4=11。','6+1+4=11.','logic'),
('两行星星，每行4颗，划掉1颗后还剩几颗？','There are 2 rows of 4 stars. One is crossed out. How many stars remain?',7,'2×4−1=7。','2×4−1=7.','counting'),
('一张10元纸币、一张5元纸币和一枚2元硬币，一共多少元？','You have a 10-yuan note, a 5-yuan note and a 2-yuan coin. How many yuan altogether?',17,'10+5+2=17。','10+5+2=17.','money'),
('从1数到20（包括1和20），有多少个偶数？','How many even numbers are there from 1 to 20 inclusive?',10,'偶数是2、4、…、20，共10个。','They are 2, 4, ..., 20: 10 even numbers.','number-sense'),
('两位数37的十位数字与个位数字相加，结果是多少？','What is the sum of the two digits in 37?',10,'3+7=10。','3+7=10.','place-value'),
('12块饼干平均分给4个孩子，每人几块？','12 cookies are shared equally among 4 children. How many does each get?',3,'12÷4=3。','12÷4=3.','division'),
('长4厘米、宽3厘米的长方形，周长是多少厘米？','A rectangle is 4 cm long and 3 cm wide. What is its perimeter in cm?',14,'(4+3)×2=14。','(4+3)×2=14.','geometry'),
('从15到20（包括15和20），共有几个整数？','How many whole numbers are there from 15 to 20 inclusive?',6,'20−15+1=6。','20−15+1=6.','counting'),
('现在是上午9点，2小时后是几点？','It is 9 a.m. now. What hour will it be in 2 hours?',11,'9+2=11，上午11点。','9+2=11, so 11 a.m.','time'),
('袋子里有2个红球和3个蓝球。闭眼摸球，至少摸几个才能保证摸到红球？','A bag has 2 red balls and 3 blue balls. What is the fewest draws needed to guarantee a red ball?',4,'最坏先摸到3个蓝球，第4个必为红球。','In the worst case, the first 3 are blue; the 4th must be red.','logic'),
('教室里有3排椅子，每排4把，其中2把没人坐。有多少把椅子有人坐？','There are 3 rows of 4 chairs, and 2 chairs are empty. How many chairs are occupied?',10,'3×4−2=10。','3×4−2=10.','arithmetic'),
('观察规律：1，2，4，7，11，下一项是多少？','Complete the pattern: 1, 2, 4, 7, 11, ...',16,'相邻差依次是1、2、3、4，下一次加5，得到16。','The differences are 1, 2, 3, 4; next add 5 to get 16.','patterns'),
]
G2=[
('6盒铅笔，每盒4支，送给朋友7支后还剩多少支？','There are 6 boxes with 4 pencils each. After giving away 7, how many remain?',17,'6×4−7=17。','6×4−7=17.','arithmetic'),
('数列3，6，12，24，下一项是多少？','What comes next: 3, 6, 12, 24, ...?',48,'每次乘2，24×2=48。','Double each time: 24×2=48.','patterns'),
('4个孩子每人分到5颗糖，还剩3颗。原来有多少颗？','Four children each receive 5 candies and 3 are left. How many candies were there?',23,'4×5+3=23。','4×5+3=23.','arithmetic'),
('从1到20（包括20），有多少个数能被3整除？','How many integers from 1 to 20 inclusive are divisible by 3?',6,'3、6、9、12、15、18，共6个。','3, 6, 9, 12, 15, 18: six numbers.','number-sense'),
('一个长方形长5厘米、宽3厘米，周长多少厘米？','A rectangle is 5 cm long and 3 cm wide. What is its perimeter in cm?',16,'(5+3)×2=16。','(5+3)×2=16.','geometry'),
('一个正方形周长24厘米，每条边长多少厘米？','A square has a perimeter of 24 cm. How long is each side in cm?',6,'24÷4=6。','24÷4=6.','geometry'),
('抽屉里只有红袜和蓝袜。闭眼至少拿几只袜子，才能保证有两只同色？','A drawer has only red and blue socks. How many must you take to guarantee two of the same color?',3,'最多先拿到一红一蓝，第3只一定与其中一只同色。','At worst, the first two are different; the third matches one.','logic'),
('小乐排队时前面8人、后面5人，这队共有多少人？','There are 8 people ahead of Lele and 5 behind. How many people are in the line?',14,'8+1+5=14。','8+1+5=14.','logic'),
('一个两位数的十位数字是4，两个数字的和是9，这个数是多少？','A two-digit number has tens digit 4 and its digits add to 9. What is the number?',45,'个位是9−4=5，所以是45。','The ones digit is 9−4=5, so the number is 45.','place-value'),
('现在是2点45分，过30分钟后，距离4点还有多少分钟？','It is 2:45. After 30 minutes, how many minutes remain until 4:00?',45,'30分钟后是3:15，距4:00还有45分钟。','Thirty minutes later is 3:15, leaving 45 minutes.','time'),
('三个连续整数的和是36，中间那个整数是多少？','Three consecutive integers add to 36. What is the middle integer?',12,'中间数等于平均数，36÷3=12。','The middle number is the average: 36÷3=12.','number-sense'),
('5篮橘子，每篮6个，拿走8个后还剩多少个？','Five baskets each hold 6 oranges. If 8 are taken away, how many remain?',22,'5×6−8=22。','5×6−8=22.','arithmetic'),
('小于100的最大7的倍数是多少？','What is the greatest multiple of 7 less than 100?',98,'7×14=98，7×15=105超过100。','7×14=98 and 7×15=105 is too large.','number-sense'),
('一个2行2列的小方格图（由4个相同小正方形组成），一共有多少个正方形？','A 2-by-2 grid is made of 4 equal small squares. How many squares of all sizes are there?',5,'4个小正方形加1个大正方形，共5个。','Four small squares plus one large square make 5.','geometry'),
('从A、B、C三张不同的卡片中选2张排成一排，有多少种排法？','Choose 2 different cards from A, B and C and place them in order. How many arrangements?',6,'第一张3种，第二张2种，共3×2=6。','Three choices for the first, two for the second: 3×2=6.','combinatorics'),
('4个朋友彼此握手，每两人只握一次手，一共握几次？','Four friends each shake hands once with every other friend. How many handshakes occur?',6,'4×3÷2=6，每次握手涉及两个人。','4×3÷2=6 because each handshake involves two people.','combinatorics'),
('从10到99的两位数中，个位数字是5的数有几个？','How many two-digit numbers from 10 to 99 have a ones digit of 5?',9,'15、25、…、95，共9个。','15, 25, ..., 95: nine numbers.','number-sense'),
('24颗糖每袋最多装5颗，全部装完至少需要几个袋子？','Each bag holds at most 5 candies. How many bags are needed for 24 candies?',5,'4袋只能装20颗，所以至少5袋。','Four bags hold only 20, so 5 bags are needed.','logic'),
('数列1，4，9，16，下一项是多少？','What is the next number in 1, 4, 9, 16, ...?',25,'依次为1²、2²、3²、4²，下一项5²=25。','They are 1², 2², 3², 4²; next is 5²=25.','patterns'),
('3排座位，每排4个，有5个空位。坐了多少人？','There are 3 rows of 4 seats with 5 empty seats. How many people are seated?',7,'3×4−5=7。','3×4−5=7.','arithmetic'),
('某个数乘2再加7等于25，这个数是多少？','A number is doubled and then 7 is added to make 25. What is the number?',9,'(25−7)÷2=9。','(25−7)÷2=9.','algebra'),
('从1到30（包括30），有多少个数能被4整除？','How many integers from 1 to 30 inclusive are divisible by 4?',7,'4、8、12、16、20、24、28，共7个。','4, 8, 12, 16, 20, 24, 28: seven numbers.','number-sense'),
('一个长方形长4厘米、宽3厘米，它的周长是多少厘米？','A rectangle is 4 cm long and 3 cm wide. What is its perimeter in cm?',14,'(4+3)×2=14。','(4+3)×2=14.','geometry'),
('5个孩子每人送给其他每个孩子一张卡片，总共送出多少张？','Five children each give one card to every other child. How many cards are given in total?',20,'每人送4张，5×4=20。','Each gives 4 cards: 5×4=20.','combinatorics'),
('数列1，2，4，7，11，16，下一项是多少？','Complete the pattern: 1, 2, 4, 7, 11, 16, ...',22,'差依次为1、2、3、4、5，下一次加6得到22。','The differences are 1, 2, 3, 4, 5; add 6 to get 22.','patterns'),
]

def build(grade,items,minutes):
    questions=[]
    for n,(zh,en,value,solzh,solen,concept) in enumerate(items,1):
        mode='choice' if grade==1 or n<=20 else 'integer'
        choices=[];answer=str(value)
        if mode=='choice':
            delta=max(1,value//8)
            vals=[value-2*delta,value-delta,value,value+delta,value+2*delta]
            assert len(set(vals))==5 and min(vals)>=0
            shift=n%5;vals=vals[shift:]+vals[:shift]
            choices=[{'key':chr(65+i),'label':str(v)} for i,v in enumerate(vals)]
            answer=chr(65+vals.index(value))
        questions.append({'id':f'seamo-original-g{grade}-revised-q{n:02d}','year':2026,'level':f'Grade {grade}','grades':f'Grade {grade}','language':'zh/en','questionNo':n,'points':1,'answerMode':mode,'concept':concept,'stem':zh,'stemEn':en,'choices':choices,'choicesEn':choices,'answer':answer,'solution':solzh,'localized':{'zh':{'stem':zh,'choices':choices,'solution':solzh},'en':{'stem':en,'choices':choices,'solution':solen}},'sourceFile':'independent-seamo-foundational-revised','verified':False,'examReady':True})
    profile={'id':f'seamo-original-g{grade}-revised-1','name':f'SEAMO Grade {grade} Revised Foundational Practice','nameZh':f'SEAMO {grade}年级 · 原创基础训练（修订版）','nameEn':f'SEAMO Grade {grade} · Revised Foundational Practice','grades':f'Grade {grade}','gradeBand':'1-2','durationSeconds':minutes*60,'questionCount':len(questions),'initialScore':0,'maxScore':len(questions),'wrongPenaltyMode':'fixed','wrongPenaltyValue':0,'country':'Singapore SEAMO','year':2026,'language':'zh/en','competitionId':'seamo','formatId':f'seamo-g{grade}-original-mock','paperType':'practice','timingMode':'recommended','studentReady':True,'sourceLabelZh':'本站独立编写的修订版基础训练 · 非官方真题','sourceLabelEn':'Independent revised foundational practice · not official past papers','rulesSummaryZh':f'{len(questions)}题 / 训练计时{minutes}分钟，到时自动交卷；每题1分、不倒扣，非官方计分标准。','rulesSummaryEn':f'{len(questions)} questions / {minutes}-minute practice timer with automatic submission; 1 point each, no penalty; not official scoring.','formatLabelZh':f'SEAMO {"Pre-A" if grade==1 else "A"} · 本站原创修订版','formatLabelEn':f'SEAMO {"Pre-A" if grade==1 else "A"} · Independent revised practice'}
    assert len({x['stem'] for x in questions})==len(questions)
    assert len({x['stemEn'] for x in questions})==len(questions)
    path=DEST/(profile['id']+'.json')
    if path.exists():raise SystemExit('Refusing to overwrite existing published paper: '+str(path))
    path.write_text(json.dumps({'profile':profile,'questions':questions},ensure_ascii=False,indent=2)+'\n')
    print('SEAMO_REVISED_BUILT',path.name,len(questions))

if __name__=='__main__':
    build(1,G1,40)
    build(2,G2,90)
