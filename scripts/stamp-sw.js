// De service worker zelf verandert anders nooit van inhoud tussen releases
// (enkel de gehashte bundels in /assets wijzigen), waardoor de browser nooit
// een update detecteert en er nooit een "nieuwe versie beschikbaar"-melding
// getoond kan worden. Door het versienummer in de cache-naam te stempelen,
// verschilt sw.js altijd van de vorige release en werkt de update-detectie.
import { readFileSync, writeFileSync } from 'node:fs'

const { version } = JSON.parse(readFileSync('package.json', 'utf8'))
const swPath = 'public/sw.js'
const sw = readFileSync(swPath, 'utf8')
const stamped = sw.replace(/const CACHE = '.*'/, `const CACHE = 'cluedo-speurkaart-v${version}'`)
writeFileSync(swPath, stamped)
