import { useMemo } from 'react'
import { TLEditorComponents, Tldraw } from 'tldraw'
import { UserPrompt } from '../../components/UserPrompt'
import { OpenAiCommandsAssistant } from './OpenAiCommandsAssistant'

const components: TLEditorComponents = {
	InFrontOfTheCanvas: () => {
		const assistant = useMemo(() => new OpenAiCommandsAssistant(), [])
		return <UserPrompt assistant={assistant} />
	},
}

export default function CommandsDemo() {
	return (
		<div className="tldraw__editor">
			<Tldraw autoFocus persistenceKey="tldraw_llm_starter" components={components} />
		</div>
	)
}
