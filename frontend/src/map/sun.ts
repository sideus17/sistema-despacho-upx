// Nascer e pôr do sol pela "equação do nascer do sol" (precisão de ~1 min, suficiente para trocar o tema)
const DAY_MS = 86400000;
const UNIX_EPOCH_JD = 2440587.5;
const J2000 = 2451545;
const toRad = (degrees: number) => (degrees * Math.PI) / 180;
const toDeg = (radians: number) => (radians * 180) / Math.PI;

export function sunTimes(date: Date, lat: number, lng: number): { sunrise: Date; sunset: Date } {
  // Dia solar mais próximo no fuso do local (longitude leste positiva)
  const n = Math.round(date.getTime() / DAY_MS + UNIX_EPOCH_JD - J2000 - 0.0009 + lng / 360);
  const meanSolarTime = n + 0.0009 - lng / 360;
  const anomaly = (357.5291 + 0.98560028 * meanSolarTime) % 360;
  const center = 1.9148 * Math.sin(toRad(anomaly)) + 0.02 * Math.sin(toRad(2 * anomaly)) + 0.0003 * Math.sin(toRad(3 * anomaly));
  const eclipticLng = (anomaly + center + 180 + 102.9372) % 360;
  const transit = J2000 + meanSolarTime + 0.0053 * Math.sin(toRad(anomaly)) - 0.0069 * Math.sin(toRad(2 * eclipticLng));
  const declination = Math.asin(Math.sin(toRad(eclipticLng)) * Math.sin(toRad(23.4397)));
  // -0.833°: refração atmosférica + raio do disco solar
  const hourAngle = toDeg(Math.acos(
    (Math.sin(toRad(-0.833)) - Math.sin(toRad(lat)) * Math.sin(declination)) / (Math.cos(toRad(lat)) * Math.cos(declination))
  ));
  const fromJulian = (jd: number) => new Date((jd - UNIX_EPOCH_JD) * DAY_MS);
  return { sunrise: fromJulian(transit - hourAngle / 360), sunset: fromJulian(transit + hourAngle / 360) };
}

export function isNight(date: Date, lat: number, lng: number): boolean {
  const { sunrise, sunset } = sunTimes(date, lat, lng);
  return date < sunrise || date >= sunset;
}
