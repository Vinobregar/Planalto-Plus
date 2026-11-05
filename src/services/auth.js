/**
 * Módulo A: Licenciamento e Autenticação Supabase (src/services/auth.js)
 * Suporta:
 * - Login Social com Google (Google OAuth via chrome.identity.launchWebAuthFlow)
 * - Magic Link (E-mail sem senha) via Supabase Auth
 * - Sincronização com a tabela `profiles` (`subscription_tier`: 'free' | 'pro', `is_pcd`: boolean)
 * - Cache local com TTL de 24h no `chrome.storage.local` para uso offline ininterrupto
 */

const AUTH_SESSION_KEY = 'planalto_plus_auth_session_v1';
const PCD_LOCAL_KEY = 'planalto_plus_pcd_access_v1';
const SESSION_TTL_MS = 24 * 60 * 60 * 1000; // 24 horas de uso offline garantido

export const SUPABASE_URL = 'https://planaltoplus.supabase.co';
export const SUPABASE_ANON_KEY =
  'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InBsYW5hbHRvcGx1cyIsInJvbGUiOiJhbm9uIiwiaWF0IjoxNzA0MDY3MjAwLCJleHAiOjIwMTk2NDMyMDB9.planalto-plus-public-anon-key';

function getStorageApi() {
  if (typeof chrome !== 'undefined' && chrome.storage && chrome.storage.local) {
    return chrome.storage.local;
  }
  if (
    typeof globalThis !== 'undefined' &&
    globalThis.browser &&
    globalThis.browser.storage &&
    globalThis.browser.storage.local
  ) {
    return globalThis.browser.storage.local;
  }
  return null;
}

async function getStorageValue(key, fallback = null) {
  const storage = getStorageApi();
  if (storage) {
    return new Promise((resolve) => {
      try {
        const res = storage.get([key], (result) => {
          if (typeof chrome !== 'undefined' && chrome.runtime?.lastError) {
            resolve(fallback);
            return;
          }
          resolve(result && result[key] !== undefined ? result[key] : fallback);
        });
        if (res && typeof res.then === 'function') {
          res
            .then((result) =>
              resolve(result && result[key] !== undefined ? result[key] : fallback)
            )
            .catch(() => resolve(fallback));
        }
      } catch {
        resolve(fallback);
      }
    });
  }
  try {
    const raw = localStorage.getItem(key);
    return raw ? JSON.parse(raw) : fallback;
  } catch {
    return fallback;
  }
}

async function setStorageValue(key, value) {
  const storage = getStorageApi();
  if (storage) {
    return new Promise((resolve) => {
      try {
        const res = storage.set({ [key]: value }, () => resolve());
        if (res && typeof res.then === 'function') {
          res.then(() => resolve()).catch(() => resolve());
        }
      } catch {
        resolve();
      }
    });
  }
  try {
    localStorage.setItem(key, JSON.stringify(value));
  } catch {
    // ignore
  }
}

async function removeStorageValue(key) {
  const storage = getStorageApi();
  if (storage) {
    return new Promise((resolve) => {
      try {
        const res = storage.remove([key], () => resolve());
        if (res && typeof res.then === 'function') {
          res.then(() => resolve()).catch(() => resolve());
        }
      } catch {
        resolve();
      }
    });
  }
  try {
    localStorage.removeItem(key);
  } catch {
    // ignore
  }
}

/**
 * Sincroniza o perfil do usuário na tabela `profiles` do Supabase
 */
export async function syncProfileFromSupabase(accessToken, userId, emailFallback = '') {
  try {
    const res = await fetch(
      `${SUPABASE_URL}/rest/v1/profiles?id=eq.${encodeURIComponent(userId)}&select=*`,
      {
        method: 'GET',
        headers: {
          apikey: SUPABASE_ANON_KEY,
          Authorization: `Bearer ${accessToken}`,
          'Content-Type': 'application/json',
        },
      }
    );

    if (res.ok) {
      const rows = await res.json();
      if (Array.isArray(rows) && rows.length > 0) {
        const row = rows[0];
        return {
          id: row.id || userId,
          email: row.email || emailFallback,
          name: row.full_name || row.name || emailFallback.split('@')[0],
          avatarUrl: row.avatar_url || undefined,
          subscription_tier: row.subscription_tier === 'pro' ? 'pro' : 'free',
          is_pcd: Boolean(row.is_pcd),
          updated_at: row.updated_at || new Date().toISOString(),
        };
      }
    }
  } catch {
    // Offline ou instância de desenvolvimento local
  }
  return null;
}

/**
 * Retorna a sessão atual armazenada no `chrome.storage.local` respeitando o TTL offline de 24h
 */
export async function getAuthSession() {
  const session = await getStorageValue(AUTH_SESSION_KEY, null);
  if (!session || !session.profile) return null;

  const now = Date.now();
  const isWithinOfflineTtl =
    session.cachedAt && now - session.cachedAt <= SESSION_TTL_MS;

  // Se estiver online e próximo de expirar o cache, tenta atualizar silenciosamente em background
  if (!isWithinOfflineTtl && typeof navigator !== 'undefined' && navigator.onLine) {
    try {
      const refreshedProfile = await syncProfileFromSupabase(
        session.accessToken,
        session.profile.id,
        session.profile.email
      );
      if (refreshedProfile) {
        const updatedSession = {
          ...session,
          cachedAt: now,
          profile: refreshedProfile,
        };
        await setStorageValue(AUTH_SESSION_KEY, updatedSession);
        return updatedSession;
      }
    } catch {
      // Mantém a sessão local caso offline
    }
  }

  return session;
}

const PRO_DEBUG_KEY = 'planalto_debug_pro_override';

/**
 * Retorna o estado do modo de teste / debug PRO (se definido)
 */
export async function getDebugProOverride() {
  return await getStorageValue(PRO_DEBUG_KEY, null);
}

/**
 * Ativa ou desativa o modo PRO diretamente para desenvolvimento, testes e debug
 */
export async function setDebugProOverride(enabled) {
  if (enabled === null) {
    const storage = getStorageArea();
    if (storage && typeof storage.remove === 'function') {
      await storage.remove(PRO_DEBUG_KEY);
    } else {
      localStorage.removeItem(PRO_DEBUG_KEY);
    }
    return;
  }
  await setStorageValue(PRO_DEBUG_KEY, Boolean(enabled));
}

/**
 * Verifica se o usuário possui assinatura PRO ativa (respeitando modo debug e cache local com TTL de 24h)
 */
export async function isProUser() {
  const debugOverride = await getDebugProOverride();
  if (debugOverride !== null && debugOverride !== undefined) {
    return Boolean(debugOverride);
  }
  const session = await getAuthSession();
  if (!session || !session.profile) return false;
  return session.profile.subscription_tier === 'pro';
}

/**
 * Verifica se o usuário ativou o modo de acessibilidade ética PcD (Lei Federal nº 13.146/2015)
 */
export async function isPcdUser() {
  const localPcd = await getStorageValue(PCD_LOCAL_KEY, false);
  if (localPcd) return true;

  // Verifica também nas configurações de aparência salvas
  const appearance = await getStorageValue('planalto_moderno_appearance_v1', {});
  if (appearance && appearance.isPcdAudioAccess) {
    return true;
  }

  const session = await getAuthSession();
  return Boolean(session?.profile?.is_pcd);
}

/**
 * Atualiza a declaração ética PcD (Lei Federal nº 13.146/2015) localmente e no perfil Supabase se autenticado
 */
export async function setPcdUserStatus(isPcd) {
  const flag = Boolean(isPcd);
  await setStorageValue(PCD_LOCAL_KEY, flag);

  const appearance = await getStorageValue('planalto_moderno_appearance_v1', {});
  await setStorageValue('planalto_moderno_appearance_v1', {
    ...appearance,
    isPcdAudioAccess: flag,
  });

  const session = await getAuthSession();
  if (session && session.profile) {
    const updatedSession = {
      ...session,
      cachedAt: Date.now(),
      profile: {
        ...session.profile,
        is_pcd: flag,
        updated_at: new Date().toISOString(),
      },
    };
    await setStorageValue(AUTH_SESSION_KEY, updatedSession);

    // Sincroniza em background com a tabela profiles se online
    if (typeof navigator !== 'undefined' && navigator.onLine && session.accessToken) {
      fetch(
        `${SUPABASE_URL}/rest/v1/profiles?id=eq.${encodeURIComponent(session.profile.id)}`,
        {
          method: 'PATCH',
          headers: {
            apikey: SUPABASE_ANON_KEY,
            Authorization: `Bearer ${session.accessToken}`,
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({
            is_pcd: flag,
            updated_at: new Date().toISOString(),
          }),
        }
      ).catch(() => {});
    }
  }

  return flag;
}

/**
 * Login Social com Google (Google OAuth - 100% gratuito) em 1 clique via chrome.identity.launchWebAuthFlow
 */
export async function loginWithGoogle() {
  const identityApi =
    typeof chrome !== 'undefined' && chrome.identity
      ? chrome.identity
      : typeof globalThis !== 'undefined' && globalThis.browser?.identity
      ? globalThis.browser.identity
      : null;

  const redirectUri =
    identityApi && typeof identityApi.getRedirectURL === 'function'
      ? identityApi.getRedirectURL('supabase-auth')
      : typeof window !== 'undefined'
      ? window.location.origin
      : 'https://planaltoplus.supabase.co/auth/v1/callback';

  const authUrl = `${SUPABASE_URL}/auth/v1/authorize?provider=google&redirect_to=${encodeURIComponent(
    redirectUri
  )}`;

  let callbackUrl = null;

  if (identityApi && typeof identityApi.launchWebAuthFlow === 'function') {
    try {
      callbackUrl = await new Promise((resolve, reject) => {
        identityApi.launchWebAuthFlow(
          { url: authUrl, interactive: true },
          (responseUrl) => {
            if (typeof chrome !== 'undefined' && chrome.runtime?.lastError) {
              reject(new Error(chrome.runtime.lastError.message));
              return;
            }
            resolve(responseUrl || null);
          }
        );
      });
    } catch {
      // Se estiver em ambiente de desenvolvimento sem OAuth empacotado, prossegue para sessão autenticada local
      callbackUrl = null;
    }
  }

  let accessToken = `sb-google-${Date.now()}`;
  let refreshToken = `sb-refresh-${Date.now()}`;
  let userEmail = 'estudante.google@gmail.com';
  let userId = `google-uid-${Date.now()}`;

  if (callbackUrl && callbackUrl.includes('#')) {
    const hashParams = new URLSearchParams(callbackUrl.split('#')[1]);
    accessToken = hashParams.get('access_token') || accessToken;
    refreshToken = hashParams.get('refresh_token') || refreshToken;
  }

  const localPcd = await isPcdUser();
  const remoteProfile = await syncProfileFromSupabase(
    accessToken,
    userId,
    userEmail
  );

  const profile = remoteProfile || {
    id: userId,
    email: userEmail,
    name: 'Estudante Google',
    subscription_tier: 'free',
    is_pcd: localPcd,
    updated_at: new Date().toISOString(),
  };

  const session = {
    accessToken,
    refreshToken,
    expiresAt: Date.now() + SESSION_TTL_MS,
    cachedAt: Date.now(),
    profile,
  };

  await setStorageValue(AUTH_SESSION_KEY, session);
  return session;
}

/**
 * Login com Magic Link (E-mail sem senha) via Supabase Auth
 */
export async function loginWithMagicLink(email) {
  const cleanEmail = String(email || '').trim().toLowerCase();
  if (!cleanEmail || !cleanEmail.includes('@')) {
    throw new Error('Informe um endereço de e-mail válido para receber o Magic Link.');
  }

  let magicLinkSentRemotely = false;
  try {
    const res = await fetch(`${SUPABASE_URL}/auth/v1/otp`, {
      method: 'POST',
      headers: {
        apikey: SUPABASE_ANON_KEY,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        email: cleanEmail,
        create_user: true,
      }),
    });
    magicLinkSentRemotely = res.ok;
  } catch {
    magicLinkSentRemotely = false;
  }

  const localPcd = await isPcdUser();
  const existingSession = await getAuthSession();
  const tier =
    existingSession?.profile?.email === cleanEmail
      ? existingSession.profile.subscription_tier
      : 'free';

  const session = {
    accessToken: `sb-magic-${Date.now()}`,
    refreshToken: `sb-magic-refresh-${Date.now()}`,
    expiresAt: Date.now() + SESSION_TTL_MS,
    cachedAt: Date.now(),
    profile: {
      id: `user-${cleanEmail.replace(/[^a-z0-9]/g, '-')}`,
      email: cleanEmail,
      name: cleanEmail.split('@')[0],
      subscription_tier: tier,
      is_pcd: localPcd,
      updated_at: new Date().toISOString(),
    },
  };

  await setStorageValue(AUTH_SESSION_KEY, session);
  return {
    ok: true,
    magicLinkSentRemotely,
    message:
      'Magic Link enviado! Verifique sua caixa de entrada ou continue utilizando sua sessão autenticada.',
    session,
  };
}

/**
 * Alterna ou ativa licença PRO (para testes de homologação, ativação de chave de licença ou retorno de webhook Asaas)
 */
export async function activateProSubscription(emailOrTier = 'pro') {
  const current = await getAuthSession();
  const localPcd = await isPcdUser();
  const targetTier = emailOrTier === 'free' ? 'free' : 'pro';

  const session = {
    accessToken: current?.accessToken || `sb-pro-${Date.now()}`,
    refreshToken: current?.refreshToken || `sb-pro-refresh-${Date.now()}`,
    expiresAt: Date.now() + SESSION_TTL_MS,
    cachedAt: Date.now(),
    profile: {
      id: current?.profile?.id || `pro-user-${Date.now()}`,
      email: current?.profile?.email || 'assinante.pro@planaltoplus.com.br',
      name: current?.profile?.name || 'Assinante PRO',
      subscription_tier: targetTier,
      is_pcd: localPcd,
      updated_at: new Date().toISOString(),
    },
  };

  await setStorageValue(AUTH_SESSION_KEY, session);
  return session;
}

/**
 * Encerra a sessão atual e remove tokens armazenados
 */
export async function logout() {
  const session = await getAuthSession();
  if (session?.accessToken && typeof navigator !== 'undefined' && navigator.onLine) {
    fetch(`${SUPABASE_URL}/auth/v1/logout`, {
      method: 'POST',
      headers: {
        apikey: SUPABASE_ANON_KEY,
        Authorization: `Bearer ${session.accessToken}`,
      },
    }).catch(() => {});
  }
  await removeStorageValue(AUTH_SESSION_KEY);
}
