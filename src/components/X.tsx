export function X(props: React.SVGProps<SVGSVGElement>) {
	// An 'X' icon
	return (
		<svg width={16} height={16} viewBox="0 0 16 16" {...props}>
			<path
				strokeLinecap="round"
				d="M 3 3 L 13 13 M 3 13 L 13 3"
				stroke="currentColor"
				strokeWidth={1}
				fill="none"
			/>
		</svg>
	)
}
