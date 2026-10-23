// Converted from dayunSequence.ts on 2026-10-23 with Node stripTypeScriptTypes (type annotations removed, code unchanged).
import { jiaziName, mod } from "../pillars/jiazi.mjs";
                                                        

export function dayunSequence(monthPillarIndex        , direction               , count = 8)                                         {
  const step = direction === "FORWARD" ? 1 : -1;
  return Array.from({ length: count }, (_, i) => {
    const index = mod(monthPillarIndex + step * (i + 1), 60);
    return { index, name: jiaziName(index) };
  });
}
