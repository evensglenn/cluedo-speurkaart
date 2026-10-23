import { useEffect, useState } from 'react'
import { version as APP_VERSION } from '../package.json'
import { GROEPEN, MARKERINGEN } from './kaarten.js'

const OPSLAG = 'cluedo-speurkaart:spel'
const SPELERS_OPSLAG = 'cluedo-speurkaart:spelers'
const MAX_TERUG = 100

// Elke medespeler krijgt een dier, zodat een kind ze herkent zonder te lezen.
const DIEREN = ['🐻', '🦊', '🐼', '🐸', '🦁', '🐰', '🐯', '🐨', '🐵', '🐶', '🐱', '🦄']

const ALLE_KAARTEN = GROEPEN.flatMap((g) => g.kaarten)
const zoekKaart = (id) => ALLE_KAARTEN.find((k) => k.id === id)
const groepVan = (kaart) => GROEPEN.find((g) => g.kaarten.includes(kaart))

// Een spel bestaat uit de markering per kaart (spel) en, per eigen kaart,
// aan welke spelers ze al getoond is (getoond).
const LEEG_SPEL = { spel: {}, getoond: {} }

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
  if (!bewaard.spel) return { spel: bewaard, getoond: {} }
  return { spel: bewaard.spel, getoond: bewaard.getoond ?? {} }
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

function Kaart({ kaart, markering, antwoord, kijkers, onKies }) {
  const klassen = ['kaart']
  // Zonder ster, maar als enige overgebleven kaart is het toch het antwoord.
  const isAntwoord = antwoord?.id === kaart.id
  if (isAntwoord && !markering) markering = 'ja'
  if (markering) klassen.push(`is-${markering}`)
  else if (antwoord && !isAntwoord) klassen.push('is-uitgesloten')
  return (
    <button type="button" className={klassen.join(' ')} onClick={() => onKies(kaart)} aria-label={kaart.naam}>
      <span className="kaart-beeld" style={tint(kaart)}>
        <Plaatje kaart={kaart} />
      </span>
      <span className="kaart-naam">{kaart.kort}</span>
      <Merk markering={markering} />
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

function Groep({ groep, spel, kijkersVan, onKies }) {
  const { over, antwoord } = bekijkGroep(groep, spel)
  return (
    <section className={`groep groep-${groep.id}`}>
      <h2>
        <span className="label">
          <span aria-hidden="true">{groep.emoji}</span>
          {groep.titel}
        </span>
        <span className="nog" aria-label={`nog ${over.length}`}>
          {over.map((k) => (
            <i key={k.id} />
          ))}
        </span>
      </h2>
      <div className="kaarten">
        {groep.kaarten.map((k) => (
          <Kaart
            key={k.id}
            kaart={k}
            markering={spel[k.id]}
            antwoord={antwoord}
            kijkers={kijkersVan(k)}
            onKies={onKies}
          />
        ))}
      </div>
    </section>
  )
}

// De geheime envelop uit het spel, met een vakje voor wie, waarmee en waar.
function Envelop({ vakjes, alles }) {
  return (
    <div className={`envelop${alles ? ' is-klaar' : ''}`}>
      <div className="klep" aria-hidden="true" />
      <div className="zegel" aria-hidden="true">
        {alles ? '🎉' : '?'}
      </div>
      <div className="vakjes">
        {vakjes.map(({ groep, antwoord }) => (
          <div key={groep.id} className={`vakje vakje-${groep.id}${antwoord ? ' is-gevonden' : ''}`}>
            {antwoord ? (
              <span className="vakje-beeld" style={tint(antwoord)}>
                <Plaatje kaart={antwoord} />
              </span>
            ) : (
              <span className="vakje-leeg" aria-label={groep.titel}>
                <span className="vakje-schim">{groep.emoji}</span>
                <span className="vakje-vraag">?</span>
              </span>
            )}
          </div>
        ))}
      </div>
    </div>
  )
}

function Keuze({ kaart, markering, spelers, getoondAan, onZet, onToon, onSpelers, onSluit }) {
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
                👥 Spelers toevoegen
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

function Spelers({ spelers, onVoegToe, onVerwijder, onSluit }) {
  const vrij = DIEREN.filter((d) => !spelers.some((s) => s.dier === d))
  const [naam, setNaam] = useState('')
  const [dier, setDier] = useState(vrij[0] ?? DIEREN[0])

  const voegToe = (e) => {
    e.preventDefault()
    if (!naam.trim()) return
    onVoegToe({ id: `${Date.now()}`, naam: naam.trim(), dier })
    setNaam('')
    setDier(vrij.find((d) => d !== dier) ?? DIEREN[0])
  }

  return (
    <div className="scherm" onClick={onSluit}>
      <div className="venster venster-spelers" role="dialog" aria-label="Spelers" onClick={(e) => e.stopPropagation()}>
        <button type="button" className="rond sluit" onClick={onSluit} aria-label="Sluiten">
          ✕
        </button>
        <div className="venster-naam">👥 Spelers</div>
        <p className="venster-uitleg">De anderen aan tafel. Ze blijven bewaard, ook bij een nieuw spel.</p>
        {spelers.length > 0 && (
          <ul className="spelers-lijst">
            {spelers.map((s) => (
              <li key={s.id}>
                <span className="dier">{s.dier}</span>
                <span className="speler-naam">{s.naam}</span>
                <button type="button" className="verwijder" onClick={() => onVerwijder(s.id)} aria-label={`${s.naam} verwijderen`}>
                  🗑️
                </button>
              </li>
            ))}
          </ul>
        )}
        <form className="nieuwe-speler" onSubmit={voegToe}>
          <div className="dieren" role="radiogroup" aria-label="Dier">
            {DIEREN.map((d) => (
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
            <button type="submit" className="toevoegen" disabled={!naam.trim()}>
              ＋
            </button>
          </div>
        </form>
      </div>
    </div>
  )
}

function NieuwSpel({ onJa, onNee }) {
  return (
    <div className="scherm" onClick={onNee}>
      <div className="venster venster-klein" role="dialog" aria-label="Nieuw spel?" onClick={(e) => e.stopPropagation()}>
        <div className="vraag-emoji" aria-hidden="true">
          🧹
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
  const { spel, getoond } = staat

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

  const zet = (kaart, markering) => {
    const nieuw = { ...spel }
    if (markering === 'ja') {
      // Er kan maar één dader, wapen en kamer zijn: een oude ster in dezelfde
      // groep verdwijnt.
      for (const k of groepVan(kaart).kaarten) if (nieuw[k.id] === 'ja') delete nieuw[k.id]
    }
    if (markering && spel[kaart.id] !== markering) nieuw[kaart.id] = markering
    else delete nieuw[kaart.id]
    wijzig({ spel: nieuw, getoond })
    // Bij een eigen kaart blijft het venster open, om aan te duiden aan wie
    // ze getoond is.
    if (nieuw[kaart.id] !== 'hand') setGekozen(null)
  }

  const toon = (kaart, spelerId) => {
    const nu = getoond[kaart.id] ?? []
    const anders = nu.includes(spelerId) ? nu.filter((id) => id !== spelerId) : [...nu, spelerId]
    wijzig({ spel, getoond: { ...getoond, [kaart.id]: anders } })
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
  const vakjes = GROEPEN.map((g) => ({ groep: g, ...bekijkGroep(g, spel) }))
  const alles = vakjes.every((v) => v.antwoord)

  return (
    <div className="app">
      <header className="kop">
        {/* Zodra de envelop vol is, maakt de titel plaats voor een feestje. */}
        {alles ? (
          <h1 className="hoera" aria-live="polite">
            🎉 Je weet het!
          </h1>
        ) : (
          <h1>
            <span className="loep" aria-hidden="true">
              🔍
            </span>
            Speurkaart
          </h1>
        )}
        <Envelop vakjes={vakjes} alles={alles} />
        <div className="kop-knoppen">
          <button type="button" className="rond" onClick={terug} disabled={!vorige.length} aria-label="Terug">
            ↩︎
          </button>
          <button type="button" className="rond" onClick={() => setToonSpelers(true)} aria-label="Spelers">
            👥
          </button>
          <button type="button" className="rond" onClick={() => setVraagNieuw(true)} disabled={leeg} aria-label="Nieuw spel">
            🧹
          </button>
        </div>
      </header>

      <main className="groepen">
        {GROEPEN.map((g) => (
          <Groep key={g.id} groep={g} spel={spel} kijkersVan={kijkersVan} onKies={setGekozen} />
        ))}
      </main>

      <footer className="voet">v{APP_VERSION}</footer>

      {gekozen && (
        <Keuze
          kaart={zoekKaart(gekozen.id)}
          markering={spel[gekozen.id]}
          spelers={spelers}
          getoondAan={getoond[gekozen.id] ?? []}
          onZet={zet}
          onToon={toon}
          onSpelers={() => setToonSpelers(true)}
          onSluit={() => setGekozen(null)}
        />
      )}
      {toonSpelers && (
        <Spelers
          spelers={spelers}
          onVoegToe={(s) => setSpelers((lijst) => [...lijst, s])}
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
