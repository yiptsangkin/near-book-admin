<template>
    <a-spin :spinning="isLoading" class="book-loading">
        <div :class="`online-book book-${mode}`">
            <swiper class="book-swiper" ref="book" :options="swiperOptions">
                <swiper-slide class="book-swiper-item" v-for="(item, index) in pageList" :key="index">
                    <template v-if="mode === 'canvas'">
                        <div class="page-ctx" :id="`page-ctx-${index + 1}`">
                            <div class="page-img" v-if="item.imgUrl">
                                <img :src="item.imgUrl" :id="`page-img-${index + 1}`">
                            </div>
                            <div class="page-canvas" v-else>
                                <canvas :id="`page-canvas-${index + 1}`"></canvas>
                            </div>
                        </div>
                    </template>
                    <template v-else-if="mode === 'text'">
                        <div class="page-ctx" :id="`page-ctx-${index + 1}`">
                            <p v-for="(citem, cindex) in item.textItems" :key="cindex">
                                <span v-for="(ditem, dindex) in citem.texts" :key="dindex">{{ ditem }}</span>
                            </p>
                        </div>
                    </template>
                </swiper-slide>
            </swiper>
        </div>
    </a-spin>
</template>

<script lang="ts">
    import Vue from 'vue'
    import CoreBase from '@corets/base'
    import Base from '@custom/base'

    const pdfJsLib = window.pdfjsLib
    let globalPdf: any
    const baseGap = [50, 70]
    let loadingCount = 0
    let ablePageCount = 0

    export default Vue.extend({
        name: 'Ebook',
        mixins: [CoreBase, Base],
        data () {
            const self = this as any
            return {
                pageNum: 0,
                pageList: [],
                swiperOptions: {
                    on: {
                        transitionStart () {
                            self.getPrerenderPage()
                        }
                    }
                },
                isLoading: false,
                mode: 'text'
            }
        },
        created () {
            const self = this
            self.getPdfFile()
        },
        methods: {
            getPdfFile () {
                const self = this as any
                const pdfUrl = decodeURIComponent(self.$route.query.url as string)
                if (pdfUrl) {
                    pdfJsLib.getDocument(pdfUrl).promise.then((pdf: any) => {
                        globalPdf = pdf
                        self.pageNum = pdf.numPages
                        const pageList = []
                        for (let i = 0; i < self.pageNum; i++) {
                            pageList.push({
                                pageNum: i + 1,
                                imgUrl: '',
                                textItems: []
                            })
                        }
                        self.pageList = pageList
                        self.$nextTick(() => {
                            self.getPrerenderPage()
                        })
                    })
                }
            },
            getPrerenderPage () {
                const self = this as any
                self.isLoading = true
                // 初始化当前页以及前后两页的书籍内容
                const curSwiper = self.$refs.book.$swiper
                const activePage = curSwiper.activeIndex + 1
                for (let i = activePage - 2; i <= activePage + 2; i++) {
                    const curPage = self.pageList[i - 1]
                    if (i > 0 && curPage && (curPage.imgUrl === '' || curPage.textItems.length === 0)) {
                        ablePageCount++
                        globalPdf.getPage(i).then((page: any) => {
                            self.renderTargetPage(page, () => {
                                loadingCount++
                                if (loadingCount === ablePageCount) {
                                    self.isLoading = false
                                    loadingCount = 0
                                    ablePageCount = 0
                                }
                            })
                        }).catch((err: any) => {
                            console.log(err, i)
                        })
                    }
                }
                if (ablePageCount === 0) {
                    self.isLoading = false
                }
            },
            renderTargetPage (page: any, cb: any) {
                const self = this as any
                const canvasIdx = page.pageNumber
                if (self.mode === 'canvas') {
                    const clientWidth = window.innerWidth
                    const clientHeight = window.innerHeight
                    const canvasItem = self.$el.querySelector(`#page-canvas-${canvasIdx}`)
                    const pageCtxItem = self.$el.querySelector(`#page-ctx-${canvasIdx}`)
                    const basicVpt = page.getViewport({
                        scale: 1
                    })
                    let vptRadio
                    if ((clientWidth / clientHeight) > (basicVpt.width / basicVpt.height)) {
                        // 以高为基准
                        vptRadio = clientHeight / basicVpt.height
                    } else {
                        // 以宽为基准
                        vptRadio = clientWidth / basicVpt.width
                    }
                    const vpt = page.getViewport({
                        scale: vptRadio
                    })
                    // 设置显示的canvas的高度
                    pageCtxItem.style.width = `${vpt.width}px`
                    pageCtxItem.style.height = `${vpt.height}px`

                    // 渲染
                    const PRINT_RESOLUTION = 150
                    const PRINT_UNITS = PRINT_RESOLUTION / 36.0
                    canvasItem.width = Math.floor(vpt.width * PRINT_UNITS)
                    canvasItem.height = Math.floor(vpt.height * PRINT_UNITS)
                    const pen = canvasItem.getContext('2d')
                    const renderContext = {
                        transform: [PRINT_UNITS, 0, 0, PRINT_UNITS, 0, 0],
                        canvasContext: pen,
                        viewport: vpt,
                        background: 'rgba(0,0,0,0)'
                    }
                    page.render(renderContext).promise.then((res: any) => {
                        const newData = pen.getImageData(
                            baseGap[0],
                            baseGap[1],
                            canvasItem.width - baseGap[0] - baseGap[1],
                            canvasItem.height - baseGap[0] - baseGap[1]
                        )
                        pen.clearRect(0, 0, canvasItem.width, canvasItem.height)
                        canvasItem.width = canvasItem.width - baseGap[0] - baseGap[1]
                        canvasItem.height = canvasItem.height - baseGap[0] - baseGap[1]
                        pen.putImageData(newData, 0, 0)
                        self.pageList[canvasIdx - 1].imgUrl = canvasItem.toDataURL('image/png')
                        if (cb) {
                            cb()
                        }
                    })
                } else {
                    page.getTextContent().then((res: any) => {
                        const paragraphList: any[] = []
                        let characterList: any[] = []
                        let lastLine = 0
                        let lastHeight = 0
                        res.items.forEach((item: any, index: any) => {
                            const emptyStr = new Array(item.str.length + 1).join(' ')
                            const thisLine = item.transform[4]
                            const thisHeight = item.transform[5]
                            if (emptyStr === item.str) {
                                paragraphList.push({
                                    texts: characterList,
                                    isNewPage: false
                                })
                                characterList = []
                            } else if (item.str.startsWith('  ')) {
                                paragraphList.push({
                                    texts: characterList,
                                    isNewPage: false
                                })
                                characterList = item.str.split('')
                                if (index === res.items.length - 1) {
                                    paragraphList.push({
                                        texts: characterList,
                                        isNewPage: false
                                    })
                                }
                            } else {
                                characterList = characterList.concat(item.str.split(''))
                                if (index === res.items.length - 1) {
                                    paragraphList.push({
                                        texts: characterList,
                                        isNewPage: false
                                    })
                                }
                            }
                            lastLine = thisLine
                            lastHeight = thisHeight
                        })
                        self.pageList[canvasIdx - 1].textItems = paragraphList
                        if (cb) {
                            cb()
                        }
                    })
                }
            },
            separateParagraph () {
                console.log('')
            }
        }
    })
</script>

<style lang="scss" scoped>
    @import '~@scss/custom/ebook/style.scss'
</style>
