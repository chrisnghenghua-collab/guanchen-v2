// Converted from timezone.ts on 2026-10-23 with Node stripTypeScriptTypes (type annotations removed, code unchanged).
import { assertCivilDateTime,                    } from "../calendar/gregorian.mjs";

                                 
                                                                    
                                                                                                       
                                     

const formatterCache = new Map                             ();

function formatter(zone        )                      {
  let f = formatterCache.get(zone);
  if (!f) {
    f = new Intl.DateTimeFormat("en-CA", {
      timeZone: zone,
      year: "numeric", month: "2-digit", day: "2-digit",
      hour: "2-digit", minute: "2-digit", second: "2-digit",
      hourCycle: "h23",
    });
    formatterCache.set(zone, f);
  }
  return f;
}

export function formatInstantInZone(instantMs        , zone        )                {
  const parts = formatter(zone).formatToParts(new Date(instantMs));
  const m = Object.fromEntries(parts.filter(p => p.type !== "literal").map(p => [p.type, p.value]));
  return {
    year: Number(m.year), month: Number(m.month), day: Number(m.day),
    hour: Number(m.hour), minute: Number(m.minute), second: Number(m.second),
  };
}

export function offsetMinutesAtInstant(instantMs        , zone        )         {
  const local = formatInstantInZone(instantMs, zone);
  const asUtc = Date.UTC(local.year, local.month - 1, local.day, local.hour, local.minute, local.second ?? 0);
  const instantWholeSecond = Math.floor(instantMs / 1000) * 1000;
  return (asUtc - instantWholeSecond) / 60_000;
}

function sameLocal(a               , b               )          {
  return a.year === b.year && a.month === b.month && a.day === b.day && a.hour === b.hour && a.minute === b.minute && (a.second ?? 0) === (b.second ?? 0);
}

export function resolveLocalDateTime(local               , zone        )                      {
  assertCivilDateTime(local);
  const naiveMs = Date.UTC(local.year, local.month - 1, local.day, local.hour, local.minute, local.second ?? 0);
  const offsets = new Set        ();
  for (let k = -8; k <= 8; k++) {
    offsets.add(offsetMinutesAtInstant(naiveMs + k * 6 * 3600_000, zone));
  }

  const candidates                                                      = [];
  for (const offsetMinutes of offsets) {
    const instantMs = naiveMs - offsetMinutes * 60_000;
    if (sameLocal(formatInstantInZone(instantMs, zone), local)) {
      candidates.push({ instantMs, offsetMinutes });
    }
  }
  candidates.sort((a,b) => a.instantMs - b.instantMs);

  if (candidates.length === 0) return { status: "INVALID_LOCAL_TIME" };
  if (candidates.length > 1) return { status: "AMBIGUOUS_LOCAL_TIME", candidates };
  return { status: "RESOLVED", ...candidates[0] };
}
