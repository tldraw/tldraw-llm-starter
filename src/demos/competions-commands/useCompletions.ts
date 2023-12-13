import { useEditor } from '@tldraw/tldraw'
import OpenAI from 'openai'
import { ChatCompletionStream } from 'openai/lib/ChatCompletionStream.mjs'
import { useCallback, useRef } from 'react'
import { EditorDriverApi } from './EditorDriverApi'

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

export function useCompletions() {
	const editor = useEditor()
	const rStream = useRef<ChatCompletionStream | null>(null)
	const rMessages = useRef<OpenAI.Chat.Completions.ChatCompletionMessageParam[]>([])

	const start = useCallback(
		async (userMessage: string) => {
			const api = new EditorDriverApi(editor)

			// const snapshot = await fetch('./test-message-1.md').then((r) => r.text())
			// api.processSnapshot(snapshot)
			// return

			const prompt = await fetch('./completions-prompt.md').then((r) => r.text())
			if (!prompt) {
				throw Error(`Error: Prompt not found, please add one at public/completions-prompt.md`)
			}

			return await new Promise<void>((resolve) => {
				const stream = openai.beta.chat.completions.stream({
					model: 'gpt-4',
					messages: [
						{
							role: 'user',
							content: prompt,
						},
						{
							role: 'assistant',
							content: "Sounds good, let's get started!",
						},
						{ role: 'user', content: userMessage },
						...rMessages.current,
					],
				})

				if (!stream) {
					throw Error(`Error: could not create stream.`)
				}

				rStream.current = stream

				stream.on('content', (_delta, snapshot) => {
					if (stream.aborted) return

					// Tell the driver API to process the whole snapshot
					api.processSnapshot(snapshot)
				})

				stream.on('finalContent', (snapshot) => {
					if (stream.aborted) return

					// Tell the driver API to complete
					api.complete()

					// Add the user message to the thread
					rMessages.current.push({ role: 'user', content: userMessage })
					// Add the assistant's response to the thread
					rMessages.current.push({
						role: 'assistant',
						content: snapshot,
					})
					resolve()
				})

				stream.on('abort', () => {
					resolve()
				})

				stream.on('error', (err) => {
					console.error(err)
					resolve()
				})

				stream.on('end', () => {
					resolve()
				})
			})
		},
		[editor]
	)

	async function cancel() {
		const stream = rStream.current

		if (!stream) return

		return stream.abort()
	}

	const restart = useCallback(async function setup() {
		rMessages.current = []
		cancel()
	}, [])

	return { start, cancel, restart }
}
