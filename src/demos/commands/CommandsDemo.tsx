import { TLEditorComponents, Tldraw, useEditor } from '@tldraw/tldraw'
import { useCallback, useEffect, useMemo, useState } from 'react'
import { UserPrompt } from '../../components/UserPrompt'
import { assert } from '../../lib/utils'
import { OpenAiCommandsAssistant, OpenAiCommandsThread } from './OpenAiCommandsAssistant'

const components: TLEditorComponents = {
	InFrontOfTheCanvas: () => {
		const editor = useEditor()
		const assistant = useMemo(() => new OpenAiCommandsAssistant(), [])
		const [thread, setThread] = useState<OpenAiCommandsThread | null>(null)

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

export default function CommandsDemo() {
	return (
		<div className="tldraw__editor">
			<Tldraw autoFocus persistenceKey="tldraw_llm_starter" components={components} />
		</div>
	)
}
