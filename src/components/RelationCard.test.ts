import { mount } from '@vue/test-utils'
import { describe, expect, it } from 'vitest'
import RelationCard from './RelationCard.vue'

describe('RelationCard', () => {
  it('renders the relation score and explanation', () => {
    const wrapper = mount(RelationCard, {
      props: {
        match: {
          word: { id: '1', kana: 'ありがたい', normalizedKana: 'ありがたい', learnedAt: 1, updatedAt: 1 },
          score: 95,
          sharedKana: ['あ', 'り', 'が'],
          sharedSubstrings: ['ありが'],
          longestSharedSubstring: 'ありが',
          boundaryAligned: true,
        },
      },
    })
    expect(wrapper.text()).toContain('ありがたい')
    expect(wrapper.text()).toContain('95')
    expect(wrapper.text()).toContain('连续片段 · ありが')
  })
})
