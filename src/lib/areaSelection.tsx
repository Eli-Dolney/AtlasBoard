import { createContext, useCallback, useContext, type ReactNode } from 'react'
/* eslint-disable react-refresh/only-export-components */

const AreaSelectionContext=createContext<string[]>([])
export function AreaSelectionProvider({selected,children}:{selected:string[];children:ReactNode}) { return <AreaSelectionContext.Provider value={selected}>{children}</AreaSelectionContext.Provider> }
export const useAreaSelection=()=>useContext(AreaSelectionContext)
export const inSelectedAreas=(areaId:string|undefined,selected:string[])=>selected.length===0||(!!areaId&&selected.includes(areaId))
export const useAreaPredicate=()=>{const selected=useAreaSelection();return useCallback((areaId?:string)=>inSelectedAreas(areaId,selected),[selected])}
