import { Editor, Vec2d } from '@tldraw/tldraw'
import {
	pointerDown,
	pointerMove,
	pointerMoveTo,
	pointerUp,
	selectTool,
	waitTick,
} from './functions'

export const commands = [
	{
		keyword: 'POINTER_DRAG',
		description: 'Drag the pointer between two positions on the page.',
		parameters: [
			{
				name: 'x1',
				type: 'number',
				description: 'The x coordinate of the first pointer position.',
			},
			{
				name: 'y1',
				type: 'number',
				description: 'The y coordinate of the first pointer position.',
			},
			{
				name: 'x2',
				type: 'number',
				description: 'The x coordinate of the secomd pointer position.',
			},
			{
				name: 'y2',
				type: 'number',
				description: 'The y coordinate of the second pointer position.',
			},
		],
	},
	{
		keyword: 'TOOL',
		description: 'Switch to the provided tool.',
		parameters: [
			{
				name: 'tool',
				type: 'string',
				enum: ['draw'],
			},
		],
	},
] as const

type CapturedCommand = { command: (typeof commands)[number]; parameters: string[] }

export class EditorDriverApi {
	constructor(
		public editor: Editor,
		public camera: Vec2d
	) {
		editor.updateInstanceState({ isToolLocked: true })
	}

	isInSequence = false

	cursor = 0

	snapshot = ''

	addChunk(chunk: string) {
		this.snapshot += chunk
		this.processSnapshot(this.snapshot)
	}

	processSnapshot(snapshot: string) {
		// When we hit START, we should begin capturing commands
		// when we hit END, we should stop capturing commands
		// When we hit a ;, we should ignore everything until we hit a command

		// We want to ignore any comments
		// We want to ignore any other content outside of the START and STOP.

		const capturedCommands: CapturedCommand[] = []

		let state = { name: 'not-capturing' } as
			| {
					name: 'command'
					command: CapturedCommand
			  }
			| {
					name: 'not-capturing'
			  }
			| {
					name: 'capturing'
			  }

		let input = snapshot
		// regex to replace all newlines with spaces
		input = input.replace(/[\r\n]+/g, ' ')
		// replace all semicolons with spaces
		input = input.replace(/;/g, ' ;')
		// replace all multiple spaces with a single space
		input = input.replace(/ +/g, ' ')

		for (const word of input.split(' ')) {
			switch (state.name) {
				case 'not-capturing': {
					if (word === '```sequence') {
						state = { name: 'capturing' }
					}
					break
				}
				case 'capturing': {
					if (word === '```') {
						state = { name: 'not-capturing' }
					} else {
						// Are we at a new keyword?
						const newCommand = commands.find((c) => c.keyword === word)

						if (newCommand) {
							// we've hit a keyword
							state = {
								name: 'command',
								command: { command: newCommand, parameters: [] },
							}
						}
					}
					break
				}
				case 'command': {
					const expectedParameters = state.command.command.parameters
					const capturedParameters = state.command.parameters
					const isTerminator = word === ';'
					if (capturedParameters.length === expectedParameters.length) {
						// We have enough parameters, so the next word should be a ;
						if (isTerminator) {
							// we've hit the end of the command
							if (this.cursor === capturedCommands.length) {
								// execute the command
								this.executeCommand(state.command)
								this.cursor++
							}
							capturedCommands.push(state.command)
						} else {
							throw Error(
								`Command ${state.command.command.keyword} was called with additional parameter: ${word}`
							)
						}
						state = { name: 'capturing' }
					} else {
						// expect a parameter
						if (isTerminator) {
							// we've hit the end of the command instead of a parameter
							throw Error(
								`Command ${
									state.command.command.keyword
								} was completed with missing parameter: ${expectedParameters[
									capturedParameters.length
								]?.name}}`
							)
						} else {
							// we've hit the end of the command instead of a parameter
							capturedParameters.push(word)
						}
					}
				}
			}
		}
	}

	complete() {
		this.processSnapshot(this.snapshot)
		this.executeNextInQueue()
		console.log(this.snapshot)
	}

	queue: CapturedCommand[] = []

	isExecuting = false

	async executeCommand(command: CapturedCommand) {
		this.queue.push(command)
		if (!this.isExecuting) {
			this.isExecuting = true
			this.executeNextInQueue()
		}
	}

	async executeNextInQueue(): Promise<void> {
		const command = this.queue.shift()
		if (!command) return

		console.log('starting')

		const name = command.command.keyword
		const params = command.parameters.map((p, i) => {
			const paramInfo = command.command.parameters[i]
			switch (paramInfo.type) {
				case 'number': {
					return eval(p)
				}
				case 'string': {
					return p
				}
			}
		})

		console.log([name, ...params].join(' '))

		const { camera } = this
		const vpb = this.editor.getViewportPageBounds()
		const offset = Vec2d.Sub(this.editor.getCamera(), camera).addXY(vpb.w * 0.32, 0)

		switch (name) {
			case 'POINTER_DRAG': {
				const [x1, y1, x2, y2, _modifiers] = params as [number, number, number, number, string]
				await pointerMove(this.editor, { x: x1 - offset.x, y: y1 - offset.y })
				await pointerDown(this.editor)
				await pointerMoveTo(
					this.editor,
					{ x: x1 - offset.x, y: y1 - offset.y },
					{ x: x2 - offset.x, y: y2 - offset.y }
				)
				await pointerUp(this.editor)
				break
			}
			case 'TOOL': {
				const [tool] = params as [string]
				await selectTool(this.editor, { tool })
			}
		}

		await waitTick(this.editor)

		if (this.queue.length === 0) {
			this.isExecuting = false
		} else {
			await this.executeNextInQueue()
		}
	}
}
