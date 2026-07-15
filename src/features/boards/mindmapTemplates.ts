export type BuiltInTemplateId = 'school-organized'|'business-structured'|'project-management'|'knowledge-base'|'personal-productivity'|'decision-tree'|'timeline'|'swot-analysis'|'mind-map-starter'|'goal-planning'|'life-dashboard'|'brain-dump'|'weekly-focus'|'youtube-content'

export const BUILT_IN_TEMPLATE_IDS: BuiltInTemplateId[] = ['school-organized','business-structured','project-management','knowledge-base','personal-productivity','decision-tree','timeline','swot-analysis','mind-map-starter','goal-planning','life-dashboard','brain-dump','weekly-focus','youtube-content']

export function resolveMindMapTemplateId(id: string): BuiltInTemplateId | null {
  const aliases: Record<string, BuiltInTemplateId> = {
    'weekly-planner':'weekly-focus','adhd-task-hub':'brain-dump','work-projects':'project-management','meeting-notes':'knowledge-base','school-hub':'school-organized','study-notes':'knowledge-base','side-projects':'project-management','family-life':'life-dashboard','goals-vision':'goal-planning',
  }
  const resolved=aliases[id]??id
  return BUILT_IN_TEMPLATE_IDS.includes(resolved as BuiltInTemplateId)?resolved as BuiltInTemplateId:null
}

export function parseCustomMindMapTemplate(data:string):{nodes:Node[];edges:Edge[]}|null{try{const parsed=JSON.parse(data) as {nodes?:Node[];edges?:Edge[]};if(!Array.isArray(parsed.nodes)||!Array.isArray(parsed.edges))return null;return{nodes:parsed.nodes.map(node=>({...node,type:node.type||'editable',selected:false})),edges:parsed.edges.map(edge=>({type:'labeled',...edge}))}}catch{return null}}
import type { Edge, Node } from '@reactflow/core'
