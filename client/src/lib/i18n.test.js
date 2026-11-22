import test from 'node:test';
import assert from 'node:assert/strict';
import { I18N_KEYS, LANGUAGES, STRINGS } from './i18n.js';

test('every UI translation key exists in all five languages', () => {
  assert.deepEqual(LANGUAGES.map(language => language.code).sort(), ['bn','en','hi','ta','te']);
  for (const { code } of LANGUAGES) {
    assert.deepEqual(Object.keys(STRINGS[code]).sort(), [...I18N_KEYS].sort(), `translation mismatch for ${code}`);
  }
});

test('every translation is non-empty', () => {
  for (const { code } of LANGUAGES) for (const [key, value] of Object.entries(STRINGS[code])) assert.ok(value.trim(), `${code}.${key} is empty`);
});
