export const STEMS = ["甲","乙","丙","丁","戊","己","庚","辛","壬","癸"] as const;
export const BRANCHES = ["子","丑","寅","卯","辰","巳","午","未","申","酉","戌","亥"] as const;

export function mod(n: number, m: number): number {
  return ((n % m) + m) % m;
}

export function jiaziName(index: number): string {
  const i = mod(index, 60);
  return `${STEMS[i % 10]}${BRANCHES[i % 12]}`;
}

export function jiaziIndexFromStemBranch(stemIndex: number, branchIndex: number): number {
  for (let i = 0; i < 60; i++) {
    if (i % 10 === mod(stemIndex, 10) && i % 12 === mod(branchIndex, 12)) return i;
  }
  throw new Error("Invalid stem/branch parity combination");
}

export function dayStemIndex(dayJiaziIndex: number): number {
  return mod(dayJiaziIndex, 60) % 10;
}

export function dayBranchIndex(dayJiaziIndex: number): number {
  return mod(dayJiaziIndex, 60) % 12;
}
