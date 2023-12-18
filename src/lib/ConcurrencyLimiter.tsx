export class ConcurrencyLimiter {
	queue: (() => Promise<void>)[] = []
	private currentlyRunning = 0

	constructor(public readonly maxConcurrency: number) {}

	run(fn: () => Promise<void>) {
		this.queue.push(fn)
		this.runNext()
	}

	private runNext() {
		if (this.currentlyRunning >= this.maxConcurrency) {
			return
		}

		const fn = this.queue.shift()
		if (fn) {
			this.currentlyRunning++
			fn().finally(() => {
				this.currentlyRunning--
				this.runNext()
			})
		}
	}
}
