'use client';

import { useState, type ChangeEvent, type FormEvent } from 'react';
import { useRouter } from 'next/navigation';
import { Newspaper, ShieldAlert } from 'lucide-react';
import { supabase } from '@/lib/supabase';
import { AvatarPortrait } from '@/components/AvatarPortrait';
import type { AvatarCode, GenderDesk, ProfileRow } from '@/types/database';

type AuthMode = 'login' | 'register';

const AVATAR_OPTIONS: readonly AvatarCode[] = ['M1', 'M2', 'M3', 'F1', 'F2', 'F3'] as const;
const USERNAME_PATTERN = /^[a-z0-9_]{3,20}$/;

export default function AuthPage() {
  const router = useRouter();
  const [mode, setMode] = useState<AuthMode>('login');

  // Login state (accepts Email OR Username)
  const [identifier, setIdentifier] = useState<string>('');
  const [password, setPassword] = useState<string>('');

  // Registration state
  const [fullName, setFullName] = useState<string>('');
  const [username, setUsername] = useState<string>('');
  const [email, setEmail] = useState<string>('');
  const [confirmPassword, setConfirmPassword] = useState<string>('');
  const [gender, setGender] = useState<GenderDesk>('Female');
  const [avatarId, setAvatarId] = useState<AvatarCode>('F1');

  const [errorMsg, setErrorMsg] = useState<string>('');
  const [loading, setLoading] = useState<boolean>(false);

  async function handleLogin(e: FormEvent<HTMLFormElement>): Promise<void> {
    e.preventDefault();
    setErrorMsg('');
    setLoading(true);

    const normalizedIdentifier = identifier.trim().toLowerCase();
    let resolvedEmail = normalizedIdentifier;

    if (!normalizedIdentifier.includes('@')) {
      const cleanUsername = normalizedIdentifier.replace(/^@/, '');

      const { data: profileData, error: lookupError } = await supabase
        .from('profiles')
        .select('email')
        .eq('username', cleanUsername)
        .maybeSingle<Pick<ProfileRow, 'email'>>();

      if (lookupError || !profileData?.email) {
        setErrorMsg('Username not found. Check spelling or sign in using your email.');
        setLoading(false);
        return;
      }

      resolvedEmail = profileData.email.trim().toLowerCase();
    }

    const { error: signInError } = await supabase.auth.signInWithPassword({
      email: resolvedEmail,
      password,
    });

    if (signInError) {
      setErrorMsg(signInError.message);
      setLoading(false);
      return;
    }

    router.push('/newsroom');
  }

  async function handleRegister(e: FormEvent<HTMLFormElement>): Promise<void> {
    e.preventDefault();
    setErrorMsg('');

    const trimmedFullName = fullName.trim();
    const cleanUsername = username.trim().toLowerCase().replace(/^@/, '');
    const cleanEmail = email.trim().toLowerCase();

    if (trimmedFullName.length < 2) {
      setErrorMsg('Please enter your byline full name (at least 2 characters).');
      return;
    }

    if (!USERNAME_PATTERN.test(cleanUsername)) {
      setErrorMsg('Username must be 3–20 lowercase letters, numbers, or underscores only.');
      return;
    }

    if (password.length < 6) {
      setErrorMsg('Game password must be at least 6 characters.');
      return;
    }

    if (password !== confirmPassword) {
      setErrorMsg('Passwords do not match. Please re-enter carefully.');
      return;
    }

    setLoading(true);

    // Check username availability before creating auth user
    const { data: existingProfile, error: checkError } = await supabase
      .from('profiles')
      .select('id')
      .eq('username', cleanUsername)
      .maybeSingle<Pick<ProfileRow, 'id'>>();

    if (checkError) {
      setErrorMsg(`Database error: ${checkError.message}`);
      setLoading(false);
      return;
    }

    if (existingProfile) {
      setErrorMsg(`@${cleanUsername} is already claimed by another reporter.`);
      setLoading(false);
      return;
    }

    const { error: signUpError } = await supabase.auth.signUp({
      email: cleanEmail,
      password,
      options: {
        data: {
          full_name: trimmedFullName,
          username: cleanUsername,
          gender,
          avatar_id: avatarId,
        },
      },
    });

    if (signUpError) {
      setErrorMsg(signUpError.message);
      setLoading(false);
      return;
    }

    router.push('/newsroom');
  }

  function handleGenderChange(e: ChangeEvent<HTMLSelectElement>): void {
    const nextGender = e.target.value as GenderDesk;
    setGender(nextGender);
    setAvatarId(nextGender === 'Male' ? 'M1' : 'F1');
  }

  return (
    <main className="min-h-screen bg-[#191410] text-[#101311] p-4 md:p-8 flex items-center justify-center">
      <div className="max-w-lg w-full bg-[#F2EDE1] border-4 border-[#101311] shadow-[10px_10px_0px_#101311]">
        {/* Masthead Header */}
        <div className="p-6 border-b-4 border-[#101311] bg-[#EAE2D0] text-center">
          <p className="font-mono text-[11px] font-bold uppercase tracking-widest text-[#932A13]">
            METRO MALINAM • COPY DESK PORTAL
          </p>
          <h1 className="font-serif text-3xl md:text-4xl font-black mt-1">THE WATCHDOG DESK</h1>
          <p className="text-xs font-mono text-[#2C251E] mt-1">
            Official Press Credential &amp; Editorial Verification Terminal
          </p>
        </div>

        {/* Mode Toggle Tabs */}
        <div className="grid grid-cols-2 border-b-4 border-[#101311] font-mono text-xs font-bold uppercase">
          <button
            type="button"
            onClick={() => {
              setMode('login');
              setErrorMsg('');
            }}
            className={`py-3 border-r-2 border-[#101311] ${
              mode === 'login' ? 'bg-[#101311] text-[#F2EDE1]' : 'bg-white hover:bg-[#EAE2D0]'
            }`}
          >
            Press Sign In
          </button>
          <button
            type="button"
            onClick={() => {
              setMode('register');
              setErrorMsg('');
            }}
            className={`py-3 ${
              mode === 'register' ? 'bg-[#101311] text-[#F2EDE1]' : 'bg-white hover:bg-[#EAE2D0]'
            }`}
          >
            Issue New Press ID
          </button>
        </div>

        <div className="p-6">
          {errorMsg && (
            <div className="mb-4 p-3 bg-[#932A13] text-white text-xs font-mono flex items-start gap-2 border-2 border-[#101311]">
              <ShieldAlert className="w-4 h-4 shrink-0 mt-0.5" />
              <span>{errorMsg}</span>
            </div>
          )}

          {mode === 'login' ? (
            <form onSubmit={handleLogin} className="space-y-4">
              <div>
                <label
                  htmlFor="login-identifier"
                  className="block font-mono text-xs font-bold uppercase mb-1"
                >
                  Email or Username
                </label>
                <input
                  id="login-identifier"
                  type="text"
                  required
                  value={identifier}
                  onChange={(e: ChangeEvent<HTMLInputElement>) => setIdentifier(e.target.value)}
                  placeholder="editor@gmail.com or jerlyn_ed"
                  className="w-full p-2.5 bg-white border-2 border-[#101311] text-sm font-mono"
                />
              </div>

              <div>
                <label
                  htmlFor="login-password"
                  className="block font-mono text-xs font-bold uppercase mb-1"
                >
                  Game Password
                </label>
                <input
                  id="login-password"
                  type="password"
                  required
                  value={password}
                  onChange={(e: ChangeEvent<HTMLInputElement>) => setPassword(e.target.value)}
                  placeholder="••••••••"
                  className="w-full p-2.5 bg-white border-2 border-[#101311] text-sm font-mono"
                />
              </div>

              <button
                type="submit"
                disabled={loading}
                className="w-full py-3 bg-[#1E4D3B] hover:bg-[#101311] text-[#F2EDE1] font-bold uppercase text-xs border-2 border-[#101311] shadow-[4px_4px_0px_#101311] flex items-center justify-center gap-2 disabled:opacity-60"
              >
                <Newspaper className="w-4 h-4" />
                {loading ? 'Verifying Credentials...' : 'Enter Newsroom →'}
              </button>
            </form>
          ) : (
            <form onSubmit={handleRegister} className="space-y-3.5">
              <div className="grid sm:grid-cols-2 gap-3">
                <div>
                  <label
                    htmlFor="reg-fullname"
                    className="block font-mono text-xs font-bold uppercase mb-1"
                  >
                    Byline Full Name
                  </label>
                  <input
                    id="reg-fullname"
                    type="text"
                    required
                    value={fullName}
                    onChange={(e: ChangeEvent<HTMLInputElement>) => setFullName(e.target.value)}
                    placeholder="Jerlyn Anyayahan"
                    className="w-full p-2 bg-white border-2 border-[#101311] text-xs font-mono"
                  />
                </div>
                <div>
                  <label
                    htmlFor="reg-username"
                    className="block font-mono text-xs font-bold uppercase mb-1"
                  >
                    Username (@handle)
                  </label>
                  <input
                    id="reg-username"
                    type="text"
                    required
                    value={username}
                    onChange={(e: ChangeEvent<HTMLInputElement>) =>
                      setUsername(e.target.value.toLowerCase())
                    }
                    placeholder="jerlyn_ed"
                    className="w-full p-2 bg-white border-2 border-[#101311] text-xs font-mono"
                  />
                </div>
              </div>

              <div>
                <label
                  htmlFor="reg-email"
                  className="block font-mono text-xs font-bold uppercase mb-1"
                >
                  Email Address
                </label>
                <input
                  id="reg-email"
                  type="email"
                  required
                  value={email}
                  onChange={(e: ChangeEvent<HTMLInputElement>) => setEmail(e.target.value)}
                  placeholder="editor@gmail.com"
                  className="w-full p-2 bg-white border-2 border-[#101311] text-xs font-mono"
                />
                <p className="text-[10px] font-mono text-[#2C251E] mt-1">
                  Used as your login ID (no verification email will be sent).
                </p>
              </div>

              <div className="grid sm:grid-cols-2 gap-3">
                <div>
                  <label
                    htmlFor="reg-password"
                    className="block font-mono text-xs font-bold uppercase mb-1"
                  >
                    Create Game Password
                  </label>
                  <input
                    id="reg-password"
                    type="password"
                    required
                    value={password}
                    onChange={(e: ChangeEvent<HTMLInputElement>) => setPassword(e.target.value)}
                    placeholder="Min. 6 characters"
                    className="w-full p-2 bg-white border-2 border-[#101311] text-xs font-mono"
                  />
                </div>
                <div>
                  <label
                    htmlFor="reg-confirm-password"
                    className="block font-mono text-xs font-bold uppercase mb-1"
                  >
                    Confirm Password
                  </label>
                  <input
                    id="reg-confirm-password"
                    type="password"
                    required
                    value={confirmPassword}
                    onChange={(e: ChangeEvent<HTMLInputElement>) =>
                      setConfirmPassword(e.target.value)
                    }
                    placeholder="Re-type password"
                    className="w-full p-2 bg-white border-2 border-[#101311] text-xs font-mono"
                  />
                </div>
              </div>

              {/* Press ID Gender & Portrait */}
              <div className="pt-1">
                <div className="flex items-center justify-between mb-1.5">
                  <label
                    htmlFor="reg-gender"
                    className="font-mono text-xs font-bold uppercase"
                  >
                    Press ID Portrait &amp; Desk
                  </label>
                  <select
                    id="reg-gender"
                    value={gender}
                    onChange={handleGenderChange}
                    className="px-2 py-1 bg-white border-2 border-[#101311] text-xs font-mono"
                  >
                    <option value="Female">Female Desk</option>
                    <option value="Male">Male Desk</option>
                  </select>
                </div>

                <div className="grid grid-cols-6 gap-2">
                  {AVATAR_OPTIONS.map((id) => (
                    <button
                      key={id}
                      type="button"
                      onClick={() => setAvatarId(id)}
                      className={`p-1 border-2 flex items-center justify-center ${
                        avatarId === id
                          ? 'border-[#932A13] bg-[#EAE2D0]'
                          : 'border-[#101311] bg-white opacity-75 hover:opacity-100'
                      }`}
                    >
                      <AvatarPortrait avatarId={id} size="sm" />
                    </button>
                  ))}
                </div>
              </div>

              <button
                type="submit"
                disabled={loading}
                className="w-full py-3 bg-[#932A13] hover:bg-[#101311] text-white font-bold uppercase text-xs border-2 border-[#101311] shadow-[4px_4px_0px_#101311] disabled:opacity-60"
              >
                {loading ? 'Printing Press Pass...' : 'Issue Press ID & Start →'}
              </button>
            </form>
          )}
        </div>
      </div>
    </main>
  );
}