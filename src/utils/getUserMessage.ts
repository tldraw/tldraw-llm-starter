import { Editor } from '@tldraw/tldraw'
import { getCurrentPageDescription } from './getCurrentPageDescription'
import { getCurrentViewportDescription } from './getCurrentViewportDescription'

export function getUserMessage(editor: Editor, prompt: string) {
	let result = ''

	result += getCurrentViewportDescription(editor)
	result += '\n\n'
	result += getCurrentPageDescription(editor)
	result += '\n\n'
	result += `Prompt: ${prompt}`

	return result
}
