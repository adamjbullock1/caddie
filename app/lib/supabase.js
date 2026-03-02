import { createClient } from '@supabase/supabase-js'

console.log('[Supabase] URL:', process.env.NEXT_PUBLIC_SUPABASE_URL)
console.log('[Supabase] Key set:', !!process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY)

export const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL,
  process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY
)

// Convert DB row (snake_case) → app format (camelCase)
export function rowToRound(row) {
  return {
    id: row.id,
    course: row.course,
    teeName: row.tee_name,
    date: row.date,
    holes: row.holes,
    pars: row.pars,
    yardages: row.yardages,
    holeData: row.hole_data,
    totalScore: row.total_score,
    totalPar: row.total_par,
    holesCompleted: row.holes_completed,
    status: row.status,
  }
}

// Convert app format → DB row (snake_case)
export function roundToRow(round) {
  return {
    id: round.id,
    course: round.course,
    tee_name: round.teeName || null,
    date: round.date,
    holes: round.holes,
    pars: round.pars,
    yardages: round.yardages || null,
    hole_data: round.holeData,
    total_score: round.totalScore,
    total_par: round.totalPar,
    holes_completed: round.holesCompleted || null,
    status: round.status || null,
  }
}
