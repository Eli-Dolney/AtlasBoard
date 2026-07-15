import { db, type RewardActivity } from './db'
export { DEFAULT_AREAS, ensureLifeHub } from './lifeBootstrap'

export const levelForXp = (xp: number) => Math.floor(Math.sqrt(xp / 100)) + 1
export const levelFloor = (level: number) => (level - 1) ** 2 * 100
export const levelCeiling = (level: number) => level ** 2 * 100

export const ACHIEVEMENTS = [
  { id:'first-step', icon:'🌱', title:'First Step', description:'Complete your first task' },
  { id:'deep-focus', icon:'🍅', title:'Deep Focus', description:'Finish 5 focus sessions' },
  { id:'habit-builder', icon:'🔥', title:'Habit Builder', description:'Check in 7 habits' },
  { id:'balanced-life', icon:'🌈', title:'Balanced Life', description:'Complete tasks in 3 life areas' },
] as const

export async function evaluateAchievements(workspaceId: string) {
  const unlocked:string[]=[]
  const activity=await db.rewardActivities.where('workspaceId').equals(workspaceId).toArray()
  const completedTasks=(await db.tasks.toArray()).filter(t=>t.status==='done')
  const uniqueAreas=new Set(completedTasks.map(t=>t.areaId).filter(Boolean)).size
  const checks=[['first-step',activity.filter(a=>a.sourceType==='task').length,1],['deep-focus',activity.filter(a=>a.sourceType==='focus').length,5],['habit-builder',activity.filter(a=>a.sourceType==='habit').length,7],['balanced-life',uniqueAreas,3]] as const
  for(const [achievementId,progress,target] of checks) if(progress>=target&&!await db.achievementProgress.where('achievementId').equals(achievementId).first()){await db.achievementProgress.add({id:`achievement-${workspaceId}-${achievementId}`,workspaceId,achievementId,progress,unlockedAt:Date.now()});unlocked.push(achievementId)}
  return unlocked
}

export async function awardOnce(workspaceId: string, sourceKey: string, sourceType: RewardActivity['sourceType'], xp: number) {
  const profile = await db.playerProfiles.where('workspaceId').equals(workspaceId).first()
  if (!profile?.rewardsEnabled || await db.rewardActivities.where('sourceKey').equals(sourceKey).first()) return false
  await db.transaction('rw', db.rewardActivities, db.playerProfiles, async () => {
    await db.rewardActivities.add({ id: `reward-${crypto.randomUUID()}`, workspaceId, sourceKey, sourceType, xp, createdAt: Date.now() })
    await db.playerProfiles.update(profile.id, { lifetimeXp: profile.lifetimeXp + xp, updatedAt: Date.now() })
  })
  const achievements=await evaluateAchievements(workspaceId)
  if(typeof window!=='undefined')window.dispatchEvent(new CustomEvent('atlas-reward',{detail:{workspaceId,xp,sourceType,achievements}}))
  return true
}

export async function setTaskCompleted(taskId: string, workspaceId: string, completed: boolean) {
  await db.tasks.update(taskId, { status: completed ? 'done' : 'not-started' })
  if (completed) await awardOnce(workspaceId, `task:${taskId}`, 'task', 20)
}
