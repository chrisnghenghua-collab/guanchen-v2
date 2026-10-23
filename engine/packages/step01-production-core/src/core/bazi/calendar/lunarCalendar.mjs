// Converted from lunarCalendar.ts on 2026-10-23 with Node stripTypeScriptTypes (type annotations removed, code unchanged).
import * as TymeNS from "tyme4ts";
// Works whether the host loads tyme4ts as ES module or as CommonJS (Netlify, 2026-10-23). Same classes either way.
const { LunarDay, LunarYear, SolarDay } = ("SolarDay" in TymeNS ? TymeNS : (TymeNS       ).default)       ;
                                                

                         
               
                
              
                       
  

                                   
                                                        
                                                      

export function leapMonthOfLunarYear(year        )         {
  return LunarYear.fromYear(year).getLeapMonth();
}

export function solarToLunar(date           )            {
  const lunar = SolarDay.fromYmd(date.year, date.month, date.day).getLunarDay();
  const month = lunar.getLunarMonth();
  return {
    year: lunar.getYear(),
    month: month.getMonth(),
    day: lunar.getDay(),
    isLeapMonth: month.isLeap(),
  };
}

export function lunarToSolar(date           )                        {
  try {
    const signedMonth = date.isLeapMonth ? -Math.abs(date.month) : Math.abs(date.month);
    const lunar = LunarDay.fromYmd(date.year, signedMonth, date.day);
    const solar = lunar.getSolarDay();
    return {
      status: "OK",
      solar: { year: solar.getYear(), month: solar.getMonth(), day: solar.getDay() },
      lunar: { ...date, month: Math.abs(date.month) },
    };
  } catch (error) {
    return {
      status: "INVALID_LUNAR_DATE",
      message: error instanceof Error ? error.message : String(error),
    };
  }
}
