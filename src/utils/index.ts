export { getBaseUrl, api } from './api';
export type { RouterInputs, RouterOutputs } from './api';

export {
  getCurrencyHelpers,
  BigMath,
  currencyConversion,
  removeTrailingZeros,
  getRatePrecision,
  bigIntReplacer,
  MAX_RATE_PRECISION,
} from './numbers';

export { displayName, toUIDate, generateSplitDescription, getCurrencyName } from './strings';
export type { ParametersExceptTranslation } from './strings';

export { shuffleArray } from './array';
export { cyrb128, splitmix32 } from './random';
export { fileExists } from './file';

export { validateUploadSize, prepareImageForUpload, uploadImage, toImageSrc } from './imageUpload';

export { getSupportedLanguages } from './i18n/client';
export type { SupportedLanguage } from './i18n/client';
export { customServerSideTranslations, withI18nStaticProps } from './i18n/server';
