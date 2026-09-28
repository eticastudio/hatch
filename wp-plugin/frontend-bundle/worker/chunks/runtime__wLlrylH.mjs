globalThis.process ??= {};
globalThis.process.env ??= {};
import { c as EnvInvalidVariables, t as AstroError } from "./errors_B2-kvEBq.mjs";
//#region node_modules/astro/dist/env/errors.js
function invalidVariablesToError(invalid) {
	const _errors = [];
	for (const { key, type, errors } of invalid) if (errors[0] === "missing") _errors.push(`${key} is missing`);
	else if (errors[0] === "type") _errors.push(`${key}'s type is invalid, expected: ${type}`);
	else _errors.push(`The following constraints for ${key} are not met: ${errors.join(", ")}`);
	return _errors;
}
//#endregion
//#region node_modules/astro/dist/env/runtime.js
var _getEnv = (key) => process.env[key];
function setGetEnv(fn) {
	_getEnv = fn;
	_onSetGetEnv();
}
var _onSetGetEnv = () => {};
function setOnSetGetEnv(fn) {
	_onSetGetEnv = fn;
}
function getEnv(...args) {
	return _getEnv(...args);
}
function createInvalidVariablesError(key, type, result) {
	return new AstroError({
		...EnvInvalidVariables,
		message: EnvInvalidVariables.message(invalidVariablesToError([{
			key,
			type,
			errors: result.errors
		}]))
	});
}
//#endregion
export { setOnSetGetEnv as i, getEnv as n, setGetEnv as r, createInvalidVariablesError as t };
