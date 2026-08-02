<script setup>
import { defineProps, computed } from 'vue'

import MarkdownIt from 'markdown-it'
import markdownItAttrs from 'markdown-it-attrs'

defineOptions({
  name: 'TMMarkdown',
})

const props = defineProps({
  markdown: {
    type: String,
    required: true,
  },
})

function wikilinksPlugin(md) {
  md.inline.ruler.push('wikilink', (state, silent) => {
    const match = /^\[\[([^\]|]+)(\|([^\]]+))?\]\]/.exec(state.src.slice(state.pos))
    if (!match) return false

    if (!silent) {
      const target = match[1].trim()
      const label = (match[3] || match[1]).trim()
      const token = state.push('wikilink', '', 0)
      token.content = label
      token.meta = { target }
    }
    state.pos += match[0].length
    return true
  })

  md.renderer.rules.wikilink = (tokens, idx) => {
    const { target } = tokens[idx].meta
    const href = `note://${encodeURIComponent(target.replace(/\s+/g, '_'))}`
    return `<a href="${href}" class="wikilink">${md.utils.escapeHtml(tokens[idx].content)}</a>`
  }
}

const md = new MarkdownIt().use(markdownItAttrs).use(wikilinksPlugin)

const renderedMarkdown = computed(() => {
  const result = md.render(props.markdown)
  return result
})
</script>

<template>
  <div v-html="renderedMarkdown"></div>
</template>

<style scoped></style>
