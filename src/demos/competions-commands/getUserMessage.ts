import { Editor, TLDrawShape, TLGeoShape, TLTextShape } from '@tldraw/tldraw'

export function getUserMessage(editor: Editor, prompt: string) {
	return `${getCurrentViewportDescription(editor)}
${getCurrentPageDescription(editor)}

${prompt}`
}

export function getCurrentViewportDescription(editor: Editor) {
	const { midX, midY, w, h } = editor.getViewportPageBounds()
	return `My current viewport is center (${midX.toFixed(0)},${midY.toFixed(0)}) size (${w.toFixed(
		0
	)},${h.toFixed(0)}).`
}

export function getCurrentPageDescription(editor: Editor) {
	const shapes = editor.getCurrentPageShapesSorted()

	if (!shapes.length) return 'There are currently no shapes on the page.'

	let result = `There are currently ${shapes.length} shapes on the page. Starting from the back-most and working our way forward in z-order, they are:`

	for (const shape of shapes) {
		const pageBounds = editor.getShapePageBounds(shape)!
		result += `\n- ${
			shape.type === 'geo' ? (shape as TLGeoShape).props.geo : shape.type
		} center (${pageBounds.midX.toFixed(0)},${pageBounds.midY.toFixed(
			0
		)}) size (${pageBounds.w.toFixed(0)},${pageBounds.h.toFixed(0)})`

		if (shape.type === 'draw') {
			let result = ` with the points `

			for (const segment of (shape as TLDrawShape).props.segments) {
				for (const { x, y } of segment.points) {
					result += `(${x.toFixed(0)},${y.toFixed(0)})`
				}
			}
		}

		if (shape.type === 'text') {
			result += ` with the text "${(shape as TLTextShape).props.text}"`
		} else {
			if ('text' in shape.props && shape.props.text) {
				result += ` with the label "${(shape as TLGeoShape).props.text}"`
			}
		}
	}

	return result
}
