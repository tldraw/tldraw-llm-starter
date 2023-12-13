import { Editor } from '@tldraw/tldraw'

export interface Assistant<T> {
	/** Threads are created from assistants. */
	createThread(editor: Editor): Promise<Thread<T>>
}

export interface Thread<T> {
	/** 1. An input prompt is turned into a full user message */
	getUserMessage(input: string): string
	/** 2. The user message is send to the LLM which sends back a response */
	sendMessage(input: string): Promise<T>
	/** 3. The response is used to control the editor */
	handleAssistantResponse(result: T): Promise<void>
	cancel(): void
}
