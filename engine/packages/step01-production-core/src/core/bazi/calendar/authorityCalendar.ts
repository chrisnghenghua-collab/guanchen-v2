import { mod } from "../pillars/jiazi.ts";
import { jiaziName } from "../pillars/jiazi.ts";
import { monthPillarFromActiveJie, type JieName } from "../pillars/yearMonth.ts";
import { activeJieAtInstant, liChunInstantUtc, strictNextJie, strictPreviousJie } from "./solarTerms.ts";

export function baziYearPillarForInstant(instantMs: number): { index: number; name: string; baziYear: number; liChunInstantMs: number } {
  const utcYear = new Date(instantMs).getUTCFullYear();
  const liChun = liChunInstantUtc(utcYear);
  const baziYear = instantMs >= liChun ? utcYear : utcYear - 1;
  const index = mod(baziYear - 4, 60);
  return { index, name: jiaziName(index), baziYear, liChunInstantMs: liChun };
}

export function baziMonthPillarForInstant(instantMs: number): {
  index: number;
  name: string;
  activeJie: ReturnType<typeof activeJieAtInstant>;
  baziYear: number;
} {
  const year = baziYearPillarForInstant(instantMs);
  const jie = activeJieAtInstant(instantMs);
  const month = monthPillarFromActiveJie(year.index % 10, jie.name as JieName);
  return { index: month.index, name: month.name, activeJie: jie, baziYear: year.baziYear };
}

export function luckTargetJieForInstant(instantMs: number, direction: "FORWARD" | "REVERSE") {
  return direction === "FORWARD" ? strictNextJie(instantMs) : strictPreviousJie(instantMs);
}
