/**
 * Spanish syllabification (silabeo) based on standard RAE phonological and grammatical rules.
 *
 * Typesetting hyphenators (like TeX hyphenation patterns / Hypher) are designed for line-breaking,
 * enforcing minimum distances from word boundaries (leftmin/rightmin >= 2, inhibiting breaks before
 * "-no", etc.). That makes them unsuitable for musical and linguistic syllable division (e.g.
 * "ca-mi-no", "a-mor", "Y-pa-ca-ra-í").
 *
 * This implementation divides words into Spanish syllables according to RAE orthography:
 * 1. Identification of vocalic nuclei (handling diphthongs, triphthongs, and hiatuses).
 * 2. Proper handling of vocalic 'y' (e.g. "Ypacaraí", "hay", "buey").
 * 3. Proper handling of digraphs (ch, ll, rr) and silent 'u' in qu/gu.
 * 4. Consonant distribution between vocalic nuclei (inseparable clusters like bl, pr, etc.).
 * 5. Preservation of leading/trailing non-letter punctuation.
 */
function isOpenVowel(c) {
    return /^[aeoáéóAEOÁÉÓ]$/.test(c);
}
function isClosedUnaccented(c) {
    return /^[iuüIUÜ]$/.test(c);
}
function isClosedAccented(c) {
    return /^[íúÍÚ]$/.test(c);
}
function isVocalicY(word, index) {
    const ch = word[index].toLowerCase();
    if (ch !== "y")
        return false;
    if (word.length === 1)
        return true;
    const next = index + 1 < word.length ? word[index + 1].toLowerCase() : null;
    const prev = index > 0 ? word[index - 1].toLowerCase() : null;
    // If followed by a vowel, 'y' acts as a consonant (e.g. "ya", "yo", "reyes", "playa")
    if (next && /[aeiouáéíóúü]/.test(next))
        return false;
    // If preceded by a vowel at the end of a word or before a consonant, it is vocalic (e.g. "hay", "rey", "muy", "buey")
    if (prev && /[aeiouáéíóúü]/.test(prev))
        return true;
    // If at the start of a word followed by a consonant (e.g. "Ypacaraí", "Ybycuí")
    if (index === 0 && next && !/[aeiouáéíóúü]/.test(next))
        return true;
    return true;
}
function isVowel(word, i) {
    const c = word[i];
    if (isVocalicY(word, i))
        return true;
    if (!/^[aeiouáéíóúüAEIOUÁÉÍÓÚÜ]$/.test(c))
        return false;
    const lower = c.toLowerCase();
    if (lower === "u") {
        if (i > 0) {
            const prev = word[i - 1].toLowerCase();
            const next = i + 1 < word.length ? word[i + 1].toLowerCase() : "";
            if ((prev === "q" || prev === "g") && /^[eiéí]$/.test(next)) {
                return false;
            }
        }
    }
    return true;
}
function findNuclei(word) {
    const nuclei = [];
    let i = 0;
    while (i < word.length) {
        if (!isVowel(word, i)) {
            i++;
            continue;
        }
        const start = i;
        let end = i;
        while (end + 1 < word.length) {
            let nextIdx = end + 1;
            if (word[nextIdx].toLowerCase() === "h" && nextIdx + 1 < word.length && isVowel(word, nextIdx + 1)) {
                nextIdx++;
            }
            if (!isVowel(word, nextIdx))
                break;
            const v1 = word[end];
            const v2 = word[nextIdx];
            // Hiatus:
            // 1. Accented closed vowel + any vowel, or any vowel + accented closed vowel
            if (isClosedAccented(v1) || isClosedAccented(v2))
                break;
            // 2. Two open vowels
            if (isOpenVowel(v1) && isOpenVowel(v2))
                break;
            // 3. Two identical closed vowels
            if (v1.toLowerCase() === v2.toLowerCase())
                break;
            // Triphthong check: if already 2 vowels, third must be unaccented closed or vocalic y
            let vCount = 0;
            for (let k = start; k <= end; k++) {
                if (isVowel(word, k))
                    vCount++;
            }
            if (vCount === 2) {
                const mid = word[end];
                if (isOpenVowel(mid) && (isClosedUnaccented(v2) || isVocalicY(word, nextIdx))) {
                    end = nextIdx;
                    break; // Triphthong has at most 3 vowels
                }
                else {
                    break;
                }
            }
            end = nextIdx;
        }
        nuclei.push({ start, end });
        i = end + 1;
    }
    return nuclei;
}
function isInseparableCluster(c1, c2) {
    const s = (c1 + c2).toLowerCase();
    return /^(p[lr]|b[lr]|t[lr]|d[lr]|c[lr]|g[lr]|f[lr]|tl)$/.test(s);
}
function getConsonantTokens(word, start, end) {
    const tokens = [];
    let i = start;
    while (i <= end) {
        const c = word[i];
        const lower = c.toLowerCase();
        const nextLower = i + 1 <= end ? word[i + 1].toLowerCase() : "";
        // Digraphs: ch, ll, rr
        if ((lower === "c" && nextLower === "h") ||
            (lower === "l" && nextLower === "l") ||
            (lower === "r" && nextLower === "r")) {
            tokens.push({ token: word.slice(i, i + 2), index: i });
            i += 2;
            continue;
        }
        // qu / gu with silent u
        if ((lower === "q" || lower === "g") && nextLower === "u") {
            const afterU = i + 2 < word.length ? word[i + 2].toLowerCase() : "";
            if (/^[eiéí]$/.test(afterU)) {
                tokens.push({ token: word.slice(i, i + 2), index: i });
                i += 2;
                continue;
            }
        }
        tokens.push({ token: word[i], index: i });
        i++;
    }
    return tokens;
}
/** Splits a single word into its Spanish syllables. Non-letter tokens are returned as-is. */
export function hyphenateWord(rawWord) {
    if (!rawWord)
        return [];
    let leadingPunct = "";
    let word = rawWord;
    let trailingPunct = "";
    const punctMatch = rawWord.match(/^([^\p{L}]*)([\s\S]*?)([^\p{L}]*)$/u);
    if (punctMatch && punctMatch[2]) {
        leadingPunct = punctMatch[1];
        word = punctMatch[2];
        trailingPunct = punctMatch[3];
    }
    const nuclei = findNuclei(word);
    if (nuclei.length <= 1) {
        return [rawWord];
    }
    const cutIndices = [];
    for (let k = 0; k < nuclei.length - 1; k++) {
        const n1 = nuclei[k];
        const n2 = nuclei[k + 1];
        const consStart = n1.end + 1;
        const consEnd = n2.start - 1;
        if (consStart > consEnd) {
            // Adjacent vowels in hiatus
            cutIndices.push(n2.start);
            continue;
        }
        const consTokens = getConsonantTokens(word, consStart, consEnd);
        if (consTokens.length === 0) {
            cutIndices.push(n2.start);
        }
        else if (consTokens.length === 1) {
            // 1 consonant goes with following syllable (e.g. ca-mi-no, a-mor, a-ho-ra)
            cutIndices.push(consTokens[0].index);
        }
        else if (consTokens.length === 2) {
            // 2 consonants: inseparable stays together with 2nd syllable (e.g. blan-ca), else split (can-to)
            if (isInseparableCluster(consTokens[0].token, consTokens[1].token)) {
                cutIndices.push(consTokens[0].index);
            }
            else {
                cutIndices.push(consTokens[1].index);
            }
        }
        else if (consTokens.length === 3) {
            // 3 consonants: if last two inseparable, 1-2 (em-bru-jo), else 2-1 (cons-tan-te)
            if (isInseparableCluster(consTokens[1].token, consTokens[2].token)) {
                cutIndices.push(consTokens[1].index);
            }
            else {
                cutIndices.push(consTokens[2].index);
            }
        }
        else {
            // 4 consonants: 2-2 (cons-truir)
            cutIndices.push(consTokens[2].index);
        }
    }
    const syllables = [];
    let prev = 0;
    for (const cut of cutIndices) {
        syllables.push(word.slice(prev, cut));
        prev = cut;
    }
    syllables.push(word.slice(prev));
    // Attach leading and trailing punctuation
    syllables[0] = leadingPunct + syllables[0];
    syllables[syllables.length - 1] = syllables[syllables.length - 1] + trailingPunct;
    return syllables;
}
/** Splits a line of lyrics into words, on whitespace, preserving nothing else about layout. */
export function splitIntoWords(line) {
    return line.split(/\s+/).filter((token) => token.length > 0);
}
