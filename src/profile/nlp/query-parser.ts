export interface ParsedQuery {
  gender?: string;
  age_group?: string;
  country_id?: string;
  min_age?: number;
  max_age?: number;
}

const COUNTRY_MAP: Record<string, string> = {
  nigeria: 'NG',
  nigerian: 'NG',
  ghana: 'GH',
  ghanaian: 'GH',
  kenya: 'KE',
  kenyan: 'KE',
  ethiopia: 'ET',
  ethiopian: 'ET',
  tanzania: 'TZ',
  tanzanian: 'TZ',
  uganda: 'UG',
  ugandan: 'UG',
  angola: 'AO',
  angolan: 'AO',
  senegal: 'SN',
  senegalese: 'SN',
  cameroon: 'CM',
  cameroonian: 'CM',
  'ivory coast': 'CI',
  'côte d\'ivoire': 'CI',
  mozambique: 'MZ',
  mozambican: 'MZ',
  zambia: 'ZM',
  zambian: 'ZM',
  zimbabwe: 'ZW',
  zimbabwean: 'ZW',
  mali: 'ML',
  malian: 'ML',
  malawi: 'MW',
  malawian: 'MW',
  niger: 'NE',
  'south africa': 'ZA',
  'south african': 'ZA',
  egypt: 'EG',
  egyptian: 'EG',
  sudan: 'SD',
  sudanese: 'SD',
  morocco: 'MA',
  moroccan: 'MA',
  algeria: 'DZ',
  algerian: 'DZ',
  tunisia: 'TN',
  tunisian: 'TN',
  libya: 'LY',
  libyan: 'LY',
  somalia: 'SO',
  somali: 'SO',
  rwanda: 'RW',
  rwandan: 'RW',
  benin: 'BJ',
  beninese: 'BJ',
  togo: 'TG',
  togolese: 'TG',
  guinea: 'GN',
  guinean: 'GN',
  'sierra leone': 'SL',
  liberia: 'LR',
  liberian: 'LR',
  chad: 'TD',
  chadian: 'TD',
  congo: 'CG',
  'democratic republic of congo': 'CD',
  drc: 'CD',
  gabon: 'GA',
  gabonese: 'GA',
  botswana: 'BW',
  namibia: 'NA',
  namibian: 'NA',
  lesotho: 'LS',
  swaziland: 'SZ',
  eswatini: 'SZ',
  eritrea: 'ER',
  eritrean: 'ER',
  djibouti: 'DJ',
  comoros: 'KM',
  madagascar: 'MG',
  mauritius: 'MU',
  mauritanian: 'MR',
  mauritania: 'MR',
  burkina: 'BF',
  'burkina faso': 'BF',
  'cape verde': 'CV',
  'equatorial guinea': 'GQ',
  'central african republic': 'CF',
  // Non-African
  usa: 'US',
  'united states': 'US',
  american: 'US',
  uk: 'GB',
  'united kingdom': 'GB',
  british: 'GB',
  france: 'FR',
  french: 'FR',
  germany: 'DE',
  german: 'DE',
  india: 'IN',
  indian: 'IN',
  china: 'CN',
  chinese: 'CN',
  brazil: 'BR',
  brazilian: 'BR',
  canada: 'CA',
  canadian: 'CA',
  australia: 'AU',
  australian: 'AU',
};

const AGE_GROUP_MAP: Record<string, { min?: number; max?: number }> = {
  child: { min: 0, max: 12 },
  children: { min: 0, max: 12 },
  teenager: { min: 13, max: 17 },
  teenagers: { min: 13, max: 17 },
  teen: { min: 13, max: 17 },
  teens: { min: 13, max: 17 },
  adult: { min: 18, max: 59 },
  adults: { min: 18, max: 59 },
  senior: { min: 60 },
  seniors: { min: 60 },
  elderly: { min: 60 },
  young: { min: 16, max: 24 },
};

const AGE_GROUP_VALUE: Record<string, string> = {
  child: 'child',
  children: 'child',
  teenager: 'teenager',
  teenagers: 'teenager',
  teen: 'teenager',
  teens: 'teenager',
  adult: 'adult',
  adults: 'adult',
  senior: 'senior',
  seniors: 'senior',
  elderly: 'senior',
};

export function parseNaturalQuery(q: string): ParsedQuery | null {
  const input = q.toLowerCase().trim();

  if (!input) return null;

  const result: ParsedQuery = {};
  let remainingInput = input;

  if (/\bmales?\b/.test(remainingInput)) {
    result.gender = 'male';
  } else if (/\bfemales?\b/.test(remainingInput)) {
    result.gender = 'female';
  } else if (/\b(men|man)\b/.test(remainingInput)) {
    result.gender = 'male';
  } else if (/\b(women|woman|girl|girls)\b/.test(remainingInput)) {
    result.gender = 'female';
  }

  const countryPhraseMatch = remainingInput.match(/\b(?:from|in)\s+([a-z\s']+?)(?:\s+(?:above|below|under|over|aged?|between|who|that|with|and|$))/);
  if (countryPhraseMatch) {
    const candidate = countryPhraseMatch[1].trim();
    if (COUNTRY_MAP[candidate]) {
      result.country_id = COUNTRY_MAP[candidate];
    }
  }

  if (!result.country_id) {
    const sortedKeys = Object.keys(COUNTRY_MAP).sort((a, b) => b.length - a.length);
    for (const key of sortedKeys) {
      const regex = new RegExp(`\\b${key.replace(/'/g, "\\'")}\\b`);
      if (regex.test(remainingInput)) {
        result.country_id = COUNTRY_MAP[key];
        break;
      }
    }
  }

  const ageGroupKeys = Object.keys(AGE_GROUP_MAP).sort((a, b) => b.length - a.length);
  for (const key of ageGroupKeys) {
    const regex = new RegExp(`\\b${key}\\b`);
    if (regex.test(remainingInput)) {
      const range = AGE_GROUP_MAP[key];
      const groupValue = AGE_GROUP_VALUE[key];

      if (groupValue) {
        result.age_group = groupValue;
      }
      if (range.min !== undefined && result.min_age === undefined) {
        result.min_age = range.min;
      }
      if (range.max !== undefined && result.max_age === undefined) {
        result.max_age = range.max;
      }
      break;
    }
  }

  const aboveMatch = remainingInput.match(/\b(?:above|over|older than)\s+(\d+)/);
  if (aboveMatch) {
    result.min_age = parseInt(aboveMatch[1], 10);
  }
  const belowMatch = remainingInput.match(/\b(?:below|under|younger than)\s+(\d+)/);
  if (belowMatch) {
    result.max_age = parseInt(belowMatch[1], 10);
  }

  const agedMatch = remainingInput.match(/\baged?\s+(\d+)/);
  if (agedMatch) {
    const exactAge = parseInt(agedMatch[1], 10);
    result.min_age = exactAge;
    result.max_age = exactAge;
  }

  const betweenMatch = remainingInput.match(/\bbetween\s+(\d+)\s+and\s+(\d+)/);
  if (betweenMatch) {
    result.min_age = parseInt(betweenMatch[1], 10);
    result.max_age = parseInt(betweenMatch[2], 10);
  }

  const hasFilter =
    result.gender !== undefined ||
    result.age_group !== undefined ||
    result.country_id !== undefined ||
    result.min_age !== undefined ||
    result.max_age !== undefined;

  if (!hasFilter) return null;

  return result;
}