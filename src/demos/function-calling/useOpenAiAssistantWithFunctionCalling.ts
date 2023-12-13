import { useEditor } from '@tldraw/tldraw'
import { default as OpenAI } from 'openai'
import { useCallback, useEffect, useRef } from 'react'
import {
	getCurrentPageDescription,
	getCurrentPointer,
	getCurrentViewportDescription,
	placeText,
	pointerDown,
	pointerMove,
	pointerUp,
	selectTool,
} from './functions'

const apiKey = process.env.OPENAI_API_KEY ?? null
const assistantId = process.env.OPENAI_FUNCTIONS_ASSISTANT_ID ?? null

if (!apiKey) {
	throw Error(
		`Error: OpenAI API key not found, please create an API Key in the OpenAI platform and add it as .env.VITE_OPENAI_API_KEY`
	)
}

if (!assistantId) {
	throw Error(
		`Error: Assistant ID not found, please create an assistant in the OpenAI platform playground and add its id to .env.VITE_OPENAI_ASSISTANT_ID`
	)
}

const openai = new OpenAI({
	apiKey: process.env.VITE_OPENAI_API_KEY!,
	dangerouslyAllowBrowser: true,
})

export function useOpenAiAssistantWithFunctionCalling() {
	const editor = useEditor()

	const rAssistant = useRef<OpenAI.Beta.Assistants.Assistant | null>(null)
	const rThread = useRef<OpenAI.Beta.Threads.Thread | null>(null)
	const rRun = useRef<OpenAI.Beta.Threads.Run | null>(null)

	const restart = useCallback(async function setup(isCancelled: () => boolean = () => false) {
		const prompt = await fetch('./function-calling-prompt.md').then((r) => r.text())
		if (isCancelled()) return
		if (!prompt) {
			throw Error(`Error: Prompt not found, please add one at public/function-calling-prompt.md`)
		}

		const assistant = await openai.beta.assistants.update(assistantId!, {
			instructions: prompt,
			model: 'gpt-4-32k-0613',
			tools: [
				{
					type: 'function',
					function: {
						name: 'getCurrentViewport',
						description: "Get the current viewport's page coordinates.",
						parameters: {
							type: 'object',
							properties: {},
						},
					},
				},
				{
					type: 'function',
					function: {
						name: 'getCurrentPage',
						description: 'Get the current page description.',
						parameters: {
							type: 'object',
							properties: {},
						},
					},
				},
				{
					type: 'function',
					function: {
						name: 'getCurrentPointer',
						description: 'Get the current pointer coordinates on the page.',
						parameters: {
							type: 'object',
							properties: {},
						},
					},
				},
				// {
				// 	type: 'function',
				// 	function: {
				// 		name: 'startShape',
				// 		description:
				// 			'Start drawing a new shape. The shape provided will help identify what you created later.',
				// 		parameters: {
				// 			type: 'object',
				// 			properties: {
				// 				name: {
				// 					type: 'string',
				// 				},
				// 			},
				// 		},
				// 	},
				// },
				// {
				// 	type: 'function',
				// 	function: {
				// 		name: 'endShape',
				// 		description: 'Stop drawing the current shape.',
				// 		parameters: {
				// 			type: 'object',
				// 			properties: {},
				// 		},
				// 	},
				// },
				{
					type: 'function',
					function: {
						name: 'pointerMove',
						description: 'Move the cursor the provided coordinates on the page.',
						parameters: {
							type: 'object',
							properties: {
								x: {
									type: 'number',
									description: 'The x coordinate',
								},
								y: {
									type: 'number',
									description: 'The y coordinate',
								},
							},
						},
					},
				},
				{
					type: 'function',
					function: {
						name: 'pointerDown',
						description: "Start pointing at the cursor's current coordinates.",
						parameters: {
							type: 'object',
							properties: {},
						},
					},
				},
				{
					type: 'function',
					function: {
						name: 'pointerUp',
						description: "Stop pointing at the cursor's current coordinates.",
						parameters: {
							type: 'object',
							properties: {},
						},
					},
				},
				{
					type: 'function',
					function: {
						name: 'placeText',
						description: 'Place a text label centered on the provided coordinates.',
						parameters: {
							type: 'object',
							properties: {
								text: {
									type: 'string',
									description: 'The text to place',
								},
								x: {
									type: 'number',
									description: 'The x coordinate',
								},
								y: {
									type: 'number',
									description: 'The y coordinate',
								},
							},
						},
					},
				},
				{
					type: 'function',
					function: {
						name: 'selectTool',
						description: 'Select a new tool.',
						parameters: {
							type: 'object',
							properties: {
								tool: {
									type: 'string',
									enum: ['select', 'draw', 'box', 'ellipse', 'arrow'],
								},
							},
						},
					},
				},
			],
		})
		if (isCancelled()) return

		if (!assistant) {
			throw Error(`Error: could not update assistant.`)
		}

		rAssistant.current = assistant

		const thread = await openai.beta.threads.create()
		if (isCancelled()) return

		if (!thread) {
			throw Error(`Error: could not create thread.`)
		}

		rThread.current = thread
	}, [])

	useEffect(() => {
		if (!rAssistant.current || !rThread.current) {
			let isCancelled = false
			restart(() => isCancelled)
			return () => {
				isCancelled = true
			}
		}
	})

	const start = useCallback(
		async (userMessage: string) => {
			const thread = rThread.current
			const assistant = rAssistant.current

			if (!thread) return { status: 'not ready', run: null } as const
			if (!assistant) return { status: 'not ready', run: null } as const

			await openai.beta.threads.messages.create(thread.id, {
				role: 'user',
				content: userMessage,
			})

			// Create and start a new run
			const run = await openai.beta.threads.runs.create(thread.id, {
				assistant_id: assistant.id,
			})

			rRun.current = run

			let currentRun: OpenAI.Beta.Threads.Runs.Run | null = null

			// eslint-disable-next-line no-constant-condition
			while (true) {
				await new Promise((resolve) => setTimeout(resolve, 100))

				currentRun = await openai.beta.threads.runs.retrieve(thread.id, run.id)

				switch (currentRun.status) {
					case 'requires_action': {
						const toolCalls = currentRun.required_action?.submit_tool_outputs?.tool_calls
						if (!toolCalls) {
							await openai.beta.threads.runs.cancel(thread.id, run.id)
							return { status: 'unknown action', run: currentRun } as const
						}

						const toolOutputs: OpenAI.Beta.Threads.Runs.RunSubmitToolOutputsParams['tool_outputs'] =
							[]

						for (const call of toolCalls) {
							const {
								id,
								function: { name },
							} = call

							console.log(`calling ${name} with arguments: ${call.function.arguments}`)

							switch (name) {
								case 'getCurrentViewport': {
									const page = getCurrentViewportDescription(editor)
									toolOutputs.push({
										tool_call_id: id,
										output: JSON.stringify(page.toJson()),
									})
									break
								}
								case 'getCurrentPage': {
									const page = getCurrentPageDescription(editor)
									toolOutputs.push({
										tool_call_id: id,
										output: page,
									})
									break
								}
								case 'getCurrentPointer': {
									const { x, y } = getCurrentPointer(editor)
									toolOutputs.push({
										tool_call_id: id,
										output: JSON.stringify({ x, y }),
									})
									break
								}
								case 'pointerMove': {
									await pointerMove(editor, JSON.parse(call.function.arguments))
									toolOutputs.push({
										tool_call_id: id,
										output: 'success',
									})
									break
								}
								case 'pointerDown': {
									await pointerDown(editor)
									toolOutputs.push({
										tool_call_id: id,
										output: 'success',
									})
									break
								}
								case 'pointerUp': {
									await pointerUp(editor)
									toolOutputs.push({
										tool_call_id: id,
										output: 'success',
									})
									break
								}
								case 'selectTool': {
									selectTool(editor, JSON.parse(call.function.arguments))
									toolOutputs.push({
										tool_call_id: id,
										output: 'success',
									})
									break
								}
								case 'placeText': {
									placeText(editor, JSON.parse(call.function.arguments))
									toolOutputs.push({
										tool_call_id: id,
										output: 'success',
									})
									break
								}
								case 'startShape': {
									toolOutputs.push({
										tool_call_id: id,
										output: 'ok',
									})
									break
								}
								case 'endShape': {
									toolOutputs.push({
										tool_call_id: id,
										output: 'ok',
									})
									break
								}
								default: {
									// cancel run
									console.error(`Unknown tool call: ${name}`)
									await openai.beta.threads.runs.cancel(thread.id, run.id)
									return { status: 'unknown action', run: currentRun } as const
								}
							}
						}

						await openai.beta.threads.runs.submitToolOutputs(thread.id, run.id, {
							tool_outputs: toolOutputs,
						})

						break
					}
					case 'expired': {
						rRun.current = null
						return { status: 'failure', run: currentRun } as const
					}
					case 'failed': {
						rRun.current = null
						return { status: 'failure', run: currentRun } as const
					}
					case 'completed': {
						const messages = await openai.beta.threads.messages.list(thread.id)
						const mostRecent = messages.data[0]
						const results: string[] = []
						for (const content of mostRecent.content) {
							if (content.type === 'text') {
								results.push(content.text.value)
							}
						}

						console.log(results.join('\n\n'))
						rRun.current = null
						return { status: 'success', run: currentRun } as const
					}
					case 'in_progress':
					case 'queued': {
						break
					}
					default: {
						break
					}
				}
			}
		},
		[editor]
	)

	async function cancel() {
		const thread = rThread.current
		const run = rRun.current
		if (!run || !thread) return
		await openai.beta.threads.runs.cancel(thread!.id, run.id)
	}

	return { start, cancel, restart }
}
