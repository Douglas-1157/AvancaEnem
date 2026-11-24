'use client';
import { useState } from 'react';
import { Icon } from './Icon';

// Campo de senha com botão para mostrar/ocultar o que foi digitado
export function CampoSenha({ id, name, autoComplete, minLength = 8 }: { id: string; name: string; autoComplete: string; minLength?: number }) {
  const [ver, setVer] = useState(false);
  return (
    <div className="pw">
      <input className="inp" id={id} name={name} type={ver ? 'text' : 'password'} required minLength={minLength} autoComplete={autoComplete} />
      <button type="button" className="pw-b" onClick={() => setVer(!ver)} aria-label={ver ? 'Ocultar senha' : 'Mostrar senha'} aria-pressed={ver} title={ver ? 'Ocultar senha' : 'Mostrar senha'}>
        <Icon n={ver ? 'eyeoff' : 'eye'} s={20} />
      </button>
    </div>
  );
}
