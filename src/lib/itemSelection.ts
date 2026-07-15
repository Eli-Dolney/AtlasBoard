import { useEffect, useState } from 'react'
import { consumePendingItem, type AtlasItemType } from './navigation'

export function useAtlasItemSelection(type:AtlasItemType){
  const [selectedId,setSelectedId]=useState<string|null>(()=>consumePendingItem(type))
  useEffect(()=>{
    const pending=consumePendingItem(type)
    if(pending)setSelectedId(pending)
    const onOpen=(event:Event)=>{const detail=(event as CustomEvent<{type?:string;id?:string}>).detail;if(detail.type===type&&detail.id){localStorage.removeItem('atlas-open-item');setSelectedId(detail.id)}}
    window.addEventListener('atlas-open-item',onOpen)
    return()=>window.removeEventListener('atlas-open-item',onOpen)
  },[type])
  return [selectedId,setSelectedId] as const
}
