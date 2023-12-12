import { createBrowserRouter, RouterProvider } from 'react-router-dom'
import { CommandsDemo } from './commands-demo/CommandsDemo'

const router = createBrowserRouter([{ path: '/', element: <CommandsDemo /> }])

export function Router() {
	return <RouterProvider router={router} />
}
