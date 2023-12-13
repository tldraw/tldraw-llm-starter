export type CallbackAction<T> = (state: T) => T
export type UpdateAction<T> = CallbackAction<T> | T
export type UpdateFn<T> = (update: UpdateAction<T>) => void

/**
 * Updates a `T` by either replacing it directly with a new `T` or calling a
 * function with the old value to return a new one.
 */
export function applyUpdate<T>(prev: T, action: UpdateAction<T>): T {
	if (typeof action == 'function') {
		return (action as (state: T) => T)(prev)
	} else {
		return action
	}
}

/**
 * Updates a `T[Key]` by either replacing it directly with a new `T[Key]` or
 * calling a function with the old value to return a new one.
 */
export function applyUpdateWithin<T, Key extends keyof T>(
	state: T,
	key: Key,
	update: UpdateAction<T[Key]>
): T {
	const before = state[key]
	const after = applyUpdate(before, update)
	if (Object.is(before, after)) {
		return state
	}
	return {
		...state,
		[key]: after,
	}
}

export function randomId() {
	return Math.random().toString(36).slice(2)
}

export function delayMs(ms: number) {
	return new Promise((resolve) => setTimeout(resolve, ms))
}

export function assert(condition: unknown, message?: string): asserts condition {
	if (!condition) {
		throw new Error(message ?? 'Assertion error')
	}
}
