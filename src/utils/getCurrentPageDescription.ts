import { Editor, TLGeoShape, TLTextShape } from '@tldraw/tldraw'

export function getCurrentPageDescription(editor: Editor) {
	const shapes = editor.getCurrentPageShapesSorted()
	if (shapes.length === 0) {
		return "There are no shapes on the current page. It's a blank page."
	}

	let result = `There are ${shapes.length} shapes on the current page. Starting from the back-most and working our way forward in z-order, they are:`

	for (const shape of shapes) {
		const pageBounds = editor.getShapePageBounds(shape)!
		result += `\n- type=${
			shape.type === 'geo'
				? `geo (${(shape as TLGeoShape).props.geo})`
				: shape.type
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
