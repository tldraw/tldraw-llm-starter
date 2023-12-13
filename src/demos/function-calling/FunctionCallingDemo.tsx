import { TLEditorComponents, Tldraw } from '@tldraw/tldraw'
import '@tldraw/tldraw/tldraw.css'
import { useMemo } from 'react'
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
