// Converted from authorityCalendar.ts on 2026-10-23 with Node stripTypeScriptTypes (type annotations removed, code unchanged).
import { mod } from "../pillars/jiazi.mjs";
import { jiaziName } from "../pillars/jiazi.mjs";
import { monthPillarFromActiveJie,              } from "../pillars/yearMonth.mjs";
import { activeJieAtInstant, liChunInstantUtc, strictNextJie, strictPreviousJie } from "./solarTerms.mjs";

export function baziYearPillarForInstant(instantMs        )                                                                             {
  const utcYear = new Date(instantMs).getUTCFullYear();
  const liChun = liChunInstantUtc(utcYear);
  const baziYear = instantMs >= liChun ? utcYear : utcYear - 1;
  const index = mod(baziYear - 4, 60);
  return { index, name: jiaziName(index), baziYear, liChunInstantMs: liChun };
}

export function baziMonthPillarForInstant(instantMs        )   
                
               
                                                   
                   
  {
  const year = baziYearPillarForInstant(instantMs);
  const jie = activeJieAtInstant(instantMs);
  const month = monthPillarFromActiveJie(year.index % 10, jie.name           );
  return { index: month.index, name: month.name, activeJie: jie, baziYear: year.baziYear };
}

export function luckTargetJieForInstant(instantMs        , direction                       ) {
  return direction === "FORWARD" ? strictNextJie(instantMs) : strictPreviousJie(instantMs);
}
