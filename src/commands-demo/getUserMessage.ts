import { Editor, TLGeoShape, TLTextShape } from '@tldraw/tldraw'

export function getUserMessage(editor: Editor, prompt: string) {
	let result = ''

	result += 'Current viewport:\n'
	result += getCurrentViewportDescription(editor)
	result += '\n\n'
	result += 'Current page:\n'
	result += getCurrentPageDescription(editor)
	result += '\n\n'
	result += 'Prompt:\n'
	result += prompt

	return result
}

function getCurrentViewportDescription(editor: Editor) {
	const { x, y, w, h } = editor.getViewportPageBounds()

	return `
  x: ${x.toFixed(0)} 
  y: ${y.toFixed(0)} 
  w: ${w.toFixed(0)} 
  h: ${h.toFixed(0)}
`
}

function getCurrentPageDescription(editor: Editor) {
	const shapes = editor.getCurrentPageShapesSorted()
	if (shapes.length === 0) {
		return "There are no shapes on the current page. It's a blank page."
	}

	let result = `There are ${shapes.length} shapes on the current page. Starting from the back-most and working our way forward in z-order, they are:`

	for (const shape of shapes) {
		const pageBounds = editor.getShapePageBounds(shape)!
		result += `\n- type=${
			shape.type === 'geo' ? `geo (${(shape as TLGeoShape).props.geo})` : shape.type
		} center=${pageBounds.midX.toFixed(0)},${pageBounds.midY.toFixed(
			0
		)} size=${pageBounds.w.toFixed(0)},${pageBounds.h.toFixed(0)}`

		if (shape.type === 'text') {
			result += ` text="${(shape as TLTextShape).props.text}"`
		} else {
			if ('text' in shape.props && shape.props.text) {
				result += ` label="${(shape as TLGeoShape).props.text}"`
			}
		}
	}

	return result
}
