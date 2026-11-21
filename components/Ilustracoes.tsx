// Ilustrações originais (feitas para o projeto, sem direitos autorais de terceiros).
// Usam só formas simples e as cores da marca, então funcionam no tema claro e no escuro.

const Brilho = ({ x, y, s = 1, c = '#FFC24D' }: { x: number; y: number; s?: number; c?: string }) => (
  <path transform={`translate(${x} ${y}) scale(${s})`} fill={c} d="M0-12C1.5-5 5-1.5 12 0 5 1.5 1.5 5 0 12-1.5 5-5 1.5-12 0-5-1.5-1.5-5 0-12Z" />
);

// Estudante com notebook e livros
export function IlEstudante({ className = '' }: { className?: string }) {
  const deg = [['#3DD6C5', 70], ['#2F7CF6', 104], ['#FFC24D', 138], ['#FF74AE', 172], ['#FF6B4A', 206]] as const;
  return (
    <svg className={className} viewBox="0 0 360 290" role="img" aria-label="Degraus coloridos subindo até um capelo de formatura" xmlns="http://www.w3.org/2000/svg">
      <circle cx="190" cy="140" r="122" fill="#fff" opacity=".13" />
      <Brilho x={52} y={70} s={1.3} /><Brilho x={316} y={150} s={1} c="#fff" /><Brilho x={34} y={190} s={.8} c="#fff" />
      <ellipse cx="180" cy="262" rx="150" ry="9" fill="#1B1740" opacity=".25" />
      {deg.map(([c, h], i) => (
        <g key={i}>
          <rect x={40 + i * 56} y={254 - h} width="48" height={h} rx="10" fill={c} />
          <rect x={40 + i * 56} y={254 - h} width="48" height="12" rx="6" fill="#fff" opacity=".28" />
        </g>
      ))}
      {/* seta de progresso */}
      <path d="M52 168C110 150 170 128 252 92" fill="none" stroke="#fff" strokeWidth="5" strokeLinecap="round" strokeDasharray="1 11" opacity=".9" />
      <path d="M244 80l18 10-8 18" fill="none" stroke="#fff" strokeWidth="5" strokeLinecap="round" strokeLinejoin="round" />
      {/* capelo no último degrau */}
      <g transform="translate(264 18)">
        <path d="M0 22L38 6l38 16-38 16z" fill="#1B1740" />
        <path d="M16 30v16c0 6 10 10 22 10s22-4 22-10V30l-22 9z" fill="#2A2470" />
        <path d="M70 25v22" stroke="#FFC24D" strokeWidth="3" strokeLinecap="round" /><circle cx="70" cy="50" r="4" fill="#FFC24D" />
      </g>
    </svg>
  );
}

// Caminho da trilha com etapas e bandeira
export function IlTrilha({ className = '' }: { className?: string }) {
  return (
    <svg className={className} viewBox="0 0 360 220" role="img" aria-label="Trilha de estudo com etapas até uma bandeira" xmlns="http://www.w3.org/2000/svg">
      <path d="M24 176C92 176 96 108 164 108s80 70 150-40" stroke="#fff" strokeOpacity=".55" strokeWidth="6" strokeDasharray="2 14" strokeLinecap="round" fill="none" />
      <circle cx="46" cy="176" r="15" fill="#3DD6C5" /><path d="M39 176l5 5 9-10" stroke="#fff" strokeWidth="3.4" fill="none" strokeLinecap="round" strokeLinejoin="round" />
      <circle cx="120" cy="140" r="15" fill="#3DD6C5" /><path d="M113 140l5 5 9-10" stroke="#fff" strokeWidth="3.4" fill="none" strokeLinecap="round" strokeLinejoin="round" />
      <circle cx="196" cy="118" r="19" fill="#FF6B4A" /><circle cx="196" cy="118" r="30" fill="#FF6B4A" opacity=".25" />
      <circle cx="262" cy="88" r="15" fill="#fff" opacity=".85" />
      <path d="M314 68V22" stroke="#fff" strokeWidth="5" strokeLinecap="round" /><path d="M317 24h34l-9 12 9 12h-34z" fill="#FFC24D" />
      <Brilho x={92} y={60} s={1.2} /><Brilho x={250} y={30} s={.9} c="#fff" /><Brilho x={330} y={150} s={.8} />
    </svg>
  );
}

// Redação com nota
export function IlRedacao({ className = '' }: { className?: string }) {
  return (
    <svg className={className} viewBox="0 0 300 240" role="img" aria-label="Folha de redação com nota 1000 e um lápis" xmlns="http://www.w3.org/2000/svg">
      <rect x="40" y="24" width="168" height="200" rx="16" fill="#fff" />
      <rect x="58" y="48" width="96" height="9" rx="4.5" fill="#5B3DF5" /><rect x="58" y="72" width="132" height="6" rx="3" fill="#E7E2F6" />
      <rect x="58" y="90" width="120" height="6" rx="3" fill="#E7E2F6" /><rect x="58" y="108" width="132" height="6" rx="3" fill="#E7E2F6" />
      <rect x="58" y="126" width="104" height="6" rx="3" fill="#E7E2F6" /><rect x="58" y="144" width="132" height="6" rx="3" fill="#E7E2F6" />
      <rect x="58" y="162" width="88" height="6" rx="3" fill="#E7E2F6" />
      <path d="M58 196q30-22 58 0t58-6" stroke="#EE3F8B" strokeWidth="4" fill="none" strokeLinecap="round" />
      <circle cx="214" cy="78" r="44" fill="#FFC24D" /><circle cx="214" cy="78" r="34" fill="none" stroke="#1B1740" strokeOpacity=".18" strokeWidth="3" />
      <text x="214" y="88" textAnchor="middle" fontFamily="Bricolage Grotesque, system-ui, sans-serif" fontSize="30" fontWeight="800" fill="#1B1740">1000</text>
      <g transform="rotate(38 232 176)"><rect x="210" y="130" width="22" height="92" rx="4" fill="#3DD6C5" /><path d="M210 222h22l-11 22z" fill="#F2B995" /><rect x="210" y="130" width="22" height="14" rx="4" fill="#EE3F8B" /></g>
      <Brilho x={262} y={150} s={1} c="#fff" /><Brilho x={20} y={60} s={.9} />
    </svg>
  );
}
