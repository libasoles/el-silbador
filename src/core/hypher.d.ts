interface HypherLanguage {
  patterns: Record<string, string>;
  leftmin: number;
  rightmin: number;
}

declare module "hypher" {
  export default class Hypher {
    constructor(language: HypherLanguage);
    hyphenate(word: string): string[];
    hyphenateText(text: string, minLength?: number): string;
  }
}

declare module "hyphenation.es" {
  const patterns: HypherLanguage;
  export default patterns;
}
