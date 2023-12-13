import { createBrowserRouter, RouterProvider } from 'react-router-dom'
import { CommandsDemo } from './demos/commands/CommandsDemo'
import { CompletionsDemo } from './demos/competions-commands/CompletionsDemo'
import { FunctionCallingDemo } from './demos/function-calling/FunctionCallingDemo'

const router = createBrowserRouter([
	{
		path: '/',
		children: [
			{
				index: true,
				lazy: async () => ({
					element: <CommandsDemo />,
				}),
			},
			{
				path: 'function-calling',
				lazy: async () => ({
					element: <FunctionCallingDemo />,
				}),
			},
			{
				path: 'completions',
				lazy: async () => ({
					element: <CompletionsDemo />,
				}),
			},
		],
	},
])

export function Router() {
	return <RouterProvider router={router} />
}
