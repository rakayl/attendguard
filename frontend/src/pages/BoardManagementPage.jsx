import React, { useEffect, useMemo, useState } from 'react'
import { Link, useNavigate, useSearchParams } from 'react-router-dom'
import { useBoardStore } from '../store/boardStore'
import { useAuthStore } from '../store/authStore'

const BoardModal = ({ workspaceId, onClose, onSave, saving }) => {
  const [form, setForm] = useState({ name: '', description: '', visibility: 'private', theme: 'ocean' })
  const [error, setError] = useState('')

  const submit = async (event) => {
    event.preventDefault()
    setError('')
    try {
      await onSave(workspaceId, form)
      onClose()
    } catch (err) {
      setError(err.message || 'Failed to create board')
    }
  }

  return (
    <ModalShell title="Create Board" subtitle="Create a new kanban board inside the selected workspace." onClose={onClose}>
      <form onSubmit={submit} className="space-y-4 px-5 py-5 sm:px-6">
        {error && <AlertError>{error}</AlertError>}
        <input className="input-field" placeholder="Board name" value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} required />
        <textarea className="input-field min-h-24 resize-y" placeholder="Description" value={form.description} onChange={(e) => setForm({ ...form, description: e.target.value })} />
        <div className="grid gap-4 md:grid-cols-2">
          <select className="input-field" value={form.visibility} onChange={(e) => setForm({ ...form, visibility: e.target.value })}>
            <option value="private">Private</option>
            <option value="public">Public</option>
          </select>
          <select className="input-field" value={form.theme} onChange={(e) => setForm({ ...form, theme: e.target.value })}>
            <option value="ocean">Ocean</option>
            <option value="forest">Forest</option>
            <option value="sunset">Sunset</option>
            <option value="graphite">Graphite</option>
          </select>
        </div>
        <div className="flex flex-col gap-3 sm:flex-row">
          <button type="button" className="btn-secondary flex-1" onClick={onClose}>Cancel</button>
          <button type="submit" className="btn-primary flex-1" disabled={saving}>{saving ? 'Saving...' : 'Create Board'}</button>
        </div>
      </form>
    </ModalShell>
  )
}

const CardModal = ({ listId, card, boardMembers, onClose, onSave, saving }) => {
  const [form, setForm] = useState(card ? {
    title: card.title,
    description: card.description || '',
    markdown_description: card.markdown_description || '',
    priority: card.priority || 'medium',
    due_date: card.due_date ? card.due_date.slice(0, 16) : '',
    cover_image: card.cover_image || '',
    label_names: (card.labels || []).map((label) => label.name).join(', '),
    label_colors: (card.labels || []).map((label) => label.color).join(', '),
    member_ids: (card.members || []).map((member) => member.id),
    is_archived: card.is_archived || false,
  } : {
    title: '',
    description: '',
    markdown_description: '',
    priority: 'medium',
    due_date: '',
    cover_image: '',
    label_names: '',
    label_colors: '',
    member_ids: [],
    is_archived: false,
  })
  const [error, setError] = useState('')

  const submit = async (event) => {
    event.preventDefault()
    setError('')
    try {
      await onSave(card?.id || listId, {
        ...form,
        label_names: splitComma(form.label_names),
        label_colors: splitComma(form.label_colors),
      }, !!card)
      onClose()
    } catch (err) {
      setError(err.message || 'Failed to save card')
    }
  }

  return (
    <ModalShell title={card ? 'Edit Card' : 'Create Card'} subtitle="Capture the task, owner, labels, and delivery date." onClose={onClose}>
      <form onSubmit={submit} className="space-y-4 px-5 py-5 sm:px-6">
        {error && <AlertError>{error}</AlertError>}
        <input className="input-field" placeholder="Card title" value={form.title} onChange={(e) => setForm({ ...form, title: e.target.value })} required />
        <textarea className="input-field min-h-24 resize-y" placeholder="Description" value={form.description} onChange={(e) => setForm({ ...form, description: e.target.value })} />
        <textarea className="input-field min-h-24 resize-y" placeholder="Markdown details" value={form.markdown_description} onChange={(e) => setForm({ ...form, markdown_description: e.target.value })} />
        <div className="grid gap-4 md:grid-cols-2">
          <select className="input-field" value={form.priority} onChange={(e) => setForm({ ...form, priority: e.target.value })}>
            <option value="low">Low</option>
            <option value="medium">Medium</option>
            <option value="high">High</option>
            <option value="urgent">Urgent</option>
          </select>
          <input type="datetime-local" className="input-field" value={form.due_date} onChange={(e) => setForm({ ...form, due_date: e.target.value })} />
        </div>
        <input className="input-field" placeholder="Cover image URL (optional)" value={form.cover_image} onChange={(e) => setForm({ ...form, cover_image: e.target.value })} />
        <div className="grid gap-4 md:grid-cols-2">
          <input className="input-field" placeholder="Labels: Design, API, QA" value={form.label_names} onChange={(e) => setForm({ ...form, label_names: e.target.value })} />
          <input className="input-field" placeholder="Colors: #22c55e, #0ea5e9" value={form.label_colors} onChange={(e) => setForm({ ...form, label_colors: e.target.value })} />
        </div>
        <div className="rounded-2xl border border-slate-800 bg-slate-950/60 p-4">
          <div className="mb-3 text-xs font-mono uppercase tracking-wider text-slate-500">Members</div>
          <div className="grid gap-2 sm:grid-cols-2">
            {boardMembers.map((member) => {
              const checked = form.member_ids.includes(member.id)
              return (
                <label key={member.id} className="flex items-center gap-3 rounded-xl border border-slate-800 px-3 py-2 text-sm text-slate-300">
                  <input
                    type="checkbox"
                    checked={checked}
                    onChange={(e) => setForm({
                      ...form,
                      member_ids: e.target.checked
                        ? [...form.member_ids, member.id]
                        : form.member_ids.filter((id) => id !== member.id),
                    })}
                  />
                  <span>{member.name}</span>
                </label>
              )
            })}
          </div>
        </div>
        <div className="flex flex-col gap-3 sm:flex-row">
          <button type="button" className="btn-secondary flex-1" onClick={onClose}>Cancel</button>
          <button type="submit" className="btn-primary flex-1" disabled={saving}>{saving ? 'Saving...' : 'Save Card'}</button>
        </div>
      </form>
    </ModalShell>
  )
}

const ModalShell = ({ title, subtitle, onClose, children }) => (
  <div className="fixed inset-0 z-50 flex items-end justify-center bg-black/75 p-3 backdrop-blur-sm sm:items-center sm:p-4">
    <div className="card max-h-[92vh] w-full max-w-3xl overflow-y-auto animate-slide-up">
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

const AlertError = ({ children }) => (
  <div className="rounded-xl border border-red-500/20 bg-red-500/10 px-4 py-3 text-sm text-red-400">{children}</div>
)

const priorityStyles = {
  low: 'bg-emerald-500/10 text-emerald-300 border-emerald-500/20',
  medium: 'bg-sky-500/10 text-sky-300 border-sky-500/20',
  high: 'bg-amber-500/10 text-amber-300 border-amber-500/20',
  urgent: 'bg-rose-500/10 text-rose-300 border-rose-500/20',
}

const BoardManagementPage = () => {
  const { user, can } = useAuthStore()
  const navigate = useNavigate()
  const [searchParams] = useSearchParams()
  const teamIdParam = searchParams.get('teamId')
  const workspaceIdParam = Number(searchParams.get('workspaceId') || 0)
  const boardIdParam = Number(searchParams.get('boardId') || 0)

  const {
    workspaces,
    selectedWorkspaceId,
    selectedBoardId,
    board,
    loading,
    saving,
    error,
    search,
    memberFilter,
    dueFilter,
    selectedCardId,
    setSearch,
    setMemberFilter,
    setDueFilter,
    setSelectedWorkspaceId,
    setSelectedCardId,
    clearBoardContext,
    fetchWorkspaces,
    fetchBoard,
    selectBoard,
    createBoard,
    createList,
    createCard,
    updateCard,
    moveCard,
    createChecklist,
    createChecklistItem,
    toggleChecklistItem,
    createComment,
  } = useBoardStore()

  const [boardModal, setBoardModal] = useState(false)
  const [cardModal, setCardModal] = useState(null)
  const [newListName, setNewListName] = useState('')
  const [commentDraft, setCommentDraft] = useState('')
  const [checklistTitle, setChecklistTitle] = useState('')
  const [checklistItemDrafts, setChecklistItemDrafts] = useState({})
  const [draggingCardId, setDraggingCardId] = useState(null)

  const canCreateBoards = can('board:create')
  const canUpdateBoards = can('board:update')
  const canCommentCards = can('board:comment')

  useEffect(() => {
    if (!teamIdParam || !workspaceIdParam) {
      clearBoardContext()
      return
    }
    fetchWorkspaces(teamIdParam, workspaceIdParam, boardIdParam || null).catch(() => {})
  }, [teamIdParam, workspaceIdParam, boardIdParam])

  useEffect(() => {
    if (!selectedBoardId) return
    const interval = window.setInterval(() => {
      fetchBoard(selectedBoardId, false).catch(() => {})
    }, 15000)
    return () => window.clearInterval(interval)
  }, [selectedBoardId])

  const selectedWorkspace = useMemo(
    () => workspaces.find((workspace) => workspace.id === workspaceIdParam) || workspaces.find((workspace) => workspace.id === selectedWorkspaceId) || null,
    [workspaces, workspaceIdParam, selectedWorkspaceId]
  )

  const boards = selectedWorkspace?.boards || []
  const selectedCard = useMemo(() => findSelectedCard(board, selectedCardId), [board, selectedCardId])

  const filteredLists = useMemo(() => {
    const text = search.trim().toLowerCase()
    return (board?.lists || []).map((list) => ({
      ...list,
      cards: (list.cards || []).filter((card) => {
        const matchesSearch = !text || [card.title, card.description, card.markdown_description].filter(Boolean).some((value) => value.toLowerCase().includes(text))
        const matchesMember = !memberFilter || (card.members || []).some((member) => String(member.id) === memberFilter)
        const matchesDue = dueFilter === 'all' || matchDueFilter(card.due_date, dueFilter)
        return matchesSearch && matchesMember && matchesDue
      }),
    }))
  }, [board, search, memberFilter, dueFilter])

  const boardStats = useMemo(() => {
    const cards = (board?.lists || []).flatMap((list) => list.cards || [])
    const dueSoon = cards.filter((card) => matchDueFilter(card.due_date, 'soon')).length
    const done = cards.filter((card) => (card.checklists || []).length && checklistCompletion(card) === 100).length
    return {
      cards: cards.length,
      lists: board?.lists?.length || 0,
      dueSoon,
      done,
    }
  }, [board])

  const boardMembers = board?.members || []

  const handleWorkspaceChange = (nextWorkspaceId) => {
    const nextWorkspace = workspaces.find((workspace) => workspace.id === nextWorkspaceId)
    const nextBoardId = nextWorkspace?.boards?.[0]?.id || ''
    setSelectedWorkspaceId(nextWorkspaceId)
    navigate(`/boards?teamId=${teamIdParam}&workspaceId=${nextWorkspaceId}${nextBoardId ? `&boardId=${nextBoardId}` : ''}`)
    if (nextBoardId) {
      selectBoard(nextBoardId)
    }
  }

  const handleBoardSelect = (nextBoardId) => {
    navigate(`/boards?teamId=${teamIdParam}&workspaceId=${selectedWorkspace?.id}&boardId=${nextBoardId}`)
    selectBoard(nextBoardId)
  }

  const handleCreateList = async () => {
    if (!newListName.trim() || !board?.id) return
    await createList(board.id, { name: newListName.trim() })
    setNewListName('')
  }

  const handleSaveCard = async (targetId, payload, editing) => {
    if (editing) {
      await updateCard(targetId, payload)
      return
    }
    await createCard(targetId, payload)
  }

  const handleDrop = async (event, listId) => {
    event.preventDefault()
    const cardId = Number(event.dataTransfer.getData('text/plain') || draggingCardId)
    if (!cardId) return
    const sourceBoard = board?.lists || []
    const list = sourceBoard.find((entry) => entry.id === listId)
    const position = list?.cards?.length || 0
    setDraggingCardId(null)
    await moveCard(cardId, { list_id: listId, position })
  }

  const handleCreateChecklist = async () => {
    if (!selectedCard || !checklistTitle.trim()) return
    await createChecklist(selectedCard.id, { title: checklistTitle.trim() })
    setChecklistTitle('')
  }

  const handleCreateChecklistItem = async (checklistId) => {
    const title = (checklistItemDrafts[checklistId] || '').trim()
    if (!title) return
    await createChecklistItem(checklistId, { title })
    setChecklistItemDrafts((current) => ({ ...current, [checklistId]: '' }))
  }

  const handleCreateComment = async () => {
    if (!selectedCard || !commentDraft.trim()) return
    await createComment(selectedCard.id, { message: commentDraft.trim() })
    setCommentDraft('')
  }

  if (!teamIdParam || !workspaceIdParam) {
    return (
      <div className="space-y-6 p-4 sm:p-6 lg:p-8">
        <div className="card p-6 sm:p-8">
          <div className="max-w-2xl space-y-3">
            <div className="text-xs font-mono uppercase tracking-widest text-slate-500">Board Access</div>
            <h1 className="font-display text-2xl font-bold text-white">Open boards from Team and Workspace</h1>
            <p className="text-sm text-slate-400">Board tidak bisa diakses langsung dari menu global. Masuk ke Team lalu pilih Workspace untuk membuka board yang Anda miliki aksesnya.</p>
            <div className="flex flex-col gap-3 pt-2 sm:flex-row">
              <Link to="/teams" className="btn-primary text-center text-sm">Go to Teams</Link>
              <Link to="/dashboard" className="btn-secondary text-center text-sm">Back to Dashboard</Link>
            </div>
          </div>
        </div>
      </div>
    )
  }

  if (!loading && !selectedWorkspace) {
    return (
      <div className="space-y-6 p-4 sm:p-6 lg:p-8">
        <div className="card p-6 sm:p-8">
          <div className="max-w-2xl space-y-3">
            <div className="text-xs font-mono uppercase tracking-widest text-slate-500">Unauthorized Workspace</div>
            <h1 className="font-display text-2xl font-bold text-white">Workspace tidak ditemukan atau tidak bisa diakses</h1>
            <p className="text-sm text-slate-400">Pastikan board dibuka dari Team yang benar. Jika Anda baru ditambahkan ke team, refresh lalu buka lagi dari halaman Teams.</p>
            <div className="flex flex-col gap-3 pt-2 sm:flex-row">
              <Link to="/teams" className="btn-primary text-center text-sm">Back to Teams</Link>
              <Link to="/dashboard" className="btn-secondary text-center text-sm">Back to Dashboard</Link>
            </div>
          </div>
        </div>
      </div>
    )
  }

  return (
    <div className="animate-slide-up space-y-6 p-4 sm:p-6 lg:p-8">
      {boardModal && <BoardModal workspaceId={selectedWorkspace?.id} onClose={() => setBoardModal(false)} onSave={createBoard} saving={saving} />}
      {cardModal && <CardModal listId={cardModal.listId} card={cardModal.card} boardMembers={boardMembers} onClose={() => setCardModal(null)} onSave={handleSaveCard} saving={saving} />}

      <div className="flex flex-col gap-4 xl:flex-row xl:items-start xl:justify-between">
        <div>
          <h1 className="font-display text-2xl font-bold text-white">Board Management</h1>
          <p className="mt-1 text-sm text-slate-500">Board dibuka melalui Team dan Workspace agar akses tetap aman dan alur kerja lebih rapi.</p>
        </div>
        <div className="flex flex-wrap gap-2">
          <Link to="/teams" className="btn-secondary text-sm">Back to Teams</Link>
          {canCreateBoards && selectedWorkspace && <button className="btn-primary text-sm" onClick={() => setBoardModal(true)}>+ Board</button>}
        </div>
      </div>

      {error && <AlertError>{error}</AlertError>}

      <div className="grid gap-6 2xl:grid-cols-[300px_minmax(0,1fr)_380px]">
        <aside className="min-w-0 space-y-4">
          <div className="card p-4">
            <div className="mb-3 text-xs font-mono uppercase tracking-widest text-slate-500">Workspace</div>
            <select
              className="input-field"
              value={selectedWorkspace?.id || ''}
              onChange={(e) => handleWorkspaceChange(Number(e.target.value))}
            >
              {workspaces.map((workspace) => (
                <option key={workspace.id} value={workspace.id}>{workspace.name}</option>
              ))}
            </select>
            <div className="mt-4 rounded-2xl border border-slate-800 bg-slate-950/60 p-4">
              <div className="text-sm font-semibold text-slate-100">{selectedWorkspace?.name || 'No workspace yet'}</div>
              <p className="mt-1 text-sm text-slate-500">{selectedWorkspace?.description || 'Select a workspace from your team.'}</p>
            </div>
          </div>

          <div className="card p-4">
            <div className="mb-3 flex items-center justify-between">
              <div className="text-xs font-mono uppercase tracking-widest text-slate-500">Boards</div>
              <div className="text-xs text-slate-500">{boards.length}</div>
            </div>
            <div className="space-y-2">
              {boards.map((entry) => (
                <button
                  key={entry.id}
                  onClick={() => handleBoardSelect(entry.id)}
                  className={`w-full rounded-2xl border p-4 text-left transition-colors ${entry.id === selectedBoardId ? 'border-cyan-500/30 bg-cyan-500/10' : 'border-slate-800 bg-slate-950/60 hover:bg-slate-900/80'}`}
                >
                  <div className="flex items-start justify-between gap-3">
                    <div>
                      <div className="font-semibold text-slate-100">{entry.name}</div>
                      <div className="mt-1 text-xs text-slate-500">{entry.visibility} board</div>
                    </div>
                    {entry.is_favorite && <span className="text-amber-300">*</span>}
                  </div>
                  <p className="mt-2 line-clamp-2 text-sm text-slate-400">{entry.description || 'No description yet.'}</p>
                </button>
              ))}
              {!boards.length && <div className="rounded-2xl border border-dashed border-slate-700 px-4 py-8 text-center text-sm text-slate-500">No boards in this workspace yet.</div>}
            </div>
          </div>
        </aside>

        <section className="min-w-0 space-y-4">
          <div className="card overflow-hidden">
            <div className={`relative p-5 ${themeClass(board?.theme)}`}>
              <div className="absolute inset-0 bg-[radial-gradient(circle_at_top_left,rgba(255,255,255,0.18),transparent_42%)]" />
              <div className="relative flex flex-col gap-4 xl:flex-row xl:items-end xl:justify-between">
                <div className="min-w-0">
                  <div className="text-xs font-mono uppercase tracking-widest text-white/70">{board?.visibility || 'private'} board</div>
                  <h2 className="mt-1 font-display text-2xl font-bold text-white">{board?.name || 'Select a board'}</h2>
                  <p className="mt-2 max-w-3xl text-sm text-white/80">{board?.description || 'Choose a board from the left panel to start managing work.'}</p>
                </div>
                <div className="grid grid-cols-2 gap-3 text-white sm:grid-cols-4">
                  {[
                    ['Cards', boardStats.cards],
                    ['Columns', boardStats.lists],
                    ['Due Soon', boardStats.dueSoon],
                    ['Done', boardStats.done],
                  ].map(([label, value]) => (
                    <div key={label} className="rounded-2xl border border-white/15 bg-black/15 px-4 py-3 backdrop-blur-sm">
                      <div className="font-display text-2xl font-bold">{value}</div>
                      <div className="text-[11px] font-mono uppercase text-white/60">{label}</div>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          </div>

          <div className="card p-4">
            <div className="grid gap-3 xl:grid-cols-[minmax(0,1fr)_220px_220px]">
              <input className="input-field" placeholder="Search cards, description, or notes..." value={search} onChange={(e) => setSearch(e.target.value)} />
              <select className="input-field" value={memberFilter} onChange={(e) => setMemberFilter(e.target.value)}>
                <option value="">All members</option>
                {boardMembers.map((member) => (
                  <option key={member.id} value={member.id}>{member.name}</option>
                ))}
              </select>
              <select className="input-field" value={dueFilter} onChange={(e) => setDueFilter(e.target.value)}>
                <option value="all">All due dates</option>
                <option value="overdue">Overdue</option>
                <option value="today">Due today</option>
                <option value="soon">Due soon</option>
              </select>
            </div>
          </div>

          <div className="flex gap-4 overflow-x-auto pb-2">
            {filteredLists.map((list) => (
              <div
                key={list.id}
                className="card flex w-[300px] flex-shrink-0 flex-col p-4 sm:w-[320px]"
                onDragOver={(event) => event.preventDefault()}
                onDrop={(event) => handleDrop(event, list.id)}
              >
                <div className="mb-4 flex items-center justify-between gap-3">
                  <div className="min-w-0">
                    <div className="font-semibold text-slate-100">{list.name}</div>
                    <div className="text-xs text-slate-500">{list.cards.length} cards</div>
                  </div>
                  {canUpdateBoards && (
                    <button className="rounded-xl bg-slate-800 px-3 py-1.5 text-xs text-slate-300 hover:bg-slate-700" onClick={() => setCardModal({ listId: list.id, card: null })}>
                      + Card
                    </button>
                  )}
                </div>

                <div className="space-y-3">
                  {list.cards.map((card) => {
                    const completion = checklistCompletion(card)
                    return (
                      <button
                        key={card.id}
                        draggable={canUpdateBoards}
                        onDragStart={(event) => {
                          event.dataTransfer.effectAllowed = 'move'
                          event.dataTransfer.setData('text/plain', String(card.id))
                          setDraggingCardId(card.id)
                        }}
                        onDragEnd={() => setDraggingCardId(null)}
                        onClick={() => setSelectedCardId(card.id)}
                        className={`w-full rounded-2xl border p-4 text-left transition-all ${selectedCard?.id === card.id ? 'border-cyan-500/30 bg-cyan-500/10' : 'border-slate-800 bg-slate-950/60 hover:bg-slate-900/80'}`}
                      >
                        {card.cover_image && <div className="mb-3 h-24 w-full overflow-hidden rounded-xl bg-slate-900"><img src={card.cover_image} alt={card.title} className="h-full w-full object-cover" /></div>}
                        <div className="flex items-start justify-between gap-3">
                          <div className="font-medium text-slate-100">{card.title}</div>
                          <span className={`rounded-full border px-2 py-1 text-[10px] font-mono uppercase ${priorityStyles[card.priority] || priorityStyles.medium}`}>{card.priority}</span>
                        </div>
                        <div className="mt-2 line-clamp-3 text-sm text-slate-400">{card.description || card.markdown_description || 'No description yet.'}</div>
                        {!!card.labels?.length && (
                          <div className="mt-3 flex flex-wrap gap-2">
                            {card.labels.map((label) => (
                              <span key={label.id} className="rounded-full px-2.5 py-1 text-[10px] font-mono uppercase text-white" style={{ backgroundColor: label.color }}>
                                {label.name}
                              </span>
                            ))}
                          </div>
                        )}
                        <div className="mt-4 space-y-2">
                          <div className="flex items-center justify-between text-[11px] font-mono uppercase text-slate-500">
                            <span>Checklist</span>
                            <span>{completion}%</span>
                          </div>
                          <div className="h-2 overflow-hidden rounded-full bg-slate-800">
                            <div className="h-full bg-cyan-400 transition-all" style={{ width: `${completion}%` }} />
                          </div>
                        </div>
                        <div className="mt-4 flex items-center justify-between gap-3 text-xs text-slate-500">
                          <span>{card.comments?.length || 0} comments</span>
                          <span>{card.due_date ? formatShortDate(card.due_date) : 'No due date'}</span>
                        </div>
                      </button>
                    )
                  })}
                  {!list.cards.length && <div className="rounded-2xl border border-dashed border-slate-700 px-4 py-8 text-center text-sm text-slate-500">Drop card here.</div>}
                </div>
              </div>
            ))}

            {board?.id && canUpdateBoards && (
              <div className="card flex w-[280px] flex-shrink-0 flex-col p-4">
                <div className="mb-3 text-sm font-semibold text-slate-200">Add New Column</div>
                <input className="input-field" placeholder="List name" value={newListName} onChange={(e) => setNewListName(e.target.value)} />
                <button className="btn-primary mt-3 text-sm" onClick={handleCreateList} disabled={!newListName.trim() || saving}>Create List</button>
              </div>
            )}
          </div>
        </section>

        <aside className="min-w-0 space-y-4">
          <div className="card p-5">
            <div className="mb-4 flex items-start justify-between gap-3">
              <div className="min-w-0">
                <div className="text-xs font-mono uppercase tracking-widest text-slate-500">Card Detail</div>
                <div className="mt-1 font-display text-lg font-semibold text-white">{selectedCard?.title || 'Choose a card'}</div>
              </div>
              {selectedCard && canUpdateBoards && <button className="btn-secondary px-3 py-1.5 text-xs" onClick={() => setCardModal({ listId: selectedCard.list_id, card: selectedCard })}>Edit</button>}
            </div>

            {!selectedCard ? (
              <div className="text-sm text-slate-500">Pick a card to inspect details, update checklist, and write comments.</div>
            ) : (
              <div className="space-y-4">
                <div className="flex flex-wrap gap-2">
                  {(selectedCard.members || []).map((member) => (
                    <span key={member.id} className="rounded-full border border-slate-700 bg-slate-800 px-3 py-1 text-xs text-slate-300">{member.name}</span>
                  ))}
                </div>
                <p className="whitespace-pre-wrap text-sm text-slate-300">{selectedCard.description || selectedCard.markdown_description || 'No card detail provided.'}</p>
                {selectedCard.markdown_description && (
                  <div className="rounded-2xl border border-slate-800 bg-slate-950/60 p-4">
                    <div className="mb-2 text-xs font-mono uppercase tracking-widest text-slate-500">Rich Notes</div>
                    <pre className="whitespace-pre-wrap text-sm text-slate-300">{selectedCard.markdown_description}</pre>
                  </div>
                )}
                <div className="grid gap-3 sm:grid-cols-2">
                  <div className="rounded-2xl border border-slate-800 bg-slate-950/60 p-4">
                    <div className="text-[11px] font-mono uppercase text-slate-500">Priority</div>
                    <div className="mt-1 text-sm text-slate-200">{selectedCard.priority}</div>
                  </div>
                  <div className="rounded-2xl border border-slate-800 bg-slate-950/60 p-4">
                    <div className="text-[11px] font-mono uppercase text-slate-500">Due Date</div>
                    <div className="mt-1 text-sm text-slate-200">{selectedCard.due_date ? new Date(selectedCard.due_date).toLocaleString() : 'Not scheduled'}</div>
                  </div>
                </div>
              </div>
            )}
          </div>

          <div className="card p-5">
            <div className="mb-4 flex items-center justify-between">
              <div>
                <div className="text-xs font-mono uppercase tracking-widest text-slate-500">Checklist</div>
                <div className="mt-1 text-sm text-slate-400">Break the card into smaller items and update progress instantly.</div>
              </div>
            </div>
            {!selectedCard ? (
              <div className="text-sm text-slate-500">Select a card first.</div>
            ) : (
              <div className="space-y-4">
                {(selectedCard.checklists || []).map((checklist) => (
                  <div key={checklist.id} className="rounded-2xl border border-slate-800 bg-slate-950/60 p-4">
                    <div className="font-medium text-slate-100">{checklist.title}</div>
                    <div className="mt-3 space-y-2">
                      {(checklist.items || []).map((item) => (
                        <label key={item.id} className="flex items-center gap-3 text-sm text-slate-300">
                          <input type="checkbox" checked={item.is_completed} onChange={() => toggleChecklistItem(item.id, { is_completed: !item.is_completed })} />
                          <span className={item.is_completed ? 'line-through text-slate-500' : ''}>{item.title}</span>
                        </label>
                      ))}
                    </div>
                    {canUpdateBoards && (
                      <div className="mt-3 flex flex-col gap-2 sm:flex-row">
                        <input
                          className="input-field flex-1"
                          placeholder="New checklist item"
                          value={checklistItemDrafts[checklist.id] || ''}
                          onChange={(e) => setChecklistItemDrafts((current) => ({ ...current, [checklist.id]: e.target.value }))}
                        />
                        <button className="btn-secondary px-3 text-xs" onClick={() => handleCreateChecklistItem(checklist.id)}>Add</button>
                      </div>
                    )}
                  </div>
                ))}

                {canUpdateBoards && (
                  <div className="rounded-2xl border border-dashed border-slate-700 p-4">
                    <div className="mb-2 text-sm font-medium text-slate-200">Add checklist</div>
                    <div className="flex flex-col gap-2 sm:flex-row">
                      <input className="input-field flex-1" placeholder="Checklist title" value={checklistTitle} onChange={(e) => setChecklistTitle(e.target.value)} />
                      <button className="btn-primary px-4 text-sm" onClick={handleCreateChecklist} disabled={!checklistTitle.trim()}>Create</button>
                    </div>
                  </div>
                )}
              </div>
            )}
          </div>

          <div className="card p-5">
            <div className="mb-4">
              <div className="text-xs font-mono uppercase tracking-widest text-slate-500">Comments</div>
              <div className="mt-1 text-sm text-slate-400">Realtime-ready discussion panel for the selected card.</div>
            </div>
            {!selectedCard ? (
              <div className="text-sm text-slate-500">Select a card to open comment thread.</div>
            ) : (
              <div className="space-y-4">
                {(selectedCard.comments || []).map((comment) => (
                  <div key={comment.id} className="rounded-2xl border border-slate-800 bg-slate-950/60 p-4">
                    <div className="text-sm font-medium text-slate-100">{comment.user?.name}</div>
                    <div className="mt-1 whitespace-pre-wrap text-sm text-slate-400">{comment.message}</div>
                    <div className="mt-2 text-xs text-slate-500">{comment.user?.name} / {new Date(comment.updated_at || comment.created_at).toLocaleString()}</div>
                  </div>
                ))}
                {canCommentCards && (
                  <div className="rounded-2xl border border-slate-800 bg-slate-950/60 p-4">
                    <textarea className="input-field min-h-24 resize-y" placeholder={`Comment as ${user?.name || 'user'}...`} value={commentDraft} onChange={(e) => setCommentDraft(e.target.value)} />
                    <button className="btn-primary mt-3 w-full text-sm" onClick={handleCreateComment} disabled={!commentDraft.trim() || saving}>Send Comment</button>
                  </div>
                )}
              </div>
            )}
          </div>

          <div className="card p-5">
            <div className="mb-4">
              <div className="text-xs font-mono uppercase tracking-widest text-slate-500">Activity</div>
              <div className="mt-1 text-sm text-slate-400">Latest board history and interaction log.</div>
            </div>
            <div className="space-y-3">
              {(board?.activities || []).map((activity) => (
                <div key={activity.id} className="rounded-2xl border border-slate-800 bg-slate-950/60 p-4">
                  <div className="text-sm font-medium text-slate-100">{activity.description}</div>
                  <div className="mt-1 text-xs text-slate-500">{activity.user?.name} / {new Date(activity.created_at).toLocaleString()}</div>
                </div>
              ))}
              {!board?.activities?.length && <div className="text-sm text-slate-500">No activity logged yet.</div>}
            </div>
          </div>
        </aside>
      </div>

      {loading && <div className="card p-4 text-sm text-slate-400">Loading board data...</div>}
    </div>
  )
}

const splitComma = (value) =>
  value.split(',').map((item) => item.trim()).filter(Boolean)

const findSelectedCard = (board, selectedCardId) =>
  (board?.lists || []).flatMap((list) => list.cards || []).find((card) => card.id === selectedCardId) || null

const checklistCompletion = (card) => {
  const items = (card.checklists || []).flatMap((checklist) => checklist.items || [])
  if (!items.length) return 0
  const completed = items.filter((item) => item.is_completed).length
  return Math.round((completed / items.length) * 100)
}

const matchDueFilter = (dueDate, dueFilter) => {
  if (!dueDate) return dueFilter === 'all'
  const today = new Date()
  today.setHours(0, 0, 0, 0)
  const due = new Date(dueDate)
  const dueStart = new Date(due)
  dueStart.setHours(0, 0, 0, 0)
  if (dueFilter === 'overdue') return dueStart < today
  if (dueFilter === 'today') return dueStart.getTime() === today.getTime()
  if (dueFilter === 'soon') {
    const limit = new Date(today)
    limit.setDate(limit.getDate() + 3)
    return dueStart >= today && dueStart <= limit
  }
  return true
}

const formatShortDate = (value) => new Date(value).toLocaleDateString()

const themeClass = (theme) => {
  switch (theme) {
    case 'forest':
      return 'bg-gradient-to-br from-emerald-700 via-emerald-600 to-lime-500'
    case 'sunset':
      return 'bg-gradient-to-br from-orange-600 via-rose-500 to-fuchsia-500'
    case 'graphite':
      return 'bg-gradient-to-br from-slate-700 via-slate-800 to-slate-950'
    default:
      return 'bg-gradient-to-br from-cyan-700 via-sky-600 to-indigo-600'
  }
}

export default BoardManagementPage
