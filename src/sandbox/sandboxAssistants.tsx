import { OpenAiCommandsAssistant } from '../demos/commands/OpenAiCommandsAssistant'
import { CompletionCommandsAssistant } from '../demos/competions-commands/CompletionsCommandsAssistant'
import { OpenAiWithFunctionCallingAssistant } from '../demos/function-calling/OpenAiAssistantWithFunctionCalling'

export const sandboxAssistants = [
	{
		name: 'OpenAI Assistant with commands',
		create: () => new OpenAiCommandsAssistant(),
	},
	{
		name: 'OpenAI Completions with commands',
		create: () => new CompletionCommandsAssistant(),
	},
	{
		name: 'OpenAI Assistant with function calling',
		create: () => new OpenAiWithFunctionCallingAssistant(),
	},
] as const
