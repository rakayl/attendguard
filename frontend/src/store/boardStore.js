import { create } from 'zustand'
import {
  createBoard,
  createBoardCard,
  createBoardComment,
  createBoardList,
  createCardChecklist,
  createChecklistItem,
  createWorkspace,
  getBoard,
  getTeamWorkspaces,
  getWorkspaces,
  moveBoardCard,
  toggleChecklistItem,
  updateBoard,
  updateBoardCard,
} from '../api/services'

const normalizeResponseError = (err, fallback) =>
  err?.response?.data?.error || err?.response?.data?.message || err?.message || fallback

export const useBoardStore = create((set, get) => ({
  workspaces: [],
  selectedWorkspaceId: null,
  selectedBoardId: null,
  board: null,
  loading: false,
  saving: false,
  error: '',
  search: '',
  memberFilter: '',
  dueFilter: 'all',
  selectedCardId: null,
  currentTeamId: null,

  setSearch: (search) => set({ search }),
  setMemberFilter: (memberFilter) => set({ memberFilter }),
  setDueFilter: (dueFilter) => set({ dueFilter }),
  setSelectedWorkspaceId: (selectedWorkspaceId) => set({ selectedWorkspaceId }),
  setSelectedCardId: (selectedCardId) => set({ selectedCardId }),
  clearBoardContext: () => set({
    workspaces: [],
    selectedWorkspaceId: null,
    selectedBoardId: null,
    board: null,
    loading: false,
    error: '',
    selectedCardId: null,
    currentTeamId: null,
  }),

  fetchWorkspaces: async (teamId = null, preferredWorkspaceId = null, preferredBoardId = null) => {
    set({ loading: true, error: '' })
    try {
      const res = teamId ? await getTeamWorkspaces(teamId) : await getWorkspaces()
      const workspaces = teamId ? (res.data?.data?.workspaces || []) : (res.data?.data?.workspaces || [])
      const fallbackWorkspaceId = workspaces[0]?.id || null
      const nextWorkspaceId = preferredWorkspaceId || get().selectedWorkspaceId || fallbackWorkspaceId
      const workspaceMatch = workspaces.find((workspace) => workspace.id === nextWorkspaceId) || workspaces[0] || null
      const fallbackBoardId = workspaceMatch?.boards?.[0]?.id || null
      const nextBoardId = preferredBoardId || get().selectedBoardId || fallbackBoardId
      set({
        workspaces,
        selectedWorkspaceId: workspaceMatch?.id || null,
        selectedBoardId: nextBoardId,
        currentTeamId: teamId,
        loading: false,
      })
      if (nextBoardId) {
        await get().fetchBoard(nextBoardId, false)
      } else {
        set({ board: null, selectedCardId: null })
      }
    } catch (err) {
      set({ loading: false, error: normalizeResponseError(err, 'Failed to load workspaces') })
      throw err
    }
  },

  fetchBoard: async (boardId, withLoading = true) => {
    if (!boardId) {
      set({ board: null, selectedBoardId: null })
      return
    }
    if (withLoading) set({ loading: true, error: '' })
    try {
      const res = await getBoard(boardId)
      const board = res.data?.data
      set({
        board,
        selectedBoardId: boardId,
        selectedCardId: get().selectedCardId && findCardById(board, get().selectedCardId) ? get().selectedCardId : board?.lists?.[0]?.cards?.[0]?.id || null,
        loading: false,
      })
      return board
    } catch (err) {
      set({ loading: false, error: normalizeResponseError(err, 'Failed to load board') })
      throw err
    }
  },

  selectBoard: async (boardId) => {
    await get().fetchBoard(boardId)
  },

  createWorkspace: async (payload) => {
    set({ saving: true, error: '' })
    try {
      await createWorkspace(payload)
      set({ saving: false })
      await get().fetchWorkspaces()
    } catch (err) {
      set({ saving: false, error: normalizeResponseError(err, 'Failed to create workspace') })
      throw err
    }
  },

  createBoard: async (workspaceId, payload) => {
    set({ saving: true, error: '' })
    try {
      const res = await createBoard(workspaceId, payload)
      const createdBoard = res.data?.data
      set({ saving: false })
      await get().fetchWorkspaces(get().currentTeamId, workspaceId, createdBoard?.id || null)
      if (createdBoard?.id) {
        await get().fetchBoard(createdBoard.id)
      }
    } catch (err) {
      set({ saving: false, error: normalizeResponseError(err, 'Failed to create board') })
      throw err
    }
  },

  updateBoard: async (boardId, payload) => {
    set({ saving: true, error: '' })
    try {
      const res = await updateBoard(boardId, payload)
      set({ board: res.data?.data, saving: false })
      await get().fetchWorkspaces()
    } catch (err) {
      set({ saving: false, error: normalizeResponseError(err, 'Failed to update board') })
      throw err
    }
  },

  createList: async (boardId, payload) => {
    set({ saving: true, error: '' })
    try {
      const res = await createBoardList(boardId, payload)
      set({ board: res.data?.data, saving: false })
      await get().fetchWorkspaces()
    } catch (err) {
      set({ saving: false, error: normalizeResponseError(err, 'Failed to create list') })
      throw err
    }
  },

  createCard: async (listId, payload) => {
    set({ saving: true, error: '' })
    try {
      const res = await createBoardCard(listId, payload)
      set({ board: res.data?.data, saving: false })
    } catch (err) {
      set({ saving: false, error: normalizeResponseError(err, 'Failed to create card') })
      throw err
    }
  },

  updateCard: async (cardId, payload) => {
    set({ saving: true, error: '' })
    try {
      const res = await updateBoardCard(cardId, payload)
      set({ board: res.data?.data, saving: false })
    } catch (err) {
      set({ saving: false, error: normalizeResponseError(err, 'Failed to update card') })
      throw err
    }
  },

  moveCard: async (cardId, payload) => {
    const previous = get().board
    const optimistic = applyCardMove(previous, cardId, payload.list_id, payload.position)
    set({ board: optimistic, error: '' })
    try {
      const res = await moveBoardCard(cardId, payload)
      set({ board: res.data?.data })
    } catch (err) {
      set({ board: previous, error: normalizeResponseError(err, 'Failed to move card') })
      throw err
    }
  },

  createChecklist: async (cardId, payload) => {
    set({ saving: true, error: '' })
    try {
      const res = await createCardChecklist(cardId, payload)
      set({ board: replaceCardInBoard(get().board, res.data?.data), saving: false })
    } catch (err) {
      set({ saving: false, error: normalizeResponseError(err, 'Failed to create checklist') })
      throw err
    }
  },

  createChecklistItem: async (checklistId, payload) => {
    set({ saving: true, error: '' })
    try {
      const res = await createChecklistItem(checklistId, payload)
      set({ board: replaceCardInBoard(get().board, res.data?.data), saving: false })
    } catch (err) {
      set({ saving: false, error: normalizeResponseError(err, 'Failed to create checklist item') })
      throw err
    }
  },

  toggleChecklistItem: async (itemId, payload = {}) => {
    try {
      const res = await toggleChecklistItem(itemId, payload)
      set({ board: replaceCardInBoard(get().board, res.data?.data) })
    } catch (err) {
      set({ error: normalizeResponseError(err, 'Failed to update checklist item') })
      throw err
    }
  },

  createComment: async (cardId, payload) => {
    set({ saving: true, error: '' })
    try {
      const res = await createBoardComment(cardId, payload)
      set({ board: replaceCardInBoard(get().board, res.data?.data), saving: false })
    } catch (err) {
      set({ saving: false, error: normalizeResponseError(err, 'Failed to create comment') })
      throw err
    }
  },
}))

const findCardById = (board, cardId) =>
  board?.lists?.flatMap((list) => list.cards || []).find((card) => card.id === cardId)

const replaceCardInBoard = (board, card) => {
  if (!board || !card) return board
  return {
    ...board,
    lists: (board.lists || []).map((list) => ({
      ...list,
      cards: (list.cards || []).map((entry) => (entry.id === card.id ? { ...card } : entry)),
    })),
  }
}

const applyCardMove = (board, cardId, targetListId, targetPosition = 0) => {
  if (!board) return board
  let movingCard = null
  const lists = (board.lists || []).map((list) => {
    const remaining = []
    for (const card of list.cards || []) {
      if (card.id === cardId) {
        movingCard = { ...card, list_id: targetListId, position: targetPosition }
      } else {
        remaining.push(card)
      }
    }
    return { ...list, cards: remaining.map((card, index) => ({ ...card, position: index })) }
  })
  if (!movingCard) return board
  return {
    ...board,
    lists: lists.map((list) => {
      if (list.id !== targetListId) return list
      const nextCards = [...(list.cards || [])]
      const boundedPosition = Math.max(0, Math.min(targetPosition, nextCards.length))
      nextCards.splice(boundedPosition, 0, movingCard)
      return {
        ...list,
        cards: nextCards.map((card, index) => ({ ...card, position: index, list_id: list.id })),
      }
    }),
  }
}
