/**
 * Hatch native form validator.
 *
 * Pure TS. Zero external deps. Feeds rule objects the WordPress Forms Bridge
 * emits per field (`rules[]` in the schema response). The bridge does the
 * plugin-specific parsing server-side so this runtime can stay generic.
 *
 * Rule shape (mirror of class-forms-bridge.php):
 *   { type: 'required' }
 *   { type: 'email' }
 *   { type: 'url' }
 *   { type: 'numeric' }
 *   { type: 'min',   value: number }   // string length OR numeric min
 *   { type: 'max',   value: number }   // string length OR numeric max
 *   { type: 'regex', value: string }
 *
 * No copy from any external form library. Original implementation.
 */

export type Rule =
  | { type: 'required'; message?: string }
  | { type: 'email'; message?: string }
  | { type: 'url'; message?: string }
  | { type: 'numeric'; message?: string }
  | { type: 'min'; value: number; message?: string }
  | { type: 'max'; value: number; message?: string }
  | { type: 'regex'; value: string; flags?: string; message?: string };

export interface FieldLike {
  name: string;
  type?: string;
  label?: string;
  rules?: Rule[];
  required?: boolean; // legacy convenience — treated as {type:'required'}
}

export interface SchemaLike {
  fields?: FieldLike[];
}

export interface FieldResult {
  ok: boolean;
  error?: string;
}

export interface FormResult {
  ok: boolean;
  errors: Record<string, string>;
}

const EMAIL_RE = /^[^@\s]+@[^@\s]+\.[^@\s]+$/;

function isEmpty(v: unknown): boolean {
  if (v === null || v === undefined) return true;
  if (typeof v === 'string') return v.trim() === '';
  if (Array.isArray(v)) return v.length === 0;
  if (typeof v === 'boolean') return v === false;
  return false;
}

function asString(v: unknown): string {
  if (v === null || v === undefined) return '';
  if (Array.isArray(v)) return v.join(',');
  return String(v);
}

function looksNumeric(v: unknown): boolean {
  if (v === null || v === undefined || v === '') return false;
  const n = Number(v);
  return !Number.isNaN(n) && Number.isFinite(n);
}

export function validateField(rules: Rule[] | undefined, value: unknown): FieldResult {
  if (!rules || rules.length === 0) return { ok: true };

  // Non-required rules should not fire on empty values — an optional email
  // field that the user left blank must not throw "invalid email".
  const empty = isEmpty(value);
  const hasRequired = rules.some((r) => r.type === 'required');

  for (const r of rules) {
    if (r.type === 'required') {
      if (empty) return { ok: false, error: r.message || 'This field is required.' };
      continue;
    }

    if (empty && !hasRequired) continue;
    if (empty && hasRequired) continue; // required rule already returned above

    switch (r.type) {
      case 'email': {
        if (!EMAIL_RE.test(asString(value))) {
          return { ok: false, error: r.message || 'Enter a valid email address.' };
        }
        break;
      }
      case 'url': {
        try {
          new URL(asString(value));
        } catch {
          return { ok: false, error: r.message || 'Enter a valid URL.' };
        }
        break;
      }
      case 'numeric': {
        if (!looksNumeric(value)) {
          return { ok: false, error: r.message || 'Enter a number.' };
        }
        break;
      }
      case 'min': {
        const n = Number(r.value);
        if (looksNumeric(value) && Number(value) < n) {
          return { ok: false, error: r.message || `Must be at least ${n}.` };
        }
        if (!looksNumeric(value) && asString(value).length < n) {
          return { ok: false, error: r.message || `Must be at least ${n} characters.` };
        }
        break;
      }
      case 'max': {
        const n = Number(r.value);
        if (looksNumeric(value) && Number(value) > n) {
          return { ok: false, error: r.message || `Must be no more than ${n}.` };
        }
        if (!looksNumeric(value) && asString(value).length > n) {
          return { ok: false, error: r.message || `Must be no more than ${n} characters.` };
        }
        break;
      }
      case 'regex': {
        try {
          const re = new RegExp(r.value, r.flags || '');
          if (!re.test(asString(value))) {
            return { ok: false, error: r.message || 'Invalid format.' };
          }
        } catch {
          // Bad regex from server — do not block submission on our error.
        }
        break;
      }
    }
  }

  return { ok: true };
}

export function validateForm(schema: SchemaLike, data: Record<string, unknown>): FormResult {
  const errors: Record<string, string> = {};
  const fields = schema.fields || [];
  for (const f of fields) {
    // Merge legacy `required: true` into rules array for uniform handling.
    let rules = f.rules ? [...f.rules] : [];
    if (f.required && !rules.some((r) => r.type === 'required')) {
      rules.unshift({ type: 'required' });
    }
    if (rules.length === 0) continue;
    const value = data[f.name];
    const result = validateField(rules, value);
    if (!result.ok && result.error) {
      errors[f.name] = result.error;
    }
  }
  return { ok: Object.keys(errors).length === 0, errors };
}
