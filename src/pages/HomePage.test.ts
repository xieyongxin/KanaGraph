import { createPinia } from 'pinia'
import { flushPromises, mount } from '@vue/test-utils'
import { describe, expect, it } from 'vitest'
import HomePage from './HomePage.vue'

async function waitForText(wrapper: ReturnType<typeof mount>, text: string): Promise<void> {
  for (let attempt = 0; attempt < 30; attempt += 1) {
    await new Promise((resolve) => setTimeout(resolve, 10))
    await flushPromises()
    if (wrapper.text().includes(text)) return
  }
}

describe('HomePage', () => {
  it('learns a word and shows indexed live relations for the next input', async () => {
    const wrapper = mount(HomePage, { global: { plugins: [createPinia()] } })
    await flushPromises()

    await wrapper.get('#kana').setValue('ごはん')
    await wrapper.get('form').trigger('submit')
    await waitForText(wrapper, '已学习：ごはん')
    expect(wrapper.text()).toContain('已学习：ごはん')

    await wrapper.get('#kana').setValue('はな')
    await waitForText(wrapper, '共同假名 · は')
    expect(wrapper.text()).toContain('ごはん')
    expect(wrapper.text()).toContain('共同假名 · は')
  })

  it('shows a validation message without writing invalid input', async () => {
    const wrapper = mount(HomePage, { global: { plugins: [createPinia()] } })
    await wrapper.get('#kana').setValue('ご飯')
    await wrapper.get('form').trigger('submit')
    expect(wrapper.text()).toContain('仅支持平假名、片假名和长音符')
  })
})
