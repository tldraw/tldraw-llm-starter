/// <reference types="vite/client" />

interface ImportMetaEnv {
	readonly ASSISTANT_ID: string
	readonly OPENAI_API_KEY: string
}

interface ImportMeta {
	readonly env: ImportMetaEnv
}

declare module '*.tldr' {
	const value: string
	export default value
}
