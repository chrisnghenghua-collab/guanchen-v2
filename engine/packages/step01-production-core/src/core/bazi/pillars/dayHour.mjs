// Converted from dayHour.ts on 2026-10-23 with Node stripTypeScriptTypes (type annotations removed, code unchanged).
import { addDays, dayJiaziIndexForGregorianDate,                    } from "../calendar/gregorian.mjs";
import { jiaziIndexFromStemBranch, jiaziName, mod } from "./jiazi.mjs";

export function hourBranchIndex(hour        )         {
  if (!Number.isInteger(hour) || hour < 0 || hour > 23) throw new Error("Invalid hour");
  return Math.floor(((hour + 1) % 24) / 2);
}

// D-01 2026-10-22 (Chris): ZI_START_DAY_CHANGE. True solar 23:00 starts the next day; 23:00-01:00 is one Zi hour.
// Day pillar and hour stem both use the next day from 23:00. No early/late Zi split.
export function dayPillarDayIndex(workingLocal               )         {
  const current = dayJiaziIndexForGregorianDate(workingLocal);
  return workingLocal.hour === 23 ? mod(current + 1, 60) : current;
}

export function hourStemBasisDayIndex(workingLocal               )         {
  const current = dayJiaziIndexForGregorianDate(workingLocal);
  return workingLocal.hour === 23 ? mod(current + 1, 60) : current;
}

export function hourPillarIndex(workingLocal               )         {
  const hb = hourBranchIndex(workingLocal.hour);
  const dayBasis = hourStemBasisDayIndex(workingLocal);
  const dayStem = dayBasis % 10;
  const ziStem = ((dayStem % 5) * 2) % 10;
  const hourStem = (ziStem + hb) % 10;
  return jiaziIndexFromStemBranch(hourStem, hb);
}

export function resolveDayHourPillars(workingLocal               )   
                                
                                  
                          
                                
  {
  const dayIndex = dayPillarDayIndex(workingLocal);
  const hb = hourBranchIndex(workingLocal.hour);
  const basis = hourStemBasisDayIndex(workingLocal);
  const hp = hourPillarIndex(workingLocal);
  return {
    dayIndex, day: jiaziName(dayIndex),
    hourIndex: hp, hour: jiaziName(hp),
    hourBranchIndex: hb,
    hourStemBasisDayIndex: basis,
  };
}

export function nextCivilDateDayIndex(workingLocal               )         {
  return dayJiaziIndexForGregorianDate(addDays(workingLocal, 1));
}
