import { Editor } from '@tldraw/tldraw'
import OpenAI from 'openai'
import { fetchText } from '../../lib/fetchText'
import { delayMs } from '../../lib/utils'
import { Assistant, Thread } from '../../types'
import commandsPrompt from './commands-prompt.md'
import { getUserMessage } from './getUserMessage'
import { parseSequence } from './parseSequence'

const apiKey = process.env.OPENAI_API_KEY ?? null
const assistantId = process.env.OPENAI_ASSISTANT_ID ?? null

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
	apiKey: process.env.OPENAI_API_KEY!,
	dangerouslyAllowBrowser: true,
})

export class OpenAiCommandsAssistant implements Assistant<string[]> {
	constructor() {}

	assistantPromise: Promise<OpenAI.Beta.Assistants.Assistant> | null = null
	getAssistant() {
		if (!this.assistantPromise) {
			this.assistantPromise = (async () => {
				const prompt = await fetchText(commandsPrompt)

				return await openai.beta.assistants.update(assistantId!, {
					instructions: prompt,
					model: 'gpt-4-32k-0613',
				})
			})()
		}
		return this.assistantPromise
	}

	async createThread(editor: Editor) {
		const assistant = await this.getAssistant()
		const thread = await openai.beta.threads.create()
		return new OpenAiCommandsThread(assistant, thread, editor)
	}
}

export class OpenAiCommandsThread implements Thread<string[]> {
	constructor(
		readonly assistant: OpenAI.Beta.Assistants.Assistant,
		readonly thread: OpenAI.Beta.Threads.Thread,
		readonly editor: Editor
	) {}

	current: { run: OpenAI.Beta.Threads.Run | null } | null = null

	getUserMessage(input: string) {
		return getUserMessage(this.editor, input)
	}

	async sendMessage(userMessage: string) {
		if (this.current) {
			throw new Error('Cannot send message while another message is being sent.')
		}
		this.current = { run: null }

		await openai.beta.threads.messages.create(this.thread.id, {
			role: 'user',
			content: userMessage,
		})

		const run = await openai.beta.threads.runs.create(this.thread.id, {
			assistant_id: this.assistant.id,
		})
		const runId = run.id
		this.current.run = run

		// eslint-disable-next-line no-constant-condition
		while (true) {
			await delayMs(500)
			const run = await openai.beta.threads.runs.retrieve(this.thread.id, runId)

			switch (run.status) {
				case 'in_progress':
				case 'queued':
					continue
				case 'completed': {
					const messages = await openai.beta.threads.messages.list(this.thread.id)
					const mostRecent = messages.data[0]
					const results = []
					for (const content of mostRecent.content) {
						if (content.type === 'text') {
							results.push(content.text.value)
						}
					}

					console.log(results.join('\n\n'))

					this.current = null
					return results
				}
				default:
					this.current = null
					throw Error(`Error: run failed with status ${run.status}`)
			}
		}
	}

	async cancel() {
		if (this.current?.run) {
			await openai.beta.threads.runs.cancel(this.thread.id, this.current.run.id)
		}
		this.current = null
	}

	async handleAssistantResponse(results: string[]) {
		for (const text of results) {
			await parseSequence(this.editor, text)
		}
	}
}
