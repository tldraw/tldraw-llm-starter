import classNames from 'classnames'
import { ComponentType, ReactNode, useCallback, useEffect, useMemo, useRef, useState } from 'react'
import {
	Editor,
	TLTextShape,
	Tldraw,
	TldrawProps,
	createTLStore,
	defaultShapeUtils,
	parseTldrawJsonFile,
	transact,
} from 'tldraw'
import { Spinner } from '../components/Spinner'
import { X } from '../components/X'
import { ConcurrencyLimiter } from '../lib/ConcurrencyLimiter'
import { fetchText } from '../lib/fetchText'
import { UpdateAction, UpdateFn, applyUpdateWithin, assert, randomId } from '../lib/utils'
import { scenarios } from '../scenarios/0_scenarios'
import {
	AssistantInfo,
	AssistantState,
	PreparingScenarioState,
	ReadyScenarioState,
	RunAssistantState,
	RunScenarioState,
	SandboxState,
	ScenarioState,
	isRunInProgress,
	isRunningState,
	isScenarioRunInProgress,
	summarizeRun,
} from './SandboxState'
import { sandboxAssistants } from './sandboxAssistants'

const concurrencyLimiter = new ConcurrencyLimiter(3)

export default function Sandbox() {
	const [state, setState] = useState<SandboxState | null>(null)

	useEffect(() => {
		let isCancelled = false

		;(async () => {
			const order = Object.keys(scenarios)
			const scenarioEntries = await Promise.all(
				Object.entries(scenarios).map(async ([name, file]) => {
					const scenario: PreparingScenarioState = {
						name,
						fileContents: await fetchText(file),
						type: 'preparing',
					}
					return [name, scenario] as const
				})
			)
			if (isCancelled) return

			setState({
				key: randomId(),
				order,
				scenarios: Object.fromEntries(scenarioEntries),
				assistant1: {
					index: 0,
					state: { type: 'preparing', assistant: sandboxAssistants[0].create() },
				},
				assistant2: {
					index: 1,
					state: { type: 'preparing', assistant: sandboxAssistants[1].create() },
				},
				run: null,
			})
		})()

		return () => {
			isCancelled = true
		}
	}, [])

	if (!state) {
		return (
			<div className="absolute inset-0 flex items-center justify-center">
				<Spinner />
			</div>
		)
	}

	return (
		<SandboxReady
			// force a complete re-render when the key changes
			key={state.key}
			sandbox={state}
			setSandbox={setState as UpdateFn<SandboxState>}
		/>
	)
}

function SandboxReady({
	sandbox,
	setSandbox,
}: {
	sandbox: SandboxState
	setSandbox: UpdateFn<SandboxState>
}) {
	console.log(sandbox)
	const areScenariosReady = sandbox.order.every((key) => {
		const scenario = sandbox.scenarios[key]
		return scenario.type === 'ready' && scenario.editor1 && scenario.editor2
	})
	const areAssistantsReady =
		sandbox.assistant1.state.type === 'ready' && sandbox.assistant2.state.type === 'ready'

	const isReady = areScenariosReady && areAssistantsReady

	const runStats = summarizeRun(sandbox)

	async function onRunScenario(key: string, scenario: ScenarioState) {
		if (!isReady) return
		assert(scenario.type === 'ready')
		if (isScenarioRunInProgress(sandbox, key)) return

		setSandbox((sandbox) => {
			if (isRunInProgress(sandbox)) return sandbox
			return {
				...sandbox,
				run: {
					type: 'some',
					stateByScenario: {},
				},
			}
		})

		const updateRunForScenario = getScenarioRunUpdater(setSandbox, key)

		updateRunForScenario({
			assistant1State: 'waiting',
			assistant1UserMessage: null,
			assistant1Output: null,
			assistant2State: 'waiting',
			assistant2UserMessage: null,
			assistant2Output: null,
		})

		if (!sandbox.run) {
			await sandbox.assistant1.state.assistant.setSystemPrompt(
				sandbox.assistant1.state.systemPrompt
			)
			await sandbox.assistant2.state.assistant.setSystemPrompt(
				sandbox.assistant2.state.systemPrompt
			)
		}

		await runScenario(scenario, sandbox, updateRunForScenario)
	}

	async function onRunAllScenarios() {
		if (!isReady) return
		if (isRunInProgress(sandbox)) return

		const readyScenarios = Object.entries(sandbox.scenarios).filter(
			(entry): entry is [string, ReadyScenarioState] => entry[1].type === 'ready'
		)

		setSandbox((sandbox) => {
			return {
				...sandbox,
				run: {
					type: 'all',
					stateByScenario: Object.fromEntries(
						readyScenarios.map(([key]) => [
							key,
							{
								assistant1State: 'waiting',
								assistant1UserMessage: null,
								assistant1Output: null,
								assistant2State: 'waiting',
								assistant2UserMessage: null,
								assistant2Output: null,
							},
						])
					),
				},
			}
		})

		if (!sandbox.run) {
			await sandbox.assistant1.state.assistant.setSystemPrompt(
				sandbox.assistant1.state.systemPrompt
			)
			await sandbox.assistant2.state.assistant.setSystemPrompt(
				sandbox.assistant2.state.systemPrompt
			)
		}

		await Promise.all(
			readyScenarios.map(async ([key, scenario]) => {
				await runScenario(scenario, sandbox, getScenarioRunUpdater(setSandbox, key))
			})
		)
	}

	return (
		<>
			<div className="p-3 border-b flex items-center justify-between sticky top-0 bg-white z-10">
				<h1 className="text-xl font-semibold">tldraw llm sandbox 🏖️</h1>
				{runStats && (
					<div className="ml-auto flex items-center gap-3">
						{runStats.completed !== runStats.total && <Spinner />}
						{runStats.completed}/{runStats.total}
					</div>
				)}
				{isReady && !isRunInProgress(sandbox) && (
					<button
						className="px-2 bg-white hover:bg-gray-50 cursor-pointer rounded-full border border-gray-100 shadow-sm ml-3"
						onClick={onRunAllScenarios}
					>
						run all
					</button>
				)}
			</div>
			<div className="grid grid-cols-3 col-span-3 gap-4 border-b p-3">
				<div className="flex flex-col gap-3">
					<p>It's the tldraw llm sandbox!</p>
					<p>
						Pick two models and tweak their system prompts to the right, then run them against our
						test scenarios & compare the results.
					</p>
					<p>
						To add new test scenarios, add .tldr files to <code>src/scenarios</code>, then export
						them from <code>src/scenarios/0_scenarios.tsx</code>.
					</p>
					<p>
						Make sure each file has a text shape starting with "prompt:" to define the prompt to
						send to the LLM.
					</p>
				</div>
				<AssistantSettings
					title="Model 1"
					info={sandbox.assistant1}
					setInfo={(update: UpdateAction<AssistantInfo>) =>
						setSandbox((sandbox) => {
							sandbox = applyUpdateWithin(sandbox, 'assistant1', update)
							sandbox = applyUpdateWithin(sandbox, 'run', null)
							return sandbox
						})
					}
				/>
				<AssistantSettings
					title="Model 2"
					info={sandbox.assistant2}
					setInfo={(update: UpdateAction<AssistantInfo>) =>
						setSandbox((sandbox) => {
							sandbox = applyUpdateWithin(sandbox, 'assistant2', update)
							sandbox = applyUpdateWithin(sandbox, 'run', null)
							return sandbox
						})
					}
				/>
			</div>
			<div className="grid grid-cols-3 grid-flow-row gap-3 p-3 pt-0">
				<div className="grid grid-cols-3 grid-flow-row gap-3 bg-gray-50 z-10 sticky shadow top-[55px] col-span-3 -mx-3 border-b text-lg">
					<div className="p-3">Input</div>
					<div className="p-3">Output 1</div>
					<div className="p-3">Output 2</div>
				</div>
				{sandbox.order.map((key) => {
					const scenario = sandbox.scenarios[key]
					return (
						<Scenario
							key={key}
							scenarioKey={key}
							areAssistantsReady={areAssistantsReady}
							onRun={async () => onRunScenario(key, scenario)}
							setSandbox={setSandbox}
							sandbox={sandbox}
						/>
					)
				})}
			</div>
		</>
	)
}

function getScenarioRunUpdater(setSandbox: UpdateFn<SandboxState>, key: string) {
	return (update: UpdateAction<RunScenarioState>) => {
		return setSandbox((sandbox) =>
			applyUpdateWithin(sandbox, 'run', (run) => {
				if (!run) return run
				return applyUpdateWithin(run, 'stateByScenario', (stateByScenario) =>
					applyUpdateWithin(stateByScenario, key, update)
				)
			})
		)
	}
}

async function runScenario(
	scenario: ReadyScenarioState,
	sandbox: SandboxState,
	updateRun: (update: UpdateAction<RunScenarioState>) => void
) {
	await concurrencyLimiter.run(async () => {
		const assistant1Promise = (async () => {
			assert(scenario.editor1)
			try {
				const thread = await sandbox.assistant1.state.assistant.createThread(scenario.editor1)
				const userMessage = thread.getUserMessage(scenario.prompt)
				updateRun((prev) => ({
					...prev,
					assistant1State: 'running',
					assistant1UserMessage: userMessage,
				}))
				const response = await thread.sendMessage(userMessage)
				updateRun((prev) => ({ ...prev, assistant1Output: response }))
				await thread.handleAssistantResponse(response)
				updateRun((prev) => ({ ...prev, assistant1State: 'done' }))
			} catch (e) {
				console.log(e)
				updateRun((prev) => ({ ...prev, assistant1State: 'error' }))
			}
		})()

		const assistant2Promise = (async () => {
			assert(scenario.editor2)
			try {
				const thread = await sandbox.assistant2.state.assistant.createThread(scenario.editor2)
				const userMessage = thread.getUserMessage(scenario.prompt)
				updateRun((prev) => ({
					...prev,
					assistant2State: 'running',
					assistant2UserMessage: userMessage,
				}))
				const response = await thread.sendMessage(userMessage)
				updateRun((prev) => ({ ...prev, assistant2Output: response }))
				await thread.handleAssistantResponse(response)
				updateRun((prev) => ({ ...prev, assistant2State: 'done' }))
			} catch (e) {
				console.log(e)
				updateRun((prev) => ({ ...prev, assistant2State: 'error' }))
			}
		})()

		await Promise.all([assistant1Promise, assistant2Promise])
	})
}

function AssistantSettings({
	title,
	info,
	setInfo,
}: {
	title: string
	info: AssistantInfo
	setInfo: UpdateFn<AssistantInfo>
}) {
	const state = info.state
	const setState = useCallback(
		(update: UpdateAction<AssistantState>) =>
			setInfo((prev) => applyUpdateWithin(prev, 'state', update)),
		[setInfo]
	)

	useEffect(() => {
		if (state.type !== 'preparing') return

		let isCancelled = false
		;(async () => {
			const systemPrompt = await state.assistant.getDefaultSystemPrompt()
			if (isCancelled) return
			setState({ type: 'ready', assistant: state.assistant, systemPrompt })
		})()

		return () => {
			isCancelled = true
		}
	}, [setState, state.assistant, state.type])

	return (
		<div className="flex flex-col gap-4">
			<label className="flex-none">
				<div className="text-gray-500 font-semibold uppercase tracking-wider text-sm pb-1">
					{title}
				</div>
				<select
					value={info.index}
					onChange={(e) => {
						const index = Number(e.currentTarget.value)
						setInfo({
							index,
							state: {
								type: 'preparing',
								assistant: sandboxAssistants[index].create(),
							},
						})
					}}
					className="border w-full bg-white rounded px-2 py-1"
				>
					{sandboxAssistants.map((assistant, i) => (
						<option key={i} value={i}>
							{assistant.name}
						</option>
					))}
				</select>
			</label>
			<label className="flex-auto flex flex-col">
				<div className="text-gray-500 font-semibold uppercase tracking-wider text-sm pb-1 flex-none">
					System prompt
				</div>
				<textarea
					className={classNames(
						'border w-full bg-white rounded px-2 py-1 aspect-[4/3]',
						state.type === 'preparing' && 'text-gray-500'
					)}
					readOnly={state.type === 'preparing'}
					value={state.type === 'preparing' ? 'Loading...' : state.systemPrompt}
				/>
			</label>
		</div>
	)
}

function Scenario({
	scenarioKey: key,
	areAssistantsReady,
	onRun,
	sandbox,
	setSandbox,
}: {
	scenarioKey: string
	areAssistantsReady: boolean
	onRun: () => void
	sandbox: SandboxState
	setSandbox: UpdateFn<SandboxState>
}) {
	const scenario = sandbox.scenarios[key]
	const setScenario = (update: UpdateAction<ScenarioState>) =>
		setSandbox((prevSandbox) =>
			applyUpdateWithin(prevSandbox, 'scenarios', (prevScenarios) =>
				applyUpdateWithin(prevScenarios, key, update)
			)
		)

	const inputStore = useMemo(() => {
		const parsed = parseTldrawJsonFile({
			json: scenario.fileContents,
			schema: createTLStore({ shapeUtils: defaultShapeUtils }).schema,
		})
		if (!parsed.ok) throw new Error(`File parse error: ${JSON.stringify(parsed.error)}`)
		return parsed.value
	}, [scenario.fileContents])

	const runState = sandbox.run?.stateByScenario[key] ?? null

	const isFullyReady =
		scenario.type === 'ready' && scenario.editor1 && scenario.editor2 && areAssistantsReady

	const isRunning =
		!!runState &&
		(isRunningState(runState.assistant1State) || isRunningState(runState.assistant2State))

	const canRun = isFullyReady && !isRunning

	return (
		<>
			<div className="flex flex-col gap-1 pt-2">
				<div className="flex items-center gap-3 justify-between">
					<h3 className="font-semibold">{scenario.name}.tldr</h3>
					<button
						className="px-2 bg-white hover:bg-gray-50 cursor-pointer rounded-full border border-gray-100 shadow-sm disabled:opacity-50 disabled:pointer-events-none"
						onClick={canRun ? onRun : undefined}
						disabled={!canRun}
					>
						run
					</button>
				</div>
				{scenario.type !== 'preparing' && (
					<div className="font-light text-gray-600 mr-auto">“{scenario.prompt}”</div>
				)}
			</div>
			<PreviewInfo
				state={runState?.assistant1State}
				input={runState?.assistant1UserMessage}
				output={runState?.assistant1Output}
				assistantIndex={sandbox.assistant1.index}
			/>
			<PreviewInfo
				state={runState?.assistant2State}
				input={runState?.assistant2UserMessage}
				output={runState?.assistant2Output}
				assistantIndex={sandbox.assistant2.index}
			/>

			<Container>
				<MiniTldraw
					store={inputStore}
					onMount={(editor) => {
						const shapes = editor.getCurrentPageShapes()
						const promptShape = shapes.find(
							(s): s is TLTextShape =>
								s.type === 'text' &&
								(s as TLTextShape).props.text.toLowerCase().startsWith('prompt:')
						)

						transact(() => {
							if (promptShape) {
								editor.deleteShape(promptShape.id)
								const prompt = promptShape.props.text.replace(/^prompt:\s*/i, '')
								const snapshot = editor.store.getSnapshot()
								setScenario({
									type: 'ready',
									name: scenario.name,
									fileContents: scenario.fileContents,
									prompt,
									snapshot,
									editor1: null,
									editor2: null,
								})
							}

							editor.zoomToFit()
							editor.updateInstanceState({ isReadonly: true })
						})
					}}
				/>
			</Container>
			<Container>
				<Preview
					scenario={scenario}
					onMount={(editor) => {
						setScenario((prev) => {
							assert(prev.type === 'ready')
							return { ...prev, editor1: editor }
						})
					}}
				/>
			</Container>
			<Container>
				<Preview
					scenario={scenario}
					onMount={(editor) => {
						setScenario((prev) => {
							assert(prev.type === 'ready')
							return { ...prev, editor2: editor }
						})
					}}
				/>
			</Container>
		</>
	)
}

function PreviewInfo({
	state,
	input,
	output,
	assistantIndex,
}: {
	state?: RunAssistantState
	input?: string | null
	output?: unknown
	assistantIndex: number
}) {
	const dialogRef = useRef<HTMLDialogElement | null>(null)
	const GptOutput = sandboxAssistants[assistantIndex].GptOutput as ComponentType<{
		output: unknown
	}>
	return (
		<div className="flex items-end">
			{state && (
				<div className="flex items-center justify-center flex-auto">
					<div className="flex-auto text-center">{state}</div>
					<button
						className="text-gray-500 font-serif italic rounded-full border aspect-square w-6"
						onClick={() => {
							return dialogRef.current?.showModal()
						}}
					>
						i
					</button>
					<dialog ref={dialogRef} className="w-96 rounded-lg bg-white shadow-xl">
						<div className="flex items-center justify-between p-3 border-b">
							<h4 className="font-semibold text-lg">Run details</h4>
							<button
								className="text-gray-500 rounded-full border aspect-square w-6 flex items-center justify-center"
								onClick={() => dialogRef.current?.close()}
							>
								<X />
							</button>
						</div>
						<div className="p-3 flex items-start flex-col">
							<div className="text-gray-500 font-semibold uppercase tracking-wider text-sm pb-1 flex-none">
								Input
							</div>
							<div className="whitespace-pre-wrap">{input ? input : <Spinner />}</div>
							<div className="text-gray-500 font-semibold uppercase tracking-wider text-sm pt-3 flex-none">
								Output
							</div>
							<div className="whitespace-pre-wrap">
								{output ? <GptOutput output={output} /> : <Spinner />}
							</div>
						</div>
					</dialog>
				</div>
			)}
		</div>
	)
}

function Container({ children }: { children?: ReactNode }) {
	return <div className="aspect-[4/3] relative z-0 overflow-hidden rounded shadow">{children}</div>
}

function Preview({
	scenario,
	onMount,
}: {
	scenario: ScenarioState
	onMount: (editor: Editor) => void
}) {
	if (scenario.type === 'preparing') {
		return null
	}

	return (
		<Container>
			{/* {!done && (
				<div className="absolute inset-0 flex items-center justify-center bg-gray-500 bg-opacity-5 z-10">
					<Spinner />
				</div>
			)} */}
			{
				<MiniTldraw
					snapshot={scenario.snapshot}
					className="relative z-0"
					onMount={(editor) => {
						editor.zoomToFit()
						onMount(editor)
					}}
				/>
			}
		</Container>
	)
}

function MiniTldraw(props: TldrawProps) {
	const editorRef = useRef<Editor | null>(null)

	function handleFocusChange() {
		console.log('handleFocusChange', document.activeElement)
		requestAnimationFrame(() => {
			if (!editorRef.current) return

			const editorContainer = editorRef.current.getContainer()
			const isFocused =
				!!document.activeElement && isElementAncestor(document.activeElement, editorContainer)

			if (editorRef.current.getInstanceState().isFocused !== isFocused) {
				editorRef.current.updateInstanceState({ isFocused })
			}
		})
	}

	return (
		<div onFocus={handleFocusChange} onBlur={handleFocusChange} className="absolute inset-0 z-0">
			<Tldraw
				{...props}
				autoFocus={props.autoFocus ?? false}
				hideUi={props.hideUi ?? true}
				onMount={(editor) => {
					editorRef.current = editor
					if (props.onMount) return props.onMount(editor)
				}}
			/>
		</div>
	)
}

function isElementAncestor(element: Element, ancestor: Element) {
	if (element === ancestor) return true
	if (!element.parentElement) return false
	return isElementAncestor(element.parentElement, ancestor)
}
