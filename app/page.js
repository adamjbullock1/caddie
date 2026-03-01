'use client'
import { useState, useEffect, useRef, useCallback } from 'react'

// ── STROKES GAINED BASELINES ──────────────────────────────
const SG_BASELINE = {
  tee:      [[100,5.0],[150,4.8],[175,4.6],[200,4.4],[225,4.3],[250,4.15],[275,4.05],[300,3.95],[325,3.88],[350,3.82],[400,3.76],[500,3.70],[600,3.65]],
  approach: [[5,1.05],[10,1.10],[15,1.18],[20,1.26],[25,1.35],[30,1.44],[40,1.55],[50,1.64],[60,1.72],[75,1.82],[100,2.00],[125,2.14],[150,2.28],[175,2.42],[200,2.56],[225,2.68],[250,2.78],[300,2.90]],
  arg:      [[2,1.05],[3,1.08],[4,1.12],[5,1.18],[7,1.28],[10,1.40],[15,1.55],[20,1.65],[25,1.75],[30,1.85]],
  putt:     [[1,1.00],[2,1.01],[3,1.08],[4,1.14],[5,1.20],[6,1.26],[8,1.36],[10,1.46],[12,1.55],[15,1.66],[20,1.80],[25,1.90],[30,1.97],[40,2.05],[50,2.12],[75,2.22],[100,2.30]],
}

function getExpected(table, dist) {
  const rows = SG_BASELINE[table]
  if (dist <= rows[0][0]) return rows[0][1]
  for (let i = 1; i < rows.length; i++) {
    if (dist <= rows[i][0]) {
      const [d0,e0] = rows[i-1], [d1,e1] = rows[i]
      return e0 + ((dist-d0)/(d1-d0)) * (e1-e0)
    }
  }
  return rows[rows.length-1][1]
}

const SHOT_TYPES = [
  {val:'driver',  label:'Driver',    cat:'ott'},
  {val:'3wood',   label:'3 Wood',    cat:'ott'},
  {val:'hybrid',  label:'Hybrid',    cat:'ott'},
  {val:'iron_tee',label:'Iron (Tee)',cat:'ott'},
  {val:'iron',    label:'Iron',      cat:'app'},
  {val:'wedge',   label:'Wedge',     cat:'app'},
  {val:'chip',    label:'Chip',      cat:'arg'},
  {val:'pitch',   label:'Pitch',     cat:'arg'},
  {val:'bunker',  label:'Bunker',    cat:'arg'},
  {val:'putt',    label:'Putt',      cat:'putt'},
]

function calcSG(shots) {
  const sg = {ott:0,app:0,arg:0,putt:0,total:0}
  shots.forEach(s => {
    const typeObj = SHOT_TYPES.find(t => t.val === s.type)
    if (!typeObj) return
    const before = parseFloat(s.distBefore), after = parseFloat(s.distAfter)
    if (isNaN(before) || isNaN(after)) return
    const tableMap = {ott:'tee',app:'approach',arg:'arg',putt:'putt'}
    const table = tableMap[typeObj.cat]
    const db = table==='putt' ? before*3 : before
    const da = table==='putt' ? after*3 : after
    const expB = getExpected(table, db)
    const expA = after===0 ? 0 : getExpected(table, da)
    const shot = expB - expA - 1
    sg[typeObj.cat] += shot
    sg.total += shot
  })
  return sg
}

function fmtSG(v) { return isNaN(v) ? '—' : (v>=0?'+':'')+v.toFixed(2) }
function sgCls(v) { return isNaN(v) ? 'neu' : v>0.05?'pos':v<-0.05?'neg':'neu' }
function scoreToPar(d) { return d===0?'E':d>0?`+${d}`:`${d}` }
function defaultPars(n) { return n===9?[4,3,4,5,4,3,4,5,4]:[4,3,4,5,4,3,4,5,4,4,3,4,5,4,3,4,5,4] }

// ── MAIN COMPONENT ────────────────────────────────────────
export default function App() {
  const [tab, setTab] = useState('scorecard')
  const [rounds, setRounds] = useState([])
  const [activeRound, setActiveRound] = useState(null)
  const [holeData, setHoleData] = useState([])
  const [currentHole, setCurrentHole] = useState(0)
  const [score, setScore] = useState(4)
  const [fir, setFir] = useState(false)
  const [gir, setGir] = useState(false)
  const [putts, setPutts] = useState(2)
  const [penalties, setPenalties] = useState(0)
  const [notes, setNotes] = useState('')
  const [shots, setShots] = useState([])
  const [modal, setModal] = useState(false)
  const [modalStep, setModalStep] = useState('search')
  const [searchQuery, setSearchQuery] = useState('')
  const [searchResults, setSearchResults] = useState([])
  const [searching, setSearching] = useState(false)
  const [searchError, setSearchError] = useState('')
  const [selectedClub, setSelectedClub] = useState(null)
  const [loadedCourse, setLoadedCourse] = useState(null)
  const [selectedTeeIdx, setSelectedTeeIdx] = useState(null)
  const [courseLoading, setCourseLoading] = useState(false)
  const searchTimeout = useRef(null)
  const [roundDetail, setRoundDetail] = useState(null)
  const [editMode, setEditMode] = useState(false)
  const [editScores, setEditScores] = useState([])

  // Load saved rounds on mount
  useEffect(() => {
    const saved = localStorage.getItem('caddie_rounds')
    if (saved) setRounds(JSON.parse(saved))
  }, [])

  // Seed demo data
  useEffect(() => {
    const saved = localStorage.getItem('caddie_rounds')
    if (!saved || JSON.parse(saved).length === 0) {
      const dp = defaultPars(18)
      const demo = [
        {id:1,course:'Torrey Pines (South)',date:'Feb 15, 2026',holes:18,pars:dp,yardages:null,
         holeData:dp.map((p,i)=>({score:p+[1,0,-1,2,0,0,1,0,-1,0,1,0,0,1,-1,0,2,0][i],fir:Math.random()>0.45,gir:Math.random()>0.55,putts:[1,2,2,3,2,2,2,1,2,2,2,2,2,2,1,2,2,2][i],penalties:0,notes:'',shots:[]})),
         totalPar:72},
        {id:2,course:'Torrey Pines (North)',date:'Feb 8, 2026',holes:18,pars:dp,yardages:null,
         holeData:dp.map((p,i)=>({score:p+[0,1,0,1,2,-1,0,1,0,0,-1,1,0,2,0,1,0,1][i],fir:Math.random()>0.4,gir:Math.random()>0.5,putts:[2,2,1,2,3,2,2,2,2,2,2,2,1,2,2,2,2,2][i],penalties:0,notes:'',shots:[]})),
         totalPar:72},
      ]
      demo.forEach(r => r.totalScore = r.holeData.reduce((s,h)=>s+h.score,0))
      setRounds(demo)
      localStorage.setItem('caddie_rounds', JSON.stringify(demo))
    }
  }, [])

  // When switching holes load saved data
  useEffect(() => {
    if (!activeRound) return
    const saved = holeData[currentHole]
    const par = activeRound.pars[currentHole]
    setScore(saved?.score ?? par)
    setFir(saved?.fir ?? false)
    setGir(saved?.gir ?? false)
    setPutts(saved?.putts ?? 2)
    setPenalties(saved?.penalties ?? 0)
    setNotes(saved?.notes ?? '')
    setShots(saved?.shots ?? [])
  }, [currentHole, activeRound])

  const totalToPar = () => {
    if (!activeRound) return 0
    const completedPar = holeData.reduce((s,h,i) => h ? s+activeRound.pars[i] : s, 0)
    const totalScore = holeData.reduce((s,h) => s+(h?.score||0), 0)
    return totalScore - completedPar
  }

  const saveHole = () => {
    const newHoleData = [...holeData]
    newHoleData[currentHole] = {score,fir,gir,putts,penalties,notes,shots}
    setHoleData(newHoleData)
    const total = activeRound.holes
    const nextHole = currentHole < total-1 ? currentHole+1 : currentHole
    if (currentHole < total-1) setCurrentHole(nextHole)
    if (newHoleData.filter(Boolean).length === total) {
      finishRound(newHoleData)
    }
  }

  const exitRound = () => {
    if (!window.confirm('Save this round as unfinished?')) return
    const completedHoleData = holeData.map(h => h || null)
    const holesCompleted = completedHoleData.filter(Boolean).length
    const round = {
      id: Date.now(),
      course: activeRound.course,
      teeName: activeRound.teeName,
      date: activeRound.date,
      holes: activeRound.holes,
      pars: activeRound.pars,
      yardages: activeRound.yardages,
      holeData: completedHoleData,
      totalScore: completedHoleData.reduce((s,h)=>s+(h?.score||0),0),
      totalPar: activeRound.pars.reduce((a,b)=>a+b,0),
      holesCompleted,
      status: 'unfinished',
    }
    const newRounds = [round, ...rounds]
    setRounds(newRounds)
    localStorage.setItem('caddie_rounds', JSON.stringify(newRounds))
    setActiveRound(null)
    setHoleData([])
  }

  const finishRound = (finalHoleData) => {
    const round = {
      id: Date.now(),
      course: activeRound.course,
      teeName: activeRound.teeName,
      date: activeRound.date,
      holes: activeRound.holes,
      pars: activeRound.pars,
      yardages: activeRound.yardages,
      holeData: finalHoleData,
      totalScore: finalHoleData.reduce((s,h)=>s+(h?.score||0),0),
      totalPar: activeRound.pars.reduce((a,b)=>a+b,0),
    }
    const newRounds = [round, ...rounds]
    setRounds(newRounds)
    localStorage.setItem('caddie_rounds', JSON.stringify(newRounds))
    setActiveRound(null)
    setHoleData([])
    alert(`Round complete! ${round.totalScore} (${scoreToPar(round.totalScore-round.totalPar)})`)
  }

  // ── ROUND DETAIL ───────────────────────────────────────
  const openRoundDetail = (r) => { setRoundDetail(r); setEditMode(false); setEditScores([]) }
  const closeRoundDetail = () => { setRoundDetail(null); setEditMode(false); setEditScores([]) }
  const startEditRound = () => {
    setEditScores(roundDetail.holeData.map(h => h?.score ?? null))
    setEditMode(true)
  }
  const saveEditRound = () => {
    const newHoleData = roundDetail.holeData.map((h, i) => ({
      ...(h || { fir:false, gir:false, putts:2, penalties:0, notes:'', shots:[] }),
      score: editScores[i] ?? roundDetail.pars[i]
    }))
    const updated = { ...roundDetail, holeData: newHoleData, totalScore: newHoleData.reduce((s,h)=>s+(h?.score||0),0) }
    const newRounds = rounds.map(r => r.id === updated.id ? updated : r)
    setRounds(newRounds)
    localStorage.setItem('caddie_rounds', JSON.stringify(newRounds))
    setRoundDetail(updated)
    setEditMode(false)
  }
  const deleteRound = (id) => {
    if (!window.confirm('Delete this round?')) return
    const newRounds = rounds.filter(r => r.id !== id)
    setRounds(newRounds)
    localStorage.setItem('caddie_rounds', JSON.stringify(newRounds))
    closeRoundDetail()
  }

  // ── COURSE SEARCH ──────────────────────────────────────
  const doSearch = useCallback(async (q) => {
    if (q.length < 3) return
    setSearching(true)
    setSearchError('')
    setSearchResults([])
    try {
      const res = await fetch(`/api/courses?q=${encodeURIComponent(q)}`)
      const data = await res.json()
      if (!res.ok) throw new Error(data.error || `HTTP ${res.status}`)
      setSearchResults(data.courses?.slice(0,6) || [])
    } catch(e) {
      setSearchError(e.message)
    } finally {
      setSearching(false)
    }
  }, [])

  const handleSearchInput = (val) => {
    setSearchQuery(val)
    clearTimeout(searchTimeout.current)
    searchTimeout.current = setTimeout(() => doSearch(val), 400)
  }

  const selectClub = async (club) => {
    setSelectedClub(club)
    setSelectedTeeIdx(null)
    setLoadedCourse(null)
    setModalStep('tee')
    setCourseLoading(true)
    try {
      const res = await fetch(`/api/course?id=${club.id}`)
      const data = await res.json()
      if (!res.ok) throw new Error(data.error)
      const course = data.course || data
      const seen = new Set()
      const tees = [...(course.tees?.male || []), ...(course.tees?.female || [])]
        .filter(t => {
          const key = t.tee_name?.toLowerCase() || ''
          if (seen.has(key)) return false
          seen.add(key)
          return true
        })
        .sort((a, b) => (b.total_yards || 0) - (a.total_yards || 0))
      setLoadedCourse({ ...course, tees })
    } catch(e) {
      setSearchError(e.message)
    } finally {
      setCourseLoading(false)
    }
  }

  const startRound = () => {
    const hasTees = loadedCourse?.tees?.length > 0
    let pars, yardages, teeName
    if (hasTees && selectedTeeIdx !== null) {
      const tee = loadedCourse.tees[selectedTeeIdx]
      const holes = tee.holes || []
      pars = holes.length ? holes.map(h=>h.par||4) : defaultPars(18)
      yardages = holes.length ? holes.map(h=>h.yardage||null) : null
      teeName = tee.tee_name || tee.name || ''
    } else if (!hasTees) {
      const holesEl = document.getElementById('manual-holes')
      const parEl = document.getElementById('manual-par')
      const numHoles = holesEl ? parseInt(holesEl.value) : 18
      pars = defaultPars(numHoles)
      yardages = null
      teeName = ''
    } else {
      return
    }
    const round = {
      course: selectedClub.club_name || selectedClub.name,
      teeName,
      holes: pars.length,
      pars, yardages,
      date: new Date().toLocaleDateString('en-US',{month:'short',day:'numeric',year:'numeric'})
    }
    setActiveRound(round)
    setHoleData(new Array(pars.length).fill(null))
    setCurrentHole(0)
    setModal(false)
    setModalStep('search')
    setSearchQuery('')
    setSearchResults([])
  }

  const openModal = () => {
    setModal(true)
    setModalStep('search')
    setSearchQuery('')
    setSearchResults([])
    setSearchError('')
    setSelectedClub(null)
    setLoadedCourse(null)
    setSelectedTeeIdx(null)
  }

  // ── SHOT TRACKER ───────────────────────────────────────
  const addShot = () => {
    const prev = shots.length ? shots[shots.length-1] : null
    const guessType = shots.length===0?'driver':shots.length===1?'iron':'putt'
    setShots([...shots, {type:guessType, distBefore:prev?.distAfter||'', distAfter:''}])
  }
  const removeShot = (i) => setShots(shots.filter((_,idx)=>idx!==i))
  const updateShot = (i,field,val) => {
    const updated = [...shots]
    updated[i] = {...updated[i],[field]:val}
    setShots(updated)
  }

  // ── SCORE BADGE ────────────────────────────────────────
  const par = activeRound?.pars[currentHole] || 4
  const diff = score - par
  const badgeText = diff<=-2?(diff===-2?'EAGLE':'ALBATROSS'):diff===-1?'BIRDIE':diff===0?'PAR':diff===1?'BOGEY':diff===2?'DOUBLE':`+${diff}`
  const badgeCls  = diff<=-2?'eagle':diff===-1?'birdie':diff===0?'par-badge':diff===1?'bogey':diff===2?'double':'worse'

  const toPar = totalToPar()

  // ── SG STATS ───────────────────────────────────────────
  const sgStats = () => {
    const allSG = {ott:[],app:[],arg:[],putt:[],total:[]}
    rounds.forEach(r => {
      const rSG = {ott:0,app:0,arg:0,putt:0,total:0}
      let has = false
      r.holeData?.forEach(h => {
        if (!h?.shots?.length) return
        const sg = calcSG(h.shots)
        rSG.ott+=sg.ott; rSG.app+=sg.app; rSG.arg+=sg.arg; rSG.putt+=sg.putt; rSG.total+=sg.total
        has = true
      })
      if (has) { allSG.ott.push(rSG.ott); allSG.app.push(rSG.app); allSG.arg.push(rSG.arg); allSG.putt.push(rSG.putt); allSG.total.push(rSG.total) }
    })
    const avg = arr => arr.length ? arr.reduce((a,b)=>a+b,0)/arr.length : NaN
    return {ott:avg(allSG.ott),app:avg(allSG.app),arg:avg(allSG.arg),putt:avg(allSG.putt),total:avg(allSG.total),count:allSG.total.length}
  }

  const allHoles = rounds.flatMap(r=>r.holeData?.filter(Boolean)||[])
  const avgDiff = rounds.length ? rounds.reduce((s,r)=>s+(r.totalScore-r.totalPar),0)/rounds.length : NaN
  const avgPutts = rounds.length ? rounds.reduce((s,r)=>s+r.holeData.reduce((a,h)=>a+(h?.putts||0),0),0)/rounds.length : NaN
  const firPct = allHoles.length ? allHoles.filter(h=>h.fir).length/allHoles.length*100 : NaN
  const girPct = allHoles.length ? allHoles.filter(h=>h.gir).length/allHoles.length*100 : NaN

  const dist = {eagle:0,birdie:0,par:0,bogey:0,double:0}
  rounds.forEach(r=>r.holeData?.forEach((h,i)=>{
    if(!h)return; const d=h.score-r.pars[i]
    if(d<=-2)dist.eagle++; else if(d===-1)dist.birdie++; else if(d===0)dist.par++; else if(d===1)dist.bogey++; else dist.double++
  }))
  const distTotal = Object.values(dist).reduce((a,b)=>a+b,0)||1
  const sg = sgStats()
  const recent = rounds.slice(0,10).reverse()
  const diffs = recent.map(r=>r.totalScore-r.totalPar)
  const maxAbs = Math.max(...diffs.map(Math.abs),5)

  // ── RENDER ─────────────────────────────────────────────
  return (
    <>
      <nav>
        <div className="logo">CADDIE</div>
        <div className="nav-tabs">
          <button className={`tab-btn${tab==='scorecard'?' active':''}`} onClick={()=>setTab('scorecard')}>SCORECARD</button>
          <button className={`tab-btn${tab==='stats'?' active':''}`} onClick={()=>setTab('stats')}>STATS</button>
        </div>
      </nav>

      {/* ── SCORECARD TAB ── */}
      <div className={`page${tab==='scorecard'?' active':''}`}>
        {!activeRound ? (
          <div className="empty">
            <div className="empty-icon">⛳</div>
            <p>No active round.<br/>Tap <strong style={{color:'var(--green)'}}>+</strong> to start a new round.</p>
          </div>
        ) : (
          <>
            <div className="round-header">
              <div className="round-info">
                <h2>{activeRound.course}</h2>
                <p>{activeRound.date}{activeRound.teeName ? ` · ${activeRound.teeName} tees` : ''}</p>
              </div>
              <div style={{display:'flex',alignItems:'center',gap:10}}>
                <div className="score-summary">
                  <div className={`score-total${toPar>0?' over':toPar===0?' even':''}`}>{scoreToPar(toPar)}</div>
                  <div className="score-label">TO PAR</div>
                </div>
                <button onClick={exitRound} style={{background:'none',border:'1.5px solid var(--border)',borderRadius:8,color:'var(--muted)',fontSize:11,padding:'6px 10px',cursor:'pointer',whiteSpace:'nowrap'}}>Exit</button>
              </div>
            </div>

            {/* HOLE PILLS */}
            <div className="hole-scroll">
              {activeRound.pars.map((p,i) => {
                const h = holeData[i]
                const d = h ? h.score-p : null
                let cls = 'hole-pill'
                if (i===currentHole) cls += ' active'
                if (h) { cls += ' completed'; if(d<=-2)cls+=' eagle'; else if(d===-1)cls+=' birdie'; else if(d===1)cls+=' bogey'; else if(d>=2)cls+=' double' }
                return <button key={i} className={cls} onClick={()=>setCurrentHole(i)}>{i+1}</button>
              })}
            </div>

            {/* HOLE CARD */}
            <div className="hole-card">
              <div className="hole-card-header">
                <div className="hole-num">HOLE {currentHole+1}</div>
                <div className="hole-meta">
                  <div className="hole-par">PAR {par}</div>
                  <div className="hole-yds">{activeRound.yardages?.[currentHole] ? `${activeRound.yardages[currentHole]} yds` : '— yds'}</div>
                </div>
              </div>

              <div className="field-label">SCORE</div>
              <div className="stepper">
                <button className="stepper-btn" onClick={()=>setScore(s=>Math.max(1,s-1))}>−</button>
                <div className="stepper-val">{score} <span className={`score-badge ${badgeCls}`}>{badgeText}</span></div>
                <button className="stepper-btn" onClick={()=>setScore(s=>s+1)}>+</button>
              </div>

              <div className="fields-row">
                <div>
                  <div className="field-label">FAIRWAY IN REG</div>
                  <div className={`toggle-field${fir?' on':''}`} onClick={()=>setFir(f=>!f)}>
                    <span className="toggle-label">{fir?'HIT':'MISS'}</span>
                    <div className="toggle-indicator">{fir?'✓':'✗'}</div>
                  </div>
                </div>
                <div>
                  <div className="field-label">GREEN IN REG</div>
                  <div className={`toggle-field${gir?' on':''}`} onClick={()=>setGir(g=>!g)}>
                    <span className="toggle-label">{gir?'HIT':'MISS'}</span>
                    <div className="toggle-indicator">{gir?'✓':'✗'}</div>
                  </div>
                </div>
              </div>

              <div className="putts-row">
                <div className="putts-label">PUTTS</div>
                <div className="putts-btns">
                  {[1,2,3,4].map(n=><button key={n} className={`putt-btn${putts===n?' active':''}`} onClick={()=>setPutts(n)}>{n}</button>)}
                </div>
              </div>

              <div className="penalty-row">
                <span className="penalty-label">PENALTIES</span>
                <div className="penalty-btns">
                  {[0,1,2].map(n=><button key={n} className={`pen-btn${penalties===n?' active':''}`} onClick={()=>setPenalties(n)}>{n===0?'0':`+${n}`}</button>)}
                </div>
              </div>

              <textarea className="notes-field" placeholder="Shot notes…" value={notes} onChange={e=>setNotes(e.target.value)} />

              {/* SHOT TRACKER */}
              <div className="shot-tracker" style={{marginTop:14}}>
                <div className="shot-tracker-header">
                  <span className="shot-tracker-title">Shots</span>
                  <button className="add-shot-btn" onClick={addShot}>+</button>
                </div>
                <div className="shot-list">
                  {!shots.length ? (
                    <div className="shot-empty">Tap + to log shots for strokes gained</div>
                  ) : shots.map((s,i) => (
                    <div key={i} className="shot-row">
                      <span className="shot-num">{i+1}</span>
                      <select className="shot-select" value={s.type} onChange={e=>updateShot(i,'type',e.target.value)}>
                        {SHOT_TYPES.map(t=><option key={t.val} value={t.val}>{t.label}</option>)}
                      </select>
                      <input className="shot-dist" type="number" placeholder="from" value={s.distBefore} onChange={e=>updateShot(i,'distBefore',e.target.value)} min="0" max="600"/>
                      <input className="shot-dist" type="number" placeholder="to" value={s.distAfter} onChange={e=>updateShot(i,'distAfter',e.target.value)} min="0" max="600"/>
                      <button className="del-shot-btn" onClick={()=>removeShot(i)}>×</button>
                    </div>
                  ))}
                </div>
              </div>

              <button className="save-btn" onClick={saveHole}>SAVE HOLE →</button>
            </div>

            {/* MINI SCORECARD */}
            {holeData.some(Boolean) && (
              <div className="card-section">
                <div className="section-title">Round Scorecard</div>
                <table className="scorecard-table">
                  <thead><tr><th>HOLE</th><th>PAR</th><th>SCORE</th><th>FIR</th><th>GIR</th><th>PUTTS</th><th>PEN</th></tr></thead>
                  <tbody>
                    {holeData.map((h,i) => {
                      if (!h) return null
                      const p=activeRound.pars[i], d=h.score-p
                      const cls=d<=-2?'eagle':d===-1?'birdie':d===1?'bogey':d>=2?'double':''
                      return <tr key={i}><td>{i+1}</td><td>{p}</td><td><span className={`score-cell ${cls}`}>{h.score}</span></td><td>{h.fir?<span className="check">✓</span>:<span className="cross">·</span>}</td><td>{h.gir?<span className="check">✓</span>:<span className="cross">·</span>}</td><td>{h.putts}</td><td>{h.penalties>0?<span style={{color:'var(--red)'}}>+{h.penalties}</span>:'·'}</td></tr>
                    })}
                  </tbody>
                </table>
              </div>
            )}
          </>
        )}
      </div>

      {/* ── STATS TAB ── */}
      <div className={`page${tab==='stats'?' active':''}`}>
        {!rounds.length ? (
          <div className="empty"><div className="empty-icon">📊</div><p>Complete a round to see your stats.</p></div>
        ) : (
          <>
            <div className="stats-grid">
              <div className="stat-card">
                <div className={`stat-val ${isNaN(avgDiff)?'':avgDiff<0?'green':avgDiff>5?'red':'sand'}`}>{isNaN(avgDiff)?'—':(avgDiff>=0?'+':'')+avgDiff.toFixed(1)}</div>
                <div className="stat-sublabel">AVG SCORE TO PAR</div>
              </div>
              <div className="stat-card">
                <div className="stat-val sand">{isNaN(avgPutts)?'—':avgPutts.toFixed(1)}</div>
                <div className="stat-sublabel">AVG PUTTS / ROUND</div>
              </div>
              <div className="stat-card">
                <div className="stat-val">{isNaN(firPct)?'—':Math.round(firPct)+'%'}</div>
                <div className="stat-sublabel">FAIRWAYS IN REG %</div>
              </div>
              <div className="stat-card">
                <div className="stat-val">{isNaN(girPct)?'—':Math.round(girPct)+'%'}</div>
                <div className="stat-sublabel">GREENS IN REG %</div>
              </div>

              {/* SG CARD */}
              {sg.count > 0 && (
                <div className="stat-card wide">
                  <div className="section-title">STROKES GAINED · avg per round · {sg.count} round{sg.count>1?'s':''} tracked</div>
                  {[{k:'ott',l:'Off the Tee'},{k:'app',l:'Approach'},{k:'arg',l:'Around Green'},{k:'putt',l:'Putting'},{k:'total',l:'Total SG'}].map(c=>(
                    <div key={c.k} className="sg-row">
                      <span className="sg-label">{c.l}</span>
                      <span className={`sg-val ${sgCls(sg[c.k])}`}>{fmtSG(sg[c.k])}</span>
                    </div>
                  ))}
                </div>
              )}

              <div className="stat-card wide">
                <div className="section-title">SCORE DISTRIBUTION</div>
                <div className="bar-chart">
                  {[{l:'Eagle/Better',v:dist.eagle,c:'sand'},{l:'Birdie',v:dist.birdie,c:'green'},{l:'Par',v:dist.par,c:'green'},{l:'Bogey',v:dist.bogey,c:'sand'},{l:'Double+',v:dist.double,c:'red'}].map(it=>(
                    <div key={it.l} className="bar-row">
                      <div className="bar-name">{it.l}</div>
                      <div className="bar-track"><div className={`bar-fill ${it.c}`} style={{width:`${Math.round(it.v/distTotal*100)}%`}}>{it.v>0?Math.round(it.v/distTotal*100)+'%':''}</div></div>
                    </div>
                  ))}
                </div>
              </div>

              <div className="stat-card wide">
                <div className="section-title">RECENT ROUNDS</div>
                <div className="trend-chart">
                  {recent.map((r,i)=>{ const d=diffs[i],h=Math.max(4,Math.abs(d)/maxAbs*55),color=d<0?'var(--green)':d>10?'var(--red)':'var(--sand)'; return <div key={i} className="trend-bar" style={{height:h,background:color}}><div className="tip">{r.course}<br/>{scoreToPar(d)}</div></div> })}
                </div>
                <div style={{display:'flex',justifyContent:'space-between',marginTop:6}}>
                  {recent.map((r,i)=><span key={i} style={{fontSize:9,color:'var(--muted)'}}>{r.date.split(',')[0]}</span>)}
                </div>
              </div>
            </div>

            <div className="section-title">ROUND HISTORY</div>
            {rounds.map(r=>{ const d=r.totalScore-r.totalPar; const unfinished=r.status==='unfinished'; return (
              <div key={r.id} className="round-item" style={{cursor:'pointer'}} onClick={()=>openRoundDetail(r)}>
                <div className="round-item-left">
                  <h3>{r.course}{unfinished && <span style={{marginLeft:7,fontSize:10,color:'var(--muted)',fontWeight:400,border:'1px solid var(--border)',borderRadius:4,padding:'1px 5px',verticalAlign:'middle'}}>UNFINISHED</span>}</h3>
                  <p>{r.date} · {unfinished ? `${r.holesCompleted}/${r.holes}` : r.holes} holes · Par {r.totalPar}</p>
                </div>
                <div><div className={`round-score${d>0?' over':''}`}>{r.totalScore}</div><div style={{fontSize:11,color:'var(--muted)',textAlign:'right'}}>{unfinished ? '—' : scoreToPar(d)}</div></div>
              </div>
            )})}
          </>
        )}
      </div>

      {/* ── FAB ── */}
      {tab==='scorecard' && !activeRound && (
        <button className="fab" onClick={openModal}>+</button>
      )}

      {/* ── ROUND DETAIL SHEET ── */}
      {roundDetail && (
        <div className="modal-overlay open" onClick={e=>{if(e.target.className==='modal-overlay open')closeRoundDetail()}}>
          <div className="modal">
            {/* Header */}
            <div style={{display:'flex',justifyContent:'space-between',alignItems:'flex-start',marginBottom:20}}>
              <div style={{flex:1,paddingRight:12}}>
                <h2 style={{fontFamily:'var(--font-display)',fontSize:26,lineHeight:1.1,marginBottom:4}}>{roundDetail.course}</h2>
                <div style={{fontSize:11,color:'var(--muted)'}}>{roundDetail.date}{roundDetail.teeName?` · ${roundDetail.teeName} tees`:''}{roundDetail.status==='unfinished'?` · ${roundDetail.holesCompleted}/${roundDetail.holes} holes`:''}</div>
              </div>
              {(()=>{ const d=roundDetail.totalScore-roundDetail.totalPar; return (
                <div style={{textAlign:'right',flexShrink:0}}>
                  <div style={{fontFamily:'var(--font-display)',fontSize:44,lineHeight:1,color:d>0?'var(--red)':d<0?'var(--green)':'var(--sand)'}}>{roundDetail.status==='unfinished'?roundDetail.totalScore:scoreToPar(d)}</div>
                  <div style={{fontSize:11,color:'var(--muted)'}}>{roundDetail.status==='unfinished'?`${roundDetail.holesCompleted} holes`:`${roundDetail.totalScore} · Par ${roundDetail.totalPar}`}</div>
                </div>
              )})()}
            </div>

            {/* Stats */}
            {(()=>{
              const completed=roundDetail.holeData.filter(Boolean)
              const firElig=completed.filter((_,i)=>roundDetail.pars[i]!==3)
              const firHit=firElig.filter(h=>h.fir).length
              const girHit=completed.filter(h=>h.gir).length
              const totalPutts=completed.reduce((s,h)=>s+(h.putts||0),0)
              const pens=completed.reduce((s,h)=>s+(h.penalties||0),0)
              const eagles=completed.filter((h,i)=>(h.score-roundDetail.pars[i])<=-2).length
              const birdies=completed.filter((h,i)=>(h.score-roundDetail.pars[i])===-1).length
              const bogeys=completed.filter((h,i)=>(h.score-roundDetail.pars[i])===1).length
              const doubles=completed.filter((h,i)=>(h.score-roundDetail.pars[i])>=2).length
              return (<>
                <div style={{display:'grid',gridTemplateColumns:'1fr 1fr 1fr 1fr',gap:8,marginBottom:12}}>
                  {[{label:'FIR',val:firElig.length>0?`${Math.round(firHit/firElig.length*100)}%`:'—'},
                    {label:'GIR',val:completed.length>0?`${Math.round(girHit/completed.length*100)}%`:'—'},
                    {label:'PUTTS',val:completed.length>0?(totalPutts/completed.length).toFixed(1):'—'},
                    {label:'PENS',val:pens}
                  ].map(s=>(
                    <div key={s.label} style={{background:'var(--surface2)',borderRadius:10,padding:'10px 6px',textAlign:'center'}}>
                      <div style={{fontFamily:'var(--font-display)',fontSize:22,color:'var(--white)'}}>{s.val}</div>
                      <div style={{fontSize:9,color:'var(--muted)',letterSpacing:'0.1em',marginTop:2}}>{s.label}</div>
                    </div>
                  ))}
                </div>
                <div style={{display:'flex',gap:6,marginBottom:16,flexWrap:'wrap'}}>
                  {eagles>0&&<span style={{fontSize:11,background:'rgba(255,215,0,0.12)',color:'#ffd700',borderRadius:6,padding:'3px 8px'}}>{eagles} eagle{eagles>1?'s':''}</span>}
                  {birdies>0&&<span style={{fontSize:11,background:'rgba(61,220,104,0.12)',color:'var(--green)',borderRadius:6,padding:'3px 8px'}}>{birdies} birdie{birdies>1?'s':''}</span>}
                  {bogeys>0&&<span style={{fontSize:11,background:'rgba(255,153,85,0.08)',color:'#ff9955',borderRadius:6,padding:'3px 8px'}}>{bogeys} bogey{bogeys>1?'s':''}</span>}
                  {doubles>0&&<span style={{fontSize:11,background:'rgba(255,92,92,0.08)',color:'var(--red)',borderRadius:6,padding:'3px 8px'}}>{doubles} double{doubles>1?'s':''}</span>}
                </div>
              </>)
            })()}

            {/* Scorecard */}
            {!editMode && (<>
              <div className="modal-label">SCORECARD</div>
              <div style={{display:'flex',gap:4,flexWrap:'wrap',marginBottom:20}}>
                {roundDetail.holeData.map((h,i)=>{
                  if(!h) return <div key={i} style={{width:32,height:32,borderRadius:6,background:'var(--surface2)',border:'1px solid var(--border)',display:'flex',alignItems:'center',justifyContent:'center',fontSize:10,color:'var(--muted)'}}>{i+1}</div>
                  const d=h.score-roundDetail.pars[i]
                  const bg=d<=-2?'rgba(255,215,0,0.15)':d===-1?'rgba(61,220,104,0.15)':d===1?'rgba(255,153,85,0.1)':d>=2?'rgba(255,92,92,0.1)':'var(--surface2)'
                  const col=d<=-2?'#ffd700':d===-1?'var(--green)':d===1?'#ff9955':d>=2?'var(--red)':'var(--white)'
                  return <div key={i} style={{width:32,height:32,borderRadius:6,background:bg,border:`1px solid ${col}`,display:'flex',alignItems:'center',justifyContent:'center',fontSize:12,fontWeight:600,color:col}}>{h.score}</div>
                })}
              </div>
            </>)}

            {/* Edit mode */}
            {editMode && (<>
              <div className="modal-label" style={{marginBottom:8}}>EDIT SCORES</div>
              <div style={{display:'flex',flexDirection:'column',gap:6,marginBottom:16,maxHeight:240,overflowY:'auto'}}>
                {editScores.map((s,i)=>(
                  <div key={i} style={{display:'flex',alignItems:'center',justifyContent:'space-between',background:'var(--surface2)',borderRadius:8,padding:'8px 12px'}}>
                    <span style={{fontSize:11,color:'var(--muted)',width:80}}>Hole {i+1} · Par {roundDetail.pars[i]}</span>
                    <div style={{display:'flex',alignItems:'center',gap:14}}>
                      <button onClick={()=>setEditScores(p=>p.map((v,j)=>j===i?Math.max(1,(v??roundDetail.pars[i])-1):v))} style={{background:'var(--border)',border:'none',color:'var(--white)',width:28,height:28,borderRadius:6,cursor:'pointer',fontSize:18,lineHeight:1}}>−</button>
                      <span style={{fontFamily:'var(--font-display)',fontSize:24,minWidth:20,textAlign:'center'}}>{s??'—'}</span>
                      <button onClick={()=>setEditScores(p=>p.map((v,j)=>j===i?(v??roundDetail.pars[i])+1:v))} style={{background:'var(--border)',border:'none',color:'var(--white)',width:28,height:28,borderRadius:6,cursor:'pointer',fontSize:18,lineHeight:1}}>+</button>
                    </div>
                  </div>
                ))}
              </div>
            </>)}

            {/* Actions */}
            <div className="modal-actions">
              {!editMode ? (<>
                <button className="btn-cancel" onClick={closeRoundDetail}>Close</button>
                <button className="btn-cancel" style={{color:'var(--white)'}} onClick={startEditRound}>Edit</button>
                <button onClick={()=>deleteRound(roundDetail.id)} style={{flex:1,background:'rgba(255,92,92,0.08)',border:'1px solid var(--red)',borderRadius:10,padding:14,color:'var(--red)',fontFamily:'var(--font-mono)',fontSize:13,cursor:'pointer'}}>Delete</button>
              </>) : (<>
                <button className="btn-cancel" onClick={()=>setEditMode(false)}>Cancel</button>
                <button className="btn-start" onClick={saveEditRound}>Save</button>
              </>)}
            </div>
          </div>
        </div>
      )}

      {/* ── MODAL ── */}
      {modal && (
        <div className="modal-overlay open" onClick={e=>{ if(e.target.className==='modal-overlay open'){setModal(false)} }}>
          <div className="modal">
            <h2>NEW ROUND</h2>

            {modalStep==='search' && (
              <>
                <div className="modal-label">SEARCH COURSE</div>
                <input className="modal-input" placeholder="Course name or city, e.g. Pebble Beach" value={searchQuery} onChange={e=>handleSearchInput(e.target.value)} autoFocus />
                {searching && <div style={{fontSize:12,color:'var(--muted)',padding:'8px 0'}}>Searching…</div>}
                {searchError && <div style={{fontSize:12,color:'var(--red)',padding:'8px 0'}}>Error: {searchError}</div>}
                {!searching && searchQuery.length > 1 && searchResults.length === 0 && !searchError && <div style={{fontSize:12,color:'var(--muted)',padding:'8px 0'}}>No courses found.</div>}
                {searchResults.length > 0 && (
                  <div className="search-results" style={{display:'block'}}>
                    {searchResults.map(c=>(
                      <div key={c.id} className="search-result-item" onClick={()=>selectClub(c)}>
                        <h4>{c.club_name}</h4>
                        <p>{[c.location?.city,c.location?.state].filter(Boolean).join(', ')}{c.location?.country?` · ${c.location.country}`:''}</p>
                      </div>
                    ))}
                  </div>
                )}
                <div className="modal-actions">
                  <button className="btn-cancel" onClick={()=>setModal(false)}>Cancel</button>
                </div>
              </>
            )}

            {modalStep==='tee' && (
              <>
                <div style={{display:'flex',alignItems:'center',gap:10,marginBottom:16}}>
                  <button onClick={()=>setModalStep('search')} style={{background:'none',border:'none',color:'var(--muted)',fontSize:20,cursor:'pointer'}}>←</button>
                  <div>
                    <div style={{fontSize:15,fontWeight:600}}>{selectedClub?.club_name}</div>
                    <div style={{fontSize:11,color:'var(--muted)'}}>{[selectedClub?.location?.city,selectedClub?.location?.state].filter(Boolean).join(', ')}</div>
                  </div>
                </div>
                <div className="modal-label">SELECT TEES</div>
                {courseLoading && <div style={{fontSize:12,color:'var(--muted)',padding:'12px 0'}}>Loading course data…</div>}
                {!courseLoading && loadedCourse?.tees?.length > 0 && (
                  <div className="tee-list">
                    {loadedCourse.tees.map((t,i)=>{
                      const yds=t.holes?t.holes.reduce((s,h)=>s+(h.yardage||0),0):(t.total_yards||'—')
                      const par=t.holes?t.holes.reduce((s,h)=>s+(h.par||0),0):(t.par_total||'—')
                      return (
                        <div key={i} className={`tee-item${selectedTeeIdx===i?' selected':''}`} onClick={()=>setSelectedTeeIdx(i)}>
                          <div><h4>{t.tee_name||t.name||`Tee ${i+1}`}</h4><p>{yds} yds · Par {par}</p></div>
                          <div className="tee-item-right">{t.course_rating?`${t.course_rating} / ${t.slope_rating}`:''}</div>
                        </div>
                      )
                    })}
                  </div>
                )}
                {!courseLoading && loadedCourse && (!loadedCourse.tees || loadedCourse.tees.length === 0) && (
                  <div style={{marginBottom:12}}>
                    <div style={{fontSize:11,color:'var(--muted)',marginBottom:12}}>No tee data found — enter manually:</div>
                    <div style={{display:'grid',gridTemplateColumns:'1fr 1fr',gap:10}}>
                      <div>
                        <div className="modal-label">HOLES</div>
                        <select className="modal-input" id="manual-holes" style={{cursor:'pointer'}}>
                          <option value="18">18 Holes</option>
                          <option value="9">9 Holes</option>
                        </select>
                      </div>
                      <div>
                        <div className="modal-label">COURSE PAR</div>
                        <input className="modal-input" id="manual-par" type="number" defaultValue="72" min="60" max="75"/>
                      </div>
                    </div>
                  </div>
                )}
                <div className="modal-actions">
                  <button className="btn-cancel" onClick={()=>setModal(false)}>Cancel</button>
                  <button className="btn-start" onClick={startRound} disabled={!courseLoading && loadedCourse?.tees?.length > 0 && selectedTeeIdx===null}>TEE OFF</button>
                </div>
              </>
            )}
          </div>
        </div>
      )}
    </>
  )
}
