import {
	DefaultSpinner,
	stopEventPropagation,
	useEditor,
	useLocalStorageState,
} from '@tldraw/tldraw'
import { useCallback, useEffect, useState } from 'react'
import { Assistant, Thread } from '../Assistant'
import { assert } from '../lib/utils'
import { Spinner } from './Spinner'

function useAssistant<T>(assistant: Assistant<T>) {
	const editor = useEditor()
	const [thread, setThread] = useState<Thread<T> | null>(null)

	const [isReady, setIsReady] = useState(false)
	useEffect(() => {
		setIsReady(false)
		let isCancelled = false
		;(async () => {
			const systemPrompt = await assistant.getDefaultSystemPrompt()
			if (isCancelled) return

			await assistant.setSystemPrompt(systemPrompt)
			if (isCancelled) return

			setIsReady(true)
		})()

		return () => {
			isCancelled = true
		}
	}, [assistant])

	useEffect(() => {
		if (!isReady) {
			setThread(null)
			return
		}

		let isCancelled = false
		;(async () => {
			const thread = await assistant.createThread(editor)
			if (isCancelled) return
			setThread(thread)
		})()
		return () => {
			isCancelled = true
		}
	}, [assistant, editor, isReady])

	useEffect(() => {
		if (!thread) return
		return () => {
			thread.cancel()
		}
	}, [thread])

	const start = useCallback(
		async (input: string) => {
			assert(thread)
			const userMessage = thread.getUserMessage(input)
			const result = await thread.sendMessage(userMessage)
			await thread.handleAssistantResponse(result)
		},
		[thread]
	)

	const restart = useCallback(async () => {
		const newThread = await assistant.createThread(editor)
		setThread(newThread)
	}, [assistant, editor])

	const cancel = useCallback(async () => {
		assert(thread)
		await thread.cancel()
	}, [thread])

	if (!thread || !isReady) return null
	return { start, restart, cancel }
}

export function UserPrompt<T>({ assistant }: { assistant: Assistant<T> }) {
	const editor = useEditor()
	const controls = useAssistant(assistant)

	const [state, setState] = useState<'ready' | 'waiting'>('ready')
	const [text, setText] = useLocalStorageState(
		'prompt-input',
		'Create a box at the center of the viewport.'
	)

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
				<textarea value={text} onChange={(e) => setText(e.currentTarget.value)} />
				<div className="user-prompt__buttons">
					<div className="user-prompt__buttons__group">
						<button className="tlui-button" onClick={handleClearButtonClick}>
							Clear Canvas
						</button>
					</div>
					<div className="user-prompt__buttons__group items-center">
						{controls ? (
							<UserPromptActions
								controls={controls}
								input={text}
								state={state}
								onChangeState={setState}
							/>
						) : (
							<div className="pr-3">
								<Spinner />
							</div>
						)}
					</div>
				</div>
			</div>
		</>
	)
}

function UserPromptActions({
	controls,
	input,
	state,
	onChangeState,
}: {
	controls: NonNullable<ReturnType<typeof useAssistant>>
	input: string
	state: 'ready' | 'waiting'
	onChangeState: (state: 'ready' | 'waiting') => void
}) {
	const { start, restart, cancel } = controls

	const handleSendButtonClick = useCallback(async () => {
		if (state === 'waiting') {
			await cancel()
			onChangeState('ready')
			return
		}

		if (state === 'ready') {
			if (!input) return
			onChangeState('waiting')

			// Send the user message to the thread
			await start(input)
			onChangeState('ready')
		}
	}, [cancel, input, onChangeState, start, state])

	const [isRestarting, setIsRestarting] = useState(false)
	const handleRestartButtonClick = useCallback(async () => {
		setIsRestarting(true)
		await restart()
		setIsRestarting(false)
	}, [restart])

	return (
		<>
			<button className="tlui-button" onClick={isRestarting ? undefined : handleRestartButtonClick}>
				{isRestarting ? <Spinner /> : 'New Thread'}
			</button>
			<button
				className="tlui-button tlui-button__primary"
				onClick={handleSendButtonClick}
				style={{ width: 64 }}
			>
				{state === 'ready' ? 'Send' : 'Cancel'}
			</button>
		</>
	)
}
