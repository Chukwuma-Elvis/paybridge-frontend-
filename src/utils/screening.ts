/**
 * Client-side mirror of backend NameSimilarity.java and ScreeningPolicy.java
 * Provides immediate feedback on similarity and predicted screening outcomes.
 */

export function cleanName(name: string): string {
  if (!name) return '';
  const plain = name
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .toLowerCase()
    .replace(/[^a-z0-9 ]/g, ' ')
    .trim();
  if (!plain) return '';
  const words = plain.split(/\s+/).filter(Boolean);
  words.sort();
  return words.join(' ');
}

export function editDistance(a: string, b: string): number {
  const previous = new Array(b.length + 1);
  const current = new Array(b.length + 1);
  for (let j = 0; j <= b.length; j++) {
    previous[j] = j;
  }
  for (let i = 1; i <= a.length; i++) {
    current[0] = i;
    for (let j = 1; j <= b.length; j++) {
      const substitution = previous[j - 1] + (a.charAt(i - 1) === b.charAt(j - 1) ? 0 : 1);
      current[j] = Math.min(substitution, Math.min(previous[j] + 1, current[j - 1] + 1));
    }
    for (let j = 0; j <= b.length; j++) {
      previous[j] = current[j];
    }
  }
  return previous[b.length];
}

export function nameSimilarity(a: string, b: string): number {
  const left = cleanName(a);
  const right = cleanName(b);
  if (!left || !right) return 0.0;
  const longest = Math.max(left.length, right.length);
  return Math.max(0, 1.0 - editDistance(left, right) / longest);
}

export interface WatchlistEntry {
  listName: string;
  entryId: string;
  names: string[];
  country?: string | null;
  birth?: string | null;
}

export interface MatchScoreResult {
  entry: WatchlistEntry;
  matchedName: string;
  similarity: number;
  corroborators: number;
  outcome: 'CLEAR' | 'REVIEW' | 'BLOCK';
}

export function evaluateParty(
  candidateName: string,
  candidateCountry: string,
  candidateBirth: string,
  watchlist: WatchlistEntry[]
): MatchScoreResult | null {
  if (!candidateName.trim() || watchlist.length === 0) return null;

  let bestResult: MatchScoreResult | null = null;

  for (const entry of watchlist) {
    for (const name of entry.names) {
      const sim = nameSimilarity(candidateName, name);
      let corroborators = 0;
      if (candidateCountry && entry.country && candidateCountry.trim().toUpperCase() === entry.country.trim().toUpperCase()) {
        corroborators++;
      }
      if (candidateBirth && entry.birth && candidateBirth.trim() === entry.birth.trim()) {
        corroborators++;
      }

      let outcome: 'CLEAR' | 'REVIEW' | 'BLOCK' = 'CLEAR';
      if (sim >= 0.95 && corroborators >= 1) {
        outcome = 'BLOCK';
      } else if (sim >= 0.85) {
        outcome = 'REVIEW';
      } else if (sim >= 0.70 && corroborators >= 2) {
        outcome = 'REVIEW';
      }

      if (!bestResult || sim > bestResult.similarity) {
        bestResult = {
          entry,
          matchedName: name,
          similarity: sim,
          corroborators,
          outcome,
        };
      }
    }
  }

  return bestResult;
}
