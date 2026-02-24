/* eslint-disable @typescript-eslint/no-explicit-any */
let cvInstance: any = null;
let loadPromise: Promise<void> | null = null;

export function isOpenCvReady(): boolean {
	return cvInstance !== null;
}

export function getCv(): any {
	if (!cvInstance) {
		throw new Error("OpenCV not initialized. Call loadOpenCv() first.");
	}
	return cvInstance;
}

export function loadOpenCv(): Promise<void> {
	if (typeof window === "undefined") {
		return Promise.reject(
			new Error("OpenCV.js can only be loaded in the browser"),
		);
	}

	if (isOpenCvReady()) {
		return Promise.resolve();
	}

	if (loadPromise) {
		return loadPromise;
	}

	loadPromise = import("@techstark/opencv-js")
		.then(({ default: cv }) => {
			return new Promise<void>((resolve, reject) => {
				if (cv.Mat) {
					// WASM already initialized
					cvInstance = cv;
					resolve();
					return;
				}

				if (typeof cv === "object" && "onRuntimeInitialized" in cv) {
					// WASM runtime not yet initialized
					const originalCallback = (cv as Record<string, unknown>)
						.onRuntimeInitialized as (() => void) | undefined;
					(cv as Record<string, unknown>).onRuntimeInitialized = () => {
						originalCallback?.();
						cvInstance = cv;
						resolve();
					};
				} else {
					// Poll briefly
					let attempts = 0;
					const poll = setInterval(() => {
						attempts++;
						if (cv.Mat) {
							clearInterval(poll);
							cvInstance = cv;
							resolve();
						} else if (attempts > 100) {
							clearInterval(poll);
							reject(new Error("OpenCV.js failed to initialize"));
						}
					}, 100);
				}
			});
		})
		.catch((err: unknown) => {
			loadPromise = null;
			throw err;
		});

	return loadPromise;
}
