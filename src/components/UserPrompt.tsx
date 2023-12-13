import {
	DefaultSpinner,
	stopEventPropagation,
	useEditor,
	useLocalStorageState,
} from '@tldraw/tldraw'
import { useCallback, useRef, useState } from 'react'
import { getUserMessage } from '../demos/commands/getUserMessage'

interface Assistant {
	restart: () => Promise<void>
	cancel: () => Promise<void>
	start: (message: string) => Promise<void>
}

export function UserPrompt({ assistant }: { assistant: Assistant }) {
	const editor = useEditor()
	const { restart, cancel, start } = assistant

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
			await start(input.value)
			setState('ready')
		}
	}, [cancel, editor, start, state])

	const handleRestartButtonClick = useCallback(() => {
		restart()
	}, [restart])

	const handleClearButtonClick = useCallback(() => {
		const ids = Array.from(editor.getCurrentPageShapeIds().values())
		editor.deleteShapes(ids)
	}, [editor])

	return (
		<>
			{state === 'waiting' && (
				<div
					className="user-prompt__overlay"
					onPointerMove={stopEventPropagation}
					onPointerDown={stopEventPropagation}
				>
					<DefaultSpinner />
				</div>
			)}
			<div className="user-prompt__container" onPointerDown={stopEventPropagation}>
				<textarea ref={rInput} value={text} onChange={(e) => setText(e.currentTarget.value)} />
				<div className="user-prompt__buttons">
					<div className="user-prompt__buttons__group">
						<button className="tlui-button" onClick={handleClearButtonClick}>
							Clear Canvas
						</button>
					</div>
					<div className="user-prompt__buttons__group">
						<button className="tlui-button" onClick={handleRestartButtonClick}>
							New Thread
						</button>
						<button
							className="tlui-button tlui-button__primary"
							onClick={handleSendButtonClick}
							style={{ width: 64 }}
						>
							{state === 'ready' ? 'Send' : 'Cancel'}
						</button>
					</div>
				</div>
			</div>
		</>
	)
}
