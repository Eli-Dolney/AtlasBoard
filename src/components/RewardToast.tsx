import { useEffect, useState } from 'react'
import { useLiveQuery } from 'dexie-react-hooks'
import { db } from '../lib/db'
import { ACHIEVEMENTS } from '../lib/life'

type RewardNotice={workspaceId:string;xp:number;sourceType:string;achievements:string[]}

export default function RewardToast({workspaceId}:{workspaceId:string}){
  const profile=useLiveQuery(()=>db.playerProfiles.where('workspaceId').equals(workspaceId).first(),[workspaceId])
  const [notice,setNotice]=useState<RewardNotice|null>(null)
  useEffect(()=>{const listener=(event:Event)=>{const detail=(event as CustomEvent<RewardNotice>).detail;if(detail.workspaceId!==workspaceId)return;setNotice(detail);window.setTimeout(()=>setNotice(current=>current===detail?null:current),3200)};window.addEventListener('atlas-reward',listener);return()=>window.removeEventListener('atlas-reward',listener)},[workspaceId])
  useEffect(()=>{if(!notice||!profile?.soundsEnabled)return;try{const AudioContextClass=window.AudioContext;const context=new AudioContextClass(),oscillator=context.createOscillator(),gain=context.createGain();oscillator.frequency.value=660;gain.gain.setValueAtTime(.06,context.currentTime);gain.gain.exponentialRampToValueAtTime(.001,context.currentTime+.22);oscillator.connect(gain);gain.connect(context.destination);oscillator.start();oscillator.stop(context.currentTime+.22)}catch{/* Sound feedback is optional. */}},[notice,profile?.soundsEnabled])
  if(!notice||!profile?.rewardsEnabled)return null
  const achievement=ACHIEVEMENTS.find(item=>notice.achievements.includes(item.id))
  return <div className={`reward-toast ${profile.animationsEnabled?'celebrate':''}`} role="status"><span>{achievement?.icon||'✨'}</span><div><b>{achievement?achievement.title:`+${notice.xp} XP`}</b><small>{achievement?achievement.description:`Nice work on that ${notice.sourceType}.`}</small></div></div>
}
