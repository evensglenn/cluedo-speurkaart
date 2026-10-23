// De kaarten van de klassieke Nederlandstalige Cluedo. Elke kaart heeft een
// korte naam (onder het plaatje) en een volledige naam (in het keuzevenster,
// en om voor te lezen). Personages worden getekend als pion in hun kleur;
// wapens en kamers met een emoji, of een eigen tekening als die er niet is.

export const PERSONAGES = [
  { id: 'roodhart', kort: 'Roodhart', naam: 'Mevrouw Roodhart', kleur: '#d62828' },
  { id: 'van-geelen', kort: 'Van Geelen', naam: 'Kolonel Van Geelen', kleur: '#f2c200' },
  { id: 'de-wit', kort: 'De Wit', naam: 'Mevrouw De Wit', kleur: '#ffffff' },
  { id: 'groenewoud', kort: 'Groenewoud', naam: 'Dominee Groenewoud', kleur: '#2a9d4b' },
  { id: 'blaauw', kort: 'Blaauw', naam: 'Mevrouw Blaauw van Draet', kleur: '#2667c9' },
  { id: 'pimpel', kort: 'Pimpel', naam: 'Professor Pimpel', kleur: '#7b3fb5' },
]

export const WAPENS = [
  { id: 'kandelaar', kort: 'Kandelaar', naam: 'De kandelaar', emoji: '🕯️' },
  { id: 'mes', kort: 'Mes', naam: 'Het mes', emoji: '🔪' },
  { id: 'pijp', kort: 'Loden pijp', naam: 'De loden pijp', tekening: 'pijp' },
  { id: 'pistool', kort: 'Pistool', naam: 'Het pistool', emoji: '🔫' },
  { id: 'touw', kort: 'Touw', naam: 'Het touw', emoji: '🪢' },
  { id: 'sleutel', kort: 'Sleutel', naam: 'De Engelse sleutel', emoji: '🔧' },
]

export const KAMERS = [
  { id: 'keuken', kort: 'Keuken', naam: 'De keuken', emoji: '🍳' },
  { id: 'balzaal', kort: 'Balzaal', naam: 'De balzaal', emoji: '🪩' },
  { id: 'serre', kort: 'Serre', naam: 'De serre', emoji: '🪴' },
  { id: 'eetkamer', kort: 'Eetkamer', naam: 'De eetkamer', emoji: '🍽️' },
  { id: 'biljart', kort: 'Biljart', naam: 'De biljartkamer', emoji: '🎱' },
  { id: 'bibliotheek', kort: 'Bibliotheek', naam: 'De bibliotheek', emoji: '📚' },
  { id: 'zitkamer', kort: 'Zitkamer', naam: 'De zitkamer', emoji: '🛋️' },
  { id: 'hal', kort: 'Hal', naam: 'De hal', emoji: '🚪' },
  { id: 'werkkamer', kort: 'Werkkamer', naam: 'De werkkamer', emoji: '🖋️' },
]

export const GROEPEN = [
  { id: 'wie', vraag: 'Wie?', emoji: '🕵️', kaarten: PERSONAGES },
  { id: 'waarmee', vraag: 'Waarmee?', emoji: '🗡️', kaarten: WAPENS },
  { id: 'waar', vraag: 'Waar?', emoji: '🏠', kaarten: KAMERS },
]

// De volgorde waarin de knoppen in het keuzevenster staan.
export const MARKERINGEN = [
  { id: 'hand', symbool: '✋', woord: 'Mijn kaart', uitleg: 'Ik heb deze kaart zelf' },
  { id: 'nee', symbool: '✕', woord: 'Niet', uitleg: 'Iemand liet deze kaart zien' },
  { id: 'misschien', symbool: '?', woord: 'Misschien', uitleg: 'Dit kan het nog zijn' },
  { id: 'ja', symbool: '★', woord: 'Zeker!', uitleg: 'Dit is het zeker' },
]
