// Converted from jiazi.ts on 2026-10-23 with Node stripTypeScriptTypes (type annotations removed, code unchanged).
export const STEMS = ["甲","乙","丙","丁","戊","己","庚","辛","壬","癸"]         ;
export const BRANCHES = ["子","丑","寅","卯","辰","巳","午","未","申","酉","戌","亥"]         ;

export function mod(n        , m        )         {
  return ((n % m) + m) % m;
}

export function jiaziName(index        )         {
  const i = mod(index, 60);
  return `${STEMS[i % 10]}${BRANCHES[i % 12]}`;
}

export function jiaziIndexFromStemBranch(stemIndex        , branchIndex        )         {
  for (let i = 0; i < 60; i++) {
    if (i % 10 === mod(stemIndex, 10) && i % 12 === mod(branchIndex, 12)) return i;
  }
  throw new Error("Invalid stem/branch parity combination");
}

export function dayStemIndex(dayJiaziIndex        )         {
  return mod(dayJiaziIndex, 60) % 10;
}

export function dayBranchIndex(dayJiaziIndex        )         {
  return mod(dayJiaziIndex, 60) % 12;
}
