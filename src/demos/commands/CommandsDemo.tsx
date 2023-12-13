import { TLEditorComponents, Tldraw, useEditor } from '@tldraw/tldraw'
import { useCallback } from 'react'
import { UserPrompt } from '../../components/UserPrompt'
import { getUserMessage } from './getUserMessage'
import { parseSequence } from './parseSequence'
import { useOpenAiAssistant } from './useOpenAiAssistant'

const components: TLEditorComponents = {
	InFrontOfTheCanvas: () => {
		const editor = useEditor()
		const { start, restart, cancel } = useOpenAiAssistant()

		const startWithPrompt = useCallback(
			async (input: string) => {
				const userMessage = getUserMessage(editor, input)
				console.log(userMessage)
				const result = await start(userMessage)
				if (result.status === 'success') {
					for (const text of result.results) {
						await parseSequence(editor, text)
					}
				}
			},
			[editor, start]
		)

		return <UserPrompt assistant={{ start: startWithPrompt, restart, cancel }} />
	},
}

export default function CommandsDemo() {
	return (
		<div className="tldraw__editor">
			<Tldraw autoFocus persistenceKey="tldraw_llm_starter" components={components} />
		</div>
	)
}
