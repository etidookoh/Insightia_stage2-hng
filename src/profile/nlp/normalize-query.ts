import { ParsedQuery } from './query-parser';
import * as crypto from 'crypto';


export function normalizeFilters(parsed: ParsedQuery): ParsedQuery {
  const normalized: ParsedQuery = {};

  if (parsed.gender !== undefined) {
    normalized.gender = parsed.gender.toLowerCase().trim();
  }

  if (parsed.age_group !== undefined) {
    normalized.age_group = parsed.age_group.toLowerCase().trim();
  }

  if (parsed.country_id !== undefined) {
    normalized.country_id = parsed.country_id.toUpperCase().trim();
  }

  let minAge = parsed.min_age;
  let maxAge = parsed.max_age;
  if (minAge !== undefined && maxAge !== undefined && minAge > maxAge) {
    [minAge, maxAge] = [maxAge, minAge];
  }
  if (minAge !== undefined) normalized.min_age = minAge;
  if (maxAge !== undefined) normalized.max_age = maxAge;

  return normalized;
}

export function buildCacheKey(
  prefix: string,
  filters: ParsedQuery,
  extra: Record<string, unknown> = {},
): string {
  const normalized = normalizeFilters(filters);

  const combined: Record<string, unknown> = { ...normalized, ...extra };
  const sorted = Object.keys(combined)
    .sort()
    .reduce<Record<string, unknown>>((acc, k) => {
      if (combined[k] !== undefined && combined[k] !== null) {
        acc[k] = combined[k];
      }
      return acc;
    }, {});

  const payload = JSON.stringify(sorted);
  const hash = crypto.createHash('sha256').update(payload).digest('hex').slice(0, 16);
  return `${prefix}:${hash}`;
}