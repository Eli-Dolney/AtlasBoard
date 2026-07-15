import { describe, expect, it } from 'vitest'
import { BUILT_IN_TEMPLATE_IDS, parseCustomMindMapTemplate, resolveMindMapTemplateId } from './mindmapTemplates'

describe('mind-map template routing', () => {
  it('accepts every built-in template', () => BUILT_IN_TEMPLATE_IDS.forEach(id=>expect(resolveMindMapTemplateId(id)).toBe(id)))
  it('maps gallery-friendly IDs onto canvas templates', () => {
    expect(resolveMindMapTemplateId('weekly-planner')).toBe('weekly-focus')
    expect(resolveMindMapTemplateId('youtube-content')).toBe('youtube-content')
    expect(resolveMindMapTemplateId('school-hub')).toBe('school-organized')
  })
  it('rejects unknown templates instead of blanking a board', () => expect(resolveMindMapTemplateId('unknown')).toBeNull())
  it('preserves custom node types while normalizing missing types and edges',()=>{const result=parseCustomMindMapTemplate(JSON.stringify({nodes:[{id:'note',type:'note',position:{x:0,y:0},data:{text:'Keep me'}},{id:'plain',position:{x:1,y:1},data:{label:'Text'}}],edges:[{id:'e',source:'note',target:'plain'}]}));expect(result?.nodes.map(node=>node.type)).toEqual(['note','editable']);expect(result?.edges[0].type).toBe('labeled')})
  it('rejects malformed custom template data',()=>expect(parseCustomMindMapTemplate('{bad')).toBeNull())
})
