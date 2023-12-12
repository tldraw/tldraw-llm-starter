import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import { config } from 'dotenv'

config()

// https://vitejs.dev/config/
export default defineConfig({
	plugins: [react()],
	define: {
		'process.env.OPENAI_API_KEY': JSON.stringify(process.env.OPENAI_API_KEY),
		'process.env.OPENAI_ASSISTANT_ID': JSON.stringify(
			process.env.OPENAI_ASSISTANT_ID
		),
	},
})
