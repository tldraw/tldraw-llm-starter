import { Editor } from '@tldraw/tldraw'

export function getCurrentViewportDescription(editor: Editor) {
	const { x, y, w, h } = editor.getViewportPageBounds()

	return `
  x: ${x.toFixed(0)} 
  y: ${y.toFixed(0)} 
  w: ${w.toFixed(0)} 
  h: ${h.toFixed(0)}
`
}
