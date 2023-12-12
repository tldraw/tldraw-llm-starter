import OpenAI from 'openai'
import { useCallback, useEffect, useRef, useState } from 'react'

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
	apiKey: process.env.VITE_OPENAI_API_KEY!,
	dangerouslyAllowBrowser: true,
})

export function useOpenAiAssistant() {
	const rAssistant = useRef<OpenAI.Beta.Assistants.Assistant | null>(null)
	const rThread = useRef<OpenAI.Beta.Threads.Thread | null>(null)
	const rRun = useRef<OpenAI.Beta.Threads.Run | null>(null)

	const restart = useCallback(async function setup() {
		const prompt = await fetch('./prompt.md').then((r) => r.text())
		if (!prompt) {
			throw Error(`Error: Prompt not found, please add one at public/prompt.md`)
		}

		const assistant = await openai.beta.assistants.update(assistantId!, {
			instructions: prompt,
			model: 'gpt-4-32k-0613',
		})

		if (!assistant) {
			throw Error(`Error: could not update assistant.`)
		}

		rAssistant.current = assistant

		const thread = await openai.beta.threads.create()

		if (!thread) {
			throw Error(`Error: could not create thread.`)
		}

		rThread.current = thread
	}, [])

	useEffect(() => {
		if (!rAssistant.current || !rThread.current) {
			restart()
		}
	}, [rAssistant.current, rThread.current])

	const start = useCallback(async (userMessage: string) => {
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

		const startTime = Date.now()

		let currentRun: OpenAI.Beta.Threads.Runs.Run | null = null

		// eslint-disable-next-line no-constant-condition
		while (true) {
			await new Promise((resolve) => setTimeout(resolve, 500))
			const duration = Date.now() - startTime

			// Cancel after 30 seconds
			if (duration > 30 * 1000) {
				await openai.beta.threads.runs.cancel(thread.id, run.id)
				break
			}

			currentRun = await openai.beta.threads.runs.retrieve(thread.id, run.id)

			switch (currentRun.status) {
				case 'requires_action': {
					rRun.current = null
					return { status: 'requires action', run: currentRun } as const
				}
				case 'expired': {
					rRun.current = null
					return { status: 'expired', run: currentRun } as const
				}
				case 'failed': {
					rRun.current = null
					return { status: 'failed', run: currentRun } as const
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

					console.log(results)
					rRun.current = null
					return { status: 'success', results, run: currentRun } as const
				}
			}
		}

		rRun.current = null
		return { status: 'unknown', run: currentRun } as const
	}, [])

	async function cancel() {
		const thread = rThread.current
		const run = rRun.current
		if (!run || !thread) return
		return await openai.beta.threads.runs.cancel(thread!.id, run.id)
	}

	return { start, cancel, restart }
}
