globalThis.process ??= {};
globalThis.process.env ??= {};
import "./chunks/path_BqUacSWD.mjs";
import { c as App, i as deserializeManifest, l as DefaultFetchHandler, o as deserializeRouteInfo } from "./chunks/entrypoints_BIqffbxA.mjs";
import "./chunks/service_BxIRHiLo.mjs";
import { r as setGetEnv } from "./chunks/runtime__wLlrylH.mjs";
import "./chunks/assets_jOFuz5RL.mjs";
import "./chunks/_astro_assets_DO3rG9uo.mjs";
import { EventEmitter } from "node:events";
import { Writable } from "node:stream";
import { env } from "cloudflare:workers";
//#region node_modules/unenv/dist/runtime/node/internal/process/hrtime.mjs
var hrtime$1 = /* @__PURE__ */ Object.assign(function hrtime(startTime) {
	const now = Date.now();
	const seconds = Math.trunc(now / 1e3);
	const nanos = now % 1e3 * 1e6;
	if (startTime) {
		let diffSeconds = seconds - startTime[0];
		let diffNanos = nanos - startTime[0];
		if (diffNanos < 0) {
			diffSeconds = diffSeconds - 1;
			diffNanos = 1e9 + diffNanos;
		}
		return [diffSeconds, diffNanos];
	}
	return [seconds, nanos];
}, { bigint: function bigint() {
	return BigInt(Date.now() * 1e6);
} });
//#endregion
//#region node_modules/unenv/dist/runtime/node/internal/tty/read-stream.mjs
var ReadStream = class {
	fd;
	isRaw = false;
	isTTY = false;
	constructor(fd) {
		this.fd = fd;
	}
	setRawMode(mode) {
		this.isRaw = mode;
		return this;
	}
};
//#endregion
//#region node_modules/unenv/dist/runtime/node/internal/tty/write-stream.mjs
var WriteStream = class {
	fd;
	columns = 80;
	rows = 24;
	isTTY = false;
	constructor(fd) {
		this.fd = fd;
	}
	clearLine(dir, callback) {
		callback && callback();
		return false;
	}
	clearScreenDown(callback) {
		callback && callback();
		return false;
	}
	cursorTo(x, y, callback) {
		callback && typeof callback === "function" && callback();
		return false;
	}
	moveCursor(dx, dy, callback) {
		callback && callback();
		return false;
	}
	getColorDepth(env) {
		return 1;
	}
	hasColors(count, env) {
		return false;
	}
	getWindowSize() {
		return [this.columns, this.rows];
	}
	write(str, encoding, cb) {
		if (str instanceof Uint8Array) str = new TextDecoder().decode(str);
		try {
			console.log(str);
		} catch {}
		cb && typeof cb === "function" && cb();
		return false;
	}
};
//#endregion
//#region node_modules/unenv/dist/runtime/_internal/utils.mjs
/* @__NO_SIDE_EFFECTS__ */
function createNotImplementedError(name) {
	return /* @__PURE__ */ new Error(`[unenv] ${name} is not implemented yet!`);
}
/* @__NO_SIDE_EFFECTS__ */
function notImplemented(name) {
	const fn = () => {
		throw /* @__PURE__ */ createNotImplementedError(name);
	};
	return Object.assign(fn, { __unenv__: true });
}
/* @__NO_SIDE_EFFECTS__ */
function notImplementedClass(name) {
	return class {
		__unenv__ = true;
		constructor() {
			throw new Error(`[unenv] ${name} is not implemented yet!`);
		}
	};
}
//#endregion
//#region node_modules/unenv/dist/runtime/node/internal/process/node-version.mjs
var NODE_VERSION = "22.14.0";
//#endregion
//#region node_modules/unenv/dist/runtime/node/internal/process/process.mjs
var Process = class Process extends EventEmitter {
	env;
	hrtime;
	nextTick;
	constructor(impl) {
		super();
		this.env = impl.env;
		this.hrtime = impl.hrtime;
		this.nextTick = impl.nextTick;
		for (const prop of [...Object.getOwnPropertyNames(Process.prototype), ...Object.getOwnPropertyNames(EventEmitter.prototype)]) {
			const value = this[prop];
			if (typeof value === "function") this[prop] = value.bind(this);
		}
	}
	emitWarning(warning, type, code) {
		console.warn(`${code ? `[${code}] ` : ""}${type ? `${type}: ` : ""}${warning}`);
	}
	emit(...args) {
		return super.emit(...args);
	}
	listeners(eventName) {
		return super.listeners(eventName);
	}
	#stdin;
	#stdout;
	#stderr;
	get stdin() {
		return this.#stdin ??= new ReadStream(0);
	}
	get stdout() {
		return this.#stdout ??= new WriteStream(1);
	}
	get stderr() {
		return this.#stderr ??= new WriteStream(2);
	}
	#cwd = "/";
	chdir(cwd) {
		this.#cwd = cwd;
	}
	cwd() {
		return this.#cwd;
	}
	arch = "";
	platform = "";
	argv = [];
	argv0 = "";
	execArgv = [];
	execPath = "";
	title = "";
	pid = 200;
	ppid = 100;
	get version() {
		return `v${NODE_VERSION}`;
	}
	get versions() {
		return { node: NODE_VERSION };
	}
	get allowedNodeEnvironmentFlags() {
		return /* @__PURE__ */ new Set();
	}
	get sourceMapsEnabled() {
		return false;
	}
	get debugPort() {
		return 0;
	}
	get throwDeprecation() {
		return false;
	}
	get traceDeprecation() {
		return false;
	}
	get features() {
		return {};
	}
	get release() {
		return {};
	}
	get connected() {
		return false;
	}
	get config() {
		return {};
	}
	get moduleLoadList() {
		return [];
	}
	constrainedMemory() {
		return 0;
	}
	availableMemory() {
		return 0;
	}
	uptime() {
		return 0;
	}
	resourceUsage() {
		return {};
	}
	ref() {}
	unref() {}
	umask() {
		throw /* @__PURE__ */ createNotImplementedError("process.umask");
	}
	getBuiltinModule() {}
	getActiveResourcesInfo() {
		throw /* @__PURE__ */ createNotImplementedError("process.getActiveResourcesInfo");
	}
	exit() {
		throw /* @__PURE__ */ createNotImplementedError("process.exit");
	}
	reallyExit() {
		throw /* @__PURE__ */ createNotImplementedError("process.reallyExit");
	}
	kill() {
		throw /* @__PURE__ */ createNotImplementedError("process.kill");
	}
	abort() {
		throw /* @__PURE__ */ createNotImplementedError("process.abort");
	}
	dlopen() {
		throw /* @__PURE__ */ createNotImplementedError("process.dlopen");
	}
	setSourceMapsEnabled() {
		throw /* @__PURE__ */ createNotImplementedError("process.setSourceMapsEnabled");
	}
	loadEnvFile() {
		throw /* @__PURE__ */ createNotImplementedError("process.loadEnvFile");
	}
	disconnect() {
		throw /* @__PURE__ */ createNotImplementedError("process.disconnect");
	}
	cpuUsage() {
		throw /* @__PURE__ */ createNotImplementedError("process.cpuUsage");
	}
	setUncaughtExceptionCaptureCallback() {
		throw /* @__PURE__ */ createNotImplementedError("process.setUncaughtExceptionCaptureCallback");
	}
	hasUncaughtExceptionCaptureCallback() {
		throw /* @__PURE__ */ createNotImplementedError("process.hasUncaughtExceptionCaptureCallback");
	}
	initgroups() {
		throw /* @__PURE__ */ createNotImplementedError("process.initgroups");
	}
	openStdin() {
		throw /* @__PURE__ */ createNotImplementedError("process.openStdin");
	}
	assert() {
		throw /* @__PURE__ */ createNotImplementedError("process.assert");
	}
	binding() {
		throw /* @__PURE__ */ createNotImplementedError("process.binding");
	}
	permission = { has: /* @__PURE__ */ notImplemented("process.permission.has") };
	report = {
		directory: "",
		filename: "",
		signal: "SIGUSR2",
		compact: false,
		reportOnFatalError: false,
		reportOnSignal: false,
		reportOnUncaughtException: false,
		getReport: /* @__PURE__ */ notImplemented("process.report.getReport"),
		writeReport: /* @__PURE__ */ notImplemented("process.report.writeReport")
	};
	finalization = {
		register: /* @__PURE__ */ notImplemented("process.finalization.register"),
		unregister: /* @__PURE__ */ notImplemented("process.finalization.unregister"),
		registerBeforeExit: /* @__PURE__ */ notImplemented("process.finalization.registerBeforeExit")
	};
	memoryUsage = Object.assign(() => ({
		arrayBuffers: 0,
		rss: 0,
		external: 0,
		heapTotal: 0,
		heapUsed: 0
	}), { rss: () => 0 });
	mainModule = void 0;
	domain = void 0;
	send = void 0;
	exitCode = void 0;
	channel = void 0;
	getegid = void 0;
	geteuid = void 0;
	getgid = void 0;
	getgroups = void 0;
	getuid = void 0;
	setegid = void 0;
	seteuid = void 0;
	setgid = void 0;
	setgroups = void 0;
	setuid = void 0;
	_events = void 0;
	_eventsCount = void 0;
	_exiting = void 0;
	_maxListeners = void 0;
	_debugEnd = void 0;
	_debugProcess = void 0;
	_fatalException = void 0;
	_getActiveHandles = void 0;
	_getActiveRequests = void 0;
	_kill = void 0;
	_preload_modules = void 0;
	_rawDebug = void 0;
	_startProfilerIdleNotifier = void 0;
	_stopProfilerIdleNotifier = void 0;
	_tickCallback = void 0;
	_disconnect = void 0;
	_handleQueue = void 0;
	_pendingMessage = void 0;
	_channel = void 0;
	_send = void 0;
	_linkedBinding = void 0;
};
//#endregion
//#region node_modules/@cloudflare/unenv-preset/dist/runtime/node/process.mjs
var globalProcess = globalThis["process"];
var getBuiltinModule = globalProcess.getBuiltinModule;
var workerdProcess = getBuiltinModule("node:process");
var unenvProcess = new Process({
	env: globalProcess.env,
	hrtime: hrtime$1,
	nextTick: workerdProcess.nextTick
});
var { exit, features, platform } = workerdProcess;
var { _channel, _debugEnd, _debugProcess, _disconnect, _events, _eventsCount, _exiting, _fatalException, _getActiveHandles, _getActiveRequests, _handleQueue, _kill, _linkedBinding, _maxListeners, _pendingMessage, _preload_modules, _rawDebug, _send, _startProfilerIdleNotifier, _stopProfilerIdleNotifier, _tickCallback, abort, addListener, allowedNodeEnvironmentFlags, arch, argv, argv0, assert: assert$1, availableMemory, binding, channel, chdir, config, connected, constrainedMemory, cpuUsage, cwd, debugPort, disconnect, dlopen, domain, emit, emitWarning, env: env$1, eventNames, execArgv, execPath, exitCode, finalization, getActiveResourcesInfo, getegid, geteuid, getgid, getgroups, getMaxListeners, getuid, hasUncaughtExceptionCaptureCallback, hrtime, initgroups, kill, listenerCount, listeners, loadEnvFile, mainModule, memoryUsage, moduleLoadList, nextTick, off, on, once, openStdin, permission, pid, ppid, prependListener, prependOnceListener, rawListeners, reallyExit, ref, release, removeAllListeners, removeListener, report, resourceUsage, send, setegid, seteuid, setgid, setgroups, setMaxListeners, setSourceMapsEnabled, setuid, setUncaughtExceptionCaptureCallback, sourceMapsEnabled, stderr, stdin, stdout, throwDeprecation, title, traceDeprecation, umask, unref, uptime, version, versions } = unenvProcess;
//#endregion
//#region \0virtual:cloudflare/nodejs-global-inject/@cloudflare/unenv-preset/node/process
globalThis.process = {
	abort,
	addListener,
	allowedNodeEnvironmentFlags,
	hasUncaughtExceptionCaptureCallback,
	setUncaughtExceptionCaptureCallback,
	loadEnvFile,
	sourceMapsEnabled,
	arch,
	argv,
	argv0,
	chdir,
	config,
	connected,
	constrainedMemory,
	availableMemory,
	cpuUsage,
	cwd,
	debugPort,
	dlopen,
	disconnect,
	emit,
	emitWarning,
	env: env$1,
	eventNames,
	execArgv,
	execPath,
	exit,
	finalization,
	features,
	getBuiltinModule,
	getActiveResourcesInfo,
	getMaxListeners,
	hrtime,
	kill,
	listeners,
	listenerCount,
	memoryUsage,
	nextTick,
	on,
	off,
	once,
	pid,
	platform,
	ppid,
	prependListener,
	prependOnceListener,
	rawListeners,
	release,
	removeAllListeners,
	removeListener,
	report,
	resourceUsage,
	setMaxListeners,
	setSourceMapsEnabled,
	stderr,
	stdin,
	stdout,
	title,
	throwDeprecation,
	traceDeprecation,
	umask,
	uptime,
	version,
	versions,
	domain,
	initgroups,
	moduleLoadList,
	reallyExit,
	openStdin,
	assert: assert$1,
	binding,
	send,
	exitCode,
	channel,
	getegid,
	geteuid,
	getgid,
	getgroups,
	getuid,
	setegid,
	seteuid,
	setgid,
	setgroups,
	setuid,
	permission,
	mainModule,
	_events,
	_eventsCount,
	_exiting,
	_maxListeners,
	_debugEnd,
	_debugProcess,
	_fatalException,
	_getActiveHandles,
	_getActiveRequests,
	_kill,
	_preload_modules,
	_rawDebug,
	_startProfilerIdleNotifier,
	_stopProfilerIdleNotifier,
	_tickCallback,
	_disconnect,
	_handleQueue,
	_pendingMessage,
	_channel,
	_send,
	_linkedBinding
};
//#endregion
//#region node_modules/unenv/dist/runtime/mock/noop.mjs
var noop_default = Object.assign(() => {}, { __unenv__: true });
//#endregion
//#region node_modules/unenv/dist/runtime/node/console.mjs
var _console = globalThis.console;
var _stderr = new Writable();
var _stdout = new Writable();
_console?.log;
_console?.info;
_console?.trace;
_console?.debug;
_console?.table;
_console?.error;
_console?.warn;
_console?.createTask;
_console?.clear;
_console?.count;
_console?.countReset;
_console?.dir;
_console?.dirxml;
_console?.group;
_console?.groupEnd;
_console?.groupCollapsed;
_console?.profile;
_console?.profileEnd;
_console?.time;
_console?.timeEnd;
_console?.timeLog;
_console?.timeStamp;
var Console = _console?.Console ?? /* @__PURE__ */ notImplementedClass("console.Console");
var _times = /* @__PURE__ */ new Map();
var _stdoutErrorHandler = noop_default;
var _stderrErrorHandler = noop_default;
//#endregion
//#region node_modules/@cloudflare/unenv-preset/dist/runtime/node/console.mjs
var workerdConsole = globalThis["console"];
var { assert, clear, context, count, countReset, createTask, debug, dir, dirxml, error, group, groupCollapsed, groupEnd, info, log, profile, profileEnd, table, time, timeEnd, timeLog, timeStamp, trace, warn } = workerdConsole;
Object.assign(workerdConsole, {
	Console,
	_ignoreErrors: true,
	_stderr,
	_stderrErrorHandler,
	_stdout,
	_stdoutErrorHandler,
	_times
});
//#endregion
//#region \0virtual:cloudflare/nodejs-global-inject/@cloudflare/unenv-preset/node/console
globalThis.console = workerdConsole;
//#endregion
//#region \0virtual:astro-cloudflare:config
var sessionKVBindingName = "SESSION";
//#endregion
//#region \0virtual:astro:fetchable
var _virtual_astro_fetchable_default = new DefaultFetchHandler();
//#endregion
//#region \0virtual:astro:renderers
var renderers = [];
[
	{
		"file": "",
		"links": [],
		"scripts": [],
		"styles": [],
		"routeData": {
			"type": "page",
			"component": "_server-islands.astro",
			"params": ["name"],
			"segments": [[{
				"content": "_server-islands",
				"dynamic": false,
				"spread": false
			}], [{
				"content": "name",
				"dynamic": true,
				"spread": false
			}]],
			"pattern": "^\\/_server-islands\\/([^/]+?)\\/?$",
			"prerender": false,
			"isIndex": false,
			"fallbackRoutes": [],
			"route": "/_server-islands/[name]",
			"origin": "internal",
			"distURL": [],
			"_meta": { "trailingSlash": "ignore" }
		}
	},
	{
		"file": "",
		"links": [],
		"scripts": [],
		"styles": [],
		"routeData": {
			"route": "/_image",
			"component": "node_modules/@astrojs/cloudflare/dist/entrypoints/image-passthrough-endpoint.js",
			"params": [],
			"pathname": "/_image",
			"pattern": "^\\/_image\\/?$",
			"segments": [[{
				"content": "_image",
				"dynamic": false,
				"spread": false
			}]],
			"type": "endpoint",
			"prerender": false,
			"fallbackRoutes": [],
			"distURL": [],
			"isIndex": false,
			"origin": "internal",
			"_meta": { "trailingSlash": "ignore" }
		}
	},
	{
		"file": "",
		"links": [],
		"scripts": [],
		"styles": [],
		"routeData": {
			"route": "/.well-known/mcp.json",
			"isIndex": false,
			"type": "endpoint",
			"pattern": "^\\/\\.well-known\\/mcp\\.json$",
			"segments": [[{
				"content": ".well-known",
				"dynamic": false,
				"spread": false
			}], [{
				"content": "mcp.json",
				"dynamic": false,
				"spread": false
			}]],
			"params": [],
			"component": "src/pages/.well-known/mcp.json.ts",
			"pathname": "/.well-known/mcp.json",
			"prerender": false,
			"fallbackRoutes": [],
			"distURL": [],
			"origin": "project",
			"_meta": { "trailingSlash": "ignore" }
		}
	},
	{
		"file": "",
		"links": [],
		"scripts": [],
		"styles": [],
		"routeData": {
			"route": "/404",
			"isIndex": false,
			"type": "page",
			"pattern": "^\\/404\\/?$",
			"segments": [[{
				"content": "404",
				"dynamic": false,
				"spread": false
			}]],
			"params": [],
			"component": "src/pages/404.astro",
			"pathname": "/404",
			"prerender": false,
			"fallbackRoutes": [],
			"distURL": [],
			"origin": "project",
			"_meta": { "trailingSlash": "ignore" }
		}
	},
	{
		"file": "",
		"links": [],
		"scripts": [],
		"styles": [],
		"routeData": {
			"route": "/account",
			"isIndex": false,
			"type": "page",
			"pattern": "^\\/account\\/?$",
			"segments": [[{
				"content": "account",
				"dynamic": false,
				"spread": false
			}]],
			"params": [],
			"component": "src/pages/account.astro",
			"pathname": "/account",
			"prerender": false,
			"fallbackRoutes": [],
			"distURL": [],
			"origin": "project",
			"_meta": { "trailingSlash": "ignore" }
		}
	},
	{
		"file": "",
		"links": [],
		"scripts": [],
		"styles": [],
		"routeData": {
			"route": "/api/auth/login",
			"isIndex": false,
			"type": "endpoint",
			"pattern": "^\\/api\\/auth\\/login\\/?$",
			"segments": [
				[{
					"content": "api",
					"dynamic": false,
					"spread": false
				}],
				[{
					"content": "auth",
					"dynamic": false,
					"spread": false
				}],
				[{
					"content": "login",
					"dynamic": false,
					"spread": false
				}]
			],
			"params": [],
			"component": "src/pages/api/auth/login.ts",
			"pathname": "/api/auth/login",
			"prerender": false,
			"fallbackRoutes": [],
			"distURL": [],
			"origin": "project",
			"_meta": { "trailingSlash": "ignore" }
		}
	},
	{
		"file": "",
		"links": [],
		"scripts": [],
		"styles": [],
		"routeData": {
			"route": "/api/auth/logout",
			"isIndex": false,
			"type": "endpoint",
			"pattern": "^\\/api\\/auth\\/logout\\/?$",
			"segments": [
				[{
					"content": "api",
					"dynamic": false,
					"spread": false
				}],
				[{
					"content": "auth",
					"dynamic": false,
					"spread": false
				}],
				[{
					"content": "logout",
					"dynamic": false,
					"spread": false
				}]
			],
			"params": [],
			"component": "src/pages/api/auth/logout.ts",
			"pathname": "/api/auth/logout",
			"prerender": false,
			"fallbackRoutes": [],
			"distURL": [],
			"origin": "project",
			"_meta": { "trailingSlash": "ignore" }
		}
	},
	{
		"file": "",
		"links": [],
		"scripts": [],
		"styles": [],
		"routeData": {
			"route": "/api/auth/register",
			"isIndex": false,
			"type": "endpoint",
			"pattern": "^\\/api\\/auth\\/register\\/?$",
			"segments": [
				[{
					"content": "api",
					"dynamic": false,
					"spread": false
				}],
				[{
					"content": "auth",
					"dynamic": false,
					"spread": false
				}],
				[{
					"content": "register",
					"dynamic": false,
					"spread": false
				}]
			],
			"params": [],
			"component": "src/pages/api/auth/register.ts",
			"pathname": "/api/auth/register",
			"prerender": false,
			"fallbackRoutes": [],
			"distURL": [],
			"origin": "project",
			"_meta": { "trailingSlash": "ignore" }
		}
	},
	{
		"file": "",
		"links": [],
		"scripts": [],
		"styles": [],
		"routeData": {
			"route": "/api/comments",
			"isIndex": false,
			"type": "endpoint",
			"pattern": "^\\/api\\/comments\\/?$",
			"segments": [[{
				"content": "api",
				"dynamic": false,
				"spread": false
			}], [{
				"content": "comments",
				"dynamic": false,
				"spread": false
			}]],
			"params": [],
			"component": "src/pages/api/comments.ts",
			"pathname": "/api/comments",
			"prerender": false,
			"fallbackRoutes": [],
			"distURL": [],
			"origin": "project",
			"_meta": { "trailingSlash": "ignore" }
		}
	},
	{
		"file": "",
		"links": [],
		"scripts": [],
		"styles": [],
		"routeData": {
			"route": "/api/hatch/[...path]",
			"isIndex": false,
			"type": "endpoint",
			"pattern": "^\\/api\\/hatch(?:\\/(.*?))?\\/?$",
			"segments": [
				[{
					"content": "api",
					"dynamic": false,
					"spread": false
				}],
				[{
					"content": "hatch",
					"dynamic": false,
					"spread": false
				}],
				[{
					"content": "...path",
					"dynamic": true,
					"spread": true
				}]
			],
			"params": ["...path"],
			"component": "src/pages/api/hatch/[...path].ts",
			"prerender": false,
			"fallbackRoutes": [],
			"distURL": [],
			"origin": "project",
			"_meta": { "trailingSlash": "ignore" }
		}
	},
	{
		"file": "",
		"links": [],
		"scripts": [],
		"styles": [],
		"routeData": {
			"route": "/api/hatch-comments/post",
			"isIndex": false,
			"type": "endpoint",
			"pattern": "^\\/api\\/hatch-comments\\/post\\/?$",
			"segments": [
				[{
					"content": "api",
					"dynamic": false,
					"spread": false
				}],
				[{
					"content": "hatch-comments",
					"dynamic": false,
					"spread": false
				}],
				[{
					"content": "post",
					"dynamic": false,
					"spread": false
				}]
			],
			"params": [],
			"component": "src/pages/api/hatch-comments/post.ts",
			"pathname": "/api/hatch-comments/post",
			"prerender": false,
			"fallbackRoutes": [],
			"distURL": [],
			"origin": "project",
			"_meta": { "trailingSlash": "ignore" }
		}
	},
	{
		"file": "",
		"links": [],
		"scripts": [],
		"styles": [],
		"routeData": {
			"route": "/api/hatch-form/[provider]/[id]/submit",
			"isIndex": false,
			"type": "endpoint",
			"pattern": "^\\/api\\/hatch-form\\/([^/]+?)\\/([^/]+?)\\/submit\\/?$",
			"segments": [
				[{
					"content": "api",
					"dynamic": false,
					"spread": false
				}],
				[{
					"content": "hatch-form",
					"dynamic": false,
					"spread": false
				}],
				[{
					"content": "provider",
					"dynamic": true,
					"spread": false
				}],
				[{
					"content": "id",
					"dynamic": true,
					"spread": false
				}],
				[{
					"content": "submit",
					"dynamic": false,
					"spread": false
				}]
			],
			"params": ["provider", "id"],
			"component": "src/pages/api/hatch-form/[provider]/[id]/submit.ts",
			"prerender": false,
			"fallbackRoutes": [],
			"distURL": [],
			"origin": "project",
			"_meta": { "trailingSlash": "ignore" }
		}
	},
	{
		"file": "",
		"links": [],
		"scripts": [],
		"styles": [],
		"routeData": {
			"route": "/api/hatch-form/[provider]/[id]",
			"isIndex": false,
			"type": "endpoint",
			"pattern": "^\\/api\\/hatch-form\\/([^/]+?)\\/([^/]+?)\\/?$",
			"segments": [
				[{
					"content": "api",
					"dynamic": false,
					"spread": false
				}],
				[{
					"content": "hatch-form",
					"dynamic": false,
					"spread": false
				}],
				[{
					"content": "provider",
					"dynamic": true,
					"spread": false
				}],
				[{
					"content": "id",
					"dynamic": true,
					"spread": false
				}]
			],
			"params": ["provider", "id"],
			"component": "src/pages/api/hatch-form/[provider]/[id].ts",
			"prerender": false,
			"fallbackRoutes": [],
			"distURL": [],
			"origin": "project",
			"_meta": { "trailingSlash": "ignore" }
		}
	},
	{
		"file": "",
		"links": [],
		"scripts": [],
		"styles": [],
		"routeData": {
			"route": "/api/hatch-verify",
			"isIndex": false,
			"type": "endpoint",
			"pattern": "^\\/api\\/hatch-verify\\/?$",
			"segments": [[{
				"content": "api",
				"dynamic": false,
				"spread": false
			}], [{
				"content": "hatch-verify",
				"dynamic": false,
				"spread": false
			}]],
			"params": [],
			"component": "src/pages/api/hatch-verify.ts",
			"pathname": "/api/hatch-verify",
			"prerender": false,
			"fallbackRoutes": [],
			"distURL": [],
			"origin": "project",
			"_meta": { "trailingSlash": "ignore" }
		}
	},
	{
		"file": "",
		"links": [],
		"scripts": [],
		"styles": [],
		"routeData": {
			"route": "/api/revalidate",
			"isIndex": false,
			"type": "endpoint",
			"pattern": "^\\/api\\/revalidate\\/?$",
			"segments": [[{
				"content": "api",
				"dynamic": false,
				"spread": false
			}], [{
				"content": "revalidate",
				"dynamic": false,
				"spread": false
			}]],
			"params": [],
			"component": "src/pages/api/revalidate.ts",
			"pathname": "/api/revalidate",
			"prerender": false,
			"fallbackRoutes": [],
			"distURL": [],
			"origin": "project",
			"_meta": { "trailingSlash": "ignore" }
		}
	},
	{
		"file": "",
		"links": [],
		"scripts": [],
		"styles": [],
		"routeData": {
			"route": "/api/telemetry",
			"isIndex": false,
			"type": "endpoint",
			"pattern": "^\\/api\\/telemetry\\/?$",
			"segments": [[{
				"content": "api",
				"dynamic": false,
				"spread": false
			}], [{
				"content": "telemetry",
				"dynamic": false,
				"spread": false
			}]],
			"params": [],
			"component": "src/pages/api/telemetry.ts",
			"pathname": "/api/telemetry",
			"prerender": false,
			"fallbackRoutes": [],
			"distURL": [],
			"origin": "project",
			"_meta": { "trailingSlash": "ignore" }
		}
	},
	{
		"file": "",
		"links": [],
		"scripts": [],
		"styles": [],
		"routeData": {
			"route": "/api/wc-store/[...path]",
			"isIndex": false,
			"type": "endpoint",
			"pattern": "^\\/api\\/wc-store(?:\\/(.*?))?\\/?$",
			"segments": [
				[{
					"content": "api",
					"dynamic": false,
					"spread": false
				}],
				[{
					"content": "wc-store",
					"dynamic": false,
					"spread": false
				}],
				[{
					"content": "...path",
					"dynamic": true,
					"spread": true
				}]
			],
			"params": ["...path"],
			"component": "src/pages/api/wc-store/[...path].ts",
			"prerender": false,
			"fallbackRoutes": [],
			"distURL": [],
			"origin": "project",
			"_meta": { "trailingSlash": "ignore" }
		}
	},
	{
		"file": "",
		"links": [],
		"scripts": [],
		"styles": [],
		"routeData": {
			"route": "/api/wc-stripe-verify",
			"isIndex": false,
			"type": "endpoint",
			"pattern": "^\\/api\\/wc-stripe-verify\\/?$",
			"segments": [[{
				"content": "api",
				"dynamic": false,
				"spread": false
			}], [{
				"content": "wc-stripe-verify",
				"dynamic": false,
				"spread": false
			}]],
			"params": [],
			"component": "src/pages/api/wc-stripe-verify.ts",
			"pathname": "/api/wc-stripe-verify",
			"prerender": false,
			"fallbackRoutes": [],
			"distURL": [],
			"origin": "project",
			"_meta": { "trailingSlash": "ignore" }
		}
	},
	{
		"file": "",
		"links": [],
		"scripts": [],
		"styles": [],
		"routeData": {
			"route": "/author/[slug]",
			"isIndex": false,
			"type": "page",
			"pattern": "^\\/author\\/([^/]+?)\\/?$",
			"segments": [[{
				"content": "author",
				"dynamic": false,
				"spread": false
			}], [{
				"content": "slug",
				"dynamic": true,
				"spread": false
			}]],
			"params": ["slug"],
			"component": "src/pages/author/[slug].astro",
			"prerender": false,
			"fallbackRoutes": [],
			"distURL": [],
			"origin": "project",
			"_meta": { "trailingSlash": "ignore" }
		}
	},
	{
		"file": "",
		"links": [],
		"scripts": [],
		"styles": [],
		"routeData": {
			"route": "/blog/author/[slug]",
			"isIndex": false,
			"type": "page",
			"pattern": "^\\/blog\\/author\\/([^/]+?)\\/?$",
			"segments": [
				[{
					"content": "blog",
					"dynamic": false,
					"spread": false
				}],
				[{
					"content": "author",
					"dynamic": false,
					"spread": false
				}],
				[{
					"content": "slug",
					"dynamic": true,
					"spread": false
				}]
			],
			"params": ["slug"],
			"component": "src/pages/blog/author/[slug].astro",
			"prerender": false,
			"fallbackRoutes": [],
			"distURL": [],
			"origin": "project",
			"_meta": { "trailingSlash": "ignore" }
		}
	},
	{
		"file": "",
		"links": [],
		"scripts": [],
		"styles": [],
		"routeData": {
			"route": "/blog/category/[slug]",
			"isIndex": false,
			"type": "page",
			"pattern": "^\\/blog\\/category\\/([^/]+?)\\/?$",
			"segments": [
				[{
					"content": "blog",
					"dynamic": false,
					"spread": false
				}],
				[{
					"content": "category",
					"dynamic": false,
					"spread": false
				}],
				[{
					"content": "slug",
					"dynamic": true,
					"spread": false
				}]
			],
			"params": ["slug"],
			"component": "src/pages/blog/category/[slug].astro",
			"prerender": false,
			"fallbackRoutes": [],
			"distURL": [],
			"origin": "project",
			"_meta": { "trailingSlash": "ignore" }
		}
	},
	{
		"file": "",
		"links": [],
		"scripts": [],
		"styles": [],
		"routeData": {
			"route": "/blog/tag/[slug]",
			"isIndex": false,
			"type": "page",
			"pattern": "^\\/blog\\/tag\\/([^/]+?)\\/?$",
			"segments": [
				[{
					"content": "blog",
					"dynamic": false,
					"spread": false
				}],
				[{
					"content": "tag",
					"dynamic": false,
					"spread": false
				}],
				[{
					"content": "slug",
					"dynamic": true,
					"spread": false
				}]
			],
			"params": ["slug"],
			"component": "src/pages/blog/tag/[slug].astro",
			"prerender": false,
			"fallbackRoutes": [],
			"distURL": [],
			"origin": "project",
			"_meta": { "trailingSlash": "ignore" }
		}
	},
	{
		"file": "",
		"links": [],
		"scripts": [],
		"styles": [],
		"routeData": {
			"route": "/blog/[slug]",
			"isIndex": false,
			"type": "page",
			"pattern": "^\\/blog\\/([^/]+?)\\/?$",
			"segments": [[{
				"content": "blog",
				"dynamic": false,
				"spread": false
			}], [{
				"content": "slug",
				"dynamic": true,
				"spread": false
			}]],
			"params": ["slug"],
			"component": "src/pages/blog/[slug].astro",
			"prerender": false,
			"fallbackRoutes": [],
			"distURL": [],
			"origin": "project",
			"_meta": { "trailingSlash": "ignore" }
		}
	},
	{
		"file": "",
		"links": [],
		"scripts": [],
		"styles": [],
		"routeData": {
			"route": "/blog",
			"isIndex": true,
			"type": "page",
			"pattern": "^\\/blog\\/?$",
			"segments": [[{
				"content": "blog",
				"dynamic": false,
				"spread": false
			}]],
			"params": [],
			"component": "src/pages/blog/index.astro",
			"pathname": "/blog",
			"prerender": false,
			"fallbackRoutes": [],
			"distURL": [],
			"origin": "project",
			"_meta": { "trailingSlash": "ignore" }
		}
	},
	{
		"file": "",
		"links": [],
		"scripts": [],
		"styles": [],
		"routeData": {
			"route": "/cart",
			"isIndex": false,
			"type": "page",
			"pattern": "^\\/cart\\/?$",
			"segments": [[{
				"content": "cart",
				"dynamic": false,
				"spread": false
			}]],
			"params": [],
			"component": "src/pages/cart.astro",
			"pathname": "/cart",
			"prerender": false,
			"fallbackRoutes": [],
			"distURL": [],
			"origin": "project",
			"_meta": { "trailingSlash": "ignore" }
		}
	},
	{
		"file": "",
		"links": [],
		"scripts": [],
		"styles": [],
		"routeData": {
			"route": "/category/[slug]",
			"isIndex": false,
			"type": "page",
			"pattern": "^\\/category\\/([^/]+?)\\/?$",
			"segments": [[{
				"content": "category",
				"dynamic": false,
				"spread": false
			}], [{
				"content": "slug",
				"dynamic": true,
				"spread": false
			}]],
			"params": ["slug"],
			"component": "src/pages/category/[slug].astro",
			"prerender": false,
			"fallbackRoutes": [],
			"distURL": [],
			"origin": "project",
			"_meta": { "trailingSlash": "ignore" }
		}
	},
	{
		"file": "",
		"links": [],
		"scripts": [],
		"styles": [],
		"routeData": {
			"route": "/checkout",
			"isIndex": false,
			"type": "page",
			"pattern": "^\\/checkout\\/?$",
			"segments": [[{
				"content": "checkout",
				"dynamic": false,
				"spread": false
			}]],
			"params": [],
			"component": "src/pages/checkout.astro",
			"pathname": "/checkout",
			"prerender": false,
			"fallbackRoutes": [],
			"distURL": [],
			"origin": "project",
			"_meta": { "trailingSlash": "ignore" }
		}
	},
	{
		"file": "",
		"links": [],
		"scripts": [],
		"styles": [],
		"routeData": {
			"route": "/hatch-media/[...path]",
			"isIndex": false,
			"type": "endpoint",
			"pattern": "^\\/hatch-media(?:\\/(.*?))?\\/?$",
			"segments": [[{
				"content": "hatch-media",
				"dynamic": false,
				"spread": false
			}], [{
				"content": "...path",
				"dynamic": true,
				"spread": true
			}]],
			"params": ["...path"],
			"component": "src/pages/hatch-media/[...path].ts",
			"prerender": false,
			"fallbackRoutes": [],
			"distURL": [],
			"origin": "project",
			"_meta": { "trailingSlash": "ignore" }
		}
	},
	{
		"file": "",
		"links": [],
		"scripts": [],
		"styles": [],
		"routeData": {
			"route": "/img",
			"isIndex": false,
			"type": "endpoint",
			"pattern": "^\\/img\\/?$",
			"segments": [[{
				"content": "img",
				"dynamic": false,
				"spread": false
			}]],
			"params": [],
			"component": "src/pages/img.ts",
			"pathname": "/img",
			"prerender": false,
			"fallbackRoutes": [],
			"distURL": [],
			"origin": "project",
			"_meta": { "trailingSlash": "ignore" }
		}
	},
	{
		"file": "",
		"links": [],
		"scripts": [],
		"styles": [],
		"routeData": {
			"route": "/llms.txt",
			"isIndex": false,
			"type": "endpoint",
			"pattern": "^\\/llms\\.txt$",
			"segments": [[{
				"content": "llms.txt",
				"dynamic": false,
				"spread": false
			}]],
			"params": [],
			"component": "src/pages/llms.txt.ts",
			"pathname": "/llms.txt",
			"prerender": false,
			"fallbackRoutes": [],
			"distURL": [],
			"origin": "project",
			"_meta": { "trailingSlash": "ignore" }
		}
	},
	{
		"file": "",
		"links": [],
		"scripts": [],
		"styles": [],
		"routeData": {
			"route": "/login",
			"isIndex": false,
			"type": "page",
			"pattern": "^\\/login\\/?$",
			"segments": [[{
				"content": "login",
				"dynamic": false,
				"spread": false
			}]],
			"params": [],
			"component": "src/pages/login.astro",
			"pathname": "/login",
			"prerender": false,
			"fallbackRoutes": [],
			"distURL": [],
			"origin": "project",
			"_meta": { "trailingSlash": "ignore" }
		}
	},
	{
		"file": "",
		"links": [],
		"scripts": [],
		"styles": [],
		"routeData": {
			"route": "/order-summary",
			"isIndex": false,
			"type": "page",
			"pattern": "^\\/order-summary\\/?$",
			"segments": [[{
				"content": "order-summary",
				"dynamic": false,
				"spread": false
			}]],
			"params": [],
			"component": "src/pages/order-summary.astro",
			"pathname": "/order-summary",
			"prerender": false,
			"fallbackRoutes": [],
			"distURL": [],
			"origin": "project",
			"_meta": { "trailingSlash": "ignore" }
		}
	},
	{
		"file": "",
		"links": [],
		"scripts": [],
		"styles": [],
		"routeData": {
			"route": "/product/[slug]",
			"isIndex": false,
			"type": "page",
			"pattern": "^\\/product\\/([^/]+?)\\/?$",
			"segments": [[{
				"content": "product",
				"dynamic": false,
				"spread": false
			}], [{
				"content": "slug",
				"dynamic": true,
				"spread": false
			}]],
			"params": ["slug"],
			"component": "src/pages/product/[slug].astro",
			"prerender": false,
			"fallbackRoutes": [],
			"distURL": [],
			"origin": "project",
			"_meta": { "trailingSlash": "ignore" }
		}
	},
	{
		"file": "",
		"links": [],
		"scripts": [],
		"styles": [],
		"routeData": {
			"route": "/register",
			"isIndex": false,
			"type": "page",
			"pattern": "^\\/register\\/?$",
			"segments": [[{
				"content": "register",
				"dynamic": false,
				"spread": false
			}]],
			"params": [],
			"component": "src/pages/register.astro",
			"pathname": "/register",
			"prerender": false,
			"fallbackRoutes": [],
			"distURL": [],
			"origin": "project",
			"_meta": { "trailingSlash": "ignore" }
		}
	},
	{
		"file": "",
		"links": [],
		"scripts": [],
		"styles": [],
		"routeData": {
			"route": "/robots.txt",
			"isIndex": false,
			"type": "endpoint",
			"pattern": "^\\/robots\\.txt$",
			"segments": [[{
				"content": "robots.txt",
				"dynamic": false,
				"spread": false
			}]],
			"params": [],
			"component": "src/pages/robots.txt.ts",
			"pathname": "/robots.txt",
			"prerender": false,
			"fallbackRoutes": [],
			"distURL": [],
			"origin": "project",
			"_meta": { "trailingSlash": "ignore" }
		}
	},
	{
		"file": "",
		"links": [],
		"scripts": [],
		"styles": [],
		"routeData": {
			"route": "/rss.xml",
			"isIndex": false,
			"type": "endpoint",
			"pattern": "^\\/rss\\.xml$",
			"segments": [[{
				"content": "rss.xml",
				"dynamic": false,
				"spread": false
			}]],
			"params": [],
			"component": "src/pages/rss.xml.ts",
			"pathname": "/rss.xml",
			"prerender": false,
			"fallbackRoutes": [],
			"distURL": [],
			"origin": "project",
			"_meta": { "trailingSlash": "ignore" }
		}
	},
	{
		"file": "",
		"links": [],
		"scripts": [],
		"styles": [],
		"routeData": {
			"route": "/search",
			"isIndex": false,
			"type": "page",
			"pattern": "^\\/search\\/?$",
			"segments": [[{
				"content": "search",
				"dynamic": false,
				"spread": false
			}]],
			"params": [],
			"component": "src/pages/search.astro",
			"pathname": "/search",
			"prerender": false,
			"fallbackRoutes": [],
			"distURL": [],
			"origin": "project",
			"_meta": { "trailingSlash": "ignore" }
		}
	},
	{
		"file": "",
		"links": [],
		"scripts": [],
		"styles": [],
		"routeData": {
			"route": "/shop",
			"isIndex": false,
			"type": "page",
			"pattern": "^\\/shop\\/?$",
			"segments": [[{
				"content": "shop",
				"dynamic": false,
				"spread": false
			}]],
			"params": [],
			"component": "src/pages/shop.astro",
			"pathname": "/shop",
			"prerender": false,
			"fallbackRoutes": [],
			"distURL": [],
			"origin": "project",
			"_meta": { "trailingSlash": "ignore" }
		}
	},
	{
		"file": "",
		"links": [],
		"scripts": [],
		"styles": [],
		"routeData": {
			"route": "/sitemap-index.xml",
			"isIndex": false,
			"type": "endpoint",
			"pattern": "^\\/sitemap-index\\.xml$",
			"segments": [[{
				"content": "sitemap-index.xml",
				"dynamic": false,
				"spread": false
			}]],
			"params": [],
			"component": "src/pages/sitemap-index.xml.ts",
			"pathname": "/sitemap-index.xml",
			"prerender": false,
			"fallbackRoutes": [],
			"distURL": [],
			"origin": "project",
			"_meta": { "trailingSlash": "ignore" }
		}
	},
	{
		"file": "",
		"links": [],
		"scripts": [],
		"styles": [],
		"routeData": {
			"route": "/sitemap.xml",
			"isIndex": false,
			"type": "endpoint",
			"pattern": "^\\/sitemap\\.xml$",
			"segments": [[{
				"content": "sitemap.xml",
				"dynamic": false,
				"spread": false
			}]],
			"params": [],
			"component": "src/pages/sitemap.xml.ts",
			"pathname": "/sitemap.xml",
			"prerender": false,
			"fallbackRoutes": [],
			"distURL": [],
			"origin": "project",
			"_meta": { "trailingSlash": "ignore" }
		}
	},
	{
		"file": "",
		"links": [],
		"scripts": [],
		"styles": [],
		"routeData": {
			"route": "/tag/[slug]",
			"isIndex": false,
			"type": "page",
			"pattern": "^\\/tag\\/([^/]+?)\\/?$",
			"segments": [[{
				"content": "tag",
				"dynamic": false,
				"spread": false
			}], [{
				"content": "slug",
				"dynamic": true,
				"spread": false
			}]],
			"params": ["slug"],
			"component": "src/pages/tag/[slug].astro",
			"prerender": false,
			"fallbackRoutes": [],
			"distURL": [],
			"origin": "project",
			"_meta": { "trailingSlash": "ignore" }
		}
	},
	{
		"file": "",
		"links": [],
		"scripts": [],
		"styles": [],
		"routeData": {
			"route": "/",
			"isIndex": true,
			"type": "page",
			"pattern": "^\\/$",
			"segments": [],
			"params": [],
			"component": "src/pages/index.astro",
			"pathname": "/",
			"prerender": false,
			"fallbackRoutes": [],
			"distURL": [],
			"origin": "project",
			"_meta": { "trailingSlash": "ignore" }
		}
	},
	{
		"file": "",
		"links": [],
		"scripts": [],
		"styles": [],
		"routeData": {
			"route": "/[...slug]",
			"isIndex": false,
			"type": "page",
			"pattern": "^(?:\\/(.*?))?\\/?$",
			"segments": [[{
				"content": "...slug",
				"dynamic": true,
				"spread": true
			}]],
			"params": ["...slug"],
			"component": "src/pages/[...slug].astro",
			"prerender": false,
			"fallbackRoutes": [],
			"distURL": [],
			"origin": "project",
			"_meta": { "trailingSlash": "ignore" }
		}
	}
].map(deserializeRouteInfo);
//#endregion
//#region \0virtual:astro:pages
var _page0 = () => import("./chunks/image-passthrough-endpoint_BI6Mr8gP.mjs");
var _page1 = () => import("./chunks/mcp_iPuWzJng.mjs");
var _page2 = () => import("./chunks/404_DbuY62NT.mjs");
var _page3 = () => import("./chunks/account_-l82wsV_.mjs");
var _page4 = () => import("./chunks/login_BUpnAB1T.mjs");
var _page5 = () => import("./chunks/logout_Bz_xCutw.mjs");
var _page6 = () => import("./chunks/register_D56eFm-_.mjs");
var _page7 = () => import("./chunks/comments_DMRug1Xq.mjs");
var _page8 = () => import("./chunks/_.._Boc3A5mZ.mjs");
var _page9 = () => import("./chunks/post_CjzQgnDS.mjs");
var _page10 = () => import("./chunks/submit_GweChvTm.mjs");
var _page11 = () => import("./chunks/_id__BKgQ9HDz.mjs");
var _page12 = () => import("./chunks/hatch-verify_C8ZImo7B.mjs");
var _page13 = () => import("./chunks/revalidate_DQGPiU5D.mjs");
var _page14 = () => import("./chunks/telemetry_BqySpWTf.mjs");
var _page15 = () => import("./chunks/_.._DAhUixkH.mjs");
var _page16 = () => import("./chunks/wc-stripe-verify_CuDCkC42.mjs");
var _page17 = () => import("./chunks/_slug__DKTHU1CI.mjs");
var _page18 = () => import("./chunks/_slug__ClG57Kin.mjs");
var _page19 = () => import("./chunks/_slug__BOyAAYA3.mjs");
var _page20 = () => import("./chunks/_slug__BRqBE9C-.mjs");
var _page21 = () => import("./chunks/_slug__C3nvYSnR.mjs");
var _page22 = () => import("./chunks/index_2TRAFb6N.mjs");
var _page23 = () => import("./chunks/cart_CDSDI3Ol.mjs");
var _page24 = () => import("./chunks/_slug__WG66VlHH.mjs");
var _page25 = () => import("./chunks/checkout_vCPPp8wu.mjs");
var _page26 = () => import("./chunks/_.._wxXxjNhA.mjs");
var _page27 = () => import("./chunks/img_CV2INanz.mjs");
var _page28 = () => import("./chunks/llms_DH5wbGoS.mjs");
var _page29 = () => import("./chunks/login_C1jzKGQP.mjs");
var _page30 = () => import("./chunks/order-summary_C_gPBWjA.mjs");
var _page31 = () => import("./chunks/_slug__BcWrSXS-.mjs");
var _page32 = () => import("./chunks/register_5PcGH4Ab.mjs");
var _page33 = () => import("./chunks/robots_quFJA6xc.mjs");
var _page34 = () => import("./chunks/rss_Dj8NFIX0.mjs");
var _page35 = () => import("./chunks/search_n2jHG2MZ.mjs");
var _page36 = () => import("./chunks/shop_BjZiJETW.mjs");
var _page37 = () => import("./chunks/sitemap-index_BT8Udu_M.mjs");
var _page38 = () => import("./chunks/sitemap_BUXU_eyV.mjs");
var _page39 = () => import("./chunks/_slug__BQ9y0Q1F.mjs");
var _page40 = () => import("./chunks/index_B2tgzE02.mjs");
var _page41 = () => import("./chunks/_.._jytCwUBH.mjs");
var pageMap = /* @__PURE__ */ new Map([
	["node_modules/@astrojs/cloudflare/dist/entrypoints/image-passthrough-endpoint.js", _page0],
	["src/pages/.well-known/mcp.json.ts", _page1],
	["src/pages/404.astro", _page2],
	["src/pages/account.astro", _page3],
	["src/pages/api/auth/login.ts", _page4],
	["src/pages/api/auth/logout.ts", _page5],
	["src/pages/api/auth/register.ts", _page6],
	["src/pages/api/comments.ts", _page7],
	["src/pages/api/hatch/[...path].ts", _page8],
	["src/pages/api/hatch-comments/post.ts", _page9],
	["src/pages/api/hatch-form/[provider]/[id]/submit.ts", _page10],
	["src/pages/api/hatch-form/[provider]/[id].ts", _page11],
	["src/pages/api/hatch-verify.ts", _page12],
	["src/pages/api/revalidate.ts", _page13],
	["src/pages/api/telemetry.ts", _page14],
	["src/pages/api/wc-store/[...path].ts", _page15],
	["src/pages/api/wc-stripe-verify.ts", _page16],
	["src/pages/author/[slug].astro", _page17],
	["src/pages/blog/author/[slug].astro", _page18],
	["src/pages/blog/category/[slug].astro", _page19],
	["src/pages/blog/tag/[slug].astro", _page20],
	["src/pages/blog/[slug].astro", _page21],
	["src/pages/blog/index.astro", _page22],
	["src/pages/cart.astro", _page23],
	["src/pages/category/[slug].astro", _page24],
	["src/pages/checkout.astro", _page25],
	["src/pages/hatch-media/[...path].ts", _page26],
	["src/pages/img.ts", _page27],
	["src/pages/llms.txt.ts", _page28],
	["src/pages/login.astro", _page29],
	["src/pages/order-summary.astro", _page30],
	["src/pages/product/[slug].astro", _page31],
	["src/pages/register.astro", _page32],
	["src/pages/robots.txt.ts", _page33],
	["src/pages/rss.xml.ts", _page34],
	["src/pages/search.astro", _page35],
	["src/pages/shop.astro", _page36],
	["src/pages/sitemap-index.xml.ts", _page37],
	["src/pages/sitemap.xml.ts", _page38],
	["src/pages/tag/[slug].astro", _page39],
	["src/pages/index.astro", _page40],
	["src/pages/[...slug].astro", _page41]
]);
//#endregion
//#region \0virtual:astro:manifest
var _manifest = deserializeManifest({"rootDir":"file:///private/var/folders/jy/60wbwnvn217_b5__lf567vwh0000gn/T/hatch-bundle.ChBLnj/astro/","cacheDir":"file:///private/var/folders/jy/60wbwnvn217_b5__lf567vwh0000gn/T/hatch-bundle.ChBLnj/astro/node_modules/.astro/","outDir":"file:///private/var/folders/jy/60wbwnvn217_b5__lf567vwh0000gn/T/hatch-bundle.ChBLnj/astro/dist/","srcDir":"file:///private/var/folders/jy/60wbwnvn217_b5__lf567vwh0000gn/T/hatch-bundle.ChBLnj/astro/src/","publicDir":"file:///private/var/folders/jy/60wbwnvn217_b5__lf567vwh0000gn/T/hatch-bundle.ChBLnj/astro/public/","buildClientDir":"file:///private/var/folders/jy/60wbwnvn217_b5__lf567vwh0000gn/T/hatch-bundle.ChBLnj/astro/dist/client/","buildServerDir":"file:///private/var/folders/jy/60wbwnvn217_b5__lf567vwh0000gn/T/hatch-bundle.ChBLnj/astro/dist/server/","adapterName":"@astrojs/cloudflare","assetsDir":"_astro","routes":[{"file":"","links":[],"scripts":[],"styles":[],"routeData":{"type":"page","component":"_server-islands.astro","params":["name"],"segments":[[{"content":"_server-islands","dynamic":false,"spread":false}],[{"content":"name","dynamic":true,"spread":false}]],"pattern":"^\\/_server-islands\\/([^/]+?)\\/?$","prerender":false,"isIndex":false,"fallbackRoutes":[],"route":"/_server-islands/[name]","origin":"internal","distURL":[],"_meta":{"trailingSlash":"ignore"}}},{"file":"","links":[],"scripts":[{"type":"external","value":"_astro/page.Bxh2X0_-.js"}],"styles":[],"routeData":{"route":"/_image","component":"node_modules/@astrojs/cloudflare/dist/entrypoints/image-passthrough-endpoint.js","params":[],"pathname":"/_image","pattern":"^\\/_image\\/?$","segments":[[{"content":"_image","dynamic":false,"spread":false}]],"type":"endpoint","prerender":false,"fallbackRoutes":[],"distURL":[],"isIndex":false,"origin":"internal","_meta":{"trailingSlash":"ignore"}}},{"file":"","links":[],"scripts":[{"type":"external","value":"_astro/page.Bxh2X0_-.js"}],"styles":[],"routeData":{"route":"/.well-known/mcp.json","isIndex":false,"type":"endpoint","pattern":"^\\/\\.well-known\\/mcp\\.json$","segments":[[{"content":".well-known","dynamic":false,"spread":false}],[{"content":"mcp.json","dynamic":false,"spread":false}]],"params":[],"component":"src/pages/.well-known/mcp.json.ts","pathname":"/.well-known/mcp.json","prerender":false,"fallbackRoutes":[],"distURL":[],"origin":"project","_meta":{"trailingSlash":"ignore"}}},{"file":"","links":[],"scripts":[{"type":"external","value":"_astro/page.Bxh2X0_-.js"}],"styles":[{"type":"external","src":"_astro/PageLayout.DOvmnHk4.css"}],"routeData":{"route":"/404","isIndex":false,"type":"page","pattern":"^\\/404\\/?$","segments":[[{"content":"404","dynamic":false,"spread":false}]],"params":[],"component":"src/pages/404.astro","pathname":"/404","prerender":false,"fallbackRoutes":[],"distURL":[],"origin":"project","_meta":{"trailingSlash":"ignore"}}},{"file":"","links":[],"scripts":[{"type":"external","value":"_astro/page.Bxh2X0_-.js"}],"styles":[{"type":"external","src":"_astro/PageLayout.DOvmnHk4.css"}],"routeData":{"route":"/account","isIndex":false,"type":"page","pattern":"^\\/account\\/?$","segments":[[{"content":"account","dynamic":false,"spread":false}]],"params":[],"component":"src/pages/account.astro","pathname":"/account","prerender":false,"fallbackRoutes":[],"distURL":[],"origin":"project","_meta":{"trailingSlash":"ignore"}}},{"file":"","links":[],"scripts":[{"type":"external","value":"_astro/page.Bxh2X0_-.js"}],"styles":[],"routeData":{"route":"/api/auth/login","isIndex":false,"type":"endpoint","pattern":"^\\/api\\/auth\\/login\\/?$","segments":[[{"content":"api","dynamic":false,"spread":false}],[{"content":"auth","dynamic":false,"spread":false}],[{"content":"login","dynamic":false,"spread":false}]],"params":[],"component":"src/pages/api/auth/login.ts","pathname":"/api/auth/login","prerender":false,"fallbackRoutes":[],"distURL":[],"origin":"project","_meta":{"trailingSlash":"ignore"}}},{"file":"","links":[],"scripts":[{"type":"external","value":"_astro/page.Bxh2X0_-.js"}],"styles":[],"routeData":{"route":"/api/auth/logout","isIndex":false,"type":"endpoint","pattern":"^\\/api\\/auth\\/logout\\/?$","segments":[[{"content":"api","dynamic":false,"spread":false}],[{"content":"auth","dynamic":false,"spread":false}],[{"content":"logout","dynamic":false,"spread":false}]],"params":[],"component":"src/pages/api/auth/logout.ts","pathname":"/api/auth/logout","prerender":false,"fallbackRoutes":[],"distURL":[],"origin":"project","_meta":{"trailingSlash":"ignore"}}},{"file":"","links":[],"scripts":[{"type":"external","value":"_astro/page.Bxh2X0_-.js"}],"styles":[],"routeData":{"route":"/api/auth/register","isIndex":false,"type":"endpoint","pattern":"^\\/api\\/auth\\/register\\/?$","segments":[[{"content":"api","dynamic":false,"spread":false}],[{"content":"auth","dynamic":false,"spread":false}],[{"content":"register","dynamic":false,"spread":false}]],"params":[],"component":"src/pages/api/auth/register.ts","pathname":"/api/auth/register","prerender":false,"fallbackRoutes":[],"distURL":[],"origin":"project","_meta":{"trailingSlash":"ignore"}}},{"file":"","links":[],"scripts":[{"type":"external","value":"_astro/page.Bxh2X0_-.js"}],"styles":[],"routeData":{"route":"/api/comments","isIndex":false,"type":"endpoint","pattern":"^\\/api\\/comments\\/?$","segments":[[{"content":"api","dynamic":false,"spread":false}],[{"content":"comments","dynamic":false,"spread":false}]],"params":[],"component":"src/pages/api/comments.ts","pathname":"/api/comments","prerender":false,"fallbackRoutes":[],"distURL":[],"origin":"project","_meta":{"trailingSlash":"ignore"}}},{"file":"","links":[],"scripts":[{"type":"external","value":"_astro/page.Bxh2X0_-.js"}],"styles":[],"routeData":{"route":"/api/hatch/[...path]","isIndex":false,"type":"endpoint","pattern":"^\\/api\\/hatch(?:\\/(.*?))?\\/?$","segments":[[{"content":"api","dynamic":false,"spread":false}],[{"content":"hatch","dynamic":false,"spread":false}],[{"content":"...path","dynamic":true,"spread":true}]],"params":["...path"],"component":"src/pages/api/hatch/[...path].ts","prerender":false,"fallbackRoutes":[],"distURL":[],"origin":"project","_meta":{"trailingSlash":"ignore"}}},{"file":"","links":[],"scripts":[{"type":"external","value":"_astro/page.Bxh2X0_-.js"}],"styles":[],"routeData":{"route":"/api/hatch-comments/post","isIndex":false,"type":"endpoint","pattern":"^\\/api\\/hatch-comments\\/post\\/?$","segments":[[{"content":"api","dynamic":false,"spread":false}],[{"content":"hatch-comments","dynamic":false,"spread":false}],[{"content":"post","dynamic":false,"spread":false}]],"params":[],"component":"src/pages/api/hatch-comments/post.ts","pathname":"/api/hatch-comments/post","prerender":false,"fallbackRoutes":[],"distURL":[],"origin":"project","_meta":{"trailingSlash":"ignore"}}},{"file":"","links":[],"scripts":[{"type":"external","value":"_astro/page.Bxh2X0_-.js"}],"styles":[],"routeData":{"route":"/api/hatch-form/[provider]/[id]/submit","isIndex":false,"type":"endpoint","pattern":"^\\/api\\/hatch-form\\/([^/]+?)\\/([^/]+?)\\/submit\\/?$","segments":[[{"content":"api","dynamic":false,"spread":false}],[{"content":"hatch-form","dynamic":false,"spread":false}],[{"content":"provider","dynamic":true,"spread":false}],[{"content":"id","dynamic":true,"spread":false}],[{"content":"submit","dynamic":false,"spread":false}]],"params":["provider","id"],"component":"src/pages/api/hatch-form/[provider]/[id]/submit.ts","prerender":false,"fallbackRoutes":[],"distURL":[],"origin":"project","_meta":{"trailingSlash":"ignore"}}},{"file":"","links":[],"scripts":[{"type":"external","value":"_astro/page.Bxh2X0_-.js"}],"styles":[],"routeData":{"route":"/api/hatch-form/[provider]/[id]","isIndex":false,"type":"endpoint","pattern":"^\\/api\\/hatch-form\\/([^/]+?)\\/([^/]+?)\\/?$","segments":[[{"content":"api","dynamic":false,"spread":false}],[{"content":"hatch-form","dynamic":false,"spread":false}],[{"content":"provider","dynamic":true,"spread":false}],[{"content":"id","dynamic":true,"spread":false}]],"params":["provider","id"],"component":"src/pages/api/hatch-form/[provider]/[id].ts","prerender":false,"fallbackRoutes":[],"distURL":[],"origin":"project","_meta":{"trailingSlash":"ignore"}}},{"file":"","links":[],"scripts":[{"type":"external","value":"_astro/page.Bxh2X0_-.js"}],"styles":[],"routeData":{"route":"/api/hatch-verify","isIndex":false,"type":"endpoint","pattern":"^\\/api\\/hatch-verify\\/?$","segments":[[{"content":"api","dynamic":false,"spread":false}],[{"content":"hatch-verify","dynamic":false,"spread":false}]],"params":[],"component":"src/pages/api/hatch-verify.ts","pathname":"/api/hatch-verify","prerender":false,"fallbackRoutes":[],"distURL":[],"origin":"project","_meta":{"trailingSlash":"ignore"}}},{"file":"","links":[],"scripts":[{"type":"external","value":"_astro/page.Bxh2X0_-.js"}],"styles":[],"routeData":{"route":"/api/revalidate","isIndex":false,"type":"endpoint","pattern":"^\\/api\\/revalidate\\/?$","segments":[[{"content":"api","dynamic":false,"spread":false}],[{"content":"revalidate","dynamic":false,"spread":false}]],"params":[],"component":"src/pages/api/revalidate.ts","pathname":"/api/revalidate","prerender":false,"fallbackRoutes":[],"distURL":[],"origin":"project","_meta":{"trailingSlash":"ignore"}}},{"file":"","links":[],"scripts":[{"type":"external","value":"_astro/page.Bxh2X0_-.js"}],"styles":[],"routeData":{"route":"/api/telemetry","isIndex":false,"type":"endpoint","pattern":"^\\/api\\/telemetry\\/?$","segments":[[{"content":"api","dynamic":false,"spread":false}],[{"content":"telemetry","dynamic":false,"spread":false}]],"params":[],"component":"src/pages/api/telemetry.ts","pathname":"/api/telemetry","prerender":false,"fallbackRoutes":[],"distURL":[],"origin":"project","_meta":{"trailingSlash":"ignore"}}},{"file":"","links":[],"scripts":[{"type":"external","value":"_astro/page.Bxh2X0_-.js"}],"styles":[],"routeData":{"route":"/api/wc-store/[...path]","isIndex":false,"type":"endpoint","pattern":"^\\/api\\/wc-store(?:\\/(.*?))?\\/?$","segments":[[{"content":"api","dynamic":false,"spread":false}],[{"content":"wc-store","dynamic":false,"spread":false}],[{"content":"...path","dynamic":true,"spread":true}]],"params":["...path"],"component":"src/pages/api/wc-store/[...path].ts","prerender":false,"fallbackRoutes":[],"distURL":[],"origin":"project","_meta":{"trailingSlash":"ignore"}}},{"file":"","links":[],"scripts":[{"type":"external","value":"_astro/page.Bxh2X0_-.js"}],"styles":[],"routeData":{"route":"/api/wc-stripe-verify","isIndex":false,"type":"endpoint","pattern":"^\\/api\\/wc-stripe-verify\\/?$","segments":[[{"content":"api","dynamic":false,"spread":false}],[{"content":"wc-stripe-verify","dynamic":false,"spread":false}]],"params":[],"component":"src/pages/api/wc-stripe-verify.ts","pathname":"/api/wc-stripe-verify","prerender":false,"fallbackRoutes":[],"distURL":[],"origin":"project","_meta":{"trailingSlash":"ignore"}}},{"file":"","links":[],"scripts":[{"type":"external","value":"_astro/page.Bxh2X0_-.js"}],"styles":[],"routeData":{"route":"/author/[slug]","isIndex":false,"type":"page","pattern":"^\\/author\\/([^/]+?)\\/?$","segments":[[{"content":"author","dynamic":false,"spread":false}],[{"content":"slug","dynamic":true,"spread":false}]],"params":["slug"],"component":"src/pages/author/[slug].astro","prerender":false,"fallbackRoutes":[],"distURL":[],"origin":"project","_meta":{"trailingSlash":"ignore"}}},{"file":"","links":[],"scripts":[{"type":"external","value":"_astro/page.Bxh2X0_-.js"}],"styles":[{"type":"external","src":"_astro/PageLayout.DOvmnHk4.css"}],"routeData":{"route":"/blog/author/[slug]","isIndex":false,"type":"page","pattern":"^\\/blog\\/author\\/([^/]+?)\\/?$","segments":[[{"content":"blog","dynamic":false,"spread":false}],[{"content":"author","dynamic":false,"spread":false}],[{"content":"slug","dynamic":true,"spread":false}]],"params":["slug"],"component":"src/pages/blog/author/[slug].astro","prerender":false,"fallbackRoutes":[],"distURL":[],"origin":"project","_meta":{"trailingSlash":"ignore"}}},{"file":"","links":[],"scripts":[{"type":"external","value":"_astro/page.Bxh2X0_-.js"}],"styles":[{"type":"external","src":"_astro/PageLayout.DOvmnHk4.css"}],"routeData":{"route":"/blog/category/[slug]","isIndex":false,"type":"page","pattern":"^\\/blog\\/category\\/([^/]+?)\\/?$","segments":[[{"content":"blog","dynamic":false,"spread":false}],[{"content":"category","dynamic":false,"spread":false}],[{"content":"slug","dynamic":true,"spread":false}]],"params":["slug"],"component":"src/pages/blog/category/[slug].astro","prerender":false,"fallbackRoutes":[],"distURL":[],"origin":"project","_meta":{"trailingSlash":"ignore"}}},{"file":"","links":[],"scripts":[{"type":"external","value":"_astro/page.Bxh2X0_-.js"}],"styles":[{"type":"external","src":"_astro/PageLayout.DOvmnHk4.css"}],"routeData":{"route":"/blog/tag/[slug]","isIndex":false,"type":"page","pattern":"^\\/blog\\/tag\\/([^/]+?)\\/?$","segments":[[{"content":"blog","dynamic":false,"spread":false}],[{"content":"tag","dynamic":false,"spread":false}],[{"content":"slug","dynamic":true,"spread":false}]],"params":["slug"],"component":"src/pages/blog/tag/[slug].astro","prerender":false,"fallbackRoutes":[],"distURL":[],"origin":"project","_meta":{"trailingSlash":"ignore"}}},{"file":"","links":[],"scripts":[{"type":"external","value":"_astro/page.Bxh2X0_-.js"}],"styles":[{"type":"external","src":"_astro/PageLayout.DOvmnHk4.css"},{"type":"inline","content":".hatch-comments[data-astro-cid-3pseg426]{max-width:640px;margin-left:0}.hatch-comments[data-astro-cid-3pseg426] .hatch-comment-body[data-astro-cid-3pseg426] p[data-astro-cid-3pseg426]{margin:0 0 .5em}.hatch-comments[data-astro-cid-3pseg426] .hatch-comment-body[data-astro-cid-3pseg426] p[data-astro-cid-3pseg426]:last-child{margin-bottom:0}.hatch-comments[data-astro-cid-3pseg426] .hatch-comment-body[data-astro-cid-3pseg426] a[data-astro-cid-3pseg426]{color:var(--hatch-primary);text-underline-offset:2px;text-decoration:underline}.hatch-comments[data-astro-cid-3pseg426] form[data-astro-cid-3pseg426] input[data-astro-cid-3pseg426],.hatch-comments[data-astro-cid-3pseg426] form[data-astro-cid-3pseg426] textarea[data-astro-cid-3pseg426],.hatch-comments[data-astro-cid-3pseg426] button[data-astro-cid-3pseg426][type=submit]{border-radius:var(--hatch-radius,6px);font-family:var(--hatch-font-body,inherit)}.hatch-comments[data-astro-cid-3pseg426] .hatch-hp[data-astro-cid-3pseg426]{width:1px;height:1px;position:absolute;left:-10000px;overflow:hidden}[data-astro-cid-3pseg426][data-hatch-theme=tech] .hatch-comments[data-astro-cid-3pseg426] .hatch-comment-body[data-astro-cid-3pseg426]{font-size:13.5px}[data-astro-cid-3pseg426][data-hatch-theme=tech] .hatch-comments[data-astro-cid-3pseg426] form[data-astro-cid-3pseg426] input[data-astro-cid-3pseg426],[data-astro-cid-3pseg426][data-hatch-theme=tech] .hatch-comments[data-astro-cid-3pseg426] form[data-astro-cid-3pseg426] textarea[data-astro-cid-3pseg426]{background:var(--hatch-bg-2);border-color:var(--hatch-border)}[data-astro-cid-3pseg426][data-hatch-theme=docs] .hatch-comments[data-astro-cid-3pseg426]{border:1px solid var(--hatch-border);border-radius:var(--hatch-radius,10px);background:var(--hatch-bg-2);border-top-width:1px;margin-top:36px;padding:18px 20px}\n"}],"routeData":{"route":"/blog/[slug]","isIndex":false,"type":"page","pattern":"^\\/blog\\/([^/]+?)\\/?$","segments":[[{"content":"blog","dynamic":false,"spread":false}],[{"content":"slug","dynamic":true,"spread":false}]],"params":["slug"],"component":"src/pages/blog/[slug].astro","prerender":false,"fallbackRoutes":[],"distURL":[],"origin":"project","_meta":{"trailingSlash":"ignore"}}},{"file":"","links":[],"scripts":[{"type":"external","value":"_astro/page.Bxh2X0_-.js"}],"styles":[{"type":"external","src":"_astro/PageLayout.DOvmnHk4.css"}],"routeData":{"route":"/blog","isIndex":true,"type":"page","pattern":"^\\/blog\\/?$","segments":[[{"content":"blog","dynamic":false,"spread":false}]],"params":[],"component":"src/pages/blog/index.astro","pathname":"/blog","prerender":false,"fallbackRoutes":[],"distURL":[],"origin":"project","_meta":{"trailingSlash":"ignore"}}},{"file":"","links":[],"scripts":[{"type":"external","value":"_astro/page.Bxh2X0_-.js"}],"styles":[{"type":"external","src":"_astro/PageLayout.DOvmnHk4.css"}],"routeData":{"route":"/cart","isIndex":false,"type":"page","pattern":"^\\/cart\\/?$","segments":[[{"content":"cart","dynamic":false,"spread":false}]],"params":[],"component":"src/pages/cart.astro","pathname":"/cart","prerender":false,"fallbackRoutes":[],"distURL":[],"origin":"project","_meta":{"trailingSlash":"ignore"}}},{"file":"","links":[],"scripts":[{"type":"external","value":"_astro/page.Bxh2X0_-.js"}],"styles":[],"routeData":{"route":"/category/[slug]","isIndex":false,"type":"page","pattern":"^\\/category\\/([^/]+?)\\/?$","segments":[[{"content":"category","dynamic":false,"spread":false}],[{"content":"slug","dynamic":true,"spread":false}]],"params":["slug"],"component":"src/pages/category/[slug].astro","prerender":false,"fallbackRoutes":[],"distURL":[],"origin":"project","_meta":{"trailingSlash":"ignore"}}},{"file":"","links":[],"scripts":[{"type":"external","value":"_astro/page.Bxh2X0_-.js"}],"styles":[{"type":"external","src":"_astro/PageLayout.DOvmnHk4.css"}],"routeData":{"route":"/checkout","isIndex":false,"type":"page","pattern":"^\\/checkout\\/?$","segments":[[{"content":"checkout","dynamic":false,"spread":false}]],"params":[],"component":"src/pages/checkout.astro","pathname":"/checkout","prerender":false,"fallbackRoutes":[],"distURL":[],"origin":"project","_meta":{"trailingSlash":"ignore"}}},{"file":"","links":[],"scripts":[{"type":"external","value":"_astro/page.Bxh2X0_-.js"}],"styles":[],"routeData":{"route":"/hatch-media/[...path]","isIndex":false,"type":"endpoint","pattern":"^\\/hatch-media(?:\\/(.*?))?\\/?$","segments":[[{"content":"hatch-media","dynamic":false,"spread":false}],[{"content":"...path","dynamic":true,"spread":true}]],"params":["...path"],"component":"src/pages/hatch-media/[...path].ts","prerender":false,"fallbackRoutes":[],"distURL":[],"origin":"project","_meta":{"trailingSlash":"ignore"}}},{"file":"","links":[],"scripts":[{"type":"external","value":"_astro/page.Bxh2X0_-.js"}],"styles":[],"routeData":{"route":"/img","isIndex":false,"type":"endpoint","pattern":"^\\/img\\/?$","segments":[[{"content":"img","dynamic":false,"spread":false}]],"params":[],"component":"src/pages/img.ts","pathname":"/img","prerender":false,"fallbackRoutes":[],"distURL":[],"origin":"project","_meta":{"trailingSlash":"ignore"}}},{"file":"","links":[],"scripts":[{"type":"external","value":"_astro/page.Bxh2X0_-.js"}],"styles":[],"routeData":{"route":"/llms.txt","isIndex":false,"type":"endpoint","pattern":"^\\/llms\\.txt$","segments":[[{"content":"llms.txt","dynamic":false,"spread":false}]],"params":[],"component":"src/pages/llms.txt.ts","pathname":"/llms.txt","prerender":false,"fallbackRoutes":[],"distURL":[],"origin":"project","_meta":{"trailingSlash":"ignore"}}},{"file":"","links":[],"scripts":[{"type":"external","value":"_astro/page.Bxh2X0_-.js"}],"styles":[{"type":"external","src":"_astro/PageLayout.DOvmnHk4.css"}],"routeData":{"route":"/login","isIndex":false,"type":"page","pattern":"^\\/login\\/?$","segments":[[{"content":"login","dynamic":false,"spread":false}]],"params":[],"component":"src/pages/login.astro","pathname":"/login","prerender":false,"fallbackRoutes":[],"distURL":[],"origin":"project","_meta":{"trailingSlash":"ignore"}}},{"file":"","links":[],"scripts":[{"type":"external","value":"_astro/page.Bxh2X0_-.js"}],"styles":[{"type":"external","src":"_astro/PageLayout.DOvmnHk4.css"}],"routeData":{"route":"/order-summary","isIndex":false,"type":"page","pattern":"^\\/order-summary\\/?$","segments":[[{"content":"order-summary","dynamic":false,"spread":false}]],"params":[],"component":"src/pages/order-summary.astro","pathname":"/order-summary","prerender":false,"fallbackRoutes":[],"distURL":[],"origin":"project","_meta":{"trailingSlash":"ignore"}}},{"file":"","links":[],"scripts":[{"type":"external","value":"_astro/page.Bxh2X0_-.js"}],"styles":[{"type":"external","src":"_astro/PageLayout.DOvmnHk4.css"}],"routeData":{"route":"/product/[slug]","isIndex":false,"type":"page","pattern":"^\\/product\\/([^/]+?)\\/?$","segments":[[{"content":"product","dynamic":false,"spread":false}],[{"content":"slug","dynamic":true,"spread":false}]],"params":["slug"],"component":"src/pages/product/[slug].astro","prerender":false,"fallbackRoutes":[],"distURL":[],"origin":"project","_meta":{"trailingSlash":"ignore"}}},{"file":"","links":[],"scripts":[{"type":"external","value":"_astro/page.Bxh2X0_-.js"}],"styles":[{"type":"external","src":"_astro/PageLayout.DOvmnHk4.css"}],"routeData":{"route":"/register","isIndex":false,"type":"page","pattern":"^\\/register\\/?$","segments":[[{"content":"register","dynamic":false,"spread":false}]],"params":[],"component":"src/pages/register.astro","pathname":"/register","prerender":false,"fallbackRoutes":[],"distURL":[],"origin":"project","_meta":{"trailingSlash":"ignore"}}},{"file":"","links":[],"scripts":[{"type":"external","value":"_astro/page.Bxh2X0_-.js"}],"styles":[],"routeData":{"route":"/robots.txt","isIndex":false,"type":"endpoint","pattern":"^\\/robots\\.txt$","segments":[[{"content":"robots.txt","dynamic":false,"spread":false}]],"params":[],"component":"src/pages/robots.txt.ts","pathname":"/robots.txt","prerender":false,"fallbackRoutes":[],"distURL":[],"origin":"project","_meta":{"trailingSlash":"ignore"}}},{"file":"","links":[],"scripts":[{"type":"external","value":"_astro/page.Bxh2X0_-.js"}],"styles":[],"routeData":{"route":"/rss.xml","isIndex":false,"type":"endpoint","pattern":"^\\/rss\\.xml$","segments":[[{"content":"rss.xml","dynamic":false,"spread":false}]],"params":[],"component":"src/pages/rss.xml.ts","pathname":"/rss.xml","prerender":false,"fallbackRoutes":[],"distURL":[],"origin":"project","_meta":{"trailingSlash":"ignore"}}},{"file":"","links":[],"scripts":[{"type":"external","value":"_astro/page.Bxh2X0_-.js"}],"styles":[{"type":"external","src":"_astro/PageLayout.DOvmnHk4.css"}],"routeData":{"route":"/search","isIndex":false,"type":"page","pattern":"^\\/search\\/?$","segments":[[{"content":"search","dynamic":false,"spread":false}]],"params":[],"component":"src/pages/search.astro","pathname":"/search","prerender":false,"fallbackRoutes":[],"distURL":[],"origin":"project","_meta":{"trailingSlash":"ignore"}}},{"file":"","links":[],"scripts":[{"type":"external","value":"_astro/page.Bxh2X0_-.js"}],"styles":[{"type":"external","src":"_astro/PageLayout.DOvmnHk4.css"}],"routeData":{"route":"/shop","isIndex":false,"type":"page","pattern":"^\\/shop\\/?$","segments":[[{"content":"shop","dynamic":false,"spread":false}]],"params":[],"component":"src/pages/shop.astro","pathname":"/shop","prerender":false,"fallbackRoutes":[],"distURL":[],"origin":"project","_meta":{"trailingSlash":"ignore"}}},{"file":"","links":[],"scripts":[{"type":"external","value":"_astro/page.Bxh2X0_-.js"}],"styles":[],"routeData":{"route":"/sitemap-index.xml","isIndex":false,"type":"endpoint","pattern":"^\\/sitemap-index\\.xml$","segments":[[{"content":"sitemap-index.xml","dynamic":false,"spread":false}]],"params":[],"component":"src/pages/sitemap-index.xml.ts","pathname":"/sitemap-index.xml","prerender":false,"fallbackRoutes":[],"distURL":[],"origin":"project","_meta":{"trailingSlash":"ignore"}}},{"file":"","links":[],"scripts":[{"type":"external","value":"_astro/page.Bxh2X0_-.js"}],"styles":[],"routeData":{"route":"/sitemap.xml","isIndex":false,"type":"endpoint","pattern":"^\\/sitemap\\.xml$","segments":[[{"content":"sitemap.xml","dynamic":false,"spread":false}]],"params":[],"component":"src/pages/sitemap.xml.ts","pathname":"/sitemap.xml","prerender":false,"fallbackRoutes":[],"distURL":[],"origin":"project","_meta":{"trailingSlash":"ignore"}}},{"file":"","links":[],"scripts":[{"type":"external","value":"_astro/page.Bxh2X0_-.js"}],"styles":[],"routeData":{"route":"/tag/[slug]","isIndex":false,"type":"page","pattern":"^\\/tag\\/([^/]+?)\\/?$","segments":[[{"content":"tag","dynamic":false,"spread":false}],[{"content":"slug","dynamic":true,"spread":false}]],"params":["slug"],"component":"src/pages/tag/[slug].astro","prerender":false,"fallbackRoutes":[],"distURL":[],"origin":"project","_meta":{"trailingSlash":"ignore"}}},{"file":"","links":[],"scripts":[{"type":"external","value":"_astro/page.Bxh2X0_-.js"}],"styles":[{"type":"external","src":"_astro/PageLayout.DOvmnHk4.css"}],"routeData":{"route":"/","isIndex":true,"type":"page","pattern":"^\\/$","segments":[],"params":[],"component":"src/pages/index.astro","pathname":"/","prerender":false,"fallbackRoutes":[],"distURL":[],"origin":"project","_meta":{"trailingSlash":"ignore"}}},{"file":"","links":[],"scripts":[{"type":"external","value":"_astro/page.Bxh2X0_-.js"}],"styles":[{"type":"external","src":"_astro/PageLayout.DOvmnHk4.css"}],"routeData":{"route":"/[...slug]","isIndex":false,"type":"page","pattern":"^(?:\\/(.*?))?\\/?$","segments":[[{"content":"...slug","dynamic":true,"spread":true}]],"params":["...slug"],"component":"src/pages/[...slug].astro","prerender":false,"fallbackRoutes":[],"distURL":[],"origin":"project","_meta":{"trailingSlash":"ignore"}}}],"serverLike":true,"middlewareMode":"classic","site":"http://localhost:4321","base":"/","trailingSlash":"ignore","compressHTML":"jsx","componentMetadata":[["/private/var/folders/jy/60wbwnvn217_b5__lf567vwh0000gn/T/hatch-bundle.ChBLnj/astro/src/pages/404.astro",{"propagation":"none","containsHead":true}],["/private/var/folders/jy/60wbwnvn217_b5__lf567vwh0000gn/T/hatch-bundle.ChBLnj/astro/src/pages/[...slug].astro",{"propagation":"none","containsHead":true}],["/private/var/folders/jy/60wbwnvn217_b5__lf567vwh0000gn/T/hatch-bundle.ChBLnj/astro/src/pages/account.astro",{"propagation":"none","containsHead":true}],["/private/var/folders/jy/60wbwnvn217_b5__lf567vwh0000gn/T/hatch-bundle.ChBLnj/astro/src/pages/blog/[slug].astro",{"propagation":"none","containsHead":true}],["/private/var/folders/jy/60wbwnvn217_b5__lf567vwh0000gn/T/hatch-bundle.ChBLnj/astro/src/pages/blog/author/[slug].astro",{"propagation":"none","containsHead":true}],["/private/var/folders/jy/60wbwnvn217_b5__lf567vwh0000gn/T/hatch-bundle.ChBLnj/astro/src/pages/blog/category/[slug].astro",{"propagation":"none","containsHead":true}],["/private/var/folders/jy/60wbwnvn217_b5__lf567vwh0000gn/T/hatch-bundle.ChBLnj/astro/src/pages/blog/index.astro",{"propagation":"none","containsHead":true}],["/private/var/folders/jy/60wbwnvn217_b5__lf567vwh0000gn/T/hatch-bundle.ChBLnj/astro/src/pages/blog/tag/[slug].astro",{"propagation":"none","containsHead":true}],["/private/var/folders/jy/60wbwnvn217_b5__lf567vwh0000gn/T/hatch-bundle.ChBLnj/astro/src/pages/cart.astro",{"propagation":"none","containsHead":true}],["/private/var/folders/jy/60wbwnvn217_b5__lf567vwh0000gn/T/hatch-bundle.ChBLnj/astro/src/pages/checkout.astro",{"propagation":"none","containsHead":true}],["/private/var/folders/jy/60wbwnvn217_b5__lf567vwh0000gn/T/hatch-bundle.ChBLnj/astro/src/pages/index.astro",{"propagation":"none","containsHead":true}],["/private/var/folders/jy/60wbwnvn217_b5__lf567vwh0000gn/T/hatch-bundle.ChBLnj/astro/src/pages/login.astro",{"propagation":"none","containsHead":true}],["/private/var/folders/jy/60wbwnvn217_b5__lf567vwh0000gn/T/hatch-bundle.ChBLnj/astro/src/pages/order-summary.astro",{"propagation":"none","containsHead":true}],["/private/var/folders/jy/60wbwnvn217_b5__lf567vwh0000gn/T/hatch-bundle.ChBLnj/astro/src/pages/product/[slug].astro",{"propagation":"none","containsHead":true}],["/private/var/folders/jy/60wbwnvn217_b5__lf567vwh0000gn/T/hatch-bundle.ChBLnj/astro/src/pages/register.astro",{"propagation":"none","containsHead":true}],["/private/var/folders/jy/60wbwnvn217_b5__lf567vwh0000gn/T/hatch-bundle.ChBLnj/astro/src/pages/search.astro",{"propagation":"none","containsHead":true}],["/private/var/folders/jy/60wbwnvn217_b5__lf567vwh0000gn/T/hatch-bundle.ChBLnj/astro/src/pages/shop.astro",{"propagation":"none","containsHead":true}]],"renderers":[],"clientDirectives":[["idle","(()=>{var l=(n,t)=>{let i=async()=>{await(await n())()},e=typeof t.value==\"object\"?t.value:void 0,s={timeout:e==null?void 0:e.timeout};\"requestIdleCallback\"in window?window.requestIdleCallback(i,s):setTimeout(i,s.timeout||200)};(self.Astro||(self.Astro={})).idle=l;window.dispatchEvent(new Event(\"astro:idle\"));})();"],["load","(()=>{var e=async t=>{await(await t())()};(self.Astro||(self.Astro={})).load=e;window.dispatchEvent(new Event(\"astro:load\"));})();"],["media","(()=>{var n=(a,t)=>{let i=async()=>{await(await a())()};if(t.value){let e=matchMedia(t.value);e.matches?i():e.addEventListener(\"change\",i,{once:!0})}};(self.Astro||(self.Astro={})).media=n;window.dispatchEvent(new Event(\"astro:media\"));})();"],["only","(()=>{var e=async t=>{await(await t())()};(self.Astro||(self.Astro={})).only=e;window.dispatchEvent(new Event(\"astro:only\"));})();"],["visible","(()=>{var a=(s,i,o)=>{let r=async()=>{await(await s())()},t=typeof i.value==\"object\"?i.value:void 0,c={rootMargin:t==null?void 0:t.rootMargin},n=new IntersectionObserver(e=>{for(let l of e)if(l.isIntersecting){n.disconnect(),r();break}},c);for(let e of o.children)n.observe(e)};(self.Astro||(self.Astro={})).visible=a;window.dispatchEvent(new Event(\"astro:visible\"));})();"]],"entryModules":{"virtual:cloudflare/worker-entry":"entry.mjs","\u0000virtual:astro:middleware":"virtual_astro_middleware.mjs","\u0000virtual:astro:server-island-manifest":"chunks/_virtual_astro_server-island-manifest_q0HM18kM.mjs","\u0000virtual:astro:session-driver":"chunks/_virtual_astro_session-driver_DIk1nzQP.mjs","\u0000virtual:astro:actions/noop-entrypoint":"chunks/noop-entrypoint_BYLrzUxc.mjs","/private/var/folders/jy/60wbwnvn217_b5__lf567vwh0000gn/T/hatch-bundle.ChBLnj/astro/node_modules/astro/dist/assets/services/noop.js":"chunks/noop_C2hVPbIA.mjs","/private/var/folders/jy/60wbwnvn217_b5__lf567vwh0000gn/T/hatch-bundle.ChBLnj/astro/node_modules/@astrojs/cloudflare/dist/utils/static-image-collection.js":"chunks/static-image-collection_UeIrrBUt.mjs","\u0000virtual:astro:page:src/pages/404@_@astro":"chunks/404_DbuY62NT.mjs","\u0000virtual:astro:page:src/pages/api/hatch/[...path]@_@ts":"chunks/_.._Boc3A5mZ.mjs","\u0000virtual:astro:page:src/pages/api/wc-store/[...path]@_@ts":"chunks/_.._DAhUixkH.mjs","\u0000virtual:astro:page:src/pages/[...slug]@_@astro":"chunks/_.._jytCwUBH.mjs","\u0000virtual:astro:page:src/pages/hatch-media/[...path]@_@ts":"chunks/_.._wxXxjNhA.mjs","\u0000virtual:astro:page:src/pages/api/hatch-form/[provider]/[id]@_@ts":"chunks/_id__BKgQ9HDz.mjs","\u0000virtual:astro:page:src/pages/blog/category/[slug]@_@astro":"chunks/_slug__BOyAAYA3.mjs","\u0000virtual:astro:page:src/pages/tag/[slug]@_@astro":"chunks/_slug__BQ9y0Q1F.mjs","\u0000virtual:astro:page:src/pages/blog/tag/[slug]@_@astro":"chunks/_slug__BRqBE9C-.mjs","\u0000virtual:astro:page:src/pages/product/[slug]@_@astro":"chunks/_slug__BcWrSXS-.mjs","\u0000virtual:astro:page:src/pages/blog/[slug]@_@astro":"chunks/_slug__C3nvYSnR.mjs","\u0000virtual:astro:page:src/pages/blog/author/[slug]@_@astro":"chunks/_slug__ClG57Kin.mjs","\u0000virtual:astro:page:src/pages/author/[slug]@_@astro":"chunks/_slug__DKTHU1CI.mjs","\u0000virtual:astro:page:src/pages/category/[slug]@_@astro":"chunks/_slug__WG66VlHH.mjs","\u0000virtual:astro:page:src/pages/account@_@astro":"chunks/account_-l82wsV_.mjs","\u0000virtual:astro:page:src/pages/cart@_@astro":"chunks/cart_CDSDI3Ol.mjs","\u0000virtual:astro:page:src/pages/checkout@_@astro":"chunks/checkout_vCPPp8wu.mjs","\u0000virtual:astro:page:src/pages/api/comments@_@ts":"chunks/comments_DMRug1Xq.mjs","\u0000virtual:astro:page:src/pages/api/hatch-verify@_@ts":"chunks/hatch-verify_C8ZImo7B.mjs","\u0000virtual:astro:page:node_modules/@astrojs/cloudflare/dist/entrypoints/image-passthrough-endpoint@_@js":"chunks/image-passthrough-endpoint_BI6Mr8gP.mjs","\u0000virtual:astro:page:src/pages/img@_@ts":"chunks/img_CV2INanz.mjs","\u0000virtual:astro:page:src/pages/blog/index@_@astro":"chunks/index_2TRAFb6N.mjs","\u0000virtual:astro:page:src/pages/index@_@astro":"chunks/index_B2tgzE02.mjs","\u0000virtual:astro:page:src/pages/llms.txt@_@ts":"chunks/llms_DH5wbGoS.mjs","\u0000virtual:astro:page:src/pages/api/auth/login@_@ts":"chunks/login_BUpnAB1T.mjs","\u0000virtual:astro:page:src/pages/login@_@astro":"chunks/login_C1jzKGQP.mjs","\u0000virtual:astro:page:src/pages/api/auth/logout@_@ts":"chunks/logout_Bz_xCutw.mjs","\u0000virtual:astro:page:src/pages/.well-known/mcp.json@_@ts":"chunks/mcp_iPuWzJng.mjs","\u0000virtual:astro:page:src/pages/order-summary@_@astro":"chunks/order-summary_C_gPBWjA.mjs","\u0000virtual:astro:page:src/pages/api/hatch-comments/post@_@ts":"chunks/post_CjzQgnDS.mjs","\u0000virtual:astro:page:src/pages/register@_@astro":"chunks/register_5PcGH4Ab.mjs","\u0000virtual:astro:page:src/pages/api/auth/register@_@ts":"chunks/register_D56eFm-_.mjs","\u0000virtual:astro:page:src/pages/api/revalidate@_@ts":"chunks/revalidate_DQGPiU5D.mjs","\u0000virtual:astro:page:src/pages/robots.txt@_@ts":"chunks/robots_quFJA6xc.mjs","\u0000virtual:astro:page:src/pages/rss.xml@_@ts":"chunks/rss_Dj8NFIX0.mjs","\u0000virtual:astro:page:src/pages/search@_@astro":"chunks/search_n2jHG2MZ.mjs","\u0000virtual:astro:page:src/pages/shop@_@astro":"chunks/shop_BjZiJETW.mjs","\u0000virtual:astro:page:src/pages/sitemap-index.xml@_@ts":"chunks/sitemap-index_BT8Udu_M.mjs","\u0000virtual:astro:page:src/pages/sitemap.xml@_@ts":"chunks/sitemap_BUXU_eyV.mjs","\u0000virtual:astro:page:src/pages/api/hatch-form/[provider]/[id]/submit@_@ts":"chunks/submit_GweChvTm.mjs","\u0000virtual:astro:page:src/pages/api/telemetry@_@ts":"chunks/telemetry_BqySpWTf.mjs","\u0000virtual:astro:page:src/pages/api/wc-stripe-verify@_@ts":"chunks/wc-stripe-verify_CuDCkC42.mjs","/private/var/folders/jy/60wbwnvn217_b5__lf567vwh0000gn/T/hatch-bundle.ChBLnj/astro/node_modules/astro/components/ClientRouter.astro?astro&type=script&index=0&lang.ts":"_astro/ClientRouter.astro_astro_type_script_index_0_lang.khDw-QnJ.js","astro:scripts/page.js":"_astro/page.Bxh2X0_-.js","astro:scripts/before-hydration.js":""},"inlinedScripts":[],"assets":["/hatch-blocks.css","/hatch-blocks.js","/_astro/ClientRouter.astro_astro_type_script_index_0_lang.khDw-QnJ.js","/_astro/page.Bxh2X0_-.js","/_astro/prefetch.fAcgts75.js","/_astro/theme-astronano.L_nyqgul.css","/_astro/theme-astropaper.5XhoKjoR.css","/_astro/theme-astrowind.L9C9w3uY.css","/_astro/theme-blog.BkO_mnda.css","/_astro/theme-docs.D1dJ4h32.css","/_astro/theme-tech.CONtm-W8.css","/_astro/PageLayout.DOvmnHk4.css","/_astro/page.Bxh2X0_-.js"],"buildFormat":"directory","checkOrigin":true,"actionBodySizeLimit":1048576,"serverIslandBodySizeLimit":1048576,"allowedDomains":[],"key":"ptX7GDDWrQSWSxPwdKcyWHiQvZlzZXkEAMEKfJTwXns=","image":{},"devToolbar":{"enabled":false,"debugInfoOutput":""},"logLevel":"info","shouldInjectCspMetaTags":false});
var manifestRoutes = _manifest.routes;
var manifest = Object.assign(_manifest, {
	renderers,
	actions: () => import("./chunks/noop-entrypoint_BYLrzUxc.mjs"),
	middleware: () => import("./virtual_astro_middleware.mjs"),
	sessionDriver: () => import("./chunks/_virtual_astro_session-driver_DIk1nzQP.mjs"),
	serverIslandMappings: () => import("./chunks/_virtual_astro_server-island-manifest_q0HM18kM.mjs"),
	routes: manifestRoutes,
	pageMap
});
//#endregion
//#region node_modules/astro/dist/core/app/entrypoints/virtual/prod.js
var createApp$1 = ({ streaming } = {}) => {
	const app = new App(manifest, streaming);
	app.setFetchHandler(_virtual_astro_fetchable_default);
	return app;
};
//#endregion
//#region node_modules/astro/dist/core/app/entrypoints/virtual/index.js
var createApp = createApp$1;
//#endregion
//#region node_modules/@astrojs/cloudflare/dist/utils/env.js
var createGetEnv = (env) => (key) => {
	const v = env[key];
	if (typeof v === "undefined" || typeof v === "string") return v;
	if (typeof v === "boolean" || typeof v === "number") return v.toString();
};
//#endregion
//#region node_modules/@astrojs/internal-helpers/dist/request.js
function getFirstForwardedValue(multiValueHeader) {
	return multiValueHeader?.toString()?.split(",").map((e) => e.trim())?.[0];
}
var IP_RE = /^[0-9a-fA-F.:]{1,45}$/;
function isValidIpAddress(value) {
	return IP_RE.test(value);
}
function getValidatedIpFromHeader(headerValue) {
	const raw = getFirstForwardedValue(headerValue);
	if (raw && isValidIpAddress(raw)) return raw;
}
//#endregion
//#region node_modules/@astrojs/cloudflare/dist/utils/cf-helpers.js
function matchStaticAsset(manifest, requestUrl, env) {
	const { pathname } = new URL(requestUrl);
	if (manifest.assets.has(pathname)) return env.ASSETS.fetch(requestUrl.replace(/\.html$/, ""));
}
async function fallbackToAssets(requestUrl, env) {
	const asset = await env.ASSETS.fetch(requestUrl.replace(/index.html$/, "").replace(/\.html$/, ""));
	if (asset.status !== 404) return asset;
}
function createErrorPageFetch(env) {
	return async (url) => {
		return env.ASSETS.fetch(url.replace(/\.html$/, ""));
	};
}
function createLocals(ctx) {
	const locals = { cfContext: ctx };
	Object.defineProperty(locals, "runtime", {
		enumerable: false,
		value: {
			get env() {
				throw new Error(`Astro.locals.runtime.env has been removed in Astro v6. Use 'import { env } from "cloudflare:workers"' instead.`);
			},
			get cf() {
				throw new Error(`Astro.locals.runtime.cf has been removed in Astro v6. Use 'Astro.request.cf' instead.`);
			},
			get caches() {
				throw new Error(`Astro.locals.runtime.caches has been removed in Astro v6. Use the global 'caches' object instead.`);
			},
			get ctx() {
				throw new Error(`Astro.locals.runtime.ctx has been removed in Astro v6. Use 'Astro.locals.cfContext' instead.`);
			}
		}
	});
	return locals;
}
function getClientAddress(request) {
	return getValidatedIpFromHeader(request.headers.get("cf-connecting-ip"));
}
//#endregion
//#region node_modules/@astrojs/cloudflare/dist/utils/cf.js
function injectSessionBinding(manifest, env) {
	if (env["SESSION"]) {
		const sessionConfigOptions = manifest.sessionConfig?.options ?? {};
		Object.assign(sessionConfigOptions, { binding: env[sessionKVBindingName] });
	}
}
//#endregion
//#region node_modules/@astrojs/cloudflare/dist/utils/handler.js
setGetEnv(createGetEnv(env));
var app = createApp();
async function handle(request, env, context) {
	injectSessionBinding(app.manifest, env);
	const staticAsset = matchStaticAsset(app.manifest, request.url, env);
	if (staticAsset) return staticAsset;
	let routeData = void 0;
	if (app.isDev()) {
		const result = await app.devMatch(app.getPathnameFromRequest(request));
		if (result) routeData = result.routeData;
	} else routeData = app.match(request);
	if (!routeData) {
		const asset = await fallbackToAssets(request.url, env);
		if (asset) return asset;
	}
	const locals = createLocals(context);
	const waitUntil = context.waitUntil.bind(context);
	let response = await app.render(request, {
		routeData,
		locals,
		waitUntil,
		prerenderedErrorPageFetch: createErrorPageFetch(env),
		clientAddress: getClientAddress(request)
	});
	const setCookieHeaders = app.setCookieHeaders ? [...app.setCookieHeaders(response)] : [];
	if (setCookieHeaders.length > 0 || false) {
		const applyHeaders = (res) => {
			for (const setCookieHeader of setCookieHeaders) res.headers.append("Set-Cookie", setCookieHeader);
		};
		try {
			applyHeaders(response);
		} catch {
			response = new Response(response.body, response);
			applyHeaders(response);
		}
	}
	return response;
}
//#endregion
//#region \0virtual:cloudflare/worker-entry
var worker_entry_default = { fetch: handle };
//#endregion
export { worker_entry_default as default };
