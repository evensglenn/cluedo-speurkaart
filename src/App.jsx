import { useEffect, useState } from 'react'
import { version as APP_VERSION } from '../package.json'
import { GROEPEN, MARKERINGEN } from './kaarten.js'

const OPSLAG = 'cluedo-speurkaart:spel'
const SPELERS_OPSLAG = 'cluedo-speurkaart:spelers'
const MAX_TERUG = 100

// Elke medespeler krijgt een plaatje, zodat een kind ze herkent zonder te lezen:
// een rij dieren, een rij voertuigen en een rij andere leuke dingen. Het
// gekozen plaatje wordt (om oude spelers te bewaren) nog als 'dier' opgeslagen.
const ICONEN = [
  '🐻', '🦊', '🐼', '🐸', '🦁', '🐰', '🐶', '🐱',
  '🚗', '🏎️', '🚒', '🚓', '🚜', '🚂', '✈️', '🚀',
  '⚽', '🦖', '🦄', '🤖', '👑', '🌈', '🍕', '🍦',
]

const ALLE_KAARTEN = GROEPEN.flatMap((g) => g.kaarten)
const zoekKaart = (id) => ALLE_KAARTEN.find((k) => k.id === id)
const groepVan = (kaart) => GROEPEN.find((g) => g.kaarten.includes(kaart))

// Een spel bestaat uit de markering per kaart (spel), per eigen kaart aan
// welke spelers ze al getoond is (getoond) en, per weggestreepte kaart, hoe
// je dat weet (bron): de id van de speler die ze liet zien, of BORD.
const LEEG_SPEL = { spel: {}, getoond: {}, bron: {} }

// De kaart ligt open op het bord, in een hoekkamer.
const BORD = 'bord'

function laad(sleutel) {
  try {
    return JSON.parse(localStorage.getItem(sleutel))
  } catch (e) {
    return null
  }
}

function bewaar(sleutel, waarde) {
  try {
    localStorage.setItem(sleutel, JSON.stringify(waarde))
  } catch (e) {}
}

function laadSpel() {
  const bewaard = laad(OPSLAG)
  if (!bewaard || typeof bewaard !== 'object') return LEEG_SPEL
  // Oudere versies bewaarden enkel de markeringen.
  if (!bewaard.spel) return { spel: bewaard, getoond: {}, bron: {} }
  return { spel: bewaard.spel, getoond: bewaard.getoond ?? {}, bron: bewaard.bron ?? {} }
}

function laadSpelers() {
  const bewaard = laad(SPELERS_OPSLAG)
  return Array.isArray(bewaard) ? bewaard : []
}

// Leest een naam voor, voor wie (nog) niet alles kan lezen.
function spreek(tekst) {
  if (!('speechSynthesis' in window)) return
  window.speechSynthesis.cancel()
  const zin = new SpeechSynthesisUtterance(tekst)
  const stemmen = window.speechSynthesis.getVoices()
  const stem =
    stemmen.find((s) => s.lang === 'nl-BE') ?? stemmen.find((s) => s.lang?.startsWith('nl'))
  if (stem) zin.voice = stem
  zin.lang = stem?.lang ?? 'nl-BE'
  zin.rate = 0.9
  window.speechSynthesis.speak(zin)
}

// Per groep: welke kaarten kunnen het nog zijn, en weten we het antwoord al?
// Het antwoord is gekend als er een ster op staat, of als er nog maar één
// kaart overblijft die niet weggestreept is.
function bekijkGroep(groep, spel) {
  const over = groep.kaarten.filter((k) => spel[k.id] !== 'nee' && spel[k.id] !== 'hand')
  const ster = groep.kaarten.find((k) => spel[k.id] === 'ja')
  const antwoord = ster ?? (over.length === 1 ? over[0] : null)
  return { over, antwoord }
}

// De achtergrond van het plaatjesvak: bij personages hun eigen kleur.
function tint(kaart) {
  if (!kaart.kleur) return undefined
  if (kaart.kleur === '#ffffff') return { '--tint': '#ddd6c8' }
  return { '--tint': `color-mix(in srgb, ${kaart.kleur} 32%, #fffaf0)` }
}

// De tekening van het speurblad. Kamers zijn rechthoekige prentjes, de rest
// staat los op een doorzichtige achtergrond.
function Plaatje({ kaart }) {
  const soort = groepVan(kaart).id === 'waar' ? 'prent' : 'los'
  return <img className={`plaatje plaatje-${soort}`} src={kaart.plaatje} alt="" draggable="false" />
}

function Merk({ markering }) {
  if (!markering) return null
  const m = MARKERINGEN.find((x) => x.id === markering)
  return (
    <span className={`merk merk-${markering}`} aria-hidden="true">
      {m.symbool}
    </span>
  )
}

function Kaart({ kaart, markering, antwoord, kijkers, bron, onKies }) {
  const klassen = ['kaart']
  // Zonder ster, maar als enige overgebleven kaart is het toch het antwoord.
  const isAntwoord = antwoord?.id === kaart.id
  if (isAntwoord && !markering) markering = 'ja'
  if (markering) klassen.push(`is-${markering}`)
  else if (antwoord && !isAntwoord) klassen.push('is-uitgesloten')
  // Een eigen kaart is het sowieso niet: ze krijgt ook de rode stempel.
  if (markering === 'hand') klassen.push('is-nee')
  return (
    <button
      type="button"
      className={klassen.join(' ')}
      // Op de plattegrond heeft elke kamer haar vaste plaats.
      style={groepVan(kaart).id === 'waar' ? { gridArea: kaart.id } : undefined}
      onClick={() => onKies(kaart)}
      aria-label={kaart.naam}
    >
      <span className="kaart-beeld" style={tint(kaart)}>
        <Plaatje kaart={kaart} />
      </span>
      <span className="kaart-naam">{kaart.kort}</span>
      {markering === 'hand' && <Merk markering="nee" />}
      <Merk markering={markering} />
      {markering === 'nee' && bron && (
        <span className="kijkers bron" aria-label={bron === BORD ? 'ligt op het bord' : `getoond door ${bron.naam}`}>
          <i>{bron === BORD ? '🗺️' : bron.dier}</i>
        </span>
      )}
      {markering === 'hand' && kijkers.length > 0 && (
        <span className="kijkers" aria-label={`getoond aan ${kijkers.map((s) => s.naam).join(', ')}`}>
          {kijkers.map((s) => (
            <i key={s.id}>{s.dier}</i>
          ))}
        </span>
      )}
    </button>
  )
}

// Elke groep heeft een eigen plek uit de speurderswereld: de daders staan in
// een line-up, de voorwerpen hangen aan bewijslabels en de kamers liggen op
// de plattegrond van het bord. Het logo staat linksboven in de balk.
const PLEK = { wie: 'lineup', waarmee: 'labels', waar: 'plattegrond' }

// Het logo van de app (zoals public/favicon.svg, zonder achtergrond): een
// vergrootglas met de kleuren van daders, voorwerpen en kamers.
function Logo() {
  return (
    <svg className="logo" viewBox="10 10 44 44" aria-hidden="true">
      <circle cx="28" cy="27" r="14" fill="#222c40" stroke="#f6c744" strokeWidth="5" />
      <rect x="18.3" y="24.3" width="5.4" height="5.4" rx="1.5" fill="#e0474c" />
      <rect x="25.3" y="24.3" width="5.4" height="5.4" rx="1.5" fill="#3d7be0" />
      <rect x="32.3" y="24.3" width="5.4" height="5.4" rx="1.5" fill="#2fa463" />
      <path d="M38.5 37.5 49 48" stroke="#f6c744" strokeWidth="6.5" strokeLinecap="round" />
    </svg>
  )
}

function Midden({ alles }) {
  return (
    <span className={`midden${alles ? ' is-klaar' : ''}`} aria-live="polite">
      {alles ? (
        <>
          <span className="midden-teken" aria-hidden="true">
            🎉
          </span>
          <span className="midden-woord">Je weet het!</span>
        </>
      ) : (
        <>
          <Logo />
          <span className="midden-woord">Cluedo speurkaart</span>
        </>
      )}
    </span>
  )
}

function Groep({ groep, spel, kijkersVan, bronVan, onKies }) {
  const { antwoord } = bekijkGroep(groep, spel)
  return (
    <section className={`groep groep-${groep.id}`}>
      <h2>
        <span className="label">
          <span aria-hidden="true">{groep.emoji}</span>
          {groep.titel}
        </span>
      </h2>
      <div className={`kaarten ${PLEK[groep.id]}`}>
        {groep.kaarten.map((k) => (
          <Kaart
            key={k.id}
            kaart={k}
            markering={spel[k.id]}
            antwoord={antwoord}
            kijkers={kijkersVan(k)}
            bron={bronVan(k)}
            onKies={onKies}
          />
        ))}
      </div>
    </section>
  )
}

function Keuze({ kaart, markering, spelers, getoondAan, bron, onZet, onToon, onBron, onSpelers, onSluit }) {
  const groep = groepVan(kaart)
  return (
    <div className="scherm" onClick={onSluit}>
      <div
        className={`venster venster-${groep.id}`}
        role="dialog"
        aria-label={kaart.naam}
        onClick={(e) => e.stopPropagation()}
      >
        <button type="button" className="rond sluit" onClick={onSluit} aria-label="Sluiten">
          ✕
        </button>
        <div className="venster-kop">
          <span className="venster-beeld" style={tint(kaart)}>
            <Plaatje kaart={kaart} />
          </span>
          <div className="venster-titel">
            <div className="venster-naam">{kaart.kort}</div>
            <button type="button" className="spreek" onClick={() => spreek(kaart.naam)} aria-label="Lees voor">
              🔊
            </button>
          </div>
        </div>
        <div className="keuzes">
          {MARKERINGEN.map((m) => (
            <button
              key={m.id}
              type="button"
              className={`keuze keuze-${m.id}${markering === m.id ? ' is-gekozen' : ''}`}
              onClick={() => onZet(kaart, m.id)}
              aria-label={m.uitleg}
            >
              <span className="keuze-symbool" aria-hidden="true">
                {m.symbool}
              </span>
              <span className="keuze-woord">{m.woord}</span>
            </button>
          ))}
        </div>
        {/* Een eigen kaart kun je tonen: bijhouden aan wie, zodat je die
            speler later liefst dezelfde kaart toont en niets nieuws verraadt. */}
        {markering === 'hand' && (
          <div className="getoond">
            <div className="getoond-titel">👀 Getoond aan</div>
            {spelers.length ? (
              <div className="speler-knoppen">
                {spelers.map((s) => (
                  <button
                    key={s.id}
                    type="button"
                    className={`speler-knop${getoondAan.includes(s.id) ? ' is-aan' : ''}`}
                    onClick={() => onToon(kaart, s.id)}
                    aria-pressed={getoondAan.includes(s.id)}
                  >
                    <span className="dier">{s.dier}</span>
                    <span className="speler-naam">{s.naam}</span>
                  </button>
                ))}
              </div>
            ) : (
              <button type="button" className="wis" onClick={onSpelers}>
                <Icoon naam="spelers" /> Spelers toevoegen
              </button>
            )}
          </div>
        )}
        {/* Weggestreept: hoe weet je dat? Een speler liet de kaart zien, of
            ze ligt open op het bord in een hoekkamer. */}
        {markering === 'nee' && (
          <div className="getoond getoond-nee">
            <div className="getoond-titel">🔎 Hoe weet je het?</div>
            <div className="speler-knoppen">
              {spelers.map((s) => (
                <button
                  key={s.id}
                  type="button"
                  className={`speler-knop${bron === s.id ? ' is-aan' : ''}`}
                  onClick={() => onBron(kaart, s.id)}
                  aria-pressed={bron === s.id}
                >
                  <span className="dier">{s.dier}</span>
                  <span className="speler-naam">{s.naam}</span>
                </button>
              ))}
              <button
                type="button"
                className={`speler-knop${bron === BORD ? ' is-aan' : ''}`}
                onClick={() => onBron(kaart, BORD)}
                aria-pressed={bron === BORD}
              >
                <span className="dier">🗺️</span>
                <span className="speler-naam">Op het bord</span>
              </button>
            </div>
            {!spelers.length && (
              <button type="button" className="wis" onClick={onSpelers}>
                <Icoon naam="spelers" /> Spelers toevoegen
              </button>
            )}
          </div>
        )}
        {markering && (
          <button type="button" className="wis" onClick={() => onZet(kaart, null)}>
            🧽 Leeg maken
          </button>
        )}
      </div>
    </div>
  )
}

function Spelers({ spelers, onVoegToe, onWijzig, onVerwijder, onSluit }) {
  // De speler die je aan het wijzigen bent; null = een nieuwe toevoegen.
  const [bewerk, setBewerk] = useState(null)
  const vrijVoor = (id) => ICONEN.filter((d) => !spelers.some((s) => s.id !== id && s.dier === d))
  const vrij = vrijVoor(bewerk)
  const [naam, setNaam] = useState('')
  const [dier, setDier] = useState(vrij[0] ?? ICONEN[0])

  const nieuw = () => {
    setBewerk(null)
    setNaam('')
    setDier(vrijVoor(null)[0] ?? ICONEN[0])
  }

  const begin = (s) => {
    if (bewerk === s.id) return nieuw()
    setBewerk(s.id)
    setNaam(s.naam)
    setDier(s.dier)
  }

  const bewaarSpeler = (e) => {
    e.preventDefault()
    if (!naam.trim()) return
    if (bewerk) {
      onWijzig(bewerk, { naam: naam.trim(), dier })
      nieuw()
      return
    }
    onVoegToe({ id: `${Date.now()}`, naam: naam.trim(), dier })
    setNaam('')
    setDier(vrij.find((d) => d !== dier) ?? ICONEN[0])
  }

  const verwijder = (id) => {
    if (bewerk === id) nieuw()
    onVerwijder(id)
  }

  return (
    <div className="scherm" onClick={onSluit}>
      <div className="venster venster-spelers" role="dialog" aria-label="Spelers" onClick={(e) => e.stopPropagation()}>
        <button type="button" className="rond sluit" onClick={onSluit} aria-label="Sluiten">
          ✕
        </button>
        <div className="venster-naam venster-naam-icoon">
          <Icoon naam="spelers" /> Spelers
        </div>
        <p className="venster-uitleg">De anderen aan tafel. Ze blijven bewaard, ook bij een nieuw spel.</p>
        {spelers.length > 0 && (
          <ul className="spelers-lijst">
            {spelers.map((s) => (
              <li key={s.id} className={bewerk === s.id ? 'is-bewerk' : undefined}>
                <span className="dier">{bewerk === s.id ? dier : s.dier}</span>
                <span className="speler-naam">{bewerk === s.id ? naam || s.naam : s.naam}</span>
                <button
                  type="button"
                  className={`verwijder${bewerk === s.id ? ' is-aan' : ''}`}
                  onClick={() => begin(s)}
                  aria-label={`${s.naam} wijzigen`}
                  aria-pressed={bewerk === s.id}
                >
                  ✏️
                </button>
                <button type="button" className="verwijder" onClick={() => verwijder(s.id)} aria-label={`${s.naam} verwijderen`}>
                  🗑️
                </button>
              </li>
            ))}
          </ul>
        )}
        <form className={`nieuwe-speler${bewerk ? ' is-bewerk' : ''}`} onSubmit={bewaarSpeler}>
          <div className="dieren" role="radiogroup" aria-label="Plaatje">
            {ICONEN.map((d) => (
              <button
                key={d}
                type="button"
                role="radio"
                aria-checked={d === dier}
                className={`dier-knop${d === dier ? ' is-aan' : ''}${vrij.includes(d) ? '' : ' is-bezet'}`}
                onClick={() => setDier(d)}
              >
                {d}
              </button>
            ))}
          </div>
          <div className="naam-rij">
            <span className="dier">{dier}</span>
            <input
              type="text"
              value={naam}
              onChange={(e) => setNaam(e.target.value)}
              placeholder="Naam, bv. papa"
              maxLength={14}
              enterKeyHint="done"
            />
            {bewerk && (
              <button type="button" className="annuleer" onClick={nieuw} aria-label="Niet wijzigen">
                ✕
              </button>
            )}
            <button
              type="submit"
              className="toevoegen"
              disabled={!naam.trim()}
              aria-label={bewerk ? 'Wijziging bewaren' : 'Speler toevoegen'}
            >
              {bewerk ? '✓' : '＋'}
            </button>
          </div>
        </form>
      </div>
    </div>
  )
}

// Eigen iconen voor de knoppen bovenaan, in één lijnstijl.
const ICOON_PADEN = {
  terug: (
    <>
      <path d="M9 14 4 9l5-5" />
      <path d="M4 9h10.5a5.5 5.5 0 0 1 0 11H11" />
    </>
  ),
  spelers: (
    <>
      <circle cx="12" cy="8" r="3.2" />
      <path d="M6.5 20a5.5 5.5 0 0 1 11 0" />
      <circle cx="5" cy="10.5" r="2.3" />
      <path d="M1.5 19.5a3.8 3.8 0 0 1 4.6-3.7" />
      <circle cx="19" cy="10.5" r="2.3" />
      <path d="M22.5 19.5a3.8 3.8 0 0 0-4.6-3.7" />
    </>
  ),
  // Een leeg speurblad met een sterretje: opnieuw beginnen.
  nieuw: (
    <>
      <path d="M14 3H6.5A1.5 1.5 0 0 0 5 4.5v15A1.5 1.5 0 0 0 6.5 21h11a1.5 1.5 0 0 0 1.5-1.5V8z" />
      <path d="M14 3v5h5" />
      <path d="m12 10.6 1.1 2.8 2.8 1.1-2.8 1.1L12 18.4l-1.1-2.8-2.8-1.1 2.8-1.1z" fill="currentColor" />
    </>
  ),
}

function Icoon({ naam }) {
  return (
    <svg
      className="icoon"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="2.2"
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden="true"
    >
      {ICOON_PADEN[naam]}
    </svg>
  )
}

function NieuwSpel({ onJa, onNee }) {
  return (
    <div className="scherm" onClick={onNee}>
      <div className="venster venster-klein" role="dialog" aria-label="Nieuw spel?" onClick={(e) => e.stopPropagation()}>
        <div className="vraag-icoon">
          <Icoon naam="nieuw" />
        </div>
        <div className="venster-naam">Nieuw spel?</div>
        <div className="ja-nee">
          <button type="button" className="knop-nee" onClick={onNee} aria-label="Nee, verder spelen">
            ✕
          </button>
          <button type="button" className="knop-ja" onClick={onJa} aria-label="Ja, nieuw spel">
            ✓
          </button>
        </div>
      </div>
    </div>
  )
}

export default function App() {
  const [staat, setStaat] = useState(laadSpel)
  const [spelers, setSpelers] = useState(laadSpelers)
  const [vorige, setVorige] = useState([])
  const [gekozen, setGekozen] = useState(null)
  const [vraagNieuw, setVraagNieuw] = useState(false)
  const [toonSpelers, setToonSpelers] = useState(false)
  const [updateAvailable, setUpdateAvailable] = useState(false)
  const { spel, getoond, bron } = staat

  useEffect(() => bewaar(OPSLAG, staat), [staat])
  useEffect(() => bewaar(SPELERS_OPSLAG, spelers), [spelers])

  useEffect(() => {
    const onUpdate = () => setUpdateAvailable(true)
    window.addEventListener('speurkaart:update-available', onUpdate)
    return () => window.removeEventListener('speurkaart:update-available', onUpdate)
  }, [])

  const wijzig = (nieuw) => {
    setVorige((v) => [...v, staat].slice(-MAX_TERUG))
    setStaat(nieuw)
  }

  const kijkersVan = (kaart) => spelers.filter((s) => getoond[kaart.id]?.includes(s.id))
  const bronVan = (kaart) => {
    const b = bron[kaart.id]
    return b === BORD ? BORD : spelers.find((s) => s.id === b)
  }

  const zet = (kaart, markering) => {
    const nieuw = { ...spel }
    if (markering === 'ja') {
      // Er kan maar één dader, wapen en kamer zijn: een oude ster in dezelfde
      // groep verdwijnt.
      for (const k of groepVan(kaart).kaarten) if (nieuw[k.id] === 'ja') delete nieuw[k.id]
    }
    if (markering && spel[kaart.id] !== markering) nieuw[kaart.id] = markering
    else delete nieuw[kaart.id]
    // Niet meer weggestreept: dan vervalt ook hoe je het wist.
    const nieuweBron = { ...bron }
    if (nieuw[kaart.id] !== 'nee') delete nieuweBron[kaart.id]
    wijzig({ spel: nieuw, getoond, bron: nieuweBron })
    // Bij een eigen of weggestreepte kaart blijft het venster open, om aan te
    // duiden aan wie ze getoond is of hoe je het weet.
    if (nieuw[kaart.id] !== 'hand' && nieuw[kaart.id] !== 'nee') setGekozen(null)
  }

  const toon = (kaart, spelerId) => {
    const nu = getoond[kaart.id] ?? []
    const anders = nu.includes(spelerId) ? nu.filter((id) => id !== spelerId) : [...nu, spelerId]
    wijzig({ spel, getoond: { ...getoond, [kaart.id]: anders }, bron })
  }

  // Eén bron per kaart; nog eens tikken haalt ze weg.
  const zetBron = (kaart, waarde) => {
    const nieuweBron = { ...bron }
    if (bron[kaart.id] === waarde) delete nieuweBron[kaart.id]
    else nieuweBron[kaart.id] = waarde
    wijzig({ spel, getoond, bron: nieuweBron })
    setGekozen(null)
  }

  const terug = () => {
    if (!vorige.length) return
    setStaat(vorige[vorige.length - 1])
    setVorige((v) => v.slice(0, -1))
  }

  const nieuwSpel = () => {
    wijzig(LEEG_SPEL)
    setVraagNieuw(false)
  }

  const leeg = Object.keys(spel).length === 0 && Object.keys(getoond).length === 0
  const alles = GROEPEN.every((g) => bekijkGroep(g, spel).antwoord)

  return (
    <div className="app">
      <h1 className="verborgen">Cluedo speurkaart</h1>
      <header className="balk">
        <Midden alles={alles} />
        <nav className="knoppen">
          <button type="button" className="rond" onClick={terug} disabled={!vorige.length} aria-label="Terug">
            <Icoon naam="terug" />
          </button>
          <button type="button" className="rond" onClick={() => setToonSpelers(true)} aria-label="Spelers">
            <Icoon naam="spelers" />
          </button>
          <button type="button" className="rond" onClick={() => setVraagNieuw(true)} disabled={leeg} aria-label="Nieuw spel">
            <Icoon naam="nieuw" />
          </button>
        </nav>
      </header>

      {GROEPEN.map((g) => (
        <Groep
          key={g.id}
          groep={g}
          spel={spel}
          kijkersVan={kijkersVan}
          bronVan={bronVan}
          onKies={setGekozen}
        />
      ))}

      <footer className="voet">v{APP_VERSION}</footer>

      {gekozen && (
        <Keuze
          kaart={zoekKaart(gekozen.id)}
          markering={spel[gekozen.id]}
          spelers={spelers}
          getoondAan={getoond[gekozen.id] ?? []}
          bron={bron[gekozen.id]}
          onZet={zet}
          onToon={toon}
          onBron={zetBron}
          onSpelers={() => setToonSpelers(true)}
          onSluit={() => setGekozen(null)}
        />
      )}
      {toonSpelers && (
        <Spelers
          spelers={spelers}
          onVoegToe={(s) => setSpelers((lijst) => [...lijst, s])}
          onWijzig={(id, nieuw) => setSpelers((lijst) => lijst.map((s) => (s.id === id ? { ...s, ...nieuw } : s)))}
          onVerwijder={(id) => setSpelers((lijst) => lijst.filter((s) => s.id !== id))}
          onSluit={() => setToonSpelers(false)}
        />
      )}
      {vraagNieuw && <NieuwSpel onJa={nieuwSpel} onNee={() => setVraagNieuw(false)} />}

      {updateAvailable && (
        <div className="update-toast" role="status">
          <span>Nieuwe versie</span>
          <button type="button" onClick={() => window.location.reload()}>
            Vernieuwen
          </button>
        </div>
      )}
    </div>
  )
}
