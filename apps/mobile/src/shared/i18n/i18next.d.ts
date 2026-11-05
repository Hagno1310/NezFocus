import 'i18next';
import type { Strings } from './vi';

declare module 'i18next' {
  interface CustomTypeOptions {
    resources: { translation: Strings };
  }
}
