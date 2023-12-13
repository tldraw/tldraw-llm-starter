import { TLEditorComponents, Tldraw, useEditor } from '@tldraw/tldraw'
import '@tldraw/tldraw/tldraw.css'
import { useCallback } from 'react'
import { UserPrompt } from '../../components/UserPrompt'
import { getUserMessage } from './getUserMessage'
import { useOpenAiAssistantWithFunctionCalling } from './useOpenAiAssistantWithFunctionCalling'

const components: TLEditorComponents = {
	InFrontOfTheCanvas: () => {
		const editor = useEditor()
		const { start, restart, cancel } = useOpenAiAssistantWithFunctionCalling()

		const startWithPrompt = useCallback(
			async (input: string) => {
				const userMessage = getUserMessage(editor, input)
				await start(userMessage)
			},
			[editor, start]
		)

		return <UserPrompt assistant={{ start: startWithPrompt, restart, cancel }} />
	},
}

export default function FunctionCallingDemo() {
	return (
		<div className="tldraw__editor">
			<Tldraw autoFocus persistenceKey="tldraw_llm_starter" components={components} />
		</div>
	)
}
