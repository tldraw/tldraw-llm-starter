import { TLEditorComponents, Tldraw } from '@tldraw/tldraw'
import '@tldraw/tldraw/tldraw.css'
import { UserPrompt } from './components/UserPrompt'

const components: TLEditorComponents = {
	InFrontOfTheCanvas: () => {
		return <UserPrompt />
	},
}

export default function App() {
	return (
		<div className="tldraw__editor">
			<Tldraw
				autoFocus
				persistenceKey="tldraw_llm_starter"
				components={components}
			/>
		</div>
	)
}
