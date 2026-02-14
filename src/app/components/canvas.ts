import * as THREE from "three"
import { Dimensions, Size } from "../types/types"

import Media from "./media"
import { ScrollTrigger } from "gsap/ScrollTrigger"

export default class Canvas {
  element: HTMLCanvasElement
  scene: THREE.Scene
  camera: THREE.PerspectiveCamera
  renderer: THREE.WebGLRenderer
  sizes: Size
  dimensions: Dimensions
  medias: (Media | null)[] | null

  constructor() {
    this.element = document.getElementById("webgl") as HTMLCanvasElement
    this.medias = []
    this.createScene()
    this.createCamera()
    this.createRenderer()
    this.setSizes()
  }

  createScene() {
    this.scene = new THREE.Scene()
  }

  createCamera() {
    this.camera = new THREE.PerspectiveCamera(
      75,
      window.innerWidth / window.innerHeight,
      0.1,
      100,
    )
    this.scene.add(this.camera)
    this.camera.position.z = 10
  }

  createRenderer() {
    this.dimensions = {
      width: window.innerWidth,
      height: window.innerHeight,
      pixelRatio: Math.min(2, window.devicePixelRatio),
    }

    this.renderer = new THREE.WebGLRenderer({
      canvas: this.element,
      alpha: true,
    })
    this.renderer.setSize(this.dimensions.width, this.dimensions.height)
    this.renderer.render(this.scene, this.camera)

    this.renderer.setPixelRatio(this.dimensions.pixelRatio)
  }

  setSizes() {
    let fov = this.camera.fov * (Math.PI / 180)
    let height = this.camera.position.z * Math.tan(fov / 2) * 2
    let width = height * this.camera.aspect

    this.sizes = {
      width: width,
      height: height,
    }
  }

  onResize() {
    this.dimensions = {
      width: window.innerWidth,
      height: window.innerHeight,
      pixelRatio: Math.min(2, window.devicePixelRatio),
    }

    this.camera.aspect = window.innerWidth / window.innerHeight
    this.camera.updateProjectionMatrix()
    this.setSizes()

    this.renderer.setPixelRatio(this.dimensions.pixelRatio)
    this.renderer.setSize(this.dimensions.width, this.dimensions.height)

    //ScrollTrigger.refresh()
    this.medias?.forEach((media) => {
      media?.onResize(this.sizes)
    })
  }

  createMedias(activeElement?: HTMLImageElement) {
    const images = document.querySelectorAll("img")
    images.forEach((image) => {
      if (image !== activeElement) {
        const media = new Media({
          element: image,
          scene: this.scene,
          sizes: this.sizes,
        })

        this.medias?.push(media)
      }
    })

    this.medias?.forEach((media) => {
      media?.observe()
    })
  }

  render(scroll: number, updateScroll: boolean = true) {
    this.medias?.forEach((media) => {
      if (updateScroll) {
        media?.updateScroll(scroll)
      }
    })

    this.renderer.render(this.scene, this.camera)
  }
}
