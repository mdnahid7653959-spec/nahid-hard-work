## Goal
Ekbar account create ba login korar por, same device/browser e user permanently logged in thakbe — ar login korte hobe na.

## Current State
- `src/integrations/supabase/client.ts` e already `persistSession: true`, `autoRefreshToken: true`, `storage: localStorage` set kora ache — mane session technically browser e save hocche.
- Kintu **email confirmation** on thakle signup er por session create hoy na, user ke email verify korar por manually login korte hoy — ei karone "account create korar por o login lage" mone hocche.

## Changes

### 1. Auto-confirm email ON kora
`supabase--configure_auth` tool diye `auto_confirm_email: true` set korbo. Er fole:
- Signup korar songe songe session create hoye jabe
- Email verify korar dorkar nei
- User signup form submit korar por directly logged in state e chole jabe

### 2. Session persistence verify
Already properly configured — kono code change lagbe na. localStorage e session save thake, token auto-refresh hoy, tai browser bondho kore khulleo ba refresh dileo user logged in thakbe. Only tokhon logout hobe jokhon:
- User nije "Logout" chape
- Browser data/cache manually clear kore

## Trade-off (jene rakha bhalo)
Auto-confirm on kora mane keu fake email diye account khulte parbe (email verify hobe na). Marketplace er jonno eta common, kintu chaile pore email verification abar on kora jabe.

## Confirm
Egiye jai?
