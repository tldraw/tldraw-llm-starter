import { lazy, Suspense } from 'react'
import { createBrowserRouter, RouterProvider } from 'react-router-dom'
import { Spinner } from './components/Spinner'

const CommandsDemo = lazy(() => import('./demos/commands/CommandsDemo'))
const CompletionsDemo = lazy(() => import('./demos/competions-commands/CompletionsDemo'))
const FunctionCallingDemo = lazy(() => import('./demos/function-calling/FunctionCallingDemo'))
const Sandbox = lazy(() => import('./sandbox/Sandbox'))

const routes = [
	{
		name: 'OpenAI with completions',
		path: '/completions',
		element: <CompletionsDemo />,
	},
	{
		name: 'OpenAI Assistant',
		path: '/commands',
		element: <CommandsDemo />,
	},
	{
		name: 'OpenAI Assistant with function calling',
		path: '/function-calling',
		element: <FunctionCallingDemo />,
	},
	{
		name: 'Sandbox',
		path: '/sandbox',
		element: <Sandbox />,
	},
]

function Home() {
	return (
		<div className="p-2">
			<h2 className="text-xl font-bold">tldraw + LLM demos</h2>
			<ul>
				{routes.map((route) => (
					<li className="py-2 text-lg underline">
						<a key={route.path} href={route.path}>
							{route.name}
						</a>
					</li>
				))}
			</ul>
		</div>
	)
}

const router = createBrowserRouter([
	{
		path: '/',
		element: <Home />,
	},
	...routes,
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
