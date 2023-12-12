import { Editor } from '@tldraw/tldraw'

export function getCurrentViewportDescription(editor: Editor) {
	const { midX, midY, w, h } = editor.getViewportPageBounds()

	return `
The current viewport is (${midX.toFixed(0)},${midY.toFixed(0)},${w.toFixed(
		0
	)},${h.toFixed(0)}).`
}
