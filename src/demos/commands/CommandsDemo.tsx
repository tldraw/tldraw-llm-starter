import { TLEditorComponents, Tldraw } from '@tldraw/tldraw'
import { UserPrompt } from './UserPrompt'

const components: TLEditorComponents = {
	InFrontOfTheCanvas: () => {
		return <UserPrompt />
	},
}

export default function CommandsDemo() {
	return (
		<div className="tldraw__editor">
			<Tldraw autoFocus persistenceKey="tldraw_llm_starter" components={components} />
		</div>
	)
}
