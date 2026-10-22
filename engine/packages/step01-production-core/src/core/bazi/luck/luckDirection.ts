export type Gender = "MALE" | "FEMALE";
export type LuckDirection = "FORWARD" | "REVERSE";

export function isYangStem(stemIndex: number): boolean {
  return ((stemIndex % 10) + 10) % 10 % 2 === 0;
}

export function luckDirection(yearStemIndex: number, gender: Gender): LuckDirection {
  const yang = isYangStem(yearStemIndex);
  return (yang && gender === "MALE") || (!yang && gender === "FEMALE") ? "FORWARD" : "REVERSE";
}
