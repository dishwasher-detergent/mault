const OPENCV_CDN_URL = "https://docs.opencv.org/4.10.0/opencv.js";

let loadPromise: Promise<void> | null = null;

export function isOpenCvReady(): boolean {
	return typeof window !== "undefined" && !!window.cv?.Mat;
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

	loadPromise = new Promise<void>((resolve, reject) => {
		const script = document.createElement("script");
		script.src = OPENCV_CDN_URL;
		script.async = true;

		script.onload = () => {
			// OpenCV.js sets cv as a module factory — wait for it to initialize
			const waitForCv = () => {
				if (isOpenCvReady()) {
					resolve();
				} else if (
					window.cv &&
					typeof window.cv === "object" &&
					"onRuntimeInitialized" in window.cv
				) {
					// WASM runtime not yet initialized
					const originalCallback = (window.cv as Record<string, unknown>)
						.onRuntimeInitialized as (() => void) | undefined;
					(window.cv as Record<string, unknown>).onRuntimeInitialized = () => {
						originalCallback?.();
						resolve();
					};
				} else {
					// Poll briefly
					let attempts = 0;
					const poll = setInterval(() => {
						attempts++;
						if (isOpenCvReady()) {
							clearInterval(poll);
							resolve();
						} else if (attempts > 100) {
							clearInterval(poll);
							reject(new Error("OpenCV.js failed to initialize"));
						}
					}, 100);
				}
			};
			waitForCv();
		};

		script.onerror = () => {
			loadPromise = null;
			reject(new Error("Failed to load OpenCV.js from CDN"));
		};

		document.head.appendChild(script);
	});

	return loadPromise;
}
