import Vue from 'vue'
import VueRouter, { RouteConfig, RouterOptions } from 'vue-router'
import dict from '@custom/dict'
import utils from '@corets/utils'
const Ebook = () => import('../view/Ebook.vue')

Vue.use(VueRouter)

const routesConfig: RouteConfig[] = [
    {
        path: '/',
        name: 'Ebook',
        component: Ebook
    }
]

const routerOpt: RouterOptions = {
    mode: 'history',
    base: `/${dict.commonObj.ebookPath}`,
    routes: routesConfig
}

const routeObj = new VueRouter(routerOpt)
routeObj.beforeEach((to, from, next) => {
    const title = to.meta.title
    if (to.meta.title) {
        utils.setPageTitle(title)
    } else {
        utils.setPageTitle('')
    }
    next()
})

export default routeObj
