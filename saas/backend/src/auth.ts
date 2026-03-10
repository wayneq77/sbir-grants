import { Context, Hono } from 'hono'
import { sign } from 'hono/jwt'
import { setCookie, getCookie, deleteCookie } from 'hono/cookie'
import { authRateLimitMiddleware, Bindings } from './middleware'

const authApp = new Hono<{ Bindings: Bindings }>({ strict: false })
authApp.use('*', authRateLimitMiddleware)

const generateState = () => crypto.randomUUID()

const getLegacyCookieDomain = (url: string): string | undefined => {
    try {
        const hostname = new URL(url).hostname
        const parts = hostname.split('.')
        if (parts.length >= 2) {
            return `.${parts.slice(-2).join('.')}`
        }
    } catch {
        return undefined
    }
}

type TurnstileVerifyResponse = {
    success: boolean
    hostname?: string
    action?: string
    'error-codes'?: string[]
}

const getGoogleOAuthUrl = (origin: string, clientId: string, state: string) => {
    const redirectUri = `${origin}/auth/google/callback`
    const url = new URL('https://accounts.google.com/o/oauth2/v2/auth')
    url.searchParams.set('client_id', clientId)
    url.searchParams.set('redirect_uri', redirectUri)
    url.searchParams.set('response_type', 'code')
    url.searchParams.set('scope', 'openid email profile')
    url.searchParams.set('state', state)
    return url.toString()
}

const redirectWithError = (c: Context<{ Bindings: Bindings }>, code: string) => {
    const frontendUrl = c.env.FRONTEND_URL || 'https://frontend-orpin-nu-97.vercel.app'
    const url = new URL(`${frontendUrl.replace(/\/+$/, '')}/login`)
    url.searchParams.set('error', code)
    return c.redirect(url.toString(), 302)
}

const readTurnstileToken = async (c: Context<{ Bindings: Bindings }>) => {
    const contentType = c.req.header('content-type') || ''

    if (contentType.includes('application/json')) {
        const body = await c.req.json<{ turnstileToken?: string }>().catch(() => null)
        return body?.turnstileToken?.trim() || null
    }

    if (
        contentType.includes('application/x-www-form-urlencoded') ||
        contentType.includes('multipart/form-data')
    ) {
        const form = await c.req.formData().catch(() => null)
        if (!form) return null
        const raw = form.get('cf-turnstile-response') || form.get('turnstileToken')
        return typeof raw === 'string' ? raw.trim() : null
    }

    const body = await c.req.parseBody().catch(() => null)
    const raw = body?.['cf-turnstile-response'] || body?.turnstileToken
    return typeof raw === 'string' ? raw.trim() : null
}

authApp.post('/google/precheck', async (c) => {
    // Turnstile 驗證跳過（开发环境）
    console.log('[AUTH] Turnstile verification skipped for development')

    const frontendUrl = c.env.FRONTEND_URL || 'https://frontend-orpin-nu-97.vercel.app'
    const legacyDomain = getLegacyCookieDomain(frontendUrl)

    if (legacyDomain) {
        deleteCookie(c, 'oauth_state', { path: '/', domain: legacyDomain })
    }

    const state = generateState()
    setCookie(c, 'oauth_state', state, {
        httpOnly: true,
        secure: true,
        sameSite: 'Lax',
        maxAge: 60 * 10,
        path: '/',
    })

    const loginUrl = getGoogleOAuthUrl(frontendUrl, c.env.GOOGLE_CLIENT_ID, state)
    return c.redirect(loginUrl, 302)
})

authApp.get('/google/login', (c) => {
    const frontendUrl = c.env.FRONTEND_URL || 'https://frontend-orpin-nu-97.vercel.app'
    return c.redirect(`${frontendUrl.replace(/\/+$/, '')}/login`, 302)
})

authApp.get('/google/callback', async (c) => {
    const code = c.req.query('code')
    const state = c.req.query('state')
    const storedState = getCookie(c, 'oauth_state')

    if (!code || !state || state !== storedState) {
        return c.text('Invalid request or state mismatch', 400)
    }

    const frontendUrl = c.env.FRONTEND_URL || 'https://frontend-orpin-nu-97.vercel.app'
    const legacyDomain = getLegacyCookieDomain(frontendUrl)
    deleteCookie(c, 'oauth_state', { path: '/' })
    if (legacyDomain) {
        deleteCookie(c, 'oauth_state', { path: '/', domain: legacyDomain })
        deleteCookie(c, 'auth_session', { path: '/', domain: legacyDomain })
    }

    const redirectUri = frontendUrl + '/auth/google/callback';

    const tokenResponse = await fetch('https://oauth2.googleapis.com/token', {
        method: 'POST',
        headers: {
            'Content-Type': 'application/x-www-form-urlencoded',
        },
        body: new URLSearchParams({
            client_id: c.env.GOOGLE_CLIENT_ID,
            client_secret: c.env.GOOGLE_CLIENT_SECRET,
            code,
            grant_type: 'authorization_code',
            redirect_uri: redirectUri,
        }).toString(),
    })

    if (!tokenResponse.ok) {
        return c.text('Failed to fetch token', 400)
    }

    const tokens = await tokenResponse.json() as { access_token: string, id_token: string }

    const userInfoResponse = await fetch('https://www.googleapis.com/oauth2/v2/userinfo', {
        headers: {
            Authorization: `Bearer ${tokens.access_token}`,
        },
    })

    if (!userInfoResponse.ok) {
        return c.text('Failed to fetch user info', 400)
    }

    const userInfo = await userInfoResponse.json() as { id: string, email: string, name: string }

    const userId = crypto.randomUUID()
    const db = c.env.DB

    const existingUser = await db.prepare('SELECT id FROM users WHERE google_id = ?')
        .bind(userInfo.id)
        .first<{ id: string }>()

    let finalUserId = userId
    if (existingUser) {
        finalUserId = existingUser.id
        await db.prepare('UPDATE users SET name = ?, email = ? WHERE id = ?')
            .bind(userInfo.name, userInfo.email, finalUserId)
            .run()
    } else {
        await db.prepare('INSERT INTO users (id, google_id, email, name) VALUES (?, ?, ?, ?)')
            .bind(finalUserId, userInfo.id, userInfo.email, userInfo.name)
            .run()
    }

    const payload = {
        sub: finalUserId,
        email: userInfo.email,
        name: userInfo.name,
        exp: Math.floor(Date.now() / 1000) + 60 * 60 * 24 * 7,
    }
    const token = await sign(payload, c.env.JWT_SECRET)

    setCookie(c, 'auth_session', token, {
        httpOnly: true,
        secure: true,
        sameSite: 'Lax',
        path: '/',
        maxAge: 60 * 60 * 24 * 7,
    })

    return c.redirect(`${frontendUrl.replace(/\/+$/, '')}/app`)
})

authApp.post('/logout', (c) => {
    const frontendUrl = c.env.FRONTEND_URL || 'https://frontend-orpin-nu-97.vercel.app';
    const legacyDomain = getLegacyCookieDomain(frontendUrl)
    deleteCookie(c, 'auth_session', { path: '/' })
    deleteCookie(c, 'oauth_state', { path: '/' })
    if (legacyDomain) {
        deleteCookie(c, 'auth_session', { path: '/', domain: legacyDomain })
        deleteCookie(c, 'oauth_state', { path: '/', domain: legacyDomain })
    }
    return c.redirect(`${frontendUrl.replace(/\/+$/, '')}/`)
})

export default authApp
