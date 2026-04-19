/* 12 story fragments — each a piece of the player's lost life. Pick up
   all 12 and the door leads to the Revelation ending. */

export interface Fragment {
  id: string;
  title: string;
  kind: 'photo' | 'paper' | 'metal' | 'glass';
  color: number;
  emissive: number;
  pos: [number, number, number];
  line: string;
  narrative: string;
}

export const FRAGMENTS: Fragment[] = [
  { id: 'photo1908',  title: 'A Photograph, 1908',
    kind: 'photo',    color: 0xe8e2cc, emissive: 0x0a1a24,
    pos: [7.5, 0.12, -2.4],
    line: 'A portrait. Sepia. A face you almost remember — yours, but the eyes are older, the collar stiff with money.',
    narrative: 'There was a year when you had a lot of money.' },
  { id: 'ticker',     title: 'Ticker Tape',
    kind: 'paper',    color: 0xf0e8d0, emissive: 0x1a1410,
    pos: [-7.2, 0.12, -3.5],
    line: 'KRAKEN HOLDINGS LTD · LIQUIDATED · 1929 · and then your name, in the same column, in smaller type.',
    narrative: 'You were a speculator. And then you were not.' },
  { id: 'key',        title: 'Hotel Key, Room 317',
    kind: 'metal',    color: 0xb59248, emissive: 0x4a3d18,
    pos: [6.2, 0.1, 6.8],
    line: 'Heavy brass. The tag says the Hôtel Triton, a place you have never been to and also cannot stop remembering.',
    narrative: 'You never checked out.' },
  { id: 'playbill',   title: 'A Playbill',
    kind: 'paper',    color: 0xc7a6ff, emissive: 0x1e1430,
    pos: [-5.8, 0.12, 7.2],
    line: 'OPHELIA, a drowning in three acts. Closed for renovations, 1904. The lead\'s name is yours.',
    narrative: 'You were someone\'s favorite show, once.' },
  { id: 'watch',      title: 'A Stopped Watch',
    kind: 'metal',    color: 0xb59248, emissive: 0x4a3d18,
    pos: [0.3, 0.1, -8.5],
    line: 'Hands frozen at 3:47. The crystal is cracked. The inscription: "for the hours you forgot to live."',
    narrative: 'Time stopped for you at 3:47.' },
  { id: 'ring',       title: 'A Wedding Ring',
    kind: 'metal',    color: 0xe8e2cc, emissive: 0x4a4030,
    pos: [9.6, 0.1, 4.2],
    line: 'Inside the band: two names, one scratched out. You recognize your handwriting from the scratch.',
    narrative: 'You loved someone, and then you un-loved them, on purpose.' },
  { id: 'bottle',     title: 'A Medicine Bottle',
    kind: 'glass',    color: 0x5be0c2, emissive: 0x0e2a20,
    pos: [-9.2, 0.1, 2.8],
    line: 'Laudanum. The label bears your pharmacist\'s stamp — he was three blocks from the hotel you do not remember.',
    narrative: 'You had trouble sleeping for a long time.' },
  { id: 'letters',    title: 'A Bundle of Letters',
    kind: 'paper',    color: 0xf0e8d0, emissive: 0x1a140c,
    pos: [4.8, 0.12, 9.5],
    line: 'Tied with black ribbon. All unopened. All addressed to you, at an apartment you never lived in.',
    narrative: 'Someone was writing to you, and you were not reading them.' },
  { id: 'locket',     title: 'A Locket, Two Faces',
    kind: 'metal',    color: 0xb59248, emissive: 0x4a3d18,
    pos: [-6.5, 0.1, -6.2],
    line: 'Left: a child. Right: the same child, older, hollow-eyed. Both drawn, not photographed. Both you.',
    narrative: 'You were both the loved and the missing.' },
  { id: 'notice',     title: 'A Debt Collector\'s Notice',
    kind: 'paper',    color: 0xff6b8a, emissive: 0x2a0f18,
    pos: [2.8, 0.12, 9.8],
    line: 'FINAL NOTICE, in red ink. The amount owed is exactly five hundred. The unit is not specified.',
    narrative: 'The number five hundred keeps appearing. You owe it to someone.' },
  { id: 'ticket',     title: 'A Train Ticket',
    kind: 'paper',    color: 0xe8e2cc, emissive: 0x1a1814,
    pos: [-2.6, 0.12, -9.5],
    line: 'One way. Destination scratched out. Departure: the night you cannot remember. The stub was never torn.',
    narrative: 'You bought a way out. You never took it.' },
  { id: 'drawing',    title: 'A Child\'s Drawing',
    kind: 'paper',    color: 0x7ef0ff, emissive: 0x082a38,
    pos: [8.2, 0.12, -7.4],
    line: 'Crayon. A house, a sun, three stick figures, the tallest labeled DADDY. The paper smells of seawater.',
    narrative: 'You were loved by a child. They are waiting.' },
];
