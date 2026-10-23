// De kaarten zoals op het speurblad (bron/speurblad.png): dezelfde
// tekeningen, dezelfde woorden en dezelfde groepskleuren, zodat een kind ze meteen
// herkent. De korte naam staat — net als op het blad — in kleine letters
// onder het plaatje; de volledige naam wordt voorgelezen.
//
// De plaatjes zijn uit het blad geknipt met scripts/knip-plaatjes.mjs.

const plaatjes = import.meta.glob('./plaatjes/*.png', { eager: true, import: 'default' })
const plaatje = (id) => plaatjes[`./plaatjes/${id}.png`]

const kaart = (id, kort, naam, extra = {}) => ({ id, kort, naam, plaatje: plaatje(id), ...extra })

export const PERSONAGES = [
  kaart('roodhart', 'roodhart', 'Mevrouw Roodhart', { kleur: '#d62828' }),
  kaart('van-geelen', 'van geelen', 'Kolonel Van Geelen', { kleur: '#f2c200' }),
  kaart('de-wit', 'witte', 'Mevrouw Witte', { kleur: '#ffffff' }),
  kaart('groenewoud', 'groenewoud', 'Dominee Groenewoud', { kleur: '#2a9d4b' }),
  kaart('blaauw', 'blaauw van draet', 'Mevrouw Blaauw van Draet', { kleur: '#2667c9' }),
  kaart('pimpel', 'pimpel', 'Professor Pimpel', { kleur: '#7b3fb5' }),
]

export const WAPENS = [
  kaart('kandelaar', 'kandelaar', 'De kandelaar'),
  kaart('mes', 'dolk', 'De dolk'),
  kaart('touw', 'touw', 'Het touw'),
  kaart('sleutel', 'moersleutel', 'De moersleutel'),
  kaart('pistool', 'revolver', 'De revolver'),
  kaart('pijp', 'loden pijp', 'De loden pijp'),
]

export const KAMERS = [
  kaart('muziekkamer', 'muziekkamer', 'De muziekkamer'),
  kaart('biljart', 'biljartkamer', 'De biljartkamer'),
  kaart('serre', 'serre', 'De serre'),
  kaart('eetkamer', 'eetkamer', 'De eetkamer'),
  kaart('hal', 'hal', 'De hal'),
  kaart('keuken', 'keuken', 'De keuken'),
  kaart('bibliotheek', 'bibliotheek', 'De bibliotheek'),
  kaart('zitkamer', 'zitkamer', 'De zitkamer'),
  kaart('studeerkamer', 'studeerkamer', 'De studeerkamer'),
]

export const GROEPEN = [
  { id: 'wie', titel: 'Daders', emoji: '🕵️', kaarten: PERSONAGES },
  { id: 'waarmee', titel: 'Voorwerpen', emoji: '🔍', kaarten: WAPENS },
  { id: 'waar', titel: 'Kamers', emoji: '🏠', kaarten: KAMERS },
]

// De volgorde waarin de knoppen in het keuzevenster staan.
export const MARKERINGEN = [
  { id: 'hand', symbool: '✋', woord: 'Mijn kaart', uitleg: 'Ik heb deze kaart zelf' },
  { id: 'nee', symbool: '✕', woord: 'Niet', uitleg: 'Iemand liet deze kaart zien' },
  { id: 'misschien', symbool: '?', woord: 'Misschien', uitleg: 'Dit kan het nog zijn' },
  { id: 'ja', symbool: '★', woord: 'Zeker!', uitleg: 'Dit is het zeker' },
]
