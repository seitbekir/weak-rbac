# weak-rbac

This is the simplest RBAC for express router. You may use it to regulate session and access based on route and user role.

## Example

```js
app.get(
    '/hidden-resource',
    allow(['admin'], true), // Here we checking the access, it will be follow down if user role is not 'admin'
    (req, res, next) => {
        // res.send() the resource
        // next(error) if something wrong
    },
);
```

full example available on [example.js](/example.js) file

## Quick configuration of RBAC available

```js
app.use(initRBAC({
    tokenHeaderName: 'X-My-Token',
    errorAllowedCallback: () => new HttpError(403, 'Permission denied'),
    errorSessionCallback: () => new HttpError(403, 'User Banned'),
    errorNoneRoleCallback: () => new HttpError(418, 'This Role not available in system'),
    roles: ['admin', 'user', 'john'],
}));
```

## To Do

- Tests (mocha.js)
