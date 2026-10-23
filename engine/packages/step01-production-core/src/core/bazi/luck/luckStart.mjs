// Converted from luckStart.ts on 2026-10-23 with Node stripTypeScriptTypes (type annotations removed, code unchanged).
import { addCalendarComponents,                    } from "../calendar/gregorian.mjs";

                                                                                          

export function intervalMinutesToLuckStartAge(sourceIntervalMinutes        )               {
  if (!Number.isFinite(sourceIntervalMinutes) || sourceIntervalMinutes < 0) throw new Error("Invalid interval");
  let remaining = Math.round(sourceIntervalMinutes);
  const years = Math.floor(remaining / 4320); remaining %= 4320;
  const months = Math.floor(remaining / 360); remaining %= 360;
  const days = Math.floor(remaining / 12); remaining %= 12;
  const hours = remaining * 2;
  return { years, months, days, hours };
}

export function firstLuckStartLocal(birthLocal               , age              )                {
  return addCalendarComponents(birthLocal, age);
}

export function dayunBoundaryFromAnchor(firstStartLocal               , periodIndex        )                {
  if (!Number.isInteger(periodIndex) || periodIndex < 0) throw new Error("Invalid periodIndex");
  return addCalendarComponents(firstStartLocal, { years: periodIndex * 10 });
}
