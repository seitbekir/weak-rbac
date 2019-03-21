const app = require('express')();
const rbac = require('./index');

const tokenHeader = 'Token';

const ourUser = { username: 'username', role: 'admin' };

// Configurate RBAC
rbac.initRoles(['admin', 'user']);

rbac.errorAllowedCallback(() => new Error(403, 'Forbidden')); // overriding
rbac.errorSessionCallback(() => new Error(403, 'Forbidden')); // overriding
rbac.errorNoneRoleCallback(() => new Error('User Role now corrent')); // overriding
rbac.setTokenHeaderName(tokenHeader); // overriding Token contain Header name

rbac.setVerificator((session) => {
    if (session.role !== ourUser.role) {
        return false;
    }
    return true;
});
rbac.setWrapper((session) => {
    session.user.goodBoy = true;

    return session;
});

// Patching the application router
app.use(rbac.initSession);

// Autorize user
app.post('/auth', (req, res, next) => {
    try {
        if (
            typeof req.body !== 'object'
            && req.body.username !== 'username'
            && req.body.password !== 'password'
        ) {
            throw new Error('Credentials required');
        }

        const token = rbac.initToken('admin', { user: ourUser });

        res.setHeader(tokenHeader, token);
        res.status(201);
        res.send();
    } catch (err) {
        next(err);
    }
});

app.get(
    '/hidden-resource',
    rbac.allow(['admin'], true), // Here we checking the access, it will be skiped if user role is 'user'
    (req, res, next) => {
        // res.send() the resource
        // next(error) if something wrong
    },
);
app.get(
    '/hidden-resource',
    rbac.allow(['user']), // This route is only for user role user
    (req, res, next) => {
        // your own resource checker
        // if the user with role 'user' has access to exact resource
    },
    (req, res, next) => {
        // res.send() the resource
        // next(error) if something wrong
    },
);

app.use((err, req, res, next) => {
    console.error(err);

    res.status(500);
    res.send({ error: 'Request cannot be executed' });
});

app.listen(3000, () => console.info('server is listening on port 3000'));
