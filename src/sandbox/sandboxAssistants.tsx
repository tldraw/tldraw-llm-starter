import { useEffect, useState } from 'react'
import { Assistant } from '../Assistant'
import { Spinner } from '../components/Spinner'
import { OpenAiCommandsAssistant } from '../demos/commands/OpenAiCommandsAssistant'
import { CompletionCommandsAssistant } from '../demos/competions-commands/CompletionsCommandsAssistant'
import { OpenAiWithFunctionCallingAssistant } from '../demos/function-calling/OpenAiAssistantWithFunctionCalling'

type SandboxAssistant<T> = {
	name: string
	create: () => Assistant<T>
	GptOutput: React.ComponentType<{ output: T }>
}

export const sandboxAssistants = [
	create({
		name: 'OpenAI Assistant with commands',
		create: () => new OpenAiCommandsAssistant(),
		GptOutput: ({ output }) => <>{output.join('\n\n')}</>,
	}),
	create({
		name: 'OpenAI Completions with commands',
		create: () => new CompletionCommandsAssistant(),
		GptOutput: ({ output }) => {
			const [final, setFinal] = useState<string | null>(null)
			useEffect(() => {
				let isCancelled = false
				output.finalContent().then((final) => {
					if (isCancelled) return
					setFinal(final)
				})
				return () => {
					isCancelled = true
				}
			}, [output])
			return <>{final ?? <Spinner />}</>
		},
	}),
	create({
		name: 'OpenAI Assistant with function calling',
		create: () => new OpenAiWithFunctionCallingAssistant(),
		GptOutput: ({ output }) => {
			console.log({ output })
			return (
				<div className="flex gap-2 flex-col">
					{output.map((message, i) =>
						message.type === 'text' ? (
							<div key={i}>{message.text}</div>
						) : (
							<div key={i} className="font-mono">
								{message.name}({message.args !== undefined && JSON.stringify(message.args)}) ={'> '}
								{JSON.stringify(message.output)}
							</div>
						)
					)}
				</div>
			)
		},
	}),
] as const

function create<T>(v: SandboxAssistant<T>) {
	return v
}
