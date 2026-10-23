// Converted from astronomyEquationOfTime.ts on 2026-10-23 with Node stripTypeScriptTypes (type annotations removed, code unchanged).
import * as AstronomyNS from "astronomy-engine";
// Works whether the host loads astronomy-engine as ES module or as CommonJS (Netlify, 2026-10-23). Same functions either way.
const Astronomy      = "Body" in AstronomyNS ? AstronomyNS : (AstronomyNS       ).default;
const { Body, Equator, Observer, SiderealTime } = Astronomy;
                                                                 

function normalizeHoursSigned(hours        )         {
  let x = ((hours + 12) % 24 + 24) % 24 - 12;
  if (x === -12) x = 12;
  return x;
}

function utcHours(instantMs        )         {
  const d = new Date(instantMs);
  return d.getUTCHours() + d.getUTCMinutes() / 60 + d.getUTCSeconds() / 3600 + d.getUTCMilliseconds() / 3_600_000;
}

/**
 * Independent EoT cross-check from Astronomy Engine.
 *
 * GAST - apparent Sun RA gives the Sun's apparent Greenwich hour angle.
 * Apparent solar time at Greenwich is 12h + hour angle. Subtracting UTC
 * time-of-day approximates apparent-minus-mean solar time; UT1-UTC is kept
 * below 0.9 seconds, far below Guancheng's public 1-minute tolerance.
 *
 * Observer(0,0,0) introduces only tiny solar topocentric parallax, also far
 * below the 1-minute product tolerance.
 */
export const astronomyEquationOfTimeMinutes                         = (instantMs) => {
  const date = new Date(instantMs);
  const greenwich = new Observer(0, 0, 0);
  const sun = Equator(Body.Sun, date, greenwich, true, true);
  const gast = SiderealTime(date);
  const hourAngle = normalizeHoursSigned(gast - sun.ra);
  const apparentSolarHours = ((12 + hourAngle) % 24 + 24) % 24;
  const diffHours = normalizeHoursSigned(apparentSolarHours - utcHours(instantMs));
  return diffHours * 60;
};
