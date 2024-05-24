import { Editor } from '@tldraw/tldraw'
import OpenAI from 'openai'
import { ChatCompletionStream } from 'openai/lib/ChatCompletionStream.mjs'
import { Assistant, Thread } from '../../Assistant'
import { fetchText } from '../../lib/fetchText'
import { assert } from '../../lib/utils'
import { EditorDriverApi } from './EditorDriverApi'
import commandsPrompt from './completions-prompt.md'
import { getUserMessage } from './getUserMessage'

const apiKey = process.env.OPENAI_API_KEY ?? null

if (!apiKey) {
	throw Error(
		`Error: OpenAI API key not found, please create an API Key in the OpenAI platform and add it as .env.VITE_OPENAI_API_KEY`
	)
}

const openai = new OpenAI({
	apiKey: process.env.OPENAI_API_KEY!,
	dangerouslyAllowBrowser: true,
})

export class CompletionCommandsAssistant implements Assistant<ChatCompletionStream> {
	constructor() {}

	systemPrompt: string | null = null

	getDefaultSystemPrompt(): Promise<string> {
		return fetchText(commandsPrompt)
	}

	async setSystemPrompt(prompt: string) {
		this.systemPrompt = prompt
	}

	async createThread(editor: Editor) {
		const systemPrompt = this.systemPrompt ?? (await this.getDefaultSystemPrompt())
		return new CompletionCommandsThread(systemPrompt, editor)
	}
}

export class CompletionCommandsThread implements Thread<ChatCompletionStream> {
	messages: OpenAI.Chat.Completions.ChatCompletionMessageParam[]

	constructor(
		systemPrompt: string,
		readonly editor: Editor
	) {
		this.messages = [
			{
				role: 'system',
				content: systemPrompt,
			},
		]
	}

	getUserMessage(input: string) {
		return getUserMessage(this.editor, input)
	}

	currentStream: ChatCompletionStream | null = null

	async sendMessage(userMessage: string) {
		if (this.currentStream) {
			this.messages.pop()
			await this.cancel()
		}

		this.messages.push({
			role: 'user',
			content: userMessage,
		})

		const stream = openai.beta.chat.completions.stream({
			model: 'gpt-4o',
			max_tokens: 4096,
			temperature: 0,
			seed: 42,
			n: 1,
			messages: this.messages,
		})

		this.currentStream = stream

		return stream
	}

	async cancel() {
		if (this.currentStream) {
			this.currentStream.abort()
			this.currentStream = null
		}
	}

	async handleAssistantResponse(stream: ChatCompletionStream) {
		assert(this.currentStream === stream)

		const api = new EditorDriverApi(this.editor)

		return new Promise<void>((resolve, reject) => {
			stream.on('content', (_delta, snapshot) => {
				if (stream.aborted) return

				// Tell the driver API to process the whole snapshot
				api.processSnapshot(snapshot)
			})

			stream.on('finalContent', (snapshot) => {
				if (stream.aborted) return

				// Tell the driver API to complete
				api.complete()

				// Add the assistant's response to the thread
				this.messages.push({
					role: 'assistant',
					content: snapshot,
				})
				resolve()
				this.currentStream = null
			})

			stream.on('abort', () => {
				reject(new Error('Stream aborted'))
				this.currentStream = null
			})

			stream.on('error', (err) => {
				console.error(err)
				reject(err)
				this.currentStream = null
			})

			stream.on('end', () => {
				resolve()
				this.currentStream = null
			})
		})
	}
}
