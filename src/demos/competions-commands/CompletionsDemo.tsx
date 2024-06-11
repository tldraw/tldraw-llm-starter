import { useMemo } from 'react'
import { TLEditorComponents, Tldraw } from 'tldraw'
import 'tldraw/tldraw.css'
import { UserPrompt } from '../../components/UserPrompt'
import { CompletionCommandsAssistant } from './CompletionsCommandsAssistant'

const components: TLEditorComponents = {
	InFrontOfTheCanvas: () => {
		const assistant = useMemo(() => new CompletionCommandsAssistant(), [])
		return <UserPrompt assistant={assistant} />
	},
}

export default function CompletionsDemo() {
	return (
		<div className="tldraw__editor">
			<Tldraw autoFocus persistenceKey="tldraw_llm_starter" components={components} />
		</div>
	)
}
