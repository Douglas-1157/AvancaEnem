// Esqueleto exibido na hora em que a pessoa troca de tela, enquanto os dados chegam.
export function Carregando() {
  return (
    <div role="status" aria-label="Carregando" className="sk-wrap">
      <div className="sk sk-h" />
      <div className="sk-row"><div className="sk sk-c" /><div className="sk sk-c" /><div className="sk sk-c" /></div>
      <div className="sk sk-b" />
      <div className="sk sk-b" />
    </div>
  );
}
