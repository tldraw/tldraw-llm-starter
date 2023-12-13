import { Editor } from '@tldraw/tldraw'
import { pointerDown, pointerMove, pointerUp, selectTool } from './functions'

const commands = [
	{
		keyword: 'POINTER_DOWN',
		description: 'Begin pointing (clicking) with the pointer at its current position on the page.',
		parameters: [],
	},
	{
		keyword: 'POINTER_UP',
		description: 'Stop pointing (clicking) the pointer at its current position on the page.',
		parameters: [],
	},
	{
		keyword: 'POINTER_MOVE',
		description: 'Move the pointer to a new position on the page.',
		parameters: [
			{
				name: 'x',
				type: 'number',
				description: 'The x coordinate of the new pointer position.',
			},
			{
				name: 'y',
				type: 'number',
				description: 'The y coordinate of the new pointer position.',
			},
		],
	},
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
		keyword: 'KEY_DOWN',
		description: 'Begin holding a key.',
		parameters: [
			{
				name: 'key',
				type: 'string',
				enum: ['alt', 'shift', 'control'],
				description: 'The key to press',
			},
		],
	},
	{
		keyword: 'KEY_UP',
		description: 'Release a key.',
		parameters: [
			{
				name: 'key',
				type: 'string',
				enum: ['alt', 'shift', 'control'],
				description: 'The key to release',
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
				enum: ['select', 'draw', 'box', 'ellipse', 'arrow'],
			},
		],
	},
] as const

type CapturedCommand = { command: (typeof commands)[number]; parameters: string[] }

export class EditorDriverApi {
	constructor(public editor: Editor) {
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
		console.log(this.snapshot)
	}

	queue: CapturedCommand[] = []

	async executeCommand(command: CapturedCommand) {
		this.queue.push(command)

		if (this.queue.length === 1) {
			return await this.executeNextInQueue()
		}
	}

	async executeNextInQueue(): Promise<void> {
		const command = this.queue.shift()
		if (!command) return

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

		console.log(name, params)

		switch (name) {
			case 'POINTER_DOWN': {
				pointerDown(this.editor)
				break
			}
			case 'POINTER_UP': {
				pointerUp(this.editor)
				break
			}
			case 'POINTER_MOVE': {
				const [x, y] = params as [number, number, string]
				await pointerMove(this.editor, { x, y })
				break
			}
			case 'POINTER_DRAG': {
				const [x1, y1, x2, y2, modifiers] = params as [number, number, number, number, string]
				if (modifiers.includes('alt')) {
				}
				pointerMove(this.editor, { x: x1, y: y1 })
				pointerDown(this.editor)
				await pointerMove(this.editor, { x: x2, y: y2 })
				break
			}
			case 'TOOL': {
				const [tool] = params as [string]
				selectTool(this.editor, { tool })
			}
		}

		return await this.executeNextInQueue()
	}
}
