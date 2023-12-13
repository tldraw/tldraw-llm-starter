import { TLEditorComponents, Tldraw, useEditor } from '@tldraw/tldraw'
import '@tldraw/tldraw/tldraw.css'
import { useCallback, useEffect, useMemo, useState } from 'react'
import { UserPrompt } from '../../components/UserPrompt'
import { assert } from '../../lib/utils'
import {
	CompletionCommandsAssistant,
	CompletionCommandsThread,
} from './CompletionsCommandsAssistant'

const components: TLEditorComponents = {
	InFrontOfTheCanvas: () => {
		const editor = useEditor()
		const assistant = useMemo(() => new CompletionCommandsAssistant(), [])
		const [thread, setThread] = useState<CompletionCommandsThread | null>(null)

		useEffect(() => {
			let isCancelled = false
			;(async () => {
				const thread = await assistant.createThread(editor)
				if (isCancelled) return
				setThread(thread)
			})()
			return () => {
				isCancelled = true
			}
		}, [assistant, editor])

		useEffect(() => {
			if (!thread) return
			return () => {
				thread.cancel()
			}
		}, [thread])

		const start = useCallback(
			async (input: string) => {
				assert(thread)
				const userMessage = thread.getUserMessage(input)
				const result = await thread.sendMessage(userMessage)
				await thread.handleAssistantResponse(result)
			},
			[thread]
		)

		const restart = useCallback(async () => {
			const newThread = await assistant.createThread(editor)
			setThread(newThread)
		}, [assistant, editor])

		const cancel = useCallback(async () => {
			assert(thread)
			await thread.cancel()
		}, [thread])

		if (!thread) return null

		return <UserPrompt assistant={{ start, restart, cancel }} />
	},
}

export default function CompletionsDemo() {
	return (
		<div className="tldraw__editor">
			<Tldraw autoFocus persistenceKey="tldraw_llm_starter" components={components} />
		</div>
	)
}
