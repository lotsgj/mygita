export const VERSE_CATALOG_HEADERS = Object.freeze(['language', 'content_type', 'content_url']);
export const STRUCTURAL_VERSE_REGISTRY_HEADERS = Object.freeze(['collection_id', 'order', 'enabled', 'path', 'catalog_url']);
export const AUDIO_REGISTRY_HEADERS = Object.freeze(['collection_id', 'title', 'contributor', 'language', 'catalog_url', 'cue_purpose_url', 'cue_url', 'attribution', 'license', 'source']);
export const AUDIO_CATALOG_HEADERS = Object.freeze(['sid', 'order', 'language', 'audio_url']);
export const AUDIO_CUE_PURPOSE_HEADERS = Object.freeze(['cue_id', 'language', 'purpose', 'description']);
export const AUDIO_CUE_HEADERS = Object.freeze(['sid', 'asset_order', 'cue_order', 'cue_id', 'start_ms', 'end_ms']);
export const DECK_REGISTRY_HEADERS = Object.freeze(['collection_id', 'title', 'provider', 'language', 'catalog_url', 'attribution', 'license', 'source']);
export const DECK_CATALOG_HEADERS = Object.freeze(['sid', 'order', 'language', 'deck_url', 'title']);
export const DECK_COMPOSITION_HEADERS = Object.freeze(['cid', 'snum', 'sid', 'order', 'deck_collection', 'deck_order']);
export const IMAGE_REGISTRY_BASE_HEADERS = Object.freeze(['collection_id', 'title', 'catalog_url']);
export const IMAGE_REGISTRY_TAIL_HEADERS = Object.freeze(['attribution', 'license', 'source']);
export const ILLUSTRATION_CATALOG_HEADERS = Object.freeze(['sid', 'order', 'image_url']);
export const ILLUSTRATION_METADATA_HEADERS = Object.freeze(['sid', 'order', 'alt_text', 'caption']);
export const ILLUSTRATION_COMPOSITION_HEADERS = Object.freeze(['cid', 'snum', 'sid', 'order', 'image_collection', 'image_order']);
export const TEXT_REGISTRY_BASE_HEADERS = Object.freeze(['collection_id', 'title', 'catalog_url']);
export const TEXT_REGISTRY_TAIL_HEADERS = Object.freeze(['attribution', 'license', 'source']);
export const CONTEMPLATION_CATALOG_HEADERS = Object.freeze(['sid', 'order', 'line_type']);
export const CONTEMPLATION_MASTER_HEADERS = Object.freeze(['sid', 'order', 'text']);
export const CONTEMPLATION_COMPOSITION_HEADERS = Object.freeze(['cid', 'snum', 'sid', 'order', 'text_collection', 'text_order']);
export const MEDIA_COMPOSITION_HEADERS = Object.freeze(['cid', 'snum', 'sid', 'order', 'media_type', 'collection', 'asset_order']);
export const SEQUENCE_HEADERS = Object.freeze(['position', 'cid', 'snum', 'sid']);
export const VERSE_LOCALIZED_REGISTRY_HEADERS = Object.freeze(['collection_id', 'name', 'short_name', 'description']);
export const SOURCE_MASTER_HEADERS = Object.freeze(['cid', 'snum', 'sid', 'chapter_name', 'shloka_raw', 'shloka', 'word_by_word', 'meaning', 'word_by_word_meaning']);
export const LOCALIZED_MASTER_HEADERS = Object.freeze(['cid', 'snum', 'sid', 'chapter_name', 'transliteration', 'meaning', 'word_by_word_meaning']);

export function localizedRegistryHeaders(kind, languages = ['en', 'kn']) {
  const base = kind === 'images' ? IMAGE_REGISTRY_BASE_HEADERS : TEXT_REGISTRY_BASE_HEADERS;
  const tail = kind === 'images' ? IMAGE_REGISTRY_TAIL_HEADERS : TEXT_REGISTRY_TAIL_HEADERS;
  const stem = kind === 'images' ? 'metadata' : 'master';
  return [...base, ...languages.map((language) => `${stem}_${language}_url`), ...tail];
}

export function localizedRegistryFields(headers, kind) {
  const pattern = kind === 'images' ? /^metadata_([a-z0-9-]+)_url$/ : /^master_([a-z0-9-]+)_url$/;
  return Object.fromEntries((headers || []).map((header) => [header.match(pattern)?.[1], header]).filter(([language]) => language));
}

export function localizedRegistryHeaderRule(kind) {
  return (headers) => {
    const base = kind === 'images' ? IMAGE_REGISTRY_BASE_HEADERS : TEXT_REGISTRY_BASE_HEADERS;
    const tail = kind === 'images' ? IMAGE_REGISTRY_TAIL_HEADERS : TEXT_REGISTRY_TAIL_HEADERS;
    if (headers.slice(0, base.length).join('#') !== base.join('#')) return false;
    if (headers.slice(-tail.length).join('#') !== tail.join('#')) return false;
    const fields = localizedRegistryFields(headers, kind);
    return Object.keys(fields).length > 0 && base.length + Object.keys(fields).length + tail.length === headers.length;
  };
}

export function compositionHeaderRule(headers) {
  if (headers.slice(0, 3).join('#') !== 'cid#snum#sid') return false;
  const rest = headers.slice(3);
  const fields = rest[0] === 'order' ? rest.slice(1) : rest;
  if (!fields.length || fields.length % 2) return false;
  for (let index = 0; index < fields.length; index += 2) {
    if (!fields[index].endsWith('_collection') || !fields[index + 1].endsWith('_order')) return false;
    if (fields[index].slice(0, -11) !== fields[index + 1].slice(0, -6)) return false;
  }
  return true;
}
