import { Editor, TLDrawShape, TLGeoShape, TLTextShape } from 'tldraw'

export function getUserMessage(editor: Editor, prompt: string) {
	return `
${getCurrentViewportDescription(editor)}
${getCurrentPageDescription(editor)}
${prompt}`
}

function getCurrentViewportDescription(editor: Editor) {
	const { midX, midY, w, h } = editor.getViewportPageBounds()

	let result = ''

	result += `The current viewport is (${midX.toFixed(0)},${midY.toFixed(0)},${w.toFixed(
		0
	)},${h.toFixed(0)}).`

	return result
}

function getCurrentPageDescription(editor: Editor) {
	const shapes = editor.getCurrentPageShapesSorted()

	if (!shapes.length) return 'There are no shapes on the page.'

	let result = ''

	for (const shape of shapes) {
		const pageBounds = editor.getShapePageBounds(shape)!
		result += `\n- ${
			shape.type === 'geo' ? (shape as TLGeoShape).props.geo : shape.type
		} (${pageBounds.midX.toFixed(0)},${pageBounds.midY.toFixed(0)},${pageBounds.w.toFixed(
			0
		)},${pageBounds.h.toFixed(0)})`

		if (shape.type === 'draw') {
			result += ` with the points "${(shape as TLDrawShape).props.segments
				.flatMap((s) => s.points.map((p) => `(${p.x},${p.y})`))
				.join(' ')}`
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
