export interface CityOption {
  value: string;
  en: string;
  ar: string;
}

export const CITIES: CityOption[] = [
  { value: 'Riyadh', en: 'Riyadh', ar: '\u0627\u0644\u0631\u064A\u0627\u0636' },
  { value: 'Jeddah', en: 'Jeddah', ar: '\u062C\u062F\u0629' },
  { value: 'Abha', en: 'Abha', ar: '\u0623\u0628\u0647\u0627' },
  { value: 'Khobar', en: 'Khobar', ar: '\u0627\u0644\u062E\u0628\u0631' },
  { value: 'Taif', en: 'Taif', ar: '\u0627\u0644\u0637\u0627\u0626\u0641' },
  { value: 'Al Ula', en: 'Al Ula', ar: '\u0627\u0644\u0639\u0644\u0627' },
  { value: 'Hail', en: 'Hail', ar: '\u062D\u0627\u0626\u0644' },
  { value: 'Mecca', en: 'Mecca', ar: '\u0645\u0643\u0629 \u0627\u0644\u0645\u0643\u0631\u0645\u0629' },
  { value: 'Madinah', en: 'Madinah', ar: '\u0627\u0644\u0645\u062F\u064A\u0646\u0629' },
  { value: 'Dammam', en: 'Dammam', ar: '\u0627\u0644\u062F\u0645\u0627\u0645' },
  { value: 'Yanbu', en: 'Yanbu', ar: '\u064A\u0646\u0628\u0639' },
  { value: 'Tabuk', en: 'Tabuk', ar: '\u062A\u0628\u0648\u0643' },
];

export interface DistrictOption {
  value: string;
  en: string;
  ar: string;
}

export const DISTRICTS: Record<string, DistrictOption[]> = {
  Riyadh: [
    { value: 'Al Olaya', en: 'Al Olaya', ar: '\u0627\u0644\u0639\u0644\u064A\u0627' },
    { value: 'Al Malaz', en: 'Al Malaz', ar: '\u0627\u0644\u0645\u0644\u0632' },
    { value: 'Al Nakheel', en: 'Al Nakheel', ar: '\u0627\u0644\u0646\u062E\u064A\u0644' },
    { value: 'Al Wurud', en: 'Al Wurud', ar: '\u0627\u0644\u0648\u0631\u0648\u062F' },
    { value: 'Al Sulimaniyah', en: 'Al Sulimaniyah', ar: '\u0627\u0644\u0633\u0644\u064A\u0645\u0627\u0646\u064A\u0629' },
    { value: 'Al Rawdah', en: 'Al Rawdah', ar: '\u0627\u0644\u0631\u0648\u0636\u0629' },
    { value: 'Al Yasmin', en: 'Al Yasmin', ar: '\u0627\u0644\u064A\u0627\u0633\u0645\u064A\u0646' },
    { value: 'Al Narjis', en: 'Al Narjis', ar: '\u0627\u0644\u0646\u0631\u062C\u0633' },
    { value: 'Al Muhammadiyah', en: 'Al Muhammadiyah', ar: '\u0627\u0644\u0645\u062D\u0645\u062F\u064A\u0629' },
    { value: 'Al Sahafah', en: 'Al Sahafah', ar: '\u0627\u0644\u0635\u062D\u0627\u0641\u0629' },
    { value: 'Al Aqiq', en: 'Al Aqiq', ar: '\u0627\u0644\u0639\u0642\u064A\u0642' },
    { value: 'Hittin', en: 'Hittin', ar: '\u062D\u0637\u064A\u0646' },
  ],
  Jeddah: [
    { value: 'Al Hamra', en: 'Al Hamra', ar: '\u0627\u0644\u062D\u0645\u0631\u0627\u0621' },
    { value: 'Al Rawdah', en: 'Al Rawdah', ar: '\u0627\u0644\u0631\u0648\u0636\u0629' },
    { value: 'Al Shati', en: 'Al Shati', ar: '\u0627\u0644\u0634\u0627\u0637\u0626' },
    { value: 'Al Salamah', en: 'Al Salamah', ar: '\u0627\u0644\u0633\u0644\u0627\u0645\u0629' },
    { value: 'Al Andalus', en: 'Al Andalus', ar: '\u0627\u0644\u0623\u0646\u062F\u0644\u0633' },
    { value: 'Al Zahra', en: 'Al Zahra', ar: '\u0627\u0644\u0632\u0647\u0631\u0627\u0621' },
    { value: 'Al Nahda', en: 'Al Nahda', ar: '\u0627\u0644\u0646\u0647\u0636\u0629' },
    { value: 'Al Marwah', en: 'Al Marwah', ar: '\u0627\u0644\u0645\u0631\u0648\u0629' },
    { value: 'Obhur', en: 'Obhur', ar: '\u0623\u0628\u062D\u0631' },
    { value: 'Al Khalidiyah', en: 'Al Khalidiyah', ar: '\u0627\u0644\u062E\u0627\u0644\u062F\u064A\u0629' },
  ],
  Dammam: [
    { value: 'Al Faisaliyah', en: 'Al Faisaliyah', ar: '\u0627\u0644\u0641\u064A\u0635\u0644\u064A\u0629' },
    { value: 'Al Shati', en: 'Al Shati', ar: '\u0627\u0644\u0634\u0627\u0637\u0626' },
    { value: 'Al Aziziyah', en: 'Al Aziziyah', ar: '\u0627\u0644\u0639\u0632\u064A\u0632\u064A\u0629' },
    { value: 'Al Hamra', en: 'Al Hamra', ar: '\u0627\u0644\u062D\u0645\u0631\u0627\u0621' },
    { value: 'Al Rawdah', en: 'Al Rawdah', ar: '\u0627\u0644\u0631\u0648\u0636\u0629' },
    { value: 'Al Nakheel', en: 'Al Nakheel', ar: '\u0627\u0644\u0646\u062E\u064A\u0644' },
    { value: 'Al Muhammadiyah', en: 'Al Muhammadiyah', ar: '\u0627\u0644\u0645\u062D\u0645\u062F\u064A\u0629' },
    { value: 'Al Badiyah', en: 'Al Badiyah', ar: '\u0627\u0644\u0628\u0627\u062F\u064A\u0629' },
  ],
  Khobar: [
    { value: 'Al Corniche', en: 'Al Corniche', ar: '\u0627\u0644\u0643\u0648\u0631\u0646\u064A\u0634' },
    { value: 'Al Rawabi', en: 'Al Rawabi', ar: '\u0627\u0644\u0631\u0648\u0627\u0628\u064A' },
    { value: 'Al Thuqbah', en: 'Al Thuqbah', ar: '\u0627\u0644\u062B\u0642\u0628\u0629' },
    { value: 'Al Aqrabiyah', en: 'Al Aqrabiyah', ar: '\u0627\u0644\u0639\u0642\u0631\u0628\u064A\u0629' },
    { value: 'Al Yarmuk', en: 'Al Yarmuk', ar: '\u0627\u0644\u064A\u0631\u0645\u0648\u0643' },
    { value: 'Al Ulaya', en: 'Al Ulaya', ar: '\u0627\u0644\u0639\u0644\u064A\u0627' },
    { value: 'Al Rakah', en: 'Al Rakah', ar: '\u0627\u0644\u0631\u0627\u0643\u0629' },
  ],
  Mecca: [
    { value: 'Al Aziziyah', en: 'Al Aziziyah', ar: '\u0627\u0644\u0639\u0632\u064A\u0632\u064A\u0629' },
    { value: 'Al Shisha', en: 'Al Shisha', ar: '\u0627\u0644\u0634\u0634\u0629' },
    { value: 'Al Rusayfah', en: 'Al Rusayfah', ar: '\u0627\u0644\u0631\u0635\u064A\u0641\u0629' },
    { value: 'Al Naseem', en: 'Al Naseem', ar: '\u0627\u0644\u0646\u0633\u064A\u0645' },
    { value: 'Al Awali', en: 'Al Awali', ar: '\u0627\u0644\u0639\u0648\u0627\u0644\u064A' },
  ],
  Madinah: [
    { value: 'Al Haram', en: 'Al Haram', ar: '\u0627\u0644\u062D\u0631\u0645' },
    { value: 'Quba', en: 'Quba', ar: '\u0642\u0628\u0627\u0621' },
    { value: 'Al Uyun', en: 'Al Uyun', ar: '\u0627\u0644\u0639\u064A\u0648\u0646' },
    { value: 'Al Azhari', en: 'Al Azhari', ar: '\u0627\u0644\u0623\u0632\u0647\u0631\u064A' },
    { value: 'Al Khalidiyah', en: 'Al Khalidiyah', ar: '\u0627\u0644\u062E\u0627\u0644\u062F\u064A\u0629' },
  ],
  Abha: [
    { value: 'Al Manhal', en: 'Al Manhal', ar: '\u0627\u0644\u0645\u0646\u0647\u0644' },
    { value: 'Al Sadd', en: 'Al Sadd', ar: '\u0627\u0644\u0633\u062F' },
    { value: 'Al Mahalah', en: 'Al Mahalah', ar: '\u0627\u0644\u0645\u062D\u0627\u0644\u0629' },
    { value: 'Al Rawdah', en: 'Al Rawdah', ar: '\u0627\u0644\u0631\u0648\u0636\u0629' },
  ],
  Taif: [
    { value: 'Al Hada', en: 'Al Hada', ar: '\u0627\u0644\u0647\u062F\u0627' },
    { value: 'Al Shifa', en: 'Al Shifa', ar: '\u0627\u0644\u0634\u0641\u0627' },
    { value: 'Al Naseem', en: 'Al Naseem', ar: '\u0627\u0644\u0646\u0633\u064A\u0645' },
    { value: 'Al Khalidiyah', en: 'Al Khalidiyah', ar: '\u0627\u0644\u062E\u0627\u0644\u062F\u064A\u0629' },
  ],
  Tabuk: [
    { value: 'Al Muruj', en: 'Al Muruj', ar: '\u0627\u0644\u0645\u0631\u0648\u062C' },
    { value: 'Al Rawdah', en: 'Al Rawdah', ar: '\u0627\u0644\u0631\u0648\u0636\u0629' },
    { value: 'Al Faisaliyah', en: 'Al Faisaliyah', ar: '\u0627\u0644\u0641\u064A\u0635\u0644\u064A\u0629' },
  ],
  Hail: [
    { value: 'Al Aziziyah', en: 'Al Aziziyah', ar: '\u0627\u0644\u0639\u0632\u064A\u0632\u064A\u0629' },
    { value: 'Al Naqah', en: 'Al Naqah', ar: '\u0627\u0644\u0646\u0642\u0639\u0629' },
    { value: 'Al Samra', en: 'Al Samra', ar: '\u0627\u0644\u0633\u0645\u0631\u0627\u0621' },
  ],
  'Al Ula': [
    { value: 'Al Ula Old Town', en: 'Al Ula Old Town', ar: '\u0627\u0644\u0628\u0644\u062F\u0629 \u0627\u0644\u0642\u062F\u064A\u0645\u0629' },
    { value: 'Al Ula Downtown', en: 'Al Ula Downtown', ar: '\u0648\u0633\u0637 \u0627\u0644\u0639\u0644\u0627' },
  ],
  Yanbu: [
    { value: 'Yanbu Al Sinaiyah', en: 'Yanbu Al Sinaiyah', ar: '\u064A\u0646\u0628\u0639 \u0627\u0644\u0635\u0646\u0627\u0639\u064A\u0629' },
    { value: 'Al Rawdah', en: 'Al Rawdah', ar: '\u0627\u0644\u0631\u0648\u0636\u0629' },
    { value: 'Al Sharm', en: 'Al Sharm', ar: '\u0627\u0644\u0634\u0631\u0645' },
  ],
};

export const DIRECTIONS = [
  { value: 'north', en: 'North', ar: '\u0634\u0645\u0627\u0644' },
  { value: 'south', en: 'South', ar: '\u062C\u0646\u0648\u0628' },
  { value: 'east', en: 'East', ar: '\u0634\u0631\u0642' },
  { value: 'west', en: 'West', ar: '\u063A\u0631\u0628' },
  { value: 'northeast', en: 'Northeast', ar: '\u0634\u0645\u0627\u0644 \u0634\u0631\u0642\u064A' },
  { value: 'northwest', en: 'Northwest', ar: '\u0634\u0645\u0627\u0644 \u063A\u0631\u0628\u064A' },
  { value: 'southeast', en: 'Southeast', ar: '\u062C\u0646\u0648\u0628 \u0634\u0631\u0642\u064A' },
  { value: 'southwest', en: 'Southwest', ar: '\u062C\u0646\u0648\u0628 \u063A\u0631\u0628\u064A' },
];
