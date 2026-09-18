// RAYARA ANTARANGA · 05 — THE WORKS
// The five granthas as data. The chapter is ONE PAGE in the ṭīkā form
// (js/tika.js): the root text held in the centre, Rayaru's commentary
// written around it. `root` is the text each work explains, and is what
// stands in the centre of the page while that work's margins are read.
//
// Copy is the approved text. No em dashes anywhere on the site.

/* the chapter window in global t (chapter 05 spans .370–.480) */
export const WK0 = .374, WK1 = .4775;

export const WORKS = [
  {
    id: 'nyayasudha',
    title: 'Nyaya Sudha Parimala',
    original: 'न्यायसुधापरिमल',
    root: 'न्यायसुधा', rootPlain: 'Sri Jayatirtha’s Nyāya Sudhā',
    scope: 'on Sri Jayatirtha’s Nyāya Sudhā',
    desc: 'The work so closely associated with Rayaru that it earned him the name Parimalacharya. Reading Jayatirtha’s <em>Nyaya Sudha</em>, he sets out one idea plainly: Sri Hari is independent, and everything else exists through Him.',
  },
  {
    id: 'tantradeepika',
    title: 'Tantra Deepika',
    original: 'तन्त्रदीपिका',
    root: 'ब्रह्मसूत्र', rootPlain: 'the Brahma Sūtras',
    scope: 'on the Brahma Sūtras',
    desc: 'Rayaru turns to the <em>Brahma Sutras</em>, following their arguments through Tattvavada. The conviction underneath is simple: we belong to Sri Hari, and are never one with Him.',
  },
  {
    id: 'battasangraha',
    title: 'Bhatta Sangraha',
    original: 'भाट्टसङ्ग्रह',
    root: 'मीमांसा', rootPlain: 'Pūrva Mīmāṃsā, the Bhāṭṭa school',
    scope: 'Pūrva Mīmāṃsā · the Bhāṭṭa school',
    desc: 'Here he steps out of Vedanta into Mimamsa, which is concerned with how scripture is read at all. Before you can interpret Shastra you have to settle an earlier question: how do we know what a text actually means?',
  },
  {
    id: 'thatvamanjari',
    title: 'Mantrartha Manjari',
    original: 'मन्त्रार्थमञ्जरी',
    root: 'ऋग्वेद', rootPlain: 'the Ṛgveda, the first three adhyāyas',
    scope: 'Ṛgveda · the first three adhyāyas',
    desc: 'The opening hymns of the <em>Rigveda</em> carry gods, rituals and layer on layer of image. Rayaru reads through the layers: many names, many mantras, and their highest meaning pointing to Sri Hari.',
  },
  {
    id: 'thatvaprakashika',
    title: 'Tattva Prakashika Bhavadeepa',
    original: 'तत्त्वप्रकाशिकाभावदीप',
    root: 'तत्त्वप्रकाशिका', rootPlain: 'Jayatirtha’s Tattva Prakāśikā',
    scope: 'on Jayatirtha’s Tattva Prakāśikā',
    desc: 'Rayaru takes the difficult arguments, sets the objections against them, and answers them one by one.',
  },
];
