import React, { useCallback, useState } from 'react'
import { Alert, Pressable, StyleSheet, Text, View } from 'react-native'
import { useFocusEffect } from '@react-navigation/native'
import { createActivityComment, createActivityTask, getActivity, toggleActivityTask } from '../api/services'
import { Field, PrimaryButton } from '../components/Form'
import Screen, { Card, EmptyState } from '../components/Screen'
import { colors } from '../theme/colors'

const ActivityDetailScreen = ({ route }: any) => {
  const { activityId, title } = route.params
  const [activity, setActivity] = useState<any>(null)
  const [taskTitle, setTaskTitle] = useState('')
  const [comment, setComment] = useState('')
  const [loading, setLoading] = useState(false)

  const load = async () => {
    setLoading(true)
    try {
      setActivity(await getActivity(activityId))
    } finally {
      setLoading(false)
    }
  }

  useFocusEffect(useCallback(() => { load() }, [activityId]))

  const handleToggle = async (task: any) => {
    try {
      await toggleActivityTask(task.id, { is_completed: !task.is_completed })
      load()
    } catch (error: any) {
      Alert.alert('Failed', error.response?.data?.error || 'Unable to update task.')
    }
  }

  const handleComment = async () => {
    if (!comment.trim()) return
    try {
      await createActivityComment(activityId, { message: comment.trim() })
      setComment('')
      load()
    } catch (error: any) {
      Alert.alert('Failed', error.response?.data?.error || 'Unable to add comment.')
    }
  }

  const handleCreateTask = async () => {
    if (!taskTitle.trim()) return
    try {
      await createActivityTask(activityId, { title: taskTitle.trim() })
      setTaskTitle('')
      load()
    } catch (error: any) {
      Alert.alert('Failed', error.response?.data?.error || 'Unable to add task.')
    }
  }

  return (
    <Screen title={activity?.title || title || 'Activity'} subtitle={activity?.activity_date} refreshing={loading} onRefresh={load}>
      {activity ? (
        <>
          <Card>
            <Text style={styles.title}>{activity.status?.replace('_', ' ')}</Text>
            <View style={styles.progressTrack}>
              <View style={[styles.progressFill, { width: `${Math.max(0, Math.min(100, activity.progress_percentage || 0))}%` }]} />
            </View>
            <Text style={styles.text}>{activity.completed_tasks || 0}/{activity.total_tasks || 0} tasks completed</Text>
          </Card>

          <Card>
            <Text style={styles.title}>Checklist</Text>
            <Field label="New task" value={taskTitle} onChangeText={setTaskTitle} />
            <PrimaryButton label="Add Task" onPress={handleCreateTask} />
            {(activity.tasks || []).length === 0 ? (
              <Text style={styles.text}>No checklist item yet.</Text>
            ) : (
              activity.tasks.map((task: any) => (
                <Pressable key={task.id} style={styles.taskRow} onPress={() => handleToggle(task)}>
                  <View style={[styles.checkbox, task.is_completed && styles.checkboxDone]}>
                    <Text style={styles.checkText}>{task.is_completed ? 'X' : ''}</Text>
                  </View>
                  <Text style={[styles.taskText, task.is_completed && styles.taskDone]}>{task.title}</Text>
                </Pressable>
              ))
            )}
          </Card>

          <Card>
            <Text style={styles.title}>Comments</Text>
            <Field label="Message" value={comment} onChangeText={setComment} multiline />
            <PrimaryButton label="Add Comment" onPress={handleComment} />
            {(activity.comments || []).map((item: any) => (
              <View key={item.id} style={styles.commentRow}>
                <Text style={styles.taskText}>{item.message}</Text>
              </View>
            ))}
          </Card>
        </>
      ) : (
        <EmptyState title="Activity not loaded" message="Pull to refresh this activity." />
      )}
    </Screen>
  )
}

const styles = StyleSheet.create({
  title: { color: colors.text, fontSize: 17, fontWeight: '800' },
  text: { color: colors.textMuted, fontSize: 13, marginTop: 8 },
  progressTrack: { backgroundColor: '#0b1220', borderRadius: 999, height: 10, marginTop: 14, overflow: 'hidden' },
  progressFill: { backgroundColor: colors.primary, height: '100%' },
  taskRow: { alignItems: 'center', borderTopColor: colors.border, borderTopWidth: 1, flexDirection: 'row', gap: 12, marginTop: 12, paddingTop: 12 },
  checkbox: { alignItems: 'center', borderColor: colors.border, borderRadius: 8, borderWidth: 1, height: 26, justifyContent: 'center', width: 26 },
  checkboxDone: { backgroundColor: colors.primary, borderColor: colors.primary },
  checkText: { color: '#082f49', fontWeight: '900' },
  taskText: { color: colors.text, flex: 1, fontSize: 14 },
  taskDone: { color: colors.textMuted, textDecorationLine: 'line-through' },
  commentRow: { borderTopColor: colors.border, borderTopWidth: 1, marginTop: 12, paddingTop: 12 },
})

export default ActivityDetailScreen
