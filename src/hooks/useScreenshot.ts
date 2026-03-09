import * as Cesium from 'cesium'

export function captureScreenshot(viewer: Cesium.Viewer) {
  viewer.render()
  const canvas = viewer.scene.canvas
  const dataUrl = canvas.toDataURL('image/png')

  const timestamp = new Date().toISOString().replace(/[:.]/g, '-').slice(0, 19)
  const link = document.createElement('a')
  link.href = dataUrl
  link.download = `overwatch-${timestamp}.png`
  link.click()
}
