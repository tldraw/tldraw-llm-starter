import { lazy, Suspense } from 'react'
import { createBrowserRouter, RouterProvider } from 'react-router-dom'
import { Spinner } from './lib/Spinner'

const CommandsDemo = lazy(() => import('./demos/commands/CommandsDemo'))
const CompletionsDemo = lazy(() => import('./demos/competions-commands/CompletionsDemo'))
const FunctionCallingDemo = lazy(() => import('./demos/function-calling/FunctionCallingDemo'))
const Sandbox = lazy(() => import('./sandbox/Sandbox'))

const router = createBrowserRouter([
	{
		path: '/',
		element: <CommandsDemo />,
	},
	{
		path: '/function-calling',
		element: <FunctionCallingDemo />,
	},
	{
		path: '/completions',
		element: <CompletionsDemo />,
	},
	{
		path: '/sandbox',
		element: <Sandbox />,
	},
])

export function Router() {
	return (
		<Suspense
			fallback={
				<div className="absolute inset-0 flex items-center justify-center">
					<Spinner />
				</div>
			}
		>
			<RouterProvider router={router} />
		</Suspense>
	)
}
