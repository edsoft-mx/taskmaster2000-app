import { boot } from 'quasar/wrappers'
import { VueShowdownPlugin } from 'vue-showdown'

// "async" is optional;
// more info on params: https://v2.quasar.dev/quasar-cli/boot-files
export default boot(({ app }) => {
  app.use(VueShowdownPlugin, {
    flavor: 'github',
    options: {
      emoji: true,

    }
  })

})
