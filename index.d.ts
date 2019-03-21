/**
 * This is the module allow you to simoly register and use route-based access coltrol for express.
 *
 * @requires process.env.SESSION_SECRET to be defined
 */
import { Request, Response, NextFunction, RequestHandler } from 'express';

export type SessionObject = { role: string; [x: string]: any };
export type OptionsObject = {
    /**
     * Define the HTTP Header name that uses to get session JWT.
     */
    tokenHeaderName?: string;
    /**
     * Define the callback that calls when `allow()` function denied the access and not folloing middlewares.
     */
    errorAllowedCallback?: () => any;
    /**
     * Define the callback that calls when `initSession()` function declining `X-Auth-Token` (or your header name) verification.
     */
    errorSessionCallback?: () => any;
    /**
     * Define the callback that calls when `initToken()` function trying to create token for not-presented in the system role of user.
     */
    errorNoneRoleCallback?: () => any;
    /**
     * Define the array of roles presented in the system.
     */
    roles?: string[];
};

/**
 * Use this function as a builder of RBAC session with common optins definition.
 * @param options RBAC builed
 */
export declare async function initRBAC(options: OptionsObject = {}): RequestHandler;

/**
 * Middleware that generation session if user has `X-Auth-Token` (or your header name) header in request.
 * The session object will be available from `res.locals.session`
 */
export declare async function initSession(req: Request, res: Response, next: NextFunction): any;

/**
 * Creates session token for user
 * @param role User role name
 * @param data custom data to be stored in session token with params
 *
 * @example
 * > initToken('admin', { user: new User, additionalParam: 'something' })
 * < JWT({ role: admin, user: IUser, additionalParam: 'something' })
 */
export declare function initToken(role, data): string;

/**
 * Enable custom session wrappers. It has access to session and has to return modified session object,
 * @param wrapper wrapped session
 */
export declare function setWrapper(wrapper: (session: SessionObject) => Promise<SessionObject>);

/**
 * Enable custom session verificator. It runs over the session before it wrapped.
 * @param verificator verify function
 */
export declare function setVerificator(verificator: (session: SessionObject) => Promise<boolean>);

/**
 * Defines the list of users by role who allowed to execute following middlewares.
 * @param roles Roles allowed to visit the route
 * @param follow If this role denied the route will be skiped
 */
export declare async function allow(roles: string[] = [], follow: boolean = false): RequestHandler;

/**
 * Called with `allow('authorized')` it allows to execute route middlewares for all authorized users with any role.
 * @param who
 * @param follow If this role denied the route will be skiped
 */
export declare async function allow(who: string, follow: boolean = false): RequestHandler;

/**
 * Define callback that will be called when `allow()` function denied the access and not folloing middlewares.
 * By default it continues with `next(403)`.
 * @param cb Should return a value that will be passed into `next(...)` function to generate error. Warning: `void` will continue the action.
 */
export declare function errorAllowedCallback(cb: () => any): void;

/**
 * Define callback that will be called when `initSession()` function declining `X-Auth-Token` (or your header name) verification.
 * @param cb Should return the value that will be thrown on verification fail. `403` by default.
 */
export declare function errorSessionCallback(cb: () => any): void;

/**
 * Define callback that will be called when `initToken()` function trying to create token for not-presented in the system role of user.
 * @param cb Should return the value that will be thrown on verification fail. `new Error('Role has not presented in system')` by default.
 */
export declare function errorNoneRoleCallback(cb: () => any): void;

/**
 * Define the HTTP Header name that uses to get session JWT.
 * @param headerName The header name. `X-Auth-Token` by default
 */
export declare function setTokenHeaderName(headerName: string): void;

/**
 * Define the array of roles presented in the system.
 * Use this function on application initialization.
 * @param roles the roles of the system
 */
export declare function initRoles(roles: string[]);
