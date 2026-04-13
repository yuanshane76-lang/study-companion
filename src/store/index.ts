import { create } from 'zustand'
import * as db from '../services/db'

export type { Subject, Plan, DailyReport, Task, Link, WeeklyReport } from '../services/db'

interface AppState {
  subjects: db.Subject[]
  plans: db.Plan[]
  loading: boolean
  error: string | null

  // Actions
  loadSubjects: () => Promise<void>
  loadPlans: (subjectId?: string) => Promise<void>
  addSubject: (name: string, icon?: string) => Promise<string>
}

export const useAppStore = create<AppState>((set, get) => ({
  subjects: [],
  plans: [],
  loading: false,
  error: null,

  loadSubjects: async () => {
    set({ loading: true, error: null })
    try {
      const subjects = await db.getSubjects()
      set({ subjects, loading: false })
    } catch (e) {
      set({ error: (e as Error).message, loading: false })
    }
  },

  loadPlans: async (subjectId) => {
    set({ loading: true, error: null })
    try {
      const plans = await db.getPlans(subjectId)
      set({ plans, loading: false })
    } catch (e) {
      set({ error: (e as Error).message, loading: false })
    }
  },

  addSubject: async (name, icon) => {
    const id = await db.createSubject(name, icon)
    await get().loadSubjects()
    return id
  },
}))
