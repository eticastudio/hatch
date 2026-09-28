globalThis.process ??= {};
globalThis.process.env ??= {};
import { r as verifyOptions, s as isESMImportedImage, t as baseService } from "./service_BxIRHiLo.mjs";
//#region node_modules/astro/dist/assets/services/noop.js
var noop_default = {
	...baseService,
	propertiesToHash: ["src"],
	async validateOptions(options) {
		if (isESMImportedImage(options.src) && options.src.format === "svg") options.format = "svg";
		else delete options.format;
		verifyOptions(options);
		return options;
	},
	async transform(inputBuffer, transformOptions) {
		return {
			data: inputBuffer,
			format: transformOptions.format
		};
	}
};
//#endregion
export { noop_default as default };
