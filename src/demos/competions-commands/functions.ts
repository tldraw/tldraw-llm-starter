import {
	Editor,
	GeoShapeGeoStyle,
	TLDrawShape,
	TLGeoShape,
	TLKeyboardEventInfo,
	TLTextShape,
	Vec,
	createShapeId,
} from 'tldraw'

function getKeyboardEvent(_editor: Editor, key: string): TLKeyboardEventInfo {
	return {
		name: 'key_down',
		type: 'keyboard',
		shiftKey: key === 'Shift',
		ctrlKey: key === 'Control' || key === 'Meta',
		altKey: key === 'Alt',
		key,
		code:
			key === 'Shift'
				? 'ShiftLeft'
				: key === 'Alt'
					? 'AltLeft'
					: key === 'Control' || key === 'Meta'
						? 'CtrlLeft'
						: key === ' '
							? 'Space'
							: key === 'Enter' ||
								  key === 'ArrowRight' ||
								  key === 'ArrowLeft' ||
								  key === 'ArrowUp' ||
								  key === 'ArrowDown'
								? key
								: 'Key' + key[0].toUpperCase() + key.slice(1),
	}
}

function getPointerEvent(editor: Editor) {
	return {
		type: 'pointer',
		name: 'pointer_down',
		target: 'canvas',
		pointerId: 1,
		button: 0,
		isPen: editor.inputs.isPen,
		shiftKey: editor.inputs.shiftKey,
		altKey: editor.inputs.altKey,
		ctrlKey: editor.inputs.ctrlKey,
		point: editor.inputs.currentScreenPoint.toJson(),
	} as const
}

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

	let result = `There are currently ${shapes.length} shapes on the page. Starting from the back-most and working our way forward in z-order, they are:`

	for (const shape of shapes) {
		const pageBounds = editor.getShapePageBounds(shape)!
		result += `\n- ${
			shape.type === 'geo' ? (shape as TLGeoShape).props.geo : shape.type
		} (${pageBounds.x.toFixed(0)},${pageBounds.y.toFixed(0)},${pageBounds.w.toFixed(
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

export async function pointerMoveTo(
	editor: Editor,
	from: { x: number; y: number },
	to: { x: number; y: number }
) {
	const steps = 12
	const _from = editor.pageToScreen(from)
	const _to = editor.pageToScreen(to)

	for (let i = 1; i <= steps; i++) {
		const point = Vec.Lrp(_from, _to, i / steps)
		editor.dispatch({
			...getPointerEvent(editor),
			name: 'pointer_move',
			point,
		})
		await waitFrame()
	}
}

export async function pointerMove(editor: Editor, { x, y }: { x: number; y: number }) {
	const pointInScreenSpace = editor.pageToScreen({ x, y })
	editor.dispatch({
		...getPointerEvent(editor),
		name: 'pointer_move',
		point: pointInScreenSpace,
	})
	await waitFrame()
}

export async function pointerDown(editor: Editor) {
	const { x, y } = editor.inputs.currentScreenPoint
	editor.dispatch({
		...getPointerEvent(editor),
		name: 'pointer_down',
		point: { x, y },
	})
	await waitFrame()
}

export async function pointerUp(editor: Editor) {
	const { x, y } = editor.inputs.currentScreenPoint
	editor.dispatch({
		...getPointerEvent(editor),
		name: 'pointer_up',
		point: { x, y },
	})
	await waitFrame()
}

export async function click(editor: Editor, { x, y }: { x: number; y: number }) {
	const pointInScreenSpace = editor.pageToScreen({ x, y })
	pointerMove(editor, pointInScreenSpace)
	pointerDown(editor)
	pointerUp(editor)
	editor.cancelDoubleClick()
	await waitFrame()
}

export async function doubleClick(editor: Editor, { x, y }: { x: number; y: number }) {
	const pointInScreenSpace = editor.pageToScreen({ x, y })
	pointerMove(editor, pointInScreenSpace)
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

export async function keyDown(editor: Editor, { key }: { key: string }) {
	editor.dispatch({
		...getKeyboardEvent(editor, key),
		name: 'key_down',
	})
	await waitFrame()
}

export async function keyUp(editor: Editor, { key }: { key: string }) {
	editor.dispatch({
		...getKeyboardEvent(editor, key),
		name: 'key_up',
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
		case 'draw': {
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

export async function createTextShape(editor: Editor, x: number, y: number, ...text: string[]) {
	editor.createShape<TLTextShape>({
		id: createShapeId(),
		type: 'text',
		x,
		y: y - 12,
		props: {
			size: 'm',
			text: text.join(' '),
			align: 'start',
		},
	})
	await waitFrame()
}

export async function createRectangleShape(
	editor: Editor,
	x: number,
	y: number,
	w: number,
	h: number,
	color: string,
	...text: string[]
) {
	editor.createShape<TLGeoShape>({
		id: createShapeId(),
		type: 'geo',
		x,
		y,
		props: {
			geo: 'rectangle',
			w,
			h,
			size: 'm',
			text: text.join(' '),
			color: color as any,
			align: 'middle',
			verticalAlign: 'middle',
		},
	})
	await waitFrame()
}
