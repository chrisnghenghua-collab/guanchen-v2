import { jiaziIndexFromStemBranch, jiaziName, mod } from "./jiazi.ts";

export type JieName = "立春"|"惊蛰"|"清明"|"立夏"|"芒种"|"小暑"|"立秋"|"白露"|"寒露"|"立冬"|"大雪"|"小寒";
export type JieBoundary = { name: JieName; instantMs: number; gregorianYear: number };

export function yearPillarForInstant(instantMs: number, gregorianYear: number, liChunInstantMs: number): { index: number; name: string; baziYear: number } {
  const baziYear = instantMs >= liChunInstantMs ? gregorianYear : gregorianYear - 1;
  const index = mod(baziYear - 4, 60);
  return { index, name: jiaziName(index), baziYear };
}

const JIE_MONTH_OFFSET: Record<JieName, number> = {
  "立春":0,"惊蛰":1,"清明":2,"立夏":3,"芒种":4,"小暑":5,
  "立秋":6,"白露":7,"寒露":8,"立冬":9,"大雪":10,"小寒":11,
};

export function monthPillarFromActiveJie(yearStemIndex: number, activeJie: JieName): { index: number; name: string; monthOffset: number } {
  const offset = JIE_MONTH_OFFSET[activeJie];
  const branch = (2 + offset) % 12; // 寅 = 2
  const yinMonthStem = ((yearStemIndex % 5) * 2 + 2) % 10;
  const stem = (yinMonthStem + offset) % 10;
  const index = jiaziIndexFromStemBranch(stem, branch);
  return { index, name: jiaziName(index), monthOffset: offset };
}
