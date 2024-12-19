// import core__default from 'arcjet';
// export * from 'arcjet';
// import findIP from '@arcjet/ip';
// import ArcjetHeaders from '@arcjet/headers';
// import { logLevel, baseUrl, isDevelopment, platform } from '@arcjet/env';
// import { Logger } from '@arcjet/logger';
// import { createClient } from '@arcjet/protocol/client.js';
// import { createTransport } from '@arcjet/transport';
// import { readBody } from '@arcjet/body';

// // TODO: Deduplicate with other packages
// function errorMessage(err) {
//     if (err) {
//         if (typeof err === "string") {
//             return err;
//         }
//         if (typeof err === "object" &&
//             "message" in err &&
//             typeof err.message === "string") {
//             return err.message;
//         }
//     }
//     return "Unknown problem";
// }
// function createRemoteClient(options) {
//     // The base URL for the Arcjet API. Will default to the standard production
//     // API unless environment variable `ARCJET_BASE_URL` is set.
//     const url = options?.baseUrl ?? baseUrl(process.env);
//     // The timeout for the Arcjet API in milliseconds. This is set to a low value
//     // in production so calls fail open.
//     const timeout = options?.timeout ?? (isDevelopment(process.env) ? 1000 : 500);
//     // Transport is the HTTP client that the client uses to make requests.
//     const transport = createTransport(url);
//     const sdkStack = "NODEJS";
//     const sdkVersion = "1.0.0-alpha.34";
//     return createClient({
//         transport,
//         baseUrl: url,
//         timeout,
//         sdkStack,
//         sdkVersion,
//     });
// }
// function cookiesToString(cookies) {
//     if (typeof cookies === "undefined") {
//         return "";
//     }
//     // This should never be the case with a Node.js cookie header, but we are safe
//     if (Array.isArray(cookies)) {
//         return cookies.join("; ");
//     }
//     return cookies;
// }
// /**
//  * Create a new {@link ArcjetNode} client. Always build your initial client
//  * outside of a request handler so it persists across requests. If you need to
//  * augment a client inside a handler, call the `withRule()` function on the base
//  * client.
//  *
//  * @param options - Arcjet configuration options to apply to all requests.
//  */
// function arcjet(options) {
//     const client = options.client ?? createRemoteClient();
//     const log = options.log
//         ? options.log
//         : new Logger({
//             level: logLevel(process.env),
//         });
//     function toArcjetRequest(request, props) {
//         // We pull the cookies from the request before wrapping them in ArcjetHeaders
//         const cookies = cookiesToString(request.headers?.cookie);
//         // We construct an ArcjetHeaders to normalize over Headers
//         const headers = new ArcjetHeaders(request.headers);
//         let ip = findIP({
//             socket: request.socket,
//             headers,
//         }, { platform: platform(process.env), proxies: options.proxies });
//         if (ip === "") {
//             // If the `ip` is empty but we're in development mode, we default the IP
//             // so the request doesn't fail.
//             if (isDevelopment(process.env)) {
//                 log.warn("Using 127.0.0.1 as IP address in development mode");
//                 ip = "127.0.0.1";
//             }
//             else {
//                 log.warn(`Client IP address is missing. If this is a dev environment set the ARCJET_ENV env var to "development"`);
//             }
//         }
//         const method = request.method ?? "";
//         const host = headers.get("host") ?? "";
//         let path = "";
//         let query = "";
//         let protocol = "";
//         if (typeof request.socket?.encrypted !== "undefined") {
//             protocol = request.socket.encrypted ? "https:" : "http:";
//         }
//         else {
//             protocol = "http:";
//         }
//         // Do some very simple validation, but also try/catch around URL parsing
//         if (typeof request.url !== "undefined" &&
//             request.url !== "" &&
//             host !== "") {
//             try {
//                 const url = new URL(request.url, `${protocol}//${host}`);
//                 path = url.pathname;
//                 query = url.search;
//                 protocol = url.protocol;
//             }
//             catch {
//                 // If the parsing above fails, just set the path as whatever url we
//                 // received.
//                 path = request.url ?? "";
//                 log.warn('Unable to parse URL. Using "%s" as `path`.', path);
//             }
//         }
//         else {
//             path = request.url ?? "";
//         }
//         return {
//             ...props,
//             ip,
//             method,
//             protocol,
//             host,
//             path,
//             headers,
//             cookies,
//             query,
//         };
//     }
//     function withClient(aj) {
//         return Object.freeze({
//             withRule(rule) {
//                 const client = aj.withRule(rule);
//                 return withClient(client);
//             },
//             async protect(request, ...[props]) {
//                 // TODO(#220): The generic manipulations get really mad here, so we cast
//                 // Further investigation makes it seem like it has something to do with
//                 // the definition of `props` in the signature but it's hard to track down
//                 const req = toArcjetRequest(request, props ?? {});
//                 const getBody = async () => {
//                     try {
//                         // If request.body is present then the body was likely read by a package like express' `body-parser`.
//                         // If it's not present then we attempt to read the bytes from the IncomingMessage ourselves.
//                         if (typeof request.body === "string") {
//                             return request.body;
//                         }
//                         else if (typeof request.body !== "undefined" &&
//                             // BigInt cannot be serialized with JSON.stringify
//                             typeof request.body !== "bigint") {
//                             return JSON.stringify(request.body);
//                         }
//                         if (typeof request.on === "function" &&
//                             typeof request.removeListener === "function") {
//                             let expectedLength;
//                             // TODO: This shouldn't need to build headers again but the type
//                             // for `req` above is overly relaxed
//                             const headers = new ArcjetHeaders(request.headers);
//                             const expectedLengthStr = headers.get("content-length");
//                             if (typeof expectedLengthStr === "string") {
//                                 try {
//                                     expectedLength = parseInt(expectedLengthStr, 10);
//                                 }
//                                 catch {
//                                     // If the expected length couldn't be parsed we'll just not set one.
//                                 }
//                             }
//                             // Awaited to throw if it rejects and we'll just return undefined
//                             const body = await readBody(request, {
//                                 // We will process 1mb bodies
//                                 limit: 1048576,
//                                 expectedLength,
//                             });
//                             return body;
//                         }
//                         log.warn("no body available");
//                         return;
//                     }
//                     catch (e) {
//                         log.error("failed to get request body: %s", errorMessage(e));
//                         return;
//                     }
//                 };
//                 return aj.protect({ getBody }, req);
//             },
//         });
//     }
//     const aj = core__default({ ...options, client, log });
//     return withClient(aj);
// }

// export { createRemoteClient, arcjet as default };