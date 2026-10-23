// Converted from ruleAuthority.ts on 2026-10-23 with Node stripTypeScriptTypes (type annotations removed, code unchanged).
export const BA_ZI_RULE_AUTHORITY = {
  brand: "观辰",
  version: "1.0.0-draft-e2c",
  astronomy: {
    solarTermEngine: "astronomy-engine@2.1.19",
    lunarCalendarEngine: "tyme4ts@1.5.2",
    hkoFixtureRole: "EXTERNAL_PUBLISHED_CROSS_CHECK",
    solarTermTargetToleranceSeconds: 60,
    hkoPublishedMinuteToleranceSeconds: 90,
  },
  timezone: {
    authorityEngine: "moment-timezone@0.6.3",
    pinnedTzdbVersion: "2026c",
    latestIanaReviewedAtBuild: "2026d",
    latestIanaDeltaAffectsTargetRegions: false,
    hostIntlRole: "CROSS_CHECK_ONLY",
    targetRegions: ["MY", "SG", "CN", "TW", "HK", "MO"],
    noSilentFallback: true,
  },
  yearBoundary: "LI_CHUN_EXACT_INSTANT",
  monthBoundary: "12_JIE_EXACT_INSTANT",
  trueSolarTime: {
    timeBasis: "LOCAL_APPARENT_SOLAR_TIME",
    includeLongitudeCorrection: true,
    includeEquationOfTime: true,
    equationOfTimeAuthority: "ASTRONOMY_ENGINE_RA_GAST_DERIVATION",
    noaaApproximationRole: "CROSS_CHECK_ONLY",
    targetToleranceSeconds: 60,
  },
  // D-01 2026-10-22 (Chris): 子初换日. Replaces MIDNIGHT_SPLIT_ZI (早晚子时).
  dayBoundary: "ZI_START_23_00_TRUE_SOLAR",
  ziHour: {
    interval: "23:00:00-00:59:59.999",
    dayPillar: "NEXT_DAY_FROM_23_00",
    hourStemBasis: "SAME_AS_DAY_PILLAR",
  },
  luckDirection: "YEAR_STEM_YIN_YANG_BY_GENDER",
  luckStart: "THREE_DAYS_ONE_YEAR_MINUTE_CONTINUOUS",
  luckTargetJie: "STRICT_PREVIOUS_OR_NEXT_JIE",
  luckIntervalBasis: "ABSOLUTE_UTC_INSTANT",
  luckPeriod: "TEN_CALENDAR_YEARS_HALF_OPEN",
}         ;
