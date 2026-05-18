import React, { useCallback, useState } from 'react'
import { Alert, Pressable, StyleSheet, Text, View } from 'react-native'
import { useFocusEffect } from '@react-navigation/native'
import { createBoardCard, createBoardComment, createBoardList, createCardChecklist, createChecklistItem, getBoard, moveBoardCard, toggleChecklistItem } from '../api/services'
import { Field, PrimaryButton, SecondaryButton } from '../components/Form'
import Screen, { Card, EmptyState } from '../components/Screen'
import { colors } from '../theme/colors'

const BoardDetailScreen = ({ route }: any) => {
  const { boardId, boardName } = route.params
  const [board, setBoard] = useState<any>(null)
  const [selectedCard, setSelectedCard] = useState<any>(null)
  const [listName, setListName] = useState('')
  const [cardTitleByList, setCardTitleByList] = useState<Record<number, string>>({})
  const [comment, setComment] = useState('')
  const [checklistTitle, setChecklistTitle] = useState('')
  const [itemTitleByChecklist, setItemTitleByChecklist] = useState<Record<number, string>>({})
  const [loading, setLoading] = useState(false)

  const load = async () => {
    setLoading(true)
    try {
      const freshBoard = await getBoard(boardId)
      setBoard(freshBoard)
      if (selectedCard?.id) {
        const freshCard = (freshBoard?.lists || []).flatMap((list: any) => list.cards || []).find((card: any) => card.id === selectedCard.id)
        setSelectedCard(freshCard || null)
      }
    } finally {
      setLoading(false)
    }
  }

  useFocusEffect(useCallback(() => { load() }, [boardId]))

  const lists = board?.lists || []

  const handleCreateList = async () => {
    if (!listName.trim()) return
    try {
      await createBoardList(boardId, { name: listName.trim() })
      setListName('')
      load()
    } catch (error: any) {
      Alert.alert('Failed', error.response?.data?.error || 'Unable to create list.')
    }
  }

  const handleCreateCard = async (listId: number) => {
    const title = cardTitleByList[listId]?.trim()
    if (!title) return
    try {
      await createBoardCard(listId, { title })
      setCardTitleByList((current) => ({ ...current, [listId]: '' }))
      load()
    } catch (error: any) {
      Alert.alert('Failed', error.response?.data?.error || 'Unable to create card.')
    }
  }

  const handleMoveCard = async (card: any, currentListIndex: number, direction: -1 | 1) => {
    const targetList = lists[currentListIndex + direction]
    if (!targetList) return
    try {
      await moveBoardCard(card.id, { list_id: targetList.id, position: (targetList.cards || []).length })
      load()
    } catch (error: any) {
      Alert.alert('Failed', error.response?.data?.error || 'Unable to move card.')
    }
  }

  const handleComment = async () => {
    if (!selectedCard?.id || !comment.trim()) return
    try {
      await createBoardComment(selectedCard.id, { message: comment.trim() })
      setComment('')
      load()
    } catch (error: any) {
      Alert.alert('Failed', error.response?.data?.error || 'Unable to add comment.')
    }
  }

  const handleCreateChecklist = async () => {
    if (!selectedCard?.id || !checklistTitle.trim()) return
    try {
      await createCardChecklist(selectedCard.id, { title: checklistTitle.trim() })
      setChecklistTitle('')
      load()
    } catch (error: any) {
      Alert.alert('Failed', error.response?.data?.error || 'Unable to create checklist.')
    }
  }

  const handleCreateChecklistItem = async (checklistId: number) => {
    const title = itemTitleByChecklist[checklistId]?.trim()
    if (!title) return
    try {
      await createChecklistItem(checklistId, { title })
      setItemTitleByChecklist((current) => ({ ...current, [checklistId]: '' }))
      load()
    } catch (error: any) {
      Alert.alert('Failed', error.response?.data?.error || 'Unable to add checklist item.')
    }
  }

  return (
    <Screen title={board?.name || boardName || 'Board'} subtitle="Mobile board keeps the same workspace based access flow." refreshing={loading} onRefresh={load}>
      <Card>
        <Text style={styles.title}>Create list</Text>
        <Field label="List name" value={listName} onChangeText={setListName} />
        <PrimaryButton label="Create List" onPress={handleCreateList} />
      </Card>

      {lists.length === 0 ? (
        <EmptyState title="No lists yet" message="Create a list to start organizing cards." />
      ) : (
        lists.map((list: any, listIndex: number) => (
          <Card key={list.id}>
            <Text style={styles.listTitle}>{list.name}</Text>
            <Field
              label="New card title"
              value={cardTitleByList[list.id] || ''}
              onChangeText={(value) => setCardTitleByList((current) => ({ ...current, [list.id]: value }))}
            />
            <SecondaryButton label="Add Card" onPress={() => handleCreateCard(list.id)} />
            {(list.cards || []).map((card: any) => (
              <Pressable key={card.id} style={styles.cardRow} onPress={() => setSelectedCard(card)}>
                <View style={{ flex: 1 }}>
                  <Text style={styles.cardTitle}>{card.title}</Text>
                  {card.description ? <Text style={styles.text}>{card.description}</Text> : null}
                </View>
                <View style={styles.actions}>
                  <Pressable style={styles.actionButton} onPress={() => handleMoveCard(card, listIndex, -1)}>
                    <Text style={styles.actionText}>{'<'}</Text>
                  </Pressable>
                  <Pressable style={styles.actionButton} onPress={() => handleMoveCard(card, listIndex, 1)}>
                    <Text style={styles.actionText}>{'>'}</Text>
                  </Pressable>
                </View>
              </Pressable>
            ))}
          </Card>
        ))
      )}

      {selectedCard ? (
        <Card>
          <Text style={styles.listTitle}>{selectedCard.title}</Text>
          <Field label="Comment" value={comment} onChangeText={setComment} multiline />
          <SecondaryButton label="Add Comment" onPress={handleComment} />
          <Field label="Checklist title" value={checklistTitle} onChangeText={setChecklistTitle} />
          <PrimaryButton label="Create Checklist" onPress={handleCreateChecklist} />
          {(selectedCard.checklists || []).map((checklist: any) => (
            <View key={checklist.id} style={styles.detailBlock}>
              <Text style={styles.cardTitle}>{checklist.title}</Text>
              <Field
                label="New checklist item"
                value={itemTitleByChecklist[checklist.id] || ''}
                onChangeText={(value) => setItemTitleByChecklist((current) => ({ ...current, [checklist.id]: value }))}
              />
              <SecondaryButton label="Add Item" onPress={() => handleCreateChecklistItem(checklist.id)} />
              {(checklist.items || []).map((item: any) => (
                <Pressable key={item.id} style={styles.checkItem} onPress={async () => { await toggleChecklistItem(item.id, { is_completed: !item.is_completed }); load() }}>
                  <Text style={[styles.text, item.is_completed && styles.done]}>{item.is_completed ? '[x]' : '[ ]'} {item.title}</Text>
                </Pressable>
              ))}
            </View>
          ))}
          {(selectedCard.comments || []).map((item: any) => (
            <View key={item.id} style={styles.detailBlock}>
              <Text style={styles.text}>{item.message}</Text>
            </View>
          ))}
        </Card>
      ) : null}
    </Screen>
  )
}

const styles = StyleSheet.create({
  title: { color: colors.text, fontSize: 17, fontWeight: '800' },
  listTitle: { color: colors.primary, fontSize: 18, fontWeight: '800' },
  cardRow: { alignItems: 'center', borderTopColor: colors.border, borderTopWidth: 1, flexDirection: 'row', gap: 12, marginTop: 14, paddingTop: 14 },
  cardTitle: { color: colors.text, fontSize: 15, fontWeight: '700' },
  text: { color: colors.textMuted, fontSize: 12, marginTop: 4 },
  actions: { flexDirection: 'row', gap: 8 },
  actionButton: { alignItems: 'center', backgroundColor: colors.surfaceElevated, borderRadius: 12, height: 36, justifyContent: 'center', width: 36 },
  actionText: { color: colors.text, fontSize: 22, fontWeight: '800' },
  detailBlock: { borderTopColor: colors.border, borderTopWidth: 1, marginTop: 14, paddingTop: 14 },
  checkItem: { paddingVertical: 8 },
  done: { color: colors.textMuted, textDecorationLine: 'line-through' },
})

export default BoardDetailScreen
