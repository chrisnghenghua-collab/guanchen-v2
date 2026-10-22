import { jiaziName, mod } from "../pillars/jiazi.ts";
import type { LuckDirection } from "./luckDirection.ts";

export function dayunSequence(monthPillarIndex: number, direction: LuckDirection, count = 8): Array<{ index: number; name: string }> {
  const step = direction === "FORWARD" ? 1 : -1;
  return Array.from({ length: count }, (_, i) => {
    const index = mod(monthPillarIndex + step * (i + 1), 60);
    return { index, name: jiaziName(index) };
  });
}
