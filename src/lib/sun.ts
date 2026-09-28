/**
 * Local sun position maths (NOAA solar equations).
 *
 * Why this exists: the app has no API keys and no network dependency, and sunset is
 * what makes "golden hour is 17:34" a real answer rather than a vibe. It is also what
 * makes beach and viewpoint recommendations feel considered.
 *
 * Ghana sits at UTC+0 with no daylight saving, so the returned "minutes UT" are the
 * same as local clock minutes throughout the country. The returned values are
 * `Date`-independent, which keeps them unit-testable from any timezone.
 *
 * Reference: NOAA Solar Calculator spreadsheet equations.
 */

import type { DayPart } from "@/types/place";

const DEG = Math.PI / 180;

const norm360 = (value: number): number => ((value % 360) + 360) % 360;
const sinD = (deg: number): number => Math.sin(deg * DEG);
const cosD = (deg: number): number => Math.cos(deg * DEG);
const tanD = (deg: number): number => Math.tan(deg * DEG);

/**
 * Zenith angles (90° − altitude) for the events we care about.
 * 90.833 includes atmospheric refraction.
 *
 * Photographic golden hour runs from the sun sitting 6° *above* the horizon down to 4°
 * *below* it. Because the sun descends through those altitudes in that order, the 6°
 * zenith is the *start* of the window and the 94° zenith is the *end*.
 */
const ZENITH_SUNRISE = 90.833;
const ZENITH_SIX_ABOVE = 84; // sun 6° above the horizon
const ZENITH_FOUR_BELOW = 94; // sun 4° below the horizon

export type SunTimes = {
  /** Minutes from local midnight. */
  readonly sunrise: number;
  readonly sunset: number;
  readonly goldenHourStart: number;
  readonly goldenHourEnd: number;
  readonly solarNoon: number;
};

type Solar = {
  readonly declination: number;
  readonly equationOfTime: number;
  /** Solar noon, in minutes from local midnight. */
  readonly solarNoon: number;
};

function solarPosition(lng: number, date: Date): Solar {
  const julian = date.getTime() / 86_400_000 + 2_440_587.5;
  const t = (julian - 2_451_545.0) / 36_525; // Julian centuries since 2000-01-01 12:00
  const lngWest = -lng; // NOAA works in west-positive longitude

  const meanLongitude = norm360(280.46646 + t * (36_000.76983 + t * 0.0003032));
  const meanAnomaly = norm360(357.52911 + t * (35_999.05029 - t * 0.0001537));
  const eccentricity = 0.016708634 - t * (0.000042037 + 0.0000001267 * t);

  const equationOfCentre =
    sinD(meanAnomaly) * (1.914602 - t * (0.004817 + 0.000014 * t)) +
    sinD(2 * meanAnomaly) * (0.019993 - 0.000101 * t) +
    sinD(3 * meanAnomaly) * 0.000289;

  const trueLongitude = meanLongitude + equationOfCentre;
  const apparentLongitude =
    trueLongitude - 0.00569 - 0.00478 * sinD(125.04 - 1934.136 * t);

  const meanObliquity =
    23 + (26 + (21.448 - t * (46.815 + t * (0.00059 - t * 0.001813))) / 60) / 60;
  const obliquity = meanObliquity + 0.00256 * cosD(125.04 - 1934.136 * t);

  const declination =
    Math.asin(sinD(obliquity) * sinD(apparentLongitude)) / DEG;

  const varY = tanD(obliquity / 2) ** 2;
  const equationOfTime =
    4 *
    DEG *
    (varY * sinD(2 * meanLongitude) -
      2 * eccentricity * sinD(meanAnomaly) +
      4 * eccentricity * varY * sinD(meanAnomaly) * cosD(2 * meanLongitude) -
      0.5 * varY * varY * sinD(4 * meanLongitude) -
      1.25 * eccentricity * eccentricity * sinD(2 * meanAnomaly));

  return {
    declination,
    equationOfTime,
    solarNoon: 720 - 4 * lngWest - equationOfTime,
  };
}

/** Degrees of hour angle the sun is `zenithDeg` from the zenith, or NaN if unreachable. */
function hourAngle(
  lat: number,
  declination: number,
  zenithDeg: number,
): number {
  const cosHourAngle =
    (cosD(zenithDeg) - sinD(declination) * sinD(lat)) /
    (cosD(declination) * cosD(lat));
  if (cosHourAngle > 1 || cosHourAngle < -1) return Number.NaN;
  return Math.acos(cosHourAngle) / DEG;
}

/** Minutes from local midnight at which the sun sits `zenithDeg` from the zenith. */
function eventTime(
  lat: number,
  declination: number,
  solarNoon: number,
  zenithDeg: number,
  evening: boolean,
): number {
  const ha = hourAngle(lat, declination, zenithDeg);
  if (!Number.isFinite(ha)) return Number.NaN;
  // 15° of hour angle = 1 hour.
  return evening ? solarNoon + ha * 4 : solarNoon - ha * 4;
}

export function sunTimes(lat: number, lng: number, date: Date): SunTimes {
  const { declination, solarNoon } = solarPosition(lng, date);

  const finite = (value: number, fallback: number): number =>
    Number.isFinite(value) ? Math.round(value) : fallback;

  return {
    sunrise: finite(eventTime(lat, declination, solarNoon, ZENITH_SUNRISE, false), 6 * 60),
    sunset: finite(eventTime(lat, declination, solarNoon, ZENITH_SUNRISE, true), 18 * 60),
    goldenHourStart: finite(
      eventTime(lat, declination, solarNoon, ZENITH_SIX_ABOVE, true),
      17 * 60,
    ),
    goldenHourEnd: finite(
      eventTime(lat, declination, solarNoon, ZENITH_FOUR_BELOW, true),
      18 * 60,
    ),
    solarNoon: Math.round(solarNoon),
  };
}

/**
 * Which part of the day is it? `sunset` is derived from today's actual sunset, which is
 * why a February beach trip and an August one get different advice.
 */
export function dayPartFor(
  minutes: number,
  lat: number,
  lng: number,
  date: Date,
): DayPart {
  const sun = sunTimes(lat, lng, date);
  if (minutes < 5 * 60) return "late";
  if (minutes < 7 * 60) return "dawn";
  if (minutes < 11 * 60) return "morning";
  if (minutes < sun.goldenHourStart) return "afternoon";
  if (minutes <= sun.goldenHourEnd + 120) return "sunset";
  if (minutes <= 23 * 60) return "evening";
  return "night";
}

/** Is it currently the golden-hour window for this place? */
export function inGoldenHour(
  minutes: number,
  lat: number,
  lng: number,
  date: Date,
): boolean {
  const sun = sunTimes(lat, lng, date);
  return minutes >= sun.goldenHourStart && minutes <= sun.goldenHourEnd;
}
