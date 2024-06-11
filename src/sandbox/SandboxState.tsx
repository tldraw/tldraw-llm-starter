import { Editor, StoreSnapshot, TLRecord } from 'tldraw'
import { Assistant } from '../Assistant'

export interface SandboxState {
	readonly key: string
	readonly order: readonly string[]
	readonly scenarios: { readonly [key: string]: ScenarioState }
	readonly assistant1: AssistantInfo
	readonly assistant2: AssistantInfo
	readonly run: null | RunState
}

export interface RunState {
	readonly type: 'all' | 'some'
	readonly stateByScenario: { readonly [key: string]: RunScenarioState }
}

export type RunAssistantState = 'waiting' | 'running' | 'done' | 'error'
export interface RunScenarioState {
	readonly assistant1State: RunAssistantState
	readonly assistant1UserMessage: string | null
	readonly assistant1Output: any | null
	readonly assistant2State: RunAssistantState
	readonly assistant2UserMessage: string | null
	readonly assistant2Output: any | null
}

export interface AssistantInfo {
	readonly index: number
	readonly state: AssistantState
}

export interface BaseAssistantState {
	readonly assistant: Assistant<any>
}

export interface PreparingAssistantState extends BaseAssistantState {
	readonly type: 'preparing'
}

export interface ReadyAssistantState extends BaseAssistantState {
	readonly type: 'ready'
	readonly systemPrompt: string
}

export type AssistantState = PreparingAssistantState | ReadyAssistantState

export interface BaseScenarioState {
	readonly name: string
	readonly fileContents: string
}

export interface PreparingScenarioState extends BaseScenarioState {
	readonly type: 'preparing'
}

export interface ReadyScenarioState extends BaseScenarioState {
	readonly type: 'ready'
	readonly prompt: string
	readonly snapshot: StoreSnapshot<TLRecord>
	readonly editor1: Editor | null
	readonly editor2: Editor | null
}

export type ScenarioState = PreparingScenarioState | ReadyScenarioState

export function summarizeRun(state: SandboxState) {
	if (!state.run) return null
	const { stateByScenario } = state.run
	const scenarioKeys = Object.keys(state.scenarios).filter((key) => stateByScenario[key])
	const total = scenarioKeys.length

	const completed = scenarioKeys.filter((key) => {
		const scenario = stateByScenario[key]
		return (
			(scenario.assistant1State === 'done' || scenario.assistant1State === 'error') &&
			(scenario.assistant2State === 'done' || scenario.assistant2State === 'error')
		)
	}).length

	const succeeded = scenarioKeys.filter((key) => {
		const scenario = stateByScenario[key]
		return scenario.assistant1State === 'done' && scenario.assistant2State === 'done'
	}).length

	const failed = scenarioKeys.filter((key) => {
		const scenario = stateByScenario[key]
		return scenario.assistant1State === 'error' || scenario.assistant2State === 'error'
	}).length

	return {
		total,
		completed,
		succeeded,
		failed,
		isDone: completed === total,
	}
}

export function isRunningState(state: RunAssistantState) {
	return state === 'running' || state === 'waiting'
}

export function isScenarioRunInProgress(state: SandboxState, key: string) {
	if (!state.run) return false
	const scenario = state.run.stateByScenario[key]
	if (!scenario) return false
	return isRunningState(scenario.assistant1State) || isRunningState(scenario.assistant2State)
}

export function isRunInProgress(state: SandboxState) {
	if (!state.run) return false
	for (const key of Object.keys(state.run.stateByScenario)) {
		if (isScenarioRunInProgress(state, key)) return true
	}
	return false
}
