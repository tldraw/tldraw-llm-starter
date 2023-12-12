import { createBrowserRouter, RouterProvider } from 'react-router-dom'
import { CommandsDemo } from './demos/commands/CommandsDemo'
import { FunctionCallingDemo } from './demos/function-calling/FunctionCallingDemo'

const router = createBrowserRouter([
	{
		path: '/',
		children: [
			{
				index: true,
				element: <CommandsDemo />,
			},
			{ path: 'function-calling', element: <FunctionCallingDemo /> },
		],
	},
])

export function Router() {
	return <RouterProvider router={router} />
}
