import { useEffect, useState } from 'react'
import { version as APP_VERSION } from '../package.json'
import { GROEPEN, MARKERINGEN } from './kaarten.js'

const OPSLAG = 'cluedo-speurkaart:spel'
const MAX_TERUG = 100

const ALLE_KAARTEN = GROEPEN.flatMap((g) => g.kaarten)
const zoekKaart = (id) => ALLE_KAARTEN.find((k) => k.id === id)
const groepVan = (kaart) => GROEPEN.find((g) => g.kaarten.includes(kaart))

function laadSpel() {
  try {
    const bewaard = JSON.parse(localStorage.getItem(OPSLAG))
    if (bewaard && typeof bewaard === 'object') return bewaard
  } catch (e) {}
  return {}
}

function bewaarSpel(spel) {
  try {
    localStorage.setItem(OPSLAG, JSON.stringify(spel))
  } catch (e) {}
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

function Kaart({ kaart, markering, antwoord, onKies }) {
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
    </button>
  )
}

function Groep({ groep, spel, onKies }) {
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
          <Kaart key={k.id} kaart={k} markering={spel[k.id]} antwoord={antwoord} onKies={onKies} />
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

function Keuze({ kaart, markering, onZet, onSluit }) {
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
        {markering && (
          <button type="button" className="wis" onClick={() => onZet(kaart, null)}>
            🧽 Leeg maken
          </button>
        )}
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
  const [spel, setSpel] = useState(laadSpel)
  const [vorige, setVorige] = useState([])
  const [gekozen, setGekozen] = useState(null)
  const [vraagNieuw, setVraagNieuw] = useState(false)
  const [updateAvailable, setUpdateAvailable] = useState(false)

  useEffect(() => bewaarSpel(spel), [spel])

  useEffect(() => {
    const onUpdate = () => setUpdateAvailable(true)
    window.addEventListener('speurkaart:update-available', onUpdate)
    return () => window.removeEventListener('speurkaart:update-available', onUpdate)
  }, [])

  const wijzig = (nieuw) => {
    setVorige((v) => [...v, spel].slice(-MAX_TERUG))
    setSpel(nieuw)
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
    wijzig(nieuw)
    setGekozen(null)
  }

  const terug = () => {
    if (!vorige.length) return
    setSpel(vorige[vorige.length - 1])
    setVorige((v) => v.slice(0, -1))
  }

  const nieuwSpel = () => {
    wijzig({})
    setVraagNieuw(false)
  }

  const leeg = Object.keys(spel).length === 0
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
          <button type="button" className="rond" onClick={() => setVraagNieuw(true)} disabled={leeg} aria-label="Nieuw spel">
            🧹
          </button>
        </div>
      </header>

      <main className="groepen">
        {GROEPEN.map((g) => (
          <Groep key={g.id} groep={g} spel={spel} onKies={setGekozen} />
        ))}
      </main>

      <footer className="voet">v{APP_VERSION}</footer>

      {gekozen && (
        <Keuze kaart={zoekKaart(gekozen.id)} markering={spel[gekozen.id]} onZet={zet} onSluit={() => setGekozen(null)} />
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
