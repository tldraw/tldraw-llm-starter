import { useMemo } from 'react'
import { TLEditorComponents, Tldraw } from 'tldraw'
import 'tldraw/tldraw.css'
import { UserPrompt } from '../../components/UserPrompt'
import { OpenAiWithFunctionCallingAssistant } from './OpenAiAssistantWithFunctionCalling'

const components: TLEditorComponents = {
	InFrontOfTheCanvas: () => {
		const assistant = useMemo(() => new OpenAiWithFunctionCallingAssistant(), [])
		return <UserPrompt assistant={assistant} />
	},
}

export default function FunctionCallingDemo() {
	return (
		<div className="tldraw__editor">
			<Tldraw autoFocus persistenceKey="tldraw_llm_starter" components={components} />
		</div>
	)
}
