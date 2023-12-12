import { Editor } from '@tldraw/tldraw'
import { getCurrentPageDescription } from './getCurrentPageDescription'
import { getCurrentViewportDescription } from './getCurrentViewportDescription'

export function getUserMessage(editor: Editor, prompt: string) {
	let result = ''

	result += 'Current viewport:\n'
	result += getCurrentViewportDescription(editor)
	result += '\n\n'
	result += 'Current page:\n'
	result += getCurrentPageDescription(editor)
	result += '\n\n'
	result += 'Prompt:\n'
	result += prompt

	return result
}
