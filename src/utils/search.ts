/**
 * Advanced Search Utility
 * Handles spelling correction, pluralization, stemming, keyword expansion,
 * and fuzzy matching for e-commerce search
 */

// Common pluralization rules
const pluralRules: Array<[RegExp, string]> = [
  [/ies$/i, 'y'],      // hoodies -> hoody
  [/s$/i, ''],          // hoodies -> hoodie, keychains -> keychain
  [/es$/i, ''],         // boxes -> box
  [/ves$/i, 'f'],       // knives -> knife
];

// Singularization rules (reverse)
const singularRules: Array<[RegExp, string]> = [
  [/y$/i, 'ies'],       // hoody -> hoodies
  [/([^aeiou])$/i, '$1s'], // hoodie -> hoodies
  [/f$/i, 'ves'],       // knife -> knives
];

// Keyword expansion map (synonyms and related terms)
const keywordExpansions: Record<string, string[]> = {
  'bottle': ['bottle', 'drinkware', 'mug', 'sipper', 'water bottle', 'tumbler', 'flask'],
  'drinkware': ['bottle', 'drinkware', 'mug', 'sipper', 'water bottle', 'tumbler', 'flask'],
  'mug': ['bottle', 'drinkware', 'mug', 'sipper', 'water bottle', 'tumbler', 'flask'],
  'sipper': ['bottle', 'drinkware', 'mug', 'sipper', 'water bottle', 'tumbler', 'flask'],
  'tumbler': ['bottle', 'drinkware', 'mug', 'sipper', 'water bottle', 'tumbler', 'flask'],
  'flask': ['bottle', 'drinkware', 'mug', 'sipper', 'water bottle', 'tumbler', 'flask'],
  'water bottle': ['bottle', 'drinkware', 'mug', 'sipper', 'water bottle', 'tumbler', 'flask'],
  'hoodie': ['hoodie', 'hoody', 'sweatshirt', 'pullover'],
  'hoody': ['hoodie', 'hoody', 'sweatshirt', 'pullover'],
  'keychain': ['keychain', 'key chain', 'key fob', 'keyring'],
  'keychains': ['keychain', 'key chains', 'key fob', 'keyring'],
  'key chain': ['keychain', 'key chain', 'key fob', 'keyring'],
  'notebook': ['notebook', 'notepad', 'journal', 'diary'],
  'pen': ['pen', 'ballpoint', 'gel pen', 'writing'],
  'bag': ['bag', 'tote', 'backpack', 'pouch'],
  'tote': ['bag', 'tote', 'backpack', 'pouch'],
  'tshirt': ['tshirt', 't-shirt', 'shirt', 'tee'],
  't-shirt': ['tshirt', 't-shirt', 'shirt', 'tee'],
  'shirt': ['tshirt', 't-shirt', 'shirt', 'tee'],
};

// Common misspellings
const commonMisspellings: Record<string, string> = {
  'hoody': 'hoodie',
  'keychain': 'keychain', // already correct
  'keychains': 'keychains',
  'bottel': 'bottle',
  'botle': 'bottle',
  'mugg': 'mug',
  'siper': 'sipper',
  'sippr': 'sipper',
  'notbook': 'notebook',
  'notepad': 'notebook',
  'tshirt': 't-shirt',
  'tshirts': 't-shirts',
};

/**
 * Convert word to singular form
 */
export function toSingular(word: string): string {
  for (const [pattern, replacement] of pluralRules) {
    if (pattern.test(word)) {
      return word.replace(pattern, replacement);
    }
  }
  return word;
}

/**
 * Convert word to plural form
 */
export function toPlural(word: string): string {
  for (const [pattern, replacement] of singularRules) {
    if (pattern.test(word)) {
      return word.replace(pattern, replacement);
    }
  }
  // Default: just add 's'
  return word + 's';
}

/**
 * Get all variations of a word (singular, plural, and common forms)
 */
export function getWordVariations(word: string): string[] {
  const variations = new Set<string>([word.toLowerCase()]);

  // Add singular
  const singular = toSingular(word);
  if (singular !== word) {
    variations.add(singular.toLowerCase());
  }

  // Add plural
  const plural = toPlural(word);
  if (plural !== word) {
    variations.add(plural.toLowerCase());
  }

  // Add corrected misspelling
  const corrected = commonMisspellings[word.toLowerCase()];
  if (corrected && corrected !== word) {
    variations.add(corrected.toLowerCase());
  }

  return Array.from(variations);
}

/**
 * Expand keywords using synonym map
 */
export function expandKeywords(query: string): string[] {
  const words = query.toLowerCase().split(/\s+/);
  const expanded = new Set<string>();

  // Add original query
  expanded.add(query.toLowerCase());

  // Expand each word
  for (const word of words) {
    // Check for exact match in expansions
    if (keywordExpansions[word]) {
      keywordExpansions[word].forEach(term => expanded.add(term));
    }

    // Check for partial matches (e.g., "bottle" in "water bottle")
    for (const [key, values] of Object.entries(keywordExpansions)) {
      if (key.includes(word) || word.includes(key)) {
        values.forEach(term => expanded.add(term));
      }
    }

    // Add variations
    getWordVariations(word).forEach(variation => expanded.add(variation));
  }

  return Array.from(expanded);
}

/**
 * Calculate Levenshtein distance between two strings
 */
export function levenshteinDistance(str1: string, str2: string): number {
  const matrix: number[][] = [];

  for (let i = 0; i <= str2.length; i++) {
    matrix[i] = [i];
  }

  for (let j = 0; j <= str1.length; j++) {
    matrix[0][j] = j;
  }

  for (let i = 1; i <= str2.length; i++) {
    for (let j = 1; j <= str1.length; j++) {
      if (str2.charAt(i - 1) === str1.charAt(j - 1)) {
        matrix[i][j] = matrix[i - 1][j - 1];
      } else {
        matrix[i][j] = Math.min(
          matrix[i - 1][j - 1] + 1, // substitution
          matrix[i][j - 1] + 1,       // insertion
          matrix[i - 1][j] + 1       // deletion
        );
      }
    }
  }

  return matrix[str2.length][str1.length];
}

/**
 * Find the best spelling correction from a list of words
 */
export function findBestCorrection(
  query: string,
  words: string[],
  threshold: number = 3
): string | null {
  if (query.length < 2) return null;

  const queryLower = query.toLowerCase();

  // Exact match
  const exactMatch = words.find(w => w.toLowerCase() === queryLower);
  if (exactMatch) return null; // No correction needed

  // Check common misspellings first
  const commonCorrection = commonMisspellings[queryLower];
  if (commonCorrection) {
    const exists = words.some(w => w.toLowerCase() === commonCorrection.toLowerCase());
    if (exists) return commonCorrection;
  }

  // Levenshtein distance-based suggestions
  let bestMatch: { word: string; distance: number } | null = null;

  for (const word of words) {
    const distance = levenshteinDistance(queryLower, word.toLowerCase());
    const maxDistance = Math.max(2, Math.floor(word.length / 3));

    if (distance <= maxDistance && distance <= threshold) {
      if (!bestMatch || distance < bestMatch.distance) {
        bestMatch = { word, distance };
      }
    }
  }

  return bestMatch ? bestMatch.word : null;
}

/**
 * Build search query terms from user input
 * Returns: { correctedQuery, searchTerms, expandedTerms }
 */
export function buildSearchTerms(query: string, allProductWords: string[]): {
  correctedQuery: string;
  searchTerms: string[];
  expandedTerms: string[];
} {
  const trimmedQuery = query.trim();
  if (!trimmedQuery) {
    return { correctedQuery: '', searchTerms: [], expandedTerms: [] };
  }

  // Find spelling correction
  const correction = findBestCorrection(trimmedQuery, allProductWords);
  const correctedQuery = correction || trimmedQuery;

  // Get word variations
  const words = correctedQuery.toLowerCase().split(/\s+/);
  const searchTerms = new Set<string>();

  for (const word of words) {
    // Add original
    searchTerms.add(word);

    // Add variations
    getWordVariations(word).forEach(v => searchTerms.add(v));
  }

  // Expand keywords
  const expandedTerms = expandKeywords(correctedQuery);
  expandedTerms.forEach(term => searchTerms.add(term));

  return {
    correctedQuery,
    searchTerms: Array.from(searchTerms),
    expandedTerms,
  };
}

/**
 * Build MongoDB search query with fuzzy matching
 */
export function buildMongoSearchQuery(
  originalQuery: string,
  correctedQuery: string,
  searchTerms: string[],
  expandedTerms: string[]
): Array<Record<string, unknown>> {
  const orConditions: Array<Record<string, unknown>> = [];

  // Add original query (exact match gets highest priority)
  orConditions.push(
    { name: { $regex: originalQuery, $options: 'i' } },
    { tags: { $regex: originalQuery, $options: 'i' } },
    { description: { $regex: originalQuery, $options: 'i' } }
  );

  // Add corrected query
  if (correctedQuery !== originalQuery) {
    orConditions.push(
      { name: { $regex: correctedQuery, $options: 'i' } },
      { tags: { $regex: correctedQuery, $options: 'i' } },
      { description: { $regex: correctedQuery, $options: 'i' } }
    );
  }

  // Add all search term variations
  for (const term of searchTerms) {
    if (term !== originalQuery.toLowerCase() && term !== correctedQuery.toLowerCase()) {
      orConditions.push(
        { name: { $regex: term, $options: 'i' } },
        { tags: { $regex: term, $options: 'i' } },
        { description: { $regex: term, $options: 'i' } }
      );
    }
  }

  // Add expanded terms (synonyms)
  for (const term of expandedTerms) {
    if (term !== originalQuery.toLowerCase() && term !== correctedQuery.toLowerCase()) {
      orConditions.push(
        { name: { $regex: term, $options: 'i' } },
        { tags: { $regex: term, $options: 'i' } },
        { description: { $regex: term, $options: 'i' } }
      );
    }
  }

  return orConditions;
}

/**
 * Check if a combo product matches search terms by checking its items
 */
export function comboMatchesSearch(
  combo: {
    comboItems?: Array<{
      productId?: {
        name?: string;
        tags?: string[];
        description?: string;
      } | string;
    }>;
  },
  searchTerms: string[],
  expandedTerms: string[]
): boolean {
  if (!combo.comboItems || !Array.isArray(combo.comboItems)) {
    return false;
  }

  for (const item of combo.comboItems) {
    const product = typeof item.productId === 'object'
      ? item.productId
      : null;

    if (!product) continue;

    const productName = (product.name || '').toLowerCase();
    const productTags = (product.tags || []).map(t => t.toLowerCase());
    const productDesc = ((product as { description?: string }).description || '').toLowerCase();

    // Check if any search term matches
    for (const term of searchTerms) {
      if (
        productName.includes(term) ||
        productTags.some(tag => tag.includes(term)) ||
        productDesc.includes(term)
      ) {
        return true;
      }
    }

    // Check expanded terms
    for (const term of expandedTerms) {
      if (
        productName.includes(term) ||
        productTags.some(tag => tag.includes(term)) ||
        productDesc.includes(term)
      ) {
        return true;
      }
    }
  }

  return false;
}


