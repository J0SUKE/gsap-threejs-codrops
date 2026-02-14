import Canvas from "./components/canvas"
import Scroll from "./components/scroll"
//@ts-ignore
import barba from "@barba/core"

import { ScrollTrigger } from "gsap/ScrollTrigger"
import { ScrollSmoother } from "gsap/ScrollSmoother"
//@ts-ignore
import { Flip } from "gsap/Flip"
import gsap from "gsap"
import Media from "./components/media"
import { SplitText } from "gsap/SplitText"
import TextAnimation from "./components/text-animation"
import FontFaceObserver from "fontfaceobserver"

gsap.registerPlugin(ScrollTrigger, ScrollSmoother, Flip, SplitText)

class App {
  canvas: Canvas
  scroll: Scroll
  template: "home" | "detail"

  mediaHomeState: Flip.FlipState
  scrollBlocked: boolean = false
  scrollTop: number
  textAnimation: TextAnimation
  fontLoaded: boolean = false

  constructor() {
    if (typeof history !== "undefined" && "scrollRestoration" in history) {
      history.scrollRestoration = "manual"
    }

    this.scroll = new Scroll()
    this.canvas = new Canvas()
    this.textAnimation = new TextAnimation()
    this.loadFont(() => {
      this.textAnimation.init()
    })

    this.template = this.getCurrentTemplate()

    this.loadImages(() => {
      this.canvas.createMedias()
      if (this.fontLoaded) {
        this.textAnimation.init()
        this.textAnimation.animateIn()
      } else {
        window.addEventListener("fontLoaded", () => {
          gsap.delayedCall(0, () => {
            gsap.delayedCall(0, () => {
              this.textAnimation.init()
              this.textAnimation.animateIn({ delay: 0.3 })
            })
          })
        })
      }
    })

    let activeLinkImage: HTMLImageElement
    let scrollTop: number

    barba.init({
      prefetchIgnore: true,
      transitions: [
        {
          name: "default-transition",
          before: () => {
            this.scrollBlocked = true
            this.scroll.s?.paused(true)
          },
          leave: () => {
            const medias = this.canvas.medias && this.canvas.medias

            medias?.forEach((media) => {
              if (!media) return
              media.onResize(this.canvas.sizes)
              gsap.set(media.element, {
                visibility: "hidden",
                opacity: 0,
              })
            })

            return new Promise<void>((resolve) => {
              const tl = this.textAnimation.animateOut()

              this.canvas.medias?.forEach((media) => {
                if (!media) return
                tl.fromTo(
                  media.material.uniforms.uProgress,
                  { value: 1 },
                  {
                    duration: 1,
                    ease: "linear",
                    value: 0,
                  },
                  0,
                )
              })

              tl.call(() => {
                this.textAnimation.destroy()
                resolve()
              })
            })
          },
          beforeEnter: () => {
            this.canvas.medias?.forEach((media) => {
              media?.destroy()
              media = null
            })

            this.scrollBlocked = false

            this.scroll.reset()
            this.scroll.destroy()
          },
          after: () => {
            this.scroll.init()
            this.textAnimation.init()

            const template = this.getCurrentTemplate()
            this.setTemplate(template)

            this.loadImages(() => {
              this.canvas.medias = []
              this.canvas.createMedias()
              this.textAnimation.animateIn({ delay: 0.3 })
            })
          },
        },
        {
          name: "home-detail",
          from: {
            custom: () => {
              const activeLink = document.querySelector(
                'a[data-home-link-active="true"]',
              )
              if (!activeLink) return false

              return true
            },
          },
          before: () => {
            this.scrollBlocked = true
            this.scroll.s?.paused(true)

            const tl = this.textAnimation.animateOut()

            activeLinkImage = document.querySelector(
              'a[data-home-link-active="true"] img',
            ) as HTMLImageElement

            this.canvas.medias?.forEach((media) => {
              if (!media) return
              media.scrollTrigger.kill()

              const currentProgress = media.material.uniforms.uProgress.value
              const totalDuration = 1.2

              if (media.element !== activeLinkImage) {
                const remainingDuration = totalDuration * currentProgress

                tl.to(
                  media.material.uniforms.uProgress,
                  {
                    duration: remainingDuration,
                    value: 0,
                    ease: "linear",
                  },
                  0,
                )
              } else {
                const remainingDuration = totalDuration * (1 - currentProgress)

                tl.to(
                  media.material.uniforms.uProgress,
                  {
                    value: 1,
                    duration: remainingDuration,
                    ease: "linear",
                    onComplete: () => {
                      media.element.style.opacity = "1"
                      media.element.style.visibility = "visible"
                      gsap.set(media.material.uniforms.uProgress, { value: 0 })
                    },
                  },
                  0,
                )
              }
            })

            return new Promise<void>((resolve) => {
              tl.call(() => {
                resolve()
              })
            })
          },

          leave: () => {
            scrollTop = this.scroll.getScroll()

            const container = document.querySelector(
              ".container",
            ) as HTMLElement
            container.style.position = "fixed"
            container.style.top = `-${scrollTop}px`
            container.style.width = "100%"
            container.style.zIndex = "1000"

            this.mediaHomeState = Flip.getState(activeLinkImage)
            this.textAnimation.destroy()
          },
          beforeEnter: () => {
            this.scroll.reset()
            this.scroll.destroy()
          },
          after: () => {
            this.scroll.init()
            this.textAnimation.init()

            const detailContainer = document.querySelector(
              ".details-container",
            ) as HTMLElement

            detailContainer.innerHTML = ""
            detailContainer.append(activeLinkImage)

            const template = this.getCurrentTemplate()
            this.setTemplate(template)

            return new Promise<void>((resolve) => {
              let activeMedia: Media | null = null

              this.textAnimation.animateIn({ delay: 0.3 })

              Flip.from(this.mediaHomeState, {
                absolute: true,

                duration: 1,
                ease: "power3.inOut",

                onComplete: () => {
                  this.scrollBlocked = false
                  this.canvas.medias?.forEach((media) => {
                    if (!media) return
                    if (media.element !== activeLinkImage) {
                      media.destroy()
                      media = null
                    } else {
                      activeMedia = media
                    }
                  })

                  this.canvas.medias = [activeMedia]

                  resolve()
                },
              })
            })
          },
        },
      ],
    })

    window.addEventListener("resize", this.onResize.bind(this))

    this.render = this.render.bind(this)
    gsap.ticker.add(this.render)
  }

  getCurrentTemplate() {
    return document
      .querySelector("[data-page-template]")
      ?.getAttribute("data-page-template") as "home" | "detail"
  }

  setTemplate(template: string) {
    this.template = template as "home" | "detail"
  }

  loadImages(callback?: () => void) {
    const medias = document.querySelectorAll("img")
    let loadedImages = 0
    const totalImages = medias.length

    medias.forEach((img) => {
      if (img.complete) {
        loadedImages++
      } else {
        img.addEventListener("load", () => {
          loadedImages++
          if (loadedImages === totalImages) {
            this.onReady(callback)
          }
        })
      }
    })

    if (loadedImages === totalImages) {
      this.onReady(callback)
    }
  }

  onReady(callback?: () => void) {
    if (callback) callback()
    ScrollTrigger.refresh()
  }

  loadFont(onLoaded: () => void) {
    const satoshi = new FontFaceObserver("Satoshi")

    satoshi.load().then(() => {
      onLoaded()
      this.fontLoaded = true
      window.dispatchEvent(new Event("fontLoaded"))
    })
  }

  onResize() {
    this.textAnimation?.onResize()
    this.canvas?.onResize()
  }

  render() {
    this.scrollTop = this.scroll?.getScroll() || 0
    this.canvas?.render(this.scrollTop, !this.scrollBlocked)
  }
}

export default new App()
