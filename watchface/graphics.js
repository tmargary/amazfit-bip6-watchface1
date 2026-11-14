export function image(src, x, y, level) {
  return hmUI.createWidget(hmUI.widget.IMG, { src, x, y, show_level: level })
}

export function digitPaths(style) {
  return Array.from({ length: 10 }, (_, i) => `images/${style}/${i}.png`)
}
