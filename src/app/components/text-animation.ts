import gsap from "gsap"
import { SplitText } from "gsap/SplitText"

interface BaseAnimationProps {
  element: HTMLElement
  inDuration: number
  outDuration: number
  inDelay: number
}

interface SplitAnimationProps extends BaseAnimationProps {
  split: globalThis.SplitText
  inStagger?: number
  outStagger?: number
}

export default class TextAnimation {
  elements: HTMLElement[]
  splitAnimations: SplitAnimationProps[] = []
  fadeAnimations: BaseAnimationProps[] = []
  splitTweens: gsap.core.Tween[] = []
  fadeTweens: gsap.core.Tween[] = []
  ready: boolean = false

  constructor() {}

  init() {
    this.ready = true

    this.splitAnimations = []
    this.fadeAnimations = []

    this.elements = document.querySelectorAll(
      "[data-text-animation]",
    ) as unknown as HTMLElement[]

    this.elements.forEach((el) => {
      const inDuration = parseFloat(
        el.getAttribute("data-text-animation-in-duration") || "0.6",
      )

      const outDuration = parseFloat(
        el.getAttribute("data-text-animation-out-duration") || "0.3",
      )

      const inDelay = parseFloat(
        el.getAttribute("data-text-animation-in-delay") || "0",
      )

      // Check if this should be a split text animation
      if (el.hasAttribute("data-text-animation-split")) {
        const split = SplitText.create(el, {
          type: "lines",
          mask: "lines",
        })

        const inStagger = parseFloat(
          el.getAttribute("data-text-animation-in-stagger") || "0.06",
        )

        const outStagger = parseFloat(
          el.getAttribute("data-text-animation-out-stagger") || "0.06",
        )

        split.lines.forEach((line) => {
          gsap.set(line, { yPercent: 100 })
        })

        gsap.set(el, { autoAlpha: 1, visibility: "visible" })

        this.splitAnimations.push({
          element: el,
          split,
          inDuration,
          outDuration,
          inStagger,
          outStagger,
          inDelay,
        })
      } else {
        // Default fade animation
        gsap.set(el, { autoAlpha: 0, visibility: "hidden" })

        this.fadeAnimations.push({
          element: el,
          inDuration,
          outDuration,
          inDelay,
        })
      }
    })
  }

  animateIn({ delay = 0 } = {}) {
    // Split text animations

    this.splitAnimations.forEach(
      ({ element, split, inDuration, inStagger, inDelay }) => {
        const tweenWithScroll = gsap.to(split.lines, {
          yPercent: 0,
          stagger: inStagger,
          scrollTrigger: {
            trigger: element,
            start: "top bottom",
            end: "bottom top",
            toggleActions: "play reset restart reset",
          },
          ease: "expo",
          duration: inDuration,
          delay: inDelay + delay,
        })

        this.splitTweens.push(tweenWithScroll)
      },
    )

    // Fade animations
    this.fadeAnimations.forEach(({ element, inDuration, inDelay }) => {
      const fadeTween = gsap.to(element, {
        autoAlpha: 1,
        scrollTrigger: {
          trigger: element,
          start: "top bottom",
          end: "bottom top",
          toggleActions: "play reset restart reset",
        },
        ease: "power2.out",
        duration: inDuration,
        delay: inDelay + delay,
      })

      this.fadeTweens.push(fadeTween)
    })
    return gsap.timeline()
  }

  animateOut() {
    const tl = gsap.timeline()

    // Split animations
    this.splitAnimations.forEach(({ split, outDuration, outStagger }) => {
      tl.to(
        split.lines,
        {
          yPercent: 100,
          stagger: outStagger,
          ease: "power2.out",
          duration: outDuration,
        },
        0,
      )
    })

    // Fade animations
    this.fadeAnimations.forEach(({ element, outDuration }) => {
      tl.to(
        element,
        {
          autoAlpha: 0,
          ease: "power2.out",
          duration: outDuration,
        },
        0,
      )
    })

    return tl
  }

  onResize() {
    if (!this.ready) return

    this.destroy()
    this.init()

    this.animateIn()
  }

  destroy() {
    this.splitTweens.forEach((tween) => {
      tween.scrollTrigger?.kill()
      tween.kill()
    })

    this.fadeTweens.forEach((tween) => {
      tween.scrollTrigger?.kill()
      tween.kill()
    })

    this.splitAnimations.forEach(({ split }) => {
      split.revert()
    })

    this.splitTweens = []
    this.fadeTweens = []
  }
}
