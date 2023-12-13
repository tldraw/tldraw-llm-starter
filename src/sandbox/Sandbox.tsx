import {
	Editor,
	StoreSnapshot,
	TLRecord,
	TLTextShape,
	Tldraw,
	TldrawProps,
	createTLStore,
	defaultShapeUtils,
	parseTldrawJsonFile,
	transact,
} from '@tldraw/tldraw'
import { ReactNode, useEffect, useMemo, useRef, useState } from 'react'
import { Spinner } from '../lib/Spinner'
import { fetchText } from '../lib/fetchText'
import { UpdateAction, UpdateFn, applyUpdateWithin, randomId } from '../lib/utils'
import { scenarios } from '../scenarios/0_scenarios'

interface SandboxState {
	readonly key: string
	readonly order: readonly string[]
	readonly scenarios: { readonly [key: string]: ScenarioState }
}

interface BaseScenarioState {
	readonly name: string
	readonly fileContents: string
}

interface PreparingScenarioState extends BaseScenarioState {
	readonly state: 'preparing'
}

interface ReadyScenarioState extends BaseScenarioState {
	readonly state: 'ready'
	readonly prompt: string
	readonly snapshot: StoreSnapshot<TLRecord>
}

type ScenarioState = PreparingScenarioState | ReadyScenarioState

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
						state: 'preparing',
					}
					return [name, scenario] as const
				})
			)
			if (isCancelled) return

			setState({
				key: randomId(),
				order,
				scenarios: Object.fromEntries(scenarioEntries),
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
	return (
		<>
			<div className="p-3 border-b flex items-center justify-between">
				<h1 className="text-xl font-semibold">LLM Sandbox 🏖️</h1>
				<button className="px-3 bg-white hover:bg-gray-50 cursor-pointer rounded-full ml-auto border border-gray-100 shadow-sm">
					run all
				</button>
			</div>
			<div className="grid grid-cols-3 grid-flow-row gap-3 p-3 pt-0">
				<div className="grid grid-cols-3 grid-flow-row gap-3 bg-gray-50 z-10 sticky shadow top-0 col-span-3 -mx-3 border-b">
					<div className="p-3">Input</div>
					<div className="p-3">Output 1</div>
					<div className="p-3">Output 2</div>
				</div>
				{sandbox.order.map((key) => {
					const scenario = sandbox.scenarios[key]
					return (
						<Scenario
							key={key}
							scenario={scenario}
							setScenario={(update: UpdateAction<ScenarioState>) =>
								setSandbox((prevSandbox) =>
									applyUpdateWithin(prevSandbox, 'scenarios', (prevScenarios) =>
										applyUpdateWithin(prevScenarios, key, update)
									)
								)
							}
						/>
					)
				})}
			</div>
		</>
	)
}

function Scenario({
	scenario,
	setScenario,
}: {
	scenario: ScenarioState
	setScenario: UpdateFn<ScenarioState>
}) {
	const inputStore = useMemo(() => {
		const parsed = parseTldrawJsonFile({
			json: scenario.fileContents,
			schema: createTLStore({ shapeUtils: defaultShapeUtils }).schema,
		})
		if (!parsed.ok) throw new Error(`File parse error: ${JSON.stringify(parsed.error)}`)
		return parsed.value
	}, [scenario.fileContents])

	return (
		<>
			<div className="col-span-3 pt-3 flex justify-start items-center gap-3">
				<h3 className="font-semibold">{scenario.name}.tldr</h3>
				{scenario.state !== 'preparing' && (
					<>
						<div className="font-light text-gray-600">“{scenario.prompt}”</div>
						<button className="px-3 bg-white hover:bg-gray-50 cursor-pointer rounded-full ml-auto border border-gray-100 shadow-sm">
							run
						</button>
					</>
				)}
			</div>
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
									state: 'ready',
									name: scenario.name,
									fileContents: scenario.fileContents,
									prompt,
									snapshot,
								})
							}

							editor.zoomToFit()
							editor.updateInstanceState({ isReadonly: true })
						})
					}}
				/>
			</Container>
			<Container>
				<Preview scenario={scenario} />
			</Container>
			<Container>
				<Preview scenario={scenario} />
			</Container>
		</>
	)
}

function Container({ children }: { children?: ReactNode }) {
	return <div className="aspect-[4/3] relative z-0 overflow-hidden rounded shadow">{children}</div>
}

function Preview({ scenario }: { scenario: ScenarioState }) {
	if (scenario.state === 'preparing') {
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
