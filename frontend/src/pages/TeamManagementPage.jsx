import React, { useEffect, useMemo, useState } from 'react'
import { Link } from 'react-router-dom'
import { useTeamStore } from '../store/teamStore'
import { useAuthStore } from '../store/authStore'

const ModalShell = ({ title, subtitle, onClose, children }) => (
  <div className="fixed inset-0 z-50 flex items-end justify-center bg-black/75 p-3 backdrop-blur-sm sm:items-center sm:p-4">
    <div className="card max-h-[92vh] w-full max-w-2xl overflow-y-auto animate-slide-up">
      <div className="flex items-start justify-between border-b border-slate-800 px-5 py-5 sm:px-6">
        <div>
          <h2 className="font-display text-xl font-bold text-white">{title}</h2>
          {subtitle && <p className="mt-1 text-xs text-slate-500">{subtitle}</p>}
        </div>
        <button className="text-2xl leading-none text-slate-500 hover:text-slate-300" onClick={onClose}>x</button>
      </div>
      {children}
    </div>
  </div>
)

const ErrorAlert = ({ children }) => (
  <div className="rounded-xl border border-red-500/20 bg-red-500/10 px-4 py-3 text-sm text-red-400">{children}</div>
)

const TeamFormModal = ({ item, onSave, onClose, saving }) => {
  const [form, setForm] = useState(item ? {
    name: item.name,
    description: item.description || '',
    avatar: item.avatar || '',
  } : {
    name: '',
    description: '',
    avatar: '',
  })
  const [error, setError] = useState('')

  const submit = async (event) => {
    event.preventDefault()
    setError('')
    try {
      await onSave(form)
      onClose()
    } catch (err) {
      setError(err.message || 'Failed to save team')
    }
  }

  return (
    <ModalShell title={item ? 'Team Settings' : 'Create Team'} subtitle="Create a shared container for workspaces and boards." onClose={onClose}>
      <form onSubmit={submit} className="space-y-4 px-5 py-5 sm:px-6">
        {error && <ErrorAlert>{error}</ErrorAlert>}
        <input className="input-field" placeholder="Team name" value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} required />
        <textarea className="input-field min-h-28 resize-y" placeholder="Description" value={form.description} onChange={(e) => setForm({ ...form, description: e.target.value })} />
        <input className="input-field" placeholder="Avatar / logo URL (optional)" value={form.avatar} onChange={(e) => setForm({ ...form, avatar: e.target.value })} />
        <div className="flex flex-col gap-3 sm:flex-row">
          <button type="button" className="btn-secondary flex-1" onClick={onClose}>Cancel</button>
          <button type="submit" className="btn-primary flex-1" disabled={saving}>{saving ? 'Saving...' : 'Save Team'}</button>
        </div>
      </form>
    </ModalShell>
  )
}

const WorkspaceFormModal = ({ onSave, onClose, saving }) => {
  const [form, setForm] = useState({ name: '', description: '' })
  const [error, setError] = useState('')

  const submit = async (event) => {
    event.preventDefault()
    setError('')
    try {
      await onSave(form)
      onClose()
    } catch (err) {
      setError(err.message || 'Failed to create workspace')
    }
  }

  return (
    <ModalShell title="Create Workspace" subtitle="Workspace created here will automatically belong to this team." onClose={onClose}>
      <form onSubmit={submit} className="space-y-4 px-5 py-5 sm:px-6">
        {error && <ErrorAlert>{error}</ErrorAlert>}
        <input className="input-field" placeholder="Workspace name" value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} required />
        <textarea className="input-field min-h-24 resize-y" placeholder="Description" value={form.description} onChange={(e) => setForm({ ...form, description: e.target.value })} />
        <div className="flex flex-col gap-3 sm:flex-row">
          <button type="button" className="btn-secondary flex-1" onClick={onClose}>Cancel</button>
          <button type="submit" className="btn-primary flex-1" disabled={saving}>{saving ? 'Saving...' : 'Create Workspace'}</button>
        </div>
      </form>
    </ModalShell>
  )
}

const TeamManagementPage = () => {
  const { user, can } = useAuthStore()
  const {
    teams,
    selectedTeam,
    loading,
    saving,
    error,
    fetchTeams,
    fetchTeam,
    createTeam,
    updateTeam,
    deleteTeam,
    inviteMember,
    removeMember,
    updateMemberRole,
    createWorkspace,
  } = useTeamStore()

  const [teamModal, setTeamModal] = useState(null)
  const [workspaceModal, setWorkspaceModal] = useState(false)
  const [inviteEmail, setInviteEmail] = useState('')

  useEffect(() => {
    fetchTeams()
  }, [])

  const myTeamMember = useMemo(
    () => selectedTeam?.members?.find((member) => member.user?.id === user?.id) || null,
    [selectedTeam, user?.id]
  )
  const isOwner = myTeamMember?.role === 'owner' || user?.role?.name === 'admin'
  const canCreateTeam = can('team:create')
  const canManageTeam = can('team:update') && isOwner
  const canInvite = can('team:invite') && isOwner

  const totalBoards = useMemo(
    () => (selectedTeam?.workspaces || []).reduce((sum, workspace) => sum + (workspace.boards?.length || 0), 0),
    [selectedTeam]
  )

  const handleInvite = async () => {
    if (!selectedTeam?.id || !inviteEmail.trim()) return
    await inviteMember(selectedTeam.id, { email: inviteEmail.trim() })
    setInviteEmail('')
  }

  const handleDeleteTeam = async () => {
    if (!selectedTeam?.id) return
    if (!window.confirm(`Delete team "${selectedTeam.name}"?`)) return
    await deleteTeam(selectedTeam.id)
  }

  return (
    <div className="animate-slide-up space-y-6 p-4 sm:p-6 lg:p-8">
      {teamModal && (
        <TeamFormModal
          item={teamModal === 'create' ? null : selectedTeam}
          saving={saving}
          onClose={() => setTeamModal(null)}
          onSave={(payload) => teamModal === 'create' ? createTeam(payload) : updateTeam(selectedTeam.id, payload)}
        />
      )}
      {workspaceModal && selectedTeam && (
        <WorkspaceFormModal
          saving={saving}
          onClose={() => setWorkspaceModal(false)}
          onSave={(payload) => createWorkspace(selectedTeam.id, payload)}
        />
      )}

      <div className="flex flex-col gap-4 lg:flex-row lg:items-start lg:justify-between">
        <div>
          <h1 className="font-display text-2xl font-bold text-white">Team Management</h1>
          <p className="mt-1 text-sm text-slate-500">Teams own workspaces and boards, then reuse the existing task and activity flow.</p>
        </div>
        <div className="flex flex-wrap gap-2">
          {canCreateTeam && <button className="btn-primary text-sm" onClick={() => setTeamModal('create')}>+ Create Team</button>}
        </div>
      </div>

      {error && <ErrorAlert>{error}</ErrorAlert>}

      <div className="grid gap-6 xl:grid-cols-[320px_minmax(0,1fr)]">
        <aside className="min-w-0 space-y-4">
          <div className="card p-4">
            <div className="mb-3 flex items-center justify-between">
              <div className="text-xs font-mono uppercase tracking-widest text-slate-500">Teams</div>
              <div className="text-xs text-slate-500">{teams.length}</div>
            </div>
            <div className="space-y-3">
              {teams.map((team) => (
                <button
                  key={team.id}
                  onClick={() => fetchTeam(team.id)}
                  className={`w-full rounded-2xl border p-4 text-left transition-colors ${selectedTeam?.id === team.id ? 'border-cyan-500/30 bg-cyan-500/10' : 'border-slate-800 bg-slate-950/60 hover:bg-slate-900/80'}`}
                >
                  <div className="flex items-start gap-3">
                    <div className="flex h-12 w-12 flex-shrink-0 items-center justify-center overflow-hidden rounded-2xl bg-slate-800 text-lg font-bold text-white">
                      {team.avatar ? <img src={team.avatar} alt={team.name} className="h-full w-full object-cover" /> : (team.name?.[0] || 'T').toUpperCase()}
                    </div>
                    <div className="min-w-0 flex-1">
                      <div className="break-words font-semibold text-slate-100">{team.name}</div>
                      <div className="mt-1 text-xs text-slate-500">{team.member_count} members / {team.workspace_count} workspaces</div>
                      <div className="mt-2 line-clamp-2 text-sm text-slate-400">{team.description || 'No description yet.'}</div>
                    </div>
                  </div>
                </button>
              ))}
              {!teams.length && !loading && <div className="rounded-2xl border border-dashed border-slate-700 px-4 py-8 text-center text-sm text-slate-500">No team found yet.</div>}
            </div>
          </div>
        </aside>

        <section className="min-w-0 space-y-6">
          <div className="card overflow-hidden">
            <div className="bg-gradient-to-br from-cyan-700 via-sky-700 to-indigo-700 p-5">
              <div className="flex flex-col gap-4 xl:flex-row xl:items-end xl:justify-between">
                <div className="flex items-start gap-4">
                  <div className="flex h-16 w-16 flex-shrink-0 items-center justify-center overflow-hidden rounded-3xl bg-white/10 text-2xl font-bold text-white">
                    {selectedTeam?.avatar ? <img src={selectedTeam.avatar} alt={selectedTeam.name} className="h-full w-full object-cover" /> : (selectedTeam?.name?.[0] || 'T').toUpperCase()}
                  </div>
                  <div className="min-w-0">
                    <div className="text-xs font-mono uppercase tracking-widest text-white/70">Team Container</div>
                    <h2 className="mt-1 break-words font-display text-2xl font-bold text-white">{selectedTeam?.name || 'Select a team'}</h2>
                    <p className="mt-2 max-w-3xl text-sm text-white/80">{selectedTeam?.description || 'Choose a team to manage members, workspaces, and boards.'}</p>
                  </div>
                </div>
                {selectedTeam && (
                  <div className="flex flex-wrap gap-2">
                    {canManageTeam && <button className="btn-secondary text-sm" onClick={() => setTeamModal('edit')}>Team Settings</button>}
                    {canManageTeam && <button className="btn-primary text-sm" onClick={() => setWorkspaceModal(true)}>+ Workspace</button>}
                    {canManageTeam && <button className="btn-danger text-sm" onClick={handleDeleteTeam}>Delete Team</button>}
                  </div>
                )}
              </div>
            </div>
          </div>

          <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 xl:grid-cols-4">
            {[
              ['Members', selectedTeam?.members?.length || 0, 'text-cyan-300'],
              ['Workspaces', selectedTeam?.workspaces?.length || 0, 'text-emerald-300'],
              ['Boards', totalBoards, 'text-amber-300'],
              ['Created By', selectedTeam?.creator?.name || '-', 'text-rose-300'],
            ].map(([label, value, color]) => (
              <div key={label} className="card p-4">
                <div className={`break-words font-display text-2xl font-bold ${color}`}>{value}</div>
                <div className="mt-1 text-xs font-mono uppercase text-slate-500">{label}</div>
              </div>
            ))}
          </div>

          <div className="grid gap-6 xl:grid-cols-[minmax(0,1fr)_minmax(0,1fr)]">
            <div className="card p-5">
              <div className="mb-4 flex items-center justify-between">
                <div>
                  <div className="text-xs font-mono uppercase tracking-widest text-slate-500">Members</div>
                  <div className="mt-1 text-sm text-slate-400">Owner can invite member, remove member, and update member role.</div>
                </div>
              </div>

              {selectedTeam ? (
                <div className="space-y-4">
                  {canInvite && (
                    <div className="rounded-2xl border border-slate-800 bg-slate-950/60 p-4">
                      <div className="mb-2 text-sm font-medium text-slate-200">Invite Member</div>
                      <div className="flex flex-col gap-2 sm:flex-row">
                        <input className="input-field flex-1" placeholder="User email" value={inviteEmail} onChange={(e) => setInviteEmail(e.target.value)} />
                        <button className="btn-primary px-4 text-sm sm:min-w-[110px]" onClick={handleInvite} disabled={!inviteEmail.trim() || saving}>Invite</button>
                      </div>
                    </div>
                  )}

                  {(selectedTeam.members || []).map((member) => (
                    <div key={member.id} className="rounded-2xl border border-slate-800 bg-slate-950/60 p-4">
                      <div className="flex flex-col gap-3">
                        <div>
                          <div className="break-words text-sm font-medium text-slate-100">{member.user?.name}</div>
                          <div className="mt-1 break-all text-xs text-slate-500">{member.user?.email}</div>
                          <div className="mt-2 flex flex-wrap gap-2">
                            <span className={`rounded-full border px-3 py-1 text-[10px] font-mono uppercase ${member.role === 'owner' ? 'border-amber-500/20 bg-amber-500/10 text-amber-300' : 'border-slate-700 bg-slate-800 text-slate-300'}`}>{member.role}</span>
                            {member.joined_at && <span className="rounded-full border border-slate-700 bg-slate-800 px-3 py-1 text-[10px] font-mono uppercase text-slate-300">Joined</span>}
                          </div>
                        </div>
                        {canInvite && (
                          <div className="flex flex-col gap-2 sm:flex-row sm:items-center">
                            <select className="input-field sm:min-w-[120px]" value={member.role} onChange={(e) => updateMemberRole(selectedTeam.id, member.id, { role: e.target.value })} disabled={saving}>
                              <option value="owner">Owner</option>
                              <option value="member">Member</option>
                            </select>
                            <button className="btn-danger px-3 py-2 text-xs" onClick={() => removeMember(selectedTeam.id, member.id)} disabled={saving}>Remove</button>
                          </div>
                        )}
                      </div>
                    </div>
                  ))}
                </div>
              ) : (
                <div className="text-sm text-slate-500">Select a team to view members.</div>
              )}
            </div>

            <div className="card p-5">
              <div className="mb-4">
                <div className="text-xs font-mono uppercase tracking-widest text-slate-500">Workspaces & Boards</div>
                <div className="mt-1 text-sm text-slate-400">Team workspaces inherit team context and board access starts from this area.</div>
              </div>

              {selectedTeam ? (
                <div className="space-y-4">
                  {(selectedTeam.workspaces || []).map((workspace) => (
                    <div key={workspace.id} className="rounded-2xl border border-slate-800 bg-slate-950/60 p-4">
                      <div className="flex flex-col gap-3">
                        <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
                          <div className="min-w-0">
                            <div className="break-words text-sm font-semibold text-slate-100">{workspace.name}</div>
                            <div className="mt-1 text-xs text-slate-500">Owner: {workspace.owner?.name}</div>
                            <div className="mt-2 text-sm text-slate-400">{workspace.description || 'No workspace description.'}</div>
                          </div>
                          <div className="flex flex-wrap gap-2">
                            <Link to={`/boards?teamId=${selectedTeam.id}&workspaceId=${workspace.id}`} className="btn-secondary px-3 py-2 text-xs">Open Workspace</Link>
                          </div>
                        </div>
                        <div className="mt-1 grid gap-2">
                          {(workspace.boards || []).map((board) => (
                            <div key={board.id} className="rounded-xl border border-slate-800 px-3 py-3">
                              <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
                                <div className="min-w-0">
                                  <div className="break-words text-sm font-medium text-slate-200">{board.name}</div>
                                  <div className="mt-1 text-xs text-slate-500">{board.visibility} / {board.theme}</div>
                                </div>
                                <Link to={`/boards?teamId=${selectedTeam.id}&workspaceId=${workspace.id}&boardId=${board.id}`} className="font-mono text-xs text-cyan-400 hover:text-cyan-300">Manage</Link>
                              </div>
                            </div>
                          ))}
                          {!workspace.boards?.length && <div className="rounded-xl border border-dashed border-slate-700 px-3 py-5 text-center text-sm text-slate-500">No boards in this workspace yet.</div>}
                        </div>
                      </div>
                    </div>
                  ))}
                  {!selectedTeam.workspaces?.length && <div className="rounded-2xl border border-dashed border-slate-700 px-4 py-8 text-center text-sm text-slate-500">No workspace created for this team yet.</div>}
                </div>
              ) : (
                <div className="text-sm text-slate-500">Select a team to view workspaces and boards.</div>
              )}
            </div>
          </div>
        </section>
      </div>
    </div>
  )
}

export default TeamManagementPage
