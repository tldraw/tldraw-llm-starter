import {
	Editor,
	GeoShapeGeoStyle,
	TLDrawShape,
	TLGeoShape,
	TLTextShape,
	Vec2d,
	createShapeId,
} from '@tldraw/tldraw'

const basePoint = {
	type: 'pointer',
	name: 'pointer_down',
	target: 'canvas',
	pointerId: 1,
	button: 0,
	isPen: false,
	shiftKey: false,
	altKey: false,
	ctrlKey: false,
} as const

async function waitFrame() {
	return new Promise((r) => requestAnimationFrame(r))
}

export function getCurrentPointer(editor: Editor) {
	return editor.inputs.currentPagePoint.toJson()
}

export function getCurrentViewportDescription(editor: Editor) {
	return editor.getViewportPageBounds()
}

export function getCurrentPageDescription(editor: Editor) {
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

export async function pointerMoveTo(editor: Editor, { x, y }: { x: number; y: number }) {
	const current = editor.inputs.currentPagePoint
	const dist = Vec2d.Dist(current, { x, y })
	const steps = Math.min(32, Math.max(2, Math.ceil(dist / 8)))

	for (let i = 0; i < steps; i++) {
		const point = Vec2d.Lrp(current, { x, y }, i / (steps - 1))
		pointerMove(editor, point)
		await waitFrame()
	}
}

export async function pointerMove(editor: Editor, { x, y }: { x: number; y: number }) {
	editor.dispatch({
		...basePoint,
		name: 'pointer_move',
		point: { x, y },
	})
}

export async function pointerDown(editor: Editor) {
	const { x, y } = editor.inputs.currentPagePoint
	editor.dispatch({
		...basePoint,
		name: 'pointer_down',
		point: { x, y },
	})
	await waitFrame()
}

export async function pointerUp(editor: Editor) {
	const { x, y } = editor.inputs.currentPagePoint
	editor.dispatch({
		...basePoint,
		name: 'pointer_up',
		point: { x, y },
	})
	await waitFrame()
}

export async function click(editor: Editor, { x, y }: { x: number; y: number }) {
	pointerMove(editor, { x, y })
	pointerDown(editor)
	pointerUp(editor)
	editor.cancelDoubleClick()
	await waitFrame()
}

export async function doubleClick(editor: Editor, { x, y }: { x: number; y: number }) {
	pointerMove(editor, { x, y })
	pointerDown(editor)
	pointerUp(editor)
	pointerDown(editor)
	pointerUp(editor)
	await waitFrame()
}

export async function placeText(
	editor: Editor,
	{ text, x, y }: { text: string; x: number; y: number }
) {
	const shapeId = createShapeId()
	editor.createShape({
		id: shapeId,
		type: 'text',
		x,
		y,
		props: {
			text,
		},
	})
	const bounds = editor.getShapePageBounds(shapeId)!
	editor.updateShape({
		id: shapeId,
		type: 'text',
		x: x - bounds.w / 2,
		y: y - bounds.h / 2,
	})
	await waitFrame()
}

export function selectTool(editor: Editor, { tool }: { tool: string }) {
	switch (tool) {
		case 'select': {
			editor.setCurrentTool('select')
			break
		}
		case 'arrow': {
			editor.setCurrentTool('arrow')
			break
		}
		case 'pen': {
			editor.setCurrentTool('draw')
			break
		}
		case 'box': {
			editor.updateInstanceState(
				{
					stylesForNextShape: {
						...editor.getInstanceState().stylesForNextShape,
						[GeoShapeGeoStyle.id]: 'rectangle',
					},
				},
				{ ephemeral: true }
			)
			editor.setCurrentTool('geo')
			break
		}
		case 'pill':
		case 'diamond':
		case 'ellipse':
		case 'cloud':
		case 'star': {
			editor.updateInstanceState(
				{
					stylesForNextShape: {
						...editor.getInstanceState().stylesForNextShape,
						[GeoShapeGeoStyle.id]: tool,
					},
				},
				{ ephemeral: true }
			)
			editor.setCurrentTool('geo')
			break
		}
	}
}
