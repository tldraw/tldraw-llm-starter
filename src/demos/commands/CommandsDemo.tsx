import { TLEditorComponents, Tldraw } from '@tldraw/tldraw'
import '@tldraw/tldraw/tldraw.css'
import { UserPrompt } from './UserPrompt'

const components: TLEditorComponents = {
	InFrontOfTheCanvas: () => {
		return <UserPrompt />
	},
}

export function CommandsDemo() {
	return (
		<div className="tldraw__editor">
			<Tldraw autoFocus persistenceKey="tldraw_llm_starter" components={components} />
		</div>
	)
}
