export type CompetitionBrandId="kangaroo"|"australian-amc"|"maa-amc"|"cemc";
export type CompetitionBrand={short:string;mark:string;logo?:string;officialUrl:string;organizer:string;};
export const COMPETITION_BRAND:Record<CompetitionBrandId,CompetitionBrand>={
 kangaroo:{short:"MK",mark:"Math Kangaroo",logo:"/competition-brands/math-kangaroo.png",officialUrl:"https://mathkangaroo.org/",organizer:"Math Kangaroo / KSF"},
 "australian-amc":{short:"AMC.",mark:"AUSTRALIAN MATHS TRUST",officialUrl:"https://amt.edu.au/amc",organizer:"Australian Maths Trust"},
 "maa-amc":{short:"MAA AMC",mark:"AMERICAN MATHEMATICS COMPETITIONS",officialUrl:"https://maa.org/student-programs/amc/",organizer:"Mathematical Association of America"},
 cemc:{short:"CEMC",mark:"UNIVERSITY OF WATERLOO",logo:"/competition-brands/cemc.png",officialUrl:"https://cemc.uwaterloo.ca/contests",organizer:"University of Waterloo CEMC"},
};

export type CompetitionStageBrand={label:string;series:string};
export function competitionStageBrand(competitionId?:CompetitionBrandId|string,formatId?:string,name?:string):CompetitionStageBrand{
 const f=(formatId||"").toLowerCase(),n=(name||"").toLowerCase();
 if(competitionId==="maa-amc"){
  if(f==="maa-amc8"||n.includes("amc 8")) return {label:"AMC 8",series:"MAA American Mathematics Competitions"};
  if(f==="maa-amc10"||n.includes("amc 10")) return {label:"AMC 10",series:"MAA American Mathematics Competitions"};
  if(f==="maa-amc12"||n.includes("amc 12")) return {label:"AMC 12",series:"MAA American Mathematics Competitions"};
  if(f.startsWith("maa-aime")||n.includes("aime")) return {label:"AIME",series:"MAA American Mathematics Competitions"};
 }
 if(competitionId==="cemc"){
  if(f.includes("gauss")||n.includes("gauss")) return {label:"GAUSS",series:"University of Waterloo · CEMC"};
  if(f.includes("pascal")||n.includes("pascal")) return {label:"PASCAL",series:"University of Waterloo · CEMC"};
  if(f.includes("cayley")||n.includes("cayley")) return {label:"CAYLEY",series:"University of Waterloo · CEMC"};
  if(f.includes("fermat")||n.includes("fermat")) return {label:"FERMAT",series:"University of Waterloo · CEMC"};
  if(f.includes("euclid")||n.includes("euclid")) return {label:"EUCLID",series:"University of Waterloo · CEMC"};
 }
 if(competitionId==="australian-amc") return {label:f.includes("pre-a")||n.includes("pre-a")?"PRE-A":"AMC",series:"Australian Maths Trust"};
 if(competitionId==="kangaroo") return {label:"MATH KANGAROO",series:"KSF international competition"};
 return {label:"MATH COMPETITION",series:"International competition"};
}
