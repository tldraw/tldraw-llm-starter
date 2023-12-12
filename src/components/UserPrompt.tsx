import {
	stopEventPropagation,
	useEditor,
	useLocalStorageState,
} from '@tldraw/tldraw'
import { useCallback, useRef, useState } from 'react'
import { getUserMessage } from '../utils/getUserMessage'
import { parseSequence } from '../utils/parseSequence'
import { useOpenAiAssistant } from '../hooks/useOpenAiAssistant'

export function UserPrompt() {
	const editor = useEditor()

	const { restart, cancel, start } = useOpenAiAssistant()

	const rInput = useRef<HTMLTextAreaElement>(null)
	const [state, setState] = useState<'ready' | 'waiting'>('ready')
	const [text, setText] = useLocalStorageState(
		'prompt-input',
		'Create a box at the center of the viewport.'
	)

	const handleSendButtonClick = useCallback(async () => {
		if (state === 'waiting') {
			await cancel()
			setState('ready')
			return
		}

		if (state === 'ready') {
			const input = rInput.current
			if (!input) return
			setState('waiting')

			// Send the user message to the thread
			const userMessage = getUserMessage(editor, input.value)
			console.log(userMessage)
			const result = await start(userMessage)
			switch (result.status) {
				case 'success': {
					for (const text of result.results) {
						await parseSequence(editor, text)
					}
				}
			}

			setState('ready')
		}
	}, [editor, state])

	const handleRestartButtonClick = useCallback(() => {
		const ids = Array.from(editor.getCurrentPageShapeIds().values())
		editor.deleteShapes(ids)
		restart()
	}, [editor, restart])

	return (
		<>
			{state === 'waiting' && (
				<div
					className="user-prompt__overlay"
					onPointerMove={stopEventPropagation}
					onPointerDown={stopEventPropagation}
				/>
			)}
			<div
				className="user-prompt__container"
				onPointerDown={stopEventPropagation}
			>
				<textarea
					ref={rInput}
					value={text}
					onChange={(e) => setText(e.currentTarget.value)}
				/>
				<div className="user-prompt__buttons">
					<button className="tlui-button" onClick={handleRestartButtonClick}>
						Restart
					</button>
					<button
						className="tlui-button tlui-button__primary"
						onClick={handleSendButtonClick}
					>
						{state === 'ready' ? 'Send' : 'Cancel'}
					</button>
				</div>
			</div>
		</>
	)
}
