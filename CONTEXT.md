# El Silbador

A cancionero (songbook) app where authors annotate lyrics with chords and notes for singers to read.

## Language

**Vocal notes track**:
The annotation row where the author writes the sung notes (e.g. "re") above the lyrics.
_Avoid_: melody row, notes track

**Pitch direction indicator**:
An arrow shown under a vocal note telling the singer that this note is higher (up) or lower (down) than the previous one. A free author annotation: never inferred from, or validated against, the note names.
_Avoid_: pitch arrow, melodic arrow, contour marker

**Tab block**:
A block between the lines of a song, inserted by typing `TAB` alone on a line, that holds one or more guitar tabs edited with the ascii-tabs library. In the UI it is a "tablatura". Its contents live with the song in Supabase.
_Avoid_: punteo, tab (in UI copy)

**Tabs toggle**:
The read-mode toggle labelled "TAB" that shows or hides every tab block of a song. Off by default; shown only in read mode and only when the song has at least one tab block. The choice is remembered per browser, like the underline toggle.
_Avoid_: tab switch

**Free text**:
Words written between the markers `<--` and `-->` inside a lyric line. Kept whole as a single word (spaces included), never syllabified, and like `BIS` it takes no chords, vocal notes or underline. The markers stay visible. A `<--` with no closing `-->` is ordinary lyrics. A line that opens with `<--` and has no `-->` starts a block: every line through the first later line containing `-->` is kept whole as free text. In the UI it is "texto sin formato".
_Avoid_: comment, annotation (that is what the tracks hold)

**Chord line**:
A line of a song whose text is only chords (e.g. `A   D   E7`), such as an intro or an ending without lyrics. Kept as text in the lyrics, shown in chord typography, with no syllables, underline or annotation slots; transposed and toggled with the chords. In the UI it is a "línea de acordes".
_Avoid_: instrumental line, chord row (that is the chords track above a lyric line)
