export type CompetitionBrandId="kangaroo"|"australian-amc"|"maa-amc"|"cemc";
export type CompetitionBrand={short:string;mark:string;logo?:string;officialUrl:string;organizer:string;};
export const COMPETITION_BRAND:Record<CompetitionBrandId,CompetitionBrand>={
 kangaroo:{short:"MK",mark:"Math Kangaroo",logo:"/competition-brands/math-kangaroo.png",officialUrl:"https://mathkangaroo.org/",organizer:"Math Kangaroo / KSF"},
 "australian-amc":{short:"AMC.",mark:"AUSTRALIAN MATHS TRUST",officialUrl:"https://amt.edu.au/amc",organizer:"Australian Maths Trust"},
 "maa-amc":{short:"MAA AMC",mark:"AMERICAN MATHEMATICS COMPETITIONS",officialUrl:"https://maa.org/student-programs/amc/",organizer:"Mathematical Association of America"},
 cemc:{short:"CEMC",mark:"UNIVERSITY OF WATERLOO",logo:"/competition-brands/cemc.png",officialUrl:"https://cemc.uwaterloo.ca/contests",organizer:"University of Waterloo CEMC"},
};
