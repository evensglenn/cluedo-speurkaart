import { useEffect, useState } from 'react'
import { version as APP_VERSION } from '../package.json'
import { GROEPEN, MARKERINGEN } from './kaarten.js'

const OPSLAG = 'cluedo-speurkaart:spel'
const MAX_TERUG = 100

const ALLE_KAARTEN = GROEPEN.flatMap((g) => g.kaarten)
const zoekKaart = (id) => ALLE_KAARTEN.find((k) => k.id === id)

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

function Pion({ kleur }) {
  return (
    <svg viewBox="0 0 100 100" className="tekening" aria-hidden="true">
      <ellipse cx="50" cy="88" rx="30" ry="8" fill={kleur} stroke="rgba(0,0,0,.45)" strokeWidth="3" />
      <path
        d="M31 86 C35 70 42 60 43 47 L57 47 C58 60 65 70 69 86 Z"
        fill={kleur}
        stroke="rgba(0,0,0,.45)"
        strokeWidth="3"
        strokeLinejoin="round"
      />
      <ellipse cx="50" cy="47" rx="15" ry="5" fill={kleur} stroke="rgba(0,0,0,.45)" strokeWidth="3" />
      <circle cx="50" cy="29" r="14" fill={kleur} stroke="rgba(0,0,0,.45)" strokeWidth="3" />
      <ellipse cx="45" cy="24" rx="4" ry="5" fill="rgba(255,255,255,.55)" />
      <path d="M40 80 C42 70 45 62 46 52" stroke="rgba(255,255,255,.45)" strokeWidth="4" fill="none" strokeLinecap="round" />
    </svg>
  )
}

function Pijp() {
  return (
    <svg viewBox="0 0 100 100" className="tekening" aria-hidden="true">
      <path d="M18 80 L56 42 Q64 34 72 42 L84 54" stroke="#4d555d" strokeWidth="20" fill="none" strokeLinecap="round" strokeLinejoin="round" />
      <path d="M18 80 L56 42 Q64 34 72 42 L84 54" stroke="#9aa3ab" strokeWidth="13" fill="none" strokeLinecap="round" strokeLinejoin="round" />
      <path d="M22 72 L54 40" stroke="#dfe4e8" strokeWidth="4" fill="none" strokeLinecap="round" />
    </svg>
  )
}

function Plaatje({ kaart }) {
  if (kaart.kleur) return <Pion kleur={kaart.kleur} />
  if (kaart.tekening === 'pijp') return <Pijp />
  return (
    <span className="emoji" aria-hidden="true">
      {kaart.emoji}
    </span>
  )
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
      <span className="kaart-beeld">
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
        <span className="groep-emoji" aria-hidden="true">
          {groep.emoji}
        </span>
        {groep.vraag}
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
            onKies={onKies}
          />
        ))}
      </div>
    </section>
  )
}

function Oplossing({ spel }) {
  const vakjes = GROEPEN.map((g) => ({ groep: g, ...bekijkGroep(g, spel) }))
  const alles = vakjes.every((v) => v.antwoord)
  return (
    <div className={`oplossing${alles ? ' is-klaar' : ''}`}>
      {alles && (
        <div className="hoera" aria-live="polite">
          🎉 Je weet het!
        </div>
      )}
      <div className="vakjes">
        {vakjes.map(({ groep, antwoord }) => (
          <div key={groep.id} className={`vakje${antwoord ? ' is-gevonden' : ''}`}>
            {antwoord ? (
              <>
                <span className="vakje-beeld">
                  <Plaatje kaart={antwoord} />
                </span>
                <span className="vakje-naam">{antwoord.kort}</span>
              </>
            ) : (
              <>
                <span className="vakje-vraag" aria-hidden="true">
                  ?
                </span>
                <span className="vakje-naam">{groep.vraag}</span>
              </>
            )}
          </div>
        ))}
      </div>
    </div>
  )
}

function Keuze({ kaart, markering, onZet, onSluit }) {
  return (
    <div className="scherm" onClick={onSluit}>
      <div className="venster" role="dialog" aria-label={kaart.naam} onClick={(e) => e.stopPropagation()}>
        <button type="button" className="sluit" onClick={onSluit} aria-label="Sluiten">
          ✕
        </button>
        <div className="venster-kop">
          <span className="venster-beeld">
            <Plaatje kaart={kaart} />
          </span>
          <div>
            <div className="venster-naam">{kaart.naam}</div>
            <button type="button" className="spreek" onClick={() => spreek(kaart.naam)}>
              🔊 Lees voor
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
        <p className="venster-uitleg">Alle tekens worden gewist.</p>
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
      const groep = GROEPEN.find((g) => g.kaarten.includes(kaart))
      for (const k of groep.kaarten) if (nieuw[k.id] === 'ja') delete nieuw[k.id]
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

  return (
    <div className="app">
      <header className="kop">
        <h1>
          <span aria-hidden="true">🔍</span> Speurkaart
        </h1>
        <Oplossing spel={spel} />
        <div className="kop-knoppen">
          <button type="button" className="kop-knop" onClick={terug} disabled={!vorige.length} aria-label="Terug">
            <span aria-hidden="true">↩️</span>
            <small>Terug</small>
          </button>
          <button type="button" className="kop-knop" onClick={() => setVraagNieuw(true)} disabled={leeg} aria-label="Nieuw spel">
            <span aria-hidden="true">🧹</span>
            <small>Nieuw</small>
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
        <Keuze
          kaart={zoekKaart(gekozen.id)}
          markering={spel[gekozen.id]}
          onZet={zet}
          onSluit={() => setGekozen(null)}
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
