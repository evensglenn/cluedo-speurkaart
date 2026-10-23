// Knipt de tekeningen uit het speurblad (bron/speurblad.png) en zet ze als
// losse plaatjes in src/plaatjes/. Eenmalig te draaien wanneer het blad
// verandert: node scripts/knip-plaatjes.mjs
//
// Daders en voorwerpen staan los op wit: die witte achtergrond wordt
// doorzichtig gemaakt (vanaf de randen, zodat wit ín de tekening — zoals de
// jurk van Witte — blijft), en enkel de tekening zelf blijft over, zonder het
// aankruisrondje ernaast. Kamers zijn al rechthoekige prentjes en worden enkel
// uitgesneden.
import sharp from 'sharp'
import { mkdirSync } from 'node:fs'

const BRON = 'bron/speurblad.png'
const DOEL = 'src/plaatjes'

// [id, links, boven, breedte, hoogte] in pixels van het speurblad. Bij het
// touw mag ook het wit binnen de lussen weg.
const LOS = [
  ['roodhart', 88, 270, 118, 265],
  ['van-geelen', 248, 270, 122, 265],
  ['de-wit', 420, 270, 100, 265],
  ['groenewoud', 566, 270, 118, 265],
  ['blaauw', 732, 270, 112, 265],
  ['pimpel', 892, 270, 112, 265],
  ['kandelaar', 100, 670, 85, 185],
  ['mes', 222, 670, 135, 185],
  ['touw', 388, 690, 125, 160, { allesWit: true }],
  ['sleutel', 548, 680, 120, 175],
  ['pistool', 690, 715, 145, 130],
  ['pijp', 862, 680, 150, 175],
]

const KAMERS = [
  ['muziekkamer', 99, 1004, 214, 134],
  ['biljart', 427, 999, 211, 137],
  ['serre', 752, 1000, 226, 140],
  ['eetkamer', 99, 1183, 221, 127],
  ['hal', 427, 1182, 222, 130],
  ['keuken', 752, 1188, 226, 128],
  ['bibliotheek', 99, 1349, 230, 122],
  ['zitkamer', 427, 1349, 209, 122],
  ['studeerkamer', 752, 1349, 218, 122],
]

const isWit = (d, i) => d[i] > 232 && d[i + 1] > 232 && d[i + 2] > 232

async function knipLos([id, x, y, w, h, opties = {}]) {
  const { data, info } = await sharp(BRON)
    .extract({ left: x, top: y, width: w, height: h })
    .ensureAlpha()
    .raw()
    .toBuffer({ resolveWithObject: true })
  const W = info.width
  const H = info.height
  const px = (i) => i * 4

  // 1. Wit dat met de rand verbonden is, wordt doorzichtig.
  const weg = new Uint8Array(W * H)
  const stapel = []
  for (let i = 0; i < W; i++) stapel.push(i, (H - 1) * W + i)
  for (let j = 0; j < H; j++) stapel.push(j * W, j * W + W - 1)
  while (stapel.length) {
    const p = stapel.pop()
    if (weg[p] || !isWit(data, px(p))) continue
    weg[p] = 1
    const cx = p % W
    const cy = (p / W) | 0
    if (cx > 0) stapel.push(p - 1)
    if (cx < W - 1) stapel.push(p + 1)
    if (cy > 0) stapel.push(p - W)
    if (cy < H - 1) stapel.push(p + W)
  }

  if (opties.allesWit) for (let p = 0; p < W * H; p++) if (isWit(data, px(p))) weg[p] = 1

  // 2. Wat overblijft opdelen in losse stukken; het grootste is de tekening.
  const stuk = new Int32Array(W * H).fill(-1)
  const stukken = []
  for (let p = 0; p < W * H; p++) {
    if (weg[p] || stuk[p] >= 0) continue
    const s = { n: 0, x0: W, y0: H, x1: 0, y1: 0 }
    const nr = stukken.push(s) - 1
    const rij = [p]
    stuk[p] = nr
    while (rij.length) {
      const q = rij.pop()
      const cx = q % W
      const cy = (q / W) | 0
      s.n++
      s.x0 = Math.min(s.x0, cx)
      s.x1 = Math.max(s.x1, cx)
      s.y0 = Math.min(s.y0, cy)
      s.y1 = Math.max(s.y1, cy)
      for (const [dx, dy] of [[1, 0], [-1, 0], [0, 1], [0, -1]]) {
        const nx = cx + dx
        const ny = cy + dy
        if (nx < 0 || ny < 0 || nx >= W || ny >= H) continue
        const r = ny * W + nx
        if (!weg[r] && stuk[r] < 0) {
          stuk[r] = nr
          rij.push(r)
        }
      }
    }
  }
  const groot = stukken.reduce((a, b) => (b.n > a.n ? b : a))

  // Kleine losse stukjes binnen de tekening (een vlam, een oog) mogen blijven;
  // alles daarbuiten (het aankruisrondje, een stukje van een buur) niet, en
  // ook geen stukje dat tegen de rand van de uitsnede ligt: dat is altijd
  // een afgesneden rest van het rondje.
  const marge = 6
  const aanRand = (s) => s.x0 === 0 || s.y0 === 0 || s.x1 === W - 1 || s.y1 === H - 1
  const houd = stukken.map(
    (s) =>
      s === groot ||
      (!aanRand(s) &&
        s.x0 >= groot.x0 - marge &&
        s.x1 <= groot.x1 + marge &&
        s.y0 >= groot.y0 - marge &&
        s.y1 <= groot.y1 + marge),
  )
  let x0 = W
  let y0 = H
  let x1 = 0
  let y1 = 0
  for (let p = 0; p < W * H; p++) {
    if (weg[p] || !houd[stuk[p]]) {
      data[px(p) + 3] = 0
      continue
    }
    const cx = p % W
    const cy = (p / W) | 0
    x0 = Math.min(x0, cx)
    x1 = Math.max(x1, cx)
    y0 = Math.min(y0, cy)
    y1 = Math.max(y1, cy)
  }

  await sharp(data, { raw: { width: W, height: H, channels: 4 } })
    .extract({ left: x0, top: y0, width: x1 - x0 + 1, height: y1 - y0 + 1 })
    .png()
    .toFile(`${DOEL}/${id}.png`)
}

async function knipKamer([id, x, y, w, h]) {
  await sharp(BRON).extract({ left: x, top: y, width: w, height: h }).png().toFile(`${DOEL}/${id}.png`)
}

mkdirSync(DOEL, { recursive: true })
for (const d of LOS) await knipLos(d)
for (const k of KAMERS) await knipKamer(k)
console.log(`${LOS.length + KAMERS.length} plaatjes in ${DOEL}/`)
