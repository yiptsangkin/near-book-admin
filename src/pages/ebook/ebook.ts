import Vue from 'vue'
import App from './App.vue'
import router from './router/ebook'
import store from '@store/index'
import i18n from '@corets/lang'
import mock from '@mock/index'
import VueAwesomeSwiper from 'vue-awesome-swiper'
import 'swiper/css/swiper.css'

// antd component
import {
    ConfigProvider,
    Spin
} from 'ant-design-vue'
import comConfig from '@custom/config'

// config
Vue.config.productionTip = false

// import VueAwesomSwiper
Vue.use(VueAwesomeSwiper)

// import antd component
Vue.component(ConfigProvider.name, ConfigProvider)
Vue.component(Spin.name, Spin)

// mockjs
if (comConfig.buildSwitch.isMock) {
    Vue.use(mock as any)
}

new Vue({
    render: (h) => h(App),
    store,
    router,
    i18n
}).$mount('#app')
