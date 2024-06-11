import OpenAI from 'openai'
import { ChatCompletionStream } from 'openai/lib/ChatCompletionStream.mjs'
import { useEffect } from 'react'
import { Box, Tldraw, Vec, debounce, getSvgAsImage, useEditor } from 'tldraw'
import { EditorDriverApi } from '../competions-commands/EditorDriverApi'

const commandsPrompt = `
You are a helpful math problem solver.

As an input, you will be shown an image that may include one or more hand-written equations, such as '10 + 10 ='.

As an output, you will respond with a set of instructions (see below) that will draw the answer in the correct location using CLEAR BLOCK LETTERS.

To draw on the canvas, use the following pattern:

\`\`\`sequence
TOOL draw;
POINTER_DRAG x1 y1 x2 y2;
POINTER_DRAG x1 y1 x2 y2;
POINTER_DRAG x1 y1 x2 y2;
\`\`\`

For example, the following sequence will draw the letter "E" its top left corner at the page coordinate (0,0).

\`\`\`sequence
TOOL draw;
POINTER_DRAG 0 0 0 100;
POINTER DRAG 0 0 100 0;
POINTER DRAG 0 50 100 50;
POINTER DRAG 0 100 100 100;
\`\`\`

Return ONLY the sequence that will draw the correct answer to the math problem in the correct location relative to the equals sign.
`

const openai = new OpenAI({
	apiKey: process.env.OPENAI_API_KEY!,
	dangerouslyAllowBrowser: true,
})

function InContext() {
	const editor = useEditor()
	useEffect(() => {
		;(window as any).editor = editor

		let stream: ChatCompletionStream

		const debouncedHandler = debounce(async () => {
			const shapes = editor.getCurrentPageShapesSorted()
			if (shapes.length === 0) return
			const bounds = shapes.reduce<Box>((acc, shape) => {
				Box.Expand(acc, editor.getShapeMaskedPageBounds(shape)!)
				return acc
			}, editor.getShapeMaskedPageBounds(shapes[0])!)

			const svgString = await editor.getSvgString(shapes)
			if (!svgString?.svg) return

			const blob = await getSvgAsImage(editor, svgString.svg, {
				height: svgString.height,
				width: svgString.width,
				type: 'png',
				quality: 1,
				scale: 1,
			})

			const dataUrl = await blobToBase64(blob!)

			if (stream) {
				stream.abort()
			}

			stream = openai.beta.chat.completions.stream({
				model: 'gpt-4o',
				max_tokens: 4096,
				temperature: 0,
				seed: 42,
				n: 1,
				messages: [
					{
						role: 'system',
						content: `${commandsPrompt}`,
					},
					{
						role: 'user',
						content: [
							{
								type: 'text',
								text: `Here's an image. Its coordiates at ${bounds.toJson()}.`,
							},
							{
								type: 'image_url',
								image_url: {
									url: dataUrl,
									detail: 'high',
								},
							},
						],
					},
				],
			})

			const api = new EditorDriverApi(editor, Vec.From(editor.getCamera()))

			await new Promise<void>((resolve, reject) => {
				stream.on('content', (_delta, snapshot) => {
					if (stream.aborted) return

					// Tell the driver API to process the whole snapshot
					api.processSnapshot(snapshot)
				})

				stream.on('finalContent', (snapshot) => {
					if (stream.aborted) return

					// Tell the driver API to complete
					api.complete()

					console.log(stream.messages)
					resolve()
				})

				stream.on('abort', () => {
					reject(new Error('Stream aborted'))
				})

				stream.on('error', (err) => {
					console.error(err)
					reject(err)
				})

				stream.on('end', () => {
					resolve()
				})
			})
		}, 2000)

		return editor.store.listen(debouncedHandler, {
			source: 'user',
			scope: 'document',
		})
	}, [editor])

	return null
}

export default function MathDemo() {
	return (
		<div className="tldraw__editor">
			<Tldraw autoFocus persistenceKey="tldraw_llm_starter">
				<InContext />
			</Tldraw>
		</div>
	)
}

export function blobToBase64(blob: Blob): Promise<string> {
	return new Promise((resolve, _) => {
		const reader = new FileReader()
		reader.onloadend = () => resolve(reader.result as string)
		reader.readAsDataURL(blob)
	})
}
