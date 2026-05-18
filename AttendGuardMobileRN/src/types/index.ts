export type Role = {
  id: number
  name: string
  display_name?: string
  permissions?: Array<{ id: number; name: string }>
}

export type User = {
  id: number
  name: string
  email: string
  role?: Role
}

export type AuthResponse = {
  success?: boolean
  token: string
  user: User
}

export type AttendanceHistoryItem = {
  id: number
  check_in_time?: string
  check_out_time?: string
  status?: string
  fraud_status?: string
  work_date?: string
  created_at?: string
}

export type ActivityTask = {
  id: number
  title: string
  description?: string | null
  is_completed: boolean
  completed_at?: string | null
}

export type DailyActivity = {
  id: number
  title: string
  description?: string | null
  activity_date: string
  status: 'pending' | 'in_progress' | 'completed' | 'cancelled'
  progress_percentage: number
  total_tasks: number
  completed_tasks: number
  tasks?: ActivityTask[]
}
