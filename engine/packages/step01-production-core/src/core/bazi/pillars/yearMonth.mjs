// Converted from yearMonth.ts on 2026-10-23 with Node stripTypeScriptTypes (type annotations removed, code unchanged).
import { jiaziIndexFromStemBranch, jiaziName, mod } from "./jiazi.mjs";

                                                                                  
                                                                                      

export function yearPillarForInstant(instantMs        , gregorianYear        , liChunInstantMs        )                                                    {
  const baziYear = instantMs >= liChunInstantMs ? gregorianYear : gregorianYear - 1;
  const index = mod(baziYear - 4, 60);
  return { index, name: jiaziName(index), baziYear };
}

const JIE_MONTH_OFFSET                          = {
  "立春":0,"惊蛰":1,"清明":2,"立夏":3,"芒种":4,"小暑":5,
  "立秋":6,"白露":7,"寒露":8,"立冬":9,"大雪":10,"小寒":11,
};

export function monthPillarFromActiveJie(yearStemIndex        , activeJie         )                                                       {
  const offset = JIE_MONTH_OFFSET[activeJie];
  const branch = (2 + offset) % 12; // 寅 = 2
  const yinMonthStem = ((yearStemIndex % 5) * 2 + 2) % 10;
  const stem = (yinMonthStem + offset) % 10;
  const index = jiaziIndexFromStemBranch(stem, branch);
  return { index, name: jiaziName(index), monthOffset: offset };
}
