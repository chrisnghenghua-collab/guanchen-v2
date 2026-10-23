// Converted from luckDirection.ts on 2026-10-23 with Node stripTypeScriptTypes (type annotations removed, code unchanged).
                                       
                                                  

export function isYangStem(stemIndex        )          {
  return ((stemIndex % 10) + 10) % 10 % 2 === 0;
}

export function luckDirection(yearStemIndex        , gender        )                {
  const yang = isYangStem(yearStemIndex);
  return (yang && gender === "MALE") || (!yang && gender === "FEMALE") ? "FORWARD" : "REVERSE";
}
