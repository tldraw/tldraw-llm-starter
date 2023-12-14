/** @type {import('tailwindcss').Config} */
export default {
	content: ['./index.html', './src/**/*.{js,ts,jsx,tsx}'],
	theme: {
		extend: {
			fontFamily: {
				sans: ['Inter', 'ui-sans-serif', 'system-ui', 'sans-serif'],
			},
		},
		fontSize: {
			xs: '8px', // 8px
			sm: '10px', // '10px
			base: '13px', // 12px
			lg: '16px',
			xl: '20px',
		},
	},
	plugins: [],
}
