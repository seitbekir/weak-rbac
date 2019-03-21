// eslint-disable-next-line
/// <reference path="./index.d.ts" />
/**
 * @typedef {{ role: string; [x: string]: any }} SessionObject
 * @typedef {Object} OptionsObject
 * @property {string} tokenHeaderName Define the HTTP Header name that uses to get session JWT.
 * @property {() => any} errorAllowedCallback Define the callback that calls when `allow()`
 *      function denied the access and not folloing middlewares.
 * @property {() => any} errorSessionCallback Define the callback that calls when `initSession()`
 *      function declining `X-Auth-Token` (or your header name) verification.
 * @property {() => any} errorNoneRoleCallback Define the callback that calls when `initToken()`
 *      function trying to create token for not-presented in the system role of user.
 * @property {string[]} roles Define the array of roles presented in the system.
 */

const jwt = require('jsonwebtoken');
const intersection = require('lodash.intersection');
const uniq = require('lodash.uniq');

const secret = process.env.SESSION_SECRET;
if (secret === undefined) {
    throw new Error('JWT secret not defined in the environment');
}

/* Definition */
module.exports = {
    initRBAC,

    initSession,

    initToken,

    setWrapper,
    setVerificator,

    allow,

    errorAllowedCallback,
    errorSessionCallback,
    errorNoneRoleCallback,
    setTokenHeaderName,

    initRoles,
};

/** @type {string} */
let _tokenHeaderName = 'X-Auth-Token';
/** @type {string[]} */
let _roles = [];
/** @type {Function[]} */
const _wrappers = [];
/** @type {Function[]} */
const _verificators = [];
/** @type {Function} */
let _errorAllowedCallback = () => 403;
/** @type {Function} */
let _errorSessionCallback = () => 403;
/** @type {Function} */
let _errorNoneRoleCallback = () => new Error('Role has not presented in system');

/* Public */
/**
 * Use this function as a builder of RBAC session with common optins definition.
 * @param {OptionsObject} options RBAC builed
 */
async function initRBAC(options = {}) {
    if (typeof options !== 'object') {
        throw new Error('options has to be an object');
    }

    if (options.tokenHeaderName) {
        setTokenHeaderName(options.tokenHeaderName);
    }

    if (options.errorAllowedCallback) {
        errorAllowedCallback(options.errorAllowedCallback);
    }

    if (options.errorSessionCallback) {
        errorSessionCallback(options.errorSessionCallback);
    }

    if (options.errorNoneRoleCallback) {
        errorNoneRoleCallback(options.errorNoneRoleCallback);
    }

    if (options.roles) {
        initRoles(options.roles);
    }

    return initSession;
}

/**
 * Middleware that generation session if user has `X-Auth-Token` (or your header name) header in request.
 * @param {Request} req
 * @param {Response} res
 * @param {NextFunction} next
 */
async function initSession(req, res, next) {
    try {
        const token = req.get(_tokenHeaderName);

        if (token === undefined) {
            next();
            return;
        }

        const session = getSessionFromToken(token);

        if (session !== null) {
            // Verification of session
            if (await verify(session) === false) {
                throw _errorSessionCallback();
            }

            res.locals.session = await wrap(session);
        }

        next();
    } catch (err) {
        next(err);
    }
}

/**
 * Creates session token for user
 * @param {string} role User role name
 * @param {object} data custom data to be stored in session token
 */
function initToken(role, data) {
    if (_roles.includes(role) === false) {
        throw _errorNoneRoleCallback();
    }

    return jwt.sign({
        role,
        ...data,
    }, secret);
}

/**
 * Enable custom session wrappers
 * @param {(session: SessionObject) => Promise<SessionObject>} wrapper wrapped session
 */
function setWrapper(wrapper) {
    if (typeof wrapper !== 'function' || wrapper.length !== 1) {
        throw new Error('Wrapper has to be a function with session argument');
    }

    if (_wrappers.includes(wrapper)) {
        throw new Error('This wrapper already exists');
    }

    _wrappers.push(wrapper);
}

/**
 * Enable custom session verificator
 * @param {(session: SessionObject) => Promise<boolean>} verificator verify function
 */
function setVerificator(verificator) {
    if (typeof verificator !== 'function' || verificator.length !== 1) {
        throw new Error('Verificator has to be a function with session argument');
    }

    if (_verificators.includes(verificator)) {
        throw new Error('This verificator already exists');
    }

    _verificators.push(verificator);
}

/**
 * Defines the list of users by role who allowed to execute following middlewares.
 * @param {string[]|'authorized'} roles Roles allowed to visit the route
 * @param {boolean} follow If this role denied the route will be skiped
 */
function allow(roles = [], follow = false) {
    if (roles === 'authorized') {
        return allow(_roles, follow);
    }

    if (Array.isArray(roles) === false || roles.every(v => typeof v === 'string') === false) {
        throw new Error('Roles param has to contain sting array of inited roles');
    }

    if (intersection(roles, _roles).length > 0) {
        throw new Error('Roles from list has not presented in system');
    }

    return middleware;

    function middleware(req, res, next) {
        if (res.locals.session && roles.indexOf(res.locals.session.role) > -1) {
            next();
        } else {
            next(follow ? 'route' : _errorAllowedCallback());
        }
    }
}

/**
 * Define the callback that calls when `allow()` function denied the access and not folloing middlewares.
 * @param {() => void} cb callback function
 */
function errorAllowedCallback(cb) {
    if (typeof cb !== 'function') {
        throw new Error('callback has to be a function');
    }
    _errorAllowedCallback = cb;
}

/**
 * Define the callback that calls when `initSession()` function declining `X-Auth-Token` (or your header name) verification.
 * @param {() => any} cb callback function
 */
function errorSessionCallback(cb) {
    if (typeof cb !== 'function') {
        throw new Error('callback has to be a function');
    }
    _errorSessionCallback = cb;
}

/**
 * Define the callback that calls when `initToken()` function trying to create token for not-presented in the system role of user.
 * @param {() => any} cb callback function that will be throwed
 */
function errorNoneRoleCallback(cb) {
    if (typeof cb !== 'function') {
        throw new Error('callback has to be a function');
    }
    _errorNoneRoleCallback = cb;
}

/**
 * Define the HTTP Header name that uses to get session JWT.
 * @param {string} headerName The header name. `X-Auth-Token` by default
 */
function setTokenHeaderName(headerName) {
    if (typeof headerName !== 'string') {
        throw new Error('header name has to be string');
    }
    _tokenHeaderName = headerName;
}

/**
 * Define the array of roles presented in the system.
 * Use this function on application initialization.
 * @param {string[]} roles the roles of the system
 */
function initRoles(roles = []) {
    if (Array.isArray(roles) === false || roles.every(v => typeof v === 'string') === false) {
        throw new Error('Roles param has to contain sting array of inited roles');
    }

    _roles = uniq(roles);
}

/* Private */
/**
 * Check token to be valid and returnes session object.
 *
 * @param {String} token Auth token
 */
function getSessionFromToken(token) {
    try {
        return jwt.verify(token, secret);
    } catch (err) {
        return null;
    }
}

async function verify(session) {
    try {
        let status = true;

        for (const verificator of _verificators) {
            // eslint-disable-next-line
            status = await verificator(session);

            if (status === false) {
                break;
            }
        }

        return status;
    } catch (err) {
        return false;
    }
}

async function wrap(session) {
    let _result = session;
    for (const wrapper of _wrappers) {
        _result = wrapper(_result);
    }

    return _result;
}
