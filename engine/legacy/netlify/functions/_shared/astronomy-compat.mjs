import { createRequire } from 'node:module';

// The package's CommonJS entry has stable exports under the provider runtime.
// This bridge changes only module loading; astronomy calculations stay in 2.1.19.
const astronomy = createRequire(import.meta.url)('astronomy-engine');

export const SearchSunLongitude = astronomy.SearchSunLongitude;
export const Body = astronomy.Body;
export const Equator = astronomy.Equator;
export const Observer = astronomy.Observer;
export const SiderealTime = astronomy.SiderealTime;
